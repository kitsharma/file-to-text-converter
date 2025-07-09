# AI-Powered Career Transition Platform

> Navigate AI-driven job markets with intelligent resume analysis, PII redaction, and bias-aware career recommendations.

## ✨ Current Features (Working)

- ✅ **Resume Upload**: Single-click upload with PDF, DOCX, TXT support
- ✅ **PII Redaction**: Privacy-first design with company name protection
- ✅ **Work Experience Display**: Clean, accessible experience cards with expand/collapse
- ✅ **Debug Console**: Full debugging system for development
- ✅ **Responsive Design**: Mobile-first with WCAG 2.1 AA accessibility

## 🚀 Quick Start

```bash
# Set up Python environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn

# Start the server
python main.py

# Open browser to http://localhost:8000
```

## 📁 Project Structure

```
├── 📁 public/              # Static assets and entry point
│   └── index.html          # Main application
├── 📁 assets/              # Static resources
│   ├── 📁 styles/          # CSS stylesheets
│   └── 📁 data/            # Static data files
├── 📁 src/                 # Source code
│   ├── 📁 components/      # UI components & app logic
│   ├── 📁 services/        # Business logic & APIs
│   ├── 📁 parsers/         # Resume parsing modules
│   └── 📁 utils/           # Utilities & configuration
├── 📁 tests/               # Test suite
├── 📁 docs/                # Documentation
└── 📁 dev/                 # Development tools
```

## 📖 How to Use

1. **Upload Resume**: Drag and drop or click to upload your resume file
2. **Privacy Control**: Toggle company name visibility with 👁️ redaction button
3. **View Analysis**: Experience displays as clean cards with 2 achievements initially
4. **Expand Details**: Click "Show more" to see additional achievements
5. **Debug Mode**: Open browser console for detailed processing logs

## 🎯 Working Features

### 📄 Resume Processing
- **File Support**: PDF, DOCX, TXT formats
- **Smart Parsing**: Extracts skills, experience, education
- **Progress Tracking**: Real-time processing status with document preview
- **Single Upload**: Fixed double-upload issue

### 🔒 Privacy Protection
- **Company Redaction**: Shows "🔒 Company name protected for your privacy"
- **Toggle Visibility**: Click 👁️ to show/hide company names
- **Trust Building**: Clear messaging about data protection
- **Local Processing**: No data transmitted to external servers

### 💼 Experience Display
- **Visual Hierarchy**: Company → Role → Achievements
- **Cognitive Ease**: Shows 2 achievements initially, expandable
- **Smooth Animations**: 300ms transitions for show/hide
- **Consistent Formatting**: Standardized • bullet points
- **Responsive Design**: Works on mobile, tablet, desktop

## 🏗️ Architecture

### Frontend
- **Vanilla JavaScript ES2020+** with modular file handling
- **CSS Grid & Flexbox** for responsive layouts
- **WCAG 2.1 AA accessibility** with full ARIA support
- **Mobile-first design** with 44px touch targets

### Backend Services
- **FastAPI** for robust API endpoints
- **Python 3.8+** for data processing and AI services
- **Static file serving** with optimized routing

### Key Technologies
- **PDF.js** for PDF document parsing
- **Mammoth.js** for DOCX document parsing
- **Debug Console** for development visibility
- **Responsive CSS** with device-specific optimizations

## 🔧 Development

### Prerequisites
- Python 3.8+
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup
```bash
# Clone repository
git clone https://github.com/kitsharma/a-w-ai.git
cd a-w-ai

# Set up Python environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn

# Start the server
python main.py
```

### Testing
```bash
# Run automated test suite
./run-tests.sh

# Manual testing
# 1. Open http://localhost:8000
# 2. Upload public/test-charles.txt
# 3. Verify features work as described

# Browser console verification
# Open DevTools Console and run:
# verifyExperienceImprovements()
```

### API Endpoints
- `GET /` - Main application interface
- `GET /health` - Server health check
- `POST /api/skills/analyze` - Analyze skills from resume
- `POST /api/career/recommendations` - Get career recommendations

## 📖 Documentation

- [Project Structure](docs/PROJECT_STRUCTURE.md) - Detailed architecture overview
- [API Integration Guide](docs/API_INTEGRATION_GUIDE.md) - External API setup
- [Development Guide](docs/DEVELOPMENT.md) - Development workflows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- O*NET Program for occupational data
- Bureau of Labor Statistics for employment data
- Open source community for excellent tools and libraries

---

**Built with ❤️ for career resilience and professional growth**