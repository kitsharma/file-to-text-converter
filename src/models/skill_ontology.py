# src/models/skill_ontology.py
from dataclasses import dataclass
from typing import List, Dict, Optional, Set
from enum import Enum
import json


class SkillType(Enum):
    TECHNICAL = "technical"
    SOFT = "soft"
    COGNITIVE = "cognitive"
    PHYSICAL = "physical"


class ProficiencyLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


@dataclass
class Skill:
    """Core skill entity with O*NET integration"""
    id: str
    name: str
    description: str
    skill_type: SkillType
    onet_code: Optional[str] = None
    esco_code: Optional[str] = None
    synonyms: List[str] = None
    related_skills: List[str] = None
    
    def __post_init__(self):
        if self.synonyms is None:
            self.synonyms = []
        if self.related_skills is None:
            self.related_skills = []


@dataclass
class SkillRequirement:
    """Skill requirement for a specific job/role"""
    skill_id: str
    importance: float  # 0.0 to 1.0
    required_level: ProficiencyLevel
    is_mandatory: bool = True


@dataclass
class Job:
    """Job/occupation entity"""
    id: str
    title: str
    description: str
    onet_code: Optional[str] = None
    esco_code: Optional[str] = None
    required_skills: List[SkillRequirement] = None
    growth_projection: Optional[float] = None  # From BLS data
    median_salary: Optional[float] = None
    
    def __post_init__(self):
        if self.required_skills is None:
            self.required_skills = []


@dataclass
class UserSkill:
    """User's skill with proficiency level"""
    skill_id: str
    proficiency_level: ProficiencyLevel
    years_experience: Optional[int] = None
    validated: bool = False


@dataclass
class SkillGap:
    """Represents gap between user skills and job requirements"""
    skill_id: str
    skill_name: str
    current_level: Optional[ProficiencyLevel]
    required_level: ProficiencyLevel
    importance: float
    gap_score: float  # 0.0 to 1.0, higher = bigger gap


