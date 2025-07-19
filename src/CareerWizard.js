import { FileToTextConverter } from '../dist/FileToTextConverter.esm.js';

export class CareerWizard {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      debug: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB for mobile
      ...options
    };
    this.converter = new FileToTextConverter({ debug: this.options.debug });
    this.currentStep = 0;
    this.wizardData = {};
    this.steps = [];
    this.init();
  }

  init() {
    this.setupSteps();
    this.render();
    this.setupEventListeners();
  }

  setupSteps() {
    this.steps = [
      {
        id: 'welcome',
        title: 'Welcome to Career AI',
        component: this.createWelcomeStep(),
        isValid: () => true,
        getData: () => ({ welcomed: true })
      },
      {
        id: 'questionnaire',
        title: 'Career Context',
        component: this.createQuestionnaireStep(),
        isValid: () => this.validateQuestionnaire(),
        getData: () => this.getQuestionnaireData()
      },
      {
        id: 'upload',
        title: 'Upload Resume',
        component: this.createUploadStep(),
        isValid: () => this.wizardData.uploadedFile && this.wizardData.extractedText,
        getData: () => ({ 
          file: this.wizardData.uploadedFile,
          extractedText: this.wizardData.extractedText
        })
      },
      {
        id: 'review',
        title: 'Review & Process',
        component: this.createReviewStep(),
        isValid: () => true,
        getData: () => this.wizardData
      }
    ];
  }

  createWelcomeStep() {
    const step = document.createElement('div');
    step.className = 'wizard-step welcome-step';
    step.innerHTML = `
      <div class="step-icon">🚀</div>
      <h2>Transform Your Career</h2>
      <p>Upload your resume and get AI-powered insights to accelerate your career growth.</p>
      <div class="features">
        <div class="feature">
          <span class="feature-icon">📱</span>
          <span>Mobile Optimized</span>
        </div>
        <div class="feature">
          <span class="feature-icon">🔒</span>
          <span>Privacy First</span>
        </div>
        <div class="feature">
          <span class="feature-icon">⚡</span>
          <span>Instant Results</span>
        </div>
      </div>
    `;
    return step;
  }

  createQuestionnaireStep() {
    const step = document.createElement('div');
    step.className = 'wizard-step questionnaire-step';
    step.innerHTML = `
      <h2>Tell us about your career goals</h2>
      <form class="questionnaire-form">
        <div class="form-group">
          <label for="currentRole">Current Role</label>
          <input type="text" id="currentRole" name="currentRole" placeholder="e.g., Software Engineer">
        </div>
        <div class="form-group">
          <label for="targetRole">Target Role</label>
          <input type="text" id="targetRole" name="targetRole" placeholder="e.g., Senior Software Engineer">
        </div>
        <div class="form-group">
          <label for="experience">Years of Experience</label>
          <select id="experience" name="experience">
            <option value="">Select...</option>
            <option value="0-1">0-1 years</option>
            <option value="2-3">2-3 years</option>
            <option value="4-5">4-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
        <div class="form-group">
          <label for="industry">Industry</label>
          <select id="industry" name="industry">
            <option value="">Select...</option>
            <option value="tech">Technology</option>
            <option value="finance">Finance</option>
            <option value="healthcare">Healthcare</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="goals">Career Goals</label>
          <textarea id="goals" name="goals" placeholder="What are your main career objectives?"></textarea>
        </div>
      </form>
    `;
    return step;
  }

  createUploadStep() {
    const step = document.createElement('div');
    step.className = 'wizard-step upload-step';
    step.innerHTML = `
      <h2>Upload Your Resume</h2>
      <div class="upload-container">
        <div class="upload-area" id="uploadArea">
          <div class="upload-icon">📄</div>
          <p class="upload-text">Tap to select or drag your resume here</p>
          <p class="upload-subtext">Supports PDF, Word, and text files</p>
          <input type="file" id="fileInput" accept=".pdf,.doc,.docx,.txt,.md" hidden>
        </div>
        <div class="upload-progress" id="uploadProgress" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-text" id="progressText"></div>
        </div>
        <div class="upload-result" id="uploadResult" style="display: none;"></div>
      </div>
    `;
    return step;
  }

  createReviewStep() {
    const step = document.createElement('div');
    step.className = 'wizard-step review-step';
    step.innerHTML = `
      <h2>Review Your Information</h2>
      <div class="review-content">
        <div class="review-section">
          <h3>Career Profile</h3>
          <div id="careerProfile"></div>
        </div>
        <div class="review-section">
          <h3>Resume Analysis</h3>
          <div id="resumeAnalysis"></div>
        </div>
        <div class="review-section">
          <h3>Extracted Text Preview</h3>
          <div id="textPreview"></div>
        </div>
      </div>
    `;
    return step;
  }

  render() {
    this.container.innerHTML = `
      <div class="career-wizard">
        <div class="wizard-header">
          <div class="progress-indicator">
            ${this.steps.map((step, index) => `
              <div class="progress-step ${index === this.currentStep ? 'active' : ''} ${index < this.currentStep ? 'completed' : ''}">
                <div class="step-number">${index + 1}</div>
                <div class="step-title">${step.title}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="wizard-content">
          <div class="step-container" id="stepContainer">
            ${this.steps[this.currentStep].component.outerHTML}
          </div>
        </div>
        
        <div class="wizard-footer">
          <button class="btn btn-secondary" id="backBtn" ${this.currentStep === 0 ? 'disabled' : ''}>
            Back
          </button>
          <button class="btn btn-primary" id="nextBtn">
            ${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const backBtn = this.container.querySelector('#backBtn');
    const nextBtn = this.container.querySelector('#nextBtn');

    backBtn.addEventListener('click', () => this.goToPreviousStep());
    nextBtn.addEventListener('click', () => this.goToNextStep());

    this.setupStepEventListeners();
  }

  setupStepEventListeners() {
    const currentStepId = this.steps[this.currentStep].id;
    
    if (currentStepId === 'upload') {
      this.setupUploadListeners();
    } else if (currentStepId === 'questionnaire') {
      this.setupQuestionnaireListeners();
    } else if (currentStepId === 'review') {
      this.setupReviewContent();
    }
  }

  setupUploadListeners() {
    const uploadArea = this.container.querySelector('#uploadArea');
    const fileInput = this.container.querySelector('#fileInput');
    const uploadProgress = this.container.querySelector('#uploadProgress');
    const uploadResult = this.container.querySelector('#uploadResult');

    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.handleFileUpload(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFileUpload(file);
    });
  }

  setupQuestionnaireListeners() {
    const form = this.container.querySelector('.questionnaire-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('input', () => this.updateNextButton());
    });
  }

  setupReviewContent() {
    const careerProfile = this.container.querySelector('#careerProfile');
    const resumeAnalysis = this.container.querySelector('#resumeAnalysis');
    const textPreview = this.container.querySelector('#textPreview');

    const questionnaire = this.wizardData.questionnaire || {};
    careerProfile.innerHTML = `
      <p><strong>Current Role:</strong> ${questionnaire.currentRole || 'Not specified'}</p>
      <p><strong>Target Role:</strong> ${questionnaire.targetRole || 'Not specified'}</p>
      <p><strong>Experience:</strong> ${questionnaire.experience || 'Not specified'}</p>
      <p><strong>Industry:</strong> ${questionnaire.industry || 'Not specified'}</p>
      <p><strong>Goals:</strong> ${questionnaire.goals || 'Not specified'}</p>
    `;

    if (this.wizardData.extractedText) {
      const wordCount = this.wizardData.extractedText.split(/\s+/).length;
      const charCount = this.wizardData.extractedText.length;
      
      resumeAnalysis.innerHTML = `
        <p><strong>File:</strong> ${this.wizardData.uploadedFile?.name || 'Unknown'}</p>
        <p><strong>Size:</strong> ${this.wizardData.uploadedFile ? (this.wizardData.uploadedFile.size / 1024).toFixed(1) + ' KB' : 'Unknown'}</p>
        <p><strong>Words:</strong> ${wordCount.toLocaleString()}</p>
        <p><strong>Characters:</strong> ${charCount.toLocaleString()}</p>
      `;

      const preview = this.wizardData.extractedText.substring(0, 500) + (this.wizardData.extractedText.length > 500 ? '...' : '');
      textPreview.innerHTML = `<pre>${preview}</pre>`;
    }
  }

  async handleFileUpload(file) {
    const uploadProgress = this.container.querySelector('#uploadProgress');
    const uploadResult = this.container.querySelector('#uploadResult');
    const progressFill = this.container.querySelector('#progressFill');
    const progressText = this.container.querySelector('#progressText');

    try {
      uploadProgress.style.display = 'block';
      uploadResult.style.display = 'none';
      
      progressFill.style.width = '20%';
      progressText.textContent = 'Processing file...';

      const extractedText = await this.converter.convertToText(file, {
        debug: this.options.debug
      });

      progressFill.style.width = '100%';
      progressText.textContent = 'Complete!';

      this.wizardData.uploadedFile = file;
      this.wizardData.extractedText = extractedText;

      setTimeout(() => {
        uploadProgress.style.display = 'none';
        uploadResult.style.display = 'block';
        uploadResult.innerHTML = `
          <div class="success-message">
            <span class="success-icon">✅</span>
            <span>Successfully processed ${file.name}</span>
          </div>
        `;
        this.updateNextButton();
      }, 1000);

    } catch (error) {
      uploadProgress.style.display = 'none';
      uploadResult.style.display = 'block';
      uploadResult.innerHTML = `
        <div class="error-message">
          <span class="error-icon">❌</span>
          <span>Error: ${error.message}</span>
        </div>
      `;
      
      if (this.options.debug) {
        console.error('File upload error:', error);
      }
    }
  }

  validateQuestionnaire() {
    const form = this.container.querySelector('.questionnaire-form');
    if (!form) return false;
    
    const currentRole = form.querySelector('#currentRole').value.trim();
    const targetRole = form.querySelector('#targetRole').value.trim();
    const experience = form.querySelector('#experience').value;
    
    return currentRole && targetRole && experience;
  }

  getQuestionnaireData() {
    const form = this.container.querySelector('.questionnaire-form');
    if (!form) return {};
    
    return {
      currentRole: form.querySelector('#currentRole').value.trim(),
      targetRole: form.querySelector('#targetRole').value.trim(),
      experience: form.querySelector('#experience').value,
      industry: form.querySelector('#industry').value,
      goals: form.querySelector('#goals').value.trim()
    };
  }

  updateNextButton() {
    const nextBtn = this.container.querySelector('#nextBtn');
    const isValid = this.steps[this.currentStep].isValid();
    nextBtn.disabled = !isValid;
  }

  goToPreviousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.render();
      this.setupEventListeners();
    }
  }

  goToNextStep() {
    const currentStepData = this.steps[this.currentStep];
    
    if (!currentStepData.isValid()) {
      return;
    }

    Object.assign(this.wizardData, currentStepData.getData());

    if (currentStepData.id === 'questionnaire') {
      this.wizardData.questionnaire = this.getQuestionnaireData();
    }

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.render();
      this.setupEventListeners();
    } else {
      this.finishWizard();
    }
  }

  finishWizard() {
    if (this.options.onComplete) {
      this.options.onComplete(this.wizardData);
    }
    
    console.log('Wizard completed with data:', this.wizardData);
  }
}

export async function uploadResumeWithContext(inputs) {
  const { file, questionnaire, onProgress } = inputs;
  const converter = new FileToTextConverter({ debug: true });
  
  try {
    if (onProgress) onProgress('validation', 10);
    
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file provided');
    }

    if (onProgress) onProgress('processing', 30);
    
    const extractedText = await converter.convertToText(file);
    
    if (onProgress) onProgress('analysis', 70);
    
    const careerContext = {
      profile: questionnaire,
      resumeData: {
        filename: file.name,
        size: file.size,
        wordCount: extractedText.split(/\s+/).length,
        charCount: extractedText.length
      }
    };

    if (onProgress) onProgress('complete', 100);
    
    return {
      extractedText,
      errors: [],
      careerContext
    };
    
  } catch (error) {
    return {
      extractedText: '',
      errors: [error.message],
      careerContext: null
    };
  }
}