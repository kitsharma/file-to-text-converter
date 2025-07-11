/**
 * Integration Example - Shows how to use FileToTextConverter in a real application
 * This example demonstrates integration with a resume processing system
 */

// Import the converter (adjust path based on your setup)
import { convertFileToText, FileToTextConverter } from '../dist/FileToTextConverter.esm.js';

/**
 * Example 1: Simple file processing function
 */
async function processDocument(file) {
    try {
        console.log(`Processing ${file.name}...`);
        
        // Convert file to text
        const text = await convertFileToText(file);
        
        // Now you can process the text as needed
        // For example, send to an API, analyze content, etc.
        
        return {
            success: true,
            filename: file.name,
            textLength: text.length,
            preview: text.substring(0, 200) + '...',
            fullText: text
        };
        
    } catch (error) {
        return {
            success: false,
            filename: file.name,
            error: error.message
        };
    }
}

/**
 * Example 2: Batch file processor with progress tracking
 */
class BatchFileProcessor {
    constructor(options = {}) {
        this.converter = new FileToTextConverter({
            debug: options.debug || false,
            maxSizeBytes: options.maxSizeBytes || 25 * 1024 * 1024 // 25MB
        });
        this.results = [];
    }
    
    async processFiles(files, onProgress) {
        this.results = [];
        const totalFiles = files.length;
        
        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            
            // Notify progress
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: totalFiles,
                    currentFile: file.name,
                    percentage: Math.round(((i + 1) / totalFiles) * 100)
                });
            }
            
            try {
                const text = await this.converter.convertToText(file);
                
                this.results.push({
                    file: file.name,
                    success: true,
                    text: text,
                    size: file.size,
                    type: file.type
                });
                
            } catch (error) {
                this.results.push({
                    file: file.name,
                    success: false,
                    error: error.message,
                    size: file.size,
                    type: file.type
                });
            }
        }
        
        return this.results;
    }
    
    getSuccessfulConversions() {
        return this.results.filter(r => r.success);
    }
    
    getFailedConversions() {
        return this.results.filter(r => !r.success);
    }
    
    getSummary() {
        const successful = this.getSuccessfulConversions();
        const failed = this.getFailedConversions();
        
        return {
            total: this.results.length,
            successful: successful.length,
            failed: failed.length,
            totalTextExtracted: successful.reduce((sum, r) => sum + r.text.length, 0),
            totalSizeProcessed: this.results.reduce((sum, r) => sum + r.size, 0)
        };
    }
}

/**
 * Example 3: Resume processor with validation
 */
class ResumeProcessor {
    constructor() {
        this.converter = new FileToTextConverter({ debug: false });
        this.validExtensions = ['.txt', '.pdf', '.docx', '.doc'];
    }
    
    async processResume(file) {
        // Validate file
        const validation = this.validateResumeFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        // Extract text
        const text = await this.converter.convertToText(file);
        
        // Analyze resume content (example analysis)
        const analysis = this.analyzeResumeText(text);
        
        return {
            filename: file.name,
            text: text,
            analysis: analysis,
            metadata: {
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified)
            }
        };
    }
    
    validateResumeFile(file) {
        // Check file size (max 10MB for resumes)
        if (file.size > 10 * 1024 * 1024) {
            return { valid: false, error: 'Resume file size should not exceed 10MB' };
        }
        
        // Check file extension
        const extension = this.getFileExtension(file.name);
        if (!this.validExtensions.includes(extension)) {
            return { 
                valid: false, 
                error: `Invalid file type. Accepted formats: ${this.validExtensions.join(', ')}` 
            };
        }
        
        return { valid: true };
    }
    
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > -1 ? filename.substring(lastDot).toLowerCase() : '';
    }
    
    analyzeResumeText(text) {
        // Simple analysis example
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const lines = text.split('\n');
        
        // Look for common resume sections
        const sections = {
            hasExperience: /experience|work history|employment/i.test(text),
            hasEducation: /education|academic|university|college|degree/i.test(text),
            hasSkills: /skills|technologies|competencies/i.test(text),
            hasContact: /email|phone|address|contact/i.test(text)
        };
        
        // Extract potential email (basic pattern)
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        
        return {
            wordCount: words.length,
            lineCount: lines.length,
            characterCount: text.length,
            sections: sections,
            hasEmail: !!emailMatch,
            // Add more analysis as needed
        };
    }
}

/**
 * Example 4: Using with a UI component
 */
class FileUploadComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.setupUI();
    }
    
    setupUI() {
        this.container.innerHTML = `
            <div class="file-upload-widget">
                <input type="file" id="fileInput" multiple 
                       accept=".txt,.md,.csv,.json,.pdf,.docx,.doc">
                <label for="fileInput" class="upload-button">
                    Choose Files
                </label>
                <div id="results"></div>
            </div>
        `;
        
        const input = this.container.querySelector('#fileInput');
        input.addEventListener('change', (e) => this.handleFiles(e.target.files));
    }
    
    async handleFiles(files) {
        const resultsDiv = this.container.querySelector('#results');
        resultsDiv.innerHTML = '<p>Processing files...</p>';
        
        const processor = new BatchFileProcessor({ debug: true });
        
        const results = await processor.processFiles(Array.from(files), (progress) => {
            resultsDiv.innerHTML = `
                <p>Processing ${progress.currentFile} (${progress.current}/${progress.total})</p>
                <progress value="${progress.percentage}" max="100"></progress>
            `;
        });
        
        const summary = processor.getSummary();
        
        resultsDiv.innerHTML = `
            <h3>Processing Complete</h3>
            <p>✓ Successful: ${summary.successful}</p>
            <p>✗ Failed: ${summary.failed}</p>
            <p>Total text extracted: ${(summary.totalTextExtracted / 1024).toFixed(1)} KB</p>
        `;
        
        // Log results for debugging
        console.log('Processing results:', results);
    }
}

// Export for use in other modules
export {
    processDocument,
    BatchFileProcessor,
    ResumeProcessor,
    FileUploadComponent
};