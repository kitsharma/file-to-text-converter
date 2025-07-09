/**
 * Main Application Integration
 * Connects the frontend UI with backend Python services
 */

class CareerResilienceApp {
    constructor() {
        this.careerAPI = new CareerAPIClient();
        this.careerManager = new CareerInsightsManager(this.careerAPI);
        this.careerUI = new CareerInsightsUI(this.careerManager);
        
        this.currentResumeData = null;
        this.isProcessing = false;
        
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        try {
            // Check API health
            await this.checkAPIHealth();
            
            // Setup file upload handling
            this.setupFileUpload();
            
            // Setup existing UI components
            this.integrateExistingComponents();
            
            console.log('Career Resilience Platform initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Check API health and connectivity
     */
    async checkAPIHealth() {
        try {
            const health = await this.careerAPI.healthCheck();
            console.log('API Health Check:', health);
            return true;
        } catch (error) {
            console.warn('API health check failed - running in offline mode:', error);
            return false;
        }
    }

    /**
     * Setup file upload handling to trigger career analysis
     */
    setupFileUpload() {
        console.log('[CAREER-APP] Setting up file upload handling');
        
        // First, check if we have direct access to file input
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        
        if (fileInput) {
            console.log('[CAREER-APP] File input found, setting up direct handlers');
            this.setupDirectFileHandling(fileInput, uploadArea);
        }

        // Hook into existing upload success handler
        const originalHandleSuccess = window.handleUploadSuccess;
        if (originalHandleSuccess) {
            console.log('[CAREER-APP] Found existing handleUploadSuccess, wrapping it');
            window.handleUploadSuccess = (data, fileName) => {
                console.log('[CAREER-APP] Wrapped handleUploadSuccess called with:', fileName);
                // Call original handler first
                originalHandleSuccess(data, fileName);
                
                // Then trigger career analysis if enabled
                this.handleResumeUpload(data, fileName);
            };
        } else {
            console.log('[CAREER-APP] No existing handleUploadSuccess found, creating new one');
            window.handleUploadSuccess = (data, fileName) => {
                console.log('[CAREER-APP] New handleUploadSuccess called with:', fileName);
                this.handleResumeUpload(data, fileName);
            };
        }

        // Also listen for resume analysis completion
        this.setupResumeAnalysisHook();
    }

    /**
     * CAREER APP: File handling removed to prevent conflicts
     * All file processing now handled by main FileConverter only
     */
    setupDirectFileHandling(fileInput, uploadArea) {
        console.log('[CAREER-APP] Monitoring only - no file handling interference');
        
        // Main FileConverter handles all file operations
        // Career app will hook into results via handleUploadSuccess bridge
        return;
    }

    /**
     * CAREER APP: File reading methods removed
     * All file processing now handled by main FileConverter only
     */

    /**
     * Show error message
     */
    showError(message) {
        console.error('[CAREER-APP] Error:', message);
        
        // Try to use debug logger if available
        if (window.debugLogger) {
            window.debugLogger.log('ERROR', message);
        }
        
        // Also show in UI
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Setup hook for resume analysis completion
     */
    setupResumeAnalysisHook() {
        // Monitor for resume analysis completion
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if resume analysis is displayed
                    const resumeAnalysis = document.getElementById('resumeAnalysis');
                    if (resumeAnalysis && resumeAnalysis.style.display !== 'none') {
                        this.onResumeAnalysisComplete();
                    }
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
    }

    /**
     * Handle resume upload and trigger career analysis
     */
    async handleResumeUpload(resumeText, fileName) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            
            // Parse resume data (use existing parser if available)
            let resumeData;
            if (window.enhancedResumeParser) {
                resumeData = window.enhancedResumeParser.parseResume(resumeText);
            } else {
                resumeData = this.parseBasicResume(resumeText);
            }
            
            this.currentResumeData = resumeData;
            
            // Wait a moment for UI to settle
            setTimeout(() => {
                this.triggerCareerAnalysis(resumeData);
            }, 1000);
            
        } catch (error) {
            console.error('Error handling resume upload:', error);
            this.isProcessing = false;
        }
    }

    /**
     * Called when resume analysis is complete
     */
    onResumeAnalysisComplete() {
        if (this.currentResumeData && !this.isProcessing) {
            // Add career insights button to the interface
            this.addCareerInsightsButton();
        }
    }

    /**
     * Add career insights button to trigger analysis
     */
    addCareerInsightsButton() {
        // Check if button already exists
        if (document.getElementById('careerInsightsBtn')) return;

        // Find a good place to add the button
        const resumeAnalysis = document.getElementById('resumeAnalysis');
        if (!resumeAnalysis) return;

        // Create insights button
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            color: white;
        `;

        buttonContainer.innerHTML = `
            <h3 style="margin-bottom: 15px; color: white;">🚀 Ready for AI-Powered Career Insights?</h3>
            <p style="margin-bottom: 20px; opacity: 0.9;">
                Get personalized career recommendations, skill gap analysis, and learning paths 
                powered by O*NET data and market intelligence.
            </p>
            <button id="careerInsightsBtn" style="
                background: white;
                color: #667eea;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.transform='translateY(0)'">
                Generate Career Insights
            </button>
        `;

        // Insert after resume analysis
        resumeAnalysis.parentNode.insertBefore(buttonContainer, resumeAnalysis.nextSibling);

        // Add click handler
        document.getElementById('careerInsightsBtn').addEventListener('click', () => {
            this.triggerCareerAnalysis(this.currentResumeData);
        });
    }

    /**
     * Trigger career analysis
     */
    async triggerCareerAnalysis(resumeData) {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            
            // Update button to show processing
            const btn = document.getElementById('careerInsightsBtn');
            if (btn) {
                btn.innerHTML = '<div class="loading-spinner"></div> Analyzing...';
                btn.disabled = true;
            }

            // Process resume for insights
            await this.careerManager.processResumeForInsights(resumeData);

        } catch (error) {
            console.error('Career analysis failed:', error);
            
            // Show error in UI
            this.careerUI.showError(error);
            
            // Reset button
            const btn = document.getElementById('careerInsightsBtn');
            if (btn) {
                btn.innerHTML = 'Generate Career Insights';
                btn.disabled = false;
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Parse basic resume data if enhanced parser not available
     */
    parseBasicResume(resumeText) {
        // Simple parsing logic
        const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);
        
        const data = {
            name: '',
            email: '',
            skills: [],
            experience: [],
            education: []
        };

        // Extract email
        const emailMatch = resumeText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
            data.email = emailMatch[0];
        }

        // Extract name (assume first line or line before email)
        if (lines.length > 0) {
            data.name = lines[0];
        }

        // Simple skill extraction
        const skillKeywords = [
            'Python', 'JavaScript', 'Java', 'C++', 'SQL', 'React', 'Node.js',
            'Machine Learning', 'Data Analysis', 'AWS', 'Docker', 'Kubernetes',
            'Git', 'Linux', 'Project Management', 'Agile', 'Scrum', 'Leadership',
            'Communication', 'Problem Solving', 'Team Management', 'Strategy'
        ];

        skillKeywords.forEach(skill => {
            if (resumeText.toLowerCase().includes(skill.toLowerCase())) {
                data.skills.push(skill);
            }
        });

        return data;
    }

    /**
     * Integrate with existing UI components
     */
    integrateExistingComponents() {
        // Hook into mode switching if available
        const existingModeHandler = window.switchMode;
        if (existingModeHandler) {
            window.switchMode = (mode) => {
                // Call original handler
                existingModeHandler(mode);
                
                // Handle career mode specially
                if (mode === 'career' && this.currentResumeData) {
                    setTimeout(() => {
                        this.careerUI.showInsightsContainer();
                    }, 500);
                }
            };
        }

        // Integrate with existing progress system
        this.integrateWithProgressSystem();
    }

    /**
     * Integrate with existing progress system
     */
    integrateWithProgressSystem() {
        // Listen for career manager events and update main progress
        this.careerManager.on('insights:start', () => {
            this.updateMainProgress(60, 'Generating career insights...');
        });

        this.careerManager.on('insights:progress', (data) => {
            const progressMap = {
                'skills': 70,
                'recommendations': 80,
                'learning': 90,
                'bias': 95
            };
            this.updateMainProgress(progressMap[data.stage] || 70, data.stage);
        });

        this.careerManager.on('insights:complete', () => {
            this.updateMainProgress(100, 'Career analysis complete!');
            setTimeout(() => {
                this.resetMainProgress();
            }, 3000);
        });
    }

    /**
     * Update main progress bar
     */
    updateMainProgress(percentage, message) {
        const progressFill = document.querySelector('.career-progress-bar .progress-fill');
        const progressMessage = document.querySelector('.progress-message');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (progressMessage) {
            progressMessage.textContent = message;
        }
    }

    /**
     * Reset main progress bar
     */
    resetMainProgress() {
        const progressFill = document.querySelector('.career-progress-bar .progress-fill');
        const progressMessage = document.querySelector('.progress-message');

        if (progressFill) {
            progressFill.style.width = '0%';
        }

        if (progressMessage) {
            progressMessage.textContent = 'Ready to discover your career strengths';
        }
    }

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = `
                <h4>Initialization Error</h4>
                <p>The career insights system could not be initialized: ${error.message}</p>
                <p>The basic resume analysis features will still work, but career insights may be limited.</p>
            `;
            container.insertBefore(errorDiv, container.firstChild);
        }
    }

    /**
     * Reset application state
     */
    reset() {
        this.currentResumeData = null;
        this.isProcessing = false;
        this.careerManager.clearCache();
        this.careerUI.clearInsights();
        
        // Remove career insights button
        const btn = document.getElementById('careerInsightsBtn');
        if (btn && btn.parentNode) {
            btn.parentNode.remove();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts to load, especially the main FileConverter
    setTimeout(() => {
        if (window.CareerAPIClient && window.CareerInsightsManager && window.CareerInsightsUI) {
            console.log('[CAREER-APP] Initializing career app integration');
            window.careerApp = new CareerResilienceApp();
        } else {
            console.warn('[CAREER-APP] Some career modules not loaded, will retry');
            // Retry after a longer delay
            setTimeout(() => {
                if (window.CareerAPIClient && window.CareerInsightsManager && window.CareerInsightsUI) {
                    console.log('[CAREER-APP] Initializing career app integration (retry)');
                    window.careerApp = new CareerResilienceApp();
                } else {
                    console.error('[CAREER-APP] Required career modules not loaded after retry');
                }
            }, 2000);
        }
    }, 1500); // Increased delay to let FileConverter initialize first
});

// Export for manual initialization if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CareerResilienceApp };
} else {
    window.CareerResilienceApp = CareerResilienceApp;
}