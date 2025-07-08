// O*NET Standalone Service - Skills Database and Fuzzy Matching
class ONETService {
    constructor() {
        this.config = apiConfig;
        this.cache = apiCache;
        this.rateLimiter = rateLimiter;
        
        // Pre-loaded O*NET data for offline operations
        this.skillsDatabase = null;
        this.occupationsDatabase = null;
        this.isInitialized = false;
        
        // Fuzzy matching threshold
        this.matchThreshold = 0.7;
        
        // Initialize with basic data
        this.initializeBasicData();
    }

    // Initialize with essential O*NET data
    async initializeBasicData() {
        try {
            // Load pre-cached or fetch essential O*NET data
            await this.loadSkillsDatabase();
            await this.loadOccupationsDatabase();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing O*NET data:', error);
            // Initialize with fallback data
            this.initializeFallbackData();
        }
    }

    // Load skills database
    async loadSkillsDatabase() {
        const cacheKey = 'onet_skills_database';
        let skillsData = this.cache.get(cacheKey);
        
        if (!skillsData) {
            try {
                // Try to fetch from O*NET API
                if (this.config.isConfigured('onet')) {
                    skillsData = await this.fetchSkillsFromAPI();
                    this.cache.set(cacheKey, skillsData);
                } else {
                    skillsData = this.getEmbeddedSkillsData();
                }
            } catch (error) {
                console.warn('Failed to load skills from API, using embedded data');
                skillsData = this.getEmbeddedSkillsData();
            }
        }
        
        this.skillsDatabase = skillsData;
    }

    // Load occupations database
    async loadOccupationsDatabase() {
        const cacheKey = 'onet_occupations_database';
        let occupationsData = this.cache.get(cacheKey);
        
        if (!occupationsData) {
            try {
                if (this.config.isConfigured('onet')) {
                    occupationsData = await this.fetchOccupationsFromAPI();
                    this.cache.set(cacheKey, occupationsData);
                } else {
                    occupationsData = this.getEmbeddedOccupationsData();
                }
            } catch (error) {
                console.warn('Failed to load occupations from API, using embedded data');
                occupationsData = this.getEmbeddedOccupationsData();
            }
        }
        
        this.occupationsDatabase = occupationsData;
    }

    // Fetch skills from O*NET API
    async fetchSkillsFromAPI() {
        try {
            const skills = [];
            const skillCategories = ['skills', 'knowledge', 'abilities'];
            
            for (const category of skillCategories) {
                const response = await this.makeONETRequest(`online/${category}`);
                if (response && response[category]) {
                    skills.push(...response[category].map(skill => ({
                        ...skill,
                        category: category,
                        searchTerms: this.generateSearchTerms(skill.element_name || skill.name)
                    })));
                }
            }
            
            return skills;
        } catch (error) {
            console.error('Error fetching skills from API:', error);
            return [];
        }
    }

