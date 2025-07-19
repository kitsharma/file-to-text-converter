import { AddressDetectionService } from './AddressDetectionService.js';

export class PIIRedactor {
  constructor() {
    // US format regex patterns as specified
    this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    this.phoneRegex = /(\(\d{3}\)\s\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10})/g;
    this.ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    
    // Initialize address detection service
    this.addressService = new AddressDetectionService();
  }

  redact(text) {
    let redactedText = text;
    
    // Replace emails
    redactedText = redactedText.replace(this.emailRegex, '[EMAIL_REDACTED]');
    
    // Replace phone numbers
    redactedText = redactedText.replace(this.phoneRegex, '[PHONE_REDACTED]');
    
    // Replace SSNs
    redactedText = redactedText.replace(this.ssnRegex, '[SSN_REDACTED]');
    
    // Replace addresses
    redactedText = this.redactAddresses(redactedText);
    
    return redactedText;
  }

  redactAddresses(text) {
    const addresses = this.addressService.detectAddresses(text);
    let redactedText = text;
    
    // Sort addresses by start index in reverse order to avoid index shifting
    addresses.sort((a, b) => b.startIndex - a.startIndex);
    
    for (const address of addresses) {
      const replacement = this.getAddressReplacementTag(address.type);
      redactedText = redactedText.slice(0, address.startIndex) + 
                   replacement + 
                   redactedText.slice(address.endIndex);
    }
    
    return redactedText;
  }

  getAddressReplacementTag(addressType) {
    switch (addressType) {
      case 'full_address':
        return '[ADDRESS_REDACTED]';
      case 'partial_address':
        return '[PARTIAL_ADDRESS_REDACTED]';
      case 'po_box':
        return '[PO_BOX_REDACTED]';
      case 'international_address':
        return '[INTERNATIONAL_ADDRESS_REDACTED]';
      default:
        return '[ADDRESS_REDACTED]';
    }
  }

  // Method to get detected addresses for manual redaction
  getDetectedAddresses(text) {
    return this.addressService.detectAddresses(text);
  }
}