export class FileToTextConverter {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  async convertToText(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Handle text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await this.readTextFile(file);
    }

    // Handle PDF files
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return await this.readPDFFile(file);
    }

    // Handle DOCX files
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      return await this.readDOCXFile(file);
    }

    // Handle DOC files
    if (file.type === 'application/msword' || file.name.endsWith('.doc')) {
      throw new Error('DOC format not supported. Please convert to DOCX, PDF, or TXT format.');
    }

    throw new Error(`Unsupported file format: ${file.type || 'unknown'}. Supported formats: TXT, PDF, DOCX`);
  }

  async readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async readPDFFile(file) {
    // Check if PDF.js is loaded
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js library not loaded. Please refresh the page.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const numPages = pdf.numPages;
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items into a single string
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }
      
      if (!fullText.trim()) {
        throw new Error('No text could be extracted from the PDF. The file may contain scanned images instead of text.');
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  async readDOCXFile(file) {
    // Check if JSZip is loaded
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded. Please refresh the page.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Check if it's a valid DOCX file
      const documentXml = zip.file('word/document.xml');
      if (!documentXml) {
        throw new Error('Invalid DOCX file structure');
      }
      
      // Extract the document.xml content
      const xmlContent = await documentXml.async('text');
      
      // Extract text from XML (basic extraction)
      const text = this.extractTextFromDocumentXML(xmlContent);
      
      if (!text.trim()) {
        throw new Error('No text could be extracted from the DOCX file');
      }
      
      return text.trim();
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  extractTextFromDocumentXML(xmlContent) {
    // Basic text extraction from document.xml
    // This extracts text from <w:t> tags
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    
    const extractedText = textMatches
      .map(match => {
        // Extract text between tags
        const text = match.replace(/<[^>]+>/g, '');
        return text;
      })
      .join(' ');
    
    // Clean up excessive whitespace
    return extractedText
      .replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
  }
}