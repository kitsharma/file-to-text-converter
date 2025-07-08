// API Testing Suite - Verify each integration works with real API keys
class APITester {
    constructor() {
        this.results = {};
        this.testLog = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        this.testLog.push(logEntry);
        console.log(logEntry);
        
        // Update UI if available
        const logContainer = document.getElementById('testLog');
        if (logContainer) {
            logContainer.innerHTML += logEntry + '\n';
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // Test 1: Configuration and Environment Setup
    async testConfiguration() {
        this.log('Testing Configuration and Environment Setup...', 'test');
        
        try {
            // Test config initialization
            const config = new APIConfig();
            
            this.log(`✓ Configuration initialized`);
            this.log(`Available services: ${config.getAvailableServices().join(', ')}`);
            
            // Test each service configuration
            const services = ['openai', 'perplexity', 'claude', 'bls', 'onet', 'careeronestop', 'fred'];
            const configuredServices = [];
            const missingServices = [];
            
            services.forEach(service => {
                if (config.isConfigured(service)) {
                    configuredServices.push(service);
                    this.log(`✓ ${service.toUpperCase()} API key configured`);
                } else {
                    missingServices.push(service);
                    this.log(`✗ ${service.toUpperCase()} API key missing`, 'warn');
                }
            });
            
            // Test cache system
            const cache = new APICache();
            cache.set('test_key', { test: 'data' });
            const retrieved = cache.get('test_key');
            
            if (retrieved && retrieved.test === 'data') {
                this.log('✓ Cache system working');
            } else {
                throw new Error('Cache system failed');
            }
            
            // Test rate limiter
            const rateLimiter = new RateLimiter(5, 100);
            const canMakeRequest = rateLimiter.canMakeRequest();
            
            if (canMakeRequest.allowed) {
                this.log('✓ Rate limiter initialized');
                rateLimiter.recordRequest();
                this.log(`Rate limits: ${JSON.stringify(rateLimiter.getRemainingRequests())}`);
            } else {
                throw new Error('Rate limiter failed');
            }
            
            // Test cost tracker
            const costTracker = new CostTracker();
            const usage = costTracker.getUsage();
            this.log(`✓ Cost tracker initialized. Daily: $${usage.daily.used.toFixed(2)}/${usage.daily.limit}`);
            
            this.results.configuration = {
                status: 'success',
                configuredServices: configuredServices,
                missingServices: missingServices,
                details: {
                    cache: 'working',
                    rateLimiter: 'working',
                    costTracker: 'working'
                }
            };
            
            this.log('✅ Configuration test completed successfully', 'success');
            return true;
            
        } catch (error) {
            this.log(`❌ Configuration test failed: ${error.message}`, 'error');
            this.results.configuration = {
                status: 'failed',
                error: error.message
            };
            return false;
        }
    }

    // Test 2: O*NET Service (No API key required for basic functionality)
    async testONETService() {
        this.log('Testing O*NET Service...', 'test');
        
        try {
            const onetService = new ONETService();
            
            // Wait for initialization
            await onetService.ensureInitialized();
            
            this.log('✓ O*NET Service initialized');
            
            // Test embedded data (works without API keys)
            const skillMatches = await onetService.searchSkills('programming', 5);
            
            if (skillMatches && skillMatches.length > 0) {
                this.log(`✓ Skill search working: Found ${skillMatches.length} matches for 'programming'`);
                this.log(`  - Best match: ${skillMatches[0].matchedSkill.element_name} (${Math.round(skillMatches[0].similarity * 100)}% match)`);
            } else {
                throw new Error('Skill search returned no results');
            }
            
            // Test occupation search
            const occupationMatches = await onetService.searchOccupations('software developer', 3);
            
            if (occupationMatches && occupationMatches.length > 0) {
                this.log(`✓ Occupation search working: Found ${occupationMatches.length} matches for 'software developer'`);
                this.log(`  - Best match: ${occupationMatches[0].title} (${Math.round(occupationMatches[0].similarity * 100)}% match)`);
            } else {
                throw new Error('Occupation search returned no results');
            }
            
            // Test skills analysis
            const testSkills = ['JavaScript', 'Communication', 'Problem Solving'];
            const analysis = await onetService.analyzeSkillsToOccupations(testSkills);
            
            if (analysis && analysis.matchingOccupations) {
                this.log(`✓ Skills analysis working: Found ${analysis.matchingOccupations.length} matching occupations`);
                if (analysis.matchingOccupations.length > 0) {
                    this.log(`  - Top match: ${analysis.matchingOccupations[0].occupation.title} (${Math.round(analysis.matchingOccupations[0].relevance * 100)}% relevance)`);
                }
            }
            
            // Test fuzzy matching with various skill types
            const testCases = [
                { input: 'js', expected: 'javascript' },
                { input: 'communication skills', expected: 'communication' },
                { input: 'problem solving', expected: 'problem solving' }
            ];
            
            for (const testCase of testCases) {
                const matches = await onetService.searchSkills(testCase.input, 1);
                if (matches && matches.length > 0) {
                    this.log(`✓ Fuzzy matching: "${testCase.input}" → "${matches[0].matchedSkill.element_name}"`);
                }
            }
            
            // Get service status
            const status = onetService.getServiceStatus();
            this.log(`Service status: ${status.skillsCount} skills, ${status.occupationsCount} occupations loaded`);
            
            this.results.onet = {
                status: 'success',
                details: {
                    skillsLoaded: status.skillsCount,
                    occupationsLoaded: status.occupationsCount,
                    apiConfigured: status.apiConfigured,
                    testResults: {
                        skillSearch: skillMatches?.length || 0,
                        occupationSearch: occupationMatches?.length || 0,
                        skillsAnalysis: analysis?.matchingOccupations?.length || 0
                    }
                }
            };
            
            this.log('✅ O*NET Service test completed successfully', 'success');
            return true;
            
        } catch (error) {
            this.log(`❌ O*NET Service test failed: ${error.message}`, 'error');
            console.error('O*NET Service detailed error:', error);
            this.results.onet = {
                status: 'failed',
                error: error.message,
                stack: error.stack
            };
            return false;
        }
    }

    // Test 3: BLS API (Bureau of Labor Statistics)
    async testBLSAPI() {
        this.log('Testing BLS API...', 'test');
        
        try {
            if (!apiConfig.isConfigured('bls')) {
                throw new Error('BLS API key not configured. Please set BLS_API_KEY in environment or localStorage.');
            }
            
            const govService = new GovernmentDataService();
            
            this.log('✓ Government Data Service initialized');
            
            // Test with unemployment rate series (reliable and always available)
            const testSeriesId = 'LNS14000000'; // Unemployment rate
            const currentYear = new Date().getFullYear();
            const lastYear = currentYear - 1;
            
            this.log(`Requesting BLS data for series ${testSeriesId} (${lastYear}-${currentYear})`);
            
            const blsData = await govService.getBLSData([testSeriesId], lastYear.toString(), currentYear.toString());
            
            if (blsData && blsData.status === 'REQUEST_SUCCEEDED') {
                this.log('✓ BLS API request successful');
                
                if (blsData.Results && blsData.Results.series && blsData.Results.series.length > 0) {
                    const series = blsData.Results.series[0];
                    this.log(`✓ Retrieved data for series: ${series.seriesID}`);
                    
                    if (series.data && series.data.length > 0) {
                        this.log(`✓ Data points received: ${series.data.length}`);
                        this.log(`  - Latest: ${series.data[0].period} ${series.data[0].year} = ${series.data[0].value}%`);
                    } else {
                        throw new Error('No data points in BLS response');
                    }
                } else {
                    throw new Error('No series data in BLS response');
                }
            } else {
                throw new Error(`BLS API request failed: ${blsData?.message || 'Unknown error'}`);
            }
            
            // Test health check
            const healthStatus = await govService.checkServiceHealth();
            this.log(`✓ BLS health check: ${healthStatus.bls}`);
            
            this.results.bls = {
                status: 'success',
                details: {
                    apiResponse: blsData.status,
                    seriesTested: testSeriesId,
                    dataPoints: blsData.Results?.series?.[0]?.data?.length || 0,
                    healthStatus: healthStatus.bls
                }
            };
            
            this.log('✅ BLS API test completed successfully', 'success');
            return true;
            
        } catch (error) {
            this.log(`❌ BLS API test failed: ${error.message}`, 'error');
            console.error('BLS API detailed error:', error);
            this.results.bls = {
                status: 'failed',
                error: error.message
            };
            return false;
        }
    }

    // Show test results in UI
    displayResults() {
        const resultsContainer = document.getElementById('testResults');
        if (!resultsContainer) return;
        
        let html = '<h3>API Test Results</h3>';
        
        for (const [service, result] of Object.entries(this.results)) {
            const status = result.status === 'success' ? '✅' : '❌';
            const statusClass = result.status === 'success' ? 'success' : 'error';
            
            html += `
                <div class="test-result ${statusClass}">
                    <h4>${status} ${service.toUpperCase()}</h4>
                    <p>Status: ${result.status}</p>
                    ${result.error ? `<p>Error: ${result.error}</p>` : ''}
                    ${result.details ? `<pre>${JSON.stringify(result.details, null, 2)}</pre>` : ''}
                </div>
            `;
        }
        
        resultsContainer.innerHTML = html;
    }

    // Get summary of all tests
    getSummary() {
        const total = Object.keys(this.results).length;
        const passed = Object.values(this.results).filter(r => r.status === 'success').length;
        const failed = total - passed;
        
        return {
            total,
            passed,
            failed,
            success_rate: total > 0 ? Math.round((passed / total) * 100) : 0
        };
    }
}

// Initialize tester
const apiTester = new APITester();