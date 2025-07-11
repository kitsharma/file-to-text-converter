/**
 * Simple build script to create different module formats
 * This creates CommonJS, ES Module, and UMD builds
 */

const fs = require('fs');
const path = require('path');

// Read the TypeScript file
const srcPath = path.join(__dirname, 'src', 'FileToTextConverter.ts');
const srcContent = fs.readFileSync(srcPath, 'utf8');

// Remove TypeScript-specific syntax (simplified - for production use a real transpiler)
let jsContent = srcContent
  // Remove type annotations
  .replace(/:\s*FileToTextOptions/g, '')
  .replace(/:\s*Required<FileToTextOptions>/g, '')
  .replace(/:\s*File/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*boolean/g, '')
  .replace(/:\s*number/g, '')
  .replace(/:\s*any/g, '')
  .replace(/:\s*void/g, '')
  .replace(/:\s*Promise<[^>]+>/g, '')
  .replace(/:\s*SupportedExtension/g, '')
  .replace(/:\s*Partial<[^>]+>/g, '')
  .replace(/:\s*ArrayBuffer/g, '')
  // Remove type guards and complex type syntax
  .replace(/\)\s*:\s*extension\s+is\s+\w+\s*\{/g, ') {')
  .replace(/\?\s*\./g, '.')
  .replace(/\?\s*:/g, ':')
  // Fix function return type declarations
  .replace(/\(options\?\)\s*:\s*\w+\s*\{/g, '(options) {')
  .replace(/\(options\?\)\s*:\s*FileToTextConverter/g, '(options)')
  .replace(/\(file[^)]*\)\s*:\s*Promise<[^>]+>/g, '(file, options)')
  // Remove interface and type declarations
  .replace(/export interface[\s\S]*?}/g, '')
  .replace(/type SupportedExtension[\s\S]*?;/g, '')
  // Remove 'as' type assertions
  .replace(/\s+as\s+\w+/g, '')
  .replace(/\s+as\s+any/g, '')
  // Remove generic type parameters
  .replace(/<FileToTextOptions>/g, '')
  .replace(/<string>/g, '')
  // Remove optional parameter syntax
  .replace(/(\w+)\?\s*:/g, '$1:')
  .replace(/(\w+)\?\s*\)/g, '$1)')
  // Remove readonly and other modifiers
  .replace(/readonly\s+/g, '')
  .replace(/private\s+/g, '')
  .replace(/public\s+/g, '')
  .replace(/export\s+/g, '');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// CommonJS version
const cjsContent = `"use strict";

${jsContent}

// CommonJS exports
module.exports = {
  FileToTextConverter,
  createFileToTextConverter,
  convertFileToText
};
`;

fs.writeFileSync(path.join(distDir, 'FileToTextConverter.js'), cjsContent);

// ES Module version
const esmContent = `${jsContent}

// ES Module exports
export {
  FileToTextConverter,
  createFileToTextConverter,
  convertFileToText
};
`;

fs.writeFileSync(path.join(distDir, 'FileToTextConverter.esm.js'), esmContent);

// UMD version (for script tags)
const umdContent = `(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.FileToTextConverter = {}));
})(this, (function (exports) {
  'use strict';

  ${jsContent}

  // UMD exports
  exports.FileToTextConverter = FileToTextConverter;
  exports.createFileToTextConverter = createFileToTextConverter;
  exports.convertFileToText = convertFileToText;

}));
`;

fs.writeFileSync(path.join(distDir, 'FileToTextConverter.umd.js'), umdContent);

console.log('✅ Build complete! Created:');
console.log('  - dist/FileToTextConverter.js (CommonJS)');
console.log('  - dist/FileToTextConverter.esm.js (ES Module)');
console.log('  - dist/FileToTextConverter.umd.js (UMD)');