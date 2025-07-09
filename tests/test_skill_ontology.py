# tests/test_skill_ontology.py
import pytest
from src.models.skill_ontology import (
    Skill, Job, UserSkill, SkillRequirement, SkillGap,
    SkillType, ProficiencyLevel, SkillOntology
)


class TestSkillOntology:
    """Test suite for SkillOntology class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.ontology = SkillOntology()
        
        # Create test skills
        self.skill1 = Skill(
            id="skill_1",
            name="Python Programming",
            description="Programming in Python language",
            skill_type=SkillType.TECHNICAL,
            onet_code="15-1251.00",
            synonyms=["Python", "Python Development"],
            related_skills=["skill_2", "skill_3"]
        )
        
        self.skill2 = Skill(
            id="skill_2",
            name="Data Analysis",
            description="Analyzing data to extract insights",
            skill_type=SkillType.TECHNICAL,
            related_skills=["skill_1", "skill_3"]
        )
        
        self.skill3 = Skill(
            id="skill_3",
            name="Machine Learning",
            description="Building ML models",
            skill_type=SkillType.TECHNICAL,
            related_skills=["skill_1", "skill_2"]
        )
        
        # Create test job
        self.job1 = Job(
            id="job_1",
            title="Data Scientist",
            description="Analyze data and build ML models",
            onet_code="15-2051.00",
            required_skills=[
                SkillRequirement("skill_1", 0.8, ProficiencyLevel.INTERMEDIATE, True),
                SkillRequirement("skill_2", 0.9, ProficiencyLevel.ADVANCED, True),
                SkillRequirement("skill_3", 0.7, ProficiencyLevel.INTERMEDIATE, False)
            ],
            growth_projection=0.36,
            median_salary=126830.0
        )
        
        # Add to ontology
        self.ontology.add_skill(self.skill1)
        self.ontology.add_skill(self.skill2)
        self.ontology.add_skill(self.skill3)
        self.ontology.add_job(self.job1)
    
    def test_add_skill(self):
        """Test adding skills to ontology"""
        assert len(self.ontology.skills) == 3
        assert "skill_1" in self.ontology.skills
        assert self.ontology.skills["skill_1"].name == "Python Programming"
    
    def test_add_job(self):
        """Test adding jobs to ontology"""
        assert len(self.ontology.jobs) == 1
        assert "job_1" in self.ontology.jobs
        assert self.ontology.jobs["job_1"].title == "Data Scientist"
    
    def test_find_skill_by_name(self):
        """Test finding skills by name"""
        # Direct name match
        skill = self.ontology.find_skill_by_name("Python Programming")
        assert skill is not None
        assert skill.id == "skill_1"
        
        # Case insensitive
        skill = self.ontology.find_skill_by_name("python programming")
        assert skill is not None
        assert skill.id == "skill_1"
        
        # Synonym match
        skill = self.ontology.find_skill_by_name("Python")
        assert skill is not None
        assert skill.id == "skill_1"
        
        # Not found
        skill = self.ontology.find_skill_by_name("Nonexistent Skill")
        assert skill is None
    
    def test_get_related_skills(self):
        """Test getting related skills"""
        related = self.ontology.get_related_skills("skill_1")
        assert len(related) == 2
        skill_ids = [s.id for s in related]
        assert "skill_2" in skill_ids
        assert "skill_3" in skill_ids
    
    def test_calculate_skill_similarity(self):
        """Test skill similarity calculation"""
        # Same skill
        similarity = self.ontology.calculate_skill_similarity("skill_1", "skill_1")
        assert similarity == 1.0
        
        # Related skills
        similarity = self.ontology.calculate_skill_similarity("skill_1", "skill_2")
        assert similarity == 0.8
        
        # Skills with common relationships
        similarity = self.ontology.calculate_skill_similarity("skill_2", "skill_3")
        assert similarity > 0.0
    
    def test_find_jobs_by_skill(self):
        """Test finding jobs by skill"""
        jobs = self.ontology.find_jobs_by_skill("skill_1")
        assert len(jobs) == 1
        assert jobs[0].id == "job_1"
        
        # With minimum importance filter
        jobs = self.ontology.find_jobs_by_skill("skill_1", min_importance=0.9)
        assert len(jobs) == 0  # skill_1 has importance 0.8
        
        jobs = self.ontology.find_jobs_by_skill("skill_2", min_importance=0.9)
        assert len(jobs) == 1  # skill_2 has importance 0.9
    
    def test_calculate_job_match_score(self):
        """Test job matching score calculation"""
        user_skills = [
            UserSkill("skill_1", ProficiencyLevel.INTERMEDIATE),
            UserSkill("skill_2", ProficiencyLevel.ADVANCED),
            UserSkill("skill_3", ProficiencyLevel.BEGINNER)
        ]
        
        score = self.ontology.calculate_job_match_score(user_skills, "job_1")
        
        # Should be high match since user has all required skills
        assert score > 0.8
        
        # Test with missing skills
        user_skills_partial = [
            UserSkill("skill_1", ProficiencyLevel.BEGINNER)
        ]
        
        score_partial = self.ontology.calculate_job_match_score(user_skills_partial, "job_1")
        assert score_partial < score
    
    def test_identify_skill_gaps(self):
        """Test skill gap identification"""
        user_skills = [
            UserSkill("skill_1", ProficiencyLevel.BEGINNER),  # Below required
            # skill_2 missing entirely
            UserSkill("skill_3", ProficiencyLevel.INTERMEDIATE)  # Meets requirement
        ]
        
        gaps = self.ontology.identify_skill_gaps(user_skills, "job_1")
        
        # Should have gaps for skill_1 and skill_2
        assert len(gaps) >= 2
        
        # Check that gaps are sorted by importance * gap_score
        gap_scores = [g.importance * g.gap_score for g in gaps]
        assert gap_scores == sorted(gap_scores, reverse=True)
        
        # Check specific gaps
        skill_1_gap = next((g for g in gaps if g.skill_id == "skill_1"), None)
        assert skill_1_gap is not None
        assert skill_1_gap.current_level == ProficiencyLevel.BEGINNER
        assert skill_1_gap.required_level == ProficiencyLevel.INTERMEDIATE
        
        skill_2_gap = next((g for g in gaps if g.skill_id == "skill_2"), None)
        assert skill_2_gap is not None
        assert skill_2_gap.current_level is None  # Missing skill
        assert skill_2_gap.gap_score == 1.0
    
    def test_export_to_json(self):
        """Test JSON export functionality"""
        json_data = self.ontology.export_to_json()
        assert json_data is not None
        assert "skills" in json_data
        assert "jobs" in json_data
        assert "skill_1" in json_data
        assert "Python Programming" in json_data


class TestSkillDataStructures:
    """Test individual data structures"""
    
    def test_skill_creation(self):
        """Test Skill object creation"""
        skill = Skill(
            id="test_skill",
            name="Test Skill",
            description="A test skill",
            skill_type=SkillType.TECHNICAL
        )
        
        assert skill.id == "test_skill"
        assert skill.name == "Test Skill"
        assert skill.skill_type == SkillType.TECHNICAL
        assert skill.synonyms == []
        assert skill.related_skills == []
    
    def test_job_creation(self):
        """Test Job object creation"""
        job = Job(
            id="test_job",
            title="Test Job",
            description="A test job"
        )
        
        assert job.id == "test_job"
        assert job.title == "Test Job"
        assert job.required_skills == []
    
    def test_skill_requirement_creation(self):
        """Test SkillRequirement object creation"""
        req = SkillRequirement(
            skill_id="skill_1",
            importance=0.8,
            required_level=ProficiencyLevel.INTERMEDIATE,
            is_mandatory=True
        )
        
        assert req.skill_id == "skill_1"
        assert req.importance == 0.8
        assert req.required_level == ProficiencyLevel.INTERMEDIATE
        assert req.is_mandatory is True
    
    def test_user_skill_creation(self):
        """Test UserSkill object creation"""
        user_skill = UserSkill(
            skill_id="skill_1",
            proficiency_level=ProficiencyLevel.ADVANCED,
            years_experience=5
        )
        
        assert user_skill.skill_id == "skill_1"
        assert user_skill.proficiency_level == ProficiencyLevel.ADVANCED
        assert user_skill.years_experience == 5
        assert user_skill.validated is False
    
    def test_skill_gap_creation(self):
        """Test SkillGap object creation"""
        gap = SkillGap(
            skill_id="skill_1",
            skill_name="Python Programming",
            current_level=ProficiencyLevel.BEGINNER,
            required_level=ProficiencyLevel.INTERMEDIATE,
            importance=0.8,
            gap_score=0.5
        )
        
        assert gap.skill_id == "skill_1"
        assert gap.skill_name == "Python Programming"
        assert gap.current_level == ProficiencyLevel.BEGINNER
        assert gap.required_level == ProficiencyLevel.INTERMEDIATE
        assert gap.importance == 0.8
        assert gap.gap_score == 0.5


if __name__ == "__main__":
    pytest.main([__file__])