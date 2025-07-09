/**
 * Smart Redaction Service - Privacy-aware with user choice and descriptive replacements
 * Helps users understand WHY to redact and provides meaningful alternatives
 */

class SmartRedactionService {
    constructor() {
        this.companyDatabase = this.initializeCompanyDatabase();
        this.educationDatabase = this.initializeEducationDatabase();
        this.redactionReasons = this.initializeRedactionReasons();
    }

    initializeCompanyDatabase() {
        // In production, this would be a comprehensive database
        return {
            'Microsoft': { description: 'Fortune 500 Tech Giant', revenue: '$200B+', industry: 'Technology' },
            'Google': { description: 'Global Tech & Search Leader', revenue: '$280B+', industry: 'Technology' },
            'Apple': { description: 'Consumer Electronics Giant', revenue: '$390B+', industry: 'Technology' },
            'Amazon': { description: 'E-commerce & Cloud Leader', revenue: '$470B+', industry: 'Technology/Retail' },
            'Walmart': { description: 'Fortune 1 Retail Giant', revenue: '$570B+', industry: 'Retail' },
            'JPMorgan': { description: 'Leading Investment Bank', revenue: '$120B+', industry: 'Financial Services' },
            'Johnson & Johnson': { description: 'Healthcare & Pharma Leader', revenue: '$90B+', industry: 'Healthcare' },
            'Procter & Gamble': { description: '$80B Consumer Goods Company', revenue: '$80B+', industry: 'Consumer Goods' },
            'Coca-Cola': { description: 'Global Beverage Leader', revenue: '$40B+', industry: 'Beverages' },
            'Nike': { description: 'Athletic Apparel Leader', revenue: '$45B+', industry: 'Apparel' }
        };
    }

    initializeEducationDatabase() {
        return {
            'Harvard': { description: 'Ivy League University', type: 'Elite Private', ranking: 'Top 5' },
            'Stanford': { description: 'Elite West Coast University', type: 'Elite Private', ranking: 'Top 5' },
            'MIT': { description: 'Elite Tech Institute', type: 'Elite Private', ranking: 'Top 5' },
            'Yale': { description: 'Ivy League University', type: 'Elite Private', ranking: 'Top 10' },
            'Princeton': { description: 'Ivy League University', type: 'Elite Private', ranking: 'Top 5' },
            'University of California': { description: 'Top Public University System', type: 'Public Research', ranking: 'Top 20' },
            'University of Texas': { description: 'Large Public Research University', type: 'Public Research', ranking: 'Top 40' },
            'Ohio State': { description: 'Big Ten Research University', type: 'Public Research', ranking: 'Top 60' },
            'Michigan': { description: 'Big Ten Research University', type: 'Public Research', ranking: 'Top 25' },
            'Penn State': { description: 'Big Ten Research University', type: 'Public Research', ranking: 'Top 60' }
        };
    }

    initializeRedactionReasons() {
        return {
            companyName: {
                reason: 'Protect current employment and avoid bias',
                explanation: 'Some recruiters may have preconceptions about certain companies. Describing your company type lets you highlight the scale and complexity of your experience without revealing the specific employer.',
                defaultRecommendation: 'Recommended for active job seekers'
            },
            collegeName: {
                reason: 'Reduce education bias and focus on skills',
                explanation: 'Some employers may have unconscious bias about educational institutions. Describing your school type emphasizes the rigor and network while keeping focus on your capabilities.',
                defaultRecommendation: 'Optional - depends on target role'
            },
            dates: {
                reason: 'Avoid age discrimination',
                explanation: 'Employment dates can reveal approximate age, which may lead to unconscious bias. Focus on years of experience rather than specific timeframes.',
                defaultRecommendation: 'Recommended for 40+ professionals'
            },
            salary: {
                reason: 'Avoid salary anchoring',
                explanation: 'Previous salary information can limit negotiation power. Let your skills and value determine compensation discussions.',
                defaultRecommendation: 'Always recommended'
            },
            personalInfo: {
                reason: 'Identity protection and privacy',
                explanation: 'Names, addresses, and contact info should be protected during initial screening. Employers can contact you through the platform.',
                defaultRecommendation: 'Always recommended'
            }
        };
    }

    analyzeRedactionNeeds(resumeData) {
        const recommendations = {
            personalInfo: this.analyzePersonalInfo(resumeData),
            experience: this.analyzeExperience(resumeData.experience || []),
            education: this.analyzeEducation(resumeData.education || []),
            timeline: this.analyzeTimeline(resumeData)
        };

        return {
            recommendations,
            riskLevel: this.calculateRiskLevel(recommendations),
            summary: this.generateRedactionSummary(recommendations)
        };
    }

