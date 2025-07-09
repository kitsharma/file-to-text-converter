class CareerFocusedPIIDetector {
    constructor() {
        this.patterns = {
            // Personal identifiers to redact
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
            ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
            linkedinProfile: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/gi,
            githubProfile: /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/gi,
            
            // Address patterns - more precise to avoid false positives
            streetAddress: /\b\d+\s+[A-Za-z0-9\s,#.-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way|Pkwy|Parkway)\b/gi,
            zipCode: /\b\d{5}(?:-\d{4})?\b/g,
            
            // Names - enhanced detection with context awareness
            personName: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]*)*\s+[A-Z][a-z]+\b/g,
            
            // Date of birth patterns
            dateOfBirth: /\b(?:DOB|Date of Birth|Born)[\s:]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
            
            // Security numbers and IDs
            driverLicense: /\b(?:DL|License|Driver.s?\s*License)[\s#:]*[A-Z0-9]+\b/gi
        };

        // Career-relevant terms to preserve
        this.careerTerms = new Set([
            // Job titles
            'engineer', 'developer', 'manager', 'director', 'analyst', 'consultant', 'specialist',
            'coordinator', 'administrator', 'assistant', 'supervisor', 'lead', 'senior', 'junior',
            'intern', 'executive', 'officer', 'president', 'vice', 'chief', 'head', 'principal',
            'architect', 'designer', 'scientist', 'researcher', 'technician', 'representative',
            
            // Skills and technologies
            'javascript', 'python', 'java', 'react', 'angular', 'node', 'sql', 'aws', 'azure',
            'docker', 'kubernetes', 'git', 'agile', 'scrum', 'project', 'management', 'leadership',
            'communication', 'analysis', 'problem', 'solving', 'teamwork', 'collaboration',
            
            // Industries and domains
            'software', 'technology', 'healthcare', 'finance', 'education', 'marketing', 'sales',
            'operations', 'human', 'resources', 'accounting', 'legal', 'consulting', 'engineering',
            'manufacturing', 'retail', 'hospitality', 'transportation', 'logistics', 'media',
            
            // Education terms
            'university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd', 'mba',
            'certification', 'course', 'training', 'bootcamp', 'program', 'diploma',
            
            // Company indicators (preserve company names)
            'inc', 'llc', 'corp', 'corporation', 'company', 'ltd', 'limited', 'group',
            'solutions', 'systems', 'technologies', 'services', 'consulting', 'partners'
        ]);

        // Common first/last names to help identify personal names
        this.commonNames = new Set([
            'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
            'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark',
            'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian',
            'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob',
            'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott',
            'brandon', 'benjamin', 'samuel', 'gregory', 'alexander', 'patrick', 'frank',
            'raymond', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'henry',
            'adam', 'douglas', 'nathaniel', 'peter', 'zachary', 'kyle', 'noah', 'alan',
            'ethan', 'jeremy', 'lionel', 'mike', 'tom', 'bill', 'bob', 'joe', 'chris',
            
            // Common last names
            'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
            'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson',
            'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson',
            'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker',
            'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill',
            'flores', 'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell'
        ]);

        // Cities and states (preserve location context but redact specific addresses)
        this.locations = new Set([
            'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
            'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
            'california', 'texas', 'florida', 'new york', 'pennsylvania', 'illinois',
            'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
            'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri'
        ]);
    }

    detectPII(text) {
        const detections = [];
        const confidenceThreshold = 0.7;

        // Detect emails
        this.findMatches(text, this.patterns.email, 'email', 0.95).forEach(match => {
            detections.push(match);
        });

        // Detect phone numbers
        this.findMatches(text, this.patterns.phone, 'phone', 0.9).forEach(match => {
            detections.push(match);
        });

        // Detect SSN
        this.findMatches(text, this.patterns.ssn, 'ssn', 0.95).forEach(match => {
            detections.push(match);
        });

        // Detect LinkedIn profiles
        this.findMatches(text, this.patterns.linkedinProfile, 'linkedin', 0.9).forEach(match => {
            detections.push(match);
        });

        // Detect GitHub profiles
        this.findMatches(text, this.patterns.githubProfile, 'github', 0.85).forEach(match => {
            detections.push(match);
        });

        // Detect street addresses
        this.findMatches(text, this.patterns.streetAddress, 'address', 0.8).forEach(match => {
            detections.push(match);
        });

        // Detect ZIP codes
        this.findMatches(text, this.patterns.zipCode, 'zipcode', 0.85).forEach(match => {
            detections.push(match);
        });

        // Detect names with career context awareness
        this.detectNames(text).forEach(match => {
            if (match.confidence >= confidenceThreshold) {
                detections.push(match);
            }
        });

        // Detect dates of birth
        this.findMatches(text, this.patterns.dateOfBirth, 'dateOfBirth', 0.9).forEach(match => {
            detections.push(match);
        });

        // Sort by start position and merge overlapping detections
        return this.mergeOverlappingDetections(detections.sort((a, b) => a.start - b.start));
    }

    findMatches(text, pattern, type, confidence) {
        const matches = [];
        let match;
        
        // Reset pattern lastIndex to ensure we start from the beginning
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(text)) !== null) {
            matches.push({
                type,
                value: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence,
                context: this.getContext(text, match.index, match[0].length)
            });
            
            // Prevent infinite loop for global patterns
            if (!pattern.global) break;
        }
        
        return matches;
    }

    detectNames(text) {
        const nameMatches = [];
        const words = text.split(/\s+/);
        
        for (let i = 0; i < words.length - 1; i++) {
            const currentWord = words[i].replace(/[^\w]/g, '').toLowerCase();
            const nextWord = words[i + 1].replace(/[^\w]/g, '').toLowerCase();
            
            // Skip if words are too short or contain numbers
            if (currentWord.length < 2 || nextWord.length < 2 || 
                /\d/.test(currentWord) || /\d/.test(nextWord)) {
                continue;
            }
            
            // Check if this could be a name
            const isLikelyName = this.isLikelyPersonName(currentWord, nextWord, text, i);
            
            if (isLikelyName.isName) {
                const fullName = words[i] + ' ' + words[i + 1];
                const startIndex = text.indexOf(fullName, i > 0 ? text.indexOf(words[i-1]) : 0);
                
                if (startIndex !== -1) {
                    nameMatches.push({
                        type: 'name',
                        value: fullName,
                        start: startIndex,
                        end: startIndex + fullName.length,
                        confidence: isLikelyName.confidence,
                        context: this.getContext(text, startIndex, fullName.length)
                    });
                }
            }
        }
        
        return nameMatches;
    }

    isLikelyPersonName(firstName, lastName, text, wordIndex) {
        let confidence = 0.3; // Base confidence
        
        // Check if words are in common names list
        if (this.commonNames.has(firstName)) confidence += 0.3;
        if (this.commonNames.has(lastName)) confidence += 0.2;
        
        // Check capitalization pattern
        const firstWordInText = text.split(/\s+/)[wordIndex];
        const secondWordInText = text.split(/\s+/)[wordIndex + 1];
        
        if (/^[A-Z][a-z]+$/.test(firstWordInText) && /^[A-Z][a-z]+$/.test(secondWordInText)) {
            confidence += 0.2;
        }
        
        // Check context - reduce confidence if in career context
        const context = this.getContext(text, 0, 0, wordIndex, 5).toLowerCase();
        
        // Reduce confidence if surrounded by career terms
        const careerTermsInContext = Array.from(this.careerTerms).filter(term => 
            context.includes(term)
        ).length;
        
        if (careerTermsInContext > 2) {
            confidence -= 0.3;
        }
        
        // Check if it's likely a company name
        if (this.isLikelyCompanyName(firstName + ' ' + lastName)) {
            confidence -= 0.4;
        }
        
        // Check for location context
        if (this.locations.has(firstName.toLowerCase()) || this.locations.has(lastName.toLowerCase())) {
            confidence -= 0.2;
        }
        
        return {
            isName: confidence > 0.5,
            confidence: Math.min(0.95, Math.max(0.1, confidence))
        };
    }

    isLikelyCompanyName(text) {
        const companyIndicators = ['inc', 'llc', 'corp', 'ltd', 'company', 'group', 'solutions', 'systems'];
        const lowerText = text.toLowerCase();
        return companyIndicators.some(indicator => lowerText.includes(indicator));
    }

    getContext(text, start, length, wordIndex = null, wordRange = 3) {
        if (wordIndex !== null) {
            // Word-based context
            const words = text.split(/\s+/);
            const startIdx = Math.max(0, wordIndex - wordRange);
            const endIdx = Math.min(words.length, wordIndex + wordRange + 2);
            return words.slice(startIdx, endIdx).join(' ');
        } else {
            // Character-based context
            const contextStart = Math.max(0, start - 50);
            const contextEnd = Math.min(text.length, start + length + 50);
            return text.substring(contextStart, contextEnd);
        }
    }

    mergeOverlappingDetections(detections) {
        if (detections.length <= 1) return detections;
        
        const merged = [];
        let current = detections[0];
        
        for (let i = 1; i < detections.length; i++) {
            const next = detections[i];
            
            // Check if current and next overlap
            if (current.end >= next.start) {
                // Merge detections - keep the one with higher confidence
                if (next.confidence > current.confidence) {
                    current = {
                        ...next,
                        start: Math.min(current.start, next.start),
                        end: Math.max(current.end, next.end),
                        value: next.value,
                        type: next.type
                    };
                } else {
                    current = {
                        ...current,
                        end: Math.max(current.end, next.end)
                    };
                }
            } else {
                merged.push(current);
                current = next;
            }
        }
        
        merged.push(current);
        return merged;
    }

    redactText(text, detections, options = {}) {
        const {
            redactEmails = true,
            redactPhones = true,
            redactNames = true,
            redactAddresses = true,
            redactSSN = true,
            redactProfiles = true,
            customRedactionMask = '[REDACTED]'
        } = options;

        // Filter detections based on options
        const filteredDetections = detections.filter(detection => {
            switch (detection.type) {
                case 'email': return redactEmails;
                case 'phone': return redactPhones;
                case 'name': return redactNames;
                case 'address': 
                case 'zipcode': return redactAddresses;
                case 'ssn': 
                case 'dateOfBirth': return redactSSN;
                case 'linkedin':
                case 'github': return redactProfiles;
                default: return true;
            }
        });

        // Sort by start position in reverse order to maintain correct indices
        const sortedDetections = filteredDetections.sort((a, b) => b.start - a.start);
        
        let redactedText = text;
        
        for (const detection of sortedDetections) {
            const mask = this.getRedactionMask(detection.type, detection.value, customRedactionMask);
            redactedText = redactedText.substring(0, detection.start) + 
                          mask + 
                          redactedText.substring(detection.end);
        }
        
        return redactedText;
    }

    getRedactionMask(type, originalValue, customMask) {
        switch (type) {
            case 'email':
                return '[EMAIL_REDACTED]';
            case 'phone':
                return '[PHONE_REDACTED]';
            case 'name':
                return '[NAME_REDACTED]';
            case 'address':
                return '[ADDRESS_REDACTED]';
            case 'zipcode':
                return '[ZIP_REDACTED]';
            case 'ssn':
                return '[SSN_REDACTED]';
            case 'dateOfBirth':
                return '[DOB_REDACTED]';
            case 'linkedin':
                return '[LINKEDIN_REDACTED]';
            case 'github':
                return '[GITHUB_REDACTED]';
            default:
                return customMask;
        }
    }

    analyzeText(text) {
        const detections = this.detectPII(text);
        const stats = this.generateStats(detections, text);
        
        return {
            detections,
            stats,
            riskLevel: this.calculateRiskLevel(detections),
            recommendations: this.generateRecommendations(detections)
        };
    }

    generateStats(detections, text) {
        const stats = {
            totalDetections: detections.length,
            byType: {},
            averageConfidence: 0,
            textLength: text.length,
            redactionPercentage: 0
        };

        let totalConfidence = 0;
        let totalRedactedLength = 0;

        detections.forEach(detection => {
            if (!stats.byType[detection.type]) {
                stats.byType[detection.type] = 0;
            }
            stats.byType[detection.type]++;
            totalConfidence += detection.confidence;
            totalRedactedLength += detection.end - detection.start;
        });

        if (detections.length > 0) {
            stats.averageConfidence = totalConfidence / detections.length;
            stats.redactionPercentage = (totalRedactedLength / text.length) * 100;
        }

        return stats;
    }

    calculateRiskLevel(detections) {
        if (detections.length === 0) return 'LOW';
        
        const highRiskTypes = ['ssn', 'dateOfBirth', 'address'];
        const mediumRiskTypes = ['email', 'phone', 'linkedin', 'github'];
        
        const hasHighRisk = detections.some(d => highRiskTypes.includes(d.type));
        const hasMediumRisk = detections.some(d => mediumRiskTypes.includes(d.type));
        
        if (hasHighRisk) return 'HIGH';
        if (hasMediumRisk) return 'MEDIUM';
        return 'LOW';
    }

    generateRecommendations(detections) {
        const recommendations = [];
        
        if (detections.some(d => d.type === 'ssn')) {
            recommendations.push('Remove Social Security Number - this is highly sensitive information');
        }
        
        if (detections.some(d => d.type === 'address')) {
            recommendations.push('Consider removing full street address - city and state are sufficient');
        }
        
        if (detections.some(d => d.type === 'email')) {
            recommendations.push('Replace personal email with a professional contact method');
        }
        
        if (detections.some(d => d.type === 'phone')) {
            recommendations.push('Consider using a professional phone number or removing if not necessary');
        }
        
        if (detections.length === 0) {
            recommendations.push('Your resume appears to have minimal PII exposure - great job!');
        }
        
        return recommendations;
    }
}