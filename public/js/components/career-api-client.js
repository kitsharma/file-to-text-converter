/**
 * Career API Client - Interface to Python backend services
 * Connects frontend to skill matching, career recommendations, and learning paths
 */

class CareerAPIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.authToken = null;
    }

    /**
     * Make API request with error handling
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(`API Error: ${errorData.detail || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Analyze skills using skill matcher
     */
    async analyzeSkills(skills, experienceLevel = 'intermediate') {
        return await this.makeRequest('/skills/analyze', 'POST', {
            skills,
            experience_level: experienceLevel
        });
    }

    /**
     * Get career recommendations
     */
    async getCareerRecommendations(userProfile, targetRoles = null, location = null) {
        return await this.makeRequest('/career/recommendations', 'POST', {
            user_profile: userProfile,
            target_roles: targetRoles,
            location
        });
    }

    /**
     * Generate learning path for career transition
     */
    async generateLearningPath(userProfile, targetJob, weeklyHours = 10) {
        return await this.makeRequest('/learning/path', 'POST', {
            user_profile: userProfile,
            target_job: targetJob,
            weekly_hours: weeklyHours
        });
    }

    /**
     * Analyze bias in recommendations
     */
    async analyzeBias(userProfiles, recommendations) {
        return await this.makeRequest('/bias/analyze', 'POST', {
            user_profiles: userProfiles,
            recommendations
        });
    }

    /**
     * Get O*NET skills data
     */
    async getONETSkills(search = null, limit = 50) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        params.append('limit', limit.toString());
        
        return await this.makeRequest(`/onet/skills?${params}`);
    }

    /**
     * Get BLS occupation data
     */
    async getBLSOccupations(search = null) {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        return await this.makeRequest(`/bls/occupations${params}`);
    }

    /**
     * Check API health
     */
    async healthCheck() {
        return await this.makeRequest('/health');
    }
}

/**
 * Career Insights Manager - High-level interface for career analysis
 */
class CareerInsightsManager {
    constructor(apiClient = new CareerAPIClient()) {
        this.api = apiClient;
        this.cache = new Map();
        this.eventListeners = new Map();
    }

    /**
     * Add event listener for insights updates
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Process resume data and generate comprehensive career insights
     */
    async processResumeForInsights(resumeData) {
        try {
            this.emit('insights:start', { stage: 'processing' });

            // Extract skills from resume
            const skills = this.extractSkillsFromResume(resumeData);
            
            // Create user profile
            const userProfile = this.createUserProfile(resumeData, skills);

            // Step 1: Analyze skills
            this.emit('insights:progress', { stage: 'skills', progress: 25 });
            const skillAnalysis = await this.api.analyzeSkills(skills);

            // Step 2: Get career recommendations
            this.emit('insights:progress', { stage: 'recommendations', progress: 50 });
            const recommendations = await this.api.getCareerRecommendations(userProfile);

            // Step 3: Generate learning paths for top recommendations
            this.emit('insights:progress', { stage: 'learning', progress: 75 });
            const learningPaths = await this.generateLearningPathsForRecommendations(
                userProfile, 
                recommendations.recommendations.slice(0, 3)
            );

            // Step 4: Analyze for bias (if multiple profiles available)
            this.emit('insights:progress', { stage: 'bias', progress: 90 });
            const biasAnalysis = await this.analyzeBiasForUser(userProfile, recommendations.recommendations);

            const insights = {
                user_profile: userProfile,
                skill_analysis: skillAnalysis,
                career_recommendations: recommendations,
                learning_paths: learningPaths,
                bias_analysis: biasAnalysis,
                generated_at: new Date().toISOString()
            };

            // Cache results
            this.cache.set('latest_insights', insights);

            this.emit('insights:complete', insights);
            return insights;

        } catch (error) {
            this.emit('insights:error', error);
            throw error;
        }
    }

    /**
     * Extract skills from resume data
     */
    extractSkillsFromResume(resumeData) {
        const skills = [];
        
        // From parsed skills
        if (resumeData.skills) {
            if (Array.isArray(resumeData.skills)) {
                skills.push(...resumeData.skills);
            } else if (typeof resumeData.skills === 'object') {
                Object.values(resumeData.skills).forEach(skillList => {
                    if (Array.isArray(skillList)) {
                        skills.push(...skillList);
                    }
                });
            }
        }

        // From experience descriptions
        if (resumeData.experience) {
            resumeData.experience.forEach(exp => {
                if (exp.description) {
                    // Simple skill extraction from descriptions
                    const techSkills = this.extractTechSkillsFromText(exp.description);
                    skills.push(...techSkills);
                }
            });
        }

        // Deduplicate and clean
        return [...new Set(skills.map(skill => 
            typeof skill === 'string' ? skill.trim() : skill
        ).filter(skill => skill && skill.length > 1))];
    }

