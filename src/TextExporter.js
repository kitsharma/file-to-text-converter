export class TextExporter {
  generateFilename(originalName) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;
    
    // Remove extension if present
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    
    return `${nameWithoutExt}_redacted_${dateString}.txt`;
  }

  prepareExportContent(redactedText) {
    // Return only the redacted text, no metadata
    return redactedText;
  }

  exportToTxt(redactedText, originalFilename) {
    const content = this.prepareExportContent(redactedText);
    const filename = this.generateFilename(originalFilename);
    
    // Create blob with text content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    
    // Trigger download
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    // Clean up blob URL
    URL.revokeObjectURL(url);
  }
}