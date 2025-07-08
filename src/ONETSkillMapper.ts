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

class ONETSkillMapper {
  private skillsData: any;
  private synonyms: Map<string, string[]> = new Map();

  constructor() {
    this.loadONETData();
    this.buildSynonymDictionary();
  }

  private loadONETData() {
    const skillsPath = path.resolve(__dirname, '../data/skills.csv');
    const skillsCSV = readFileSync(skillsPath, 'utf-8');
    // Parse CSV and load into this.skillsData
  }

  private buildSynonymDictionary() {
    const synonymsPath = path.resolve(__dirname, '../data/skills_to_work_activities.csv');
    const synonymsCSV = readFileSync(synonymsPath, 'utf-8');
    // Parse CSV and populate this.synonyms
  }

  async mapUserSkills(casualDescription: string[]): Promise<SkillMapping[]> {
    // Implement fuzzy matching and return skill mappings
    return [{
      userTerm: casualDescription[0],
      onetSkills: [
        {
          code: "1.A.1.c",
          name: "Social Perceptiveness",
          confidence: 0.9,
          definition: "Being aware of others' reactions and understanding why they react as they do."
        },
        {
          code: "1.A.1.d",
          name: "Active Listening",
          confidence: 0.85,
          definition: "Giving full attention to what other people are saying, taking time to understand the points being made, asking questions as appropriate, and not interrupting at inappropriate times."
        }
      ],
      relatedSkills: ["Communication", "Empathy"],
      adjacentSkills: ["Negotiation", "Persuasion"]
    }];
  }
}

export default ONETSkillMapper;
