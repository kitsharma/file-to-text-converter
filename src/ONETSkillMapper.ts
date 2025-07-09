import { readFileSync } from 'fs';
import * as path from 'path';
import * as levenshtein from 'fast-levenshtein';

interface SkillMapping {
  userTerm: string;
  onetSkills: Array<{
    code: string;
    name: string;
    confidence: number;
    definition: string;
  }>;
  relatedSkills: string[];
  adjacentSkills: string[];
}

interface SkillRecord {
  element_id: string;
  skill_name: string;
  skill_description: string;
}

interface WorkActivityRecord {
  element_id: string;
  work_activity_id: string;
  work_activity_description: string;
  importance_rating: number;
}

class ONETSkillMapper {
  private skillsData: SkillRecord[] = [];
  private workActivities: WorkActivityRecord[] = [];
  private synonyms: Map<string, string[]> = new Map();

  constructor() {
    this.loadONETData();
    this.buildSynonymDictionary();
  }

  private loadONETData() {
    const skillsPath = path.resolve(__dirname, '../assets/data/skills.csv');
    const skillsCSV = readFileSync(skillsPath, 'utf-8');
    
    // Parse skills CSV
    const skillsLines = skillsCSV.split('\n').filter(line => line.trim());
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
  }

  private buildSynonymDictionary() {
    const synonymsPath = path.resolve(__dirname, '../assets/data/skills_to_work_activities.csv');
    const synonymsCSV = readFileSync(synonymsPath, 'utf-8');
    
    // Parse work activities CSV
    const workLines = synonymsCSV.split('\n').filter(line => line.trim());
    const workHeaders = workLines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    for (let i = 1; i < workLines.length; i++) {
      const line = workLines[i];
      if (!line.trim() || line.startsWith('#') || line.includes('just create them')) continue;
      
      const fields = this.parseCSVLine(line);
      if (fields.length >= 4) {
        this.workActivities.push({
          element_id: fields[0],
          work_activity_id: fields[1],
          work_activity_description: fields[2],
          importance_rating: parseFloat(fields[3])
        });
      }
    }
    
    // Build synonym dictionary from work activities
    this.buildSynonymMappings();
  }

  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
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

  private buildSynonymMappings() {
    // Build mappings from work activities to skills
    const skillKeywords = new Map<string, string[]>();
    
    // Define keyword mappings for common casual terms
    skillKeywords.set('people', ['Social Perceptiveness', 'Active Listening', 'Coordination', 'Service Orientation', 'Negotiation']);
    skillKeywords.set('communication', ['Active Listening', 'Multichannel Communication', 'Reading Comprehension']);
    skillKeywords.set('leadership', ['Team Leadership', 'Coordination', 'Conflict Resolution']);
    skillKeywords.set('analysis', ['Data Analysis', 'Reading Comprehension']);
    skillKeywords.set('customer', ['Customer Relationship Management', 'Service Orientation', 'Complaint Resolution']);
    
    // Store in synonyms map
    for (const [key, skills] of skillKeywords) {
      this.synonyms.set(key, skills);
    }
  }

  private fuzzyMatch(userTerm: string, skillName: string): number {
    const normalizedUser = userTerm.toLowerCase().trim();
    const normalizedSkill = skillName.toLowerCase().trim();
    
    // Exact match
    if (normalizedUser === normalizedSkill) return 1.0;
    
    // Substring match
    if (normalizedSkill.includes(normalizedUser) || normalizedUser.includes(normalizedSkill)) {
      return 0.8;
    }
    
    // Levenshtein distance
    const distance = levenshtein.get(normalizedUser, normalizedSkill);
    const maxLength = Math.max(normalizedUser.length, normalizedSkill.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
  }

  private findMatchingSkills(userTerm: string): Array<{code: string, name: string, confidence: number, definition: string}> {
    const matches: Array<{code: string, name: string, confidence: number, definition: string}> = [];
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

  async mapUserSkills(casualDescription: string[]): Promise<SkillMapping[]> {
    const results: SkillMapping[] = [];
    
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
}

export default ONETSkillMapper;
