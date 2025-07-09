// UX-Enhanced Resume Display - Human Factors Team Implementation
class UXEnhancedResumeDisplay {
    constructor() {
        this.emotionalStates = {
            UPLOADING: 'anxious',
            PROCESSING: 'hopeful', 
            ANALYZED: 'empowered'
        };
        this.currentState = null;
        this.confidenceScore = 0;
    }

    async displayAnalysisWithEmpathy(analysisData, fileName) {
        try {
            this.transitionToState('ANALYZED');
            
            // Calculate confidence score based on resume strength
            this.confidenceScore = this.calculateConfidenceScore(analysisData);
            
            // Create empowering narrative flow
            this.createEmpoweringHeader(analysisData);
            this.displayStrengthsFirst(analysisData);
            this.showGrowthOpportunities(analysisData);
            this.displaySecurityAssurance();
            this.provideActionableNextSteps(analysisData);
            
            // Technical details available but not prominent
            this.addTechnicalDetailsToggle(analysisData);
        } catch (error) {
            console.error('UX Enhancement Error:', error);
            // Fallback to showing the resume analysis container
            document.getElementById('resumeAnalysis').style.display = 'block';
        }
    }

    calculateConfidenceScore(data) {
        let score = 0;
        
        // Skills diversity (0-40 points)
        const skillsCount = data.skills.length;
        score += Math.min(skillsCount * 2, 40);
        
        // Experience depth (0-30 points) 
        const expYears = this.estimateYearsOfExperience(data.experience);
        score += Math.min(expYears * 3, 30);
        
        // Education factor (0-20 points)
        if (data.education.length > 0) {
            score += data.education.some(edu => 
                edu.degree && /bachelor|master|phd/i.test(edu.degree)
            ) ? 20 : 10;
        }
        
        // Leadership indicators (0-10 points)
        const hasLeadership = data.experience.some(exp =>
            exp.description.some(desc => 
                /lead|manage|direct|supervise|coordinate/i.test(desc)
            )
        );
        if (hasLeadership) score += 10;
        
        return Math.min(score, 100);
    }

    createEmpoweringHeader(data) {
        const headerContainer = this.createOrUpdateElement('empoweringHeader', `
            <div class="empowering-header">
                <div class="confidence-indicator">
                    <div class="confidence-circle">
                        <span class="confidence-score">${this.confidenceScore}</span>
                        <span class="confidence-label">Career Strength</span>
                    </div>
                </div>
                <div class="empowering-message">
                    <h2>${this.getEmpoweringMessage()}</h2>
                    <p class="reassurance-text">${this.getReassuranceMessage()}</p>
                </div>
                <div class="security-badge">
                    <span class="shield-icon">🛡️</span>
                    <span>100% Private Analysis</span>
                </div>
            </div>
        `);
        
        // Animate confidence score
        this.animateConfidenceScore();
    }

    getEmpoweringMessage() {
        if (this.confidenceScore >= 80) {
            return "🌟 You Have Strong Career Foundations";
        } else if (this.confidenceScore >= 60) {
            return "✨ You're Building Solid Career Assets";
        } else if (this.confidenceScore >= 40) {
            return "🚀 You Have Great Potential to Grow";
        } else {
            return "🌱 Every Expert Was Once a Beginner";
        }
    }

    getReassuranceMessage() {
        const skillsCount = this.currentAnalysis?.skills?.length || 0;
        const experienceCount = this.currentAnalysis?.experience?.length || 0;
        
        if (skillsCount >= 10 && experienceCount >= 2) {
            return "Your diverse skills and experience show you're adaptable and valuable in the evolving job market.";
        } else if (skillsCount >= 5) {
            return "You have a solid skill foundation that can be leveraged across multiple career paths.";
        } else {
            return "Your resume shows potential. Let's identify opportunities to showcase your strengths even more.";
        }
    }

    displayStrengthsFirst(data) {
        this.currentAnalysis = data;
        
        const strengthsContainer = this.createOrUpdateElement('careerStrengths', `
            <div class="analysis-section strengths-section">
                <h3>💪 Your Career Strengths</h3>
                <div class="strengths-grid">
                    ${this.renderTopSkills(data.skills)}
                    ${this.renderExperienceHighlights(data.experience)}
                    ${this.renderUniqueAssets(data)}
                </div>
            </div>
        `);
    }

