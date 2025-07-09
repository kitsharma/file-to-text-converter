# tests/test_user_profile.py
import pytest
from datetime import datetime

from src.models.user_profile import (
    UserProfile, WorkExperience, Education, ResumeParser
)
from src.models.skill_ontology import (
    SkillOntology, Skill, SkillType, ProficiencyLevel, UserSkill
)
from src.services.skill_matcher import SkillMatcher
from src.integrations.onet_integration import ONETIntegration


class TestResumeParser:
    """Test suite for ResumeParser"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Create ontology with test skills
        self.ontology = SkillOntology()
        
        skills = [
            Skill("python", "Python", "Python programming", SkillType.TECHNICAL, 
                  synonyms=["Python Programming", "Python Development"]),
            Skill("java", "Java", "Java programming", SkillType.TECHNICAL),
            Skill("sql", "SQL", "Database queries", SkillType.TECHNICAL,
                  synonyms=["Database", "MySQL", "PostgreSQL"]),
            Skill("ml", "Machine Learning", "ML algorithms", SkillType.TECHNICAL,
                  synonyms=["ML", "AI", "Deep Learning"]),
            Skill("communication", "Communication", "Communication skills", SkillType.SOFT),
            Skill("leadership", "Leadership", "Leadership skills", SkillType.SOFT),
            Skill("project_mgmt", "Project Management", "Managing projects", SkillType.SOFT,
                  synonyms=["Project Manager", "PM"])
        ]
        
        for skill in skills:
            self.ontology.add_skill(skill)
        
        # Create skill matcher and parser
        self.onet = ONETIntegration()
        self.skill_matcher = SkillMatcher(self.ontology, self.onet)
        self.parser = ResumeParser(self.skill_matcher)
    
    def test_parse_simple_resume(self):
        """Test parsing a simple resume"""
        resume_text = """
        John Doe
        john.doe@email.com
        
        SKILLS
        - Python Programming
        - Java
        - SQL Databases
        - Machine Learning
        
        EXPERIENCE
        Software Engineer | Tech Corp | 2020-2023
        - Developed Python applications
        - Worked with SQL databases
        - Led team projects
        
        EDUCATION
        Bachelor of Computer Science
        University of Technology
        2016-2020
        """
        
        profile = self.parser.parse_resume(resume_text)
        
        assert profile.user_id is not None
        assert profile.raw_resume_text == resume_text
        assert len(profile.skills) >= 3
        
        # Check skill extraction
        skill_ids = [skill.skill_id for skill in profile.skills]
        assert "python" in skill_ids
        assert "sql" in skill_ids
    
    def test_extract_sections(self):
        """Test section extraction"""
        resume_text = """
        EXPERIENCE
        Software Engineer at Company
        
        EDUCATION
        BS Computer Science
        
        SKILLS
        Python, Java, SQL
        """
        
        sections = self.parser._extract_sections(resume_text)
        
        assert "experience" in sections
        assert "education" in sections
        assert "skills" in sections
        
        assert "Software Engineer" in sections["experience"]
        assert "BS Computer Science" in sections["education"]
        assert "Python, Java, SQL" in sections["skills"]
    
    def test_extract_skills_from_section(self):
        """Test skill extraction from skills section"""
        skills_section = """
        Technical Skills:
        • Python Programming
        • Java Development
        • SQL and Database Management
        • Machine Learning & AI
        
        Soft Skills:
        - Excellent Communication
        - Team Leadership
        - Project Management
        """
        
        skills = self.parser._extract_skills_from_section(skills_section)
        
        assert len(skills) >= 6
        assert any("Python" in s for s in skills)
        assert any("Communication" in s for s in skills)
        assert any("Machine Learning" in s for s in skills)
    
    def test_parse_experience_section(self):
        """Test parsing work experience"""
        experience_text = """
        Senior Software Engineer | Tech Corp | 2020-2023
        Developed scalable Python applications for data processing
        Implemented machine learning models using TensorFlow
        Led a team of 5 developers
        
        Junior Developer | StartUp Inc | 2018-2020
        Built web applications using Java and Spring Boot
        Worked with SQL databases and wrote complex queries
        """
        
        experiences = self.parser._parse_experience_section(experience_text)
        
        assert len(experiences) >= 1
        assert experiences[0].job_title
        assert experiences[0].company
        assert len(experiences[0].extracted_skills) > 0
    
    def test_parse_education_section(self):
        """Test parsing education section"""
        education_text = """
        Master of Science in Computer Science
        Stanford University
        Specialization in Machine Learning and AI
        2018-2020
        
        Bachelor of Engineering
        MIT
        Computer Science and Engineering
        2014-2018
        """
        
        education_list = self.parser._parse_education_section(education_text)
        
        assert len(education_list) >= 1
        assert "Master" in education_list[0].degree
        assert education_list[0].institution
        assert len(education_list[0].extracted_skills) >= 0
    
    def test_determine_proficiency_expert(self):
        """Test proficiency determination for expert level"""
        resume_text = """
        Senior Python Developer with 8 years of experience
        Expert in Python programming and advanced frameworks
        Led Python development team as principal engineer
        """
        
        from src.services.skill_matcher import SkillMatch
        skill_match = SkillMatch("Python", self.ontology.skills["python"], 1.0, "exact", 1.0)
        
        proficiency = self.parser._determine_proficiency(skill_match, resume_text)
        
        assert proficiency == ProficiencyLevel.EXPERT
    
    def test_determine_proficiency_intermediate(self):
        """Test proficiency determination for intermediate level"""
        resume_text = """
        Software Developer
        Proficient in Java programming
        3 years experience with Java and Spring Boot
        """
        
        from src.services.skill_matcher import SkillMatch
        skill_match = SkillMatch("Java", self.ontology.skills["java"], 0.8, "fuzzy", 0.8)
        
        proficiency = self.parser._determine_proficiency(skill_match, resume_text)
        
        assert proficiency == ProficiencyLevel.INTERMEDIATE
    
    def test_determine_proficiency_beginner(self):
        """Test proficiency determination for beginner level"""
        resume_text = """
        Recent Graduate
        Familiar with SQL basics
        Some exposure to database management
        """
        
        from src.services.skill_matcher import SkillMatch
        skill_match = SkillMatch("SQL", self.ontology.skills["sql"], 0.6, "fuzzy", 0.6)
        
        proficiency = self.parser._determine_proficiency(skill_match, resume_text)
        
        assert proficiency == ProficiencyLevel.BEGINNER
    
    def test_extract_skills_from_text(self):
        """Test skill extraction from free text"""
        text = "Experienced with Python and TensorFlow. Managed AWS infrastructure."
        
        skills = self.parser._extract_skills_from_text(text)
        
        assert len(skills) > 0
        assert any("Python" in s for s in skills)
        assert any("AWS" in s for s in skills)
    
    def test_comprehensive_resume(self):
        """Test parsing a comprehensive resume"""
        resume_text = """
        Jane Smith
        jane.smith@email.com
        
        PROFESSIONAL SUMMARY
        Experienced Software Engineer with 5+ years developing scalable applications.
        Expert in Python, Java, and cloud technologies. Strong leadership skills.
        
        TECHNICAL SKILLS
        Programming Languages: Python (Expert), Java (Advanced), SQL (Proficient)
        Frameworks: Django, Spring Boot, TensorFlow
        Databases: PostgreSQL, MySQL, MongoDB
        Tools: Git, Docker, Kubernetes, AWS
        
        WORK EXPERIENCE
        
        Senior Software Engineer | Tech Giant | 2021-Present
        - Lead Python developer for machine learning platform
        - Architected microservices using Java and Spring Boot
        - Managed PostgreSQL databases with complex queries
        - Mentored junior developers and led agile team
        
        Software Engineer | Innovation Labs | 2019-2021
        - Developed Python APIs for data processing
        - Implemented machine learning models
        - Worked extensively with SQL databases
        
        Junior Developer | StartupXYZ | 2018-2019
        - Built web applications using Python and Django
        - Basic database management with MySQL
        
        EDUCATION
        
        Master of Science in Computer Science
        Carnegie Mellon University | 2016-2018
        Focus: Machine Learning and Artificial Intelligence
        
        Bachelor of Science in Software Engineering
        UC Berkeley | 2012-2016
        """
        
        profile = self.parser.parse_resume(resume_text)
        
        # Check basic profile info
        assert profile.user_id is not None
        assert len(profile.skills) >= 4
        assert len(profile.work_experiences) >= 2
        assert len(profile.education) >= 1
        
        # Check skill proficiency levels
        python_skill = next((s for s in profile.skills if s.skill_id == "python"), None)
        assert python_skill is not None
        assert python_skill.proficiency_level == ProficiencyLevel.EXPERT
        
        # Check for variety of skills
        skill_ids = [s.skill_id for s in profile.skills]
        assert "python" in skill_ids
        assert "java" in skill_ids
        assert "sql" in skill_ids
        assert "ml" in skill_ids
    
    def test_get_skill_context(self):
        """Test getting context around skill mention"""
        text = "I have extensive experience with Python programming and have used Python for 5 years in production."
        
        context = self.parser._get_skill_context("Python", text, window=20)
        
        assert "experience with Python programming" in context
        assert len(context) <= 100  # window + skill name + window


class TestUserProfileDataStructures:
    """Test UserProfile and related data structures"""
    
    def test_user_profile_creation(self):
        """Test UserProfile creation"""
        profile = UserProfile(
            user_id="test123",
            name="John Doe",
            email="john@example.com"
        )
        
        assert profile.user_id == "test123"
        assert profile.name == "John Doe"
        assert profile.email == "john@example.com"
        assert profile.skills == []
        assert profile.work_experiences == []
        assert profile.education == []
        assert isinstance(profile.created_at, datetime)
    
    def test_work_experience_creation(self):
        """Test WorkExperience creation"""
        exp = WorkExperience(
            job_title="Software Engineer",
            company="Tech Corp",
            description="Developed applications"
        )
        
        assert exp.job_title == "Software Engineer"
        assert exp.company == "Tech Corp"
        assert exp.description == "Developed applications"
        assert exp.extracted_skills == []
    
    def test_education_creation(self):
        """Test Education creation"""
        edu = Education(
            degree="Bachelor of Science",
            institution="University",
            field_of_study="Computer Science"
        )
        
        assert edu.degree == "Bachelor of Science"
        assert edu.institution == "University"
        assert edu.field_of_study == "Computer Science"
        assert edu.extracted_skills == []


if __name__ == "__main__":
    pytest.main([__file__])