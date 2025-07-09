# Career Resilience Platform - Web Application

🚀 **AI-Powered Career Transition Platform with Bias Monitoring**

A comprehensive web application that helps users navigate career transitions using AI-powered skill matching, career recommendations, learning path generation, and bias detection.

## Features

### 🎯 Core Capabilities
- **Resume Analysis**: Upload and parse PDF, DOCX, or text resumes
- **Skill Matching**: Match user skills to O*NET taxonomy with multiple strategies
- **Career Recommendations**: Get personalized job recommendations with explanations
- **Learning Paths**: Generate step-by-step learning plans for career transitions
- **Bias Detection**: Monitor recommendations for fairness across demographics
- **Market Intelligence**: Integration with BLS data and Perplexity validation

### 🔒 Privacy & Security
- **Local Processing**: Resume analysis happens in your browser
- **PII Detection**: Automatic detection and redaction of sensitive information
- **No Data Storage**: Your data never leaves your device unless you choose to generate insights

### 🧠 AI Integration
- **O*NET Integration**: Official occupational database from U.S. Department of Labor
- **BLS Data**: Bureau of Labor Statistics employment projections and wages
- **Perplexity Validation**: Real-time market data validation (optional)
- **Multiple Matching Strategies**: Exact, synonym, fuzzy, and semantic matching

## Quick Start

### 1. Setup Environment

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Server

```bash
# Start the FastAPI backend server
python run_server.py
```

The application will be available at: **http://localhost:8000**

### 3. Use the Application

1. **Upload Resume**: Drag and drop your resume (PDF, DOCX, or TXT)
2. **Review Analysis**: Check the parsed resume data and skills
3. **Generate Insights**: Click "Generate Career Insights" for AI-powered analysis
4. **Explore Results**: Navigate through skills, job matches, learning paths, and market data

## Architecture

### Backend Components

```
src/
├── models/
│   ├── skill_ontology.py      # Core data models
│   └── user_profile.py        # User profile management
├── services/
│   ├── skill_matcher.py       # Multi-strategy skill matching
│   ├── career_recommender.py  # AI-powered recommendations
│   ├── learning_path_generator.py  # Personalized learning paths
│   └── bias_monitor.py        # Fairness analysis
├── integrations/
│   ├── onet_integration.py    # O*NET data integration
│   └── bls_integration.py     # Bureau of Labor Statistics API
└── main.py                    # FastAPI server
```

### Frontend Components

```
public/
├── index.html                 # Main application interface
├── js/
│   ├── components/
│   │   ├── career-api-client.js     # Backend API integration
│   │   ├── career-insights-ui.js    # Career insights interface
│   │   └── existing UI components...
│   └── main-app.js           # Application orchestration
└── css/                      # Styling and themes
```

## API Endpoints

### Core Analysis
- `POST /api/skills/analyze` - Analyze and match user skills
- `POST /api/career/recommendations` - Get career recommendations
- `POST /api/learning/path` - Generate learning paths
- `POST /api/bias/analyze` - Analyze recommendations for bias

### Data Integration
- `GET /api/onet/skills` - Search O*NET skills database
- `GET /api/bls/occupations` - Get BLS occupation data
- `GET /health` - Health check endpoint

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Optional: For enhanced market validation
PERPLEXITY_API_KEY=your_perplexity_api_key

# Optional: For BLS API (higher rate limits)
BLS_API_KEY=your_bls_api_key

# Development settings
DEBUG=true
LOG_LEVEL=info
```

### API Keys (Optional)

1. **Perplexity API**: For real-time market data validation
   - Sign up at https://perplexity.ai
   - Add key to `.env` file

2. **BLS API**: For higher rate limits on labor statistics
   - Register at https://www.bls.gov/developers/
   - Add key to `.env` file

*Note: The application works without API keys using cached data and free endpoints.*

## Testing

### Run Backend Tests

```bash
# Run all tests
python -m pytest

# Run specific test suites
python -m pytest tests/test_skill_matcher.py
python -m pytest tests/test_career_recommender.py
python -m pytest tests/test_bias_monitor.py
```

### Test Coverage

```bash
# Generate coverage report
python -m pytest --cov=src tests/

# View detailed coverage
python -m pytest --cov=src --cov-report=html tests/
```

## Usage Examples

### 1. Basic Resume Analysis

1. Upload your resume
2. Review parsed skills and experience
3. Use privacy controls to redact sensitive information

### 2. Career Transition Planning

1. Upload resume with current skills
2. Click "Generate Career Insights"
3. Review recommended roles and match scores
4. Explore learning paths for target roles

### 3. Skill Gap Analysis

1. Select a target job from recommendations
2. View detailed skill gap analysis
3. Follow the generated learning path
4. Track progress through milestones

### 4. Market Intelligence

1. Search for specific job titles
2. View BLS employment projections
3. Compare salary ranges and growth outlook
4. Access real-time market validation

## Troubleshooting

### Common Issues

**Backend Import Errors**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Install missing dependencies
pip install -r requirements.txt
```

**Port Already in Use**
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

**API Rate Limits**
- BLS API: Limited to 25 queries per day without API key
- Solution: Register for free API key or use cached data

### Development Mode

For development with auto-reload:

```bash
# Start with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Performance

### Optimization Tips

1. **Caching**: Skill matches and market data are cached automatically
2. **Batch Processing**: Process multiple skills/jobs in single requests
3. **Rate Limiting**: Built-in respect for API rate limits
4. **Local Processing**: Resume parsing happens client-side

### Scaling Considerations

- **Database**: Currently using in-memory storage; consider PostgreSQL for production
- **Caching**: Consider Redis for distributed caching
- **API Rate Limits**: Implement request queuing for high-volume usage

## Security

### Data Handling
- Resume data processed locally in browser
- No persistent storage of user data
- Optional API calls only with user consent

### PII Protection
- Automatic detection of personal information
- User-controlled redaction options
- Clear privacy indicators throughout interface

### API Security
- CORS properly configured
- Input validation on all endpoints
- No sensitive data logged

## Contributing

### Development Setup

1. Clone repository
2. Set up virtual environment
3. Install dependencies
4. Run tests
5. Start development server

### Code Style

- Python: Follow PEP 8
- JavaScript: Use ESLint configuration
- Comments: Document complex algorithms
- Tests: Maintain >90% coverage

## License

MIT License - See LICENSE file for details.

## Support

For issues, questions, or contributions:
1. Check existing issues in the repository
2. Create detailed bug reports with reproduction steps
3. Include system information and error logs

---

**Built with ❤️ for career resilience in the AI age**