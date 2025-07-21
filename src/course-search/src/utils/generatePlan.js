/**
 * Career Plan Generator - Client-side template engine for personalized career planning
 * 2025 Rules Engine with AI-enhanced recommendations
 */

const CAREER_PROGRESSION_RULES = {
  // Experience level multipliers for timeline
  experienceMultipliers: {
    'entry': 1.2,
    'junior': 1.0,
    'mid': 0.8,
    'senior': 0.6,
    'expert': 0.4
  },

  // Role-based skill requirements and progression paths
  roleProgression: {
    'Software Engineer': {
      shortTermSkills: ['AI Tools Integration', 'Cloud Development', 'DevOps Basics'],
      longTermSkills: ['System Architecture', 'AI/ML Implementation', 'Technical Leadership'],
      careerPath: ['Senior Engineer', 'Tech Lead', 'Engineering Manager', 'Staff Engineer']
    },
    'Data Scientist': {
      shortTermSkills: ['MLOps', 'Model Deployment', 'Business Intelligence'],
      longTermSkills: ['AI Research', 'Data Strategy', 'Cross-functional Leadership'],
      careerPath: ['Senior Data Scientist', 'ML Engineer', 'Data Science Manager', 'Chief Data Officer']
    },
    'Product Manager': {
      shortTermSkills: ['AI Product Strategy', 'Data-Driven Decision Making', 'User Research'],
      longTermSkills: ['Strategic Planning', 'Executive Communication', 'Market Analysis'],
      careerPath: ['Senior PM', 'Group PM', 'Director of Product', 'VP Product']
    },
    'Marketing': {
      shortTermSkills: ['AI Content Creation', 'Marketing Automation', 'Analytics'],
      longTermSkills: ['Brand Strategy', 'Growth Hacking', 'Team Leadership'],
      careerPath: ['Senior Marketer', 'Marketing Manager', 'Director of Marketing', 'CMO']
    },
    'Administrative Assistant': {
      shortTermSkills: ['AI Productivity Tools', 'Process Automation', 'Digital Communication'],
      longTermSkills: ['Project Management', 'Executive Support', 'Business Operations'],
      careerPath: ['Senior Admin', 'Executive Assistant', 'Operations Manager', 'Business Manager']
    },
    'default': {
      shortTermSkills: ['AI Tool Proficiency', 'Digital Literacy', 'Remote Collaboration'],
      longTermSkills: ['Strategic Thinking', 'Leadership', 'Innovation Management'],
      careerPath: ['Senior Professional', 'Team Lead', 'Manager', 'Director']
    }
  },

  // 2025 AI-enhanced goals based on experience and role
  goalTemplates: {
    techLead: {
      condition: (role, experience, goals) => 
        goals.includes('tech lead') || goals.includes('technical leadership'),
      shortTerm: [
        'Complete advanced system design course',
        'Lead a cross-team technical project',
        'Mentor 2-3 junior developers',
        'Implement AI-powered development workflows'
      ],
      longTerm: [
        'Establish technical standards for the organization',
        'Build and lead a high-performing engineering team',
        'Drive adoption of emerging AI/ML technologies',
        'Contribute to open-source projects in your domain'
      ]
    },
    careerTransition: {
      condition: (role, experience, goals) => 
        goals.includes('career change') || goals.includes('transition'),
      shortTerm: [
        'Complete foundational courses in target field',
        'Build a portfolio demonstrating new skills',
        'Network with professionals in target industry',
        'Complete relevant AI tool certifications'
      ],
      longTerm: [
        'Secure first role in new field',
        'Establish credibility and expertise',
        'Build professional network in new domain',
        'Achieve senior-level proficiency'
      ]
    },
    management: {
      condition: (role, experience, goals) => 
        goals.includes('management') || goals.includes('leadership'),
      shortTerm: [
        'Complete management fundamentals training',
        'Practice delegation and team communication',
        'Learn AI-powered team productivity tools',
        'Establish mentoring relationships'
      ],
      longTerm: [
        'Successfully manage a team of 5+ people',
        'Drive strategic initiatives and OKRs',
        'Develop organizational leadership skills',
        'Build cross-functional collaboration expertise'
      ]
    }
  }
};

