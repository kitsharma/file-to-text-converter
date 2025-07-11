/**
 * FileToTextConverter - Client-side file to text conversion module
 * 
 * This module handles converting various file types to plain text in the browser.
 * All processing happens client-side without any server communication.
 * 
 * @module FileToTextConverter
 */

/**
 * Options for file conversion
 */
export interface FileToTextOptions {
  /** Enable debug logging to console */
  debug?: boolean;
  /** Maximum file size in bytes (default: 50MB) */
  maxSizeBytes?: number;
  /** Timeout in milliseconds for file reading (default: 30000ms) */
  timeout?: number;
}

/**
 * Supported file extensions
 */
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.pdf', '.docx', '.doc'] as const;
type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Default options for file conversion
 */
const DEFAULT_OPTIONS: Required<FileToTextOptions> = {
  debug: false,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  timeout: 30000 // 30 seconds
};

/**
 * FileToTextConverter class
 * 
 * Converts various file types to plain text in the browser.
 * 
 * @example
 * ```typescript
 * // Step 1: Import the converter
 * import { FileToTextConverter } from './FileToTextConverter';
 * 
 * // Step 2: Create an instance
 * const converter = new FileToTextConverter();
 * 
 * // Step 3: Get a File object (e.g., from an input element)
 * const fileInput = document.getElementById('fileInput') as HTMLInputElement;
 * const file = fileInput.files[0];
 * 
 * // Step 4: Convert the file to text
 * try {
 *   const text = await converter.convertToText(file, { debug: true });
 *   console.log('Extracted text:', text);
 *   // The 'text' variable now contains the plain text content
 * } catch (error) {
 *   console.error('Conversion failed:', error);
 * }
 * ```
 */
export class FileToTextConverter {
  private options: Required<FileToTextOptions>;

