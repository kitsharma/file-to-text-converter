// AI-Enhanced Job Matcher - Perplexity API Integration for Real-Time Job Search
class AIEnhancedJobMatcher {
    constructor() {
        this.config = apiConfig;
        this.cache = apiCache;
        this.rateLimiter = rateLimiter;
        this.costTracker = costTracker;
        
        this.models = {
            primary: 'mistral-7b-instruct',
            fallback: 'llama-2-70b-chat'
        };
        
        this.jobBoards = [
            'LinkedIn',
            'Indeed',
            'Glassdoor',
            'AngelList',
            'Stack Overflow Jobs',
            'GitHub Jobs',
            'RemoteOK',
            'We Work Remotely'
        ];

        this.searchPrompts = {
            jobSearch: `You are an expert job search assistant with real-time access to current job postings. Find and analyze relevant job opportunities based on the provided criteria.

Search for jobs that match:
- Role/Title: {role}
- Location: {location}
- Skills: {skills}
- Experience Level: {experience}
- Additional Preferences: {preferences}

For each job found, provide:
- jobTitle: exact job title
- company: company name
- location: job location (remote/hybrid/onsite)
- salaryRange: salary information if available
- description: brief job description (2-3 sentences)
- keyRequirements: top 3-5 required skills/qualifications
- matchScore: relevance score 0-100 based on provided criteria
- applicationUrl: direct link to apply
- postedDate: when the job was posted
- jobBoard: source where job was found
- aiInsights: why this job is a good match

Focus on current, active job postings from major job boards. Prioritize roles that offer growth opportunities and AI tool integration.`,

            marketAnalysis: `You are a labor market analyst. Analyze the current job market for the specified role and location, providing insights on:

Role: {role}
Location: {location}
Timeframe: Current market conditions

Provide analysis on:
- marketDemand: current demand level (high/medium/low)
- averageSalary: typical salary range for this role
- topCompanies: companies actively hiring for this role
- skillsInDemand: most requested skills in job postings
- marketTrends: recent trends affecting this role
- competitionLevel: how competitive the market is
- growthOutlook: future prospects for this role
- recommendations: actionable advice for job seekers

Base your analysis on recent job postings and market data.`,

            skillsMatching: `You are a skills matching expert. Analyze how well the candidate's skills align with current job market demands.

Candidate Skills: {candidateSkills}
Target Role: {targetRole}
Market Context: {location}

Provide:
- overallMatch: percentage match with market demands
- strongSkills: skills that are highly valued in current market
- skillGaps: skills missing that appear frequently in job postings
- emergingSkills: new skills gaining importance in this field
- skillPriority: which skills to focus on improving first
- marketAlignment: how well positioned the candidate is
- improvementSuggestions: specific ways to strengthen profile

Use current job posting data to inform your analysis.`
        };
    }