    analyzePersonalInfo(resumeData) {
        const found = [];
        
        if (resumeData.contact?.name) {
            found.push({
                type: 'name',
                value: resumeData.contact.name,
                replacement: 'Candidate',
                reason: this.redactionReasons.personalInfo.reason,
                recommended: true,
                riskLevel: 'medium'
            });
        }
        
        if (resumeData.contact?.email) {
            found.push({
                type: 'email',
                value: resumeData.contact.email,
                replacement: 'Available upon request',
                reason: this.redactionReasons.personalInfo.reason,
                recommended: true,
                riskLevel: 'low'
            });
        }
        
        if (resumeData.contact?.phone) {
            found.push({
                type: 'phone',
                value: resumeData.contact.phone,
                replacement: 'Available upon request',
                reason: this.redactionReasons.personalInfo.reason,
                recommended: true,
                riskLevel: 'low'
            });
        }

        return found;
    }

    analyzeExperience(experiences) {
        const found = [];
        
        experiences.forEach((exp, index) => {
            if (exp.company) {
                const companyRedaction = this.analyzeCompany(exp.company);
                found.push({
                    type: 'company',
                    experienceIndex: index,
                    value: exp.company,
                    replacement: companyRedaction.description,
                    reason: this.redactionReasons.companyName.reason,
                    recommended: companyRedaction.recommended,
                    riskLevel: companyRedaction.riskLevel,
                    benefits: companyRedaction.benefits
                });
            }
            
            if (exp.duration) {
                const dateRedaction = this.analyzeDates(exp.duration);
                found.push({
                    type: 'dates',
                    experienceIndex: index,
                    value: exp.duration,
                    replacement: dateRedaction.replacement,
                    reason: this.redactionReasons.dates.reason,
                    recommended: dateRedaction.recommended,
                    riskLevel: dateRedaction.riskLevel
                });
            }
        });

        return found;
    }

    analyzeEducation(educations) {
        const found = [];
        
        educations.forEach((edu, index) => {
            if (edu.institution) {
                const schoolRedaction = this.analyzeSchool(edu.institution);
                found.push({
                    type: 'school',
                    educationIndex: index,
                    value: edu.institution,
                    replacement: schoolRedaction.description,
                    reason: this.redactionReasons.collegeName.reason,
                    recommended: schoolRedaction.recommended,
                    riskLevel: schoolRedaction.riskLevel,
                    benefits: schoolRedaction.benefits
                });
            }
            
            if (edu.year) {
                const yearRedaction = this.analyzeEducationYear(edu.year);
                found.push({
                    type: 'gradYear',
                    educationIndex: index,
                    value: edu.year,
                    replacement: yearRedaction.replacement,
                    reason: this.redactionReasons.dates.reason,
                    recommended: yearRedaction.recommended,
                    riskLevel: yearRedaction.riskLevel
                });
            }
        });

        return found;
    }

    analyzeCompany(companyName) {
        // Try to match against known companies
        const knownCompany = this.findCompanyMatch(companyName);
        
        if (knownCompany) {
            return {
                description: knownCompany.description,
                recommended: true,
                riskLevel: 'medium',
                benefits: [
                    'Highlights company scale and prestige',
                    'Avoids potential employer bias',
                    'Focuses on role complexity'
                ]
            };
        }
        
        // Generate generic description
        const genericDescription = this.generateGenericCompanyDescription(companyName);
        return {
            description: genericDescription,
            recommended: false,
            riskLevel: 'low',
            benefits: [
                'Protects current employment',
                'Maintains industry context'
            ]
        };
    }

    analyzeSchool(schoolName) {
        const knownSchool = this.findSchoolMatch(schoolName);
        
        if (knownSchool) {
            return {
                description: knownSchool.description,
                recommended: false, // Optional for schools
                riskLevel: 'low',
                benefits: [
                    'Reduces education bias',
                    'Emphasizes school caliber',
                    'Maintains academic context'
                ]
            };
        }
        
        return {
            description: 'Accredited University',
            recommended: false,
            riskLevel: 'low',
            benefits: ['Maintains educational credibility']
        };
    }

    analyzeDates(dateString) {
        const currentYear = new Date().getFullYear();
        const hasRecentDates = dateString.includes(currentYear.toString()) || 
                              dateString.includes((currentYear - 1).toString());
        
        // Calculate approximate career length
        const years = this.extractYearRange(dateString);
        const careerLength = years.length > 0 ? Math.max(...years) - Math.min(...years) : 0;
        
        return {
            replacement: careerLength > 0 ? `${careerLength} years experience` : 'Recent experience',
            recommended: careerLength > 20, // Recommend for senior professionals
            riskLevel: careerLength > 15 ? 'medium' : 'low'
        };
    }

    analyzeEducationYear(year) {
        const gradYear = parseInt(year);
        const currentYear = new Date().getFullYear();
        const yearsAgo = currentYear - gradYear;
        
        return {
            replacement: yearsAgo > 0 ? `${yearsAgo} years ago` : 'Recent graduate',
            recommended: yearsAgo > 20,
            riskLevel: yearsAgo > 15 ? 'medium' : 'low'
        };
    }

