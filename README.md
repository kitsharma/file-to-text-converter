# Career Resilience Platform

> AI-powered career resilience platform for navigating job market changes with intelligent resume analysis, skills mapping, and personalized career insights.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

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

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run dev` | Start development server (alias) |
| `npm run build` | Build for production |
| `npm test` | Run JavaScript tests |
| `npm run test:python` | Run Python tests |
| `npm run clean` | Clean build artifacts |

## 🎯 Core Features

- **📄 Resume Analysis**: Upload and analyze PDF/DOCX resumes
- **🔍 Skills Extraction**: AI-powered skills identification and mapping
- **🎯 Job Matching**: Match skills to relevant job opportunities
- **📊 Career Insights**: Personalized career development recommendations
- **🔒 Privacy Protection**: Advanced PII redaction and privacy controls
- **📈 Market Analysis**: Real-time job market trend analysis

## 🏗️ Architecture

### Frontend
- **Vanilla JavaScript ES2020+** with modular architecture
- **CSS Grid & Flexbox** for responsive layouts
- **Progressive Enhancement** for accessibility

### Backend Services
- **Python 3.9+** for data processing and AI services
- **O*NET API** integration for occupational data
- **BLS API** integration for labor statistics

### Key Technologies
- **PDF.js** for PDF parsing
- **Mammoth.js** for DOCX parsing
- **Fast-Levenshtein** for string matching
- **Government APIs** (O*NET, BLS) for career data

## 🔧 Development

### Prerequisites
- Node.js 18.0+
- Python 3.9+
- Modern web browser

### Setup
```bash
# Clone repository
git clone <repository-url>
cd career-resilience-platform

# Install Node.js dependencies
npm install

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start development server
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run Python tests
npm run test:python

# Run specific test file
npx jest tests/unit/specific-test.js
```

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