/**
 * Generate a personalized career plan based on user profile
 * @param {Object} profile - User profile object
 * @param {string} profile.role - Current or target role
 * @param {string} profile.experience - Experience level (entry, junior, mid, senior, expert)
 * @param {Array<string>} profile.goals - Career goals
 * @param {Array<string>} profile.currentSkills - Current skills
 * @param {Array<Object>} opportunitiesData - Available learning opportunities
 * @returns {Object} - Generated career plan
 */
export function generatePlan(profile, opportunitiesData = null) {
  const {
    role = 'default',
    experience = 'mid',
    goals = [],
    currentSkills = []
  } = profile;

  const experienceMultiplier = CAREER_PROGRESSION_RULES.experienceMultipliers[experience] || 1.0;
  const roleData = CAREER_PROGRESSION_RULES.roleProgression[role] || CAREER_PROGRESSION_RULES.roleProgression.default;
  
  // Determine goal template based on user goals
  let goalTemplate = null;
  for (const [templateName, template] of Object.entries(CAREER_PROGRESSION_RULES.goalTemplates)) {
    if (template.condition(role, experience, goals)) {
      goalTemplate = template;
      break;
    }
  }

  // Generate short-term plan (12 months)
  const shortTermPlan = generateShortTermPlan(roleData, goalTemplate, currentSkills, experienceMultiplier, role, opportunitiesData);
  
  // Generate long-term plan (1-3 years)
  const longTermPlan = generateLongTermPlan(roleData, goalTemplate, experience, role, opportunitiesData);

  return {
    profile: {
      role,
      experience,
      goals,
      currentSkills
    },
    shortTerm: shortTermPlan,
    longTerm: longTermPlan,
    generatedAt: new Date().toISOString(),
    nextReviewDate: getNextReviewDate()
  };
}

function generateShortTermPlan(roleData, goalTemplate, currentSkills, experienceMultiplier, role, opportunitiesData) {
  const baseActions = goalTemplate ? goalTemplate.shortTerm : [
    `Master ${roleData.shortTermSkills[0]} for immediate impact`,
    `Complete certification in ${roleData.shortTermSkills[1]}`,
    `Build a project showcasing ${roleData.shortTermSkills[2]} skills`,
    'Expand professional network through industry events'
  ];

  const skillGaps = roleData.shortTermSkills.filter(skill => 
    !currentSkills.some(current => 
      current.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(current.toLowerCase())
    )
  );

  // Enhanced actions with skill requirements and opportunity linking
  const enhancedActions = baseActions.map(action => {
    const requiredSkill = extractSkillFromAction(action, roleData.shortTermSkills);
    const opportunity = findMatchingOpportunity(requiredSkill, role, opportunitiesData);
    
    return {
      text: action,
      requiredSkill: requiredSkill,
      opportunity: opportunity
    };
  });

  const customActions = skillGaps.slice(0, 2).map(skill => {
    const opportunity = findMatchingOpportunity(skill, role, opportunitiesData);
    return {
      text: `Learn ${skill} through hands-on projects`,
      requiredSkill: skill,
      opportunity: opportunity
    };
  });

  const additionalActions = [
    {
      text: '2025 AI Integration: Incorporate AI tools into daily workflow',
      requiredSkill: 'AI Tools',
      opportunity: findMatchingOpportunity('AI', role, opportunitiesData)
    },
    {
      text: 'Build measurable project portfolio demonstrating new skills',
      requiredSkill: 'Portfolio Development',
      opportunity: null
    }
  ];

  return {
    title: 'Short-Term Goals (Next 12 Months)',
    timeframe: '12 months',
    actions: [...enhancedActions, ...customActions, ...additionalActions].slice(0, 6),
    focusAreas: roleData.shortTermSkills,
    estimatedTimeCommitment: Math.round(10 * experienceMultiplier) + ' hours/week'
  };
}

