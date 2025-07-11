#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class NodeFileAdapter {
  constructor(filePath) {
    const stats = fs.statSync(filePath);
    this.name = path.basename(filePath);
    this.size = stats.size;
    this.lastModified = stats.mtime.getTime();
    this.type = this.getMimeType(filePath);
    this._data = fs.readFileSync(filePath);
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  arrayBuffer() {
    return Promise.resolve(this._data.buffer.slice(
      this._data.byteOffset,
      this._data.byteOffset + this._data.byteLength
    ));
  }

  text() {
    return Promise.resolve(this._data.toString('utf8'));
  }

  slice(start, end, contentType) {
    const sliced = this._data.slice(start, end);
    const file = new NodeFileAdapter.__createMockFile();
    file._data = sliced;
    file.type = contentType || this.type;
    return file;
  }

  static __createMockFile() {
    return {
      name: '',
      size: 0,
      lastModified: 0,
      type: '',
      _data: Buffer.alloc(0),
      arrayBuffer() { return Promise.resolve(this._data.buffer); },
      text() { return Promise.resolve(this._data.toString('utf8')); }
    };
  }
}

global.File = NodeFileAdapter;
global.FileReader = class {
  readAsText(file) {
    setTimeout(() => {
      this.onload({ target: { result: file._data.toString('utf8') } });
    }, 0);
  }
  
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.onload({ target: { result: file._data.buffer } });
    }, 0);
  }
  
  abort() {}
};

global.window = {
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout
};

const { FileToTextConverter } = require('./dist/FileToTextConverter.js');

class CLITestHarness {
  constructor() {
    this.resumesDir = '/home/kitsh/projects/a-w-ai/tests/fixtures/resumes';
    this.outputDir = '/home/kitsh/projects/modules/file-to-text-converter-module/tmp';
    this.converter = new FileToTextConverter({ debug: true });
    
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runTests() {
    console.log('🔮 File-to-Text Converter CLI Test Harness');
    console.log('==========================================\n');
    
    const files = fs.readdirSync(this.resumesDir)
      .filter(file => !file.startsWith('.') && !file.endsWith('.ts'))
      .sort();
    
    console.log(`Found ${files.length} test files:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');

    const results = [];

    for (const fileName of files) {
      await this.processFile(fileName, results);
    }

    this.generateSummary(results);
  }

  async processFile(fileName, results) {
    const filePath = path.join(this.resumesDir, fileName);
    const result = {
      fileName,
      fileSize: 0,
      status: 'pending',
      error: null,
      outputFile: null,
      textLength: 0,
      duration: 0
    };

    try {
      console.log(`\n📄 Processing: ${fileName}`);
      console.log(`${'='.repeat(fileName.length + 13)}`);
      
      const startTime = Date.now();
      const file = new NodeFileAdapter(filePath);
      result.fileSize = file.size;
      
      console.log(`File size: ${file.size} bytes`);
      console.log(`File type: ${file.type}`);
      
      const text = await this.converter.convertToText(file);
      result.duration = Date.now() - startTime;
      result.textLength = text.length;
      
      const outputFileName = `${path.parse(fileName).name}.txt`;
      const outputPath = path.join(this.outputDir, outputFileName);
      
      const outputContent = `SOURCE FILE: ${fileName}
FILE SIZE: ${file.size} bytes
CONVERSION TIME: ${result.duration}ms
TEXT LENGTH: ${text.length} characters
CONVERTED AT: ${new Date().toISOString()}

${'='.repeat(50)}
EXTRACTED TEXT:
${'='.repeat(50)}

${text}`;

      fs.writeFileSync(outputPath, outputContent, 'utf8');
      
      result.status = 'success';
      result.outputFile = outputFileName;
      
      console.log(`✅ Converted successfully`);
      console.log(`   Text length: ${text.length} characters`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Output: tmp/${outputFileName}`);
      
      const preview = text.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Preview: "${preview}${text.length > 100 ? '...' : ''}"`);
      
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - (Date.now() - result.duration);
      
      console.log(`❌ Conversion failed: ${error.message}`);
      
      const errorFileName = `${path.parse(fileName).name}_ERROR.txt`;
      const errorPath = path.join(this.outputDir, errorFileName);
      const errorContent = `SOURCE FILE: ${fileName}
ERROR: ${error.message}
FAILED AT: ${new Date().toISOString()}

This file could not be converted. Possible reasons:
- Unsupported file format
- File corruption
- Missing dependencies (PDF.js, mammoth.js)
- File size exceeds limits`;

      fs.writeFileSync(errorPath, errorContent, 'utf8');
      result.outputFile = errorFileName;
    }

    results.push(result);
  }

  generateSummary(results) {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    console.log(`Total files: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
    
    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const totalTextLength = successful.reduce((sum, r) => sum + r.textLength, 0);
      console.log(`Avg conversion time: ${avgDuration.toFixed(0)}ms`);
      console.log(`Total text extracted: ${totalTextLength.toLocaleString()} characters`);
    }
    
    if (failed.length > 0) {
      console.log('\nFailed files:');
      failed.forEach(f => console.log(`  ❌ ${f.fileName}: ${f.error}`));
    }
    
    console.log(`\nAll outputs saved to: ${this.outputDir}`);
    console.log('You can review the converted files there.');
  }
}

if (require.main === module) {
  const harness = new CLITestHarness();
  harness.runTests().catch(console.error);
}

module.exports = { CLITestHarness, NodeFileAdapter };