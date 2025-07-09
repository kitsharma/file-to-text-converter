# src/models/user_profile.py
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from datetime import datetime
import re

from src.models.skill_ontology import UserSkill, ProficiencyLevel
from src.services.skill_matcher import SkillMatcher, SkillMatch


@dataclass
class WorkExperience:
    """Represents work experience entry"""
    job_title: str
    company: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None  # None means current
    description: str = ""
    extracted_skills: List[str] = field(default_factory=list)


@dataclass
class Education:
    """Represents education entry"""
    degree: str
    institution: str
    field_of_study: str
    graduation_date: Optional[datetime] = None
    extracted_skills: List[str] = field(default_factory=list)


@dataclass
class UserProfile:
    """Complete user profile with skills and experience"""
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    skills: List[UserSkill] = field(default_factory=list)
    work_experiences: List[WorkExperience] = field(default_factory=list)
    education: List[Education] = field(default_factory=list)
    raw_resume_text: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class ResumeParser:
    """Service for parsing resumes and extracting skills"""
    
    def __init__(self, skill_matcher: SkillMatcher):
        self.skill_matcher = skill_matcher
        
        # Common section headers
        self.section_headers = {
            'experience': ['experience', 'work history', 'employment', 'professional experience'],
            'education': ['education', 'academic', 'qualifications'],
            'skills': ['skills', 'technical skills', 'competencies', 'expertise', 'abilities']
        }
        
        # Common skill indicators
        self.skill_indicators = [
            'proficient in', 'experienced with', 'skilled in', 'knowledge of',
            'familiar with', 'expertise in', 'competent in', 'worked with',
            'used', 'developed', 'created', 'built', 'implemented', 'managed'
        ]
    
    def parse_resume(self, resume_text: str) -> UserProfile:
        """Parse resume text and extract structured information"""
        # Create base profile
        profile = UserProfile(
            user_id=self._generate_user_id(),
            raw_resume_text=resume_text
        )
        
        # Extract sections
        sections = self._extract_sections(resume_text)
        
        # Extract skills from different sections
        skill_descriptions = []
        
        # Extract from skills section
        if 'skills' in sections:
            skill_descriptions.extend(self._extract_skills_from_section(sections['skills']))
        
        # Extract from experience section
        if 'experience' in sections:
            experiences = self._parse_experience_section(sections['experience'])
            profile.work_experiences = experiences
            for exp in experiences:
                skill_descriptions.extend(exp.extracted_skills)
        
        # Extract from education section
        if 'education' in sections:
            education_list = self._parse_education_section(sections['education'])
            profile.education = education_list
            for edu in education_list:
                skill_descriptions.extend(edu.extracted_skills)
        
        # Match skills to formal skills
        skill_matches = self.skill_matcher.match_user_skills(skill_descriptions)
        
        # Convert to UserSkill objects
        seen_skills = set()
        for match in skill_matches:
            if match.matched_skill.id not in seen_skills:
                seen_skills.add(match.matched_skill.id)
                
                # Determine proficiency based on confidence and context
                proficiency = self._determine_proficiency(match, resume_text)
                
                user_skill = UserSkill(
                    skill_id=match.matched_skill.id,
                    proficiency_level=proficiency,
                    validated=match.confidence > 0.8
                )
                profile.skills.append(user_skill)
        
        return profile
    
    def _generate_user_id(self) -> str:
        """Generate unique user ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _extract_sections(self, resume_text: str) -> Dict[str, str]:
        """Extract major sections from resume"""
        sections = {}
        lines = resume_text.split('\n')
        
        current_section = None
        current_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if this is a section header
            section_found = False
            for section_type, headers in self.section_headers.items():
                if any(header in line_lower for header in headers):
                    # Save previous section
                    if current_section:
                        sections[current_section] = '\n'.join(current_content)
                    
                    current_section = section_type
                    current_content = []
                    section_found = True
                    break
            
            if not section_found and current_section:
                current_content.append(line)
        
        # Save last section
        if current_section:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def _extract_skills_from_section(self, section_text: str) -> List[str]:
        """Extract skills from a skills section"""
        skills = []
        
        # Common delimiters
        delimiters = [',', ';', '•', '-', '|', '\n']
        
        # Replace all delimiters with newline
        for delimiter in delimiters:
            section_text = section_text.replace(delimiter, '\n')
        
        # Extract individual skills
        for line in section_text.split('\n'):
            line = line.strip()
            if line and len(line) > 2:
                # Remove common prefixes
                for indicator in self.skill_indicators:
                    if line.lower().startswith(indicator):
                        line = line[len(indicator):].strip()
                
                # Clean up the skill
                line = re.sub(r'[^\w\s\+\#\-\.]', '', line)
                if line:
                    skills.append(line)
        
        return skills
    
    def _parse_experience_section(self, section_text: str) -> List[WorkExperience]:
        """Parse work experience section"""
        experiences = []
        lines = section_text.split('\n')
        
        current_exp = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Simple heuristic: lines with dates are job titles
            date_pattern = r'\b(19|20)\d{2}\b'
            if re.search(date_pattern, line):
                if current_exp:
                    experiences.append(current_exp)
                
                # Extract job title and company
                parts = line.split('|') if '|' in line else line.split('-')
                job_title = parts[0].strip() if parts else line
                company = parts[1].strip() if len(parts) > 1 else ""
                
                current_exp = WorkExperience(
                    job_title=job_title,
                    company=company,
                    description=""
                )
            elif current_exp:
                # Add to description
                current_exp.description += line + " "
                
                # Extract skills from description
                skills = self._extract_skills_from_text(line)
                current_exp.extracted_skills.extend(skills)
        
        if current_exp:
            experiences.append(current_exp)
        
        return experiences
    
    def _parse_education_section(self, section_text: str) -> List[Education]:
        """Parse education section"""
        education_list = []
        lines = section_text.split('\n')
        
        current_edu = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for degree keywords
            degree_keywords = ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma', 'certificate']
            if any(keyword in line.lower() for keyword in degree_keywords):
                if current_edu:
                    education_list.append(current_edu)
                
                # Simple extraction
                current_edu = Education(
                    degree=line,
                    institution="",
                    field_of_study=""
                )
            elif current_edu and not current_edu.institution:
                current_edu.institution = line
            elif current_edu:
                # Extract field of study or skills
                current_edu.field_of_study += line + " "
                skills = self._extract_skills_from_text(line)
                current_edu.extracted_skills.extend(skills)
        
        if current_edu:
            education_list.append(current_edu)
        
        return education_list
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract potential skills from free text"""
        skills = []
        text_lower = text.lower()
        
        # Look for skill indicators
        for indicator in self.skill_indicators:
            if indicator in text_lower:
                # Extract the part after the indicator
                parts = text_lower.split(indicator)
                if len(parts) > 1:
                    skill_text = parts[1].strip()
                    # Take first few words as potential skill
                    words = skill_text.split()[:4]
                    if words:
                        skills.append(' '.join(words))
        
        # Look for technical terms (capitalized words, acronyms)
        technical_pattern = r'\b[A-Z][A-Za-z]*\b|\b[A-Z]{2,}\b'
        technical_terms = re.findall(technical_pattern, text)
        skills.extend(technical_terms)
        
        return skills
    
    def _determine_proficiency(self, skill_match: SkillMatch, resume_text: str) -> ProficiencyLevel:
        """Determine proficiency level based on context"""
        skill_name = skill_match.matched_skill.name.lower()
        resume_lower = resume_text.lower()
        
        # Count mentions
        mentions = resume_lower.count(skill_name)
        
        # Look for proficiency indicators
        expert_indicators = ['expert', 'advanced', 'senior', 'lead', 'architect', 'principal']
        intermediate_indicators = ['proficient', 'experienced', 'skilled', 'competent']
        beginner_indicators = ['familiar', 'basic', 'learning', 'exposure']
        
        # Check years of experience
        years_pattern = rf'{skill_name}.*?(\d+)\s*years?'
        years_match = re.search(years_pattern, resume_lower)
        
        if years_match:
            years = int(years_match.group(1))
            if years >= 5:
                return ProficiencyLevel.EXPERT
            elif years >= 3:
                return ProficiencyLevel.ADVANCED
            elif years >= 1:
                return ProficiencyLevel.INTERMEDIATE
        
        # Check proficiency indicators
        skill_context = self._get_skill_context(skill_name, resume_text)
        context_lower = skill_context.lower()
        
        if any(indicator in context_lower for indicator in expert_indicators):
            return ProficiencyLevel.EXPERT
        elif any(indicator in context_lower for indicator in intermediate_indicators):
            return ProficiencyLevel.INTERMEDIATE
        elif any(indicator in context_lower for indicator in beginner_indicators):
            return ProficiencyLevel.BEGINNER
        
        # Default based on mentions and confidence
        if mentions >= 3 and skill_match.confidence > 0.8:
            return ProficiencyLevel.ADVANCED
        elif mentions >= 2 or skill_match.confidence > 0.7:
            return ProficiencyLevel.INTERMEDIATE
        else:
            return ProficiencyLevel.BEGINNER
    
    def _get_skill_context(self, skill_name: str, text: str, window: int = 50) -> str:
        """Get context around skill mention"""
        skill_lower = skill_name.lower()
        text_lower = text.lower()
        
        index = text_lower.find(skill_lower)
        if index == -1:
            return ""
        
        start = max(0, index - window)
        end = min(len(text), index + len(skill_name) + window)
        
        return text[start:end]