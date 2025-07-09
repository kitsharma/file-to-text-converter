# Career Resilience Platform - Project Structure

## 📁 Directory Organization

```
/
├── 📁 public/              # Static assets served to browser
│   └── index.html          # Main application entry point
│
├── 📁 assets/              # Static resources
│   ├── 📁 styles/          # CSS stylesheets
│   │   ├── ux-styles.css
│   │   ├── career-resilience-styles.css
│   │   ├── skills-analysis-styles.css
│   │   ├── improved-ux-styles.css
│   │   └── privacy-control-styles.css
│   ├── 📁 images/          # Image assets
│   └── 📁 data/            # Static data files
│       ├── skills.csv
│       └── skills_to_work_activities.csv
│
├── 📁 src/                 # Source code
│   ├── 📁 components/      # UI Components & Main App Logic
│   │   ├── app.js          # Main application controller
│   │   ├── ai-job-matcher.js
│   │   ├── enhanced-onet-mapper.js
│   │   ├── onet-skill-mapper.js
│   │   ├── skills-analysis-display.js
│   │   └── ux-enhanced-resume-display.js
│   │
│   ├── 📁 services/        # Business Logic & External APIs
│   │   ├── government-data-service.js
│   │   ├── onet-service.js
│   │   ├── pii-detector.js
│   │   ├── skill-reframing-service.js
│   │   └── smart-redaction-service.js
│   │
│   ├── 📁 parsers/         # Resume & Document Parsing
│   │   ├── enhanced-resume-parser.js
│   │   └── resume-parser.js
│   │
│   ├── 📁 utils/           # Utility Functions & Configuration
│   │   ├── api-interceptor.js
│   │   ├── config.js
│   │   └── minimal-api-config.js
│   │
│   ├── 📁 integrations/    # External API Integrations (Python)
│   └── 📁 models/          # Data Models (Python)
│
├── 📁 tests/               # Test Suite
│   ├── 📁 unit/            # Unit tests
│   ├── 📁 integration/     # Integration tests
│   └── 📁 fixtures/        # Test data & fixtures
│
├── 📁 dev/                 # Development & Debug Tools
│   ├── 📁 debug/           # Debug HTML files & logs
│   └── 📁 test-files/      # Test scripts & sample data
│
├── 📁 docs/                # Documentation
│   ├── PROJECT_STRUCTURE.md
│   ├── API_INTEGRATION_GUIDE.md
│   ├── CLAUDE_FORENSIC_PROTOCOL.md
│   └── FORENSIC_ANALYSIS.md
│
└── 📁 scripts/             # Build & deployment scripts
```

## 🏗️ Architecture Principles

### **Separation of Concerns**
- **Components**: UI logic and user interaction
- **Services**: Business logic and external API calls
- **Parsers**: Document processing and data extraction
- **Utils**: Shared utilities and configuration

### **File Naming Conventions**
- **Kebab-case** for file names: `enhanced-resume-parser.js`
- **Descriptive naming** that indicates purpose
- **Consistent suffixes**: `-service.js`, `-parser.js`, `-mapper.js`

### **Import/Export Strategy**
- All modules use relative paths from their location
- CSS imports use `../assets/styles/` from public directory
- JS imports use `../src/` structure from public directory

## 📦 Module Dependencies

### Core Application Flow
```
index.html → app.js → [services] → [parsers] → [utils]
                  ↓
              [components]
```

### Key Dependencies
- **PDF.js**: PDF document parsing
- **Mammoth.js**: DOCX document parsing
- **Fast-Levenshtein**: String similarity matching
- **Government APIs**: O*NET, BLS data integration

## 🚀 Development Workflow

1. **Main Entry**: `public/index.html`
2. **Application Controller**: `src/components/app.js`
3. **Resume Processing**: `src/parsers/enhanced-resume-parser.js`
4. **Skills Analysis**: `src/services/` + `src/components/`
5. **UI Rendering**: `src/components/` + `assets/styles/`

## 🛡️ Security & Privacy

- **PII Detection**: `src/services/pii-detector.js`
- **Smart Redaction**: `src/services/smart-redaction-service.js`
- **Privacy Controls**: Implemented across all components

---

*This structure follows modern web development best practices with clear separation of concerns, maintainable organization, and scalable architecture.*