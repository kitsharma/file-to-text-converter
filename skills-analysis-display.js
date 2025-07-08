/**
 * Skills Analysis Display - Progressive reveal with human factors best practices
 * Shows why the candidate is compelling for new opportunities
 */

class SkillsAnalysisDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.enhancedMapper = new EnhancedONETMapper();
        this.expandedCategories = new Set();
    }

    /**
     * Display skills analysis with progressive reveal
     */
    async displaySkillsAnalysis(extractedSkills, resumeText, onComplete) {
        // Show loading state with encouraging message
        this.showLoadingState();
        
        try {
            // Initialize ONET mapper
            await this.enhancedMapper.initialize();
            
            // Find power skills
            const powerSkills = await this.enhancedMapper.findPowerSkills(
                resumeText, 
                extractedSkills, 
                3
            );
            
            // Group remaining skills by category
            const categorizedSkills = this.categorizeAllSkills(extractedSkills);
            
            // Render the analysis
            this.render(powerSkills, categorizedSkills, extractedSkills.length);
            
            if (onComplete) onComplete();
            
        } catch (error) {
            this.showError(error);
        }
    }

    /**
     * Show loading state with empathic message
     */
    showLoadingState() {
        this.container.innerHTML = `
            <div class="skills-loading">
                <div class="loading-spinner"></div>
                <p class="loading-message">Discovering what makes you unique...</p>
            </div>
        `;
    }

    /**
     * Main render method - progressive reveal
     */
    render(powerSkills, categorizedSkills, totalSkillCount) {
        this.container.innerHTML = `
            <div class="skills-analysis-container">
                <!-- Hero Message -->
                <div class="skills-hero">
                    <h2 class="skills-headline">You bring ${totalSkillCount} valuable skills to the table!</h2>
                    <p class="skills-subhead">Here's why employers need someone exactly like you:</p>
                </div>

                <!-- Power Skills Section -->
                <div class="power-skills-section">
                    <h3 class="section-title">🌟 Your Top Transferable Skills</h3>
                    <div class="power-skills-grid">
                        ${powerSkills.map(skill => this.renderPowerSkill(skill)).join('')}
                    </div>
                </div>

                <!-- Progressive Reveal Section -->
                <div class="all-skills-section">
                    <button class="reveal-all-btn" onclick="window.skillsDisplay.toggleAllSkills()">
                        <span class="btn-text">Explore All ${totalSkillCount} Skills</span>
                        <span class="btn-icon">▼</span>
                    </button>
                    
                    <div class="categorized-skills" id="categorizedSkills" style="display: none;">
                        ${this.renderCategorizedSkills(categorizedSkills)}
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="skills-cta">
                    <p class="cta-message">Ready to see which roles need your skills?</p>
                    <button class="primary-cta">Find Matching Opportunities</button>
                </div>
            </div>
        `;
        
        // Store reference for event handlers
        window.skillsDisplay = this;
    }

    /**
     * Render a single power skill with compelling story
     */
    renderPowerSkill(skillData) {
        const { skill, demandScore, frequencyScore } = skillData;
        const demandLevel = demandScore > 0.9 ? 'High' : demandScore > 0.75 ? 'Growing' : 'Steady';
        const story = this.createCompellingStory(skill, frequencyScore);
        
        return `
            <div class="power-skill-card">
                <div class="skill-header">
                    <h4 class="skill-name">${skill}</h4>
                    <span class="demand-badge demand-${demandLevel.toLowerCase()}">${demandLevel} Demand</span>
                </div>
                
                <p class="skill-story">${story}</p>
                
                <div class="skill-expansion">
                    <button class="expand-skill-btn" onclick="window.skillsDisplay.expandSkill('${skill}')">
                        See Related Opportunities →
                    </button>
                </div>
                
                <div class="skill-details" id="details-${skill.replace(/\s+/g, '-')}" style="display: none;">
                    <!-- Populated on expansion -->
                </div>
            </div>
        `;
    }

    /**
     * Create compelling story for why this skill matters
     */
    createCompellingStory(skill, frequencyScore) {
        const mentions = Math.ceil(frequencyScore * 10);
        const stories = {
            'Customer Service': `You've consistently delivered exceptional service experiences. This skill opens doors to Customer Success, Account Management, and Client Relations roles where your empathy and problem-solving abilities are highly valued.`,
            'Data Analysis': `Your analytical mindset appears throughout your experience. Companies desperately need professionals who can turn data into decisions - from Business Intelligence to Strategic Planning roles.`,
            'Communication': `You've demonstrated clear communication across ${mentions > 1 ? 'multiple' : ''} contexts. This foundational skill is critical for leadership, stakeholder management, and cross-functional collaboration.`,
            'Project Management': `You've successfully coordinated tasks and deliverables. This skill translates directly to Operations, Program Management, and Strategic Initiative roles.`,
            'Problem Solving': `Your track record shows creative solutions to challenges. This skill is the foundation for Consulting, Process Improvement, and Innovation roles.`
        };
        
        // Find best matching story or create generic one
        for (const [key, story] of Object.entries(stories)) {
            if (skill.toLowerCase().includes(key.toLowerCase())) {
                return story;
            }
        }
        
        return `Your experience with ${skill} demonstrates valuable expertise that transfers across industries. This skill is increasingly important in today's evolving workplace.`;
    }

    /**
     * Categorize all skills using ONET taxonomy
     */
    categorizeAllSkills(skills) {
        const categorized = {};
        
        for (const skill of skills) {
            const category = this.enhancedMapper.categorizeSkill(skill);
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(skill);
        }
        
        return categorized;
    }

    /**
     * Render categorized skills with expandable sections
     */
    renderCategorizedSkills(categorizedSkills) {
        return Object.entries(categorizedSkills).map(([category, skills]) => `
            <div class="skill-category">
                <button class="category-header" onclick="window.skillsDisplay.toggleCategory('${category}')">
                    <span class="category-name">${category} Skills (${skills.length})</span>
                    <span class="category-toggle">+</span>
                </button>
                <div class="category-skills" id="category-${category}" style="display: none;">
                    <div class="skills-list">
                        ${skills.map(skill => `
                            <span class="skill-chip">${skill}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Toggle all skills visibility
     */
    toggleAllSkills() {
        const container = document.getElementById('categorizedSkills');
        const button = document.querySelector('.reveal-all-btn');
        
        if (container.style.display === 'none') {
            container.style.display = 'block';
            button.querySelector('.btn-text').textContent = 'Hide Additional Skills';
            button.querySelector('.btn-icon').textContent = '▲';
        } else {
            container.style.display = 'none';
            button.querySelector('.btn-text').textContent = `Explore All Skills`;
            button.querySelector('.btn-icon').textContent = '▼';
        }
    }

    /**
     * Toggle category visibility
     */
    toggleCategory(category) {
        const categoryDiv = document.getElementById(`category-${category}`);
        const toggle = categoryDiv.previousElementSibling.querySelector('.category-toggle');
        
        if (categoryDiv.style.display === 'none') {
            categoryDiv.style.display = 'block';
            toggle.textContent = '−';
            this.expandedCategories.add(category);
        } else {
            categoryDiv.style.display = 'none';
            toggle.textContent = '+';
            this.expandedCategories.delete(category);
        }
    }

    /**
     * Expand skill to show ONET relationships
     */
    async expandSkill(skill) {
        const detailsDiv = document.getElementById(`details-${skill.replace(/\s+/g, '-')}`);
        const button = detailsDiv.previousElementSibling.querySelector('.expand-skill-btn');
        
        if (detailsDiv.style.display === 'none') {
            // Show loading
            detailsDiv.innerHTML = '<p class="loading-text">Finding opportunities...</p>';
            detailsDiv.style.display = 'block';
            button.textContent = 'Hide Details ↑';
            
            // Get expanded data
            const expanded = await this.enhancedMapper.expandSkillsUsingOntology(skill);
            
            // Render expanded view
            detailsDiv.innerHTML = `
                <div class="skill-expansion-details">
                    ${expanded.enables.length > 0 ? `
                        <div class="expansion-section">
                            <h5>This skill opens doors to:</h5>
                            <ul class="opportunity-list">
                                ${expanded.enables.map(role => `<li>${role}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${expanded.requiredFor.length > 0 ? `
                        <div class="expansion-section">
                            <h5>Roles actively seeking this skill:</h5>
                            <ul class="role-list">
                                ${expanded.requiredFor.map(role => `<li>${role}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${expanded.related.length > 0 ? `
                        <div class="expansion-section">
                            <h5>Build on this with:</h5>
                            <div class="related-skills">
                                ${expanded.related.map(related => 
                                    `<span class="related-skill-chip">${related}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            detailsDiv.style.display = 'none';
            button.textContent = 'See Related Opportunities →';
        }
    }

    /**
     * Show error with encouraging message
     */
    showError(error) {
        this.container.innerHTML = `
            <div class="skills-error">
                <h3>Let's try a different approach</h3>
                <p>We couldn't analyze your skills automatically, but that doesn't diminish your value!</p>
                <p class="error-detail">Technical issue: ${error.message}</p>
                <button class="retry-btn" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

// Export for browser usage
window.SkillsAnalysisDisplay = SkillsAnalysisDisplay;