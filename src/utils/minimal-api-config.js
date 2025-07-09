// Minimal API Configuration - Browser Compatible
class MinimalAPIConfig {
    constructor() {
        // Simple API key storage using localStorage
        this.storagePrefix = 'api_key_';
        
        // API endpoints - no complex abstraction
        this.endpoints = {
            openai: 'https://api.openai.com/v1/',
            perplexity: 'https://api.perplexity.ai/',
            bls: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
            onet: 'https://services.onetcenter.org/ws/',
            careeronestop: 'https://api.careeronestop.org/v1/'
        };
    }

    // Get API key - first try environment variables, then localStorage
    getApiKey(service) {
        // Try environment variables first (for Node.js/server)
        if (typeof process !== 'undefined' && process.env) {
            const envKey = process.env[`${service.toUpperCase()}_API_KEY`];
            if (envKey) return envKey;
        }
        
        // Fallback to localStorage (for browser)
        return localStorage.getItem(this.storagePrefix + service) || '';
    }

    // Set API key in localStorage
    setApiKey(service, key) {
        if (key) {
            localStorage.setItem(this.storagePrefix + service, key);
        } else {
            localStorage.removeItem(this.storagePrefix + service);
        }
    }

    // Check if service has API key configured
    hasApiKey(service) {
        return !!this.getApiKey(service);
    }

    // Get all configured services
    getConfiguredServices() {
        const services = ['openai', 'perplexity', 'bls', 'onet', 'careeronestop'];
        return services.filter(service => this.hasApiKey(service));
    }

    // Get endpoint URL for a service
    getEndpoint(service) {
        return this.endpoints[service] || '';
    }
}

// Simple Rate Limiter
class SimpleRateLimiter {
    constructor(requestsPerMinute = 60) {
        this.requestsPerMinute = requestsPerMinute;
        this.requests = [];
    }

    canMakeRequest() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove old requests
        this.requests = this.requests.filter(time => time > oneMinuteAgo);
        
        // Check if under limit
        return this.requests.length < this.requestsPerMinute;
    }

    recordRequest() {
        if (this.canMakeRequest()) {
            this.requests.push(Date.now());
            return true;
        }
        return false;
    }

    getRemainingRequests() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.requests = this.requests.filter(time => time > oneMinuteAgo);
        return this.requestsPerMinute - this.requests.length;
    }
}

// Simple Cache
class SimpleCache {
    constructor(ttlMinutes = 60) {
        this.cache = new Map();
        this.ttl = ttlMinutes * 60 * 1000;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + this.ttl
        });
    }

    clear() {
        this.cache.clear();
    }
}

// API Client wrapper
class SimpleAPIClient {
    constructor() {
        this.config = new MinimalAPIConfig();
        this.rateLimiter = new SimpleRateLimiter();
        this.cache = new SimpleCache();
    }

    async makeRequest(service, endpoint, options = {}) {
        // Check rate limit
        if (!this.rateLimiter.canMakeRequest()) {
            throw new Error('Rate limit exceeded. Please wait before making another request.');
        }

        // Check for API key
        const apiKey = this.config.getApiKey(service);
        if (!apiKey && service !== 'bls') { // BLS doesn't require API key
            throw new Error(`No API key configured for ${service}`);
        }

        // Build cache key
        const cacheKey = `${service}:${endpoint}:${JSON.stringify(options.body || {})}`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Build request
        const baseUrl = this.config.getEndpoint(service);
        const url = baseUrl + endpoint;
        
        // Add authentication headers
        const headers = { ...options.headers };
        
        switch (service) {
            case 'openai':
            case 'perplexity':
                headers['Authorization'] = `Bearer ${apiKey}`;
                headers['Content-Type'] = 'application/json';
                break;
            case 'onet':
                // O*NET uses basic auth
                const auth = btoa(`${apiKey}:${this.config.getApiKey('onet_password')}`);
                headers['Authorization'] = `Basic ${auth}`;
                break;
            case 'careeronestop':
                headers['Authorization'] = `Bearer ${apiKey}`;
                headers['Accept'] = 'application/json';
                break;
        }

        // Make request
        try {
            this.rateLimiter.recordRequest();
            
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache successful response
            this.cache.set(cacheKey, data);
            
            return data;
        } catch (error) {
            throw new Error(`${service} API error: ${error.message}`);
        }
    }

    // Convenience methods for common APIs
    async callOpenAI(messages, model = 'gpt-3.5-turbo') {
        return this.makeRequest('openai', 'chat/completions', {
            method: 'POST',
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });
    }

    async searchONET(keyword) {
        return this.makeRequest('onet', `online/search?keyword=${encodeURIComponent(keyword)}`);
    }

    async getBLSData(seriesId) {
        return this.makeRequest('bls', '', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                seriesid: [seriesId],
                startyear: new Date().getFullYear() - 1,
                endyear: new Date().getFullYear()
            })
        });
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.MinimalAPIConfig = MinimalAPIConfig;
    window.SimpleRateLimiter = SimpleRateLimiter;
    window.SimpleCache = SimpleCache;
    window.SimpleAPIClient = SimpleAPIClient;
}