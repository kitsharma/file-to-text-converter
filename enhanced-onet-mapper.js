/**
 * Enhanced ONET Skill Mapper - Uses ONET as an ontology for skill expansion
 * Focuses on transferable skills and market demand
 */

class EnhancedONETMapper extends ONETSkillMapper {
    constructor() {
        super();
        this.skillCategories = {
            'Interpersonal': ['Customer Service', 'Communication', 'Team Collaboration', 'Leadership'],
            'Analytical': ['Problem Solving', 'Data Analysis', 'Critical Thinking', 'Research'],
            'Technical': ['Computer Skills', 'Software Applications', 'Digital Tools'],
            'Management': ['Project Management', 'Time Management', 'Resource Planning'],
            'Creative': ['Innovation', 'Design Thinking', 'Content Creation']
        };
        
        // Market demand scores (simplified - in production, fetch from labor stats)
        this.marketDemand = {
            'Customer Service': 0.85,
            'Data Analysis': 0.95,
            'Project Management': 0.90,
            'Communication': 0.88,
            'Problem Solving': 0.92,
            'Digital Literacy': 0.94,
            'Team Collaboration': 0.87
        };
    }

    /**
     * Find power skills based on resume frequency and market demand
     */
    async findPowerSkills(resumeText, allExtractedSkills, limit = 3) {
        const skillScores = new Map();
        
        for (const skill of allExtractedSkills) {
            // Calculate frequency score (how often mentioned in resume)
            const regex = new RegExp(`\\b${skill}\\b`, 'gi');
            const matches = resumeText.match(regex) || [];
            const frequencyScore = Math.min(matches.length / 10, 1); // Normalize to 0-1
            
            // Get market demand score
            const demandScore = this.getMarketDemandScore(skill);
            
            // Get ONET expansion bonus (skills that connect to many others)
            const expansionScore = await this.getSkillExpansionScore(skill);
            
            // Combined score: 40% frequency, 40% demand, 20% expansion potential
            const totalScore = (frequencyScore * 0.4) + (demandScore * 0.4) + (expansionScore * 0.2);
            
            skillScores.set(skill, {
                skill,
                frequencyScore,
                demandScore,
                expansionScore,
                totalScore,
                category: this.categorizeSkill(skill)
            });
        }
        
        // Sort by total score and return top N
        return Array.from(skillScores.values())
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, limit);
    }

    /**
     * Use ONET ontology to find related and adjacent skills
     */
    async expandSkillsUsingOntology(coreSkill) {
        const expanded = {
            core: coreSkill,
            related: [],
            enables: [],
            requiredFor: []
        };
        
        // Use ONET mapping to find related skills
        const mappings = await this.mapUserSkills([coreSkill]);
        if (mappings.length > 0) {
            const mapping = mappings[0];
            
            // Related skills from ONET
            expanded.related = mapping.relatedSkills || [];
            
            // Find what this skill enables (career progression)
            expanded.enables = this.findEnabledSkills(coreSkill);
            
            // Find roles that require this skill
            expanded.requiredFor = this.findRequiringRoles(coreSkill);
        }
        
        return expanded;
    }

    /**
     * Get market demand score for a skill
     */
    getMarketDemandScore(skill) {
        // Check direct match first
        if (this.marketDemand[skill]) {
            return this.marketDemand[skill];
        }
        
        // Check for partial matches or synonyms
        const skillLower = skill.toLowerCase();
        for (const [key, score] of Object.entries(this.marketDemand)) {
            if (skillLower.includes(key.toLowerCase()) || key.toLowerCase().includes(skillLower)) {
                return score;
            }
        }
        
        // Default score for unmatched skills
        return 0.7;
    }

    /**
     * Calculate how well a skill connects to other skills (expansion potential)
     */
    async getSkillExpansionScore(skill) {
        const mappings = await this.mapUserSkills([skill]);
        if (mappings.length === 0) return 0.5;
        
        const mapping = mappings[0];
        const relatedCount = (mapping.relatedSkills || []).length;
        const adjacentCount = (mapping.adjacentSkills || []).length;
        
        // More connections = higher expansion potential
        return Math.min((relatedCount + adjacentCount) / 10, 1);
    }

    /**
     * Categorize skill using ONET taxonomy or AI-assisted categorization
     */
    categorizeSkill(skill) {
        const skillLower = skill.toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.skillCategories)) {
            for (const keyword of keywords) {
                if (skillLower.includes(keyword.toLowerCase()) || 
                    keyword.toLowerCase().includes(skillLower)) {
                    return category;
                }
            }
        }
        
        return 'General';
    }

    /**
     * Find skills that this skill enables (career progression)
     */
    findEnabledSkills(skill) {
        const progressions = {
            'Customer Service': ['Customer Success Management', 'Account Management', 'Client Relations'],
            'Data Entry': ['Data Analysis', 'Database Management', 'Business Intelligence'],
            'Team Member': ['Team Lead', 'Project Coordinator', 'Department Manager'],
            'Communication': ['Public Relations', 'Content Strategy', 'Corporate Communications']
        };
        
        return progressions[skill] || [`Advanced ${skill}`, `${skill} Leadership`];
    }

    /**
     * Find roles that require this skill
     */
    findRequiringRoles(skill) {
        // In production, this would query ONET occupation data
        const roleMap = {
            'Customer Service': ['Customer Success Manager', 'Account Executive', 'Client Services Director'],
            'Data Analysis': ['Business Analyst', 'Data Scientist', 'Operations Analyst'],
            'Communication': ['Communications Manager', 'Content Strategist', 'Public Relations Specialist'],
            'Problem Solving': ['Consultant', 'Project Manager', 'Operations Manager']
        };
        
        return roleMap[skill] || ['Specialist', 'Analyst', 'Manager'];
    }

    /**
     * Create compelling candidate story for a skill
     */
    createSkillStory(skill, yearsExperience, specificExamples) {
        const templates = {
            'Customer Service': `${yearsExperience} years directly serving customers, demonstrating empathy, problem-solving, and conflict resolution. These are foundational skills for roles in Customer Success, Account Management, and Client Relations.`,
            'Data Analysis': `Proven ability to identify patterns and insights from data. This analytical mindset transfers directly to Business Intelligence, Operations Analysis, and Strategic Planning roles.`,
            'Communication': `Clear and effective communicator across ${specificExamples.length} different contexts. This skill is crucial for Content Strategy, Corporate Communications, and Stakeholder Management.`,
            'default': `${yearsExperience} years of practical experience with ${skill}, demonstrating consistent application and results. This expertise transfers to multiple growth opportunities.`
        };
        
        return templates[skill] || templates.default;
    }
}

// Export for browser usage
window.EnhancedONETMapper = EnhancedONETMapper;