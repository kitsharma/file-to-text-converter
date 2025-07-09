# src/services/skill_matcher.py
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import re
from difflib import SequenceMatcher

from src.models.skill_ontology import Skill, Job, SkillOntology, UserSkill
from src.integrations.onet_integration import ONETIntegration


@dataclass
class SkillMatch:
    """Represents a skill match result"""
    user_term: str
    matched_skill: Skill
    match_score: float  # 0.0 to 1.0
    match_type: str  # 'exact', 'synonym', 'fuzzy', 'semantic'
    confidence: float  # 0.0 to 1.0


@dataclass
class JobMatch:
    """Represents a job match result"""
    job: Job
    match_score: float  # 0.0 to 1.0
    matched_skills: List[SkillMatch]
    missing_skills: List[str]
    transferable_skills: List[str]


class SkillMatcher:
    """Service for matching user skills to formal skills and jobs"""
    
    def __init__(self, ontology: SkillOntology, onet_integration: ONETIntegration):
        self.ontology = ontology
        self.onet = onet_integration
        
        # Build inverse synonym index for faster lookups
        self.synonym_index: Dict[str, List[str]] = {}
        self._build_synonym_index()
    
    def _build_synonym_index(self):
        """Build reverse index from synonyms to skill IDs"""
        for skill_id, skill in self.ontology.skills.items():
            for synonym in skill.synonyms:
                synonym_lower = synonym.lower()
                if synonym_lower not in self.synonym_index:
                    self.synonym_index[synonym_lower] = []
                self.synonym_index[synonym_lower].append(skill_id)
    
    def match_user_skills(self, user_descriptions: List[str]) -> List[SkillMatch]:
        """Match user skill descriptions to formal skills"""
        matches = []
        
        for description in user_descriptions:
            # Try different matching strategies in order of preference
            match = (self._exact_match(description) or
                    self._synonym_match(description) or
                    self._fuzzy_match(description) or
                    self._semantic_match(description))
            
            if match:
                matches.append(match)
        
        return matches
    
    def _exact_match(self, user_term: str) -> Optional[SkillMatch]:
        """Try exact name matching"""
        user_term_lower = user_term.lower().strip()
        
        for skill in self.ontology.skills.values():
            if skill.name.lower() == user_term_lower:
                return SkillMatch(
                    user_term=user_term,
                    matched_skill=skill,
                    match_score=1.0,
                    match_type='exact',
                    confidence=1.0
                )
        return None
    
    def _synonym_match(self, user_term: str) -> Optional[SkillMatch]:
        """Try matching via synonyms"""
        user_term_lower = user_term.lower().strip()
        
        if user_term_lower in self.synonym_index:
            skill_ids = self.synonym_index[user_term_lower]
            if skill_ids:
                skill = self.ontology.skills[skill_ids[0]]
                return SkillMatch(
                    user_term=user_term,
                    matched_skill=skill,
                    match_score=0.9,
                    match_type='synonym',
                    confidence=0.9
                )
        return None
    
    def _fuzzy_match(self, user_term: str) -> Optional[SkillMatch]:
        """Try fuzzy string matching"""
        user_term_lower = user_term.lower().strip()
        best_match = None
        best_score = 0.0
        
        for skill in self.ontology.skills.values():
            # Check name similarity
            name_score = SequenceMatcher(None, user_term_lower, skill.name.lower()).ratio()
            
            # Check if user term is substring or vice versa
            if user_term_lower in skill.name.lower():
                name_score = max(name_score, 0.8)
            elif skill.name.lower() in user_term_lower:
                name_score = max(name_score, 0.7)
            
            if name_score > best_score and name_score > 0.4:
                best_score = name_score
                best_match = skill
        
        if best_match:
            return SkillMatch(
                user_term=user_term,
                matched_skill=best_match,
                match_score=best_score,
                match_type='fuzzy',
                confidence=best_score * 0.8
            )
        return None
    
    def _semantic_match(self, user_term: str) -> Optional[SkillMatch]:
        """Try semantic matching based on keywords"""
        user_term_lower = user_term.lower().strip()
        
        # Extract key concepts from user term
        keywords = self._extract_keywords(user_term_lower)
        
        best_match = None
        best_score = 0.0
        
        for skill in self.ontology.skills.values():
            skill_text = f"{skill.name} {skill.description}".lower()
            
            # Count keyword matches
            matches = sum(1 for keyword in keywords if keyword in skill_text)
            if matches > 0:
                score = matches / len(keywords)
                if score > best_score:
                    best_score = score
                    best_match = skill
        
        if best_match and best_score > 0.3:
            return SkillMatch(
                user_term=user_term,
                matched_skill=best_match,
                match_score=best_score,
                match_type='semantic',
                confidence=best_score * 0.6
            )
        return None
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text"""
        # Remove common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                     'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
                     'how', 'when', 'where', 'why', 'what', 'which', 'who', 'whom', 'this',
                     'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'been',
                     'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                     'should', 'could', 'may', 'might', 'must', 'can', 'good', 'well', 'very'}
        
        # Split into words and filter
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
        return keywords
    
    def find_matching_jobs(self, skill_matches: List[SkillMatch], 
                          min_match_score: float = 0.5) -> List[JobMatch]:
        """Find jobs that match the given skills"""
        job_matches = []
        user_skill_ids = {match.matched_skill.id for match in skill_matches}
        
        for job in self.ontology.jobs.values():
            if not job.required_skills:
                continue
            
            # Calculate match score for this job
            matched_skills = []
            missing_skills = []
            transferable_skills = []
            
            total_importance = sum(req.importance for req in job.required_skills)
            matched_importance = 0.0
            
            for req in job.required_skills:
                if req.skill_id in user_skill_ids:
                    # Direct skill match
                    skill_match = next(m for m in skill_matches 
                                     if m.matched_skill.id == req.skill_id)
                    matched_skills.append(skill_match)
                    matched_importance += req.importance
                else:
                    # Check for related/transferable skills
                    transferable = self._find_transferable_skill(req.skill_id, user_skill_ids)
                    if transferable:
                        transferable_skills.append(self.ontology.skills[req.skill_id].name)
                        matched_importance += req.importance * 0.7  # Partial credit
                    else:
                        missing_skills.append(self.ontology.skills[req.skill_id].name)
            
            if total_importance > 0:
                match_score = matched_importance / total_importance
                
                if match_score >= min_match_score:
                    job_matches.append(JobMatch(
                        job=job,
                        match_score=match_score,
                        matched_skills=matched_skills,
                        missing_skills=missing_skills,
                        transferable_skills=transferable_skills
                    ))
        
        # Sort by match score
        job_matches.sort(key=lambda x: x.match_score, reverse=True)
        
        return job_matches
    
    def _find_transferable_skill(self, required_skill_id: str, 
                                user_skill_ids: set) -> Optional[str]:
        """Check if user has a related/transferable skill"""
        # Check direct relationships
        if required_skill_id in self.ontology.skill_relationships:
            related_skills = self.ontology.skill_relationships[required_skill_id]
            for user_skill_id in user_skill_ids:
                if user_skill_id in related_skills:
                    return user_skill_id
        
        # Check similarity scores
        for user_skill_id in user_skill_ids:
            similarity = self.ontology.calculate_skill_similarity(required_skill_id, user_skill_id)
            if similarity > 0.6:
                return user_skill_id
        
        return None
    
    def expand_skill_descriptions(self, user_descriptions: List[str]) -> Dict[str, List[str]]:
        """Expand casual skill descriptions to related formal skills"""
        expansions = {}
        
        for description in user_descriptions:
            matches = self.match_user_skills([description])
            
            if matches:
                # Get the best match
                best_match = matches[0]
                skill = best_match.matched_skill
                
                # Get related skills
                related_skills = self.ontology.get_related_skills(skill.id)
                
                expansions[description] = [skill.name] + [s.name for s in related_skills]
            else:
                expansions[description] = []
        
        return expansions