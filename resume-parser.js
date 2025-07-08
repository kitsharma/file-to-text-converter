class ResumeParser {
    constructor() {
        this.patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
            linkedin: /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([\w-]+)/gi,
            github: /(?:github\.com\/)([\w-]+)/gi,
            website: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/\S*)?/g,
            
            // Date patterns
            dateRange: /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{1,2}(?:st|nd|rd|th)?,?\s+)?\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{1,2}(?:st|nd|rd|th)?,?\s+)?\d{4}|Present|Current/gi,
            year: /\b(19|20)\d{2}\b/g,
            
            // Section headers
            sectionHeaders: /^(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE|CAREER|EDUCATION|ACADEMIC BACKGROUND|SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|ACCOMPLISHMENTS|SUMMARY|OBJECTIVE|PROFILE)\s*:?\s*$/gim,
            
            // Common degree types
            degrees: /\b(?:PhD|Ph\.D\.|Doctor of Philosophy|Masters?|M\.S\.|M\.A\.|MBA|M\.B\.A\.|Bachelor|B\.S\.|B\.A\.|B\.Sc\.|B\.Tech|B\.E\.|Associate|A\.A\.|A\.S\.)\b/gi,
            
            // Programming languages and technologies
            techSkills: /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|MongoDB|PostgreSQL|MySQL|Redis|AWS|Azure|GCP|Docker|Kubernetes|Git|Jenkins|Terraform|Ansible)\b/gi
        };
        
        this.stopWords = new Set([
            'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'the', 'a', 'an',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
        ]);
    }

    parseResume(text) {
        try {
            const cleanedText = this.cleanText(text);
            const sections = this.identifySections(cleanedText);
            
            const parsedData = {
                rawText: text,
                contactInfo: this.extractContactInfo(cleanedText),
                workExperience: this.extractWorkExperience(sections.experience || cleanedText),
                education: this.extractEducation(sections.education || cleanedText),
                skills: this.extractSkills(sections.skills || cleanedText),
                projects: this.extractProjects(sections.projects || cleanedText),
                summary: this.extractSummary(sections.summary || sections.objective || cleanedText),
                metadata: this.generateMetadata(cleanedText),
                qualityScore: null
            };
            
            parsedData.qualityScore = this.calculateQualityScore(parsedData);
            
            return parsedData;
            
        } catch (error) {
            throw new Error(`Resume parsing failed: ${error.message}`);
        }
    }

    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    identifySections(text) {
        const sections = {};
        const lines = text.split('\n');
        let currentSection = null;
        let currentContent = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (this.patterns.sectionHeaders.test(line)) {
                if (currentSection && currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                
                currentSection = this.normalizeSectionName(line);
                currentContent = [];
                this.patterns.sectionHeaders.lastIndex = 0;
            } else if (currentSection && line) {
                currentContent.push(line);
            }
        }

        if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
        }

        return sections;
    }

    normalizeSectionName(header) {
        const normalized = header.toLowerCase()
            .replace(/[:\s]+/g, '')
            .replace(/s$/, '');
            
        if (normalized.includes('experience') || normalized.includes('employment') || normalized.includes('career')) {
            return 'experience';
        } else if (normalized.includes('education') || normalized.includes('academic')) {
            return 'education';
        } else if (normalized.includes('skill') || normalized.includes('competenc')) {
            return 'skills';
        } else if (normalized.includes('project')) {
            return 'projects';
        } else if (normalized.includes('summary') || normalized.includes('objective') || normalized.includes('profile')) {
            return 'summary';
        }
        
        return normalized;
    }

    extractContactInfo(text) {
        const contactInfo = {
            name: null,
            email: null,
            phone: null,
            linkedin: null,
            github: null,
            website: null,
            location: null
        };

        // Extract email
        const emailMatches = text.match(this.patterns.email);
        if (emailMatches) {
            contactInfo.email = emailMatches[0];
        }

        // Extract phone
        const phoneMatches = text.match(this.patterns.phone);
        if (phoneMatches) {
            contactInfo.phone = phoneMatches[0];
        }

        // Extract LinkedIn
        const linkedinMatches = text.match(this.patterns.linkedin);
        if (linkedinMatches) {
            contactInfo.linkedin = `https://linkedin.com/in/${linkedinMatches[0].split('/').pop()}`;
        }

        // Extract GitHub
        const githubMatches = text.match(this.patterns.github);
        if (githubMatches) {
            contactInfo.github = `https://github.com/${githubMatches[0].split('/').pop()}`;
        }

        // Extract name (first few non-header lines that don't contain contact info)
        const lines = text.split('\n').slice(0, 10);
        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine && 
                !this.patterns.email.test(cleanLine) && 
                !this.patterns.phone.test(cleanLine) &&
                !cleanLine.toLowerCase().includes('resume') &&
                !cleanLine.toLowerCase().includes('cv') &&
                cleanLine.length > 2 && cleanLine.length < 50 &&
                /^[A-Za-z\s.,-]+$/.test(cleanLine)) {
                contactInfo.name = cleanLine;
                break;
            }
        }

        return contactInfo;
    }

    extractWorkExperience(text) {
        const experiences = [];
        const blocks = this.splitIntoBlocks(text);

        for (const block of blocks) {
            const experience = this.parseExperienceBlock(block);
            if (experience && experience.company) {
                experiences.push(experience);
            }
        }

        return experiences.sort((a, b) => {
            const aYear = this.extractLatestYear(a.duration) || 0;
            const bYear = this.extractLatestYear(b.duration) || 0;
            return bYear - aYear;
        });
    }

    parseExperienceBlock(block) {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length < 2) return null;

        const experience = {
            title: null,
            company: null,
            duration: null,
            location: null,
            description: []
        };

        // First line is usually title
        experience.title = lines[0].trim();

        // Look for company and dates in subsequent lines
        for (let i = 1; i < Math.min(lines.length, 4); i++) {
            const line = lines[i].trim();
            
            if (this.patterns.dateRange.test(line) && !experience.duration) {
                experience.duration = line;
            } else if (!experience.company && line && !this.patterns.dateRange.test(line)) {
                experience.company = line;
            }
        }

        // Remaining lines are description
        const descriptionStart = experience.duration ? 3 : 2;
        for (let i = descriptionStart; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !this.patterns.dateRange.test(line)) {
                experience.description.push(line);
            }
        }

        return experience;
    }

    extractEducation(text) {
        const education = [];
        const blocks = this.splitIntoBlocks(text);

        for (const block of blocks) {
            const edu = this.parseEducationBlock(block);
            if (edu && edu.institution) {
                education.push(edu);
            }
        }

        return education.sort((a, b) => {
            const aYear = this.extractLatestYear(a.year) || 0;
            const bYear = this.extractLatestYear(b.year) || 0;
            return bYear - aYear;
        });
    }

    parseEducationBlock(block) {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length === 0) return null;

        const education = {
            degree: null,
            institution: null,
            year: null,
            gpa: null,
            details: []
        };

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (this.patterns.degrees.test(trimmedLine) && !education.degree) {
                education.degree = trimmedLine;
            } else if (this.patterns.year.test(trimmedLine) && !education.year) {
                education.year = trimmedLine;
            } else if (!education.institution && trimmedLine && !this.patterns.degrees.test(trimmedLine)) {
                education.institution = trimmedLine;
            } else if (trimmedLine) {
                education.details.push(trimmedLine);
            }
        }

        return education;
    }

    extractSkills(text) {
        const skills = {
            technical: [],
            soft: [],
            languages: [],
            certifications: []
        };

        // Extract technical skills
        const techMatches = text.match(this.patterns.techSkills) || [];
        skills.technical = [...new Set(techMatches)];

        // Extract all potential skills (words/phrases that aren't stop words)
        const words = text.toLowerCase()
            .replace(/[^\w\s.#+-]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word));

        const skillCandidates = [...new Set(words)]
            .filter(word => !skills.technical.some(tech => tech.toLowerCase().includes(word)));

        // Categorize remaining skills
        const softSkillKeywords = [
            'leadership', 'communication', 'teamwork', 'management', 'problem', 'solving',
            'analytical', 'creative', 'critical', 'thinking', 'organization', 'planning'
        ];

        for (const candidate of skillCandidates.slice(0, 20)) {
            if (softSkillKeywords.some(keyword => candidate.includes(keyword))) {
                skills.soft.push(candidate);
            }
        }

        return skills;
    }

    extractProjects(text) {
        const projects = [];
        const blocks = this.splitIntoBlocks(text);

        for (const block of blocks) {
            const project = this.parseProjectBlock(block);
            if (project && project.name) {
                projects.push(project);
            }
        }

        return projects;
    }

    parseProjectBlock(block) {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length === 0) return null;

        return {
            name: lines[0].trim(),
            description: lines.slice(1).join(' ').trim(),
            technologies: this.extractTechnologies(block)
        };
    }

    extractTechnologies(text) {
        const techMatches = text.match(this.patterns.techSkills) || [];
        return [...new Set(techMatches)];
    }

    extractSummary(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const summary = lines.slice(0, 5).join(' ').trim();
        return summary.length > 50 ? summary.substring(0, 300) + '...' : summary;
    }

    splitIntoBlocks(text) {
        return text.split(/\n\s*\n/).filter(block => block.trim());
    }

    extractLatestYear(text) {
        if (!text) return null;
        const years = text.match(this.patterns.year);
        return years ? Math.max(...years.map(Number)) : null;
    }

    generateMetadata(text) {
        const wordCount = text.split(/\s+/).length;
        const lineCount = text.split('\n').length;
        const hasContactInfo = this.patterns.email.test(text) || this.patterns.phone.test(text);
        const hasDates = this.patterns.dateRange.test(text) || this.patterns.year.test(text);
        
        return {
            wordCount,
            lineCount,
            hasContactInfo,
            hasDates,
            estimatedExperienceYears: this.estimateExperienceYears(text),
            parsedAt: new Date().toISOString()
        };
    }

    estimateExperienceYears(text) {
        const years = text.match(this.patterns.year);
        if (!years || years.length < 2) return 0;
        
        const numericYears = years.map(Number);
        const minYear = Math.min(...numericYears);
        const maxYear = Math.max(...numericYears);
        const currentYear = new Date().getFullYear();
        
        return Math.max(0, Math.min(currentYear - minYear, maxYear - minYear));
    }

    calculateQualityScore(parsedData) {
        let score = 0;
        const weights = {
            contactInfo: 20,
            workExperience: 25,
            education: 15,
            skills: 20,
            summary: 10,
            formatting: 10
        };

        // Contact information score
        const contact = parsedData.contactInfo;
        let contactScore = 0;
        if (contact.name) contactScore += 5;
        if (contact.email) contactScore += 5;
        if (contact.phone) contactScore += 3;
        if (contact.linkedin) contactScore += 4;
        if (contact.github) contactScore += 3;
        score += Math.min(contactScore, weights.contactInfo);

        // Work experience score
        const expScore = Math.min(parsedData.workExperience.length * 8, weights.workExperience);
        score += expScore;

        // Education score
        const eduScore = Math.min(parsedData.education.length * 7, weights.education);
        score += eduScore;

        // Skills score
        const skillsCount = parsedData.skills.technical.length + parsedData.skills.soft.length;
        const skillScore = Math.min(skillsCount * 2, weights.skills);
        score += skillScore;

        // Summary score
        if (parsedData.summary && parsedData.summary.length > 50) {
            score += weights.summary;
        }

        // Formatting score
        const metadata = parsedData.metadata;
        let formatScore = 0;
        if (metadata.hasContactInfo) formatScore += 3;
        if (metadata.hasDates) formatScore += 3;
        if (metadata.wordCount > 200) formatScore += 2;
        if (metadata.wordCount < 2000) formatScore += 2;
        score += formatScore;

        return Math.min(Math.round(score), 100);
    }

    generateFeedback(parsedData) {
        const feedback = {
            strengths: [],
            improvements: [],
            suggestions: []
        };

        const contact = parsedData.contactInfo;
        const score = parsedData.qualityScore;

        // Analyze strengths
        if (contact.email && contact.phone) {
            feedback.strengths.push("Complete contact information provided");
        }
        if (parsedData.workExperience.length >= 3) {
            feedback.strengths.push("Strong work experience history");
        }
        if (parsedData.skills.technical.length >= 5) {
            feedback.strengths.push("Good technical skills coverage");
        }

        // Analyze improvements
        if (!contact.linkedin) {
            feedback.improvements.push("Add LinkedIn profile URL");
        }
        if (parsedData.skills.technical.length < 5) {
            feedback.improvements.push("Include more technical skills");
        }
        if (!parsedData.summary || parsedData.summary.length < 100) {
            feedback.improvements.push("Add a comprehensive professional summary");
        }

        // Provide suggestions based on score
        if (score < 60) {
            feedback.suggestions.push("Consider restructuring your resume with clear sections");
            feedback.suggestions.push("Add more detailed work experience descriptions");
        } else if (score < 80) {
            feedback.suggestions.push("Include quantifiable achievements in work experience");
            feedback.suggestions.push("Add relevant certifications or projects");
        } else {
            feedback.suggestions.push("Your resume shows strong structure and content");
        }

        return feedback;
    }
}