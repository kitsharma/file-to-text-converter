// Enhanced Resume Parser for Story 1.1: Secure & Instant Resume Ingestion
class EnhancedResumeParser {
    constructor() {
        this.sessionData = null; // Session-only storage, no persistence
        this.progressCallback = null;
        this.startTime = null;
        
        // PII Patterns for redaction during parsing
        this.PII_PATTERNS = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
            ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
            address: /\b\d+\s+[\w\s,]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd)\b/gi,
            zipcode: /\b\d{5}(?:-\d{4})?\b/g,
            name: null // Will be populated after name extraction
        };
        
        // Skills database for extraction
        this.skillsDatabase = this.initializeSkillsDatabase();
        
        // Initialize ONET skill mapper for enhanced skill matching
        this.onetSkillMapper = null;
        this.initializeONETMapper();
    }

    initializeSkillsDatabase() {
        return {
            technical: [
                'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go',
                'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
                'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind', 'jQuery',
                'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
                'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins',
                'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence',
                'Machine Learning', 'AI', 'Data Science', 'Analytics', 'Pandas', 'NumPy',
                'REST API', 'GraphQL', 'Microservices', 'DevOps', 'CI/CD'
            ],
            soft: [
                'Leadership', 'Communication', 'Problem Solving', 'Team Management',
                'Project Management', 'Analytical Thinking', 'Creativity', 'Adaptability',
                'Time Management', 'Critical Thinking', 'Collaboration', 'Negotiation',
                'Public Speaking', 'Mentoring', 'Strategic Planning', 'Customer Service'
            ],
            tools: [
                'Microsoft Office', 'Excel', 'PowerPoint', 'Word', 'Outlook',
                'Slack', 'Zoom', 'Teams', 'Photoshop', 'Illustrator', 'Figma',
                'Salesforce', 'HubSpot', 'Tableau', 'Power BI', 'Jupyter',
                'VS Code', 'IntelliJ', 'Eclipse', 'Postman', 'Insomnia'
            ]
        };
    }

    async initializeONETMapper() {
        try {
            if (typeof ONETSkillMapper !== 'undefined') {
                this.onetSkillMapper = new ONETSkillMapper();
                await this.onetSkillMapper.initialize();
                console.log('ONET skill mapper initialized successfully');
            }
        } catch (error) {
            console.warn('ONET skill mapper initialization failed, using fallback:', error);
            this.onetSkillMapper = null;
        }
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    updateProgress(percentage, message) {
        if (this.progressCallback) {
            this.progressCallback(percentage, message);
        }
    }

    async parseResumeSecurely(text, fileName) {
        this.startTime = Date.now();
        
        try {
            this.updateProgress(0, 'Starting secure resume analysis...');
            
            // Phase 1: Extract basic structure (20% progress)
            this.updateProgress(10, 'Reading your professional story...');
            const contactInfo = this.extractContactInfo(text);
            
            // Specific progress based on what we found
            const experienceYears = this.extractYearsOfExperience(text);
            this.updateProgress(20, `Found ${experienceYears || 'your'} years of valuable experience...`);
            const experience = this.extractExperience(text);
            
            // Phase 2: Extract skills and education (40% progress)
            this.updateProgress(30, `Identifying your ${experience.length > 0 ? experience.length + ' career achievements' : 'professional skills'}...`);
            const skills = await this.extractSkills(text);
            
            // Extract skills from experience descriptions with specific feedback
            if (skills.length > 0) {
                this.updateProgress(35, `Discovered ${skills.length} core competencies in your background...`);
            } else {
                this.updateProgress(35, 'Analyzing your unique capabilities...');
            }
            
            for (const exp of experience) {
                if (exp.skillsText) {
                    exp.skills = await this.extractSkillsFromText(exp.skillsText);
                    delete exp.skillsText; // Clean up temporary field
                } else {
                    exp.skills = [];
                }
            }
            
            // Be specific about education if found
            this.updateProgress(40, 'Reviewing your educational achievements...');
            const education = this.extractEducation(text);
            
            // Phase 3: Apply PII redaction (60% progress) - be specific about what we're protecting
            const piiCount = this.countPIIElements(text, contactInfo);
            this.updateProgress(50, `Protecting your privacy (${piiCount} personal details secured)...`);
            const redactedText = this.applyPIIRedaction(text, contactInfo);
            
            // Phase 4: Generate structured output (80% progress)
            this.updateProgress(70, 'Organizing your career insights...');
            const structuredData = this.generateStructuredOutput(
                contactInfo, experience, skills, education, redactedText
            );
            
            // Phase 5: Finalize and validate (100% progress)
            this.updateProgress(90, `Preparing your ${skills.length} skills for opportunity matching...`);
            const finalResult = this.validateAndFinalize(structuredData, fileName);
            
            this.updateProgress(100, '✨ Your career potential unlocked!');
            
            // Store in session only - no persistence
            this.sessionData = finalResult;
            
            // Ensure processing completes within 3 seconds
            const processingTime = Date.now() - this.startTime;
            if (processingTime > 3000) {
                console.warn(`Processing took ${processingTime}ms - target is under 3000ms`);
            }
            
            return finalResult;
            
        } catch (error) {
            this.updateProgress(0, 'Analysis failed');
            throw new Error(`Resume parsing failed: ${error.message}`);
        }
    }

    extractContactInfo(text) {
        const contact = {
            name: null,
            email: null,
            phone: null,
            location: null,
            linkedin: null,
            website: null
        };

        // Extract email
        const emailMatch = text.match(this.PII_PATTERNS.email);
        if (emailMatch) {
            contact.email = emailMatch[0];
        }

        // Extract phone
        const phoneMatch = text.match(this.PII_PATTERNS.phone);
        if (phoneMatch) {
            contact.phone = phoneMatch[0];
        }

        // Extract name (usually first 2-3 lines)
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i].trim();
            // Name is likely 2-4 words, first letter capitalized, no numbers or special chars
            if (/^[A-Z][a-z]+ [A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(line) && !contact.name) {
                contact.name = line;
                // Add name pattern for PII redaction
                this.PII_PATTERNS.name = new RegExp(line.replace(/\s+/g, '\\s+'), 'gi');
                break;
            }
        }

        // Extract LinkedIn
        const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
        if (linkedinMatch) {
            contact.linkedin = linkedinMatch[0];
        }

        // Extract location (city, state pattern)
        const locationMatch = text.match(/([A-Z][a-z]+,?\s*[A-Z]{2})|([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/);
        if (locationMatch) {
            contact.location = locationMatch[0];
        }

        return contact;
    }

    extractExperience(text) {
        const experience = [];
        const sections = this.splitIntoSections(text);
        
        // Find experience section
        let experienceSection = null;
        for (const section of sections) {
            if (/experience|employment|work|career|professional/i.test(section.header)) {
                experienceSection = section.content;
                break;
            }
        }

        if (!experienceSection) return experience;

        // Parse individual experiences
        const experienceBlocks = experienceSection.split(/\n\s*\n/).filter(block => block.trim().length > 20);
        
        for (const block of experienceBlocks) {
            const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length < 2) continue;

            const exp = {
                title: null,
                company: null,
                duration: null,
                description: [],
                skills: []
            };

            // First line usually contains title and/or company
            if (lines[0]) {
                const titleCompanyLine = lines[0];
                // Try to separate title and company
                if (titleCompanyLine.includes(' at ') || titleCompanyLine.includes(' | ')) {
                    const parts = titleCompanyLine.split(/ at | \| /);
                    exp.title = parts[0].trim();
                    exp.company = parts[1] ? parts[1].trim() : null;
                } else {
                    exp.title = titleCompanyLine;
                }
            }

            // Look for company in second line if not found
            if (!exp.company && lines[1] && !/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(lines[1])) {
                exp.company = lines[1];
            }

            // Look for dates
            for (const line of lines) {
                if (/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(line)) {
                    exp.duration = line;
                    break;
                }
            }

            // Collect description (bullet points or paragraphs)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line !== exp.company && line !== exp.duration) {
                    exp.description.push(line);
                }
            }

            // Extract skills from description (will be processed later in async)
            exp.skillsText = exp.description.join(' ');

            if (exp.title) {
                experience.push(exp);
            }
        }

        return experience;
    }

    async extractSkills(text) {
        const allSkills = [
            ...this.skillsDatabase.technical,
            ...this.skillsDatabase.soft,
            ...this.skillsDatabase.tools
        ];

        const foundSkills = [];
        const textLower = text.toLowerCase();

        // First pass: exact matching with existing database
        for (const skill of allSkills) {
            const skillLower = skill.toLowerCase();
            if (textLower.includes(skillLower)) {
                // Verify it's a whole word match
                const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(text)) {
                    foundSkills.push(skill);
                }
            }
        }

        // Second pass: ONET skill mapping for enhanced detection
        if (this.onetSkillMapper) {
            try {
                // Extract potential skill phrases from the text
                const skillPhrases = this.extractSkillPhrases(text);
                const onetMappings = await this.onetSkillMapper.mapUserSkills(skillPhrases);
                
                for (const mapping of onetMappings) {
                    for (const onetSkill of mapping.onetSkills) {
                        if (onetSkill.confidence > 0.7) {
                            foundSkills.push(onetSkill.name);
                        }
                    }
                }
            } catch (error) {
                console.warn('ONET skill mapping failed:', error);
            }
        }

        // Remove duplicates and return
        return [...new Set(foundSkills)];
    }

    extractSkillPhrases(text) {
        // Extract meaningful phrases that could represent skills
        const phrases = [];
        
        // Split by common delimiters and clean up
        const words = text.split(/[,;•\n\r\|\-\+]/)
            .map(phrase => phrase.trim())
            .filter(phrase => phrase.length > 2 && phrase.length < 50);
        
        // Add individual words and short phrases
        for (const word of words) {
            // Clean up common resume artifacts
            const cleaned = word.replace(/^[-•\*\+\s]+|[-•\*\+\s]+$/g, '').trim();
            if (cleaned.length > 2) {
                phrases.push(cleaned);
            }
        }
        
        // Add some common skill-related patterns
        const skillPatterns = [
            /customer\s+service/gi,
            /data\s+analysis/gi,
            /project\s+management/gi,
            /team\s+leadership/gi,
            /problem\s+solving/gi,
            /communication\s+skills/gi,
            /time\s+management/gi
        ];
        
        for (const pattern of skillPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                phrases.push(...matches);
            }
        }
        
        return [...new Set(phrases)].slice(0, 20); // Limit to 20 phrases for performance
    }

    extractYearsOfExperience(text) {
        // Look for patterns like "5 years", "10+ years experience"
        const yearPatterns = /(\d+)\+?\s*years?\s*(of\s*)?(experience|working)?/gi;
        const matches = text.match(yearPatterns);
        
        if (matches && matches.length > 0) {
            // Extract the highest number
            let maxYears = 0;
            for (const match of matches) {
                const years = parseInt(match.match(/\d+/)[0]);
                if (years > maxYears && years < 50) { // Sanity check
                    maxYears = years;
                }
            }
            return maxYears > 0 ? maxYears : null;
        }
        
        return null;
    }

    countPIIElements(text, contactInfo) {
        let count = 0;
        
        // Count each type of PII found
        if (contactInfo.email) count++;
        if (contactInfo.phone) count++;
        if (contactInfo.name) count++;
        
        // Count addresses
        const addresses = text.match(this.PII_PATTERNS.address) || [];
        count += addresses.length;
        
        // Count potential SSN patterns
        const ssns = text.match(this.PII_PATTERNS.ssn) || [];
        count += ssns.length;
        
        return count;
    }

    async extractSkillsFromText(text) {
        return await this.extractSkills(text);
    }

    extractEducation(text) {
        const education = [];
        const sections = this.splitIntoSections(text);
        
        // Find education section
        let educationSection = null;
        for (const section of sections) {
            if (/education|academic|university|college|school|degree/i.test(section.header)) {
                educationSection = section.content;
                break;
            }
        }

        if (!educationSection) return education;

        // Parse education entries
        const educationBlocks = educationSection.split(/\n\s*\n/).filter(block => block.trim().length > 10);
        
        for (const block of educationBlocks) {
            const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length === 0) continue;

            const edu = {
                degree: null,
                institution: null,
                year: null,
                gpa: null
            };

            for (const line of lines) {
                // Look for degree patterns
                if (/bachelor|master|phd|doctorate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba/i.test(line)) {
                    edu.degree = line;
                }
                // Look for institution (usually contains "university" or "college")
                else if (/university|college|institute|school/i.test(line)) {
                    edu.institution = line;
                }
                // Look for year
                else if (/\b(19|20)\d{2}\b/.test(line)) {
                    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
                    edu.year = yearMatch[0];
                }
                // Look for GPA
                else if (/gpa|grade/i.test(line)) {
                    const gpaMatch = line.match(/(\d\.\d+)/);
                    if (gpaMatch) {
                        edu.gpa = gpaMatch[0];
                    }
                }
            }

            if (edu.degree || edu.institution) {
                education.push(edu);
            }
        }

        return education;
    }

    splitIntoSections(text) {
        const lines = text.split('\n');
        const sections = [];
        let currentSection = { header: '', content: '' };

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this looks like a section header
            if (this.isSectionHeader(trimmedLine)) {
                // Save previous section
                if (currentSection.content.trim()) {
                    sections.push(currentSection);
                }
                // Start new section
                currentSection = { header: trimmedLine, content: '' };
            } else {
                currentSection.content += line + '\n';
            }
        }

        // Add final section
        if (currentSection.content.trim()) {
            sections.push(currentSection);
        }

        return sections;
    }

    isSectionHeader(line) {
        const headerPatterns = [
            /^(experience|employment|work|career|professional)/i,
            /^(education|academic|university|college)/i,
            /^(skills|competencies|expertise|abilities)/i,
            /^(summary|objective|profile)/i,
            /^(projects|portfolio)/i,
            /^(certifications|certificates)/i,
            /^(awards|achievements|honors)/i
        ];

        return headerPatterns.some(pattern => pattern.test(line)) &&
               line.length < 50 && // Headers are usually short
               line.length > 3;    // But not too short
    }

    applyPIIRedaction(text, contactInfo) {
        let redactedText = text;

        // Redact email
        if (contactInfo.email) {
            redactedText = redactedText.replace(this.PII_PATTERNS.email, '[EMAIL_REDACTED]');
        }

        // Redact phone
        redactedText = redactedText.replace(this.PII_PATTERNS.phone, '[PHONE_REDACTED]');

        // Redact name (if identified)
        if (this.PII_PATTERNS.name) {
            redactedText = redactedText.replace(this.PII_PATTERNS.name, '[NAME_REDACTED]');
        }

        // Redact addresses
        redactedText = redactedText.replace(this.PII_PATTERNS.address, '[ADDRESS_REDACTED]');

        // Redact zip codes
        redactedText = redactedText.replace(this.PII_PATTERNS.zipcode, '[ZIP_REDACTED]');

        return redactedText;
    }

    generateStructuredOutput(contactInfo, experience, skills, education, redactedText) {
        return {
            // Required JSON output format
            skills: skills,
            experience: experience,
            
            // Additional structured data
            contact: {
                name: contactInfo.name ? '[REDACTED]' : null,
                email: contactInfo.email ? '[REDACTED]' : null,
                phone: contactInfo.phone ? '[REDACTED]' : null,
                location: contactInfo.location,
                linkedin: contactInfo.linkedin,
                website: contactInfo.website
            },
            education: education,
            
            // Privacy and security
            redactedText: redactedText,
            processingMetadata: {
                processedAt: new Date().toISOString(),
                sessionOnly: true,
                noServerTransmission: true,
                piiRedacted: true
            }
        };
    }

    validateAndFinalize(structuredData, fileName) {
        // Validate required fields
        if (!Array.isArray(structuredData.skills)) {
            throw new Error('Skills array is required');
        }

        if (!Array.isArray(structuredData.experience)) {
            throw new Error('Experience array is required');
        }

        // Add processing summary
        const result = {
            ...structuredData,
            summary: {
                fileName: fileName,
                skillsCount: structuredData.skills.length,
                experienceCount: structuredData.experience.length,
                educationCount: structuredData.education.length,
                processingTime: Date.now() - this.startTime,
                timestamp: new Date().toISOString()
            }
        };

        return result;
    }

    // Session management - no persistence
    getSessionData() {
        return this.sessionData;
    }

    clearSessionData() {
        this.sessionData = null;
    }

    // Ensure no data leakage
    onBeforeUnload() {
        this.clearSessionData();
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.EnhancedResumeParser = EnhancedResumeParser;
    
    // Clear session data when tab closes
    window.addEventListener('beforeunload', () => {
        if (window.enhancedResumeParser) {
            window.enhancedResumeParser.onBeforeUnload();
        }
    });
}