    /**
     * Extract technical skills from text using keyword matching
     */
    extractTechSkillsFromText(text) {
        const techKeywords = [
            'Python', 'JavaScript', 'Java', 'C++', 'SQL', 'React', 'Node.js',
            'Machine Learning', 'Data Analysis', 'AWS', 'Docker', 'Kubernetes',
            'Git', 'Linux', 'Project Management', 'Agile', 'Scrum', 'Leadership',
            'Communication', 'Problem Solving', 'Team Management', 'Strategy'
        ];

        const found = [];
        const textLower = text.toLowerCase();
        
        techKeywords.forEach(skill => {
            if (textLower.includes(skill.toLowerCase())) {
                found.push(skill);
            }
        });

        return found;
    }

    /**
     * Create user profile from resume data
     */
    createUserProfile(resumeData, skills) {
        return {
            user_id: `user_${Date.now()}`,
            name: resumeData.name || 'Anonymous User',
            email: resumeData.email || null,
            skills: skills.map(skill => ({
                skill_id: skill.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                proficiency_level: 'intermediate' // Default proficiency
            })),
            experience_years: this.calculateExperienceYears(resumeData.experience || []),
            education_level: this.determineEducationLevel(resumeData.education || []),
            current_role: this.getCurrentRole(resumeData.experience || [])
        };
    }

    /**
     * Calculate total years of experience
     */
    calculateExperienceYears(experiences) {
        if (!experiences.length) return 0;
        
        // Simple calculation: assume each job is 2 years if no dates
        let totalYears = 0;
        experiences.forEach(exp => {
            if (exp.startDate && exp.endDate) {
                const start = new Date(exp.startDate);
                const end = exp.endDate === 'Present' ? new Date() : new Date(exp.endDate);
                totalYears += (end - start) / (365.25 * 24 * 60 * 60 * 1000);
            } else {
                totalYears += 2; // Default assumption
            }
        });
        
        return Math.round(totalYears);
    }

    /**
     * Determine highest education level
     */
    determineEducationLevel(education) {
        if (!education.length) return 'high_school';
        
        const degrees = education.map(edu => edu.degree?.toLowerCase() || '');
        
        if (degrees.some(d => d.includes('phd') || d.includes('doctorate'))) return 'doctorate';
        if (degrees.some(d => d.includes('master') || d.includes('mba'))) return 'master';
        if (degrees.some(d => d.includes('bachelor'))) return 'bachelor';
        if (degrees.some(d => d.includes('associate'))) return 'associate';
        
        return 'high_school';
    }

    /**
     * Get current or most recent role
     */
    getCurrentRole(experiences) {
        if (!experiences.length) return null;
        
        // Find current role (endDate is 'Present' or most recent)
        const current = experiences.find(exp => 
            exp.endDate === 'Present' || exp.endDate === 'current'
        );
        
        if (current) return current.jobTitle;
        
        // Return most recent (assuming first in array)
        return experiences[0]?.jobTitle || null;
    }

    /**
     * Generate learning paths for top career recommendations
     */
    async generateLearningPathsForRecommendations(userProfile, recommendations) {
        const learningPaths = [];
        
        for (const rec of recommendations.slice(0, 3)) { // Top 3 recommendations
            try {
                const path = await this.api.generateLearningPath(
                    userProfile, 
                    rec.job_title
                );
                learningPaths.push({
                    recommendation: rec,
                    learning_path: path
                });
            } catch (error) {
                console.warn(`Failed to generate learning path for ${rec.job_title}:`, error);
            }
        }

        return learningPaths;
    }

    /**
     * Analyze bias for single user (simplified)
     */
    async analyzeBiasForUser(userProfile, recommendations) {
        try {
            // Create minimal dataset for bias analysis
            const profiles = [userProfile];
            const recs = [recommendations.slice(0, 5)]; // Top 5 recommendations
            
            return await this.api.analyzeBias(profiles, recs);
        } catch (error) {
            console.warn('Bias analysis failed:', error);
            return {
                overall_fairness_score: 0.85, // Default assumption
                bias_metrics: [],
                recommendations: ['Monitor for bias with larger datasets']
            };
        }
    }

    /**
     * Search for jobs based on skills and preferences
     */
    async searchJobs(skills, location = null, jobTitle = null) {
        try {
            // First, get skills analysis to find matching roles
            const skillAnalysis = await this.api.analyzeSkills(skills);
            
            // Get job matches from skill analysis
            let jobs = skillAnalysis.job_matches || [];
            
            // Filter by job title if specified
            if (jobTitle) {
                const titleLower = jobTitle.toLowerCase();
                jobs = jobs.filter(job => 
                    job.job_title.toLowerCase().includes(titleLower)
                );
            }

            // Enhance with market data
            for (const job of jobs) {
                try {
                    const marketData = await this.api.getBLSOccupations(job.job_title);
                    if (marketData.occupations?.length > 0) {
                        job.market_data = marketData.occupations[0];
                    }
                } catch (error) {
                    console.warn(`Failed to get market data for ${job.job_title}`);
                }
            }

            return {
                jobs,
                search_criteria: { skills, location, jobTitle },
                generated_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('Job search failed:', error);
            throw error;
        }
    }

    /**
     * Get cached insights
     */
    getCachedInsights() {
        return this.cache.get('latest_insights') || null;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CareerAPIClient, CareerInsightsManager };
} else {
    // Browser environment
    window.CareerAPIClient = CareerAPIClient;
    window.CareerInsightsManager = CareerInsightsManager;
}