class SkillOntology:
    """Core ontology management system"""
    
    def __init__(self):
        self.skills: Dict[str, Skill] = {}
        self.jobs: Dict[str, Job] = {}
        self.skill_relationships: Dict[str, Set[str]] = {}
        self.job_skill_matrix: Dict[str, List[SkillRequirement]] = {}
    
    def add_skill(self, skill: Skill) -> None:
        """Add skill to ontology"""
        self.skills[skill.id] = skill
        self.skill_relationships[skill.id] = set(skill.related_skills)
    
    def add_job(self, job: Job) -> None:
        """Add job to ontology"""
        self.jobs[job.id] = job
        self.job_skill_matrix[job.id] = job.required_skills
    
    def find_skill_by_name(self, name: str) -> Optional[Skill]:
        """Find skill by name or synonym"""
        name_lower = name.lower()
        
        # Direct name match
        for skill in self.skills.values():
            if skill.name.lower() == name_lower:
                return skill
        
        # Synonym match
        for skill in self.skills.values():
            if any(syn.lower() == name_lower for syn in skill.synonyms):
                return skill
        
        return None
    
    def get_related_skills(self, skill_id: str) -> List[Skill]:
        """Get skills related to given skill"""
        if skill_id not in self.skill_relationships:
            return []
        
        related_ids = self.skill_relationships[skill_id]
        return [self.skills[sid] for sid in related_ids if sid in self.skills]
    
    def calculate_skill_similarity(self, skill1_id: str, skill2_id: str) -> float:
        """Calculate similarity between two skills (0.0 to 1.0)"""
        if skill1_id == skill2_id:
            return 1.0
        
        # Check if skills are directly related
        if skill1_id in self.skill_relationships.get(skill2_id, set()):
            return 0.8
        
        # Check for common related skills
        related1 = self.skill_relationships.get(skill1_id, set())
        related2 = self.skill_relationships.get(skill2_id, set())
        
        if related1 and related2:
            intersection = related1.intersection(related2)
            union = related1.union(related2)
            if union:
                return 0.6 * len(intersection) / len(union)
        
        return 0.0
    
    def find_jobs_by_skill(self, skill_id: str, min_importance: float = 0.3) -> List[Job]:
        """Find jobs that require a specific skill"""
        matching_jobs = []
        
        for job in self.jobs.values():
            for req in job.required_skills:
                if req.skill_id == skill_id and req.importance >= min_importance:
                    matching_jobs.append(job)
                    break
        
        return matching_jobs
    
    def calculate_job_match_score(self, user_skills: List[UserSkill], job_id: str) -> float:
        """Calculate how well user skills match a job (0.0 to 1.0)"""
        if job_id not in self.jobs:
            return 0.0
        
        job = self.jobs[job_id]
        if not job.required_skills:
            return 0.0
        
        user_skill_dict = {us.skill_id: us for us in user_skills}
        total_importance = sum(req.importance for req in job.required_skills)
        
        if total_importance == 0:
            return 0.0
        
        match_score = 0.0
        
        for req in job.required_skills:
            if req.skill_id in user_skill_dict:
                user_skill = user_skill_dict[req.skill_id]
                
                # Calculate proficiency match
                level_values = {
                    ProficiencyLevel.BEGINNER: 1,
                    ProficiencyLevel.INTERMEDIATE: 2,
                    ProficiencyLevel.ADVANCED: 3,
                    ProficiencyLevel.EXPERT: 4
                }
                
                user_level = level_values[user_skill.proficiency_level]
                required_level = level_values[req.required_level]
                
                if user_level >= required_level:
                    proficiency_match = 1.0
                else:
                    proficiency_match = user_level / required_level
                
                match_score += req.importance * proficiency_match
        
        return match_score / total_importance
    
    def identify_skill_gaps(self, user_skills: List[UserSkill], job_id: str) -> List[SkillGap]:
        """Identify skill gaps for a specific job"""
        if job_id not in self.jobs:
            return []
        
        job = self.jobs[job_id]
        user_skill_dict = {us.skill_id: us for us in user_skills}
        gaps = []
        
        for req in job.required_skills:
            skill_name = self.skills.get(req.skill_id, Skill(req.skill_id, "Unknown", "", SkillType.TECHNICAL)).name
            
            if req.skill_id in user_skill_dict:
                user_skill = user_skill_dict[req.skill_id]
                
                level_values = {
                    ProficiencyLevel.BEGINNER: 1,
                    ProficiencyLevel.INTERMEDIATE: 2,
                    ProficiencyLevel.ADVANCED: 3,
                    ProficiencyLevel.EXPERT: 4
                }
                
                user_level = level_values[user_skill.proficiency_level]
                required_level = level_values[req.required_level]
                
                if user_level < required_level:
                    gap_score = (required_level - user_level) / required_level
                    gaps.append(SkillGap(
                        skill_id=req.skill_id,
                        skill_name=skill_name,
                        current_level=user_skill.proficiency_level,
                        required_level=req.required_level,
                        importance=req.importance,
                        gap_score=gap_score
                    ))
            else:
                # Missing skill entirely
                gaps.append(SkillGap(
                    skill_id=req.skill_id,
                    skill_name=skill_name,
                    current_level=None,
                    required_level=req.required_level,
                    importance=req.importance,
                    gap_score=1.0
                ))
        
        return sorted(gaps, key=lambda g: g.importance * g.gap_score, reverse=True)
    
    def export_to_json(self) -> str:
        """Export ontology to JSON format"""
        data = {
            "skills": {sid: {
                "id": skill.id,
                "name": skill.name,
                "description": skill.description,
                "skill_type": skill.skill_type.value,
                "onet_code": skill.onet_code,
                "esco_code": skill.esco_code,
                "synonyms": skill.synonyms,
                "related_skills": skill.related_skills
            } for sid, skill in self.skills.items()},
            "jobs": {jid: {
                "id": job.id,
                "title": job.title,
                "description": job.description,
                "onet_code": job.onet_code,
                "esco_code": job.esco_code,
                "required_skills": [{
                    "skill_id": req.skill_id,
                    "importance": req.importance,
                    "required_level": req.required_level.value,
                    "is_mandatory": req.is_mandatory
                } for req in job.required_skills],
                "growth_projection": job.growth_projection,
                "median_salary": job.median_salary
            } for jid, job in self.jobs.items()}
        }
        return json.dumps(data, indent=2)