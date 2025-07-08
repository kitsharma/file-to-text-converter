/**
 * Test fixtures for ONETSkillMapper testing
 * These represent realistic data structures that the mapper should handle
 */

export const mockSkillsData = [
  {
    element_id: "2.A.1.a",
    skill_name: "Reading Comprehension",
    skill_description: "Understanding written sentences and paragraphs in work-related documents."
  },
  {
    element_id: "2.A.1.b", 
    skill_name: "Active Listening",
    skill_description: "Giving full attention to what other people are saying, taking time to understand the points being made."
  },
  {
    element_id: "2.B.1.a",
    skill_name: "Written Comprehension",
    skill_description: "The ability to read and understand information and ideas presented in writing."
  },
  {
    element_id: "2.B.1.b",
    skill_name: "Oral Comprehension", 
    skill_description: "The ability to listen to and understand information and ideas presented through spoken words and sentences."
  },
  {
    element_id: "2.C.1.a",
    skill_name: "Problem Sensitivity",
    skill_description: "The ability to tell when something is wrong or is likely to go wrong."
  }
];

export const mockSynonymsData = [
  {
    casual_term: "good with people",
    formal_skills: ["Active Listening", "Social Perceptiveness", "Service Orientation"]
  },
  {
    casual_term: "tech savvy",
    formal_skills: ["Computer Programming", "Systems Analysis", "Technology Design"]
  },
  {
    casual_term: "organized",
    formal_skills: ["Time Management", "Coordination", "Management of Personnel Resources"]
  },
  {
    casual_term: "creative",
    formal_skills: ["Originality", "Fluency of Ideas", "Visualization"]
  }
];

export const expectedSkillMappingResults = {
  "good with people": {
    userTerm: "good with people",
    onetSkills: [
      {
        code: "2.A.1.b",
        name: "Active Listening",
        confidence: 0.9,
        definition: "Giving full attention to what other people are saying, taking time to understand the points being made."
      }
    ],
    relatedSkills: ["Communication", "Empathy"],
    adjacentSkills: ["Social Perceptiveness", "Service Orientation"]
  },
  "tech savvy": {
    userTerm: "tech savvy", 
    onetSkills: [
      {
        code: "2.B.3.a",
        name: "Computer Programming",
        confidence: 0.85,
        definition: "Writing computer programs for various purposes."
      }
    ],
    relatedSkills: ["Technical Skills", "Problem Solving"],
    adjacentSkills: ["Systems Analysis", "Technology Design"]
  }
};

export const testCasesForFuzzyMatching = [
  { input: "communicate", expected: "Communication" },
  { input: "comunicate", expected: "Communication" }, // typo
  { input: "leadership", expected: "Leadership" },
  { input: "lead", expected: "Leadership" }, // partial match
  { input: "organize", expected: "Organization" },
  { input: "organised", expected: "Organization" }, // British spelling
];

export const edgeCaseInputs = [
  { input: [], expectedOutput: [] },
  { input: [""], expectedOutput: [] },
  { input: ["nonexistent skill xyz"], expectedOutput: [] },
  { input: ["!@#$%"], expectedOutput: [] },
  { input: [" "], expectedOutput: [] },
];