    // Main job search function
    async findRelevantJobs(role, location = 'Remote', skills = [], preferences = {}) {
        if (!this.config.isConfigured('perplexity')) {
            throw new Error('Perplexity API key not configured');
        }

        const searchCriteria = {
            role,
            location,
            skills: Array.isArray(skills) ? skills : [skills],
            experience: preferences.experience || 'mid-level',
            preferences: preferences
        };

        const cacheKey = this.cache.generateKey('job-search', searchCriteria);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        const rateLimitCheck = this.rateLimiter.canMakeRequest();
        if (!rateLimitCheck.allowed) {
            throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        }

        try {
            const prompt = this.buildJobSearchPrompt(searchCriteria);
            const response = await this.callPerplexityAPI(prompt);
            
            const jobResults = this.parseJobSearchResponse(response, searchCriteria);
            
            // Enrich with additional analysis
            const enrichedResults = await this.enrichJobResults(jobResults);
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, enrichedResults);
            
            return enrichedResults;
            
        } catch (error) {
            console.error('Job search error:', error);
            throw error;
        }
    }

    // Analyze job market for specific role/location
    async analyzeJobMarket(role, location = 'United States') {
        if (!this.config.isConfigured('perplexity')) {
            throw new Error('Perplexity API key not configured');
        }

        const cacheKey = this.cache.generateKey('market-analysis', { role, location });
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const prompt = this.buildMarketAnalysisPrompt(role, location);
            const response = await this.callPerplexityAPI(prompt);
            
            const marketAnalysis = this.parseMarketAnalysisResponse(response);
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, marketAnalysis);
            
            return marketAnalysis;
            
        } catch (error) {
            console.error('Market analysis error:', error);
            throw error;
        }
    }

    // Match candidate skills against market demands
    async analyzeSkillsMatch(candidateSkills, targetRole, location = 'Remote') {
        if (!this.config.isConfigured('perplexity')) {
            throw new Error('Perplexity API key not configured');
        }

        const cacheKey = this.cache.generateKey('skills-match', { 
            candidateSkills: candidateSkills.sort().join(','), 
            targetRole, 
            location 
        });
        
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const prompt = this.buildSkillsMatchPrompt(candidateSkills, targetRole, location);
            const response = await this.callPerplexityAPI(prompt);
            
            const skillsAnalysis = this.parseSkillsMatchResponse(response);
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, skillsAnalysis);
            
            return skillsAnalysis;
            
        } catch (error) {
            console.error('Skills match analysis error:', error);
            throw error;
        }
    }

    // Find companies actively hiring
    async findHiringCompanies(role, location = 'Remote', companySize = 'any') {
        try {
            const prompt = `Find companies currently hiring for ${role} positions in ${location}. 
            Focus on companies of ${companySize} size that are actively posting jobs.
            
            For each company provide:
            - Company name and brief description
            - Number of open positions for this role
            - Company culture and values
            - Benefits and perks offered
            - Application process insights
            - Growth opportunities
            
            Prioritize companies with strong reputations and growth potential.`;

            const response = await this.callPerplexityAPI(prompt);
            
            return this.parseHiringCompaniesResponse(response);
            
        } catch (error) {
            console.error('Error finding hiring companies:', error);
            throw error;
        }
    }

    // Get salary insights
    async getSalaryInsights(role, location = 'United States', experienceLevel = 'mid-level') {
        try {
            const prompt = `Provide current salary information for ${role} positions in ${location} 
            for ${experienceLevel} professionals.
            
            Include:
            - Salary ranges (base, total compensation)
            - Factors affecting salary (skills, company size, industry)
            - Negotiation insights
            - Benefits typically offered
            - Regional variations
            - Trends in compensation
            
            Use recent job posting data and salary surveys.`;

            const response = await this.callPerplexityAPI(prompt);
            
            return this.parseSalaryInsightsResponse(response);
            
        } catch (error) {
            console.error('Error getting salary insights:', error);
            throw error;
        }
    }

    // Build prompts
    buildJobSearchPrompt(criteria) {
        return this.searchPrompts.jobSearch
            .replace('{role}', criteria.role)
            .replace('{location}', criteria.location)
            .replace('{skills}', criteria.skills.join(', '))
            .replace('{experience}', criteria.experience)
            .replace('{preferences}', JSON.stringify(criteria.preferences));
    }

    buildMarketAnalysisPrompt(role, location) {
        return this.searchPrompts.marketAnalysis
            .replace('{role}', role)
            .replace('{location}', location);
    }

    buildSkillsMatchPrompt(candidateSkills, targetRole, location) {
        return this.searchPrompts.skillsMatching
            .replace('{candidateSkills}', candidateSkills.join(', '))
            .replace('{targetRole}', targetRole)
            .replace('{location}', location);
    }

    // Perplexity API call
    async callPerplexityAPI(prompt, model = null) {
        const selectedModel = model || this.models.primary;
        
        const response = await fetch(`${this.config.config.PERPLEXITY_API_BASE_URL}chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.getApiKey('perplexity')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI assistant with access to real-time job market data and current job postings.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Perplexity API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Response parsers
    parseJobSearchResponse(response, criteria) {
        try {
            // Try to parse as JSON first
            let jobs = [];
            
            if (response.startsWith('{') || response.startsWith('[')) {
                const parsed = JSON.parse(response);
                jobs = Array.isArray(parsed) ? parsed : parsed.jobs || [];
            } else {
                // Parse from text format
                jobs = this.extractJobsFromText(response);
            }

            return {
                jobs: jobs.map(job => this.validateJobObject(job)),
                searchCriteria: criteria,
                totalFound: jobs.length,
                timestamp: new Date().toISOString(),
                source: 'perplexity_ai'
            };
        } catch (error) {
            console.error('Error parsing job search response:', error);
            return {
                jobs: [],
                error: 'Failed to parse job search results',
                searchCriteria: criteria,
                timestamp: new Date().toISOString()
            };
        }
    }

    parseMarketAnalysisResponse(response) {
        try {
            // Extract structured data from response
            const analysis = {
                marketDemand: this.extractValue(response, ['market demand', 'demand level']),
                averageSalary: this.extractValue(response, ['average salary', 'salary range']),
                topCompanies: this.extractList(response, ['top companies', 'hiring companies']),
                skillsInDemand: this.extractList(response, ['skills in demand', 'required skills']),
                marketTrends: this.extractValue(response, ['market trends', 'trends']),
                competitionLevel: this.extractValue(response, ['competition', 'competitive']),
                growthOutlook: this.extractValue(response, ['growth outlook', 'future prospects']),
                recommendations: this.extractList(response, ['recommendations', 'advice']),
                timestamp: new Date().toISOString()
            };

            return analysis;
        } catch (error) {
            console.error('Error parsing market analysis response:', error);
            return {
                error: 'Failed to parse market analysis',
                timestamp: new Date().toISOString()
            };
        }
    }

    parseSkillsMatchResponse(response) {
        try {
            const analysis = {
                overallMatch: this.extractPercentage(response),
                strongSkills: this.extractList(response, ['strong skills', 'valued skills']),
                skillGaps: this.extractList(response, ['skill gaps', 'missing skills']),
                emergingSkills: this.extractList(response, ['emerging skills', 'new skills']),
                skillPriority: this.extractList(response, ['priority', 'focus on']),
                marketAlignment: this.extractValue(response, ['market alignment', 'positioned']),
                improvementSuggestions: this.extractList(response, ['suggestions', 'improve']),
                timestamp: new Date().toISOString()
            };

            return analysis;
        } catch (error) {
            console.error('Error parsing skills match response:', error);
            return {
                error: 'Failed to parse skills analysis',
                timestamp: new Date().toISOString()
            };
        }
    }

    // Utility parsers
    extractJobsFromText(text) {
        // Simple text parsing for job extraction
        const jobs = [];
        const jobBlocks = text.split(/\n\s*\n/);
        
        jobBlocks.forEach(block => {
            if (block.length > 50) { // Minimum content threshold
                const job = {
                    jobTitle: this.extractValue(block, ['title', 'position', 'role']),
                    company: this.extractValue(block, ['company', 'employer']),
                    location: this.extractValue(block, ['location', 'remote', 'onsite']),
                    description: block.substring(0, 200),
                    matchScore: Math.floor(Math.random() * 30) + 70, // Placeholder
                    source: 'text_extraction'
                };
                
                if (job.jobTitle && job.company) {
                    jobs.push(job);
                }
            }
        });
        
        return jobs;
    }

    extractValue(text, keywords) {
        for (const keyword of keywords) {
            const regex = new RegExp(`${keyword}[:\\s]*([^\\n\\.]+)`, 'i');
            const match = text.match(regex);
            if (match) {
                return match[1].trim();
            }
        }
        return 'Not specified';
    }

    extractList(text, keywords) {
        for (const keyword of keywords) {
            const regex = new RegExp(`${keyword}[:\\s]*([^\\n]+(?:\\n\\s*-[^\\n]+)*)`, 'i');
            const match = text.match(regex);
            if (match) {
                return match[1]
                    .split(/[\n,•-]/)
                    .map(item => item.trim())
                    .filter(item => item.length > 0)
                    .slice(0, 5); // Limit to 5 items
            }
        }
        return [];
    }

    extractPercentage(text) {
        const match = text.match(/(\d+)%/);
        return match ? parseInt(match[1]) : 75; // Default value
    }

    validateJobObject(job) {
        return {
            jobTitle: job.jobTitle || 'Title not specified',
            company: job.company || 'Company not specified',
            location: job.location || 'Location not specified',
            salaryRange: job.salaryRange || 'Salary not specified',
            description: job.description || 'No description available',
            keyRequirements: job.keyRequirements || [],
            matchScore: Math.min(100, Math.max(0, job.matchScore || 50)),
            applicationUrl: job.applicationUrl || '#',
            postedDate: job.postedDate || 'Recently',
            jobBoard: job.jobBoard || 'Various',
            aiInsights: job.aiInsights || 'Relevant opportunity'
        };
    }

    // Enrich job results with additional data
    async enrichJobResults(jobResults) {
        try {
            // Add market context and recommendations
            const enriched = {
                ...jobResults,
                marketContext: await this.getMarketContext(jobResults.searchCriteria),
                recommendations: this.generateJobRecommendations(jobResults.jobs),
                applicationTips: this.generateApplicationTips(jobResults.searchCriteria)
            };

            return enriched;
        } catch (error) {
            console.error('Error enriching job results:', error);
            return jobResults;
        }
    }

    async getMarketContext(criteria) {
        try {
            const market = await this.analyzeJobMarket(criteria.role, criteria.location);
            return {
                demandLevel: market.marketDemand,
                competitiveness: market.competitionLevel,
                trends: market.marketTrends
            };
        } catch (error) {
            return {
                demandLevel: 'moderate',
                competitiveness: 'competitive',
                trends: 'growing field'
            };
        }
    }

    generateJobRecommendations(jobs) {
        const highScoreJobs = jobs.filter(job => job.matchScore >= 80);
        const remoteJobs = jobs.filter(job => 
            job.location.toLowerCase().includes('remote')
        );
        
        return {
            topMatches: highScoreJobs.slice(0, 3),
            remoteOpportunities: remoteJobs.slice(0, 3),
            diverseOptions: jobs
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 5)
        };
    }

    generateApplicationTips(criteria) {
        return [
            `Highlight your ${criteria.skills.slice(0, 3).join(', ')} skills prominently`,
            'Customize your resume for each application',
            'Research company culture and values before applying',
            'Prepare specific examples demonstrating your experience',
            'Follow up professionally after applying'
        ];
    }

    // Batch job search for multiple roles
    async batchJobSearch(searchQueries) {
        const results = [];
        
        for (const query of searchQueries) {
            try {
                const result = await this.findRelevantJobs(
                    query.role,
                    query.location,
                    query.skills,
                    query.preferences
                );
                
                results.push({
                    query: query,
                    result: result,
                    status: 'success'
                });
                
                // Add delay to respect rate limits
                await this.delay(2000);
                
            } catch (error) {
                results.push({
                    query: query,
                    error: error.message,
                    status: 'error'
                });
            }
        }
        
        return results;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get service statistics
    getServiceStats() {
        return {
            requests: this.rateLimiter.getRemainingRequests(),
            costs: this.costTracker.getUsage(),
            cache: {
                size: this.cache.size(),
                maxSize: this.cache.maxSize
            },
            models: this.models,
            jobBoards: this.jobBoards,
            configured: this.config.isConfigured('perplexity')
        };
    }
}