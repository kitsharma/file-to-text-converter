// API Configuration and Environment Management
class APIConfig {
    constructor() {
        this.config = {
            // AI Service API Keys
            OPENAI_API_KEY: this.getEnvVar('OPENAI_API_KEY'),
            PERPLEXITY_API_KEY: this.getEnvVar('PERPLEXITY_API_KEY'),
            CLAUDE_API_KEY: this.getEnvVar('CLAUDE_API_KEY'),
            
            // Government Data APIs
            BLS_API_KEY: this.getEnvVar('BLS_API_KEY'),
            ONET_API_USERNAME: this.getEnvVar('ONET_API_USERNAME'),
            ONET_API_PASSWORD: this.getEnvVar('ONET_API_PASSWORD'),
            CAREERONESTOP_API_KEY: this.getEnvVar('CAREERONESTOP_API_KEY'),
            CAREERONESTOP_USER_ID: this.getEnvVar('CAREERONESTOP_USER_ID'),
            FRED_API_KEY: this.getEnvVar('FRED_API_KEY'),
            
            // API Base URLs
            BLS_API_BASE_URL: this.getEnvVar('BLS_API_BASE_URL') || 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
            ONET_API_BASE_URL: this.getEnvVar('ONET_API_BASE_URL') || 'https://services.onetcenter.org/ws/',
            CAREERONESTOP_API_BASE_URL: this.getEnvVar('CAREERONESTOP_API_BASE_URL') || 'https://api.careeronestop.org/v1/',
            OPENAI_API_BASE_URL: 'https://api.openai.com/v1/',
            PERPLEXITY_API_BASE_URL: 'https://api.perplexity.ai/',
            
            // Rate Limiting
            RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
            RATE_LIMIT_REQUESTS_PER_HOUR: 1000,
            
            // Caching
            CACHE_TTL_SECONDS: 3600, // 1 hour
            MAX_CACHE_SIZE: 1000,
            
            // Cost Management
            API_MODE: this.getEnvVar('API_MODE') || 'test', // 'test' or 'live'
            DAILY_COST_LIMIT: parseFloat(this.getEnvVar('DAILY_COST_LIMIT')) || 10.00,
            MONTHLY_COST_LIMIT: parseFloat(this.getEnvVar('MONTHLY_COST_LIMIT')) || 100.00
        };
        
        this.validateConfig();
    }

    getEnvVar(name) {
        // Try different environment variable sources
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        
        // For frontend builds with Vite (disabled for browser compatibility)
        // if (typeof import.meta !== 'undefined' && import.meta.env) {
        //     return import.meta.env[`VITE_${name}`] || import.meta.env[name];
        // }
        
        // Local storage fallback for development
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(name);
        }
        
        return null;
    }

    setApiKey(service, key) {
        this.config[`${service.toUpperCase()}_API_KEY`] = key;
        
        // Store in localStorage for persistence
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`${service.toUpperCase()}_API_KEY`, key);
        }
    }

    getApiKey(service) {
        return this.config[`${service.toUpperCase()}_API_KEY`];
    }

    validateConfig() {
        const missingKeys = [];
        
        // Check critical API keys
        const criticalKeys = ['OPENAI_API_KEY', 'ONET_API_USERNAME', 'ONET_API_PASSWORD'];
        
        criticalKeys.forEach(key => {
            if (!this.config[key]) {
                missingKeys.push(key);
            }
        });

        if (missingKeys.length > 0) {
            console.warn('Missing API keys:', missingKeys);
            console.warn('Some features may not work without proper API keys');
        }
        
        return missingKeys.length === 0;
    }

    isConfigured(service) {
        switch (service.toLowerCase()) {
            case 'openai':
                return !!this.config.OPENAI_API_KEY;
            case 'perplexity':
                return !!this.config.PERPLEXITY_API_KEY;
            case 'claude':
                return !!this.config.CLAUDE_API_KEY;
            case 'bls':
                return !!this.config.BLS_API_KEY;
            case 'onet':
                return !!(this.config.ONET_API_USERNAME && this.config.ONET_API_PASSWORD);
            case 'careeronestop':
                return !!(this.config.CAREERONESTOP_API_KEY && this.config.CAREERONESTOP_USER_ID);
            case 'fred':
                return !!this.config.FRED_API_KEY;
            default:
                return false;
        }
    }

    getAvailableServices() {
        const services = ['openai', 'perplexity', 'claude', 'bls', 'onet', 'careeronestop', 'fred'];
        return services.filter(service => this.isConfigured(service));
    }

    // Test mode configurations
    getTestEndpoints() {
        return {
            openai: 'https://api.openai.com/v1/models', // List models endpoint
            onet: this.config.ONET_API_BASE_URL + 'online/occupations/',
            bls: this.config.BLS_API_BASE_URL,
            careeronestop: this.config.CAREERONESTOP_API_BASE_URL + 'occupations/',
            perplexity: this.config.PERPLEXITY_API_BASE_URL + 'chat/completions'
        };
    }

    // Cost estimation (per API call)
    getEstimatedCosts() {
        return {
            openai: {
                'gpt-4': { input: 0.01, output: 0.03 }, // per 1K tokens
                'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
            },
            perplexity: {
                'mistral-7b-instruct': 0.0002, // per 1K tokens
                'llama-2-70b-chat': 0.001
            },
            claude: {
                'claude-3-sonnet': { input: 0.003, output: 0.015 }, // per 1K tokens
                'claude-3-haiku': { input: 0.00025, output: 0.00125 }
            },
            government: 0, // Free APIs
            cacheHit: 0 // No cost for cached responses
        };
    }
}