function generateLongTermPlan(roleData, goalTemplate, experience, role, opportunitiesData) {
  const baseActions = goalTemplate ? goalTemplate.longTerm : [
    `Achieve expertise in ${roleData.longTermSkills[0]}`,
    `Progress to ${roleData.careerPath[1]} role`,
    `Build thought leadership in ${roleData.longTermSkills[1]}`,
    `Establish yourself as a ${roleData.longTermSkills[2]} expert`
  ];

  // Add 2025-specific long-term actions
  const futureActions = [
    'Position yourself as an AI-augmented professional leader',
    'Develop expertise in emerging technologies and methodologies',
    'Build cross-functional collaboration and strategic thinking skills'
  ];

  // Enhanced actions with skill requirements and opportunity linking
  const enhancedActions = baseActions.map(action => {
    const requiredSkill = extractSkillFromAction(action, roleData.longTermSkills);
    const opportunity = findMatchingOpportunity(requiredSkill, role, opportunitiesData);
    
    return {
      text: action,
      requiredSkill: requiredSkill,
      opportunity: opportunity
    };
  });

  const enhancedFutureActions = futureActions.slice(0, 2).map(action => {
    const requiredSkill = action.includes('AI') ? 'AI Leadership' : 'Strategic Planning';
    const opportunity = findMatchingOpportunity(requiredSkill, role, opportunitiesData);
    
    return {
      text: action,
      requiredSkill: requiredSkill,
      opportunity: opportunity
    };
  });

  const nextRole = experience === 'senior' || experience === 'expert' 
    ? roleData.careerPath[2] || roleData.careerPath[1]
    : roleData.careerPath[1] || roleData.careerPath[0];

  return {
    title: 'Long-Term Vision (1-3 Years)',
    timeframe: '1-3 years',
    actions: [...enhancedActions, ...enhancedFutureActions].slice(0, 6),
    targetRole: nextRole,
    focusAreas: roleData.longTermSkills,
    milestones: [
      `Year 1: Master ${roleData.longTermSkills[0]} and demonstrate impact`,
      `Year 2: Lead initiatives in ${roleData.longTermSkills[1]}`,
      `Year 3: Transition to ${nextRole} with proven track record`
    ]
  };
}

