// Government Data Service - BLS, O*NET, CareerOneStop Integration
class GovernmentDataService {
    constructor() {
        this.config = apiConfig;
        this.cache = apiCache;
        this.rateLimiter = rateLimiter;
        this.costTracker = costTracker;
        
        // Service health status
        this.serviceHealth = {
            bls: 'unknown',
            onet: 'unknown',
            careeronestop: 'unknown',
            lastChecked: null
        };
        
        // Initialize health check
        this.checkServiceHealth();
    }

    // BLS (Bureau of Labor Statistics) API Integration
    async getBLSData(seriesIds, startYear = null, endYear = null) {
        if (!this.config.isConfigured('bls')) {
            throw new Error('BLS API key not configured');
        }

        const cacheKey = this.cache.generateKey('bls', { seriesIds, startYear, endYear });
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const rateLimitCheck = this.rateLimiter.canMakeRequest();
        if (!rateLimitCheck.allowed) {
            throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        }

        try {
            const requestData = {
                seriesid: Array.isArray(seriesIds) ? seriesIds : [seriesIds],
                registrationkey: this.config.getApiKey('bls')
            };

            if (startYear && endYear) {
                requestData.startyear = startYear;
                requestData.endyear = endYear;
            }

            const response = await fetch(this.config.config.BLS_API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`BLS API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.status !== 'REQUEST_SUCCEEDED') {
                throw new Error(`BLS API request failed: ${data.message}`);
            }

            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error('BLS API Error:', error);
            throw error;
        }
    }

    // Get employment statistics for specific occupation
    async getOccupationEmploymentStats(occupationCode) {
        try {
            // Common BLS series IDs for occupation data
            const seriesIds = [
                `OEUS000000000000${occupationCode}01`, // Employment
                `OEUS000000000000${occupationCode}04`  // Mean wage
            ];

            const data = await this.getBLSData(seriesIds);
            
            return {
                employment: this.parseEmploymentData(data.Results.series[0]),
                wages: this.parseWageData(data.Results.series[1]),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting occupation employment stats:', error);
            return null;
        }
    }

    // O*NET API Integration
    async getONETData(endpoint, params = {}) {
        if (!this.config.isConfigured('onet')) {
            throw new Error('O*NET API credentials not configured');
        }

        const cacheKey = this.cache.generateKey(endpoint, params);
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            return cachedData;
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
                throw new Error(`O*NET API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error('O*NET API Error:', error);
            throw error;
        }
    }

    // Get occupation profile from O*NET
    async getOccupationProfile(onetCode) {
        try {
            const profile = await this.getONETData(`online/occupations/${onetCode}/summary`);
            const skills = await this.getONETData(`online/occupations/${onetCode}/skills`);
            const tasks = await this.getONETData(`online/occupations/${onetCode}/tasks`);
            const wages = await this.getONETData(`online/occupations/${onetCode}/wages`);
            
            return {
                basic: profile,
                skills: skills.skill || [],
                tasks: tasks.task || [],
                wages: wages,
                onetCode: onetCode,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting O*NET occupation profile:', error);
            return null;
        }
    }

    // Search occupations by keyword
    async searchOccupations(keyword, limit = 20) {
        try {
            const results = await this.getONETData('online/search', {
                keyword: keyword,
                end: limit
            });
            
            return {
                occupations: results.occupation || [],
                total: results.total || 0,
                keyword: keyword
            };
        } catch (error) {
            console.error('Error searching occupations:', error);
            return { occupations: [], total: 0, keyword };
        }
    }

    // Get skills for occupation
    async getOccupationSkills(onetCode) {
        try {
            const skillsData = await this.getONETData(`online/occupations/${onetCode}/skills`);
            const knowledgeData = await this.getONETData(`online/occupations/${onetCode}/knowledge`);
            const abilitiesData = await this.getONETData(`online/occupations/${onetCode}/abilities`);
            
            return {
                skills: this.normalizeSkillsData(skillsData.skill || []),
                knowledge: this.normalizeSkillsData(knowledgeData.knowledge || []),
                abilities: this.normalizeSkillsData(abilitiesData.ability || []),
                onetCode: onetCode
            };
        } catch (error) {
            console.error('Error getting occupation skills:', error);
            return null;
        }
    }

    // CareerOneStop API Integration
    async getCareerOneStopData(endpoint, params = {}) {
        if (!this.config.isConfigured('careeronestop')) {
            throw new Error('CareerOneStop API credentials not configured');
        }

        const cacheKey = this.cache.generateKey(endpoint, params);
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const rateLimitCheck = this.rateLimiter.canMakeRequest();
        if (!rateLimitCheck.allowed) {
            throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        }

        try {
            const url = new URL(endpoint, this.config.config.CAREERONESTOP_API_BASE_URL);
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${this.config.config.CAREERONESTOP_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`CareerOneStop API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            this.rateLimiter.recordRequest();
            this.cache.set(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error('CareerOneStop API Error:', error);
            throw error;
        }
    }

    // Get job market data for location
    async getJobMarketData(occupationCode, state = 'US', city = null) {
        try {
            const userId = this.config.config.CAREERONESTOP_USER_ID;
            let endpoint = `occupations/${userId}/${occupationCode}/${state}`;
            
            if (city) {
                endpoint += `/${city}`;
            }

            const data = await this.getCareerOneStopData(endpoint);
            
            return {
                occupation: data.OccupationDetails || [],
                employment: data.EmploymentData || [],
                wages: data.WageData || [],
                growth: data.GrowthData || [],
                location: { state, city },
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting job market data:', error);
            return null;
        }
    }

    // Get training programs
    async getTrainingPrograms(keyword, state = 'US', radius = 50) {
        try {
            const userId = this.config.config.CAREERONESTOP_USER_ID;
            const endpoint = `training/${userId}/${keyword}/${state}/${radius}`;

            const data = await this.getCareerOneStopData(endpoint);
            
            return {
                programs: data.Programs || [],
                total: data.TotalPrograms || 0,
                keyword: keyword,
                location: { state, radius }
            };
        } catch (error) {
            console.error('Error getting training programs:', error);
            return { programs: [], total: 0, keyword, location: { state, radius } };
        }
    }

    // Utility Methods
    parseEmploymentData(seriesData) {
        if (!seriesData || !seriesData.data) return null;
        
        return seriesData.data.map(point => ({
            year: point.year,
            period: point.period,
            value: parseFloat(point.value),
            footnotes: point.footnotes || []
        }));
    }

    parseWageData(seriesData) {
        if (!seriesData || !seriesData.data) return null;
        
        const latestData = seriesData.data[0];
        return {
            meanWage: parseFloat(latestData.value),
            year: latestData.year,
            period: latestData.period,
            currency: 'USD',
            frequency: 'annual'
        };
    }

    normalizeSkillsData(skillsArray) {
        return skillsArray.map(skill => ({
            name: skill.element_name || skill.name,
            description: skill.description,
            importance: parseFloat(skill.scale_value) || 0,
            level: parseFloat(skill.data_value) || 0,
            category: skill.element_id || skill.id
        })).sort((a, b) => b.importance - a.importance);
    }

    // Find related occupations
    async findRelatedOccupations(skills, limit = 10) {
        try {
            const searchPromises = skills.slice(0, 3).map(skill => 
                this.searchOccupations(skill, 5)
            );
            
            const results = await Promise.all(searchPromises);
            const allOccupations = results.flatMap(result => result.occupations);
            
            // Remove duplicates and sort by relevance
            const uniqueOccupations = Array.from(
                new Map(allOccupations.map(occ => [occ.code, occ])).values()
            );
            
            return uniqueOccupations.slice(0, limit);
        } catch (error) {
            console.error('Error finding related occupations:', error);
            return [];
        }
    }

    // Service health check
    async checkServiceHealth() {
        const now = new Date().toISOString();
        
        try {
            // Check O*NET (most reliable)
            if (this.config.isConfigured('onet')) {
                try {
                    await this.getONETData('online/occupations', { start: 1, end: 1 });
                    this.serviceHealth.onet = 'healthy';
                } catch (error) {
                    this.serviceHealth.onet = 'error';
                }
            } else {
                this.serviceHealth.onet = 'not_configured';
            }

            // Check BLS
            if (this.config.isConfigured('bls')) {
                try {
                    await this.getBLSData(['LNS14000000'], '2023', '2023'); // Unemployment rate
                    this.serviceHealth.bls = 'healthy';
                } catch (error) {
                    this.serviceHealth.bls = 'error';
                }
            } else {
                this.serviceHealth.bls = 'not_configured';
            }

            // Check CareerOneStop
            if (this.config.isConfigured('careeronestop')) {
                try {
                    const userId = this.config.config.CAREERONESTOP_USER_ID;
                    await this.getCareerOneStopData(`occupations/${userId}/15-1252/US`);
                    this.serviceHealth.careeronestop = 'healthy';
                } catch (error) {
                    this.serviceHealth.careeronestop = 'error';
                }
            } else {
                this.serviceHealth.careeronestop = 'not_configured';
            }

            this.serviceHealth.lastChecked = now;
            
        } catch (error) {
            console.error('Health check error:', error);
        }
        
        return this.serviceHealth;
    }

    // Get comprehensive occupation data
    async getComprehensiveOccupationData(onetCode) {
        try {
            const [profile, employment, market] = await Promise.allSettled([
                this.getOccupationProfile(onetCode),
                this.getOccupationEmploymentStats(onetCode.replace('-', '')),
                this.getJobMarketData(onetCode, 'US')
            ]);

            return {
                profile: profile.status === 'fulfilled' ? profile.value : null,
                employment: employment.status === 'fulfilled' ? employment.value : null,
                market: market.status === 'fulfilled' ? market.value : null,
                onetCode: onetCode,
                timestamp: new Date().toISOString(),
                dataQuality: this.assessDataQuality({
                    profile: profile.status === 'fulfilled',
                    employment: employment.status === 'fulfilled',
                    market: market.status === 'fulfilled'
                })
            };
        } catch (error) {
            console.error('Error getting comprehensive occupation data:', error);
            return null;
        }
    }

    assessDataQuality(results) {
        const successCount = Object.values(results).filter(Boolean).length;
        const totalCount = Object.keys(results).length;
        const percentage = (successCount / totalCount) * 100;
        
        if (percentage >= 80) return 'high';
        if (percentage >= 60) return 'medium';
        return 'low';
    }

    // Get usage statistics
    getUsageStats() {
        return {
            requests: this.rateLimiter.getRemainingRequests(),
            cache: {
                size: this.cache.size(),
                maxSize: this.cache.maxSize
            },
            costs: this.costTracker.getUsage(),
            serviceHealth: this.serviceHealth,
            configuredServices: this.config.getAvailableServices()
        };
    }
}