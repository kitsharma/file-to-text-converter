# File to Text Converter

A lightweight, client-side module for converting various file types to plain text in the browser. No server required!

## Features

- 🌐 **100% Client-side** - All processing happens in the browser
- 📄 **Multiple formats** - Supports TXT, MD, CSV, JSON, PDF, DOCX, DOC
- 🚀 **Zero dependencies** - Uses native browser APIs (external libs only for PDF/Word)
- 🛡️ **Type-safe** - Full TypeScript support
- 🐛 **Debug mode** - Built-in logging for troubleshooting
- ⚡ **Lightweight** - Small bundle size
- 🧪 **Well-tested** - Comprehensive test suite

## Installation

### Option 1: NPM Package (if published)
```bash
npm install file-to-text-converter
```

### Option 2: Direct Usage
1. Download and extract the module
2. Copy the `dist` folder to your project
3. Import the module:

```javascript
// ES6 Modules
import { convertFileToText } from './file-to-text-converter/dist/FileToTextConverter.esm.js';

// CommonJS
const { convertFileToText } = require('./file-to-text-converter/dist/FileToTextConverter.js');

// Script tag
<script src="./file-to-text-converter/dist/FileToTextConverter.umd.js"></script>
```

## Quick Start

```javascript
// HTML
<input type="file" id="fileInput" accept=".txt,.md,.csv,.json,.pdf,.docx,.doc">

// JavaScript
import { convertFileToText } from 'file-to-text-converter';

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  
  try {
    const text = await convertFileToText(file);
    console.log('Extracted text:', text);
  } catch (error) {
    console.error('Conversion failed:', error.message);
  }
});
```

## API Reference

### Main Functions

#### `convertFileToText(file, options?)`
Converts a file to plain text.

**Parameters:**
- `file: File` - The File object to convert
- `options?: FileToTextOptions` - Optional configuration

**Returns:** `Promise<string>` - The extracted text content

**Example:**
```javascript
const text = await convertFileToText(myFile, { debug: true });
```

#### `new FileToTextConverter(options?)`
Creates a converter instance with default options.

**Example:**
```javascript
const converter = new FileToTextConverter({ debug: true });
const text = await converter.convertToText(myFile);
```

### Options

```typescript
interface FileToTextOptions {
  debug?: boolean;        // Enable console logging (default: false)
  maxSizeBytes?: number;  // Maximum file size in bytes (default: 50MB)
  timeout?: number;       // Read timeout in milliseconds (default: 30000)
}
```

## Supported File Types

| Extension | File Type | Notes |
|-----------|-----------|--------|
| `.txt` | Plain text | Direct text extraction |
| `.md`, `.markdown` | Markdown | Returns raw markdown |
| `.csv` | CSV | Returns raw CSV with delimiters |
| `.json` | JSON | Returns stringified JSON |
| `.pdf` | PDF | Requires PDF.js library |
| `.docx`, `.doc` | Word | Requires mammoth.js library |

## External Dependencies

For PDF and Word files, you'll need to include these libraries:

```html
<!-- For PDF support -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
</script>

<!-- For Word document support -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
```

## Usage Examples

### Basic File Upload
```javascript
async function handleFileUpload(file) {
  try {
    const text = await convertFileToText(file);
    document.getElementById('output').textContent = text;
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}
```

### With Debug Logging
```javascript
const text = await convertFileToText(file, { debug: true });
// Console will show:
// [FileToTextConverter] Starting conversion for: document.pdf
// [FileToTextConverter] File size: 102400 bytes
// [FileToTextConverter] Detected extension: .pdf
// ...
```

### Batch Processing
```javascript
async function processMultipleFiles(files) {
  const results = await Promise.all(
    Array.from(files).map(async (file) => {
      try {
        const text = await convertFileToText(file);
        return { name: file.name, text, success: true };
      } catch (error) {
        return { name: file.name, error: error.message, success: false };
      }
    })
  );
  
  return results;
}
```

### With File Size Limit
```javascript
const converter = new FileToTextConverter({
  maxSizeBytes: 10 * 1024 * 1024, // 10MB limit
  debug: true
});

try {
  const text = await converter.convertToText(file);
} catch (error) {
  if (error.message.includes('exceeds maximum')) {
    alert('File is too large! Please select a file under 10MB.');
  }
}
```

## Error Handling

The module throws specific errors for different scenarios:

```javascript
try {
  const text = await convertFileToText(file);
} catch (error) {
  if (error instanceof TypeError) {
    // Invalid input (null, undefined, not a File)
    console.error('Invalid file input');
  } else if (error.message.includes('Unsupported file type')) {
    // File type not supported
    console.error('Please upload a supported file type');
  } else if (error.message.includes('exceeds maximum')) {
    // File too large
    console.error('File size exceeds limit');
  } else if (error.message.includes('PDF.js library is not loaded')) {
    // Missing PDF.js for PDF files
    console.error('PDF support not available');
  } else {
    // Other errors
    console.error('Conversion failed:', error.message);
  }
}
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { 
  FileToTextConverter, 
  FileToTextOptions,
  convertFileToText 
} from 'file-to-text-converter';

const options: FileToTextOptions = {
  debug: true,
  maxSizeBytes: 25 * 1024 * 1024,
  timeout: 60000
};

const converter = new FileToTextConverter(options);
```

## Browser Compatibility

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Important Notes

1. **No PII Processing**: This module only extracts text. It does NOT perform any PII detection or redaction.
2. **Client-side Only**: All processing happens in the browser. Files are never sent to a server.
3. **Memory Considerations**: Large files are processed in memory. Consider the user's device capabilities.

## License

MIT License - feel free to use in personal and commercial projects.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Changelog

### 1.0.0
- Initial release
- Support for TXT, MD, CSV, JSON, PDF, DOCX, DOC
- Debug mode
- Comprehensive error handling
- TypeScript support