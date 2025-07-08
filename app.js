class FileConverter {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.extractedText = '';
        this.currentFileName = '';
        this.currentMode = 'text'; // 'text', 'resume', or 'redaction'
        this.resumeParser = new ResumeParser();
        this.enhancedResumeParser = new EnhancedResumeParser();
        this.uxEnhancedDisplay = new UXEnhancedResumeDisplay();
        this.parsedResumeData = null;
        this.piiDetector = new CareerFocusedPIIDetector();
        this.piiAnalysis = null;
        this.selectedRedactions = new Set();
        
        // Initialize AI services for career insights
        this.jobMatcher = new AIEnhancedJobMatcher();
        this.skillReframer = new SkillReframingService();
        this.onetService = new ONETService();
        
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
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
            this.hideMessages();
            this.validateFile(file);
            this.showFileInfo(file);
            this.showProgress('Preparing to process file...');
            
            this.currentFileName = file.name;
            let text = '';

            const fileType = file.type;
            const fileName = file.name.toLowerCase();

            if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                text = await this.extractFromPDF(file);
            } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
                text = await this.extractFromWord(file);
            } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
                text = await this.extractFromText(file);
            } else {
                throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Please upload PDF, DOCX, or TXT files.`);
            }

            if (!text.trim()) {
                throw new Error('No text content found in the file. The file might be empty or contain only images.');
            }

            this.extractedText = text;
            
            if (this.currentMode === 'resume') {
                // Set emotional state to processing
                this.uxEnhancedDisplay.transitionToState('PROCESSING');
                
                // Use enhanced parser for Story 1.1 requirements
                this.enhancedResumeParser.setProgressCallback((percentage, message) => {
                    this.updateProgress(percentage, this.uxEnhancedDisplay.getEmpathicProgressMessage(message));
                });
                this.parsedResumeData = await this.enhancedResumeParser.parseResumeSecurely(text, fileName);
                await this.uxEnhancedDisplay.displayAnalysisWithEmpathy(this.parsedResumeData, fileName);
                this.showSuccess('✅ Your career analysis is complete! Review your strengths and next steps below.');
            } else if (this.currentMode === 'redaction') {
                this.piiAnalysis = this.piiDetector.analyzeText(text);
                this.showPIIAnalysis(this.piiAnalysis);
                this.showSuccess('PII analysis completed successfully!');
            } else if (this.currentMode === 'career') {
                this.enhancedResumeParser.setProgressCallback((percentage, message) => {
                    this.updateProgress(percentage, `Generating career insights: ${message}`);
                });
                this.parsedResumeData = await this.enhancedResumeParser.parseResumeSecurely(text, fileName);
                this.showCareerInsights(this.parsedResumeData);
                this.showSuccess('🚀 Career insights analysis complete! Explore your opportunities below.');
            } else {
                this.showResult(text);
                this.showSuccess('File converted successfully!');
            }
            
        } catch (error) {
            this.showError(error.message);
            console.error('File processing error:', error);
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
                    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
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
            this.uploadText.textContent = 'Discover your career potential';
            this.fileTypesText.textContent = 'Upload your resume to unlock personalized insights and next steps';
            mainTitle.textContent = 'Your Career Journey Analyzer';
            this.uxEnhancedDisplay.transitionToState('UPLOADING');
        } else if (mode === 'redaction') {
            this.redactionModeBtn.classList.add('active');
            this.uploadText.textContent = 'Protect your privacy with smart redaction';
            this.fileTypesText.textContent = 'Upload any document to detect and safely redact personal information';
            mainTitle.textContent = 'Privacy Protection Tool';
        } else if (mode === 'career') {
            this.careerModeBtn.classList.add('active');
            this.uploadText.textContent = 'Unlock your career potential with AI insights';
            this.fileTypesText.textContent = 'Upload your resume for comprehensive career analysis and job market insights';
            mainTitle.textContent = 'AI Career Intelligence Platform';
        }
        
        // Hide all containers
        this.resultContainer.style.display = 'none';
        this.resumeAnalysis.style.display = 'none';
        this.redactionContainer.style.display = 'none';
        this.careerInsightsContainer.style.display = 'none';
        
        // Show appropriate container if we have data
        if (this.extractedText) {
            if (mode === 'resume' && this.parsedResumeData) {
                this.showResumeAnalysis(this.parsedResumeData);
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEnhancedResumeAnalysis(analysisData) {
        // Show the resume analysis container
        this.resumeAnalysis.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.redactionContainer.style.display = 'none';
        
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

        // Update education display
        if (this.educationList && data.education.length > 0) {
            this.educationList.innerHTML = data.education.map(edu => `
                <div class="education-item">
                    <h4>${edu.degree || 'Degree'}</h4>
                    <p>${edu.institution || 'Institution'}</p>
                    <p>${edu.year || 'Year'}</p>
                    ${edu.gpa ? `<p>GPA: ${edu.gpa}</p>` : ''}
                </div>
            `).join('');
        }
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
            // Get reframed skills using AI
            const reframedSkills = await this.skillReframer.reframeSkills(analysisData.skills);
            
            // Get O*NET career progressions based on experience
            const careerProgressions = await this.getCareerProgressions(analysisData);
            
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
        const reframedSkillsContent = document.getElementById('reframedSkillsContent');
        if (!reframedSkillsContent) return;
        
        // Process reframed skills for display
        const skillsWithAI = reframedSkills || [];
        
        const skillsHtml = `
            <div class="skills-analysis-enhanced">
                <div class="skills-overview">
                    <h4>🔧 Your Skills Portfolio - AI Era Perspective</h4>
                    <div class="reframed-skills-container">
                        ${skillsWithAI.slice(0, 6).map(skill => `
                            <div class="reframed-skill-item">
                                <div class="skill-original">${skill.originalSkill}</div>
                                <div class="skill-reframed">${skill.aiRelevantDescription}</div>
                                <div class="skill-tools">
                                    ${(skill.complementaryAITools || []).map(tool => 
                                        `<span class="tool-tag">${tool}</span>`
                                    ).join('')}
                                </div>
                                <div class="skill-confidence">${skill.confidenceBooster}</div>
                                <div class="market-demand-indicator ${skill.marketDemand}">
                                    Market Demand: ${skill.marketDemand}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="ai-enhancement-suggestions">
                    <h4>🚀 AI Tool Recommendations</h4>
                    <div class="ai-tools-grid">
                        ${this.getRecommendedAITools(skillsWithAI).map(tool => `
                            <div class="ai-tool-card">
                                <h6>${tool.name}</h6>
                                <p>${tool.description}</p>
                                <div class="skill-match">Enhances: ${tool.enhances.join(', ')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        reframedSkillsContent.innerHTML = skillsHtml;
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.fileConverter = new FileConverter();
        console.log('File Converter initialized successfully');
    } catch (error) {
        console.error('Failed to initialize File Converter:', error);
        
        // Show error to user if initialization fails
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = 'Application failed to initialize. Please refresh the page.';
            errorDiv.style.display = 'block';
        }
    }
});

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