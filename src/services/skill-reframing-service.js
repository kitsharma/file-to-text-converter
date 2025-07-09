// Skill Reframing Service - OpenAI Integration for AI-Enhanced Career Transitions
class SkillReframingService {
    constructor() {
        this.config = apiConfig;
        this.cache = apiCache;
        this.rateLimiter = rateLimiter;
        this.costTracker = costTracker;
        
        this.models = {
            primary: 'gpt-4',
            fallback: 'gpt-3.5-turbo'
        };
        
        this.prompts = {
            skillReframing: `You are a career transition expert specializing in helping professionals understand how their existing skills translate to AI-enhanced roles. 

Your task is to reframe traditional skills in terms of their AI-era relevance, focusing on:
1. How each skill complements AI tools and automation
2. The human elements that remain irreplaceable
3. Growth opportunities in AI-augmented environments
4. Confidence-building language that empowers career transitions

For each skill provided, return a JSON object with:
- originalSkill: the input skill
- aiRelevantDescription: how this skill applies in AI contexts
- complementaryAITools: what AI tools enhance this skill
- humanAdvantage: what humans bring that AI cannot
- growthPath: how to develop this skill further
- confidenceBooster: encouraging insight about skill value
- marketDemand: current market demand level (high/medium/low)
- examples: 2-3 concrete examples of application

Use encouraging, human-centered language. Avoid technical jargon. Focus on empowerment and possibility.`,

            careerPathSuggestion: `You are a career counselor specializing in AI-era career transitions. Based on the provided skills and background, suggest potential career paths that leverage both human strengths and AI tools.

Provide practical, actionable career suggestions that:
1. Build on existing strengths
2. Incorporate AI as an enhancement tool
3. Focus on human-AI collaboration
4. Include specific next steps
5. Address skill gaps with learning suggestions

Format response as JSON with career path objects containing:
- title: career path name
- description: what this role entails
- skillMatch: percentage match with current skills
- aiToolsUsed: specific AI tools relevant to this path
- humanSkillsEmphasized: which human skills are most important
- learningPath: specific steps to transition
- timeframe: realistic timeline for transition
- salaryRange: expected salary range
- growthOutlook: career growth potential`,

            skillGapAnalysis: `You are a learning and development specialist. Analyze the provided skills against target roles and identify learning opportunities that emphasize human-AI collaboration.

For each skill gap identified, provide:
- gapArea: the specific skill or knowledge gap
- importance: critical/important/nice-to-have
- learningApproach: how to best acquire this skill
- aiSynergy: how this skill works with AI tools
- resources: specific learning resources or approaches
- timeEstimate: realistic time to acquire competency
- practiceOpportunities: ways to practice and validate learning

Focus on encouraging growth mindset and practical learning paths.`
        };
    }

    // Main skill reframing function
    async reframeSkillsForAI(skills, context = {}) {
        if (!this.config.isConfigured('openai')) {
            throw new Error('OpenAI API key not configured');
        }

        if (!Array.isArray(skills) || skills.length === 0) {
            throw new Error('Skills array is required and cannot be empty');
        }

        const cacheKey = this.cache.generateKey('skill-reframing', { 
            skills: skills.sort().join(','), 
            context 
        });
        
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        // Cost estimation
        const estimatedTokens = this.estimateTokens(skills, this.prompts.skillReframing);
        const estimatedCost = this.estimateCost(estimatedTokens);
        
        const costCheck = this.costTracker.canMakeRequest(estimatedCost);
        if (!costCheck.allowed) {
            throw new Error(`Cost limit exceeded: ${costCheck.reason}`);
        }

        const rateLimitCheck = this.rateLimiter.canMakeRequest();
        if (!rateLimitCheck.allowed) {
            throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        }

        try {
            const prompt = this.buildSkillReframingPrompt(skills, context);
            const response = await this.callOpenAI(prompt, this.models.primary);
            
            const reframedSkills = this.parseSkillReframingResponse(response);
            
            // Track usage
            this.rateLimiter.recordRequest();
            this.costTracker.addCost(estimatedCost);
            this.cache.set(cacheKey, reframedSkills);
            
            return reframedSkills;
            
        } catch (error) {
            console.error('Skill reframing error:', error);
            
            // Try fallback model
            if (error.message.includes('model') || error.message.includes('token')) {
                try {
                    const prompt = this.buildSkillReframingPrompt(skills, context);
                    const response = await this.callOpenAI(prompt, this.models.fallback);
                    const reframedSkills = this.parseSkillReframingResponse(response);
                    
                    this.rateLimiter.recordRequest();
                    this.costTracker.addCost(estimatedCost * 0.1); // Cheaper model
                    this.cache.set(cacheKey, reframedSkills);
                    
                    return reframedSkills;
                } catch (fallbackError) {
                    console.error('Fallback model also failed:', fallbackError);
                    throw fallbackError;
                }
            }
            
            throw error;
        }
    }