    findCompanyMatch(companyName) {
        const normalized = companyName.toLowerCase();
        
        for (const [key, data] of Object.entries(this.companyDatabase)) {
            if (normalized.includes(key.toLowerCase())) {
                return data;
            }
        }
        
        return null;
    }

    findSchoolMatch(schoolName) {
        const normalized = schoolName.toLowerCase();
        
        for (const [key, data] of Object.entries(this.educationDatabase)) {
            if (normalized.includes(key.toLowerCase())) {
                return data;
            }
        }
        
        return null;
    }

    generateGenericCompanyDescription(companyName) {
        // Simple heuristics for company description
        const name = companyName.toLowerCase();
        
        if (name.includes('hospital') || name.includes('medical') || name.includes('health')) {
            return 'Healthcare Organization';
        } else if (name.includes('school') || name.includes('university') || name.includes('college')) {
            return 'Educational Institution';
        } else if (name.includes('bank') || name.includes('financial') || name.includes('investment')) {
            return 'Financial Services Company';
        } else if (name.includes('tech') || name.includes('software') || name.includes('systems')) {
            return 'Technology Company';
        } else if (name.includes('retail') || name.includes('store') || name.includes('shop')) {
            return 'Retail Organization';
        } else if (name.includes('government') || name.includes('city') || name.includes('county')) {
            return 'Government Agency';
        } else if (name.includes('consulting') || name.includes('advisory')) {
            return 'Consulting Firm';
        } else {
            return 'Established Company';
        }
    }

    extractYearRange(dateString) {
        const yearMatches = dateString.match(/\d{4}/g);
        return yearMatches ? yearMatches.map(year => parseInt(year)) : [];
    }

    calculateRiskLevel(recommendations) {
        const allItems = [
            ...recommendations.personalInfo,
            ...recommendations.experience,
            ...recommendations.education
        ];
        
        const highRiskCount = allItems.filter(item => item.riskLevel === 'high').length;
        const mediumRiskCount = allItems.filter(item => item.riskLevel === 'medium').length;
        
        if (highRiskCount > 0) return 'high';
        if (mediumRiskCount > 2) return 'medium';
        return 'low';
    }

    generateRedactionSummary(recommendations) {
        const personalCount = recommendations.personalInfo.length;
        const companyCount = recommendations.experience.filter(item => item.type === 'company').length;
        const schoolCount = recommendations.education.filter(item => item.type === 'school').length;
        
        return {
            totalItems: personalCount + companyCount + schoolCount,
            categories: {
                personal: personalCount,
                companies: companyCount,
                schools: schoolCount
            },
            recommendation: this.getOverallRecommendation(recommendations)
        };
    }

    getOverallRecommendation(recommendations) {
        const recommendedCount = [
            ...recommendations.personalInfo,
            ...recommendations.experience,
            ...recommendations.education
        ].filter(item => item.recommended).length;
        
        if (recommendedCount === 0) {
            return 'Your resume is already privacy-friendly';
        } else if (recommendedCount <= 2) {
            return 'Consider light redaction for optimal privacy';
        } else {
            return 'We recommend redacting several items for better privacy';
        }
    }

    applyRedactions(resumeData, selectedRedactions) {
        const redactedData = JSON.parse(JSON.stringify(resumeData)); // Deep copy
        
        selectedRedactions.forEach(redaction => {
            // Handle both redaction objects and IDs
            if (typeof redaction === 'object') {
                this.applySpecificRedaction(redactedData, redaction);
            } else {
                // If it's an ID, find the redaction (legacy support)
                const redactionObj = this.findRedactionById(redaction);
                if (redactionObj) {
                    this.applySpecificRedaction(redactedData, redactionObj);
                }
            }
        });
        
        return redactedData;
    }

    findRedactionById(redactionId) {
        // Implementation depends on how redactions are stored and identified
        // This would search through the analysis results
        return null;
    }

    applySpecificRedaction(data, redaction) {
        switch (redaction.type) {
            case 'name':
                if (data.contact) data.contact.name = redaction.replacement;
                break;
            case 'email':
                if (data.contact) data.contact.email = redaction.replacement;
                break;
            case 'phone':
                if (data.contact) data.contact.phone = redaction.replacement;
                break;
            case 'company':
                if (data.experience?.[redaction.experienceIndex]) {
                    data.experience[redaction.experienceIndex].company = redaction.replacement;
                }
                break;
            case 'school':
                if (data.education?.[redaction.educationIndex]) {
                    data.education[redaction.educationIndex].institution = redaction.replacement;
                }
                break;
            case 'dates':
                if (data.experience?.[redaction.experienceIndex]) {
                    data.experience[redaction.experienceIndex].duration = redaction.replacement;
                }
                break;
            case 'gradYear':
                if (data.education?.[redaction.educationIndex]) {
                    data.education[redaction.educationIndex].year = redaction.replacement;
                }
                break;
        }
    }
}

// Export for browser usage
window.SmartRedactionService = SmartRedactionService;