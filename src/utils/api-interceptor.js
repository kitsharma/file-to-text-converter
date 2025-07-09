// API Interceptor - Multi-Provider Support with Rate Limiting and Cost Management
class APIInterceptor {
    constructor() {
        this.config = apiConfig;
        this.cache = apiCache;
        this.rateLimiter = rateLimiter;
        this.costTracker = costTracker;
        
        // Provider configurations
        this.providers = {
            openai: {
                baseURL: this.config.config.OPENAI_API_BASE_URL,
                models: ['gpt-4', 'gpt-3.5-turbo'],
                fallbackModel: 'gpt-3.5-turbo',
                maxRetries: 2,
                timeout: 30000
            },
            perplexity: {
                baseURL: this.config.config.PERPLEXITY_API_BASE_URL,
                models: ['mistral-7b-instruct', 'llama-2-70b-chat'],
                fallbackModel: 'llama-2-70b-chat',
                maxRetries: 2,
                timeout: 30000
            },
            claude: {
                baseURL: 'https://api.anthropic.com/v1/',
                models: ['claude-3-sonnet', 'claude-3-haiku'],
                fallbackModel: 'claude-3-haiku',
                maxRetries: 2,
                timeout: 30000
            }
        };
        
        // Request queue for handling high-volume requests
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // Statistics tracking
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            providerUsage: {},
            averageResponseTime: 0,
            lastReset: new Date()
        };
        
