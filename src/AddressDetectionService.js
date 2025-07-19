export class AddressDetectionService {
  constructor() {
    this.initializePatterns();
    this.initializeStandardizations();
  }

  initializePatterns() {
    // Simplified patterns to avoid infinite loops
    this.streetTypes = ['Street', 'St', 'Avenue', 'Ave', 'Boulevard', 'Blvd', 'Drive', 'Dr', 'Lane', 'Ln', 'Road', 'Rd'];
    this.states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    this.statesFull = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia'];
    
    // Simple, reliable patterns - updated to handle units
    this.fullAddressPattern = /(\d{1,5}[A-Z]?(?:-\d{1,5})?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Court|Ct|Place|Pl|Way)(?:\s+(Apt|Unit|Suite|Ste|#)\s*([A-Za-z0-9-]+))?,?\s*([A-Za-z\s]+),?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/g;
    this.poBoxPattern = /(P\.?O\.?\s+Box|Post\s+Office\s+Box|PMB)\s+(\d+)/gi;
    this.streetOnlyPattern = /(\d{1,5}[A-Z]?(?:-\d{1,5})?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd)/g;
    this.cityStatePattern = /\b([A-Za-z]+(?:\s+[A-Za-z]+)*),\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g;
    // More specific pattern for city names - exclude prepositions
    this.cityOnlyPattern = /\b([A-Za-z]+(?:\s+[A-Za-z]+)*),\s+(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/g;
    this.zipPattern = /\b(\d{5}(?:-\d{4})?)\b/g;
    this.countries = ['United Kingdom', 'UK', 'Canada', 'Germany', 'France', 'Japan'];
    this.ukPostalPattern = /\b([A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2})\b/g;
    this.canadianPostalPattern = /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/g;
  }

  initializeStandardizations() {
    this.streetTypeStandardization = {
      'St': 'Street', 'Ave': 'Avenue', 'Blvd': 'Boulevard', 'Dr': 'Drive',
      'Ln': 'Lane', 'Rd': 'Road', 'Ct': 'Court', 'Pl': 'Place'
    };
  }

  detectAddresses(text) {
    if (text === null || text === undefined) {
      throw new Error('Input text cannot be null or undefined');
    }

    if (text === '') {
      return [];
    }

    const results = [];
    
    // Detect full US addresses
    results.push(...this.detectFullUSAddresses(text));
    
    // Detect PO Boxes
    results.push(...this.detectPOBoxes(text));
    
    // Detect international addresses (before partial to give priority)
    results.push(...this.detectInternationalAddresses(text));
    
    // Detect partial addresses (only if no overlapping full/international addresses)
    const partialResults = this.detectPartialAddresses(text);
    for (const partial of partialResults) {
      const hasOverlap = results.some(existing => this.isOverlapping(partial, existing));
      if (!hasOverlap) {
        results.push(partial);
      }
    }
    
    return this.deduplicateAndSort(results);
  }

  detectFullUSAddresses(text) {
    const results = [];
    this.fullAddressPattern.lastIndex = 0;
    
    let match;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    
    while ((match = this.fullAddressPattern.exec(text)) !== null && iterations < maxIterations) {
      iterations++;
      
      const fullMatch = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      
      if (this.looksLikePhoneOrSSN(fullMatch)) {
        continue;
      }
      
      const components = {
        streetNumber: match[1],
        streetName: match[2],
        streetType: match[3],
        streetTypeStandardized: this.standardizeStreetType(match[3]),
        city: match[6],
        state: match[7],
        zipCode: match[8]
      };
      
      // Add unit if present
      if (match[4] && match[5]) {
        components.unit = `${match[4]} ${match[5]}`;
      }
      
      results.push({
        type: 'full_address',
        originalText: fullMatch,
        startIndex,
        endIndex,
        components,
        confidence: this.calculateConfidence('full_address', components)
      });
    }
    
    return results;
  }

  detectPOBoxes(text) {
    const results = [];
    this.poBoxPattern.lastIndex = 0;
    
    let match;
    let iterations = 0;
    const maxIterations = 100;
    
    while ((match = this.poBoxPattern.exec(text)) !== null && iterations < maxIterations) {
      iterations++;
      
      const fullMatch = match[0];
      const poBoxNumber = match[2];
      const startIndex = match.index;
      
      // Look for city, state, zip after PO Box
      const remainingText = text.slice(match.index + fullMatch.length);
      const cityStateZip = this.extractCityStateZip(remainingText);
      
      const components = {
        poBox: poBoxNumber,
        ...cityStateZip
      };
      
      let originalText = fullMatch;
      let endIndex = startIndex + fullMatch.length;
      
      if (cityStateZip.city) {
        const cityMatch = remainingText.match(new RegExp(`^[,\\s]*${cityStateZip.city}[,\\s]*${cityStateZip.state}\\s+${cityStateZip.zipCode}`));
        if (cityMatch) {
          originalText += cityMatch[0];
          endIndex += cityMatch[0].length;
        }
      }
      
      results.push({
        type: 'po_box',
        originalText: originalText.trim(),
        startIndex,
        endIndex,
        components,
        confidence: this.calculateConfidence('po_box', components)
      });
    }
    
    return results;
  }

  detectPartialAddresses(text) {
    const results = [];
    
    // Street-only addresses
    this.streetOnlyPattern.lastIndex = 0;
    let match;
    let iterations = 0;
    
    while ((match = this.streetOnlyPattern.exec(text)) !== null && iterations < 100) {
      iterations++;
      
      if (this.looksLikePhoneOrSSN(match[0])) continue;
      
      const components = {
        streetNumber: match[1],
        streetName: match[2],
        streetType: match[3],
        streetTypeStandardized: this.standardizeStreetType(match[3])
      };
      
      results.push({
        type: 'partial_address',
        originalText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        components,
        confidence: this.calculateConfidence('partial_address', components)
      });
    }
    
    // City, state combinations (abbreviations)
    this.cityStatePattern.lastIndex = 0;
    iterations = 0;
    
    while ((match = this.cityStatePattern.exec(text)) !== null && iterations < 100) {
      iterations++;
      
      // Clean city name of prepositions
      const cityName = match[1].trim();
      const cleanCity = cityName.replace(/^(from|in|at|to|the|a|an)\s+/i, '');
      
      const components = {
        city: cleanCity,
        state: match[2]
      };
      
      results.push({
        type: 'partial_address',
        originalText: `${cleanCity}, ${match[2]}`,
        startIndex: match.index + (cityName.length - cleanCity.length),
        endIndex: match.index + match[0].length,
        components,
        confidence: this.calculateConfidence('partial_address', components)
      });
    }
    
    // City, state combinations (full state names)
    this.cityOnlyPattern.lastIndex = 0;
    iterations = 0;
    
    while ((match = this.cityOnlyPattern.exec(text)) !== null && iterations < 100) {
      iterations++;
      
      // Filter out common prepositions and articles
      const cityName = match[1].trim();
      const cleanCity = cityName.replace(/^(from|in|at|to|the|a|an)\s+/i, '');
      
      const components = {
        city: cleanCity,
        state: match[2]
      };
      
      results.push({
        type: 'partial_address',
        originalText: `${cleanCity}, ${match[2]}`,
        startIndex: match.index + (cityName.length - cleanCity.length),
        endIndex: match.index + match[0].length,
        components,
        confidence: this.calculateConfidence('partial_address', components)
      });
    }
    
    // Standalone ZIP codes with context
    this.zipPattern.lastIndex = 0;
    iterations = 0;
    
    while ((match = this.zipPattern.exec(text)) !== null && iterations < 100) {
      iterations++;
      
      const before = text.slice(Math.max(0, match.index - 10), match.index);
      if (/zip\s*code/i.test(before)) {
        const components = { zipCode: match[1] };
        
        results.push({
          type: 'partial_address',
          originalText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          components,
          confidence: this.calculateConfidence('partial_address', components)
        });
      }
    }
    
    return results;
  }

  detectInternationalAddresses(text) {
    const results = [];
    
    for (const country of this.countries) {
      const countryPattern = new RegExp(`\\b${country}\\b`, 'gi');
      let match;
      
      while ((match = countryPattern.exec(text)) !== null) {
        const startPos = Math.max(0, match.index - 100);
        const context = text.slice(startPos, match.index + match[0].length);
        
        const addressComponents = this.parseInternationalAddress(context, country);
        
        if (addressComponents.hasAddressIndicators) {
          results.push({
            type: 'international_address',
            originalText: context.trim(),
            startIndex: startPos,
            endIndex: match.index + match[0].length,
            components: addressComponents,
            confidence: this.calculateConfidence('international_address', addressComponents)
          });
        }
      }
    }
    
    return results;
  }

  parseInternationalAddress(context, country) {
    const components = { country };
    let hasAddressIndicators = false;
    
    // Check for postal codes with better patterns
    if (country.toLowerCase().includes('uk') || country.toLowerCase().includes('kingdom')) {
      // UK postal code: SW1A 2AA format
      const ukMatch = context.match(/\b([A-Z]{1,2}\d[A-Z0-9]?\s\d[A-Z]{2})\b/);
      if (ukMatch) {
        components.postalCode = ukMatch[1];
        hasAddressIndicators = true;
      }
    }
    
    if (country.toLowerCase().includes('canada')) {
      // Canadian postal code: M5V 3A8 format
      const canMatch = context.match(/\b([A-Z]\d[A-Z]\s\d[A-Z]\d)\b/);
      if (canMatch) {
        components.postalCode = canMatch[1];
        hasAddressIndicators = true;
      }
    }
    
    // Look for street numbers
    if (/\b\d{1,5}[A-Z]?\b/.test(context)) {
      hasAddressIndicators = true;
    }
    
    // Look for street indicators
    if (/\b(street|avenue|road|way|lane)\b/i.test(context)) {
      hasAddressIndicators = true;
    }
    
    components.hasAddressIndicators = hasAddressIndicators;
    return components;
  }

  extractCityStateZip(text) {
    const match = text.match(/^[,\s]*([A-Za-z\s]+?)[,\s]+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+(\d{5}(?:-\d{4})?)/);
    
    if (match) {
      return {
        city: match[1].trim(),
        state: match[2],
        zipCode: match[3]
      };
    }
    
    return {};
  }

  standardizeStreetType(streetType) {
    return this.streetTypeStandardization[streetType] || streetType;
  }

  calculateConfidence(type, components) {
    let confidence = 0;
    
    switch (type) {
      case 'full_address':
        confidence = 0.6;
        if (components.streetNumber) confidence += 0.1;
        if (components.streetName) confidence += 0.1;
        if (components.streetType) confidence += 0.1;
        if (components.city) confidence += 0.05;
        if (components.state) confidence += 0.05;
        if (components.zipCode) confidence += 0.1;
        break;
        
      case 'po_box':
        confidence = 0.7;
        if (components.city) confidence += 0.1;
        if (components.state) confidence += 0.05;
        if (components.zipCode) confidence += 0.05;
        break;
        
      case 'partial_address':
        confidence = 0.3;
        if (components.streetNumber) confidence += 0.2;
        if (components.streetName) confidence += 0.1;
        if (components.streetType) confidence += 0.1;
        if (components.city) confidence += 0.1;
        if (components.state) confidence += 0.1;
        if (components.zipCode) confidence += 0.1;
        break;
        
      case 'international_address':
        confidence = 0.4;
        if (components.postalCode) confidence += 0.3;
        if (components.country) confidence += 0.1;
        break;
    }
    
    return Math.min(confidence, 1.0);
  }

  looksLikePhoneOrSSN(text) {
    if (/\b\d{3}-\d{3}-\d{4}\b/.test(text)) return true;
    if (/\(\d{3}\)\s?\d{3}-?\d{4}/.test(text)) return true;
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) return true;
    if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text)) return true;
    return false;
  }

  deduplicateAndSort(results) {
    const filtered = [];
    
    for (const result of results) {
      const overlapping = filtered.find(existing => this.isOverlapping(result, existing));
      
      if (overlapping) {
        if (result.confidence > overlapping.confidence) {
          const index = filtered.indexOf(overlapping);
          filtered[index] = result;
        }
      } else {
        filtered.push(result);
      }
    }
    
    return filtered.sort((a, b) => b.confidence - a.confidence);
  }

  isOverlapping(result1, result2) {
    return !(result1.endIndex <= result2.startIndex || result2.endIndex <= result1.startIndex);
  }
}