    // Suggest career paths based on skills
    async suggestCareerPaths(skills, background = {}, preferences = {}) {
        if (!this.config.isConfigured('openai')) {
            throw new Error('OpenAI API key not configured');
        }

        const cacheKey = this.cache.generateKey('career-paths', { 
            skills: skills.sort().join(','), 
            background,
            preferences 
        });
        
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const prompt = this.buildCareerPathPrompt(skills, background, preferences);
            const response = await this.callOpenAI(prompt, this.models.primary);
            
            const careerPaths = this.parseCareerPathResponse(response);
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, careerPaths);
            
            return careerPaths;
            
        } catch (error) {
            console.error('Career path suggestion error:', error);
            throw error;
        }
    }

    // Analyze skill gaps for target role
    async analyzeSkillGaps(currentSkills, targetRole, industryContext = '') {
        if (!this.config.isConfigured('openai')) {
            throw new Error('OpenAI API key not configured');
        }

        const cacheKey = this.cache.generateKey('skill-gaps', { 
            currentSkills: currentSkills.sort().join(','), 
            targetRole,
            industryContext 
        });
        
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const prompt = this.buildSkillGapPrompt(currentSkills, targetRole, industryContext);
            const response = await this.callOpenAI(prompt, this.models.primary);
            
            const gapAnalysis = this.parseSkillGapResponse(response);
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, gapAnalysis);
            
            return gapAnalysis;
            
        } catch (error) {
            console.error('Skill gap analysis error:', error);
            throw error;
        }
    }

    // Build prompts
    buildSkillReframingPrompt(skills, context) {
        const contextInfo = context.industry ? `Industry context: ${context.industry}\n` : '';
        const experienceInfo = context.experience ? `Experience level: ${context.experience}\n` : '';
        const goalsInfo = context.goals ? `Career goals: ${context.goals}\n` : '';
        
        return `${this.prompts.skillReframing}

${contextInfo}${experienceInfo}${goalsInfo}
Skills to reframe: ${skills.join(', ')}

Provide a JSON response with an array of reframed skills. Be encouraging and specific about AI-era opportunities.`;
    }

    buildCareerPathPrompt(skills, background, preferences) {
        const backgroundInfo = Object.entries(background)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        
        const preferencesInfo = Object.entries(preferences)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        return `${this.prompts.careerPathSuggestion}

Current skills: ${skills.join(', ')}

Background:
${backgroundInfo}

Preferences:
${preferencesInfo}

Suggest 3-5 realistic career paths that build on existing strengths and incorporate AI tools effectively.`;
    }

    buildSkillGapPrompt(currentSkills, targetRole, industryContext) {
        return `${this.prompts.skillGapAnalysis}

Current skills: ${currentSkills.join(', ')}
Target role: ${targetRole}
Industry context: ${industryContext}

Identify the key skill gaps and provide a learning roadmap that emphasizes human-AI collaboration.`;
    }

    // OpenAI API call
    async callOpenAI(prompt, model = 'gpt-4') {
        const response = await fetch(`${this.config.config.OPENAI_API_BASE_URL}chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.getApiKey('openai')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful career counselor specializing in AI-era skill development and career transitions.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Response parsers
    parseSkillReframingResponse(response) {
        try {
            const parsed = JSON.parse(response);
            
            // Validate structure
            if (!parsed.skills || !Array.isArray(parsed.skills)) {
                throw new Error('Invalid response structure');
            }

            return {
                reframedSkills: parsed.skills.map(skill => ({
                    originalSkill: skill.originalSkill || '',
                    aiRelevantDescription: skill.aiRelevantDescription || '',
                    complementaryAITools: skill.complementaryAITools || [],
                    humanAdvantage: skill.humanAdvantage || '',
                    growthPath: skill.growthPath || '',
                    confidenceBooster: skill.confidenceBooster || '',
                    marketDemand: skill.marketDemand || 'medium',
                    examples: skill.examples || []
                })),
                timestamp: new Date().toISOString(),
                confidence: this.calculateResponseConfidence(parsed.skills)
            };
        } catch (error) {
            console.error('Error parsing skill reframing response:', error);
            return {
                reframedSkills: [],
                error: 'Failed to parse AI response',
                timestamp: new Date().toISOString()
            };
        }
    }

    parseCareerPathResponse(response) {
        try {
            const parsed = JSON.parse(response);
            
            return {
                careerPaths: parsed.careerPaths || [],
                timestamp: new Date().toISOString(),
                confidence: this.calculateResponseConfidence(parsed.careerPaths)
            };
        } catch (error) {
            console.error('Error parsing career path response:', error);
            return {
                careerPaths: [],
                error: 'Failed to parse AI response',
                timestamp: new Date().toISOString()
            };
        }
    }

    parseSkillGapResponse(response) {
        try {
            const parsed = JSON.parse(response);
            
            return {
                skillGaps: parsed.skillGaps || [],
                learningPlan: parsed.learningPlan || {},
                timestamp: new Date().toISOString(),
                confidence: this.calculateResponseConfidence(parsed.skillGaps)
            };
        } catch (error) {
            console.error('Error parsing skill gap response:', error);
            return {
                skillGaps: [],
                error: 'Failed to parse AI response',
                timestamp: new Date().toISOString()
            };
        }
    }

    // Utility methods
    estimateTokens(skills, prompt) {
        // Rough estimation: 1 token ≈ 4 characters
        const skillsText = skills.join(', ');
        const totalText = prompt + skillsText;
        return Math.ceil(totalText.length / 4) + 500; // Add buffer for response
    }

    estimateCost(tokens, model = 'gpt-4') {
        const costs = this.config.getEstimatedCosts().openai;
        const modelCosts = costs[model] || costs['gpt-4'];
        
        const inputCost = (tokens * modelCosts.input) / 1000;
        const outputCost = (500 * modelCosts.output) / 1000; // Estimate output tokens
        
        return inputCost + outputCost;
    }

    calculateResponseConfidence(items) {
        if (!Array.isArray(items) || items.length === 0) return 0;
        
        // Simple confidence calculation based on completeness
        const avgCompleteness = items.reduce((sum, item) => {
            const fields = Object.values(item).filter(value => 
                value && value.toString().length > 0
            ).length;
            return sum + fields;
        }, 0) / items.length;
        
        return Math.min(1, avgCompleteness / 8); // Assume 8 expected fields
    }

    // Batch processing for multiple skill sets
    async batchReframeSkills(skillSets, context = {}) {
        const results = [];
        
        for (const skillSet of skillSets) {
            try {
                const result = await this.reframeSkillsForAI(skillSet.skills, {
                    ...context,
                    ...skillSet.context
                });
                
                results.push({
                    id: skillSet.id || `skillset_${results.length}`,
                    skills: skillSet.skills,
                    result: result,
                    status: 'success'
                });
                
                // Add delay to respect rate limits
                await this.delay(1000);
                
            } catch (error) {
                results.push({
                    id: skillSet.id || `skillset_${results.length}`,
                    skills: skillSet.skills,
                    error: error.message,
                    status: 'error'
                });
            }
        }
        
        return results;
    }

    // Generate skill development plan
    async generateSkillDevelopmentPlan(currentSkills, targetGoals) {
        try {
            const [reframed, gaps, paths] = await Promise.all([
                this.reframeSkillsForAI(currentSkills),
                this.analyzeSkillGaps(currentSkills, targetGoals.role || 'AI-enhanced role'),
                this.suggestCareerPaths(currentSkills, targetGoals)
            ]);

            return {
                currentSkillsAnalysis: reframed,
                skillGaps: gaps,
                careerPaths: paths,
                developmentPlan: this.createDevelopmentTimeline(gaps, reframed),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating development plan:', error);
            throw error;
        }
    }

    createDevelopmentTimeline(gaps, reframed) {
        // Create a basic development timeline based on gap analysis
        const timeline = {
            immediate: [], // 0-3 months
            shortTerm: [], // 3-6 months
            mediumTerm: [], // 6-12 months
            longTerm: []   // 12+ months
        };

        if (gaps.skillGaps) {
            gaps.skillGaps.forEach(gap => {
                const timeframe = gap.timeEstimate || 'medium';
                
                if (timeframe.includes('week') || timeframe.includes('month') && parseInt(timeframe) <= 3) {
                    timeline.immediate.push(gap);
                } else if (timeframe.includes('month') && parseInt(timeframe) <= 6) {
                    timeline.shortTerm.push(gap);
                } else if (timeframe.includes('month') && parseInt(timeframe) <= 12) {
                    timeline.mediumTerm.push(gap);
                } else {
                    timeline.longTerm.push(gap);
                }
            });
        }

        return timeline;
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
            configured: this.config.isConfigured('openai')
        };
    }
}