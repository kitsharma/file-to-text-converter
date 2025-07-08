/**
 * Browser-compatible ONETSkillMapper
 * Converts TypeScript functionality to vanilla JavaScript with browser-compatible CSV loading
 */

class ONETSkillMapper {
  constructor() {
    this.skillsData = [];
    this.workActivities = [];
    this.synonyms = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadONETData();
      this.buildSynonymDictionary();
      this.isInitialized = true;
      console.log('ONETSkillMapper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ONETSkillMapper:', error);
      // Fallback to mock data if CSV loading fails
      this.loadMockData();
      this.isInitialized = true;
    }
  }

  async loadONETData() {
    try {
      const response = await fetch('/data/skills.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const skillsCSV = await response.text();
      
      // Parse skills CSV
      const skillsLines = skillsCSV.split('\n').filter(line => line.trim());
      if (skillsLines.length < 2) {
        throw new Error('Invalid skills CSV format');
      }
      
      const skillsHeaders = skillsLines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      for (let i = 1; i < skillsLines.length; i++) {
        const line = skillsLines[i];
        if (!line.trim()) continue;
        
        // Parse CSV line handling quoted fields
        const fields = this.parseCSVLine(line);
        if (fields.length >= 3) {
          this.skillsData.push({
            element_id: fields[0],
            skill_name: fields[1],
            skill_description: fields[2]
          });
        }
      }
      
      console.log(`Loaded ${this.skillsData.length} skills from CSV`);
    } catch (error) {
      console.error('Error loading skills CSV:', error);
      throw error;
    }
  }

  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current.trim());
    return fields;
  }

  buildSynonymDictionary() {
    // Build mappings from work activities to skills
    const skillKeywords = new Map();
    
    // Define keyword mappings for common casual terms
    skillKeywords.set('people', ['Social Perceptiveness', 'Active Listening', 'Coordination', 'Service Orientation', 'Negotiation']);
    skillKeywords.set('communication', ['Active Listening', 'Multichannel Communication', 'Reading Comprehension']);
    skillKeywords.set('leadership', ['Team Leadership', 'Coordination', 'Conflict Resolution']);
    skillKeywords.set('analysis', ['Data Analysis', 'Reading Comprehension']);
    skillKeywords.set('customer', ['Customer Relationship Management', 'Service Orientation', 'Complaint Resolution']);
    skillKeywords.set('service', ['Service Orientation', 'Customer Relationship Management', 'Complaint Resolution']);
    skillKeywords.set('teamwork', ['Team Leadership', 'Coordination', 'Social Perceptiveness']);
    skillKeywords.set('problem solving', ['Critical Thinking', 'Complex Problem Solving', 'Decision Making']);
    skillKeywords.set('organization', ['Time Management', 'Monitoring', 'Coordination']);
    skillKeywords.set('computer', ['Computer Systems Analysis', 'Technology Design', 'Programming']);
    
    // Store in synonyms map
    for (const [key, skills] of skillKeywords) {
      this.synonyms.set(key, skills);
    }
  }

  fuzzyMatch(userTerm, skillName) {
    const normalizedUser = userTerm.toLowerCase().trim();
    const normalizedSkill = skillName.toLowerCase().trim();
    
    // Exact match
    if (normalizedUser === normalizedSkill) return 1.0;
    
    // Substring match
    if (normalizedSkill.includes(normalizedUser) || normalizedUser.includes(normalizedSkill)) {
      return 0.8;
    }
    
    // Use fast-levenshtein if available, otherwise simple character comparison
    if (typeof levenshtein !== 'undefined' && levenshtein.get) {
      const distance = levenshtein.get(normalizedUser, normalizedSkill);
      const maxLength = Math.max(normalizedUser.length, normalizedSkill.length);
      const similarity = 1 - (distance / maxLength);
      return similarity;
    } else {
      // Fallback: simple character-based similarity
      const shorter = normalizedUser.length < normalizedSkill.length ? normalizedUser : normalizedSkill;
      const longer = normalizedUser.length >= normalizedSkill.length ? normalizedUser : normalizedSkill;
      let matches = 0;
      
      for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) {
          matches++;
        }
      }
      
      return matches / longer.length;
    }
  }

  findMatchingSkills(userTerm) {
    const matches = [];
    const normalizedTerm = userTerm.toLowerCase();
    
    // Check for synonym matches first
    for (const [key, skills] of this.synonyms) {
      if (normalizedTerm.includes(key)) {
        for (const skillName of skills) {
          const skill = this.skillsData.find(s => s.skill_name === skillName);
          if (skill) {
            matches.push({
              code: skill.element_id,
              name: skill.skill_name,
              confidence: 0.9,
              definition: skill.skill_description
            });
          }
        }
      }
    }
    
    // If we have enough matches from synonyms, return them
    if (matches.length >= 5) {
      return matches.slice(0, 5);
    }
    
    // Otherwise, do fuzzy matching on all skills
    for (const skill of this.skillsData) {
      const confidence = this.fuzzyMatch(userTerm, skill.skill_name);
      if (confidence > 0.3) {
        matches.push({
          code: skill.element_id,
          name: skill.skill_name,
          confidence,
          definition: skill.skill_description
        });
      }
    }
    
    // Remove duplicates by skill name
    const uniqueMatches = matches.filter((match, index) => 
      matches.findIndex(m => m.name === match.name) === index
    );
    
    // Sort by confidence and return top 5
    uniqueMatches.sort((a, b) => b.confidence - a.confidence);
    return uniqueMatches.slice(0, 5);
  }

  async mapUserSkills(casualDescription) {
    // Ensure we're initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const results = [];
    
    for (const userTerm of casualDescription) {
      const matchingSkills = this.findMatchingSkills(userTerm);
      
      // Extract related and adjacent skills
      const relatedSkills = matchingSkills.slice(0, 2).map(s => s.name);
      const adjacentSkills = matchingSkills.slice(2, 4).map(s => s.name);
      
      results.push({
        userTerm,
        onetSkills: matchingSkills,
        relatedSkills,
        adjacentSkills
      });
    }
    
    return results;
  }

  loadMockData() {
    // Fallback mock data if CSV loading fails
    this.skillsData = [
      {
        element_id: "2.A.1.a",
        skill_name: "Active Listening",
        skill_description: "Giving full attention to what other people are saying, taking time to understand the points being made, asking questions as appropriate, and not interrupting at inappropriate times."
      },
      {
        element_id: "2.A.1.b",
        skill_name: "Critical Thinking",
        skill_description: "Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions or approaches to problems."
      },
      {
        element_id: "2.A.1.c",
        skill_name: "Monitoring",
        skill_description: "Monitoring/Assessing performance of yourself, other individuals, or organizations to make improvements or take corrective action."
      },
      {
        element_id: "2.A.1.d",
        skill_name: "Social Perceptiveness",
        skill_description: "Being aware of others' reactions and understanding why they react as they do."
      },
      {
        element_id: "2.A.1.e",
        skill_name: "Coordination",
        skill_description: "Adjusting actions in relation to others' actions."
      },
      {
        element_id: "2.A.1.f",
        skill_name: "Service Orientation",
        skill_description: "Actively looking for ways to help people."
      },
      {
        element_id: "2.A.1.g",
        skill_name: "Complex Problem Solving",
        skill_description: "Identifying complex problems and reviewing related information to develop and evaluate options and implement solutions."
      },
      {
        element_id: "2.A.1.h",
        skill_name: "Reading Comprehension",
        skill_description: "Understanding written sentences and paragraphs in work related documents."
      },
      {
        element_id: "2.A.1.i",
        skill_name: "Time Management",
        skill_description: "Managing one's own time and the time of others."
      },
      {
        element_id: "2.A.1.j",
        skill_name: "Writing",
        skill_description: "Communicating effectively in writing as appropriate for the needs of the audience."
      }
    ];
    
    console.log('Using mock skills data');
  }
}

// Export for browser usage
window.ONETSkillMapper = ONETSkillMapper;