  constructor(defaultOptions?: Partial<FileToTextOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...defaultOptions };
  }

  /**
   * Converts a File object to plain text
   * 
   * @param file - The File object to convert
   * @param options - Optional conversion options
   * @returns Promise that resolves to the plain text content of the file
   * 
   * @throws {TypeError} If input is not a valid File object
   * @throws {Error} If file type is unsupported
   * @throws {Error} If file size exceeds maximum
   * @throws {Error} If file reading fails or times out
   * 
   * @example
   * ```typescript
   * // Basic usage - convert a text file
   * const text = await converter.convertToText(myFile);
   * 
   * // With debug logging enabled
   * const text = await converter.convertToText(myFile, { debug: true });
   * 
   * // Access the returned text
   * console.log(text); // This is the extracted plain text content
   * document.getElementById('output').textContent = text;
   * ```
   */
  public async convertToText(file: File, options?: Partial<FileToTextOptions>): Promise<string> {
    const opts = { ...this.options, ...options };
    const startTime = Date.now();

    try {
      // Validate input
      this.validateFile(file, opts);

      // Get file extension
      const extension = this.getFileExtension(file.name);
      
      if (opts.debug) {
        console.log(`[FileToTextConverter] Starting conversion for: ${file.name}`);
        console.log(`[FileToTextConverter] File size: ${file.size} bytes`);
        console.log(`[FileToTextConverter] File type: ${file.type}`);
        console.log(`[FileToTextConverter] Last modified: ${new Date(file.lastModified).toISOString()}`);
        console.log(`[FileToTextConverter] Detected extension: ${extension}`);
      }

      // Check if extension is supported
      if (!this.isSupportedExtension(extension)) {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      // Convert based on file type
      let result: string;
      
      switch (extension.toLowerCase()) {
        case '.pdf':
          result = await this.convertPDF(file, opts);
          break;
        case '.docx':
        case '.doc':
          result = await this.convertWord(file, opts);
          break;
        default:
          // Text-based files (txt, md, csv, json)
          result = await this.readTextFile(file, opts);
      }

      if (opts.debug) {
        const duration = Date.now() - startTime;
        console.log(`[FileToTextConverter] Conversion completed in ${duration}ms`);
        console.log(`[FileToTextConverter] Output length: ${result.length} characters`);
      }

      return result;

    } catch (error) {
      if (opts.debug) {
        console.error('[FileToTextConverter] Conversion failed:', error);
      }
      throw error;
    }
  }

  /**
   * Validates the input file
   */
  private validateFile(file: any, opts: Required<FileToTextOptions>): void {
    // Check if input is null or undefined
    if (file === null || file === undefined) {
      throw new TypeError('File cannot be null or undefined');
    }

    // Check if input is a File object
    if (!(file instanceof File)) {
      throw new TypeError('Input must be a File object');
    }

    // Check file size
    if (file.size > opts.maxSizeBytes) {
      throw new Error(`File size (${file.size} bytes) exceeds maximum allowed size (${opts.maxSizeBytes} bytes)`);
    }

    // Warn for large files
    if (opts.debug && file.size > 10 * 1024 * 1024) { // 10MB
      console.warn(`[FileToTextConverter] Large file detected: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * Extracts file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      throw new Error('No file extension found');
    }

    return filename.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Checks if file extension is supported
   */
  private isSupportedExtension(extension: string): extension is SupportedExtension {
    return SUPPORTED_EXTENSIONS.includes(extension.toLowerCase() as any);
  }

  /**
   * Reads text-based files (txt, md, csv, json)
   */
  private readTextFile(file: File, opts: Required<FileToTextOptions>): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let timeoutId: number;

      // Set up timeout
      timeoutId = window.setTimeout(() => {
        reader.abort();
        reject(new Error(`File reading timed out after ${opts.timeout}ms`));
      }, opts.timeout);

      reader.onload = (event) => {
        clearTimeout(timeoutId);
        const result = event.target?.result;
        
        if (typeof result !== 'string') {
          reject(new Error('Failed to read file as text'));
          return;
        }

        // Remove BOM if present
        const text = result.replace(/^\ufeff/, '');
        
        if (opts.debug) {
          console.log(`[FileToTextConverter] Successfully read text file: ${file.name}`);
        }

        resolve(text);
      };

      reader.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };

      reader.onabort = () => {
        clearTimeout(timeoutId);
        reject(new Error('File reading was aborted'));
      };

      // Start reading
      reader.readAsText(file);
    });
  }

  /**
   * Converts PDF files to text
   * Note: Uses PDF.js library which must be loaded separately
   */
  private async convertPDF(file: File, opts: Required<FileToTextOptions>): Promise<string> {
    // Check if PDF.js is available
    if (typeof (window as any).pdfjsLib === 'undefined') {
      throw new Error('PDF.js library is not loaded. Please include PDF.js before using PDF conversion.');
    }

    const pdfjsLib = (window as any).pdfjsLib;

    try {
      if (opts.debug) {
        console.log('[FileToTextConverter] Converting PDF using PDF.js');
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file, opts);
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      if (opts.debug) {
        console.log(`[FileToTextConverter] PDF loaded: ${pdf.numPages} pages`);
      }

      let fullText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Concatenate text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }

      return fullText.trim();

    } catch (error) {
      throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Converts Word documents to text
   * Note: Uses mammoth.js library which must be loaded separately
   */
  private async convertWord(file: File, opts: Required<FileToTextOptions>): Promise<string> {
    // Check if mammoth is available
    if (typeof (window as any).mammoth === 'undefined') {
      throw new Error('mammoth.js library is not loaded. Please include mammoth.js before using Word document conversion.');
    }

    const mammoth = (window as any).mammoth;

    try {
      if (opts.debug) {
        console.log('[FileToTextConverter] Converting Word document using mammoth.js');
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file, opts);
      
      // Convert to text
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages && result.messages.length > 0 && opts.debug) {
        console.warn('[FileToTextConverter] Conversion messages:', result.messages);
      }

      return result.value || '';

    } catch (error) {
      throw new Error(`Word document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reads file as ArrayBuffer (for binary files like PDF and Word)
   */
  private readFileAsArrayBuffer(file: File, opts: Required<FileToTextOptions>): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let timeoutId: number;

      // Set up timeout
      timeoutId = window.setTimeout(() => {
        reader.abort();
        reject(new Error(`File reading timed out after ${opts.timeout}ms`));
      }, opts.timeout);

      reader.onload = (event) => {
        clearTimeout(timeoutId);
        const result = event.target?.result;
        
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error('Failed to read file as ArrayBuffer'));
          return;
        }

        resolve(result);
      };

      reader.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };

      reader.onabort = () => {
        clearTimeout(timeoutId);
        reject(new Error('File reading was aborted'));
      };

      // Start reading
      reader.readAsArrayBuffer(file);
    });
  }
}

/**
 * Factory function for creating a FileToTextConverter instance
 * 
 * @param options - Optional default options
 * @returns New FileToTextConverter instance
 * 
 * @example
 * ```typescript
 * // Create converter with custom defaults
 * const converter = createFileToTextConverter({ debug: true });
 * 
 * // Convert a file
 * const text = await converter.convertToText(myFile);
 * ```
 */
export function createFileToTextConverter(options?: Partial<FileToTextOptions>): FileToTextConverter {
  return new FileToTextConverter(options);
}

/**
 * Convenience function for one-off conversions
 * 
 * @param file - The File object to convert
 * @param options - Optional conversion options
 * @returns Promise that resolves to the plain text content
 * 
 * @example
 * ```typescript
 * // Quick conversion without creating an instance
 * const text = await convertFileToText(myFile, { debug: true });
 * console.log('Extracted text:', text);
 * ```
 */
export async function convertFileToText(file: File, options?: Partial<FileToTextOptions>): Promise<string> {
  const converter = new FileToTextConverter();
  return converter.convertToText(file, options);
}