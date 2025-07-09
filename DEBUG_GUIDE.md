# Debug Guide - Career Resilience Platform

## 🐛 Debug Mode Overview

The Career Resilience Platform now includes comprehensive debugging tools to help diagnose and fix issues. Debug mode is **enabled by default** with full logging.

## 🔧 Debug Features

### 1. **Debug Console Panel**
- **Location**: Visible on main page below upload area
- **Real-time Logs**: Shows all console messages, errors, and system events
- **Status Indicators**: Backend connection, file upload, and API client status
- **Interactive Controls**: Clear logs, export logs, run diagnostics

### 2. **Comprehensive Logging**
- **Console Override**: Captures all `console.log`, `console.error`, `console.warn`
- **Error Tracking**: Automatic capture of unhandled errors and promise rejections
- **Timestamped Logs**: All logs include precise timestamps
- **Categorized Messages**: DEBUG, INFO, WARN, ERROR levels with color coding

### 3. **File Upload Debugging**
- **Multiple Handlers**: Supports existing upload handlers + direct file processing
- **File Type Detection**: Validates and processes PDF, DOCX, TXT files
- **Drag & Drop**: Full drag-and-drop support with visual feedback
- **Error Handling**: Detailed error messages for file processing failures

### 4. **API Monitoring**
- **Health Checks**: Automatic backend connectivity testing
- **Endpoint Testing**: Tests all major API endpoints
- **Request/Response Logging**: Full API communication logging
- **Status Updates**: Real-time connection status indicators

## 🚀 How to Use Debug Mode

### Starting the Application
```bash
# 1. Start the server
source venv/bin/activate
python run_server.py

# 2. Open browser
# Navigate to http://localhost:8000

# 3. Debug panel is automatically visible
```

### Testing File Upload
1. **Use the debug console** to monitor upload process
2. **Try different file types**: 
   - `test-resume.txt` (provided)
   - Any PDF file
   - Any DOCX file
3. **Check status indicators** for real-time feedback
4. **Review logs** for detailed processing information

### Debug Controls
- **🔍 Run Diagnostics**: Tests all major components
- **📥 Export Logs**: Download complete log file for analysis
- **🗑️ Clear**: Clear current log display
- **👁️ Hide/Show**: Toggle debug panel visibility

## 🔍 Diagnostic Commands

### Browser Console
```javascript
// Check if components are loaded
console.log('CareerAPIClient:', !!window.CareerAPIClient);
console.log('DebugLogger:', !!window.debugLogger);

// Manual diagnostics
window.debugLogger.runDiagnostics();

// Export logs programmatically
window.debugLogger.exportLogs();

// Test file upload directly
const fileInput = document.getElementById('fileInput');
fileInput.click(); // Opens file dialog
```

### Backend API Testing
```bash
# Test health endpoint
curl -X GET http://localhost:8000/health

# Test skill analysis
curl -X POST http://localhost:8000/api/skills/analyze \
  -H "Content-Type: application/json" \
  -d '{"skills": ["Python", "JavaScript"], "experience_level": "intermediate"}'

# Check static files
curl -X GET http://localhost:8000/static/js/utils/debug-logger.js
```

## 🔧 Common Issues & Solutions

### Issue: File Upload Not Working
**Symptoms**: Click upload area but nothing happens
**Debug Steps**:
1. Check debug console for errors
2. Run diagnostics to verify components
3. Check file input element exists
4. Verify drag-and-drop handlers are attached

**Solutions**:
- Ensure PDF.js and Mammoth libraries are loaded
- Check for JavaScript errors in console
- Verify file input `accept` attribute is correct

### Issue: Backend Connection Failed
**Symptoms**: Backend status shows "Offline ✗"
**Debug Steps**:
1. Check if server is running on port 8000
2. Test health endpoint manually
3. Check for CORS issues
4. Verify API endpoints are accessible

**Solutions**:
```bash
# Restart server
python run_server.py

# Check if port is in use
lsof -i :8000

# Test health endpoint
curl http://localhost:8000/health
```

### Issue: API Client Not Ready
**Symptoms**: API Client status shows "Failed ✗"
**Debug Steps**:
1. Check if JavaScript modules are loading
2. Verify script load order
3. Check for import/export issues
4. Review network tab for failed requests

**Solutions**:
- Ensure all JavaScript files are accessible
- Check script loading order in HTML
- Verify module exports are correct

## 📊 Log Analysis

### Log Format
```
[HH:MM:SS] [LEVEL] Message content
```

### Important Log Patterns
- `[CAREER-APP]` - Main application events
- `[DEBUG-LOGGER]` - Debug system events
- `File selected:` - File upload events
- `API request:` - Backend communication
- `Error:` - All error conditions

### Exporting Logs
The debug system can export logs in JSON format including:
- Full log history
- System information
- User agent details
- Current URL
- Timestamp of export

## 🧪 Testing Components

### Test Files Provided
- `test-resume.txt` - Sample resume for testing
- `test-upload.html` - Minimal upload test page
- `DEBUG_GUIDE.md` - This guide

### Test Scenarios
1. **Basic Upload**: Upload `test-resume.txt`
2. **Error Handling**: Try uploading invalid file types
3. **Large Files**: Test with larger PDF documents
4. **API Integration**: Monitor career insights generation
5. **Backend Health**: Test server connectivity

## 🔍 Advanced Debugging

### Browser Developer Tools
- **Console**: Review all logged messages
- **Network**: Monitor API requests and responses
- **Application**: Check local storage and session data
- **Sources**: Set breakpoints in JavaScript code

### Server-Side Debugging
- **Uvicorn Logs**: Check server console output
- **Python Errors**: Review Python stack traces
- **API Responses**: Monitor FastAPI endpoint responses

### Performance Monitoring
- **Load Times**: Monitor script and resource loading
- **Memory Usage**: Check for memory leaks
- **API Response Times**: Monitor backend performance

## 🛠️ Troubleshooting Workflow

1. **🔍 Check Debug Console**: First line of defense
2. **📊 Run Diagnostics**: Comprehensive system check
3. **📥 Export Logs**: Save logs for detailed analysis
4. **🌐 Test API**: Verify backend connectivity
5. **📝 Review Code**: Check for obvious issues
6. **🔄 Restart System**: Clean slate if needed

## 📞 Getting Help

When reporting issues, please include:
1. **Exported debug logs** (JSON format)
2. **Browser console output**
3. **Server logs** (if applicable)
4. **Steps to reproduce** the issue
5. **Expected vs actual behavior**
6. **System information** (OS, browser, etc.)

---

**Debug mode is your friend!** Use it to understand what's happening and fix issues quickly.