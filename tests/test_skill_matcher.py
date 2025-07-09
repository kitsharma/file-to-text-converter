# tests/test_skill_matcher.py
import pytest
from src.services.skill_matcher import SkillMatcher, SkillMatch, JobMatch
from src.models.skill_ontology import (
    Skill, Job, SkillOntology, SkillRequirement, 
    SkillType, ProficiencyLevel
)
from src.integrations.onet_integration import ONETIntegration


class TestSkillMatcher:
    """Test suite for SkillMatcher service"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Create ontology
        self.ontology = SkillOntology()
        
        # Add test skills
        self.skill_python = Skill(
            id="skill_python",
            name="Python Programming",
            description="Programming in Python language",
            skill_type=SkillType.TECHNICAL,
            synonyms=["Python", "Python Development", "Python Coding"]
        )
        
        self.skill_communication = Skill(
            id="skill_comm",
            name="Communication",
            description="Verbal and written communication skills",
            skill_type=SkillType.SOFT,
            synonyms=["Speaking", "Writing", "Presenting"]
        )
        
        self.skill_data_analysis = Skill(
            id="skill_data",
            name="Data Analysis",
            description="Analyzing data to extract insights",
            skill_type=SkillType.TECHNICAL,
            synonyms=["Data Analytics", "Analysis", "Statistics"],
            related_skills=["skill_python"]
        )
        
        self.ontology.add_skill(self.skill_python)
        self.ontology.add_skill(self.skill_communication)
        self.ontology.add_skill(self.skill_data_analysis)
        
        # Add test job
        self.job_data_scientist = Job(
            id="job_ds",
            title="Data Scientist",
            description="Analyze data and build models",
            required_skills=[
                SkillRequirement("skill_python", 0.8, ProficiencyLevel.INTERMEDIATE),
                SkillRequirement("skill_data", 0.9, ProficiencyLevel.ADVANCED),
                SkillRequirement("skill_comm", 0.6, ProficiencyLevel.INTERMEDIATE)
            ]
        )
        self.ontology.add_job(self.job_data_scientist)
        
        # Create O*NET integration mock
        self.onet = ONETIntegration()
        
        # Create skill matcher
        self.matcher = SkillMatcher(self.ontology, self.onet)
    
    def test_exact_match(self):
        """Test exact skill name matching"""
        matches = self.matcher.match_user_skills(["Python Programming"])
        
        assert len(matches) == 1
        assert matches[0].matched_skill.id == "skill_python"
        assert matches[0].match_type == "exact"
        assert matches[0].match_score == 1.0
        assert matches[0].confidence == 1.0
    
    def test_exact_match_case_insensitive(self):
        """Test case-insensitive exact matching"""
        matches = self.matcher.match_user_skills(["python programming"])
        
        assert len(matches) == 1
        assert matches[0].matched_skill.id == "skill_python"
        assert matches[0].match_type == "exact"
    
    def test_synonym_match(self):
        """Test matching via synonyms"""
        matches = self.matcher.match_user_skills(["Python", "Speaking"])
        
        assert len(matches) == 2
        
        # Check Python synonym match
        python_match = next(m for m in matches if m.user_term == "Python")
        assert python_match.matched_skill.id == "skill_python"
        assert python_match.match_type == "synonym"
        assert python_match.match_score == 0.9
        
        # Check Speaking synonym match
        speaking_match = next(m for m in matches if m.user_term == "Speaking")
        assert speaking_match.matched_skill.id == "skill_comm"
        assert speaking_match.match_type == "synonym"
    
    def test_fuzzy_match(self):
        """Test fuzzy string matching"""
        matches = self.matcher.match_user_skills(["Pythn", "Communicatin"])
        
        assert len(matches) == 2
        
        # Should match despite typos
        assert any(m.matched_skill.id == "skill_python" for m in matches)
        assert any(m.matched_skill.id == "skill_comm" for m in matches)
        assert all(m.match_type == "fuzzy" for m in matches)
    
    def test_fuzzy_match_substring(self):
        """Test fuzzy matching with substrings"""
        matches = self.matcher.match_user_skills(["Programming", "Analysis"])
        
        assert len(matches) == 2
        
        # "Programming" should match "Python Programming"
        prog_match = next(m for m in matches if m.user_term == "Programming")
        assert prog_match.matched_skill.id == "skill_python"
        
        # "Analysis" should match "Data Analysis"
        analysis_match = next(m for m in matches if m.user_term == "Analysis")
        assert analysis_match.matched_skill.id == "skill_data"
    
    def test_semantic_match(self):
        """Test semantic keyword matching"""
        matches = self.matcher.match_user_skills(["writing and speaking skills"])
        
        assert len(matches) == 1
        assert matches[0].matched_skill.id == "skill_comm"
        assert matches[0].match_type == "semantic"
        assert matches[0].confidence < 0.8  # Lower confidence for semantic
    
    def test_no_match(self):
        """Test when no skills match"""
        matches = self.matcher.match_user_skills(["Underwater Basketweaving"])
        
        assert len(matches) == 0
    
    def test_find_matching_jobs(self):
        """Test finding jobs that match user skills"""
        # Create skill matches
        skill_matches = [
            SkillMatch("Python", self.skill_python, 0.9, "synonym", 0.9),
            SkillMatch("Data Analytics", self.skill_data_analysis, 0.9, "synonym", 0.9)
        ]
        
        job_matches = self.matcher.find_matching_jobs(skill_matches)
        
        assert len(job_matches) > 0
        
        # Check the data scientist job match
        ds_match = next(m for m in job_matches if m.job.id == "job_ds")
        assert ds_match.match_score > 0.5
        assert len(ds_match.matched_skills) == 2
        assert len(ds_match.missing_skills) == 1
        assert "Communication" in ds_match.missing_skills
    
    def test_find_matching_jobs_with_transferable_skills(self):
        """Test job matching with transferable skills"""
        # Add skill relationship
        self.ontology.skill_relationships["skill_python"].add("skill_data")
        self.ontology.skill_relationships["skill_data"].add("skill_python")
        
        # User only has Python
        skill_matches = [
            SkillMatch("Python", self.skill_python, 0.9, "synonym", 0.9)
        ]
        
        job_matches = self.matcher.find_matching_jobs(skill_matches)
        
        # Should still match data scientist job due to transferable skills
        ds_match = next(m for m in job_matches if m.job.id == "job_ds")
        assert ds_match.match_score > 0.5
        assert len(ds_match.transferable_skills) > 0
        assert "Data Analysis" in ds_match.transferable_skills
    
    def test_find_matching_jobs_min_score(self):
        """Test minimum match score filtering"""
        # User only has one skill
        skill_matches = [
            SkillMatch("Speaking", self.skill_communication, 0.9, "synonym", 0.9)
        ]
        
        # With high minimum score
        job_matches = self.matcher.find_matching_jobs(skill_matches, min_match_score=0.8)
        assert len(job_matches) == 0  # Communication is only 0.6 importance
        
        # With lower minimum score
        job_matches = self.matcher.find_matching_jobs(skill_matches, min_match_score=0.2)
        assert len(job_matches) > 0
    
    def test_expand_skill_descriptions(self):
        """Test expanding casual descriptions to formal skills"""
        expansions = self.matcher.expand_skill_descriptions([
            "Python",
            "good with people"
        ])
        
        assert "Python" in expansions
        assert "Python Programming" in expansions["Python"]
        
        # Should have no expansion for unmatched term
        assert "good with people" in expansions
        assert len(expansions["good with people"]) == 0
    
    def test_expand_skill_descriptions_with_related(self):
        """Test skill expansion includes related skills"""
        # Add more relationships
        self.skill_python.related_skills = ["skill_data"]
        self.ontology.skill_relationships["skill_python"] = {"skill_data"}
        
        expansions = self.matcher.expand_skill_descriptions(["Python"])
        
        assert "Python Programming" in expansions["Python"]
        assert "Data Analysis" in expansions["Python"]
    
    def test_build_synonym_index(self):
        """Test synonym index building"""
        assert "python" in self.matcher.synonym_index
        assert "skill_python" in self.matcher.synonym_index["python"]
        
        assert "speaking" in self.matcher.synonym_index
        assert "skill_comm" in self.matcher.synonym_index["speaking"]
    
    def test_extract_keywords(self):
        """Test keyword extraction"""
        keywords = self.matcher._extract_keywords("I am very good at programming in Python")
        
        assert "programming" in keywords
        assert "python" in keywords
        assert "very" not in keywords  # Stop word
        assert "am" not in keywords  # Stop word
        assert "at" not in keywords  # Stop word


class TestSkillMatchDataStructures:
    """Test SkillMatch and JobMatch data structures"""
    
    def test_skill_match_creation(self):
        """Test SkillMatch creation"""
        skill = Skill("test", "Test Skill", "Test", SkillType.TECHNICAL)
        match = SkillMatch(
            user_term="test",
            matched_skill=skill,
            match_score=0.8,
            match_type="fuzzy",
            confidence=0.7
        )
        
        assert match.user_term == "test"
        assert match.matched_skill.id == "test"
        assert match.match_score == 0.8
        assert match.match_type == "fuzzy"
        assert match.confidence == 0.7
    
    def test_job_match_creation(self):
        """Test JobMatch creation"""
        job = Job("test_job", "Test Job", "Test")
        skill = Skill("test", "Test Skill", "Test", SkillType.TECHNICAL)
        skill_match = SkillMatch("test", skill, 0.8, "fuzzy", 0.7)
        
        job_match = JobMatch(
            job=job,
            match_score=0.75,
            matched_skills=[skill_match],
            missing_skills=["Other Skill"],
            transferable_skills=["Related Skill"]
        )
        
        assert job_match.job.id == "test_job"
        assert job_match.match_score == 0.75
        assert len(job_match.matched_skills) == 1
        assert len(job_match.missing_skills) == 1
        assert len(job_match.transferable_skills) == 1


if __name__ == "__main__":
    pytest.main([__file__])