    renderTopSkills(skills) {
        if (skills.length === 0) {
            return `
                <div class="strength-card">
                    <h4>🔧 Technical Foundation</h4>
                    <p>Ready to build upon existing knowledge and experience</p>
                </div>
            `;
        }

        const topSkills = skills.slice(0, 6);
        return `
            <div class="strength-card">
                <h4>🔧 Technical Skills (${skills.length} identified)</h4>
                <div class="skill-highlights">
                    ${topSkills.map(skill => `<span class="skill-highlight">${skill}</span>`).join('')}
                    ${skills.length > 6 ? `<span class="more-skills">+${skills.length - 6} more</span>` : ''}
                </div>
            </div>
        `;
    }

    renderExperienceHighlights(experience) {
        if (experience.length === 0) {
            return `
                <div class="strength-card">
                    <h4>🚀 Growth Potential</h4>
                    <p>Ready to start building professional experience</p>
                </div>
            `;
        }

        const years = this.estimateYearsOfExperience(experience);
        const roles = experience.length;
        
        return `
            <div class="strength-card">
                <h4>💼 Professional Experience</h4>
                <div class="experience-summary">
                    <div class="exp-metric">
                        <span class="metric-value">${years}+</span>
                        <span class="metric-label">Years</span>
                    </div>
                    <div class="exp-metric">
                        <span class="metric-value">${roles}</span>
                        <span class="metric-label">Roles</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderUniqueAssets(data) {
        const assets = [];
        
        // Check for leadership
        const hasLeadership = data.experience.some(exp =>
            exp.description.some(desc => 
                /lead|manage|direct|supervise/i.test(desc)
            )
        );
        if (hasLeadership) assets.push("Leadership Experience");
        
        // Check for education
        if (data.education.length > 0) {
            const hasAdvanced = data.education.some(edu => 
                edu.degree && /master|phd|mba/i.test(edu.degree)
            );
            assets.push(hasAdvanced ? "Advanced Education" : "Educational Foundation");
        }
        
        // Check for diverse skills
        const technicalSkills = data.skills.filter(skill => 
            /javascript|python|sql|aws|react/i.test(skill)
        ).length;
        const softSkills = data.skills.filter(skill =>
            /communication|leadership|problem solving/i.test(skill)
        ).length;
        
        if (technicalSkills > 3 && softSkills > 2) {
            assets.push("Well-Rounded Skill Set");
        }

        if (assets.length === 0) {
            assets.push("Growth Mindset", "Learning Potential");
        }

        return `
            <div class="strength-card">
                <h4>⭐ Unique Assets</h4>
                <ul class="assets-list">
                    ${assets.map(asset => `<li>${asset}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    showGrowthOpportunities(data) {
        const opportunitiesContainer = this.createOrUpdateElement('growthOpportunities', `
            <div class="analysis-section opportunities-section">
                <h3>🌱 Growth Opportunities</h3>
                <div class="opportunities-grid">
                    ${this.suggestSkillGrowth(data.skills)}
                    ${this.suggestCareerProgression(data.experience)}
                    ${this.suggestNetworkingOpportunities(data)}
                </div>
            </div>
        `);
    }

    suggestSkillGrowth(skills) {
        const techSkills = skills.filter(s => 
            /javascript|python|react|sql|aws|docker|kubernetes/i.test(s)
        );
        
        let suggestions = [];
        
        if (techSkills.length < 3) {
            suggestions.push("Consider learning in-demand technical skills");
        }
        
        if (!skills.some(s => /leadership|management/i.test(s))) {
            suggestions.push("Develop leadership and management capabilities");
        }
        
        if (!skills.some(s => /data|analytics|ai|machine learning/i.test(s))) {
            suggestions.push("Explore data analysis and AI tools");
        }

        return `
            <div class="opportunity-card">
                <h4>📈 Skill Development</h4>
                <ul class="suggestions-list">
                    ${suggestions.slice(0, 2).map(suggestion => 
                        `<li class="suggestion-item">${suggestion}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    suggestCareerProgression(experience) {
        const currentLevel = this.assessCareerLevel(experience);
        let suggestions = [];

        switch(currentLevel) {
            case 'entry':
                suggestions.push("Focus on building specialized expertise");
                suggestions.push("Seek mentorship and learning opportunities");
                break;
            case 'mid':
                suggestions.push("Consider leadership or senior technical roles");
                suggestions.push("Expand cross-functional collaboration");
                break;
            case 'senior':
                suggestions.push("Explore executive or consulting opportunities");
                suggestions.push("Consider mentoring and knowledge sharing");
                break;
        }

        return `
            <div class="opportunity-card">
                <h4>🎯 Career Progression</h4>
                <ul class="suggestions-list">
                    ${suggestions.map(suggestion => 
                        `<li class="suggestion-item">${suggestion}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    suggestNetworkingOpportunities(data) {
        return `
            <div class="opportunity-card">
                <h4>🤝 Network Building</h4>
                <ul class="suggestions-list">
                    <li class="suggestion-item">Connect with professionals in your field</li>
                    <li class="suggestion-item">Attend industry events and conferences</li>
                </ul>
            </div>
        `;
    }

    displaySecurityAssurance() {
        const securityContainer = this.createOrUpdateElement('securityAssurance', `
            <div class="security-assurance">
                <div class="security-content">
                    <h3>🔒 Your Privacy is Protected</h3>
                    <div class="security-features">
                        <div class="security-feature">
                            <span class="feature-icon">🛡️</span>
                            <span>No data sent to servers</span>
                        </div>
                        <div class="security-feature">
                            <span class="feature-icon">🗑️</span>
                            <span>Analysis deleted when you close tab</span>
                        </div>
                        <div class="security-feature">
                            <span class="feature-icon">🔐</span>
                            <span>PII automatically redacted</span>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    provideActionableNextSteps(data) {
        const nextStepsContainer = this.createOrUpdateElement('actionableSteps', `
            <div class="analysis-section next-steps-section">
                <h3>🎯 Recommended Next Steps</h3>
                <div class="steps-container">
                    ${this.generatePersonalizedSteps(data)}
                </div>
                <div class="action-buttons">
                    <button class="primary-action-btn" onclick="this.startCareerPlan()">
                        📋 Create My Career Plan
                    </button>
                    <button class="secondary-action-btn" onclick="this.exportAnalysis()">
                        💾 Save Analysis
                    </button>
                </div>
            </div>
        `);
    }

    generatePersonalizedSteps(data) {
        const steps = [];
        
        // Skill-based recommendations
        if (data.skills.length < 5) {
            steps.push({
                priority: "immediate",
                action: "Identify 3-5 additional skills from your experience to highlight",
                timeframe: "This week"
            });
        }
        
        // Experience optimization
        if (data.experience.length > 0) {
            const hasMetrics = data.experience.some(exp => 
                exp.description.some(desc => /\d+%|\$\d+|improved|increased/i.test(desc))
            );
            
            if (!hasMetrics) {
                steps.push({
                    priority: "high",
                    action: "Add quantifiable achievements to your experience descriptions",
                    timeframe: "Next 2 weeks"
                });
            }
        }
        
        // Career development
        steps.push({
            priority: "ongoing",
            action: "Research emerging trends in your industry",
            timeframe: "Monthly"
        });

        return steps.map((step, index) => `
            <div class="step-item step-${step.priority}">
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-action">${step.action}</div>
                    <div class="step-timeframe">${step.timeframe}</div>
                </div>
            </div>
        `).join('');
    }

    addTechnicalDetailsToggle(data) {
        const toggleContainer = this.createOrUpdateElement('technicalToggle', `
            <div class="technical-details-toggle">
                <button class="toggle-btn" onclick="this.toggleTechnicalDetails()">
                    <span class="toggle-text">View Technical Details</span>
                    <span class="toggle-arrow">▼</span>
                </button>
                <div class="technical-details" style="display: none;">
                    <div class="json-output">
                        <h4>Raw Analysis Data</h4>
                        <pre>${JSON.stringify({
                            skills: data.skills,
                            experience: data.experience
                        }, null, 2)}</pre>
                    </div>
                </div>
            </div>
        `);
    }

    // Utility methods
    estimateYearsOfExperience(experience) {
        if (experience.length === 0) return 0;
        
        // Simple heuristic: assume 2 years per role on average
        return Math.max(1, experience.length * 2);
    }

    assessCareerLevel(experience) {
        const years = this.estimateYearsOfExperience(experience);
        const hasLeadership = experience.some(exp =>
            exp.title && /senior|lead|manager|director/i.test(exp.title)
        );
        
        if (years < 3) return 'entry';
        if (years < 8 || !hasLeadership) return 'mid';
        return 'senior';
    }

    createOrUpdateElement(id, innerHTML) {
        let element = document.getElementById(id);
        if (!element) {
            element = document.createElement('div');
            element.id = id;
            // Insert into resume analysis container
            const container = document.getElementById('resumeAnalysis');
            if (container) {
                container.appendChild(element);
            }
        }
        element.innerHTML = innerHTML;
        return element;
    }

    animateConfidenceScore() {
        const scoreElement = document.querySelector('.confidence-score');
        if (scoreElement) {
            let current = 0;
            const target = this.confidenceScore;
            const increment = Math.ceil(target / 30); // Animate over 30 frames
            
            const animate = () => {
                if (current < target) {
                    current = Math.min(current + increment, target);
                    scoreElement.textContent = current;
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }
    }

    transitionToState(newState) {
        this.currentState = newState;
        document.body.setAttribute('data-emotional-state', this.emotionalStates[newState]);
    }

    getEmpathicProgressMessage(technicalMessage) {
        const empathicMessages = {
            'Loading PDF...': 'Carefully reading your resume...',
            'Parsing PDF structure...': 'Understanding your document...',
            'Extracting text from page': 'Analyzing your experiences...',
            'Parsing Word document structure...': 'Processing your resume...',
            'Extracting text content...': 'Identifying your strengths...',
            'Reading text file...': 'Reviewing your background...',
            'Processing text content...': 'Discovering your potential...',
            'Analyzing resume structure...': 'Mapping your career journey...',
            'Extracting skills...': 'Identifying your talents...',
            'Processing experience...': 'Highlighting your achievements...',
            'Analyzing education...': 'Reviewing your qualifications...',
            'Generating insights...': 'Crafting your success story...',
            'Finalizing analysis...': 'Preparing your personalized insights...'
        };

        // Check if message contains any key phrases
        for (const [key, value] of Object.entries(empathicMessages)) {
            if (technicalMessage.includes(key)) {
                return value;
            }
        }

        // Default empathic message
        return 'Analyzing your career potential...';
    }

    // Action handlers
    startCareerPlan() {
        // This would integrate with the next user story
        console.log('Starting career plan creation...');
    }

    exportAnalysis() {
        // Export user-friendly summary, not just raw JSON
        const summary = this.generateUserFriendlySummary();
        const blob = new Blob([summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `career_analysis_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    generateUserFriendlySummary() {
        return `
Your Career Analysis Summary
Generated on ${new Date().toLocaleDateString()}

CAREER STRENGTH SCORE: ${this.confidenceScore}/100

YOUR STRENGTHS:
- ${this.currentAnalysis.skills.length} technical skills identified
- ${this.currentAnalysis.experience.length} professional experiences
- Strong foundation for career growth

NEXT STEPS:
1. Highlight your quantifiable achievements
2. Continue developing in-demand skills  
3. Build your professional network

Remember: Every career journey is unique. Focus on continuous learning and building on your existing strengths.

---
Analysis performed privately in your browser. No data was transmitted to external servers.
        `.trim();
    }

    toggleTechnicalDetails() {
        const details = document.querySelector('.technical-details');
        const arrow = document.querySelector('.toggle-arrow');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            arrow.textContent = '▲';
        } else {
            details.style.display = 'none'; 
            arrow.textContent = '▼';
        }
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.UXEnhancedResumeDisplay = UXEnhancedResumeDisplay;
}