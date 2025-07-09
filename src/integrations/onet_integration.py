# src/integrations/onet_integration.py
import csv
import json
import requests
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import logging

from src.models.skill_ontology import Skill, Job, SkillRequirement, SkillType, ProficiencyLevel


logger = logging.getLogger(__name__)


@dataclass
class ONETSkillRecord:
    """O*NET skill record structure"""
    element_id: str
    element_name: str
    description: str
    scale_id: str
    data_value: float
    standard_error: Optional[float] = None
    upper_ci_bound: Optional[float] = None
    lower_ci_bound: Optional[float] = None
    recommend_suppress: Optional[str] = None
    not_relevant: Optional[str] = None
    date: Optional[str] = None


@dataclass
class ONETOccupationRecord:
    """O*NET occupation record structure"""
    onetsoc_code: str
    title: str
    description: str


class ONETIntegration:
    """Integration with O*NET database for skills and occupations"""
    
    def __init__(self, data_dir: str = "data", api_key: Optional[str] = None):
        self.data_dir = Path(data_dir)
        self.api_key = api_key
        self.base_url = "https://services.onetcenter.org/ws/"
        
        # Cache for parsed data
        self.skills_cache: Dict[str, ONETSkillRecord] = {}
        self.occupations_cache: Dict[str, ONETOccupationRecord] = {}
        
        # Load local data if available
        self._load_local_data()
    
    def _load_local_data(self) -> None:
        """Load O*NET data from local CSV files"""
        try:
            # Load skills data
            skills_file = self.data_dir / "skills.csv"
            if skills_file.exists():
                self._load_skills_csv(skills_file)
            
            # Load occupations data
            occupations_file = self.data_dir / "occupations.csv"
            if occupations_file.exists():
                self._load_occupations_csv(occupations_file)
                
        except Exception as e:
            logger.warning(f"Could not load local O*NET data: {e}")
    
    def _load_skills_csv(self, file_path: Path) -> None:
        """Load skills from CSV file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    skill_record = ONETSkillRecord(
                        element_id=row.get('element_id', ''),
                        element_name=row.get('element_name', ''),
                        description=row.get('description', ''),
                        scale_id=row.get('scale_id', ''),
                        data_value=float(row.get('data_value', 0)),
                        standard_error=float(row.get('standard_error', 0)) if row.get('standard_error') else None,
                        upper_ci_bound=float(row.get('upper_ci_bound', 0)) if row.get('upper_ci_bound') else None,
                        lower_ci_bound=float(row.get('lower_ci_bound', 0)) if row.get('lower_ci_bound') else None,
                        recommend_suppress=row.get('recommend_suppress'),
                        not_relevant=row.get('not_relevant'),
                        date=row.get('date')
                    )
                    self.skills_cache[skill_record.element_id] = skill_record
        except Exception as e:
            logger.error(f"Error loading skills CSV: {e}")
    
    def _load_occupations_csv(self, file_path: Path) -> None:
        """Load occupations from CSV file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    occupation_record = ONETOccupationRecord(
                        onetsoc_code=row.get('onetsoc_code', ''),
                        title=row.get('title', ''),
                        description=row.get('description', '')
                    )
                    self.occupations_cache[occupation_record.onetsoc_code] = occupation_record
        except Exception as e:
            logger.error(f"Error loading occupations CSV: {e}")
    
    def get_skill_by_id(self, skill_id: str) -> Optional[ONETSkillRecord]:
        """Get skill by O*NET element ID"""
        return self.skills_cache.get(skill_id)
    
    def get_occupation_by_code(self, onet_code: str) -> Optional[ONETOccupationRecord]:
        """Get occupation by O*NET SOC code"""
        return self.occupations_cache.get(onet_code)
    
    def search_skills(self, query: str, limit: int = 10) -> List[ONETSkillRecord]:
        """Search for skills by name or description"""
        query_lower = query.lower()
        matches = []
        
        for skill in self.skills_cache.values():
            if (query_lower in skill.element_name.lower() or 
                query_lower in skill.description.lower()):
                matches.append(skill)
        
        # Sort by relevance (exact name match first, then by data value)
        matches.sort(key=lambda s: (
            0 if query_lower == s.element_name.lower() else 1,
            -s.data_value
        ))
        
        return matches[:limit]
    
    def search_occupations(self, query: str, limit: int = 10) -> List[ONETOccupationRecord]:
        """Search for occupations by title or description"""
        query_lower = query.lower()
        matches = []
        
        for occupation in self.occupations_cache.values():
            if (query_lower in occupation.title.lower() or 
                query_lower in occupation.description.lower()):
                matches.append(occupation)
        
        # Sort by relevance (exact title match first)
        matches.sort(key=lambda o: (
            0 if query_lower == o.title.lower() else 1,
            o.title
        ))
        
        return matches[:limit]
    
    def get_skills_for_occupation(self, onet_code: str) -> List[ONETSkillRecord]:
        """Get skills required for a specific occupation"""
        # This would typically require occupation-skill mapping data
        # For now, return empty list - would need additional O*NET data files
        return []
    
    def convert_to_ontology_skill(self, onet_skill: ONETSkillRecord) -> Skill:
        """Convert O*NET skill record to ontology Skill object"""
        
        # Determine skill type based on skill name/description
        skill_type = self._determine_skill_type(onet_skill.element_name, onet_skill.description)
        
        # Generate synonyms based on skill name
        synonyms = self._generate_synonyms(onet_skill.element_name)
        
        return Skill(
            id=f"onet_{onet_skill.element_id}",
            name=onet_skill.element_name,
            description=onet_skill.description,
            skill_type=skill_type,
            onet_code=onet_skill.element_id,
            synonyms=synonyms
        )
    
    def convert_to_ontology_job(self, onet_occupation: ONETOccupationRecord) -> Job:
        """Convert O*NET occupation record to ontology Job object"""
        
        # Get required skills for this occupation
        required_skills = []
        occupation_skills = self.get_skills_for_occupation(onet_occupation.onetsoc_code)
        
        for skill in occupation_skills:
            # Convert importance score to 0-1 scale
            importance = min(skill.data_value / 100.0, 1.0)
            
            # Determine required proficiency level based on importance
            if importance >= 0.8:
                required_level = ProficiencyLevel.ADVANCED
            elif importance >= 0.6:
                required_level = ProficiencyLevel.INTERMEDIATE
            else:
                required_level = ProficiencyLevel.BEGINNER
            
            skill_req = SkillRequirement(
                skill_id=f"onet_{skill.element_id}",
                importance=importance,
                required_level=required_level,
                is_mandatory=importance >= 0.5
            )
            required_skills.append(skill_req)
        
        return Job(
            id=f"onet_{onet_occupation.onetsoc_code}",
            title=onet_occupation.title,
            description=onet_occupation.description,
            onet_code=onet_occupation.onetsoc_code,
            required_skills=required_skills
        )
    
    def _determine_skill_type(self, skill_name: str, description: str) -> SkillType:
        """Determine skill type from name and description"""
        skill_text = (skill_name + " " + description).lower()
        
        # Technical skills keywords
        technical_keywords = [
            'programming', 'software', 'computer', 'system', 'database', 'web',
            'network', 'technical', 'engineering', 'analysis', 'data', 'technology'
        ]
        
        # Soft skills keywords
        soft_keywords = [
            'communication', 'leadership', 'teamwork', 'management', 'coordination',
            'negotiation', 'persuasion', 'social', 'interpersonal', 'service',
            'listening', 'people', 'others', 'attention to what'
        ]
        
        # Cognitive skills keywords
        cognitive_keywords = [
            'reasoning', 'problem solving', 'critical thinking', 'learning',
            'memory', 'attention', 'decision making', 'creativity', 'comprehension',
            'reading', 'understanding', 'logic', 'reasoning', 'thinking'
        ]
        
        # Physical skills keywords
        physical_keywords = [
            'physical', 'strength', 'dexterity', 'coordination', 'stamina',
            'vision', 'hearing', 'motor', 'manual'
        ]
        
        # Check in order of priority (soft skills first, then cognitive, then technical)
        if any(keyword in skill_text for keyword in soft_keywords):
            return SkillType.SOFT
        elif any(keyword in skill_text for keyword in cognitive_keywords):
            return SkillType.COGNITIVE
        elif any(keyword in skill_text for keyword in physical_keywords):
            return SkillType.PHYSICAL
        elif any(keyword in skill_text for keyword in technical_keywords):
            return SkillType.TECHNICAL
        else:
            return SkillType.COGNITIVE  # Default to cognitive for general skills
    
    def _generate_synonyms(self, skill_name: str) -> List[str]:
        """Generate synonyms for a skill name"""
        synonyms = []
        
        # Common synonym mappings
        synonym_map = {
            'active listening': ['listening', 'hearing', 'attention'],
            'critical thinking': ['analysis', 'reasoning', 'problem solving'],
            'reading comprehension': ['reading', 'comprehension', 'understanding'],
            'writing': ['composition', 'documentation', 'reporting'],
            'speaking': ['communication', 'presentation', 'verbal'],
            'mathematics': ['math', 'numerical', 'calculation'],
            'science': ['scientific', 'research', 'investigation'],
            'learning strategies': ['learning', 'education', 'training'],
            'monitoring': ['oversight', 'supervision', 'tracking'],
            'social perceptiveness': ['empathy', 'social awareness', 'people skills'],
            'coordination': ['organization', 'management', 'planning'],
            'persuasion': ['influence', 'negotiation', 'convincing'],
            'negotiation': ['bargaining', 'mediation', 'compromise'],
            'instructing': ['teaching', 'training', 'education'],
            'service orientation': ['customer service', 'helpfulness', 'support'],
            'complex problem solving': ['problem solving', 'analysis', 'troubleshooting'],
            'operations analysis': ['process analysis', 'workflow', 'operations'],
            'technology design': ['system design', 'engineering', 'development'],
            'equipment selection': ['procurement', 'selection', 'evaluation'],
            'installation': ['setup', 'implementation', 'deployment'],
            'programming': ['coding', 'development', 'software'],
            'quality control analysis': ['testing', 'validation', 'quality assurance'],
            'operations monitoring': ['monitoring', 'oversight', 'surveillance'],
            'operation and control': ['operation', 'control', 'management'],
            'equipment maintenance': ['maintenance', 'repair', 'servicing'],
            'troubleshooting': ['debugging', 'problem solving', 'diagnosis'],
            'repairing': ['fixing', 'maintenance', 'restoration'],
            'judgment and decision making': ['decision making', 'judgment', 'evaluation'],
            'systems analysis': ['analysis', 'evaluation', 'assessment'],
            'systems evaluation': ['evaluation', 'assessment', 'review'],
            'time management': ['scheduling', 'planning', 'organization'],
            'management of financial resources': ['budgeting', 'financial management', 'accounting'],
            'management of material resources': ['inventory', 'resource management', 'logistics'],
            'management of personnel resources': ['hr', 'people management', 'staffing']
        }
        
        skill_lower = skill_name.lower()
        if skill_lower in synonym_map:
            synonyms.extend(synonym_map[skill_lower])
        
        # Add variations of the skill name
        if ' ' in skill_name:
            # Add without spaces
            synonyms.append(skill_name.replace(' ', ''))
            # Add individual words
            synonyms.extend(skill_name.split())
        
        return list(set(synonyms))  # Remove duplicates
    
    def bulk_import_skills(self) -> List[Skill]:
        """Import all O*NET skills as ontology Skill objects"""
        skills = []
        for onet_skill in self.skills_cache.values():
            try:
                skill = self.convert_to_ontology_skill(onet_skill)
                skills.append(skill)
            except Exception as e:
                logger.error(f"Error converting skill {onet_skill.element_id}: {e}")
        
        return skills
    
    def bulk_import_jobs(self) -> List[Job]:
        """Import all O*NET occupations as ontology Job objects"""
        jobs = []
        for onet_occupation in self.occupations_cache.values():
            try:
                job = self.convert_to_ontology_job(onet_occupation)
                jobs.append(job)
            except Exception as e:
                logger.error(f"Error converting occupation {onet_occupation.onetsoc_code}: {e}")
        
        return jobs
    
    def get_statistics(self) -> Dict[str, int]:
        """Get statistics about loaded O*NET data"""
        return {
            'skills_count': len(self.skills_cache),
            'occupations_count': len(self.occupations_cache)
        }