    // Fetch occupations from O*NET API
    async fetchOccupationsFromAPI() {
        try {
            const response = await this.makeONETRequest('online/occupations');
            
            if (response && response.occupation) {
                return response.occupation.map(occ => ({
                    ...occ,
                    searchTerms: this.generateSearchTerms(occ.title),
                    skillsLoaded: false
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching occupations from API:', error);
            return [];
        }
    }

    // Make O*NET API request
    async makeONETRequest(endpoint, params = {}) {
        if (!this.config.isConfigured('onet')) {
            throw new Error('O*NET API not configured');
        }

        const rateLimitCheck = this.rateLimiter.canMakeRequest();
        if (!rateLimitCheck.allowed) {
            throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        }

        try {
            const url = new URL(endpoint, this.config.config.ONET_API_BASE_URL);
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            const credentials = btoa(`${this.config.config.ONET_API_USERNAME}:${this.config.config.ONET_API_PASSWORD}`);
            
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`O*NET API error: ${response.status}`);
            }

            const data = await response.json();
            this.rateLimiter.recordRequest();
            
            return data;
        } catch (error) {
            console.error('O*NET API request failed:', error);
            throw error;
        }
    }

    // Fuzzy search for skills
    findMatchingSkills(inputSkills, limit = 10) {
        if (!this.isInitialized || !this.skillsDatabase) {
            console.warn('O*NET service not initialized');
            return [];
        }

        const matches = [];
        
        for (const inputSkill of inputSkills) {
            const skillMatches = this.skillsDatabase
                .map(skill => ({
                    skill: skill,
                    similarity: this.calculateSimilarity(inputSkill, skill)
                }))
                .filter(match => match.similarity >= this.matchThreshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3); // Top 3 matches per input skill
            
            matches.push(...skillMatches);
        }

        // Remove duplicates and sort by similarity
        const uniqueMatches = Array.from(
            new Map(matches.map(match => [match.skill.element_id || match.skill.id, match])).values()
        );

        return uniqueMatches
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(match => ({
                inputSkill: this.findBestInputMatch(inputSkills, match.skill),
                matchedSkill: match.skill,
                similarity: match.similarity,
                category: match.skill.category,
                importance: match.skill.importance || 'medium'
            }));
    }

    // Find matching occupations based on skills
    findMatchingOccupations(skills, limit = 10) {
        if (!this.isInitialized || !this.occupationsDatabase) {
            console.warn('O*NET service not initialized');
            return [];
        }

        const matches = this.occupationsDatabase
            .map(occupation => ({
                occupation: occupation,
                relevance: this.calculateOccupationRelevance(skills, occupation)
            }))
            .filter(match => match.relevance > 0.3)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);

        return matches.map(match => ({
            occupation: match.occupation,
            relevance: match.relevance,
            matchingSkills: this.findOccupationSkillMatches(skills, match.occupation),
            code: match.occupation.code,
            title: match.occupation.title
        }));
    }

    // Get detailed occupation information
    async getOccupationDetails(onetCode) {
        const cacheKey = `occupation_details_${onetCode}`;
        let details = this.cache.get(cacheKey);
        
        if (!details) {
            try {
                if (this.config.isConfigured('onet')) {
                    details = await this.fetchOccupationDetails(onetCode);
                    this.cache.set(cacheKey, details);
                } else {
                    details = this.getBasicOccupationDetails(onetCode);
                }
            } catch (error) {
                console.error('Error fetching occupation details:', error);
                details = this.getBasicOccupationDetails(onetCode);
            }
        }
        
        return details;
    }

    // Fetch detailed occupation data from API
    async fetchOccupationDetails(onetCode) {
        try {
            const [summary, skills, tasks, wages] = await Promise.all([
                this.makeONETRequest(`online/occupations/${onetCode}/summary`),
                this.makeONETRequest(`online/occupations/${onetCode}/skills`),
                this.makeONETRequest(`online/occupations/${onetCode}/tasks`),
                this.makeONETRequest(`online/occupations/${onetCode}/wages`).catch(() => null)
            ]);

            return {
                code: onetCode,
                summary: summary,
                skills: skills.skill || [],
                knowledge: skills.knowledge || [],
                abilities: skills.ability || [],
                tasks: tasks.task || [],
                wages: wages,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching occupation details:', error);
            return null;
        }
    }

    // Calculate skill similarity using multiple algorithms
    calculateSimilarity(input, onetSkill) {
        const skillName = onetSkill.element_name || onetSkill.name || '';
        const skillDescription = onetSkill.description || '';
        const searchTerms = onetSkill.searchTerms || [];
        
        // Multiple similarity measures
        const nameExact = this.exactMatch(input.toLowerCase(), skillName.toLowerCase()) ? 1.0 : 0;
        const nameContains = skillName.toLowerCase().includes(input.toLowerCase()) ? 0.8 : 0;
        const inputContainsName = input.toLowerCase().includes(skillName.toLowerCase()) ? 0.7 : 0;
        const descriptionContains = skillDescription.toLowerCase().includes(input.toLowerCase()) ? 0.6 : 0;
        const searchTermsMatch = Math.max(...searchTerms.map(term => 
            this.stringDistance(input.toLowerCase(), term.toLowerCase())
        ), 0);
        const levenshtein = this.stringDistance(input.toLowerCase(), skillName.toLowerCase());
        
        // Weighted combination
        const similarity = Math.max(
            nameExact,
            nameContains,
            inputContainsName,
            descriptionContains,
            searchTermsMatch,
            levenshtein
        );
        
        return similarity;
    }

    // Calculate occupation relevance based on skills
    calculateOccupationRelevance(inputSkills, occupation) {
        if (!occupation.skills) {
            // Use title matching if skills not available
            return Math.max(...inputSkills.map(skill => 
                this.stringDistance(skill.toLowerCase(), occupation.title.toLowerCase())
            ), 0) * 0.5;
        }

        const skillMatches = inputSkills.map(inputSkill => {
            const bestMatch = Math.max(...occupation.skills.map(occSkill => 
                this.calculateSimilarity(inputSkill, occSkill)
            ), 0);
            return bestMatch;
        });

        const averageMatch = skillMatches.reduce((sum, match) => sum + match, 0) / skillMatches.length;
        const maxMatch = Math.max(...skillMatches);
        
        // Weighted combination favoring both average and best matches
        return (averageMatch * 0.6) + (maxMatch * 0.4);
    }

    // String distance calculation (Jaro-Winkler inspired)
    stringDistance(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        const maxLength = Math.max(str1.length, str2.length);
        const distance = this.levenshteinDistance(str1, str2);
        
        return Math.max(0, (maxLength - distance) / maxLength);
    }

    // Levenshtein distance
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill());
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,      // insertion
                    matrix[j - 1][i] + 1,      // deletion
                    matrix[j - 1][i - 1] + cost // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Exact match helper
    exactMatch(str1, str2) {
        return str1 === str2;
    }

    // Generate search terms for better matching
    generateSearchTerms(text) {
        if (!text) return [];
        
        const terms = [];
        const words = text.toLowerCase().split(/\s+/);
        
        // Add original text
        terms.push(text.toLowerCase());
        
        // Add individual words
        terms.push(...words);
        
        // Add common abbreviations and variations
        const variations = this.getCommonVariations(text.toLowerCase());
        terms.push(...variations);
        
        // Remove duplicates and empty strings
        return [...new Set(terms)].filter(term => term.length > 0);
    }

    // Get common variations for skills and occupations
    getCommonVariations(text) {
        const variations = [];
        
        // Common skill variations
        const skillVariations = {
            'javascript': ['js', 'ecmascript'],
            'typescript': ['ts'],
            'python': ['py'],
            'artificial intelligence': ['ai', 'machine learning', 'ml'],
            'user experience': ['ux', 'user interface', 'ui'],
            'project management': ['pm', 'project manager'],
            'customer service': ['customer support', 'client service'],
            'data analysis': ['data analytics', 'business intelligence', 'bi'],
            'software development': ['programming', 'coding', 'software engineering'],
            'communication': ['verbal communication', 'written communication'],
            'leadership': ['team leadership', 'management', 'supervision']
        };
        
        for (const [key, vars] of Object.entries(skillVariations)) {
            if (text.includes(key)) {
                variations.push(...vars);
            }
            vars.forEach(variation => {
                if (text.includes(variation)) {
                    variations.push(key);
                }
            });
        }
        
        return variations;
    }

    // Find best input match for a skill
    findBestInputMatch(inputSkills, onetSkill) {
        let bestMatch = '';
        let bestSimilarity = 0;
        
        for (const inputSkill of inputSkills) {
            const similarity = this.calculateSimilarity(inputSkill, onetSkill);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = inputSkill;
            }
        }
        
        return bestMatch;
    }

