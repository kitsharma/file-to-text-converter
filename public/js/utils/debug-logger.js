/**
 * Debug Logger - Comprehensive debugging and logging utility
 * Provides detailed logging, status monitoring, and diagnostic tools
 */

class DebugLogger {
    constructor() {
        this.logs = [];
        this.isVisible = true;
        this.maxLogs = 100;
        this.logLevel = 'DEBUG'; // DEBUG, INFO, WARN, ERROR
        
        this.setupDebugPanel();
        this.setupConsoleOverrides();
        this.startStatusMonitoring();
        
        this.log('DEBUG', 'DebugLogger initialized');
    }

    /**
     * Setup debug panel interactions
     */
    setupDebugPanel() {
        const toggleBtn = document.getElementById('toggleDebugBtn');
        const clearBtn = document.getElementById('clearDebugBtn');
        const diagnosticsBtn = document.getElementById('runDiagnosticsBtn');
        const exportBtn = document.getElementById('exportLogsBtn');
        const debugPanel = document.getElementById('debugPanel');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isVisible = !this.isVisible;
                if (debugPanel) {
                    debugPanel.style.display = this.isVisible ? 'block' : 'none';
                    toggleBtn.textContent = this.isVisible ? 'Hide' : 'Show';
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearLogs();
            });
        }

        if (diagnosticsBtn) {
            diagnosticsBtn.addEventListener('click', () => {
                this.runDiagnostics();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportLogs();
            });
        }
    }

    /**
     * Override console methods to capture all logs
     */
    setupConsoleOverrides() {
        const originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error
        };

        console.log = (...args) => {
            this.log('DEBUG', ...args);
            originalConsole.log(...args);
        };

        console.info = (...args) => {
            this.log('INFO', ...args);
            originalConsole.info(...args);
        };

        console.warn = (...args) => {
            this.log('WARN', ...args);
            originalConsole.warn(...args);
        };

        console.error = (...args) => {
            this.log('ERROR', ...args);
            originalConsole.error(...args);
        };

        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.log('ERROR', 'Unhandled error:', event.error?.message || event.message, event.filename, event.lineno);
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.log('ERROR', 'Unhandled promise rejection:', event.reason);
        });
    }

    /**
     * Start monitoring system status
     */
    startStatusMonitoring() {
        this.updateStatus('apiClientStatus', 'Initializing...', 'warning');
        this.updateStatus('uploadStatus', 'Ready', 'success');
        this.updateStatus('backendStatus', 'Checking...', 'warning');

        // Check backend status
        this.checkBackendStatus();
        
        // Monitor file input
        this.monitorFileInput();
        
        // Monitor API client initialization
        this.monitorAPIClient();
    }

    /**
     * Check backend API status
     */
    async checkBackendStatus() {
        try {
            this.log('DEBUG', 'Checking backend status...');
            
            const response = await fetch('/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatus('backendStatus', 'Connected ✓', 'success');
                this.log('INFO', 'Backend status:', data);
            } else {
                this.updateStatus('backendStatus', `Error ${response.status}`, 'error');
                this.log('ERROR', 'Backend health check failed:', response.status, response.statusText);
            }
        } catch (error) {
            this.updateStatus('backendStatus', 'Offline ✗', 'error');
            this.log('ERROR', 'Backend connection failed:', error.message);
        }
    }

    /**
     * Monitor file input functionality
     */
    monitorFileInput() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        if (fileInput) {
            this.log('DEBUG', 'File input found, setting up monitoring');
            
            fileInput.addEventListener('change', (event) => {
                this.log('DEBUG', 'File input change event detected - main handler should process');
                if (event.target.files.length > 0) {
                    const file = event.target.files[0];
                    this.updateStatus('uploadStatus', `Selected: ${file.name}`, 'info');
                    this.log('INFO', 'File selected (debug monitoring only):', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        lastModified: new Date(file.lastModified)
                    });
                    
                    // NO PROCESSING - Let main FileConverter handle it
                }
            });

            // Test file input functionality
            this.testFileInputSetup();
        } else {
            this.log('ERROR', 'File input element not found!');
            this.updateStatus('uploadStatus', 'Not Found ✗', 'error');
        }

        if (uploadArea) {
            this.log('DEBUG', 'Upload area found, setting up drag & drop');
            this.setupDragAndDrop(uploadArea, fileInput);
        } else {
            this.log('ERROR', 'Upload area element not found!');
        }
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop(uploadArea, fileInput) {
        // DEBUG LOGGER: OBSERVE ONLY - Don't interfere with file handling
        // Let the main FileConverter handle all actual file processing
        
        this.log('DEBUG', 'Debug logger monitoring file upload events (non-interfering mode)');
        
        // Monitor file input changes for logging only
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                this.log('INFO', 'File selected via input:', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                this.updateStatus('uploadStatus', `Selected: ${file.name}`, 'info');
            }
        });
        
        // Monitor events for logging only (no preventDefault, no handling)
        uploadArea.addEventListener('dragover', () => {
            this.log('DEBUG', 'Drag over detected');
        });
        
        uploadArea.addEventListener('drop', () => {
            this.log('DEBUG', 'Drop detected - main handler should process');
        });
        
        uploadArea.addEventListener('click', () => {
            this.log('DEBUG', 'Upload area clicked - main handler should respond');
        });
    }

    /**
     * Test file input setup
     */
    testFileInputSetup() {
        const fileInput = document.getElementById('fileInput');
        
        this.log('DEBUG', 'Testing file input setup:', {
            exists: !!fileInput,
            accept: fileInput?.accept,
            type: fileInput?.type,
            multiple: fileInput?.multiple,
            disabled: fileInput?.disabled
        });
    }

    /**
     * Monitor API client initialization
     */
    monitorAPIClient() {
        const checkInterval = setInterval(() => {
            if (window.CareerAPIClient) {
                this.updateStatus('apiClientStatus', 'Ready ✓', 'success');
                this.log('INFO', 'CareerAPIClient available');
                clearInterval(checkInterval);
            }
        }, 500);

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!window.CareerAPIClient) {
                this.updateStatus('apiClientStatus', 'Failed ✗', 'error');
                this.log('ERROR', 'CareerAPIClient not loaded after 10 seconds');
                clearInterval(checkInterval);
            }
        }, 10000);
    }

    /**
     * DEBUG LOGGER: File processing removed
     * All file processing now handled by main FileConverter only
     */

    /**
     * Read text file
     */
    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read text file'));
            reader.readAsText(file);
        });
    }

    /**
     * Read PDF file
     */
    async readPDFFile(file) {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js library not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        return fullText;
    }

    /**
     * Read DOCX file
     */
    async readDocxFile(file) {
        if (!window.mammoth) {
            throw new Error('Mammoth library not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    /**
     * Display file content (fallback)
     */
    displayFileContent(content, fileName) {
        const resultContainer = document.getElementById('resultContainer');
        const resultText = document.getElementById('resultText');
        const resultTitle = document.getElementById('resultTitle');

        if (resultContainer && resultText && resultTitle) {
            resultTitle.textContent = `Content from ${fileName}`;
            resultText.textContent = content;
            resultContainer.style.display = 'block';
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('errorMessage') || this.createErrorDiv();
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 10000);
    }

    /**
     * Create error div if it doesn't exist
     */
    createErrorDiv() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #ffebee;
            border: 1px solid #ffcdd2;
            color: #c62828;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            display: none;
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(errorDiv);
        }
        
        return errorDiv;
    }

    /**
     * Log message with timestamp
     */
    log(level, ...args) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const logEntry = {
            timestamp,
            level,
            message,
            fullMessage: `[${timestamp}] [${level}] ${message}`
        };

        this.logs.push(logEntry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        this.updateLogDisplay();
    }

    /**
     * Update log display
     */
    updateLogDisplay() {
        const debugLogs = document.getElementById('debugLogs');
        if (!debugLogs) return;

        const recentLogs = this.logs.slice(-20); // Show last 20 logs
        debugLogs.innerHTML = recentLogs.map(log => {
            const color = this.getLogColor(log.level);
            return `<div class="debug-log-entry" style="color: ${color}; margin-bottom: 2px;">${log.fullMessage}</div>`;
        }).join('');

        // Auto-scroll to bottom
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }

    /**
     * Get color for log level
     */
    getLogColor(level) {
        const colors = {
            'DEBUG': '#6c757d',
            'INFO': '#17a2b8',
            'WARN': '#ffc107',
            'ERROR': '#dc3545'
        };
        return colors[level] || '#fff';
    }

    /**
     * Update status indicator
     */
    updateStatus(statusId, text, type = 'info') {
        const statusEl = document.getElementById(statusId);
        if (statusEl) {
            statusEl.textContent = text;
            
            const colors = {
                'success': '#28a745',
                'error': '#dc3545',
                'warning': '#ffc107',
                'info': '#17a2b8'
            };
            
            statusEl.style.color = colors[type] || '#6c757d';
        }
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.updateLogDisplay();
        this.log('DEBUG', 'Debug logs cleared');
    }

    /**
     * Export logs for analysis
     */
    exportLogs() {
        const logData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.log('INFO', 'Debug logs exported');
    }

    /**
     * Test all major functionality
     */
    runDiagnostics() {
        this.log('INFO', '=== Starting diagnostics ===');
        
        // Test DOM elements
        const elements = [
            'fileInput', 'uploadArea', 'debugPanel', 'debugLogs',
            'backendStatus', 'uploadStatus', 'apiClientStatus'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            this.log('DEBUG', `Element ${id}:`, el ? '✓ Found' : '✗ Missing');
        });

        // Test global objects
        const globals = [
            'pdfjsLib', 'mammoth', 'CareerAPIClient', 'CareerInsightsManager', 'CareerInsightsUI'
        ];
        
        globals.forEach(name => {
            this.log('DEBUG', `Global ${name}:`, window[name] ? '✓ Available' : '✗ Missing');
        });

        // Test API endpoints
        this.testAPIEndpoints();

        this.log('INFO', '=== Diagnostics complete ===');
    }

    /**
     * Test API endpoints
     */
    async testAPIEndpoints() {
        const endpoints = [
            '/health',
            '/api/skills/analyze',
            '/api/career/recommendations'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, { method: 'HEAD' });
                this.log('DEBUG', `Endpoint ${endpoint}:`, response.ok ? '✓ Available' : `✗ ${response.status}`);
            } catch (error) {
                this.log('DEBUG', `Endpoint ${endpoint}:`, '✗ Failed', error.message);
            }
        }
    }
}

// Initialize debug logger immediately
const debugLogger = new DebugLogger();

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DebugLogger };
} else {
    window.debugLogger = debugLogger;
}