        this.initializeProviderStats();
    }

    // Initialize provider statistics
    initializeProviderStats() {
        Object.keys(this.providers).forEach(provider => {
            this.stats.providerUsage[provider] = {
                requests: 0,
                failures: 0,
                totalCost: 0,
                averageResponseTime: 0
            };
        });
    }

    // Main request interceptor
    async makeRequest(provider, endpoint, options = {}) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        
        try {
            // Pre-request validations
            await this.validateRequest(provider, options);
            
            // Check cache first
            const cacheKey = this.generateCacheKey(provider, endpoint, options);
            const cachedResponse = this.cache.get(cacheKey);
            
            if (cachedResponse && !options.skipCache) {
                this.stats.cacheHits++;
                this.updateStats(provider, true, Date.now() - startTime);
                return {
                    ...cachedResponse,
                    cached: true,
                    requestId: requestId
                };
            }
            
            // Rate limiting check
            const rateLimitCheck = this.rateLimiter.canMakeRequest();
            if (!rateLimitCheck.allowed) {
                if (options.queueIfLimited) {
                    return this.queueRequest(provider, endpoint, options);
                }
                throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
            }
            
            // Cost check
            const estimatedCost = this.estimateRequestCost(provider, options);
            const costCheck = this.costTracker.canMakeRequest(estimatedCost);
            if (!costCheck.allowed) {
                throw new Error(`Cost limit exceeded: ${costCheck.reason}`);
            }
            
            // Make the actual request
            const response = await this.executeRequest(provider, endpoint, options);
            
            // Post-request processing
            const actualCost = this.calculateActualCost(provider, response, options);
            this.costTracker.addCost(actualCost);
            this.rateLimiter.recordRequest();
            
            // Cache the response if appropriate
            if (!options.skipCache && this.shouldCacheResponse(response)) {
                this.cache.set(cacheKey, response);
            }
            
            this.updateStats(provider, true, Date.now() - startTime, actualCost);
            
            return {
                ...response,
                cached: false,
                requestId: requestId,
                provider: provider,
                cost: actualCost
            };
            
        } catch (error) {
            this.updateStats(provider, false, Date.now() - startTime);
            
            // Try fallback provider if configured
            if (options.fallbackProvider && options.fallbackProvider !== provider) {
                console.warn(`Primary provider ${provider} failed, trying fallback ${options.fallbackProvider}`);
                return this.makeRequest(options.fallbackProvider, endpoint, {
                    ...options,
                    fallbackProvider: null // Prevent infinite fallback loops
                });
            }
            
            throw new Error(`API request failed for ${provider}: ${error.message}`);
        }
    }

    // Execute the actual HTTP request
    async executeRequest(provider, endpoint, options) {
        const providerConfig = this.providers[provider];
        if (!providerConfig) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        if (!this.config.isConfigured(provider)) {
            throw new Error(`Provider ${provider} not configured`);
        }

        const url = new URL(endpoint, providerConfig.baseURL);
        const headers = this.buildHeaders(provider, options);
        const body = this.buildRequestBody(provider, options);
        
        const requestOptions = {
            method: options.method || 'POST',
            headers: headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(providerConfig.timeout)
        };

        let lastError;
        
        for (let attempt = 0; attempt < providerConfig.maxRetries; attempt++) {
            try {
                const response = await fetch(url.toString(), requestOptions);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
                }
                
                const data = await response.json();
                return this.normalizeResponse(provider, data);
                
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1} failed for ${provider}:`, error.message);
                
                if (attempt < providerConfig.maxRetries - 1) {
                    await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }

    // Build headers for different providers
    buildHeaders(provider, options) {
        const baseHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'Resume-Parser-AI/1.0'
        };

        switch (provider) {
            case 'openai':
                return {
                    ...baseHeaders,
                    'Authorization': `Bearer ${this.config.getApiKey('openai')}`
                };
            
            case 'perplexity':
                return {
                    ...baseHeaders,
                    'Authorization': `Bearer ${this.config.getApiKey('perplexity')}`
                };
            
            case 'claude':
                return {
                    ...baseHeaders,
                    'x-api-key': this.config.getApiKey('claude'),
                    'anthropic-version': '2023-06-01'
                };
            
            default:
                return baseHeaders;
        }
    }

    // Build request body for different providers
    buildRequestBody(provider, options) {
        const commonParams = {
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1000
        };

        switch (provider) {
            case 'openai':
            case 'perplexity':
                return {
                    model: options.model || this.providers[provider].models[0],
                    messages: options.messages || [
                        {
                            role: 'user',
                            content: options.prompt || ''
                        }
                    ],
                    ...commonParams
                };
            
            case 'claude':
                return {
                    model: options.model || this.providers[provider].models[0],
                    messages: options.messages || [
                        {
                            role: 'user',
                            content: options.prompt || ''
                        }
                    ],
                    max_tokens: commonParams.max_tokens,
                    temperature: commonParams.temperature
                };
            
            default:
                return options.body || {};
        }
    }

    // Normalize responses from different providers
    normalizeResponse(provider, data) {
        switch (provider) {
            case 'openai':
            case 'perplexity':
                return {
                    content: data.choices?.[0]?.message?.content || '',
                    usage: data.usage || {},
                    model: data.model || '',
                    finishReason: data.choices?.[0]?.finish_reason || '',
                    rawResponse: data
                };
            
            case 'claude':
                return {
                    content: data.content?.[0]?.text || '',
                    usage: data.usage || {},
                    model: data.model || '',
                    finishReason: data.stop_reason || '',
                    rawResponse: data
                };
            
            default:
                return data;
        }
    }

    // Request validation
    async validateRequest(provider, options) {
        // Check if provider is available
        if (!this.config.isConfigured(provider)) {
            throw new Error(`Provider ${provider} is not configured`);
        }
        
        // Validate required parameters
        if (!options.prompt && !options.messages) {
            throw new Error('Either prompt or messages must be provided');
        }
        
        // Check model availability
        if (options.model && !this.providers[provider].models.includes(options.model)) {
            console.warn(`Model ${options.model} not in known models for ${provider}, proceeding anyway`);
        }
        
        // Token limit validation
        if (options.maxTokens > 4000) {
            console.warn('Large token request detected, this may be expensive');
        }
    }

    // Cost estimation
    estimateRequestCost(provider, options) {
        const costs = this.config.getEstimatedCosts();
        const providerCosts = costs[provider];
        
        if (!providerCosts) return 0;
        
        const estimatedTokens = this.estimateTokenCount(options.prompt || '', options.messages || []);
        const model = options.model || this.providers[provider].models[0];
        const modelCosts = providerCosts[model] || Object.values(providerCosts)[0];
        
        if (typeof modelCosts === 'number') {
            return (estimatedTokens / 1000) * modelCosts;
        } else if (modelCosts.input && modelCosts.output) {
            const inputCost = (estimatedTokens / 1000) * modelCosts.input;
            const outputCost = ((options.maxTokens || 500) / 1000) * modelCosts.output;
            return inputCost + outputCost;
        }
        
        return 0;
    }

    // Calculate actual cost from response
    calculateActualCost(provider, response, options) {
        const costs = this.config.getEstimatedCosts();
        const providerCosts = costs[provider];
        
        if (!providerCosts || !response.usage) return 0;
        
        const model = response.model || options.model || this.providers[provider].models[0];
        const modelCosts = providerCosts[model] || Object.values(providerCosts)[0];
        
        if (typeof modelCosts === 'number') {
            const totalTokens = (response.usage.prompt_tokens || 0) + (response.usage.completion_tokens || 0);
            return (totalTokens / 1000) * modelCosts;
        } else if (modelCosts.input && modelCosts.output) {
            const inputCost = ((response.usage.prompt_tokens || 0) / 1000) * modelCosts.input;
            const outputCost = ((response.usage.completion_tokens || 0) / 1000) * modelCosts.output;
            return inputCost + outputCost;
        }
        
        return 0;
    }

    // Token estimation
    estimateTokenCount(prompt, messages) {
        let text = prompt;
        if (messages && messages.length > 0) {
            text = messages.map(msg => msg.content || '').join(' ');
        }
        
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }

    // Cache key generation
    generateCacheKey(provider, endpoint, options) {
        const keyData = {
            provider,
            endpoint,
            prompt: options.prompt,
            messages: options.messages,
            model: options.model,
            temperature: options.temperature
        };
        
        return this.cache.generateKey(`api_request`, keyData);
    }

    // Determine if response should be cached
    shouldCacheResponse(response) {
        // Don't cache error responses or very large responses
        if (!response.content || response.content.length > 10000) {
            return false;
        }
        
        // Don't cache responses with high temperature (less deterministic)
        if (response.temperature > 0.8) {
            return false;
        }
        
        return true;
    }

    // Queue management for rate-limited requests
    async queueRequest(provider, endpoint, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                provider,
                endpoint,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const rateLimitCheck = this.rateLimiter.canMakeRequest();
            if (!rateLimitCheck.allowed) {
                await this.delay(rateLimitCheck.retryAfter * 1000);
                continue;
            }
            
            const request = this.requestQueue.shift();
            
            try {
                const response = await this.makeRequest(
                    request.provider,
                    request.endpoint,
                    { ...request.options, queueIfLimited: false, skipCache: false }
                );
                request.resolve(response);
            } catch (error) {
                request.reject(error);
            }
            
            // Small delay between requests
            await this.delay(100);
        }
        
        this.isProcessingQueue = false;
    }

    // Batch request processing
    async batchRequest(requests, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 5;
        const delay = options.delay || 1000;
        
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (request, index) => {
                try {
                    const response = await this.makeRequest(
                        request.provider,
                        request.endpoint,
                        request.options
                    );
                    return { index: i + index, response, status: 'success' };
                } catch (error) {
                    return { index: i + index, error: error.message, status: 'error' };
                }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(result => result.value));
            
            // Delay between batches
            if (i + batchSize < requests.length) {
                await this.delay(delay);
            }
        }
        
        return results.sort((a, b) => a.index - b.index);
    }

    // Smart provider selection based on requirements
    selectBestProvider(requirements = {}) {
        const availableProviders = this.config.getAvailableServices()
            .filter(service => this.providers[service]);
        
        if (availableProviders.length === 0) {
            throw new Error('No API providers configured');
        }
        
        // Simple selection logic based on requirements
        if (requirements.speed === 'fast') {
            return availableProviders.includes('perplexity') ? 'perplexity' : availableProviders[0];
        }
        
        if (requirements.quality === 'high') {
            return availableProviders.includes('openai') ? 'openai' : availableProviders[0];
        }
        
        if (requirements.cost === 'low') {
            return availableProviders.includes('perplexity') ? 'perplexity' : availableProviders[0];
        }
        
        // Default to first available provider
        return availableProviders[0];
    }

    // Health check for all providers
    async checkProviderHealth() {
        const healthStatus = {};
        
        for (const provider of Object.keys(this.providers)) {
            if (!this.config.isConfigured(provider)) {
                healthStatus[provider] = 'not_configured';
                continue;
            }
            
            try {
                // Make a simple test request
                await this.makeRequest(provider, 'chat/completions', {
                    prompt: 'Test',
                    maxTokens: 10,
                    skipCache: true
                });
                healthStatus[provider] = 'healthy';
            } catch (error) {
                healthStatus[provider] = 'error';
                console.warn(`Health check failed for ${provider}:`, error.message);
            }
        }
        
        return healthStatus;
    }

    // Utility methods
    generateRequestId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateStats(provider, success, responseTime, cost = 0) {
        this.stats.totalRequests++;
        
        if (success) {
            this.stats.successfulRequests++;
        } else {
            this.stats.failedRequests++;
        }
        
        // Update provider stats
        if (this.stats.providerUsage[provider]) {
            this.stats.providerUsage[provider].requests++;
            if (!success) {
                this.stats.providerUsage[provider].failures++;
            }
            this.stats.providerUsage[provider].totalCost += cost;
            
            // Update average response time
            const prevAvg = this.stats.providerUsage[provider].averageResponseTime;
            const count = this.stats.providerUsage[provider].requests;
            this.stats.providerUsage[provider].averageResponseTime = 
                (prevAvg * (count - 1) + responseTime) / count;
        }
        
        // Update overall average response time
        const prevAvg = this.stats.averageResponseTime;
        const count = this.stats.totalRequests;
        this.stats.averageResponseTime = (prevAvg * (count - 1) + responseTime) / count;
    }

    // Get comprehensive statistics
    getStats() {
        return {
            ...this.stats,
            queueSize: this.requestQueue.length,
            cacheStats: {
                size: this.cache.size(),
                maxSize: this.cache.maxSize,
                hitRate: this.stats.cacheHits / Math.max(this.stats.totalRequests, 1)
            },
            rateLimitStats: this.rateLimiter.getRemainingRequests(),
            costStats: this.costTracker.getUsage()
        };
    }

    // Reset statistics
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            providerUsage: {},
            averageResponseTime: 0,
            lastReset: new Date()
        };
        this.initializeProviderStats();
    }
}

// Export singleton instance
const apiInterceptor = new APIInterceptor();