    // Find occupation skill matches
    findOccupationSkillMatches(inputSkills, occupation) {
        if (!occupation.skills) return [];
        
        return inputSkills
            .map(inputSkill => {
                const matches = occupation.skills
                    .map(occSkill => ({
                        skill: occSkill,
                        similarity: this.calculateSimilarity(inputSkill, occSkill)
                    }))
                    .filter(match => match.similarity >= this.matchThreshold)
                    .sort((a, b) => b.similarity - a.similarity);
                
                return matches.length > 0 ? {
                    inputSkill: inputSkill,
                    matches: matches.slice(0, 2) // Top 2 matches
                } : null;
            })
            .filter(match => match !== null);
    }

    // Get basic occupation details (fallback)
    getBasicOccupationDetails(onetCode) {
        const occupation = this.occupationsDatabase?.find(occ => occ.code === onetCode);
        
        if (occupation) {
            return {
                code: onetCode,
                title: occupation.title,
                description: occupation.description || 'No description available',
                skills: [],
                tasks: [],
                wages: null,
                source: 'cached_data'
            };
        }
        
        return null;
    }

    // Initialize fallback data for offline operation
    initializeFallbackData() {
        this.skillsDatabase = this.getEmbeddedSkillsData();
        this.occupationsDatabase = this.getEmbeddedOccupationsData();
        this.isInitialized = true;
    }

    // Embedded skills data (essential skills for offline operation)
    getEmbeddedSkillsData() {
        return [
            {
                element_id: 'SK001',
                element_name: 'Active Listening',
                description: 'Giving full attention to what other people are saying',
                category: 'skills',
                importance: 'high',
                searchTerms: ['active listening', 'listening', 'communication', 'attention']
            },
            {
                element_id: 'SK002',
                element_name: 'Critical Thinking',
                description: 'Using logic and reasoning to identify solutions',
                category: 'skills',
                importance: 'high',
                searchTerms: ['critical thinking', 'logic', 'reasoning', 'problem solving', 'analysis']
            },
            {
                element_id: 'SK003',
                element_name: 'Complex Problem Solving',
                description: 'Identifying complex problems and implementing solutions',
                category: 'skills',
                importance: 'high',
                searchTerms: ['problem solving', 'troubleshooting', 'solutions', 'analysis']
            },
            {
                element_id: 'SK004',
                element_name: 'Programming',
                description: 'Writing computer programs for various purposes',
                category: 'skills',
                importance: 'high',
                searchTerms: ['programming', 'coding', 'software development', 'javascript', 'python', 'java']
            },
            {
                element_id: 'SK005',
                element_name: 'Project Management',
                description: 'Planning and executing projects within constraints',
                category: 'skills',
                importance: 'medium',
                searchTerms: ['project management', 'planning', 'coordination', 'pm', 'organization']
            }
        ];
    }

