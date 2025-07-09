/**
 * Career Insights UI Components
 * Handles display and interaction for career analysis features
 */

class CareerInsightsUI {
    constructor(careerManager, containerId = 'careerInsightsContainer') {
        this.careerManager = careerManager;
        this.container = document.getElementById(containerId);
        this.currentInsights = null;
        this.activeTab = 'skills';
        
        this.initializeEventListeners();
        this.setupCareerManagerListeners();
    }

    /**
     * Initialize UI event listeners
     */
    initializeEventListeners() {
        // Tab switching for insights
        document.querySelectorAll('.insights-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.insightTab);
            });
        });

        // Job search functionality
        const searchBtn = document.getElementById('searchJobsBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleJobSearch());
        }

        // Enter key for job search
        ['jobSearchRole', 'jobSearchLocation'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleJobSearch();
                });
            }
        });
    }

    /**
     * Setup career manager event listeners
     */
    setupCareerManagerListeners() {
        this.careerManager.on('insights:start', () => {
            this.showInsightsContainer();
            this.showLoadingState();
        });

        this.careerManager.on('insights:progress', (data) => {
            this.updateProgress(data);
        });

        this.careerManager.on('insights:complete', (insights) => {
            this.displayInsights(insights);
        });

        this.careerManager.on('insights:error', (error) => {
            this.showError(error);
        });
    }

    /**
     * Show the insights container
     */
    showInsightsContainer() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Switch between insight tabs
     */
    switchTab(tabName) {
        if (!tabName) return;

        this.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.insights-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.insightTab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.insight-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}InsightTab`);
        });
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const content = document.querySelector('.insights-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    <h3>Analyzing Your Career Profile...</h3>
                    <p id="progressMessage">Initializing analysis...</p>
                </div>
            `;
        }
    }

    /**
     * Update progress during analysis
     */
    updateProgress(data) {
        const messageEl = document.getElementById('progressMessage');
        if (messageEl) {
            const messages = {
                'skills': 'Analyzing your skills and finding matches...',
                'recommendations': 'Generating career recommendations...',
                'learning': 'Creating personalized learning paths...',
                'bias': 'Checking for bias and fairness...'
            };
            messageEl.textContent = messages[data.stage] || 'Processing...';
        }
    }

    /**
     * Display complete insights
     */
    displayInsights(insights) {
        this.currentInsights = insights;
        
        // Restore tab structure
        this.restoreTabStructure();
        
        // Populate each tab
        this.displaySkillsAnalysis(insights.skill_analysis);
        this.displayCareerRecommendations(insights.career_recommendations);
        this.displayLearningPaths(insights.learning_paths);
        this.displayMarketAnalysis(insights);
    }

    /**
     * Restore the original tab structure
     */
    restoreTabStructure() {
        const content = document.querySelector('.insights-content');
        if (content) {
            content.innerHTML = `
                <div class="insight-tab-content active" id="skillsInsightTab">
                    <div class="skills-reframing-section">
                        <h3>AI-Enhanced Skills Analysis</h3>
                        <div id="reframedSkillsContent"></div>
                    </div>
                </div>

                <div class="insight-tab-content" id="jobsInsightTab">
                    <div class="job-search-section">
                        <h3>Relevant Job Opportunities</h3>
                        <div class="job-search-controls">
                            <input type="text" id="jobSearchRole" placeholder="Job title or role" class="insight-input">
                            <input type="text" id="jobSearchLocation" placeholder="Location or Remote" class="insight-input">
                            <button id="searchJobsBtn" class="insight-btn">Search Jobs</button>
                        </div>
                        <div id="jobSearchResults"></div>
                    </div>
                </div>

                <div class="insight-tab-content" id="marketInsightTab">
                    <div class="market-analysis-section">
                        <h3>Job Market Intelligence</h3>
                        <div id="marketAnalysisContent"></div>
                    </div>
                </div>

                <div class="insight-tab-content" id="developmentInsightTab">
                    <div class="career-development-section">
                        <h3>Career Development Plan</h3>
                        <div id="careerDevelopmentContent"></div>
                    </div>
                </div>
            `;
        }

        // Re-initialize event listeners
        this.initializeEventListeners();
    }

    /**
     * Display skills analysis
     */
    displaySkillsAnalysis(skillAnalysis) {
        const container = document.getElementById('reframedSkillsContent');
        if (!container || !skillAnalysis) return;

        let html = '<div class="skills-analysis-grid">';

        // Skill matches
        if (skillAnalysis.skill_matches?.length > 0) {
            html += '<div class="analysis-section">';
            html += '<h4>🎯 Skill Matching Results</h4>';
            
            skillAnalysis.skill_matches.forEach(match => {
                const confidenceClass = match.confidence > 0.8 ? 'high-confidence' : 
                                       match.confidence > 0.5 ? 'medium-confidence' : 'low-confidence';
                
                html += `
                    <div class="reframed-skill-item ${confidenceClass}">
                        <div class="skill-original">Original: ${match.original_skill}</div>
                        <div class="skill-reframed">
                            Match Type: ${match.match_type} 
                            ${match.matched_skill_id ? `→ ${match.matched_skill_id}` : ''}
                        </div>
                        <div class="skill-confidence">Confidence: ${(match.confidence * 100).toFixed(1)}%</div>
                        ${match.synonyms?.length > 0 ? `
                            <div class="skill-tools">
                                ${match.synonyms.map(syn => `<span class="tool-tag">${syn}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }

        // Job matches preview
        if (skillAnalysis.job_matches?.length > 0) {
            html += '<div class="analysis-section">';
            html += '<h4>💼 Potential Career Matches</h4>';
            
            skillAnalysis.job_matches.slice(0, 5).forEach(job => {
                html += `
                    <div class="job-match-preview">
                        <div class="job-title">${job.job_title}</div>
                        <div class="job-match-score">Match: ${(job.match_score * 100).toFixed(1)}%</div>
                        <div class="job-skills">
                            Matched Skills: ${job.matched_skills?.length || 0} | 
                            Missing Skills: ${job.missing_skills?.length || 0}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Display career recommendations
     */
    displayCareerRecommendations(recommendations) {
        const container = document.getElementById('jobSearchResults');
        if (!container || !recommendations?.recommendations) return;

        let html = '<div class="recommendations-grid">';
        
        recommendations.recommendations.forEach(rec => {
            html += `
                <div class="job-result-item">
                    <div class="job-title">${rec.job_title}</div>
                    <div class="job-description">${rec.job_description}</div>
                    <div class="job-match-details">
                        <span class="job-match-score">Match: ${(rec.match_score * 100).toFixed(1)}%</span>
                        <span class="job-confidence">Confidence: ${(rec.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div class="job-explanation">${rec.explanation}</div>
                    ${rec.salary_range ? `
                        <div class="job-salary">
                            Salary: $${rec.salary_range[0].toLocaleString()} - $${rec.salary_range[1].toLocaleString()}
                        </div>
                    ` : ''}
                    <div class="job-outlook">Growth Outlook: ${rec.growth_outlook}</div>
                    ${rec.required_skills?.length > 0 ? `
                        <div class="job-skills">
                            Required Skills: ${rec.required_skills.slice(0, 5).join(', ')}
                            ${rec.required_skills.length > 5 ? '...' : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Display learning paths
     */
    displayLearningPaths(learningPaths) {
        const container = document.getElementById('careerDevelopmentContent');
        if (!container || !learningPaths?.length) return;

        let html = '<div class="learning-paths-container">';

        learningPaths.forEach(pathData => {
            const path = pathData.learning_path;
            const rec = pathData.recommendation;

            html += `
                <div class="learning-path-card">
                    <h4>🎯 Path to: ${path.target_job_title}</h4>
                    <div class="path-summary">
                        <div class="path-stat">
                            <span class="stat-value">${path.total_estimated_weeks}</span>
                            <span class="stat-label">Weeks</span>
                        </div>
                        <div class="path-stat">
                            <span class="stat-value">${path.estimated_cost}</span>
                            <span class="stat-label">Cost</span>
                        </div>
                        <div class="path-stat">
                            <span class="stat-value">${path.difficulty_level}</span>
                            <span class="stat-label">Difficulty</span>
                        </div>
                    </div>
                    
                    <div class="development-timeline">
            `;

            path.milestones?.forEach((milestone, index) => {
                html += `
                    <div class="timeline-item">
                        <div class="timeline-phase">Phase ${index + 1}: ${milestone.skill_name}</div>
                        <div class="timeline-content">
                            <p><strong>Target Level:</strong> ${milestone.target_level}</p>
                            <p><strong>Duration:</strong> ${milestone.estimated_weeks} weeks</p>
                            <p><strong>Validation:</strong> ${milestone.validation_method}</p>
                            ${milestone.resources?.length > 0 ? `
                                <div class="resources-list">
                                    <strong>Resources:</strong>
                                    ${milestone.resources.map(resource => `
                                        <div class="resource-item">
                                            <a href="${resource.url}" target="_blank">${resource.title}</a>
                                            <span class="resource-meta">${resource.provider} | ${resource.cost} | ${resource.estimated_hours}h</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Display market analysis
     */
    displayMarketAnalysis(insights) {
        const container = document.getElementById('marketAnalysisContent');
        if (!container) return;

        const recommendations = insights.career_recommendations?.recommendations || [];
        const biasAnalysis = insights.bias_analysis;

        let html = `
            <div class="market-overview">
                <div class="market-stat-grid">
                    <div class="market-stat-item">
                        <div class="market-stat-value">${recommendations.length}</div>
                        <div class="market-stat-label">Career Matches</div>
                    </div>
                    <div class="market-stat-item">
                        <div class="market-stat-value">${(biasAnalysis?.overall_fairness_score * 100 || 85).toFixed(0)}%</div>
                        <div class="market-stat-label">Fairness Score</div>
                    </div>
                    <div class="market-stat-item">
                        <div class="market-stat-value">${insights.skill_analysis?.skill_matches?.length || 0}</div>
                        <div class="market-stat-label">Skills Matched</div>
                    </div>
                </div>

                <div class="market-trends">
                    <h4>🔍 Market Intelligence</h4>
                    <div class="trend-insights">
        `;

        // Add salary insights
        const salaries = recommendations
            .filter(rec => rec.salary_range)
            .map(rec => (rec.salary_range[0] + rec.salary_range[1]) / 2);

        if (salaries.length > 0) {
            const avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
            const maxSalary = Math.max(...salaries);
            
            html += `
                <div class="insight-item">
                    <strong>💰 Salary Potential:</strong>
                    Average expected salary: $${avgSalary.toLocaleString()}
                    (Range up to $${maxSalary.toLocaleString()})
                </div>
            `;
        }

        // Add growth outlook insights
        const outlooks = recommendations.map(rec => rec.growth_outlook).filter(Boolean);
        const excellentGrowth = outlooks.filter(o => o.includes('excellent')).length;
        
        html += `
                <div class="insight-item">
                    <strong>📈 Growth Outlook:</strong>
                    ${excellentGrowth} of ${recommendations.length} recommendations show excellent growth potential
                </div>
        `;

        // Add bias analysis insights
        if (biasAnalysis?.recommendations?.length > 0) {
            html += `
                <div class="insight-item">
                    <strong>⚖️ Fairness Analysis:</strong>
                    ${biasAnalysis.recommendations.join(' ')}
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Handle job search
     */
    async handleJobSearch() {
        const roleInput = document.getElementById('jobSearchRole');
        const locationInput = document.getElementById('jobSearchLocation');
        const resultsContainer = document.getElementById('jobSearchResults');

        if (!this.currentInsights || !resultsContainer) return;

        const role = roleInput?.value.trim();
        const location = locationInput?.value.trim();

        if (!role) {
            resultsContainer.innerHTML = '<p>Please enter a job title to search.</p>';
            return;
        }

        try {
            // Show loading
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="loading-spinner"></div>
                    <p>Searching for jobs...</p>
                </div>
            `;

            // Extract skills from current insights
            const skills = this.currentInsights.user_profile.skills.map(s => s.skill_id);

            // Search for jobs
            const searchResults = await this.careerManager.searchJobs(skills, location, role);

            // Display results
            this.displayJobSearchResults(searchResults);

        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <p>Error searching for jobs: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Display job search results
     */
    displayJobSearchResults(searchResults) {
        const container = document.getElementById('jobSearchResults');
        if (!container) return;

        const { jobs, search_criteria } = searchResults;

        let html = `
            <div class="search-results-header">
                <h4>🔍 Search Results for "${search_criteria.jobTitle}"</h4>
                <p>Found ${jobs.length} matching opportunities</p>
            </div>
        `;

        if (jobs.length === 0) {
            html += '<p>No jobs found for your search criteria. Try different keywords.</p>';
        } else {
            html += '<div class="job-results-grid">';
            
            jobs.forEach(job => {
                html += `
                    <div class="job-result-item">
                        <div class="job-title">${job.job_title}</div>
                        <div class="job-match-score">Match: ${(job.match_score * 100).toFixed(1)}%</div>
                        
                        ${job.market_data ? `
                            <div class="job-market-data">
                                <div class="market-stat">
                                    <span>Employment:</span> ${job.market_data.employment?.toLocaleString() || 'N/A'}
                                </div>
                                <div class="market-stat">
                                    <span>Growth:</span> ${job.market_data.growth_rate || 'N/A'}%
                                </div>
                                <div class="market-stat">
                                    <span>Median Wage:</span> $${job.market_data.median_wage?.toLocaleString() || 'N/A'}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="job-skills-match">
                            <strong>Matched Skills:</strong> ${job.matched_skills?.join(', ') || 'N/A'}
                        </div>
                        
                        ${job.missing_skills?.length > 0 ? `
                            <div class="job-missing-skills">
                                <strong>Skills to Develop:</strong> ${job.missing_skills.join(', ')}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        }

        container.innerHTML = html;
    }

    /**
     * Show error message
     */
    showError(error) {
        const content = document.querySelector('.insights-content');
        if (content) {
            content.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 60px 20px;">
                    <h3>Analysis Error</h3>
                    <p>We encountered an error while analyzing your career profile:</p>
                    <div class="error-details">${error.message}</div>
                    <button onclick="location.reload()" class="insight-btn" style="margin-top: 20px;">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    /**
     * Clear insights display
     */
    clearInsights() {
        this.currentInsights = null;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CareerInsightsUI };
} else {
    // Browser environment
    window.CareerInsightsUI = CareerInsightsUI;
}