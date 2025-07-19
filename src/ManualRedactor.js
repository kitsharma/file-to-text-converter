import { AddressDetectionService } from './AddressDetectionService.js';

export class ManualRedactor {
  constructor() {
    this.undoHistory = [];
    this.redoHistory = [];
    this.maxHistoryLength = 10;
    
    // Reuse PII patterns from PIIRedactor
    this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    this.phoneRegex = /(\(\d{3}\)\s\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10})/g;
    this.ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    
    // Initialize address detection service
    this.addressService = new AddressDetectionService();
  }

  tokenize(text) {
    const tokens = [];
    let index = 0;
    
    // More sophisticated tokenization that preserves PII and address patterns
    // First identify all PII patterns and addresses and treat them as single tokens
    const piiPatterns = [this.emailRegex, this.phoneRegex, this.ssnRegex];
    const piiMatches = [];
    
    // Add traditional PII patterns
    for (const pattern of piiPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        piiMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          type: 'traditional_pii'
        });
      }
      pattern.lastIndex = 0; // Reset regex
    }
    
    // Add address patterns
    const addresses = this.addressService.detectAddresses(text);
    for (const address of addresses) {
      piiMatches.push({
        start: address.startIndex,
        end: address.endIndex,
        text: address.originalText,
        type: 'address',
        addressType: address.type,
        confidence: address.confidence
      });
    }
    
    // Sort PII matches by position
    piiMatches.sort((a, b) => a.start - b.start);
    
    let currentPos = 0;
    
    for (const piiMatch of piiMatches) {
      // Add text before PII match
      if (currentPos < piiMatch.start) {
        const beforeText = text.slice(currentPos, piiMatch.start);
        const beforeTokens = beforeText.match(/\S+|\s+/g) || [];
        for (const token of beforeTokens) {
          tokens.push({
            text: token,
            index: index++,
            isRedacted: false,
            isAutoDetected: false
          });
        }
      }
      
      // Add PII/Address as single token with extended metadata
      tokens.push({
        text: piiMatch.text,
        index: index++,
        isRedacted: false,
        isAutoDetected: false,
        piiType: piiMatch.type,
        addressType: piiMatch.addressType,
        confidence: piiMatch.confidence
      });
      
      currentPos = piiMatch.end;
    }
    
    // Add remaining text
    if (currentPos < text.length) {
      const remainingText = text.slice(currentPos);
      const remainingTokens = remainingText.match(/\S+|\s+/g) || [];
      for (const token of remainingTokens) {
        tokens.push({
          text: token,
          index: index++,
          isRedacted: false,
          isAutoDetected: false
        });
      }
    }
    
    // If no PII found, use simple tokenization
    if (piiMatches.length === 0) {
      const matches = text.match(/\S+|\s+/g) || [];
      for (const match of matches) {
        tokens.push({
          text: match,
          index: index++,
          isRedacted: false,
          isAutoDetected: false
        });
      }
    }
    
    return tokens;
  }

  tokenizeWithAutoDetection(text) {
    const tokens = this.tokenize(text);
    
    // Mark auto-detected PII and address tokens
    for (const token of tokens) {
      if (token.piiType === 'traditional_pii') {
        // Traditional PII (email, phone, SSN)
        token.isAutoDetected = true;
      } else if (token.piiType === 'address') {
        // Address detection
        token.isAutoDetected = true;
      } else {
        // Check for any remaining PII that wasn't caught
        if (this.emailRegex.test(token.text) || 
            this.phoneRegex.test(token.text) || 
            this.ssnRegex.test(token.text)) {
          token.isAutoDetected = true;
          token.piiType = 'traditional_pii';
        }
      }
    }
    
    // Reset regex lastIndex to avoid issues with global flags
    this.emailRegex.lastIndex = 0;
    this.phoneRegex.lastIndex = 0;
    this.ssnRegex.lastIndex = 0;
    
    return tokens;
  }

  toggleRedaction(tokens, tokenIndex) {
    const newTokens = [...tokens];
    newTokens[tokenIndex] = {
      ...newTokens[tokenIndex],
      isRedacted: !newTokens[tokenIndex].isRedacted
    };
    return newTokens;
  }

  generateRedactedText(tokens) {
    return tokens.map(token => {
      if (!token.isRedacted) {
        return token.text;
      }
      
      if (token.isAutoDetected) {
        // Handle address types
        if (token.piiType === 'address') {
          switch (token.addressType) {
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
        
        // Handle traditional PII
        if (this.emailRegex.test(token.text)) {
          return '[EMAIL_REDACTED]';
        }
        if (this.phoneRegex.test(token.text)) {
          return '[PHONE_REDACTED]';
        }
        if (this.ssnRegex.test(token.text)) {
          return '[SSN_REDACTED]';
        }
      }
      
      return '[MANUAL_REDACTED]';
    }).join('');
  }

  recordAction(type, tokenIndex, oldState, newState) {
    const action = { type, tokenIndex, oldState, newState };
    
    this.undoHistory.push(action);
    if (this.undoHistory.length > this.maxHistoryLength) {
      this.undoHistory.shift();
    }
    
    // Clear redo history when new action is recorded
    this.redoHistory = [];
  }

  canUndo() {
    return this.undoHistory.length > 0;
  }

  canRedo() {
    return this.redoHistory.length > 0;
  }

  undo() {
    if (!this.canUndo()) return null;
    
    const action = this.undoHistory.pop();
    this.redoHistory.push(action);
    
    return action;
  }

  redo() {
    if (!this.canRedo()) return null;
    
    const action = this.redoHistory.pop();
    this.undoHistory.push(action);
    
    return action;
  }

  getUndoHistoryLength() {
    return this.undoHistory.length;
  }

  getVisualIndicators(tokens) {
    return tokens.map(token => {
      if (!token.isRedacted) {
        return 'none';
      }
      
      if (token.isAutoDetected) {
        if (token.piiType === 'address') {
          return 'purple';  // address-specific indicator
        }
        return 'red';  // traditional PII auto-detected
      }
      
      return 'orange'; // manual
    });
  }
}