function getNextReviewDate() {
  const reviewDate = new Date();
  reviewDate.setMonth(reviewDate.getMonth() + 3); // Quarterly reviews
  return reviewDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

// Additional utility functions for plan optimization

/**
 * Analyze skill gaps based on role and current skills
 * @param {string} role - Target role
 * @param {Array<string>} currentSkills - User's current skills
 * @returns {Object} - Skill gap analysis
 */
export function analyzeSkillGaps(role, currentSkills) {
  const roleData = CAREER_PROGRESSION_RULES.roleProgression[role] || 
                   CAREER_PROGRESSION_RULES.roleProgression.default;
  
  const requiredSkills = [...roleData.shortTermSkills, ...roleData.longTermSkills];
  
  const gaps = requiredSkills.filter(skill => 
    !currentSkills.some(current => 
      current.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(current.toLowerCase())
    )
  );

  const strengths = requiredSkills.filter(skill => 
    currentSkills.some(current => 
      current.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(current.toLowerCase())
    )
  );

  return {
    criticalGaps: gaps.slice(0, 3),
    developmentAreas: gaps.slice(3, 6),
    existingStrengths: strengths,
    overallReadiness: Math.round((strengths.length / requiredSkills.length) * 100)
  };
}

/**
 * Get personalized recommendations based on plan
 * @param {Object} plan - Generated career plan
 * @returns {Array<string>} - Personalized recommendations
 */
export function getPersonalizedRecommendations(plan) {
  const recommendations = [];
  
  const { role, experience, goals } = plan.profile;
  
  // Experience-based recommendations
  if (experience === 'entry' || experience === 'junior') {
    recommendations.push('Focus on building foundational skills before advanced specialization');
  } else if (experience === 'senior' || experience === 'expert') {
    recommendations.push('Consider mentoring others while developing leadership capabilities');
  }

  // Role-specific recommendations
  if (role.includes('Engineer')) {
    recommendations.push('Stay current with AI development tools and pair programming with AI assistants');
  } else if (role.includes('Manager') || goals.includes('leadership')) {
    recommendations.push('Develop emotional intelligence and cross-functional collaboration skills');
  }

  // 2025-specific recommendations
  recommendations.push('Integrate AI tools into your daily workflow to stay competitive');
  
  if (goals.includes('career change')) {
    recommendations.push('Build a strong portfolio and consider transitional roles to bridge experience gaps');
  }

  return recommendations.slice(0, 4); // Return top 4 recommendations
}

// Helper functions for opportunity linking

/**
 * Extract skill from action text
 * @param {string} actionText - Action text
 * @param {Array<string>} skillsContext - Skills context for matching
 * @returns {string} - Extracted skill
 */
function extractSkillFromAction(actionText, skillsContext) {
  // Try to match skills from context
  for (const skill of skillsContext) {
    if (actionText.toLowerCase().includes(skill.toLowerCase())) {
      return skill;
    }
  }
  
  // Extract skill keywords from common patterns
  const skillPatterns = [
    /Master\s+([\w\s]+)\s+for/i,
    /Complete\s+certification\s+in\s+([\w\s]+)/i,
    /Learn\s+([\w\s]+)\s+through/i,
    /Build\s+a\s+project\s+showcasing\s+([\w\s]+)\s+skills/i
  ];
  
  for (const pattern of skillPatterns) {
    const match = actionText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Default fallback
  if (actionText.toLowerCase().includes('ai')) return 'AI';
  if (actionText.toLowerCase().includes('python')) return 'Python';
  if (actionText.toLowerCase().includes('leadership')) return 'Leadership';
  if (actionText.toLowerCase().includes('management')) return 'Management';
  
  return 'Professional Development';
}

/**
 * Find matching opportunity from opportunities data
 * @param {string} skill - Required skill
 * @param {string} role - User role
 * @param {Array<Object>} opportunitiesData - Available opportunities
 * @returns {Object|null} - Matching opportunity
 */
function findMatchingOpportunity(skill, role, opportunitiesData) {
  if (!opportunitiesData || !skill) return null;
  
  // First, try exact role and skill match
  let matches = opportunitiesData.filter(opportunity => {
    const hasRoleMatch = opportunity.tags.some(tag => 
      tag.toLowerCase() === role.toLowerCase() ||
      role.toLowerCase().includes(tag.toLowerCase())
    );
    const hasSkillMatch = opportunity.tags.some(tag => 
      tag.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(tag.toLowerCase())
    ) || opportunity.title.toLowerCase().includes(skill.toLowerCase());
    
    return hasRoleMatch && hasSkillMatch;
  });
  
  // If no exact match, try skill match only
  if (matches.length === 0) {
    matches = opportunitiesData.filter(opportunity => {
      return opportunity.tags.some(tag => 
        tag.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(tag.toLowerCase())
      ) || opportunity.title.toLowerCase().includes(skill.toLowerCase()) ||
          opportunity.description.toLowerCase().includes(skill.toLowerCase());
    });
  }
  
  // If still no match, try broader AI/general matches
  if (matches.length === 0 && (skill.toLowerCase().includes('ai') || skill === 'Professional Development')) {
    matches = opportunitiesData.filter(opportunity => 
      opportunity.tags.includes('AI') || 
      opportunity.title.toLowerCase().includes('ai') ||
      opportunity.tags.includes('Productivity')
    );
  }
  
  // Return the highest-rated match
  if (matches.length > 0) {
    return matches.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  }
  
  return null;
}