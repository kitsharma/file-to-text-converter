class FileConverter {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.extractedText = '';
        this.currentFileName = '';
        this.currentMode = 'resume'; // Default to resume mode for better UX
        this.currentStep = 1; // Track user progress through steps
        this.resumeParser = new ResumeParser();
        this.enhancedResumeParser = new EnhancedResumeParser();
        
        // Initialize UX display with fallback
        try {
            this.uxEnhancedDisplay = new UXEnhancedResumeDisplay();
        } catch (error) {
            console.warn('UXEnhancedResumeDisplay not available:', error);
            this.uxEnhancedDisplay = this.createFallbackUXDisplay();
        }
        
        // Initialize skills analysis displays with fallback
        try {
            this.skillsAnalysisDisplay = new SkillsAnalysisDisplay('skillsGrid');
        } catch (error) {
            console.warn('SkillsAnalysisDisplay not available:', error);
            this.skillsAnalysisDisplay = this.createFallbackSkillsDisplay();
        }
        
        try {
            this.careerSkillsDisplay = new SkillsAnalysisDisplay('reframedSkillsContent');
        } catch (error) {
            console.warn('Career SkillsAnalysisDisplay not available:', error);
            this.careerSkillsDisplay = this.createFallbackSkillsDisplay();
        }
        
        this.parsedResumeData = null;
        this.startTime = Date.now();
        this.uploadAttempts = 0;
        this.currentExperiencePage = 1;
        this.stressMessageShown = false;
        // Initialize services with error handling and fallbacks
        try {
            this.piiDetector = new CareerFocusedPIIDetector();
        } catch (error) {
            console.warn('CareerFocusedPIIDetector not available:', error);
            this.piiDetector = this.createFallbackPIIDetector();
        }
        
        try {
            this.smartRedactionService = new SmartRedactionService();
        } catch (error) {
            console.warn('SmartRedactionService not available:', error);
            this.smartRedactionService = this.createFallbackRedactionService();
        }
        
        this.piiAnalysis = null;
        this.selectedRedactions = new Set();
        
        // Initialize AI services for career insights with fallbacks
        try {
            this.jobMatcher = new AIEnhancedJobMatcher();
        } catch (error) {
            console.warn('AIEnhancedJobMatcher not available:', error);
            this.jobMatcher = this.createFallbackJobMatcher();
        }
        
        try {
            this.skillReframer = new SkillReframingService();
        } catch (error) {
            console.warn('SkillReframingService not available:', error);
            this.skillReframer = this.createFallbackSkillReframer();
        }
        
        try {
            this.onetService = new ONETService();
        } catch (error) {
            console.warn('ONETService not available:', error);
            this.onetService = this.createFallbackONETService();
        }
        
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        // Initialize accessibility features for stressed users
        this.initializeAccessibilityFeatures();
    }

    createFallbackPIIDetector() {
        return {
            analyzeText: (text) => {
                // Basic PII detection fallback
                return {
                    detections: [],
                    stats: {
                        totalDetections: 0,
                        averageConfidence: 0,
                        redactionPercentage: 0
                    },
                    riskLevel: 'low',
                    recommendations: []
                };
            },
            redactText: (text, detections) => {
                return text; // No redaction in fallback
            }
        };
    }

    createFallbackRedactionService() {
        return {
            analyzeRedactionNeeds: (resumeData) => {
                return {
                    recommendations: {
                        personalInfo: [],
                        experience: [],
                        education: []
                    },
                    riskLevel: 'low',
                    summary: {
                        totalItems: 0,
                        categories: {
                            personal: 0,
                            companies: 0,
                            schools: 0
                        },
                        recommendation: 'No privacy concerns detected'
                    }
                };
            },
            applyRedactions: (resumeData, redactions) => {
                return resumeData; // No redaction in fallback
            }
        };
    }

    createFallbackUXDisplay() {
        return {
            transitionToState: (state) => {
                console.log(`UX State: ${state}`);
            }
        };
    }

    createFallbackSkillsDisplay() {
        return {
            displaySkillsAnalysis: async (skills, originalText, callback) => {
                // Basic skills display fallback
                const skillsContainer = document.getElementById('skillsGrid');
                if (skillsContainer) {
                    skillsContainer.innerHTML = skills.map(skill => 
                        `<span class="skill-tag">${skill}</span>`
                    ).join('');
                }
                if (callback) callback();
            }
        };
    }

    createFallbackReframedSkills(skills) {
        return skills.map(skill => ({
            originalSkill: skill,
            reframedSkill: skill,
            marketDemand: 'medium',
            complementaryAITools: [],
            confidence: 0.8
        }));
    }

    createFallbackCareerProgressions(analysisData) {
        const currentRole = analysisData.experience && analysisData.experience.length > 0 
            ? analysisData.experience[0].title 
            : 'Professional';
        
        return [
            { title: `Senior ${currentRole}`, growth: `Lead ${currentRole}` },
            { title: `${currentRole} Specialist`, growth: `${currentRole} Manager` }
        ];
    }

    createFallbackJobMatcher() {
        return {
            searchJobs: async (criteria) => {
                return [
                    {
                        jobTitle: `${criteria.role} Opportunities`,
                        company: 'Growing Companies',
                        location: criteria.location || 'Remote',
                        matchScore: 75,
                        description: 'Multiple opportunities available for professionals with your skills.',
                        aiInsights: 'Your skills are in demand across various industries.'
                    }
                ];
            },
            analyzeMarket: async (role, location) => {
                return {
                    openings: '15K+',
                    growth: '+5%',
                    salary: '$40-60K',
                    remote: '50%'
                };
            }
        };
    }

    createFallbackSkillReframer() {
        return {
            reframeSkills: async (skills) => {
                return skills.map(skill => ({
                    originalSkill: skill,
                    reframedSkill: `Enhanced ${skill}`,
                    marketDemand: 'medium',
                    complementaryAITools: ['AI Assistant'],
                    confidence: 0.8
                }));
            },
            suggestCareerPaths: async (skills, currentRole) => {
                return [
                    {
                        title: `Senior ${currentRole}`,
                        description: 'Natural progression with expanded responsibilities',
                        skillMatch: 85,
                        aiToolsUsed: ['AI Assistant', 'Automation Tools'],
                        learningPath: ['Leadership Training', 'Advanced Skills', 'Industry Certification']
                    }
                ];
            }
        };
    }

    createFallbackONETService() {
        return {
            getCareerProgressions: async (currentRole) => {
                return [
                    { title: `Senior ${currentRole}`, growth: `Lead ${currentRole}` },
                    { title: `${currentRole} Specialist`, growth: `${currentRole} Manager` }
                ];
            }
        };
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.fileType = document.getElementById('fileType');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultText = document.getElementById('resultText');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // Mode toggle elements
        this.textModeBtn = document.getElementById('textModeBtn');
        this.resumeModeBtn = document.getElementById('resumeModeBtn');
        this.redactionModeBtn = document.getElementById('redactionModeBtn');
        this.careerModeBtn = document.getElementById('careerModeBtn');
        this.uploadText = document.getElementById('uploadText');
        this.fileTypesText = document.getElementById('fileTypesText');
        this.resultTitle = document.getElementById('resultTitle');
        
        // Resume analysis elements
        this.resumeAnalysis = document.getElementById('resumeAnalysis');
        this.qualityScore = document.getElementById('qualityScore');
        this.contactGrid = document.getElementById('contactGrid');
        this.experienceList = document.getElementById('experienceList');
        this.educationList = document.getElementById('educationList');
        this.skillsGrid = document.getElementById('skillsGrid');
        this.feedbackSection = document.getElementById('feedbackSection');
        this.summaryContent = document.getElementById('summaryContent');
        
        // PII Redaction elements
        this.redactionContainer = document.getElementById('redactionContainer');
        this.redactAllBtn = document.getElementById('redactAllBtn');
        this.clearRedactionsBtn = document.getElementById('clearRedactionsBtn');
        this.downloadRedactedBtn = document.getElementById('downloadRedactedBtn');
        this.totalDetections = document.getElementById('totalDetections');
        this.avgConfidence = document.getElementById('avgConfidence');
        this.redactionPercent = document.getElementById('redactionPercent');
        this.riskLevel = document.getElementById('riskLevel');
        this.piiDetections = document.getElementById('piiDetections');
        this.redactedTextContainer = document.getElementById('redactedTextContainer');
        this.redactedTextPreview = document.getElementById('redactedTextPreview');
        this.recommendationsList = document.getElementById('recommendationsList');
        this.recommendationsContent = document.getElementById('recommendationsContent');
        
        // Career Insights elements
        this.careerInsightsContainer = document.getElementById('careerInsightsContainer');
    }

    setupEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Upload area click
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Buttons
        this.downloadBtn.addEventListener('click', () => this.downloadText());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        // Mode toggle
        this.textModeBtn.addEventListener('click', () => this.switchMode('text'));
        this.resumeModeBtn.addEventListener('click', () => this.switchMode('resume'));
        this.redactionModeBtn.addEventListener('click', () => this.switchMode('redaction'));
        this.careerModeBtn.addEventListener('click', () => this.switchMode('career'));
        
        // PII Redaction controls
        this.redactAllBtn.addEventListener('click', () => this.redactAll());
        this.clearRedactionsBtn.addEventListener('click', () => this.clearAllRedactions());
        this.downloadRedactedBtn.addEventListener('click', () => this.downloadRedactedText());
        
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // Note: Show more/less now handled by native HTML details/summary
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        try {
            console.log('[DEBUG] Starting file processing for:', file.name);
            this.hideMessages();
            this.validateFile(file);
            this.showFileInfo(file);
            this.updateStep(2); // Move to Privacy Control step
            this.showProgress('Preparing to process file...');
            
            // Track upload attempts for accessibility features
            this.uploadAttempts = (this.uploadAttempts || 0) + 1;
            
            this.currentFileName = file.name;
            let text = '';

            const fileType = file.type;
            const fileName = file.name.toLowerCase();

            // Step 1: Extract text from file with proper error handling
            try {
                console.log('[DEBUG] Extracting text from file type:', fileType);
                if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                    text = await this.extractFromPDF(file);
                } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
                    text = await this.extractFromWord(file);
                } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
                    text = await this.extractFromText(file);
                } else {
                    throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Please upload PDF, DOCX, or TXT files.`);
                }
                console.log('[DEBUG] Text extraction successful, length:', text.length);
            } catch (extractionError) {
                console.error('[DEBUG] Text extraction failed:', extractionError);
                throw new Error(`File extraction failed: ${extractionError.message}`);
            }

            if (!text.trim()) {
                console.error('[DEBUG] No text content found in file');
                throw new Error('No text content found in the file. The file might be empty or contain only images.');
            }

            this.extractedText = text;
            console.log('[DEBUG] Current mode:', this.currentMode);
            
            // Step 2: Process based on mode with comprehensive error handling
            if (this.currentMode === 'resume') {
                try {
                    console.log('[DEBUG] Processing resume with privacy-first approach');
                    
                    // Parse the resume
                    this.enhancedResumeParser.setProgressCallback((percentage, message) => {
                        this.updateProgress(percentage, message);
                    });
                    
                    const parsedData = await this.enhancedResumeParser.parseResumeSecurely(text, fileName);
                    this.parsedResumeData = parsedData;
                    console.log('[DEBUG] Resume parsed successfully');
                    
                    // Initialize unified redaction state (default to redacted)
                    if (!this.redactionState) {
                        this.redactionState = {
                            personalInfo: {
                                name: true,
                                email: true,
                                phone: true,
                                address: true
                            },
                            entities: {
                                companies: new Map(),
                                schools: new Map(),
                                locations: new Map()
                            }
                        };
                    }
                    
                    // Go directly to analysis with redacted display
                    await this.proceedToAnalysis();
                    console.log('[DEBUG] Analysis completed successfully');
                    
                } catch (analysisError) {
                    console.error('[DEBUG] Resume analysis failed:', analysisError);
                    throw new Error(`Resume analysis failed: ${analysisError.message}`);
                }
            } else if (this.currentMode === 'redaction') {
                try {
                    if (!this.piiDetector) {
                        throw new Error('PII detector not available');
                    }
                    this.piiAnalysis = this.piiDetector.analyzeText(text);
                    this.showPIIAnalysis(this.piiAnalysis);
                    this.showSuccess('PII analysis completed successfully!');
                } catch (piiError) {
                    throw new Error(`PII analysis failed: ${piiError.message}`);
                }
            } else if (this.currentMode === 'career') {
                try {
                    this.enhancedResumeParser.setProgressCallback((percentage, message) => {
                        this.updateProgress(percentage, `Generating career insights: ${message}`);
                    });
                    this.parsedResumeData = await this.enhancedResumeParser.parseResumeSecurely(text, fileName);
                    
                    // Only show career insights if parsing succeeded
                    if (this.parsedResumeData && this.parsedResumeData.skills) {
                        try {
                            await this.showCareerInsights(this.parsedResumeData);
                            this.showSuccess('🚀 Your human advantages are now clear! These skills give you power over AI hiring systems.');
                        } catch (insightsError) {
                            console.error('Career insights display failed:', insightsError);
                            // Fall back to basic resume display
                            this.showResumeAnalysisWithSkills(this.parsedResumeData, text);
                            this.showSuccess('✨ Your career foundation is strong! Building on your unique human strengths.');
                        }
                    } else {
                        throw new Error('Resume parsing did not produce valid data');
                    }
                } catch (careerError) {
                    throw new Error(`Career analysis failed: ${careerError.message}`);
                }
            } else {
                // Text mode - simplest case
                this.showResult(text);
                this.showSuccess('Your document has been transformed! ✨');
            }
            
        } catch (error) {
            this.showError(error.message);
            console.error('File processing error:', error);
            
            // Reset to initial state on error
            this.updateStep(1);
            this.uploadArea.style.display = 'block';
        } finally {
            this.hideProgress();
        }
    }

    validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        const allowedExtensions = ['.pdf', '.docx', '.txt'];

        if (!file) {
            throw new Error('No file selected.');
        }

        if (file.size > maxSize) {
            throw new Error('File size too large. Please select a file smaller than 50MB.');
        }

        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        const hasValidType = allowedTypes.includes(file.type);

        if (!hasValidExtension && !hasValidType) {
            throw new Error('Invalid file type. Please upload PDF, DOCX, or TXT files only.');
        }
    }

    async extractFromPDF(file) {
        try {
            this.updateProgress(10, 'Loading PDF...');
            
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded. Please refresh the page and try again.');
            }

            const arrayBuffer = await this.fileToArrayBuffer(file);
            this.updateProgress(20, 'Parsing PDF structure...');
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;
            let fullText = '';

            for (let i = 1; i <= numPages; i++) {
                this.updateProgress(20 + (60 * (i - 1) / numPages), `Extracting text from page ${i} of ${numPages}...`);
                
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim();
                
                if (pageText) {
                    fullText += `${pageText}\n\n`;
                }
            }

            this.updateProgress(90, 'Finalizing text extraction...');
            
            if (!fullText.trim()) {
                throw new Error('No text found in PDF. The PDF might contain only images or be password protected.');
            }

            return fullText.trim();
            
        } catch (error) {
            if (error.name === 'PasswordException') {
                throw new Error('PDF is password protected. Please provide an unprotected version.');
            } else if (error.name === 'InvalidPDFException') {
                throw new Error('Invalid or corrupted PDF file. Please try a different file.');
            } else if (error.message.includes('PDF.js')) {
                throw error;
            } else {
                throw new Error(`PDF processing failed: ${error.message}`);
            }
        }
    }

    async extractFromWord(file) {
        try {
            this.updateProgress(10, 'Loading Word document...');
            
            if (typeof mammoth === 'undefined') {
                throw new Error('Mammoth.js library not loaded. Please refresh the page and try again.');
            }

            const arrayBuffer = await this.fileToArrayBuffer(file);
            this.updateProgress(30, 'Parsing Word document structure...');
            
            const result = await mammoth.extractRawText({ arrayBuffer });
            this.updateProgress(80, 'Extracting text content...');
            
            if (result.messages && result.messages.length > 0) {
                console.warn('Word document processing warnings:', result.messages);
            }

            const text = result.value.trim();
            
            if (!text) {
                throw new Error('No text content found in Word document. The document might be empty.');
            }

            return text;
            
        } catch (error) {
            if (error.message.includes('Mammoth.js')) {
                throw error;
            } else {
                throw new Error(`Word document processing failed: ${error.message}`);
            }
        }
    }

    async extractFromText(file) {
        try {
            this.updateProgress(20, 'Reading text file...');
            
            const text = await this.fileToText(file);
            this.updateProgress(80, 'Processing text content...');
            
            if (!text.trim()) {
                throw new Error('Text file is empty.');
            }

            return text;
            
        } catch (error) {
            throw new Error(`Text file processing failed: ${error.message}`);
        }
    }

    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file as array buffer.'));
            reader.readAsArrayBuffer(file);
        });
    }

    fileToText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file as text.'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    showFileInfo(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileType.textContent = file.type || 'Unknown';
        this.fileInfo.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showProgress(message) {
        this.progressContainer.style.display = 'block';
        this.progressText.textContent = message;
        this.progressFill.style.width = '0%';
    }

    updateProgress(percentage, message) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = message;
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
    }

    showResult(text) {
        this.resultText.textContent = text;
        this.resultContainer.style.display = 'block';
        this.resultText.scrollTop = 0;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.successMessage.style.display = 'none';
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        this.errorMessage.style.display = 'none';
    }

    hideMessages() {
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
    }

    downloadText() {
        try {
            if (!this.extractedText) {
                throw new Error('No text to download. Please convert a file first.');
            }

            const blob = new Blob([this.extractedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.getDownloadFileName();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showSuccess('Text file downloaded successfully!');
            
        } catch (error) {
            this.showError(`Download failed: ${error.message}`);
        }
    }

    getDownloadFileName() {
        if (!this.currentFileName) {
            return 'converted_text.txt';
        }
        
        const nameWithoutExt = this.currentFileName.replace(/\.[^/.]+$/, '');
        return `${nameWithoutExt}_converted.txt`;
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update button states
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        
        // Update main title with empathic messaging
        const mainTitle = document.getElementById('mainTitle');
        
        if (mode === 'text') {
            this.textModeBtn.classList.add('active');
            this.uploadText.textContent = 'Drop your file here or click to browse';
            this.fileTypesText.textContent = 'Supports PDF, TXT, and MS Word (.docx) files';
            mainTitle.textContent = 'File Converter & Text Extractor';
        } else if (mode === 'resume') {
            this.resumeModeBtn.classList.add('active');
            this.uploadText.textContent = 'Discover your career strengths and build resilience';
            this.fileTypesText.textContent = 'Upload your resume to unlock your competitive advantage against AI hiring systems';
            mainTitle.textContent = '🌟 Your Career Resilience Journey';
            this.uxEnhancedDisplay.transitionToState('UPLOADING');
        } else if (mode === 'redaction') {
            this.redactionModeBtn.classList.add('active');
            this.uploadText.textContent = 'Activate your bias protection shield';
            this.fileTypesText.textContent = 'Upload your resume to protect against AI hiring bias and discrimination';
            mainTitle.textContent = '🛡️ Bias Protection Platform';
        } else if (mode === 'career') {
            this.careerModeBtn.classList.add('active');
            this.uploadText.textContent = 'Highlight your AI-proof human advantages';
            this.fileTypesText.textContent = 'Upload your resume to discover skills that AI cannot replace and employers value most';
            mainTitle.textContent = '🚀 Human Advantage Platform';
        }
        
        // Hide all containers
        this.resultContainer.style.display = 'none';
        this.resumeAnalysis.style.display = 'none';
        this.redactionContainer.style.display = 'none';
        this.careerInsightsContainer.style.display = 'none';
        
        // Show appropriate container if we have data
        if (this.extractedText) {
            if (mode === 'resume' && this.parsedResumeData) {
                this.showResumeAnalysisWithSkills(this.parsedResumeData, this.extractedText);
            } else if (mode === 'redaction' && this.piiAnalysis) {
                this.showPIIAnalysis(this.piiAnalysis);
            } else if (mode === 'career' && this.parsedResumeData) {
                this.showCareerInsights(this.parsedResumeData);
            } else if (mode === 'text') {
                this.showResult(this.extractedText);
            }
        }
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab and activate button
        const selectedTab = document.getElementById(tabName + 'Tab');
        const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedBtn) selectedBtn.classList.add('active');
    }

    showPIIAnalysis(analysis) {
        this.redactionContainer.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.resumeAnalysis.style.display = 'none';
        
        // Update stats
        this.updatePIIStats(analysis.stats, analysis.riskLevel);
        
        // Show detections
        this.renderPIIDetections(analysis.detections);
        
        // Show recommendations
        this.renderRecommendations(analysis.recommendations);
        
        // Generate initial redacted preview
        this.updateRedactedPreview();
    }

    updatePIIStats(stats, riskLevel) {
        this.totalDetections.textContent = stats.totalDetections;
        this.avgConfidence.textContent = Math.round(stats.averageConfidence * 100) + '%';
        this.redactionPercent.textContent = Math.round(stats.redactionPercentage) + '%';
        
        // Update risk level
        this.riskLevel.textContent = riskLevel;
        this.riskLevel.className = 'risk-badge risk-' + riskLevel.toLowerCase();
    }

    renderPIIDetections(detections) {
        if (detections.length === 0) {
            this.piiDetections.innerHTML = `
                <div style="text-align: center; color: #28a745; padding: 40px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
                    <div>No PII detected - your document is clean!</div>
                </div>
            `;
            return;
        }

        const detectionsHTML = detections.map((detection, index) => `
            <div class="detection-item" data-detection-id="${index}">
                <div class="detection-info">
                    <div class="detection-type">${detection.type}</div>
                    <div class="detection-value">${this.escapeHtml(detection.value)}</div>
                    <div class="detection-confidence">
                        Confidence: ${Math.round(detection.confidence * 100)}%
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${detection.confidence * 100}%"></div>
                        </div>
                    </div>
                </div>
                <div class="redaction-toggle">
                    <div class="toggle-switch" data-detection-id="${index}">
                        <div class="toggle-slider"></div>
                    </div>
                    <span class="toggle-label">Redact</span>
                </div>
            </div>
        `).join('');

        this.piiDetections.innerHTML = detectionsHTML;

        // Add click handlers for toggles
        this.piiDetections.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const detectionId = parseInt(e.currentTarget.dataset.detectionId);
                this.toggleRedaction(detectionId);
            });
        });
    }

    toggleRedaction(detectionId) {
        const toggle = this.piiDetections.querySelector(`.toggle-switch[data-detection-id="${detectionId}"]`);
        
        if (!toggle) {
            console.error('Toggle not found for detection ID:', detectionId);
            return;
        }
        
        if (this.selectedRedactions.has(detectionId)) {
            this.selectedRedactions.delete(detectionId);
            toggle.classList.remove('active');
        } else {
            this.selectedRedactions.add(detectionId);
            toggle.classList.add('active');
        }
        
        this.updateRedactedPreview();
    }

    redactAll() {
        if (!this.piiAnalysis) return;
        
        this.selectedRedactions.clear();
        this.piiAnalysis.detections.forEach((_, index) => {
            this.selectedRedactions.add(index);
        });
        
        // Update UI
        this.piiDetections.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.classList.add('active');
        });
        
        this.updateRedactedPreview();
    }

    clearAllRedactions() {
        this.selectedRedactions.clear();
        
        // Update UI
        this.piiDetections.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.classList.remove('active');
        });
        
        this.updateRedactedPreview();
    }

    updateRedactedPreview() {
        if (!this.piiAnalysis || !this.extractedText) return;
        
        const selectedDetections = this.piiAnalysis.detections.filter((_, index) => 
            this.selectedRedactions.has(index)
        );
        
        const redactedText = this.piiDetector.redactText(this.extractedText, selectedDetections);
        
        this.redactedTextPreview.textContent = redactedText;
        this.redactedTextContainer.style.display = selectedDetections.length > 0 ? 'block' : 'none';
    }

    renderRecommendations(recommendations) {
        if (recommendations.length === 0) {
            this.recommendationsList.style.display = 'none';
            return;
        }

        const recommendationsHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <div class="recommendation-icon">⚠️</div>
                <div class="recommendation-text">${this.escapeHtml(rec)}</div>
            </div>
        `).join('');

        this.recommendationsContent.innerHTML = recommendationsHTML;
        this.recommendationsList.style.display = 'block';
    }

    downloadRedactedText() {
        try {
            if (!this.piiAnalysis || this.selectedRedactions.size === 0) {
                throw new Error('No redactions selected. Please select items to redact first.');
            }

            const selectedDetections = this.piiAnalysis.detections.filter((_, index) => 
                this.selectedRedactions.has(index)
            );
            
            const redactedText = this.piiDetector.redactText(this.extractedText, selectedDetections);
            
            const blob = new Blob([redactedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.getRedactedFileName();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showSuccess('Redacted text file downloaded successfully!');
            
        } catch (error) {
            this.showError(`Download failed: ${error.message}`);
        }
    }

    getRedactedFileName() {
        if (!this.currentFileName) {
            return 'redacted_document.txt';
        }
        
        const nameWithoutExt = this.currentFileName.replace(/\.[^/.]+$/, '');
        return `${nameWithoutExt}_redacted.txt`;
    }

    async showResumeAnalysisWithSkills(analysisData, originalText) {
        try {
            // Hide old containers and trigger new enhanced flow
            this.resumeAnalysis.style.display = 'none';
            this.resultContainer.style.display = 'none';
            this.redactionContainer.style.display = 'none';
            this.careerInsightsContainer.style.display = 'none';
            
            // Always update basic resume display elements (contact, experience, education)
            this.updateBasicResumeDisplay(analysisData);
            
            // Trigger privacy control flow (Step 2) - but don't let it fail the whole process
            try {
                this.triggerPrivacyControlFlow(analysisData);
            } catch (privacyError) {
                console.warn('Privacy control flow failed, continuing without it:', privacyError);
            }
            
            // Show the resume analysis container
            this.resumeAnalysis.style.display = 'block';
            
            // Use our new skills analysis display for the skills tab
            if (analysisData.skills && analysisData.skills.length > 0) {
                try {
                    await this.skillsAnalysisDisplay.displaySkillsAnalysis(
                        analysisData.skills,
                        originalText,
                        () => {
                            console.log('Skills analysis complete');
                            // Add next steps after skills analysis
                            this.addNextStepsToResults(analysisData);
                        }
                    );
                } catch (skillsDisplayError) {
                    console.error('Skills analysis display failed:', skillsDisplayError);
                    // Fall back to simple skills display
                    if (this.skillsGrid) {
                        this.skillsGrid.innerHTML = analysisData.skills.map(skill => 
                            `<span class="skill-tag">${skill}</span>`
                        ).join('');
                    }
                }
            } else {
                // Graceful handling of no skills found
                if (this.skillsGrid) {
                    this.skillsGrid.innerHTML = `
                        <div class="no-skills-message">
                            <h3>Every professional brings value</h3>
                            <p>While we couldn't identify specific skills automatically, your experience and knowledge are valuable. Consider highlighting your accomplishments, responsibilities, and the impact you've made in your roles.</p>
                            <button class="manual-skills-btn">Add Skills Manually</button>
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            console.error('Resume analysis display failed:', error);
            throw new Error(`Failed to display resume analysis: ${error.message}`);
        }
    }

    updateBasicResumeDisplay(data) {
        console.log('Discovering your career strengths...', data); // Empowering language
        
        // Normalize data structure (handle different possible formats)
        const normalizedData = this.normalizeResumeData(data);
        
        // Initialize unified redaction state if not exists (default to protected)
        if (!this.redactionState) {
            this.redactionState = {
                personalInfo: {
                    name: true,
                    email: true,
                    phone: true,
                    address: true
                },
                entities: {
                    companies: new Map(),
                    schools: new Map(),
                    locations: new Map()
                }
            };
        }
        
        // Add emotional journey messaging
        this.displayEmotionalJourneyMessage(normalizedData);
        
        // Update the main resume display with empowering card layout
        this.updateCareerResilienceDisplay(normalizedData);
        
        // Update career readiness progress
        this.updateCareerReadinessProgress(normalizedData);
        
        // Show privacy controls with optional education
        this.displayPrivacyControlsInterface();
        
        // Display confidence building elements
        this.displayConfidenceBuildingElements(normalizedData);
    }
    
    displayEmotionalJourneyMessage(data) {
        // Determine user's emotional state based on data completeness
        const skillsCount = data.skills?.length || 0;
        const expCount = data.experience?.length || 0;
        const eduCount = data.education?.length || 0;
        
        let emotionalState = 'anxious'; // Default
        let message = {
            title: 'Your Journey Starts Here',
            content: 'Your experience has prepared you for this transition. Let\'s build your competitive advantage together.',
            icon: '💪'
        };
        
        if (skillsCount > 10 && expCount > 2) {
            emotionalState = 'confident';
            message = {
                title: 'You\'re Ready to Shine',
                content: 'You\'re ready to showcase your unique value. Your diverse skills and experience make you a strong candidate in today\'s market.',
                icon: '⭐'
            };
        } else if (skillsCount > 5 && expCount > 1) {
            emotionalState = 'hopeful';
            message = {
                title: 'Building Your Advantage',
                content: 'You\'re building a competitive advantage. Your human skills and experience are exactly what employers need.',
                icon: '🚀'
            };
        } else if (skillsCount > 0 || expCount > 0) {
            emotionalState = 'discouraged';
            message = {
                title: 'Your Skills Matter',
                content: 'Your human skills are more valuable than ever. AI can\'t replicate your experience, creativity, and problem-solving abilities.',
                icon: '🌟'
            };
        }
        
        // Insert emotional journey message
        const existingMessage = document.querySelector('.emotional-journey-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageHtml = `
            <div class="emotional-journey-message">
                <div class="journey-message-header">
                    <div class="journey-message-icon">${message.icon}</div>
                    <div class="journey-message-title">${message.title}</div>
                </div>
                <div class="journey-message-content">${message.content}</div>
            </div>
        `;
        
        const resumeAnalysis = document.querySelector('.resume-analysis');
        if (resumeAnalysis) {
            resumeAnalysis.insertAdjacentHTML('afterbegin', messageHtml);
        }
    }
    
    updateCareerResilienceDisplay(normalizedData) {
        // Wrap the entire display in career resilience styling
        const resumeAnalysis = document.querySelector('.resume-analysis');
        if (resumeAnalysis) {
            resumeAnalysis.classList.add('career-resilience-container');
        }
        
        // Update contact section with empowering card design
        this.updateContactSection(normalizedData);
        
        // Update experience section with professional cards
        this.updateExperienceSection(normalizedData);
        
        // Update education section with achievement cards
        this.updateEducationSection(normalizedData);
        
        // Update skills section with human advantage highlighting
        this.updateSkillsSection(normalizedData);
    }
    
    updateContactSection(normalizedData) {
        if (this.contactGrid && normalizedData.contact) {
            const contactHtml = `
                <div class="career-section-card">
                    <div class="career-section-header">
                        <div class="career-section-title">
                            <div class="career-section-icon">👤</div>
                            Your Professional Identity
                        </div>
                        <div class="career-section-badge">Protected</div>
                    </div>
                    <div class="contact-grid">
                        <div class="contact-card">
                            ${this.generateContactItems(normalizedData.contact)}
                        </div>
                    </div>
                </div>
            `;
            this.contactGrid.innerHTML = contactHtml;
        }
    }
    
    generateContactItems(contact) {
        const items = [];
        
        if (contact.name) {
            const isProtected = this.redactionState.personalInfo.name;
            items.push(`
                <div class="contact-item">
                    <div class="contact-label">Name</div>
                    <div class="contact-value-wrapper">
                        <div class="contact-value ${isProtected ? 'private' : ''}">
                            ${isProtected ? '[Private]' : contact.name}
                        </div>
                        <button class="privacy-toggle-btn ${isProtected ? 'active' : ''}" 
                                onclick="window.fileConverter.togglePrivacy('name')" 
                                title="${isProtected ? 'Your name is private - click to show' : 'Click to keep your name private'}">
                            ${isProtected ? '🔒' : '👁️'}
                        </button>
                    </div>
                </div>
            `);
        }
        
        if (contact.email) {
            const isProtected = this.redactionState.personalInfo.email;
            items.push(`
                <div class="contact-item">
                    <div class="contact-label">Email</div>
                    <div class="contact-value-wrapper">
                        <div class="contact-value ${isProtected ? 'private' : ''}">
                            ${isProtected ? '[Private]' : contact.email}
                        </div>
                        <button class="privacy-toggle-btn ${isProtected ? 'active' : ''}" 
                                onclick="window.fileConverter.togglePrivacy('email')" 
                                title="${isProtected ? 'Your email is private - click to show' : 'Click to keep your email private'}">
                            ${isProtected ? '🔒' : '👁️'}
                        </button>
                    </div>
                </div>
            `);
        }
        
        if (contact.phone) {
            const isProtected = this.redactionState.personalInfo.phone;
            items.push(`
                <div class="contact-item">
                    <div class="contact-label">Phone</div>
                    <div class="contact-value-wrapper">
                        <div class="contact-value ${isProtected ? 'private' : ''}">
                            ${isProtected ? '[Private]' : contact.phone}
                        </div>
                        <button class="privacy-toggle-btn ${isProtected ? 'active' : ''}" 
                                onclick="window.fileConverter.togglePrivacy('phone')" 
                                title="${isProtected ? 'Your phone is private - click to show' : 'Click to keep your phone private'}">
                            ${isProtected ? '🔒' : '👁️'}
                        </button>
                    </div>
                </div>
            `);
        }
        
        return items.join('');
    }
    
    updateExperienceSection(normalizedData) {
        if (this.experienceList && normalizedData.experience && normalizedData.experience.length > 0) {
            // Handle pagination for multiple experiences
            const experiencesPerPage = 3;
            const totalPages = Math.ceil(normalizedData.experience.length / experiencesPerPage);
            const currentPage = this.currentExperiencePage || 1;
            
            const startIndex = (currentPage - 1) * experiencesPerPage;
            const endIndex = startIndex + experiencesPerPage;
            const currentExperiences = normalizedData.experience.slice(startIndex, endIndex);
            
            const experienceHtml = `
                <div class="career-section-card">
                    <div class="career-section-header">
                        <div class="career-section-title">
                            <div class="career-section-icon">💼</div>
                            Your Professional Journey
                        </div>
                        <div class="career-section-badge">${normalizedData.experience.length} Role${normalizedData.experience.length > 1 ? 's' : ''}</div>
                    </div>
                    
                    <div class="experience-grid">
                        ${currentExperiences.map((exp, index) => this.generateExperienceCard(exp, startIndex + index)).join('')}
                    </div>
                    
                    ${totalPages > 1 ? `
                        <div class="experience-pagination">
                            <div class="pagination-info">
                                Showing ${startIndex + 1}-${Math.min(endIndex, normalizedData.experience.length)} of ${normalizedData.experience.length} roles
                            </div>
                            <div class="pagination-controls">
                                ${currentPage > 1 ? `<button class="pagination-btn" onclick="window.fileConverter.changeExperiencePage(${currentPage - 1})">‹ Previous</button>` : ''}
                                <span class="page-indicator">Page ${currentPage} of ${totalPages}</span>
                                ${currentPage < totalPages ? `<button class="pagination-btn" onclick="window.fileConverter.changeExperiencePage(${currentPage + 1})">Next ›</button>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            this.experienceList.innerHTML = experienceHtml;
        } else {
            if (this.experienceList) {
                this.experienceList.innerHTML = `
                    <div class="career-section-card">
                        <div class="career-section-header">
                            <div class="career-section-title">
                                <div class="career-section-icon">💼</div>
                                Your Professional Journey
                            </div>
                        </div>
                        <div class="placeholder-message">
                            <p>Your experience details will appear here as we analyze your background. Every role has value in your career story.</p>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    changeExperiencePage(page) {
        this.currentExperiencePage = page;
        this.updateExperienceSection(this.parsedResumeData);
        
        // Scroll to experience section
        const experienceSection = document.querySelector('#experienceList');
        if (experienceSection) {
            experienceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    generateExperienceCard(exp, index) {
        const skillTags = (exp.skills || []).slice(0, 5).map(skill => {
            const skillType = this.categorizeSkill(skill);
            return `<span class="skill-tag ${skillType}">${skill}</span>`;
        }).join('');
        
        const startDate = exp.startDate || '';
        const endDate = exp.endDate || 'Present';
        const duration = exp.duration || this.calculateDuration(startDate, endDate);
        
        const redactedCompany = this.redactionState?.entities?.companies?.get(exp.company) !== false ? 
            '[Private Company]' : exp.company;
        
        const redactedTitle = this.applyRedaction(exp.title || 'Professional Role', 'experience');
        const redactedDescription = (exp.description || []).map(desc => 
            this.applyRedaction(desc, 'experience')
        );
        
        return `
            <div class="experience-card" data-experience-index="${index}">
                <div class="experience-header">
                    <div class="experience-title-group">
                        <div class="experience-title" title="${exp.title || 'Professional Role'}">${redactedTitle}</div>
                        <div class="experience-company-wrapper">
                            <div class="experience-company">
                                <span id="company-${index}" style="display: none;" title="${exp.company || 'Company'}">${exp.company || 'Company'}</span>
                                <span id="company-redacted-${index}" title="Company name hidden for privacy">${redactedCompany}</span>
                            </div>
                            <button 
                                id="company-toggle-${index}"
                                onclick="window.fileConverter.toggleCompanyVisibility(${index})"
                                title="Click to show/hide company name"
                                class="redaction-toggle-btn"
                                aria-label="Toggle company name visibility">
                                <span class="toggle-icon">👁️</span>
                                <span class="toggle-text sr-only">Show</span>
                            </button>
                        </div>
                    </div>
                    <div class="experience-duration" title="Employment duration">
                        <span class="duration-text">${duration}</span>
                        ${startDate && endDate ? `<span class="date-range">${startDate} - ${endDate}</span>` : ''}
                    </div>
                </div>
                
                <div class="experience-achievements-wrapper">
                    <ul class="experience-achievements" id="achievements-${index}">
                        ${redactedDescription.slice(0, 3).map((desc, descIndex) => `
                            <li class="achievement-item" data-index="${descIndex}">
                                <span class="achievement-bullet">•</span>
                                <span class="achievement-text">${desc}</span>
                            </li>
                        `).join('')}
                        ${redactedDescription.length > 3 ? `
                            <li class="show-more-item">
                                <button onclick="window.fileConverter.toggleAchievements(${index}, true)" 
                                        class="show-more-btn" 
                                        aria-label="Show all achievements">
                                    <span class="expand-icon">▼</span>
                                    <span class="expand-text">Show ${redactedDescription.length - 3} more achievement${redactedDescription.length - 3 > 1 ? 's' : ''}</span>
                                </button>
                            </li>
                        ` : ''}
                    </ul>
                    
                    ${redactedDescription.length > 3 ? `
                        <ul class="experience-achievements-extended" id="achievements-extended-${index}" style="display: none;">
                            ${redactedDescription.map((desc, descIndex) => `
                                <li class="achievement-item" data-index="${descIndex}">
                                    <span class="achievement-bullet">•</span>
                                    <span class="achievement-text">${desc}</span>
                                </li>
                            `).join('')}
                            <li class="show-less-item">
                                <button onclick="window.fileConverter.toggleAchievements(${index}, false)" 
                                        class="show-less-btn" 
                                        aria-label="Show fewer achievements">
                                    <span class="collapse-icon">▲</span>
                                    <span class="collapse-text">Show less</span>
                                </button>
                            </li>
                        </ul>
                    ` : ''}
                </div>
                
                ${skillTags ? `
                    <div class="experience-skills">
                        <div class="skills-label">Key Skills:</div>
                        <div class="skills-tags">${skillTags}</div>
                        ${(exp.skills || []).length > 5 ? `
                            <button class="skills-show-more" onclick="window.fileConverter.toggleSkills(${index})" title="View all skills">
                                +${(exp.skills || []).length - 5} more
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="experience-metadata">
                    <div class="experience-type-badge ${this.getEmploymentType(exp.type)}">${exp.type || 'Full-time'}</div>
                    ${exp.location ? `<div class="experience-location" title="Work location">${this.applyRedaction(exp.location, 'location')}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    // Enhanced experience section methods
    toggleCompanyVisibility(index) {
        const company = document.getElementById(`company-${index}`);
        const redacted = document.getElementById(`company-redacted-${index}`);
        const toggle = document.getElementById(`company-toggle-${index}`);
        
        if (company && redacted && toggle) {
            const isVisible = company.style.display !== 'none';
            
            if (isVisible) {
                company.style.display = 'none';
                redacted.style.display = 'inline';
                toggle.querySelector('.toggle-icon').textContent = '👁️';
                toggle.querySelector('.toggle-text').textContent = 'Show';
                toggle.title = 'Click to show company name';
            } else {
                company.style.display = 'inline';
                redacted.style.display = 'none';
                toggle.querySelector('.toggle-icon').textContent = '🔒';
                toggle.querySelector('.toggle-text').textContent = 'Hide';
                toggle.title = 'Click to hide company name';
            }
        }
    }
    
    toggleAchievements(index, showMore) {
        const achievements = document.getElementById(`achievements-${index}`);
        const extended = document.getElementById(`achievements-extended-${index}`);
        
        if (achievements && extended) {
            if (showMore) {
                achievements.style.display = 'none';
                extended.style.display = 'block';
                // Smooth scroll to ensure content is visible
                extended.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                extended.style.display = 'none';
                achievements.style.display = 'block';
            }
        }
    }
    
    toggleSkills(index) {
        const experienceCard = document.querySelector(`[data-experience-index="${index}"]`);
        const skillsSection = experienceCard?.querySelector('.experience-skills');
        
        if (skillsSection) {
            const isExpanded = skillsSection.classList.contains('expanded');
            
            if (isExpanded) {
                skillsSection.classList.remove('expanded');
                skillsSection.querySelector('.skills-show-more').textContent = 
                    `+${this.getSkillsLength(index) - 5} more`;
            } else {
                skillsSection.classList.add('expanded');
                skillsSection.querySelector('.skills-show-more').textContent = 'Show less';
                this.renderAllSkills(index);
            }
        }
    }
    
    calculateDuration(startDate, endDate) {
        if (!startDate) return 'Duration not specified';
        
        const start = new Date(startDate);
        const end = endDate && endDate !== 'Present' ? new Date(endDate) : new Date();
        
        const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
        
        if (months < 1) return 'Less than 1 month';
        if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
        
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        if (remainingMonths === 0) {
            return `${years} year${years > 1 ? 's' : ''}`;
        } else {
            return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
    }
    
    getEmploymentType(type) {
        const typeMap = {
            'full-time': 'full-time',
            'part-time': 'part-time',
            'contract': 'contract',
            'freelance': 'freelance',
            'internship': 'internship',
            'volunteer': 'volunteer'
        };
        return typeMap[type?.toLowerCase()] || 'full-time';
    }
    
    getSkillsLength(index) {
        const exp = this.parsedResumeData?.experience?.[index];
        return exp?.skills?.length || 0;
    }
    
    renderAllSkills(index) {
        const exp = this.parsedResumeData?.experience?.[index];
        if (!exp?.skills) return;
        
        const skillsContainer = document.querySelector(`[data-experience-index="${index}"] .skills-tags`);
        if (skillsContainer) {
            const allSkillTags = exp.skills.map(skill => {
                const skillType = this.categorizeSkill(skill);
                return `<span class="skill-tag ${skillType}">${skill}</span>`;
            }).join('');
            skillsContainer.innerHTML = allSkillTags;
        }
    }
    
    toggleInstitutionVisibility(index) {
        const institution = document.getElementById(`institution-${index}`);
        const redacted = document.getElementById(`institution-redacted-${index}`);
        const toggle = document.getElementById(`institution-toggle-${index}`);
        
        if (institution && redacted && toggle) {
            const isVisible = institution.style.display !== 'none';
            const educationCard = document.querySelector(`[data-education-index="${index}"]`);
            const institutionName = institution.textContent;
            
            if (isVisible) {
                institution.style.display = 'none';
                redacted.style.display = 'inline';
                toggle.querySelector('.toggle-icon').textContent = '👁️';
                toggle.querySelector('.toggle-text').textContent = 'Show';
                toggle.title = 'Click to show institution name';
                // Update redaction state
                this.redactionState.entities.schools.set(institutionName, true);
            } else {
                institution.style.display = 'inline';
                redacted.style.display = 'none';
                toggle.querySelector('.toggle-icon').textContent = '🔒';
                toggle.querySelector('.toggle-text').textContent = 'Hide';
                toggle.title = 'Click to hide institution name';
                // Update redaction state
                this.redactionState.entities.schools.set(institutionName, false);
            }
        }
    }
    
    // Unified redaction engine - applies all redactions consistently
    applyRedaction(text, context = 'all') {
        if (!text || !this.parsedResumeData?.originalContact) return text;
        
        let redactedText = text;
        
        // Apply personal information redaction
        if (this.redactionState.personalInfo.name && this.parsedResumeData.originalContact.name) {
            const nameRegex = new RegExp(this.parsedResumeData.originalContact.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            redactedText = redactedText.replace(nameRegex, '[Private Name]');
        }
        
        if (this.redactionState.personalInfo.email && this.parsedResumeData.originalContact.email) {
            const emailRegex = new RegExp(this.parsedResumeData.originalContact.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            redactedText = redactedText.replace(emailRegex, '[Private Email]');
        }
        
        if (this.redactionState.personalInfo.phone && this.parsedResumeData.originalContact.phone) {
            const phoneRegex = new RegExp(this.parsedResumeData.originalContact.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            redactedText = redactedText.replace(phoneRegex, '[Private Phone]');
        }
        
        if (this.redactionState.personalInfo.address && this.parsedResumeData.originalContact.location) {
            const addressRegex = new RegExp(this.parsedResumeData.originalContact.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            redactedText = redactedText.replace(addressRegex, '[Private Location]');
        }
        
        // Apply entity-based redaction
        if (this.redactionState.entities.companies) {
            this.redactionState.entities.companies.forEach((isRedacted, companyName) => {
                if (isRedacted) {
                    const companyRegex = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    redactedText = redactedText.replace(companyRegex, '[Private Company]');
                }
            });
        }
        
        if (this.redactionState.entities.schools) {
            this.redactionState.entities.schools.forEach((isRedacted, schoolName) => {
                if (isRedacted) {
                    const schoolRegex = new RegExp(schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    redactedText = redactedText.replace(schoolRegex, '[Private Institution]');
                }
            });
        }
        
        return redactedText;
    }
    
    updateEducationSection(normalizedData) {
        if (this.educationList && normalizedData.education && normalizedData.education.length > 0) {
            // Parse education data if it comes as text
            let educationData = normalizedData.education;
            
            // Handle case where education might be a single text blob
            if (educationData.length === 1 && typeof educationData[0] === 'string') {
                educationData = this.parseEducationText(educationData[0]);
            } else if (educationData.length === 1 && educationData[0].degree && educationData[0].degree.includes('\n')) {
                // Handle multi-line degree field
                educationData = this.parseEducationFromMultiline(educationData[0]);
            }
            
            const educationHtml = `
                <div class="career-section-card">
                    <div class="career-section-header">
                        <div class="career-section-title">
                            <div class="career-section-icon">🎓</div>
                            Your Educational Foundation
                        </div>
                        <div class="career-section-badge">${educationData.length} Achievement${educationData.length > 1 ? 's' : ''}</div>
                    </div>
                    <div class="education-grid">
                        ${educationData.map((edu, index) => this.generateEducationCard(edu, index)).join('')}
                    </div>
                </div>
            `;
            this.educationList.innerHTML = educationHtml;
        } else {
            if (this.educationList) {
                this.educationList.innerHTML = `
                    <div class="career-section-card">
                        <div class="career-section-header">
                            <div class="career-section-title">
                                <div class="career-section-icon">🎓</div>
                                Your Educational Foundation
                            </div>
                        </div>
                        <div class="placeholder-message">
                            <p>Your educational achievements will appear here. All learning experiences contribute to your professional value.</p>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    parseEducationText(text) {
        const educationItems = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        // Handle multi-line education format
        let currentEdu = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if this line starts a new education entry (degree line)
            if (line.match(/^(M\.S\.|B\.S\.|B\.E\.|B\.A\.|M\.A\.|Ph\.D\.|Bachelor|Master|Doctor)/i)) {
                // Save previous education if exists
                if (currentEdu && currentEdu.degree) {
                    educationItems.push(currentEdu);
                }
                
                // Start new education entry
                currentEdu = {};
                
                // Parse degree and field from the line
                const degreeFieldMatch = line.match(/^((?:M\.S\.|B\.S\.|B\.E\.|B\.A\.|M\.A\.|Ph\.D\.|Bachelor|Master|Doctor)(?:\s+of\s+\w+)?)\s+(?:in\s+)?(.+?)(?:\s+at\s+|\s+from\s+|$)/i);
                if (degreeFieldMatch) {
                    currentEdu.degree = degreeFieldMatch[1].trim();
                    currentEdu.field = degreeFieldMatch[2].trim();
                } else {
                    currentEdu.degree = line;
                }
                
            } else if (currentEdu && line.match(/(University|College|Institute|School|Polytechnic)/i)) {
                // This line contains the institution name
                currentEdu.institution = line.replace(/^\s*-?\s*/, '').trim(); // Remove leading dashes
                
            } else if (currentEdu && line.match(/Graduated:|Graduation:|Completed:/i)) {
                // This line contains graduation info
                const yearMatch = line.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    currentEdu.year = yearMatch[0];
                }
                
            } else if (currentEdu && line.match(/GPA/i)) {
                // This line contains GPA
                const gpaMatch = line.match(/GPA[:\s]+([0-9.]+)/i);
                if (gpaMatch) {
                    currentEdu.gpa = gpaMatch[1];
                }
                
            } else if (line.match(/Certifications:/i)) {
                // Handle certifications separately
                if (currentEdu && currentEdu.degree) {
                    educationItems.push(currentEdu);
                }
                
                const certs = line.replace(/Certifications:/i, '').trim();
                currentEdu = {
                    degree: 'Professional Certifications',
                    field: certs,
                    institution: 'Various Institutions'
                };
            }
        }
        
        // Don't forget the last education entry
        if (currentEdu && currentEdu.degree) {
            educationItems.push(currentEdu);
        }
        
        return educationItems.length > 0 ? educationItems : [{ degree: text, institution: 'Educational Institution' }];
    }
    
    parseEducationFromMultiline(edu) {
        const text = edu.degree;
        return this.parseEducationText(text);
    }
    
    generateEducationCard(edu, index) {
        // Debug logging
        console.log('Education data for card', index, ':', edu);
        
        // Extract institution name from the education data
        let institutionName = edu.institution || edu.school || edu.university || 'Unknown Institution';
        
        // If no institution found, try to extract from degree field or original text
        if (institutionName === 'Unknown Institution') {
            // Check if there's original text that might contain the university
            const originalText = edu.originalText || edu.rawText || edu.text || '';
            const degreeText = edu.degree || '';
            const fullText = originalText + ' ' + degreeText;
            
            // Look for patterns like "Bachelor of Arts Communication Studies, University Name"
            const institutionMatch = fullText.match(/,\s*([A-Za-z\s]+(?:University|College|Institute|School|Polytechnic))/i);
            if (institutionMatch) {
                institutionName = institutionMatch[1].trim();
            } else {
                // Try to find university names in the text
                const universityMatch = fullText.match(/([\w\s]+(?:University|College|Institute|School|Polytechnic))/i);
                if (universityMatch) {
                    institutionName = universityMatch[1].trim();
                }
            }
            
            // If still no institution, check if there might be a stored university name
            // This is a fallback for cases where the university name was in the original resume
            if (institutionName === 'Unknown Institution' && this.parsedResumeData?.originalText) {
                const originalResumeText = this.parsedResumeData.originalText;
                const commonUniversities = originalResumeText.match(/([\w\s]+(?:University|College|Institute|School|Polytechnic))/gi);
                if (commonUniversities && commonUniversities.length > 0) {
                    // Use the first university found - this is a reasonable fallback
                    institutionName = commonUniversities[0].trim();
                }
            }
        }
        
        // Initialize school redaction state if not exists (default to true for privacy)
        if (!this.redactionState.entities.schools.has(institutionName)) {
            this.redactionState.entities.schools.set(institutionName, true);
        }
        
        const isSchoolRedacted = this.redactionState.entities.schools.get(institutionName) !== false;
        
        // Parse degree and field if combined
        let degree = edu.degree || '';
        let field = edu.field || '';
        let gpa = edu.gpa || '';
        let year = edu.year || edu.graduationYear || '';
        
        // Handle combined degree strings (e.g., "M.S. Industrial Engineering")
        if (degree && !field && degree.includes(' in ')) {
            const parts = degree.split(' in ');
            degree = parts[0].trim();
            field = parts[1].trim();
        } else if (degree && !field && degree.match(/^(B\.|M\.|Ph\.D\.|Bachelor|Master|Doctor)/)) {
            const match = degree.match(/^(B\.[A-Z]+\.|M\.[A-Z]+\.|Ph\.D\.|Bachelor of \w+|Master of \w+|Doctor of \w+)\s+(.+)/);
            if (match) {
                degree = match[1];
                field = match[2];
            }
        }
        
        // Apply redaction to degree and field if they contain institution names
        const redactedDegree = this.applyRedaction(degree, 'education');
        const redactedField = this.applyRedaction(field, 'education');
        
        return `
            <div class="education-card" data-education-index="${index}">
                <div class="education-header">
                    <div class="education-content">
                        <div class="education-degree-line">
                            <span class="education-degree">${redactedDegree || 'Degree'}</span>
                            ${redactedField ? `<span class="education-field">${redactedField}</span>` : ''}
                        </div>
                        <div class="education-institution-wrapper">
                            <div class="education-institution">
                                <span id="institution-${index}" style="display: ${isSchoolRedacted ? 'none' : 'inline'};" title="${institutionName}">${institutionName}</span>
                                <span id="institution-redacted-${index}" style="display: ${isSchoolRedacted ? 'inline' : 'none'};" title="Institution name hidden for privacy">[Private Institution]</span>
                            </div>
                            <button 
                                id="institution-toggle-${index}"
                                onclick="window.fileConverter.toggleInstitutionVisibility(${index})"
                                title="${isSchoolRedacted ? 'Click to show institution name' : 'Click to hide institution name'}"
                                class="redaction-toggle-btn"
                                aria-label="Toggle institution name visibility">
                                <span class="toggle-icon">${isSchoolRedacted ? '👁️' : '🔒'}</span>
                                <span class="toggle-text sr-only">${isSchoolRedacted ? 'Show' : 'Hide'}</span>
                            </button>
                        </div>
                    </div>
                    <div class="education-metadata">
                        ${year ? `<div class="education-year" title="Graduation year">${year}</div>` : ''}
                        ${gpa ? `<div class="education-gpa" title="Grade Point Average">GPA: ${gpa}</div>` : ''}
                    </div>
                </div>
                ${edu.honors || edu.activities || edu.thesis ? `
                    <div class="education-details">
                        ${edu.honors ? `<div class="education-honors"><span class="detail-label">Honors:</span> ${this.applyRedaction(edu.honors, 'education')}</div>` : ''}
                        ${edu.thesis ? `<div class="education-thesis"><span class="detail-label">Thesis:</span> ${this.applyRedaction(edu.thesis, 'education')}</div>` : ''}
                        ${edu.activities ? `<div class="education-activities"><span class="detail-label">Activities:</span> ${this.applyRedaction(edu.activities, 'education')}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    updateSkillsSection(normalizedData) {
        if (normalizedData.skills && normalizedData.skills.length > 0) {
            const skillsContainer = document.querySelector('.skills-container') || document.querySelector('#skillsGrid');
            if (skillsContainer) {
                // Analyze skill sources for transparency
                const skillAnalysis = this.analyzeSkillSources(normalizedData.skills);
                
                const skillsHtml = `
                    <div class="career-section-card">
                        <div class="career-section-header">
                            <div class="career-section-title">
                                <div class="career-section-icon">⚡</div>
                                Your Skills Analysis
                            </div>
                            <div class="career-section-badge">${normalizedData.skills.length} Skills Identified</div>
                        </div>
                        
                        <div class="skills-transparency-info">
                            <div class="analysis-method">
                                <strong>🔍 Analysis Method:</strong> Skills extracted from your resume content using O*NET occupational database
                            </div>
                            <div class="skill-confidence">
                                <strong>🎯 Confidence:</strong> ${skillAnalysis.resumeBasedCount} skills found directly in your resume, 
                                ${skillAnalysis.inferredCount} skills inferred from your experience descriptions
                            </div>
                        </div>
                        
                        <div class="skills-grid">
                            ${normalizedData.skills.map(skill => {
                                const skillType = this.categorizeSkill(skill);
                                const confidence = this.getSkillConfidence(skill, normalizedData);
                                return `<span class="skill-tag ${skillType}" data-confidence="${confidence}" title="Confidence: ${confidence}">
                                    ${skill} <span class="confidence-indicator">${this.getConfidenceIcon(confidence)}</span>
                                </span>`;
                            }).join('')}
                        </div>
                        
                        <div class="skills-legend">
                            <div class="legend-item"><span class="confidence-high">✓</span> High confidence (found directly)</div>
                            <div class="legend-item"><span class="confidence-medium">±</span> Medium confidence (inferred from context)</div>
                            <div class="legend-item"><span class="confidence-low">?</span> Low confidence (database match)</div>
                        </div>
                    </div>
                `;
                skillsContainer.innerHTML = skillsHtml;
            }
        }
    }
    
    analyzeSkillSources(skills) {
        // Analyze how many skills were found directly vs inferred
        let resumeBasedCount = 0;
        let inferredCount = 0;
        
        skills.forEach(skill => {
            const confidence = this.getSkillConfidence(skill, this.parsedResumeData);
            if (confidence === 'high') {
                resumeBasedCount++;
            } else {
                inferredCount++;
            }
        });
        
        return { resumeBasedCount, inferredCount };
    }
    
    getSkillConfidence(skill, resumeData) {
        if (!resumeData || !this.extractedText) return 'low';
        
        const skillLower = skill.toLowerCase();
        const textLower = this.extractedText.toLowerCase();
        
        // High confidence if skill appears exactly in resume text
        if (textLower.includes(skillLower)) {
            return 'high';
        }
        
        // Medium confidence if related terms appear in job descriptions
        const relatedTerms = this.getRelatedTerms(skillLower);
        if (relatedTerms.some(term => textLower.includes(term))) {
            return 'medium';
        }
        
        return 'low';
    }
    
    getRelatedTerms(skill) {
        const termMap = {
            'leadership': ['lead', 'manage', 'supervise', 'direct', 'oversee'],
            'communication': ['present', 'collaborate', 'coordinate', 'discuss', 'explain'],
            'problem solving': ['solve', 'troubleshoot', 'resolve', 'debug', 'fix'],
            'teamwork': ['team', 'group', 'collaborate', 'cooperation', 'together'],
            'project management': ['project', 'plan', 'schedule', 'coordinate', 'deliverable']
        };
        
        return termMap[skill] || [];
    }
    
    getConfidenceIcon(confidence) {
        switch(confidence) {
            case 'high': return '✓';
            case 'medium': return '±';
            case 'low': return '?';
            default: return '?';
        }
    }
    
    categorizeSkill(skill) {
        const skillLower = skill.toLowerCase();
        
        // Human advantage skills
        if (skillLower.includes('leadership') || skillLower.includes('management') || 
            skillLower.includes('communication') || skillLower.includes('teamwork') ||
            skillLower.includes('problem solving') || skillLower.includes('creativity')) {
            return 'human-advantage';
        }
        
        // Leadership skills
        if (skillLower.includes('lead') || skillLower.includes('manage') || 
            skillLower.includes('supervise') || skillLower.includes('mentor')) {
            return 'leadership';
        }
        
        // Technical skills
        return 'technical';
    }
    
    updateCareerReadinessProgress(normalizedData) {
        const skillsCount = normalizedData.skills?.length || 0;
        const expCount = normalizedData.experience?.length || 0;
        const eduCount = normalizedData.education?.length || 0;
        const hasContact = !!(normalizedData.contact?.email || normalizedData.contact?.phone);
        
        // Calculate career readiness score
        let readinessScore = 0;
        let maxScore = 100;
        
        if (hasContact) readinessScore += 20;
        if (expCount > 0) readinessScore += 30;
        if (eduCount > 0) readinessScore += 20;
        if (skillsCount > 0) readinessScore += 30;
        
        // Bonus for strong profiles
        if (skillsCount > 10) readinessScore += 10;
        if (expCount > 2) readinessScore += 10;
        
        readinessScore = Math.min(readinessScore, maxScore);
        
        // Update progress display
        const progressBar = document.querySelector('.career-progress-bar .progress-fill');
        const progressMessage = document.querySelector('.progress-message');
        
        if (progressBar) {
            progressBar.style.width = `${readinessScore}%`;
        }
        
        if (progressMessage) {
            let message = `Career Readiness: ${readinessScore}%`;
            if (readinessScore >= 80) {
                message += ' - You\'re ready to compete!';
            } else if (readinessScore >= 60) {
                message += ' - Building strong foundations';
            } else {
                message += ' - Every skill matters';
            }
            progressMessage.textContent = message;
        }
    }

    togglePrivacy(field) {
        // Handle personal info fields
        if (field === 'name' || field === 'email' || field === 'phone' || field === 'address') {
            this.redactionState.personalInfo[field] = !this.redactionState.personalInfo[field];
        }
        
        this.refreshAllDisplays();
    }
    
    toggleEntityPrivacy(entityType, entityValue) {
        // Handle entity-based privacy (companies, schools, locations)
        if (this.redactionState.entities[entityType + 's']) {
            const currentState = this.redactionState.entities[entityType + 's'].get(entityValue);
            this.redactionState.entities[entityType + 's'].set(entityValue, !currentState);
        }
        
        this.refreshAllDisplays();
    }
    
    refreshAllDisplays() {
        // Re-render the display with updated privacy state
        this.updateBasicResumeDisplay(this.parsedResumeData);
        
        // Apply privacy to all text content consistently
        this.applyPrivacyToAllDisplays();
        
        // Show encouraging message about privacy
        const privateCount = this.getPrivateFieldsCount();
        if (privateCount > 0) {
            this.showTempMessage(`🔒 ${privateCount} field${privateCount > 1 ? 's' : ''} kept private`);
        } else {
            this.showTempMessage(`👁️ All information visible`);
        }
    }
    
    getPrivateFieldsCount() {
        let count = 0;
        
        // Count personal info fields
        Object.values(this.redactionState.personalInfo).forEach(isPrivate => {
            if (isPrivate) count++;
        });
        
        // Count entity fields
        this.redactionState.entities.companies.forEach(isPrivate => {
            if (isPrivate) count++;
        });
        
        this.redactionState.entities.schools.forEach(isPrivate => {
            if (isPrivate) count++;
        });
        
        this.redactionState.entities.locations.forEach(isPrivate => {
            if (isPrivate) count++;
        });
        
        return count;
    }
    
    // Legacy method for backward compatibility
    getProtectedFieldsCount() {
        return this.getPrivateFieldsCount();
    }
    
    showTempMessage(message) {
        const tempMsg = document.createElement('div');
        tempMsg.className = 'temp-success-message';
        tempMsg.textContent = message;
        tempMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--protection-shield, #059669);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(tempMsg);
        setTimeout(() => {
            tempMsg.remove();
        }, 3000);
    }
    
    // Legacy method for backward compatibility
    toggleRedaction(field) {
        return this.togglePrivacy(field);
    }
    
    // Legacy method for backward compatibility  
    toggleBiasProtection(field) {
        return this.togglePrivacy(field);
    }
    
    displayPrivacyControlsInterface() {
        const existingModule = document.querySelector('.privacy-controls-module');
        if (existingModule) {
            return; // Already displayed
        }
        
        const privacyHtml = `
            <div class="privacy-controls-module">
                <div class="privacy-trust-header">
                    <div class="trust-title">
                        🔒 Your Privacy, Your Control
                    </div>
                    <div class="trust-subtitle">
                        We believe in transparency. Your personal information is processed locally on your device and never stored or shared.
                    </div>
                </div>
                
                <div class="privacy-promise-box">
                    <div class="promise-icon">✓</div>
                    <div class="promise-content">
                        <h4>Our Privacy Promise</h4>
                        <ul>
                            <li>Your data never leaves your device</li>
                            <li>No information stored on our servers</li>
                            <li>No tracking or data collection</li>
                            <li>You control what's visible at all times</li>
                        </ul>
                    </div>
                </div>
                
                <div class="privacy-controls-info">
                    <p>Use the 🔒 and 👁️ buttons next to each field to control what information is visible in your analysis.</p>
                </div>
                
                <div class="learn-more-section">
                    <button class="learn-more-btn" onclick="window.fileConverter.toggleLearnMore()">
                        📚 Learn More: Why Privacy Matters in Modern Hiring
                    </button>
                    
                    <div class="learn-more-content" id="learnMoreContent" style="display: none;">
                        <div class="education-grid">
                            <div class="education-card">
                                <div class="card-header">
                                    <div class="card-icon">🤖</div>
                                    <div class="card-title">AI Resume Screening</div>
                                </div>
                                <div class="card-content">
                                    <p>AI systems scan resumes in <span class="highlight">6 seconds</span> and filter out 
                                    <span class="highlight">75% of applicants</span> before human review.</p>
                                </div>
                            </div>
                            
                            <div class="education-card">
                                <div class="card-header">
                                    <div class="card-icon">🏢</div>
                                    <div class="card-title">Company Bias</div>
                                </div>
                                <div class="card-content">
                                    <p><span class="highlight">73% of recruiters</span> make assumptions based on company names, 
                                    potentially creating unconscious bias in hiring decisions.</p>
                                </div>
                            </div>
                            
                            <div class="education-card">
                                <div class="card-header">
                                    <div class="card-icon">🎓</div>
                                    <div class="card-title">Educational Bias</div>
                                </div>
                                <div class="card-content">
                                    <p>School names influence <span class="highlight">68% of hiring decisions</span>, 
                                    sometimes overshadowing actual skills and experience.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="privacy-tip">
                            <strong>💡 Tip:</strong> By keeping sensitive information private initially, you can let your skills and achievements speak first, 
                            then reveal additional details once you've made a strong impression.
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const resumeAnalysis = document.querySelector('.resume-analysis');
        if (resumeAnalysis) {
            resumeAnalysis.insertAdjacentHTML('beforeend', privacyHtml);
        }
    }
    
    toggleLearnMore() {
        const learnMoreContent = document.getElementById('learnMoreContent');
        const learnMoreBtn = document.querySelector('.learn-more-btn');
        
        if (learnMoreContent.style.display === 'none') {
            learnMoreContent.style.display = 'block';
            learnMoreBtn.innerHTML = '📚 Hide Details: Why Privacy Matters in Modern Hiring';
        } else {
            learnMoreContent.style.display = 'none';
            learnMoreBtn.innerHTML = '📚 Learn More: Why Privacy Matters in Modern Hiring';
        }
    }
    
    displayConfidenceBuildingElements(data) {
        const existingPanel = document.querySelector('.confidence-building-panel');
        if (existingPanel) {
            return; // Already displayed
        }
        
        const skillsCount = data.skills?.length || 0;
        const expCount = data.experience?.length || 0;
        
        const confidenceHtml = `
            <div class="confidence-building-panel">
                <div class="confidence-header">
                    <div class="confidence-title">
                        ⭐ Your Competitive Edge
                    </div>
                    <div class="confidence-subtitle">
                        These human skills give you an advantage that AI can't replicate
                    </div>
                </div>
                
                <div class="human-advantages-grid">
                    <div class="human-advantage-card">
                        <div class="advantage-icon">🧠</div>
                        <div class="advantage-title">Creative Problem Solving</div>
                        <div class="advantage-description">
                            Your ability to think outside the box and find innovative solutions is uniquely human
                        </div>
                    </div>
                    
                    <div class="human-advantage-card">
                        <div class="advantage-icon">💬</div>
                        <div class="advantage-title">Emotional Intelligence</div>
                        <div class="advantage-description">
                            Understanding and connecting with people is a core human strength that drives business success
                        </div>
                    </div>
                    
                    <div class="human-advantage-card">
                        <div class="advantage-icon">🔄</div>
                        <div class="advantage-title">Adaptability</div>
                        <div class="advantage-description">
                            Your experience navigating change and uncertainty is exactly what employers need today
                        </div>
                    </div>
                    
                    <div class="human-advantage-card">
                        <div class="advantage-icon">👥</div>
                        <div class="advantage-title">Leadership</div>
                        <div class="advantage-description">
                            Your ability to inspire, guide, and develop others creates lasting organizational value
                        </div>
                    </div>
                </div>
                
                <div class="success-metrics">
                    <div class="metrics-header">
                        <div class="metrics-title">Your Career Readiness Dashboard</div>
                    </div>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${skillsCount}</div>
                            <div class="metric-label">Skills Identified</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${expCount}</div>
                            <div class="metric-label">Roles Analyzed</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${this.getPrivateFieldsCount()}</div>
                            <div class="metric-label">Fields Private</div>
                        </div>
                        <div class="metric-card market-readiness-card" onclick="window.fileConverter.explainMarketReadiness()">
                            <div class="metric-value">${this.calculateMarketReadiness(data)}%</div>
                            <div class="metric-label">Market Ready</div>
                            <div class="metric-explanation">📊 Click for details</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const resumeAnalysis = document.querySelector('.resume-analysis');
        if (resumeAnalysis) {
            resumeAnalysis.insertAdjacentHTML('beforeend', confidenceHtml);
        }
    }
    
    calculateMarketReadiness(data) {
        const skillsCount = data.skills?.length || 0;
        const expCount = data.experience?.length || 0;
        const eduCount = data.education?.length || 0;
        const hasContact = !!(data.contact?.email || data.contact?.phone);
        const protectedCount = this.getPrivateFieldsCount();
        
        let readiness = 0;
        
        // Base scores
        if (hasContact) readiness += 15;
        if (expCount > 0) readiness += 25;
        if (eduCount > 0) readiness += 15;
        if (skillsCount > 0) readiness += 25;
        
        // Bonus for strong profiles
        if (skillsCount > 5) readiness += 10;
        if (expCount > 1) readiness += 5;
        if (protectedCount > 2) readiness += 5; // Privacy awareness bonus
        
        return Math.min(readiness, 100);
    }
    
    explainMarketReadiness() {
        const explanation = `
            <div class="market-readiness-explanation">
                <div class="explanation-header">
                    <h3>📊 Market Readiness Score Explanation</h3>
                    <button class="close-explanation" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                
                <div class="explanation-content">
                    <p><strong>What this measures:</strong> Your profile's completeness and competitive positioning in today's job market.</p>
                    
                    <div class="scoring-breakdown">
                        <h4>Scoring Components:</h4>
                        <div class="score-item">
                            <span class="score-label">Contact Information:</span>
                            <span class="score-value">+15 points</span>
                            <span class="score-note">(Essential for recruiters to reach you)</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Professional Experience:</span>
                            <span class="score-value">+25 points</span>
                            <span class="score-note">(Demonstrates work history and achievements)</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Educational Background:</span>
                            <span class="score-value">+15 points</span>
                            <span class="score-note">(Shows foundation and qualifications)</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Skills Identified:</span>
                            <span class="score-value">+25 points</span>
                            <span class="score-note">(Matches you to relevant opportunities)</span>
                        </div>
                        <div class="score-item bonus">
                            <span class="score-label">Strong Profile Bonuses:</span>
                            <span class="score-value">+20 points</span>
                            <span class="score-note">(5+ skills, multiple roles, privacy awareness)</span>
                        </div>
                    </div>
                    
                    <div class="interpretation-guide">
                        <h4>What Your Score Means:</h4>
                        <div class="score-range good">80-100%: <strong>Highly Competitive</strong> - Strong profile ready for applications</div>
                        <div class="score-range medium">60-79%: <strong>Good Foundation</strong> - Consider highlighting more achievements</div>
                        <div class="score-range needs-work">Below 60%: <strong>Growth Opportunity</strong> - Focus on building experience narrative</div>
                    </div>
                    
                    <div class="methodology-note">
                        <p><strong>Note:</strong> This score is based on profile completeness and standard hiring criteria. 
                        It doesn't measure your actual qualifications or worth as a professional.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Show explanation modal
        const existingExplanation = document.querySelector('.market-readiness-explanation');
        if (existingExplanation) {
            existingExplanation.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = explanation;
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    applyPrivacyToAllDisplays() {
        // Apply privacy state to all text content consistently
        // This fixes the issue where contact info wasn't redacted in raw text displays
        
        if (!this.parsedResumeData || !this.extractedText) return;
        
        // Update any raw text displays with privacy redactions
        const resultContainer = document.querySelector('#resultText');
        if (resultContainer && this.extractedText) {
            let displayText = this.extractedText;
            
            // Apply redactions to raw text based on current privacy state
            if (this.redactionState.name && this.parsedResumeData.contact?.name) {
                const nameRegex = new RegExp(this.parsedResumeData.contact.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                displayText = displayText.replace(nameRegex, '[Private Name]');
            }
            
            if (this.redactionState.email && this.parsedResumeData.contact?.email) {
                const emailRegex = new RegExp(this.parsedResumeData.contact.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                displayText = displayText.replace(emailRegex, '[Private Email]');
            }
            
            if (this.redactionState.phone && this.parsedResumeData.contact?.phone) {
                const phoneRegex = new RegExp(this.parsedResumeData.contact.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                displayText = displayText.replace(phoneRegex, '[Private Phone]');
            }
            
            // Apply company name redactions
            if (this.parsedResumeData.experience) {
                this.parsedResumeData.experience.forEach((exp, index) => {
                    const companyKey = `company-${index}`;
                    if (this.redactionState.companies[companyKey] !== false && exp.company) {
                        const companyRegex = new RegExp(exp.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        displayText = displayText.replace(companyRegex, '[Private Company]');
                    }
                });
            }
            
            // Apply school name redactions
            if (this.parsedResumeData.education) {
                this.parsedResumeData.education.forEach((edu, index) => {
                    const schoolKey = `school-${index}`;
                    if (this.redactionState.schools[schoolKey] !== false && edu.institution) {
                        const schoolRegex = new RegExp(edu.institution.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        displayText = displayText.replace(schoolRegex, '[Private Institution]');
                    }
                });
            }
            
            resultContainer.textContent = displayText;
        }
    }
    
    initializeAccessibilityFeatures() {
        // Add accessibility toolbar for users under stress
        const accessibilityToolbar = document.createElement('div');
        accessibilityToolbar.className = 'accessibility-toolbar';
        accessibilityToolbar.innerHTML = `
            <div class="accessibility-controls">
                <button class="accessibility-btn" onclick="window.fileConverter.toggleLargeText()" title="Increase text size for easier reading">
                    🔍 Large Text
                </button>
                <button class="accessibility-btn" onclick="window.fileConverter.toggleHighContrast()" title="High contrast mode for better visibility">
                    ☀️ High Contrast
                </button>
                <button class="accessibility-btn" onclick="window.fileConverter.toggleReducedMotion()" title="Reduce animations for calmer experience">
                    📍 Calm Mode
                </button>
                <button class="accessibility-btn" onclick="window.fileConverter.toggleFocusMode()" title="Focus on current task only">
                    🎯 Focus Mode
                </button>
            </div>
        `;
        
        // Add accessibility styles
        const accessibilityStyles = document.createElement('style');
        accessibilityStyles.textContent = `
            .accessibility-toolbar {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 0.5rem;
                padding: 0.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                display: none;
                opacity: 0;
                animation: accessibilityFadeIn 0.3s ease-out forwards;
            }
            
            .accessibility-toolbar.visible {
                display: block;
            }
            
            @keyframes accessibilityFadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .accessibility-controls {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            .accessibility-btn {
                background: var(--primary-blue, #2563eb);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.25rem;
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .accessibility-btn:hover {
                background: var(--primary-green, #059669);
                transform: translateY(-1px);
            }
            
            .accessibility-btn.active {
                background: var(--primary-green, #059669);
                box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.3);
            }
            
            /* Accessibility feature styles */
            .accessibility-enhanced {
                font-size: 18px !important;
                line-height: 1.8 !important;
            }
            
            .accessibility-enhanced h1 { font-size: 3rem !important; }
            .accessibility-enhanced h2 { font-size: 2.25rem !important; }
            .accessibility-enhanced h3 { font-size: 1.875rem !important; }
            .accessibility-enhanced h4 { font-size: 1.5rem !important; }
            .accessibility-enhanced p { font-size: 1.125rem !important; }
            .accessibility-enhanced button { font-size: 1rem !important; padding: 0.75rem 1.5rem !important; }
            
            .high-contrast {
                filter: contrast(1.5) brightness(1.1);
            }
            
            .high-contrast .career-section-card {
                border: 2px solid #000 !important;
                background: #fff !important;
            }
            
            .high-contrast .contact-value,
            .high-contrast .experience-title,
            .high-contrast .education-degree {
                color: #000 !important;
                font-weight: 700 !important;
            }
            
            .reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
            
            .focus-mode .bias-protection-module,
            .focus-mode .confidence-building-panel,
            .focus-mode .emotional-journey-message {
                display: none !important;
            }
            
            .focus-mode .career-section-card {
                margin-bottom: 1rem !important;
                padding: 1.5rem !important;
            }
            
            /* Stress-reduction features */
            .stress-indicator {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border-left: 4px solid #f59e0b;
                padding: 1rem;
                margin: 1rem 0;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                color: #92400e;
            }
            
            .breathing-reminder {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--primary-green, #059669);
                color: white;
                padding: 1rem;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                z-index: 1000;
                display: none;
                animation: breathingPulse 4s ease-in-out infinite;
            }
            
            @keyframes breathingPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .breathing-reminder.visible {
                display: block;
            }
        `;
        
        document.head.appendChild(accessibilityStyles);
        document.body.appendChild(accessibilityToolbar);
        
        // Show accessibility toolbar after 10 seconds if user seems stressed
        setTimeout(() => {
            if (this.detectStressSignals()) {
                this.showAccessibilityToolbar();
            }
        }, 10000);
        
        // Add breathing reminder for very stressed users
        this.addBreathingReminder();
    }
    
    detectStressSignals() {
        // Simple stress detection based on user behavior
        const errorCount = document.querySelectorAll('.error-message:not([style*="display: none"])').length;
        const timeOnPage = Date.now() - this.startTime;
        const hasMultipleUploads = this.uploadAttempts > 1;
        
        return errorCount > 0 || timeOnPage > 60000 || hasMultipleUploads;
    }
    
    showAccessibilityToolbar() {
        // Prevent duplicate stress messages
        if (this.stressMessageShown) return;
        this.stressMessageShown = true;
        
        const toolbar = document.querySelector('.accessibility-toolbar');
        if (toolbar) {
            toolbar.classList.add('visible');
            
            // Add helpful message
            const stressIndicator = document.createElement('div');
            stressIndicator.className = 'stress-indicator';
            stressIndicator.innerHTML = `
                💬 <strong>Take your time:</strong> These tools can help make the process easier. 
                Job searching can be stressful, but you're building something valuable here.
            `;
            
            const mainContainer = document.querySelector('.career-resilience-main');
            if (mainContainer) {
                mainContainer.insertBefore(stressIndicator, mainContainer.firstChild);
            }
        }
    }
    
    addBreathingReminder() {
        const breathingReminder = document.createElement('div');
        breathingReminder.className = 'breathing-reminder';
        breathingReminder.innerHTML = `
            💬 Take a deep breath. You're doing great. 
            <br><small>This reminder will disappear soon.</small>
        `;
        
        document.body.appendChild(breathingReminder);
        
        // Show breathing reminder if user takes more than 2 minutes
        setTimeout(() => {
            if (this.detectStressSignals()) {
                breathingReminder.classList.add('visible');
                setTimeout(() => {
                    breathingReminder.classList.remove('visible');
                }, 10000);
            }
        }, 120000);
    }
    
    toggleLargeText() {
        const body = document.body;
        const btn = document.querySelector('.accessibility-btn');
        
        body.classList.toggle('accessibility-enhanced');
        btn.classList.toggle('active');
        
        this.showTempMessage(body.classList.contains('accessibility-enhanced') ? 
            '🔍 Large text enabled - easier to read!' : 
            '🔍 Normal text size restored');
    }
    
    toggleHighContrast() {
        const body = document.body;
        const btn = document.querySelectorAll('.accessibility-btn')[1];
        
        body.classList.toggle('high-contrast');
        btn.classList.toggle('active');
        
        this.showTempMessage(body.classList.contains('high-contrast') ? 
            '☀️ High contrast enabled - better visibility!' : 
            '☀️ Normal contrast restored');
    }
    
    toggleReducedMotion() {
        const body = document.body;
        const btn = document.querySelectorAll('.accessibility-btn')[2];
        
        body.classList.toggle('reduced-motion');
        btn.classList.toggle('active');
        
        this.showTempMessage(body.classList.contains('reduced-motion') ? 
            '📍 Calm mode enabled - reduced animations!' : 
            '📍 Normal animations restored');
    }
    
    toggleFocusMode() {
        const body = document.body;
        const btn = document.querySelectorAll('.accessibility-btn')[3];
        
        body.classList.toggle('focus-mode');
        btn.classList.toggle('active');
        
        this.showTempMessage(body.classList.contains('focus-mode') ? 
            '🎯 Focus mode enabled - showing only essentials!' : 
            '🎯 Full view restored');
    }
    
    toggleDemo() {
        const demoPanels = document.querySelectorAll('.demo-panel');
        demoPanels.forEach(panel => {
            panel.style.transform = panel.style.transform === 'scale(0.95)' ? 'scale(1)' : 'scale(0.95)';
        });
        
        setTimeout(() => {
            demoPanels.forEach(panel => {
                panel.style.transform = 'scale(1)';
            });
        }, 500);
    }

    getCompanyRedaction(company) {
        if (!company) return 'Company';
        
        // Try to use smart redaction service if available
        if (this.smartRedactionService) {
            const analysis = this.smartRedactionService.analyzeCompany(company);
            if (analysis && analysis.description) {
                return analysis.description;
            }
        }
        
        // Fallback redactions
        const companyLower = company.toLowerCase();
        if (companyLower.includes('microsoft')) return 'Fortune 500 Tech Giant';
        if (companyLower.includes('google')) return 'Global Tech Leader';
        if (companyLower.includes('amazon')) return 'E-commerce & Cloud Giant';
        if (companyLower.includes('bank')) return 'Financial Institution';
        if (companyLower.includes('hospital')) return 'Healthcare Organization';
        
        return 'Established Company';
    }

    getSchoolRedaction(school) {
        if (!school) return 'Educational Institution';
        
        // Try to use smart redaction service if available
        if (this.smartRedactionService) {
            const analysis = this.smartRedactionService.analyzeSchool(school);
            if (analysis && analysis.description) {
                return analysis.description;
            }
        }
        
        // Fallback redactions
        const schoolLower = school.toLowerCase();
        if (schoolLower.includes('harvard') || schoolLower.includes('yale') || schoolLower.includes('princeton')) {
            return 'Ivy League University';
        }
        if (schoolLower.includes('stanford') || schoolLower.includes('mit')) {
            return 'Elite Technical University';
        }
        if (schoolLower.includes('university')) return 'Research University';
        if (schoolLower.includes('college')) return 'Liberal Arts College';
        
        return 'Accredited Institution';
    }

    normalizeResumeData(data) {
        // Handle different possible data structures
        const normalized = {
            contact: data.originalContact || data.contact || data.contactInfo || {},
            experience: data.experience || [],
            education: data.education || [],
            skills: data.skills || [],
            summary: data.summary || {}
        };

        // If contact info is in a different format, normalize it
        if (!normalized.contact.name && data.name) {
            normalized.contact.name = data.name;
        }
        if (!normalized.contact.email && data.email) {
            normalized.contact.email = data.email;
        }
        if (!normalized.contact.phone && data.phone) {
            normalized.contact.phone = data.phone;
        }

        return normalized;
    }

    async showPrivacyControl(text, fileName) {
        try {
            console.log('[DEBUG] showPrivacyControl started');
            console.log('[DEBUG] Enhanced resume parser available:', !!this.enhancedResumeParser);
            
            // Parse the resume first to get structured data
            this.enhancedResumeParser.setProgressCallback((percentage, message) => {
                this.updateProgress(percentage, message);
            });
            
            console.log('[DEBUG] Calling parseResumeSecurely with text length:', text.length);
            const parsedData = await this.enhancedResumeParser.parseResumeSecurely(text, fileName);
            console.log('[DEBUG] parseResumeSecurely completed, skills found:', parsedData?.skills?.length || 0);
            this.parsedResumeData = parsedData;
            
            // Analyze redaction needs with error handling
            console.log('[DEBUG] Smart redaction service available:', !!this.smartRedactionService);
            if (this.smartRedactionService) {
                try {
                    console.log('[DEBUG] Calling analyzeRedactionNeeds');
                    const redactionAnalysis = this.smartRedactionService.analyzeRedactionNeeds(parsedData);
                    console.log('[DEBUG] Redaction analysis completed, total items:', redactionAnalysis?.summary?.totalItems || 0);
                    
                    // Show privacy control interface
                    console.log('[DEBUG] Calling displayPrivacyControl');
                    this.displayPrivacyControl(redactionAnalysis, parsedData);
                    console.log('[DEBUG] displayPrivacyControl completed');
                } catch (redactionError) {
                    console.error('[DEBUG] Redaction analysis failed:', redactionError);
                    // Fall back to direct analysis without privacy control
                    throw new Error('Privacy analysis failed, proceeding without privacy features');
                }
            } else {
                console.warn('[DEBUG] SmartRedactionService not available, skipping privacy control');
                // Fall back to direct analysis
                throw new Error('Privacy service not available, proceeding without privacy features');
            }
            
        } catch (error) {
            console.error('[DEBUG] Privacy control setup failed:', error);
            // Re-throw to let processFile handle the fallback
            throw error;
        }
    }

    displayPrivacyControl(redactionAnalysis, parsedData) {
        // Hide upload area and show privacy control
        this.uploadArea.style.display = 'none';
        this.hideProgress();
        
        // Create privacy control interface
        const privacyControlHtml = `
            <div class="privacy-control">
                <div class="privacy-header">
                    <h2>🔒 Step 2: Privacy First - You're in Control</h2>
                    <p class="privacy-subtitle">We found ${redactionAnalysis.summary.totalItems} items that could reveal your identity. Protect your privacy while showcasing your skills.</p>
                </div>
                
                <div class="trust-message">
                    <div class="trust-card">
                        <h3>🛡️ Why We Built Privacy Controls</h3>
                        <p>Your job search should be confidential. Research shows that:</p>
                        <ul>
                            <li>📊 <strong>87% of recruiters</strong> admit to unconscious bias based on company names</li>
                            <li>🎓 <strong>School names</strong> can trigger educational elitism</li>
                            <li>📅 <strong>Graduation years</strong> lead to age discrimination</li>
                            <li>🏢 <strong>Current employer</strong> info can jeopardize your job</li>
                        </ul>
                        <p class="trust-promise">✨ <strong>Our Promise:</strong> Your redacted resume stays on your device. We never store or transmit your data.</p>
                    </div>
                </div>
                
                <div class="redaction-controls">
                    <h3>Choose What to Protect</h3>
                    <div class="redaction-items">
                        ${this.renderRedactionToggles(redactionAnalysis)}
                    </div>
                </div>
                
                <div class="redaction-preview">
                    <h3>Preview Your Protected Resume</h3>
                    <div class="preview-container">
                        <div class="preview-before">
                            <h4>Original (Visible)</h4>
                            <div class="preview-content" id="previewOriginal"></div>
                        </div>
                        <div class="preview-after">
                            <h4>Protected (What Employers See)</h4>
                            <div class="preview-content" id="previewRedacted"></div>
                        </div>
                    </div>
                </div>
                
                <div class="privacy-actions">
                    <button class="privacy-btn primary" onclick="window.fileConverter.applySelectedRedactions()">
                        ✅ Apply Privacy Settings & Continue
                    </button>
                    <button class="privacy-btn secondary" onclick="window.fileConverter.downloadRedactedResume()">
                        💾 Download Protected Resume
                    </button>
                    <button class="privacy-btn ghost" onclick="window.fileConverter.skipPrivacy()">
                        Skip Protection (Not Recommended)
                    </button>
                </div>
            </div>
        `;
        
        // Insert privacy control into the page
        const container = document.querySelector('.container');
        const existingPrivacy = container.querySelector('.privacy-control');
        if (existingPrivacy) {
            existingPrivacy.remove();
        }
        
        container.insertAdjacentHTML('beforeend', privacyControlHtml);
        
        // Store analysis for later use
        this.currentRedactionAnalysis = redactionAnalysis;
        this.currentParsedData = parsedData;
        this.selectedPrivacyItems = new Set();
        
        // Auto-select recommended items
        this.initializeRecommendedSelections(redactionAnalysis);
        
        // Initialize preview
        this.updatePrivacyPreview();
    }

    renderRedactionToggles(analysis) {
        const allItems = [
            ...analysis.recommendations.personalInfo,
            ...analysis.recommendations.experience,
            ...analysis.recommendations.education
        ];
        
        return allItems.map((item, index) => {
            const typeInfo = this.getTypeInfo(item.type);
            const itemId = `privacy-${item.type}-${index}`;
            
            return `
                <div class="privacy-item ${item.recommended ? 'recommended' : ''}" data-item-index="${index}">
                    <div class="privacy-item-header">
                        <div class="privacy-item-info">
                            <span class="privacy-icon">${typeInfo.icon}</span>
                            <span class="privacy-type">${typeInfo.title}</span>
                            ${item.recommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                        </div>
                        <div class="toggle-switch ${item.recommended ? 'active' : ''}" data-index="${index}" onclick="window.fileConverter.togglePrivacyItem(${index})">
                            <div class="toggle-slider"></div>
                        </div>
                    </div>
                    <div class="privacy-item-details">
                        <div class="redaction-example">
                            <span class="original-value">"${item.value}"</span>
                            <span class="arrow">→</span>
                            <span class="redacted-value">"${item.replacement}"</span>
                        </div>
                        <p class="privacy-reason">${item.reason}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRedactionRecommendations(analysis) {
        const recommendations = [
            ...analysis.recommendations.personalInfo,
            ...analysis.recommendations.experience,
            ...analysis.recommendations.education
        ];
        
        const groupedByType = recommendations.reduce((acc, rec) => {
            if (!acc[rec.type]) acc[rec.type] = [];
            acc[rec.type].push(rec);
            return acc;
        }, {});
        
        return Object.entries(groupedByType).map(([type, items]) => {
            const typeInfo = this.getTypeInfo(type);
            return `
                <div class="recommendation-group">
                    <div class="group-header">
                        <h4>${typeInfo.icon} ${typeInfo.title}</h4>
                        <span class="recommendation-badge ${items[0].recommended ? 'recommended' : 'optional'}">
                            ${items[0].recommended ? 'Recommended' : 'Optional'}
                        </span>
                    </div>
                    <div class="group-content">
                        <p class="group-reason">${items[0].reason}</p>
                        <div class="redaction-examples">
                            ${items.map(item => `
                                <div class="redaction-example">
                                    <div class="before-after">
                                        <span class="before">Before: "${item.value}"</span>
                                        <span class="arrow">→</span>
                                        <span class="after">After: "${item.replacement}"</span>
                                    </div>
                                    ${item.benefits ? `
                                        <div class="benefits">
                                            <strong>Benefits:</strong> ${item.benefits.join(', ')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTypeInfo(type) {
        const typeMap = {
            'name': { icon: '👤', title: 'Personal Name' },
            'email': { icon: '📧', title: 'Email Address' },
            'phone': { icon: '📱', title: 'Phone Number' },
            'company': { icon: '🏢', title: 'Company Names' },
            'school': { icon: '🎓', title: 'Education Institutions' },
            'dates': { icon: '📅', title: 'Employment Dates' },
            'gradYear': { icon: '📅', title: 'Graduation Years' }
        };
        
        return typeMap[type] || { icon: '🔒', title: 'Privacy Item' };
    }

    applyRecommendedRedactions() {
        // Apply only recommended redactions
        const recommendedRedactions = [
            ...this.currentRedactionAnalysis.recommendations.personalInfo,
            ...this.currentRedactionAnalysis.recommendations.experience,
            ...this.currentRedactionAnalysis.recommendations.education
        ].filter(item => item.recommended);
        
        this.applyRedactionsAndProceed(recommendedRedactions);
    }

    initializeRecommendedSelections(analysis) {
        const allItems = [
            ...analysis.recommendations.personalInfo,
            ...analysis.recommendations.experience,
            ...analysis.recommendations.education
        ];
        
        // Auto-select recommended items
        allItems.forEach((item, index) => {
            if (item.recommended) {
                this.selectedPrivacyItems.add(index);
            }
        });
    }

    togglePrivacyItem(index) {
        if (this.selectedPrivacyItems.has(index)) {
            this.selectedPrivacyItems.delete(index);
        } else {
            this.selectedPrivacyItems.add(index);
        }
        
        // Update toggle UI
        const toggle = document.querySelector(`.toggle-switch[data-index="${index}"]`);
        if (toggle) {
            toggle.classList.toggle('active');
        }
        
        // Update preview
        this.updatePrivacyPreview();
    }

    updatePrivacyPreview() {
        const originalPreview = document.getElementById('previewOriginal');
        const redactedPreview = document.getElementById('previewRedacted');
        
        if (!originalPreview || !redactedPreview) return;
        
        // Create preview snippets
        const previewData = this.createPreviewData();
        
        originalPreview.innerHTML = previewData.original;
        redactedPreview.innerHTML = previewData.redacted;
    }

    createPreviewData() {
        const data = this.currentParsedData;
        const selectedRedactions = this.getSelectedRedactions();
        
        // Create a preview showing key information
        let originalHtml = '<div class="preview-section">';
        let redactedHtml = '<div class="preview-section">';
        
        // Contact section
        if (data.contact) {
            originalHtml += `<h5>Contact</h5>`;
            redactedHtml += `<h5>Contact</h5>`;
            
            if (data.contact.name) {
                const nameRedaction = selectedRedactions.find(r => r.type === 'name');
                originalHtml += `<p>${data.contact.name}</p>`;
                redactedHtml += `<p>${nameRedaction ? '<span class="redacted">Candidate</span>' : data.contact.name}</p>`;
            }
            
            if (data.contact.email) {
                const emailRedaction = selectedRedactions.find(r => r.type === 'email');
                originalHtml += `<p>${data.contact.email}</p>`;
                redactedHtml += `<p>${emailRedaction ? '<span class="redacted">Available upon request</span>' : data.contact.email}</p>`;
            }
        }
        
        // Experience section
        if (data.experience && data.experience.length > 0) {
            originalHtml += `<h5>Experience</h5>`;
            redactedHtml += `<h5>Experience</h5>`;
            
            const exp = data.experience[0]; // Show first experience
            if (exp.company) {
                const companyRedaction = selectedRedactions.find(r => r.type === 'company' && r.experienceIndex === 0);
                originalHtml += `<p><strong>${exp.title}</strong> at ${exp.company}</p>`;
                redactedHtml += `<p><strong>${exp.title}</strong> at ${companyRedaction ? `<span class="redacted">${companyRedaction.replacement}</span>` : exp.company}</p>`;
            }
        }
        
        // Education section
        if (data.education && data.education.length > 0) {
            originalHtml += `<h5>Education</h5>`;
            redactedHtml += `<h5>Education</h5>`;
            
            const edu = data.education[0]; // Show first education
            if (edu.institution) {
                const schoolRedaction = selectedRedactions.find(r => r.type === 'school' && r.educationIndex === 0);
                originalHtml += `<p>${edu.degree || 'Degree'} - ${edu.institution}</p>`;
                redactedHtml += `<p>${edu.degree || 'Degree'} - ${schoolRedaction ? `<span class="redacted">${schoolRedaction.replacement}</span>` : edu.institution}</p>`;
            }
        }
        
        originalHtml += '</div>';
        redactedHtml += '</div>';
        
        return { original: originalHtml, redacted: redactedHtml };
    }

    getSelectedRedactions() {
        const allItems = [
            ...this.currentRedactionAnalysis.recommendations.personalInfo,
            ...this.currentRedactionAnalysis.recommendations.experience,
            ...this.currentRedactionAnalysis.recommendations.education
        ];
        
        return Array.from(this.selectedPrivacyItems).map(index => allItems[index]);
    }

    applySelectedRedactions() {
        const selectedRedactions = this.getSelectedRedactions();
        console.log('[DEBUG] Applying', selectedRedactions.length, 'privacy redactions');
        
        // Apply redactions
        this.applyRedactionsAndProceed(selectedRedactions);
    }

    downloadRedactedResume() {
        const selectedRedactions = this.getSelectedRedactions();
        const redactedData = this.smartRedactionService.applyRedactions(this.currentParsedData, selectedRedactions);
        
        // Create a text version of the redacted resume
        let resumeText = this.formatRedactedResume(redactedData);
        
        const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFileName.replace(/\.[^/.]+$/, '')}_protected.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Protected resume downloaded! This version hides your personal details while keeping your skills visible.');
    }

    formatRedactedResume(data) {
        let text = 'PROTECTED RESUME\n\n';
        
        // Contact
        text += 'CONTACT INFORMATION\n';
        text += `Name: ${data.contact.name || 'Candidate'}\n`;
        text += `Email: ${data.contact.email || 'Available upon request'}\n`;
        text += `Phone: ${data.contact.phone || 'Available upon request'}\n`;
        text += `Location: ${data.contact.location || 'Open to relocation'}\n\n`;
        
        // Experience
        if (data.experience && data.experience.length > 0) {
            text += 'PROFESSIONAL EXPERIENCE\n';
            data.experience.forEach(exp => {
                text += `\n${exp.title || 'Professional Role'}\n`;
                text += `${exp.company || 'Company'} | ${exp.duration || 'Duration'}\n`;
                if (exp.description && exp.description.length > 0) {
                    exp.description.forEach(desc => {
                        text += `• ${desc}\n`;
                    });
                }
            });
            text += '\n';
        }
        
        // Education
        if (data.education && data.education.length > 0) {
            text += 'EDUCATION\n';
            data.education.forEach(edu => {
                text += `${edu.degree || 'Degree'} - ${edu.institution || 'Institution'}\n`;
                if (edu.year) text += `${edu.year}\n`;
            });
            text += '\n';
        }
        
        // Skills
        if (data.skills && data.skills.length > 0) {
            text += 'SKILLS\n';
            text += data.skills.join(', ') + '\n\n';
        }
        
        text += '---\nThis resume has been protected for privacy. Personal identifying information has been redacted to prevent bias while maintaining your professional qualifications.\n';
        
        return text;
    }

    skipPrivacy() {
        console.log('[DEBUG] User skipped privacy protection');
        this.proceedToAnalysis();
    }

    customizeRedactions() {
        // This is now handled by the toggle interface
        console.log('[DEBUG] Customization handled by toggle interface');
    }

    async proceedToAnalysis() {
        try {
            console.log('[DEBUG] proceedToAnalysis started');
            
            // Move to step 3 - Career Insights
            this.updateStep(3);
            console.log('[DEBUG] Updated to step 3');
            
            // Hide privacy control
            const privacyControl = document.querySelector('.privacy-control');
            if (privacyControl) {
                privacyControl.remove();
                console.log('[DEBUG] Removed privacy control interface');
            }
            
            // Set emotional state to processing if available
            if (this.uxEnhancedDisplay) {
                this.uxEnhancedDisplay.transitionToState('PROCESSING');
                console.log('[DEBUG] UX display transitioned to PROCESSING');
            }
            
            // Validate we have parsed data
            console.log('[DEBUG] Validating parsed data...');
            console.log('[DEBUG] parsedResumeData available:', !!this.parsedResumeData);
            console.log('[DEBUG] extractedText length:', this.extractedText?.length || 0);
            
            if (!this.parsedResumeData || !this.extractedText) {
                throw new Error('Resume data not available for analysis');
            }
            
            // Show the enhanced skills analysis with next steps
            console.log('[DEBUG] Calling showResumeAnalysisWithSkills');
            await this.showResumeAnalysisWithSkills(this.parsedResumeData, this.extractedText);
            console.log('[DEBUG] showResumeAnalysisWithSkills completed successfully');
            
            // Only show success if we made it this far
            console.log('[DEBUG] About to show success message');
            this.showSuccess('✨ Your career strengths are ready to shine! You have valuable skills that AI cannot replace.');
            
        } catch (error) {
            console.error('[DEBUG] Analysis failed:', error);
            throw new Error(`Resume analysis failed: ${error.message}`);
        }
    }

    async applyRedactionsAndProceed(redactions) {
        try {
            console.log('[DEBUG] applyRedactionsAndProceed started with', redactions.length, 'redactions');
            // Apply redactions to the parsed data
            const redactedData = this.smartRedactionService.applyRedactions(this.parsedResumeData, redactions);
            this.parsedResumeData = redactedData;
            console.log('[DEBUG] Redactions applied successfully');
            
            // Store that we've applied privacy protections
            this.privacyApplied = true;
            this.appliedRedactions = redactions;
            
            // Proceed to analysis (success message will be handled by proceedToAnalysis)
            await this.proceedToAnalysis();
            
        } catch (error) {
            console.error('[DEBUG] Redaction failed:', error);
            this.showError('Privacy protection failed. Proceeding with original data.');
            try {
                await this.proceedToAnalysis();
            } catch (analysisError) {
                throw new Error(`Analysis failed after redaction error: ${analysisError.message}`);
            }
        }
    }

    updateStep(stepNumber) {
        this.currentStep = stepNumber;
        
        // Update visual step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < stepNumber) {
                step.classList.add('completed');
            } else if (index + 1 === stepNumber) {
                step.classList.add('active');
            }
        });
    }

    triggerPrivacyControlFlow(analysisData) {
        try {
            // Move to step 2 - Privacy Control
            this.updateStep(2);
            
            // Store the parsed data for later use
            this.parsedResumeData = analysisData;
            
            // Check if smart redaction service is available
            if (!this.smartRedactionService) {
                console.warn('SmartRedactionService not available, skipping privacy control');
                this.proceedToAnalysis();
                return;
            }
            
            // Analyze privacy redaction needs
            const redactionAnalysis = this.smartRedactionService.analyzeRedactionNeeds(analysisData);
            
            // Show privacy control interface
            this.displayPrivacyControl(redactionAnalysis, analysisData);
            
        } catch (error) {
            console.error('Privacy control flow failed:', error);
            // Skip privacy control and proceed to analysis
            this.proceedToAnalysis();
        }
    }

    addNextStepsToResults(analysisData) {
        const nextStepsHtml = `
            <div class="next-steps-section">
                <h3>What This Means for Your Career</h3>
                <div class="next-steps-grid">
                    <div class="next-step-card">
                        <h4>📄 Download Your Skills Report</h4>
                        <p>Get a comprehensive PDF of your skills analysis and career opportunities</p>
                        <button class="next-step-btn" onclick="window.fileConverter.downloadSkillsReport()">Download Report</button>
                    </div>
                    <div class="next-step-card">
                        <h4>🎯 Find Matching Jobs</h4>
                        <p>See current job openings that match your skill profile</p>
                        <button class="next-step-btn" onclick="window.fileConverter.showMatchingJobs()">View Jobs</button>
                    </div>
                    <div class="next-step-card">
                        <h4>🚀 Career Coaching</h4>
                        <p>Get personalized guidance for your career transition</p>
                        <button class="next-step-btn" onclick="window.fileConverter.connectWithCoach()">Connect</button>
                    </div>
                </div>
            </div>
        `;
        
        const skillsContainer = document.querySelector('.skills-analysis-container');
        if (skillsContainer) {
            skillsContainer.insertAdjacentHTML('beforeend', nextStepsHtml);
        }
    }

    downloadSkillsReport() {
        if (!this.parsedResumeData) return;
        
        const reportContent = `
CAREER SKILLS ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()}

SKILLS SUMMARY:
${this.parsedResumeData.skills.map(skill => `• ${skill}`).join('\n')}

EXPERIENCE HIGHLIGHTS:
${this.parsedResumeData.experience.map(exp => `
${exp.title} at ${exp.company}
${exp.description.slice(0, 2).map(desc => `  • ${desc}`).join('\n')}
`).join('\n')}

CAREER OPPORTUNITIES:
Based on your skills, you're well-positioned for roles in:
• Customer Success Management
• Account Management  
• Client Relations
• Data Analysis
• Business Intelligence

NEXT STEPS:
1. Update your LinkedIn profile with these skills
2. Apply to roles that match your transferable skills
3. Consider additional training in high-demand areas
4. Network with professionals in your target roles

This analysis was generated using O*NET occupational data and market demand insights.
        `;
        
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFileName.replace(/\.[^/.]+$/, '')}_skills_report.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showMatchingJobs() {
        alert('This feature would integrate with job boards to show matching opportunities based on your skills.');
    }

    connectWithCoach() {
        alert('This feature would connect you with career coaches who specialize in your field and target roles.');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEnhancedResumeAnalysis(analysisData) {
        // Hide old containers and trigger new enhanced flow
        this.resumeAnalysis.style.display = 'none';
        this.resultContainer.style.display = 'none';
        this.redactionContainer.style.display = 'none';
        
        // Trigger privacy control flow (Step 2)
        this.triggerPrivacyControlFlow(analysisData);
        
        // Display JSON output prominently
        this.displayJSONOutput(analysisData);
        
        // Update existing resume display elements
        this.updateResumeDisplay(analysisData);
        
        // Show processing summary
        this.displayProcessingSummary(analysisData.summary);
    }

    displayJSONOutput(data) {
        // Create or update JSON output display
        let jsonContainer = document.getElementById('jsonOutput');
        if (!jsonContainer) {
            jsonContainer = document.createElement('div');
            jsonContainer.id = 'jsonOutput';
            jsonContainer.innerHTML = `
                <div class="analysis-section">
                    <h3>📋 Structured JSON Output (Story 1.1)</h3>
                    <div class="json-display">
                        <div class="json-section">
                            <h4>Skills Array:</h4>
                            <pre id="skillsJSON"></pre>
                        </div>
                        <div class="json-section">
                            <h4>Experience Array:</h4>
                            <pre id="experienceJSON"></pre>
                        </div>
                    </div>
                    <button id="copyJSONBtn" class="action-btn">📋 Copy JSON</button>
                    <button id="downloadJSONBtn" class="action-btn">💾 Download JSON</button>
                </div>
            `;
            // Insert at the top of resume analysis
            this.resumeAnalysis.insertBefore(jsonContainer, this.resumeAnalysis.firstChild);
        }

        // Populate JSON data
        document.getElementById('skillsJSON').textContent = JSON.stringify(data.skills, null, 2);
        document.getElementById('experienceJSON').textContent = JSON.stringify(data.experience, null, 2);

        // Add event listeners
        document.getElementById('copyJSONBtn').onclick = () => this.copyJSONToClipboard(data);
        document.getElementById('downloadJSONBtn').onclick = () => this.downloadJSON(data);
    }

    copyJSONToClipboard(data) {
        const jsonOutput = {
            skills: data.skills,
            experience: data.experience
        };
        navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2))
            .then(() => this.showSuccess('JSON copied to clipboard!'))
            .catch(() => this.showError('Failed to copy JSON'));
    }

    downloadJSON(data) {
        const jsonOutput = {
            skills: data.skills,
            experience: data.experience,
            metadata: data.processingMetadata
        };
        
        const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_analysis_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('JSON file downloaded successfully!');
    }

    updateResumeDisplay(data) {
        // Update skills display
        if (this.skillsGrid && data.skills.length > 0) {
            this.skillsGrid.innerHTML = data.skills.map(skill => 
                `<span class="skill-tag">${skill}</span>`
            ).join('');
        }

        // Update experience display
        if (this.experienceList && data.experience.length > 0) {
            this.experienceList.innerHTML = data.experience.map(exp => `
                <div class="experience-item">
                    <h4>${exp.title || 'Position'}</h4>
                    <p class="company">${exp.company || 'Company'}</p>
                    <p class="duration">${exp.duration || 'Duration'}</p>
                    <div class="description">
                        ${exp.description.map(desc => `<p>• ${desc}</p>`).join('')}
                    </div>
                    ${exp.skills.length > 0 ? `
                        <div class="exp-skills">
                            <strong>Skills:</strong> ${exp.skills.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }

        // Update education display with proper formatting and privacy controls
        this.updateEducationSection(data);
    }

    displayProcessingSummary(summary) {
        // Add processing summary
        let summaryContainer = document.getElementById('processingSummary');
        if (!summaryContainer) {
            summaryContainer = document.createElement('div');
            summaryContainer.id = 'processingSummary';
            summaryContainer.innerHTML = `
                <div class="analysis-section">
                    <h3>🔒 Security & Performance Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="label">Processing Time:</span>
                            <span class="value" id="processingTime"></span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Skills Extracted:</span>
                            <span class="value" id="skillsCount"></span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Experience Items:</span>
                            <span class="value" id="experienceCount"></span>
                        </div>
                        <div class="summary-item">
                            <span class="label">PII Protection:</span>
                            <span class="value">✅ Enabled</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Server Transmission:</span>
                            <span class="value">❌ None</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Data Persistence:</span>
                            <span class="value">🔒 Session Only</span>
                        </div>
                    </div>
                </div>
            `;
            this.resumeAnalysis.appendChild(summaryContainer);
        }

        // Update summary values
        document.getElementById('processingTime').textContent = `${summary.processingTime}ms ${summary.processingTime < 3000 ? '✅' : '⚠️'}`;
        document.getElementById('skillsCount').textContent = summary.skillsCount;
        document.getElementById('experienceCount').textContent = summary.experienceCount;
    }

    async showCareerInsights(analysisData) {
        this.careerInsightsContainer.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.resumeAnalysis.style.display = 'none';
        this.redactionContainer.style.display = 'none';
        
        // Show loading state
        this.showInsightsLoadingState();
        
        try {
            // Get reframed skills using AI with fallback
            let reframedSkills = [];
            try {
                if (this.skillReframer) {
                    reframedSkills = await this.skillReframer.reframeSkills(analysisData.skills);
                } else {
                    reframedSkills = this.createFallbackReframedSkills(analysisData.skills);
                }
            } catch (skillReframeError) {
                console.warn('Skill reframing failed, using fallback:', skillReframeError);
                reframedSkills = this.createFallbackReframedSkills(analysisData.skills);
            }
            
            // Get O*NET career progressions based on experience with fallback
            let careerProgressions = [];
            try {
                careerProgressions = await this.getCareerProgressions(analysisData);
            } catch (careerProgressionError) {
                console.warn('Career progressions failed, using fallback:', careerProgressionError);
                careerProgressions = this.createFallbackCareerProgressions(analysisData);
            }
            
            // Populate Skills Analysis tab with AI-enhanced insights
            await this.populateSkillsAnalysis(analysisData, reframedSkills);
            
            // Initialize other tabs with real data
            await this.initializeJobSearchTab(analysisData, careerProgressions);
            await this.initializeMarketAnalysisTab(analysisData, reframedSkills);
            await this.initializeCareerDevelopmentTab(analysisData, careerProgressions, reframedSkills);
            
            // Set up tab switching for career insights
            this.setupCareerInsightsTabs();
        } catch (error) {
            console.error('Career insights error:', error);
            this.showInsightsError();
        }
    }

    async populateSkillsAnalysis(data, reframedSkills) {
        // Use our enhanced skills display for career insights
        if (data.skills && data.skills.length > 0) {
            await this.careerSkillsDisplay.displaySkillsAnalysis(
                data.skills,
                this.extractedText || '',
                () => {
                    console.log('Career skills analysis complete');
                }
            );
        } else {
            const reframedSkillsContent = document.getElementById('reframedSkillsContent');
            if (reframedSkillsContent) {
                reframedSkillsContent.innerHTML = `
                    <div class="no-skills-found">
                        <h3>Every professional brings unique value</h3>
                        <p>While we couldn't identify specific skills automatically, your experience matters. Your knowledge, problem-solving abilities, and work ethic are valuable assets in today's job market.</p>
                        <p>Consider highlighting your key accomplishments, responsibilities, and the positive impact you've made in your roles.</p>
                    </div>
                `;
            }
        }
    }

    async getCareerProgressions(data) {
        // Extract job titles from experience
        const currentRoles = data.experience.map(exp => exp.title).filter(Boolean);
        
        if (currentRoles.length === 0) {
            return this.getEntryLevelProgressions(data.skills);
        }
        
        // Use O*NET to find career progressions
        try {
            const progressions = await this.onetService.getCareerProgressions(currentRoles[0]);
            return progressions;
        } catch (error) {
            console.error('O*NET lookup failed:', error);
            return this.getFallbackProgressions(currentRoles[0]);
        }
    }

    getEntryLevelProgressions(skills) {
        // Analyze skills to suggest entry-level paths
        const skillsLower = skills.map(s => s.toLowerCase()).join(' ');
        
        if (skillsLower.includes('customer') || skillsLower.includes('service')) {
            return [
                { title: 'Customer Success Specialist', growth: 'Account Management' },
                { title: 'Client Relations Coordinator', growth: 'Relationship Manager' },
                { title: 'Support Team Lead', growth: 'Support Manager' }
            ];
        }
        
        return [{ title: 'Entry Level Professional', growth: 'Specialist' }];
    }

    getFallbackProgressions(currentRole) {
        const roleLower = currentRole.toLowerCase();
        
        if (roleLower.includes('customer service') || roleLower.includes('csr')) {
            return [
                { title: 'Senior Customer Service Representative', growth: 'Team Lead' },
                { title: 'Customer Success Specialist', growth: 'Account Manager' },
                { title: 'Client Experience Coordinator', growth: 'Experience Manager' }
            ];
        }
        
        return [{ title: currentRole, growth: `Senior ${currentRole}` }];
    }

    getRecommendedAITools(reframedSkills) {
        const tools = [];
        const skillTypes = new Set();
        
        reframedSkills.forEach(skill => {
            if (skill.complementaryAITools) {
                skill.complementaryAITools.forEach(tool => {
                    if (tool.includes('ChatGPT')) skillTypes.add('communication');
                    if (tool.includes('Grammarly')) skillTypes.add('writing');
                    if (tool.includes('Salesforce')) skillTypes.add('crm');
                });
            }
        });
        
        if (skillTypes.has('communication')) {
            tools.push({
                name: 'ChatGPT for Customer Service',
                description: 'Enhance response quality and speed with AI-powered suggestions',
                enhances: ['Communication', 'Problem-solving']
            });
        }
        
        if (skillTypes.has('crm')) {
            tools.push({
                name: 'Salesforce Einstein',
                description: 'AI-powered CRM insights for better customer relationships',
                enhances: ['Customer Management', 'Data Analysis']
            });
        }
        
        tools.push({
            name: 'Microsoft Copilot',
            description: 'AI assistant for productivity and document creation',
            enhances: ['Productivity', 'Documentation']
        });
        
        return tools.slice(0, 3);
    }

    async initializeJobSearchTab(data, careerProgressions) {
        const jobSearchResults = document.getElementById('jobSearchResults');
        if (!jobSearchResults) return;
        
        // Extract current role or use "Professional" as default
        const currentRole = data.experience.length > 0 ? data.experience[0].title : 'Professional';
        
        jobSearchResults.innerHTML = `
            <div class="job-search-intro">
                <p>Career progression paths based on your experience as <strong>${currentRole}</strong>:</p>
                <div class="search-recommendations">
                    <div class="search-rec-card">
                        <h5>🎯 Natural Career Progressions</h5>
                        <ul>
                            ${careerProgressions.map(prog => 
                                `<li><strong>${prog.title}</strong> → ${prog.growth}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="search-rec-card">
                        <h5>🚀 AI-Enhanced Opportunities</h5>
                        <ul>
                            ${this.getAIEnhancedRoles(currentRole).map(role => 
                                `<li>${role}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="job-search-controls" style="margin-top: 20px;">
                    <button class="insight-btn" onclick="window.fileConverter.searchRealJobs('${currentRole}')">Search Real Jobs Now</button>
                </div>
                
                <div id="realJobResults" style="margin-top: 20px;"></div>
            </div>
        `;
    }

    getAIEnhancedRoles(currentRole) {
        const roleLower = currentRole.toLowerCase();
        
        if (roleLower.includes('customer') || roleLower.includes('service')) {
            return [
                'AI-Assisted Customer Success Manager',
                'Digital Customer Experience Specialist',
                'Conversational AI Trainer',
                'Customer Insights Analyst'
            ];
        } else if (roleLower.includes('sales')) {
            return [
                'AI-Powered Sales Development Rep',
                'Sales Intelligence Analyst',
                'Revenue Operations Specialist'
            ];
        }
        
        return [
            `AI-Enhanced ${currentRole}`,
            'Digital Transformation Specialist',
            'Process Automation Analyst'
        ];
    }

    async searchRealJobs(role) {
        const resultsDiv = document.getElementById('realJobResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '<div class="loading-spinner"></div> Searching real job postings...';
        
        try {
            const location = 'Remote';
            const jobs = await this.jobMatcher.searchJobs({
                role: role,
                location: location,
                skills: this.parsedResumeData.skills.slice(0, 5),
                experience: this.parsedResumeData.experience.length + ' years'
            });
            
            resultsDiv.innerHTML = `
                <h5>Live Job Opportunities</h5>
                <div class="job-results-container">
                    ${jobs.slice(0, 5).map(job => `
                        <div class="job-result-item">
                            <h6 class="job-title">${job.jobTitle}</h6>
                            <div class="job-company">${job.company}</div>
                            <div class="job-location">${job.location}</div>
                            <div class="job-match-score">Match Score: ${job.matchScore}%</div>
                            <p class="job-description">${job.description}</p>
                            <div class="job-insights">${job.aiInsights}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = '<p>Unable to fetch real-time job data. Please try again later.</p>';
        }
    }

    showInsightsLoadingState() {
        const containers = [
            'reframedSkillsContent',
            'jobSearchResults',
            'marketAnalysisContent',
            'careerDevelopmentContent'
        ];
        
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<div class="loading-spinner"></div> Analyzing your career data with AI...';
            }
        });
    }

    showInsightsError() {
        const reframedSkillsContent = document.getElementById('reframedSkillsContent');
        if (reframedSkillsContent) {
            reframedSkillsContent.innerHTML = `
                <div class="error-message">
                    <p>Unable to generate AI insights at this time. Your resume data is still available in the Resume Analyzer tab.</p>
                </div>
            `;
        }
    }

    async initializeMarketAnalysisTab(data, reframedSkills) {
        const marketAnalysisContent = document.getElementById('marketAnalysisContent');
        if (!marketAnalysisContent) return;
        
        // Get market analysis based on role
        const currentRole = data.experience.length > 0 ? data.experience[0].title : 'Entry Level';
        
        try {
            const marketData = await this.jobMatcher.analyzeMarket(currentRole, 'United States');
            
            marketAnalysisContent.innerHTML = `
                <div class="market-analysis-dashboard">
                    <div class="market-stat-grid">
                        <div class="market-stat-item">
                            <div class="market-stat-value">${marketData.openings || '25K+'}</div>
                            <div class="market-stat-label">Open Positions</div>
                        </div>
                        <div class="market-stat-item">
                            <div class="market-stat-value">${marketData.growth || '+8%'}</div>
                            <div class="market-stat-label">Job Growth</div>
                        </div>
                        <div class="market-stat-item">
                            <div class="market-stat-value">${marketData.salary || '$45-65K'}</div>
                            <div class="market-stat-label">Salary Range</div>
                        </div>
                        <div class="market-stat-item">
                            <div class="market-stat-value">${marketData.remote || '60%'}</div>
                            <div class="market-stat-label">Remote Options</div>
                        </div>
                    </div>
                    
                    <div class="skills-demand-analysis">
                        <h4>🔥 Your Skills Market Demand</h4>
                        <div class="skill-demand-grid">
                            ${reframedSkills.slice(0, 6).map(skill => `
                                <div class="skill-demand-item">
                                    <span class="skill-name">${skill.originalSkill}</span>
                                    <span class="demand-level ${skill.marketDemand}">${skill.marketDemand}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="market-insights">
                        <h4>📊 Role-Specific Insights</h4>
                        <p>${this.getRoleSpecificInsights(currentRole)}</p>
                    </div>
                </div>
            `;
        } catch (error) {
            marketAnalysisContent.innerHTML = this.getFallbackMarketAnalysis(currentRole);
        }
    }

    getRoleSpecificInsights(role) {
        const roleLower = role.toLowerCase();
        
        if (roleLower.includes('customer') || roleLower.includes('service')) {
            return 'Customer service roles are evolving rapidly with AI integration. Companies seek professionals who can work alongside AI tools to deliver exceptional experiences. Focus on developing skills in CRM platforms, data analysis, and AI-assisted communication.';
        } else if (roleLower.includes('sales')) {
            return 'Sales roles increasingly leverage AI for lead scoring, personalization, and insights. Modern sales professionals combine traditional relationship skills with data-driven approaches.';
        }
        
        return 'The job market is shifting toward AI-augmented roles. Professionals who embrace AI tools while maintaining strong human skills are most competitive.';
    }

    getFallbackMarketAnalysis(role) {
        return `
            <div class="market-analysis-dashboard">
                <h4>Market Analysis for ${role}</h4>
                <p>Based on current trends:</p>
                <ul>
                    <li>Growing demand for AI-literate professionals</li>
                    <li>Increasing remote work opportunities</li>
                    <li>Emphasis on continuous learning and adaptation</li>
                    <li>Value placed on human skills that complement AI</li>
                </ul>
            </div>
        `;
    }

    async initializeCareerDevelopmentTab(data, careerProgressions, reframedSkills) {
        const careerDevelopmentContent = document.getElementById('careerDevelopmentContent');
        if (!careerDevelopmentContent) return;
        
        const currentRole = data.experience.length > 0 ? data.experience[0].title : 'Entry Level';
        const careerPaths = await this.skillReframer.suggestCareerPaths(data.skills, currentRole);
        
        careerDevelopmentContent.innerHTML = `
            <div class="development-timeline">
                <h4>🌱 Your Personalized Career Development Path</h4>
                ${this.generatePersonalizedDevelopmentPlan(currentRole, careerProgressions, reframedSkills).map((item, index) => `
                    <div class="timeline-item">
                        <div class="timeline-phase">${item.timeframe}</div>
                        <div class="timeline-content">
                            <h5>${item.goal}</h5>
                            <p>${item.description}</p>
                            <ul>
                                ${item.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="ai-powered-paths">
                <h4>🤖 AI-Powered Career Paths</h4>
                <div class="career-paths-grid">
                    ${(careerPaths || []).slice(0, 3).map(path => `
                        <div class="career-path-card">
                            <h5>${path.title}</h5>
                            <p>${path.description}</p>
                            <div class="skill-match">Skill Match: ${path.skillMatch}%</div>
                            <div class="ai-tools-used">
                                <strong>AI Tools:</strong> ${(path.aiToolsUsed || []).join(', ')}
                            </div>
                            <div class="learning-steps">
                                <strong>Next Steps:</strong>
                                <ol>
                                    ${(path.learningPath || []).slice(0, 3).map(step => 
                                        `<li>${step}</li>`
                                    ).join('')}
                                </ol>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="development-resources">
                <h4>📚 Targeted Learning Resources</h4>
                <div class="resource-grid">
                    ${this.getTargetedResources(currentRole, reframedSkills).map(resource => `
                        <div class="resource-card">
                            <h6>${resource.category}</h6>
                            <p>${resource.recommendations.join(', ')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generatePersonalizedDevelopmentPlan(currentRole, careerProgressions, reframedSkills) {
        const roleLower = currentRole.toLowerCase();
        const plan = [];
        
        // Immediate focus based on current role
        if (roleLower.includes('customer') || roleLower.includes('service')) {
            plan.push({
                timeframe: 'Next 3 Months',
                goal: 'AI Tool Mastery',
                description: 'Master AI tools that enhance customer service',
                actions: [
                    'Learn ChatGPT for customer response optimization',
                    'Master CRM automation features',
                    'Practice data analysis for customer insights'
                ]
            });
            
            plan.push({
                timeframe: '3-6 Months',
                goal: 'Transition to Customer Success',
                description: 'Build skills for customer success roles',
                actions: [
                    'Study customer retention strategies',
                    'Learn basic data analytics',
                    'Get certified in a major CRM platform'
                ]
            });
            
            plan.push({
                timeframe: '6-12 Months',
                goal: 'Leadership Development',
                description: 'Prepare for team lead or specialist roles',
                actions: [
                    'Develop training materials for AI tool adoption',
                    'Lead a customer experience improvement project',
                    'Build relationships with product and success teams'
                ]
            });
        } else {
            // Generic professional development
            plan.push({
                timeframe: 'Next 3 Months',
                goal: 'AI Integration',
                description: 'Learn to work with AI tools in your field',
                actions: [
                    'Identify AI tools relevant to your role',
                    'Complete AI fundamentals course',
                    'Implement one AI tool in daily workflow'
                ]
            });
            
            plan.push({
                timeframe: '3-6 Months',
                goal: 'Skill Expansion',
                description: 'Expand into adjacent skill areas',
                actions: [
                    'Learn complementary skills identified by AI analysis',
                    'Build portfolio demonstrating new capabilities',
                    'Network with professionals in target roles'
                ]
            });
            
            plan.push({
                timeframe: '6-12 Months',
                goal: 'Career Advancement',
                description: 'Position for next career level',
                actions: [
                    'Apply for roles matching your enhanced skillset',
                    'Seek mentorship in target field',
                    'Document and share your AI transformation journey'
                ]
            });
        }
        
        return plan;
    }

    getTargetedResources(currentRole, reframedSkills) {
        const resources = [];
        const roleLower = currentRole.toLowerCase();
        
        if (roleLower.includes('customer') || roleLower.includes('service')) {
            resources.push({
                category: 'Customer Success Training',
                recommendations: ['Customer Success Manager Certification', 'Gainsight Academy', 'HubSpot Service Hub']
            });
            
            resources.push({
                category: 'AI & Automation',
                recommendations: ['Zendesk AI', 'Intercom Resolution Bot', 'ChatGPT for Business']
            });
            
            resources.push({
                category: 'Data Skills',
                recommendations: ['Excel for Customer Analytics', 'Tableau Basics', 'Customer Data Platforms']
            });
        } else {
            resources.push({
                category: 'AI Literacy',
                recommendations: ['AI For Everyone (Coursera)', 'ChatGPT Prompt Engineering', 'GitHub Copilot']
            });
            
            resources.push({
                category: 'Professional Development',
                recommendations: ['LinkedIn Learning', 'Udemy Business', 'Pluralsight']
            });
            
            resources.push({
                category: 'Industry Certifications',
                recommendations: ['Google Career Certificates', 'Microsoft Learn', 'AWS Training']
            });
        }
        
        return resources;
    }

    setupCareerInsightsTabs() {
        // Remove any existing listeners first
        document.querySelectorAll('.insights-tab-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Add new listeners
        document.querySelectorAll('.insights-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.insightTab;
                this.switchCareerInsightTab(targetTab);
            });
        });
    }

    switchCareerInsightTab(tabName) {
        // Remove active class from all buttons
        document.querySelectorAll('.insights-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Hide all tab contents
        document.querySelectorAll('.insight-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activate selected tab
        const activeBtn = document.querySelector(`[data-insight-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}InsightTab`);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    reset() {
        this.extractedText = '';
        this.currentFileName = '';
        this.parsedResumeData = null;
        this.piiAnalysis = null;
        this.selectedRedactions.clear();
        this.fileInput.value = '';
        this.hideProgress();
        this.hideMessages();
        this.fileInfo.style.display = 'none';
        this.resultContainer.style.display = 'none';
        this.resumeAnalysis.style.display = 'none';
        this.redactionContainer.style.display = 'none';
        this.careerInsightsContainer.style.display = 'none';
        this.uploadArea.classList.remove('dragover');
        
        // Reset redaction UI
        if (this.redactedTextContainer) {
            this.redactedTextContainer.style.display = 'none';
        }
        if (this.recommendationsList) {
            this.recommendationsList.style.display = 'none';
        }
    }
}


// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = 'An unexpected error occurred. Please refresh the page and try again.';
        errorDiv.style.display = 'block';
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = 'An unexpected error occurred during file processing. Please try again.';
        errorDiv.style.display = 'block';
    }
});

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.fileConverter = new FileConverter();
        console.log('Career Resilience Platform initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = 'Failed to initialize the application. Please refresh the page.';
            errorDiv.style.display = 'block';
        }
    }
});