    // Embedded occupations data (common tech occupations)
    getEmbeddedOccupationsData() {
        return [
            {
                code: '15-1252.00',
                title: 'Software Developers, Applications',
                description: 'Develop and test software applications',
                skills: ['Programming', 'Critical Thinking', 'Complex Problem Solving'],
                searchTerms: ['software developer', 'programmer', 'application developer', 'developer']
            },
            {
                code: '15-1254.00',
                title: 'Web Developers',
                description: 'Design and create websites',
                skills: ['Programming', 'Critical Thinking', 'Active Listening'],
                searchTerms: ['web developer', 'frontend developer', 'backend developer', 'full stack']
            },
            {
                code: '15-1244.00',
                title: 'Network and Computer Systems Administrators',
                description: 'Install, configure, and maintain networks',
                skills: ['Critical Thinking', 'Complex Problem Solving', 'Active Listening'],
                searchTerms: ['system administrator', 'network admin', 'it admin', 'sysadmin']
            },
            {
                code: '11-3021.00',
                title: 'Computer and Information Systems Managers',
                description: 'Plan and coordinate computer-related activities',
                skills: ['Project Management', 'Critical Thinking', 'Active Listening'],
                searchTerms: ['it manager', 'technology manager', 'systems manager', 'cto']
            }
        ];
    }

    // Public API methods
    async searchSkills(query, limit = 10) {
        await this.ensureInitialized();
        return this.findMatchingSkills([query], limit);
    }

    async searchOccupations(query, limit = 10) {
        await this.ensureInitialized();
        
        // Search by title similarity
        const matches = this.occupationsDatabase
            .map(occ => ({
                occupation: occ,
                similarity: this.stringDistance(query.toLowerCase(), occ.title.toLowerCase())
            }))
            .filter(match => match.similarity >= 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return matches.map(match => ({
            code: match.occupation.code,
            title: match.occupation.title,
            description: match.occupation.description,
            similarity: match.similarity
        }));
    }

    async analyzeSkillsToOccupations(skills) {
        await this.ensureInitialized();
        
        return {
            matchingOccupations: this.findMatchingOccupations(skills),
            skillMatches: this.findMatchingSkills(skills),
            recommendations: this.generateRecommendations(skills),
            timestamp: new Date().toISOString()
        };
    }

    generateRecommendations(skills) {
        const recommendations = [];
        
        // Analyze skill gaps
        const techSkills = skills.filter(skill => 
            this.isTechnicalSkill(skill)
        );
        
        const softSkills = skills.filter(skill => 
            this.isSoftSkill(skill)
        );

        if (techSkills.length < 3) {
            recommendations.push({
                type: 'skill_development',
                priority: 'high',
                message: 'Consider developing more technical skills to increase job market competitiveness'
            });
        }

        if (softSkills.length < 2) {
            recommendations.push({
                type: 'skill_development',
                priority: 'medium',
                message: 'Soft skills like communication and leadership are valuable in most roles'
            });
        }

        return recommendations;
    }

    isTechnicalSkill(skill) {
        const techKeywords = ['programming', 'software', 'data', 'analysis', 'technical', 'computer', 'web', 'database'];
        return techKeywords.some(keyword => skill.toLowerCase().includes(keyword));
    }

    isSoftSkill(skill) {
        const softKeywords = ['communication', 'leadership', 'teamwork', 'management', 'organization', 'creative'];
        return softKeywords.some(keyword => skill.toLowerCase().includes(keyword));
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initializeBasicData();
        }
    }

    // Get service status
    getServiceStatus() {
        return {
            initialized: this.isInitialized,
            skillsLoaded: !!this.skillsDatabase,
            occupationsLoaded: !!this.occupationsDatabase,
            skillsCount: this.skillsDatabase?.length || 0,
            occupationsCount: this.occupationsDatabase?.length || 0,
            apiConfigured: this.config.isConfigured('onet'),
            cacheSize: this.cache.size()
        };
    }
}