// Rate Limiter Class
class RateLimiter {
    constructor(requestsPerMinute = 60, requestsPerHour = 1000) {
        this.requestsPerMinute = requestsPerMinute;
        this.requestsPerHour = requestsPerHour;
        this.minuteRequests = [];
        this.hourRequests = [];
    }

    canMakeRequest() {
        const now = Date.now();
        const oneMinuteAgo = now - (60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        // Clean old requests
        this.minuteRequests = this.minuteRequests.filter(time => time > oneMinuteAgo);
        this.hourRequests = this.hourRequests.filter(time => time > oneHourAgo);

        // Check limits
        if (this.minuteRequests.length >= this.requestsPerMinute) {
            return { allowed: false, reason: 'Per-minute limit exceeded', retryAfter: 60 };
        }
        
        if (this.hourRequests.length >= this.requestsPerHour) {
            return { allowed: false, reason: 'Per-hour limit exceeded', retryAfter: 3600 };
        }

        return { allowed: true };
    }

    recordRequest() {
        const now = Date.now();
        this.minuteRequests.push(now);
        this.hourRequests.push(now);
    }

    getRemainingRequests() {
        const now = Date.now();
        const oneMinuteAgo = now - (60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        this.minuteRequests = this.minuteRequests.filter(time => time > oneMinuteAgo);
        this.hourRequests = this.hourRequests.filter(time => time > oneHourAgo);

        return {
            perMinute: this.requestsPerMinute - this.minuteRequests.length,
            perHour: this.requestsPerHour - this.hourRequests.length
        };
    }
}

// Simple Cache Implementation
class APICache {
    constructor(maxSize = 1000, ttlSeconds = 3600) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlSeconds = ttlSeconds;
    }

    generateKey(url, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${url}?${sortedParams}`;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    set(key, data) {
        // Remove oldest items if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            expiry: Date.now() + (this.ttlSeconds * 1000)
        });
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }

    // Clean expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Cost Tracker
class CostTracker {
    constructor() {
        this.dailyCosts = this.loadDailyCosts();
        this.monthlyCosts = this.loadMonthlyCosts();
        this.config = new APIConfig();
    }

    loadDailyCosts() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('api_daily_costs');
        const costs = stored ? JSON.parse(stored) : {};
        return costs[today] || 0;
    }

    loadMonthlyCosts() {
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const stored = localStorage.getItem('api_monthly_costs');
        const costs = stored ? JSON.parse(stored) : {};
        return costs[thisMonth] || 0;
    }

    addCost(amount) {
        this.dailyCosts += amount;
        this.monthlyCosts += amount;
        this.saveCosts();
    }

    saveCosts() {
        const today = new Date().toDateString();
        const thisMonth = new Date().toISOString().slice(0, 7);

        // Save daily costs
        const dailyData = JSON.parse(localStorage.getItem('api_daily_costs') || '{}');
        dailyData[today] = this.dailyCosts;
        localStorage.setItem('api_daily_costs', JSON.stringify(dailyData));

        // Save monthly costs
        const monthlyData = JSON.parse(localStorage.getItem('api_monthly_costs') || '{}');
        monthlyData[thisMonth] = this.monthlyCosts;
        localStorage.setItem('api_monthly_costs', JSON.stringify(monthlyData));
    }

    canMakeRequest(estimatedCost = 0) {
        const dailyLimit = this.config.config.DAILY_COST_LIMIT;
        const monthlyLimit = this.config.config.MONTHLY_COST_LIMIT;

        if (this.dailyCosts + estimatedCost > dailyLimit) {
            return { allowed: false, reason: 'Daily cost limit exceeded' };
        }

        if (this.monthlyCosts + estimatedCost > monthlyLimit) {
            return { allowed: false, reason: 'Monthly cost limit exceeded' };
        }

        return { allowed: true };
    }

    getRemainingBudget() {
        return {
            daily: this.config.config.DAILY_COST_LIMIT - this.dailyCosts,
            monthly: this.config.config.MONTHLY_COST_LIMIT - this.monthlyCosts
        };
    }

    getUsage() {
        return {
            daily: {
                used: this.dailyCosts,
                limit: this.config.config.DAILY_COST_LIMIT,
                remaining: this.config.config.DAILY_COST_LIMIT - this.dailyCosts
            },
            monthly: {
                used: this.monthlyCosts,
                limit: this.config.config.MONTHLY_COST_LIMIT,
                remaining: this.config.config.MONTHLY_COST_LIMIT - this.monthlyCosts
            }
        };
    }
}

// Export singleton instances
const apiConfig = new APIConfig();
const rateLimiter = new RateLimiter();
const apiCache = new APICache();
const costTracker = new CostTracker();

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.APIConfig = APIConfig;
    window.RateLimiter = RateLimiter;
    window.APICache = APICache;
    window.CostTracker = CostTracker;
    window.apiConfig = apiConfig;
    window.rateLimiter = rateLimiter;
    window.apiCache = apiCache;
    window.costTracker = costTracker;
}

// Clean cache periodically
setInterval(() => {
    apiCache.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes