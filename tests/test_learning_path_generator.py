# tests/test_learning_path_generator.py
import pytest
from datetime import datetime, timedelta

from src.services.learning_path_generator import (
    SkillGapAnalyzer, LearningPathGenerator, LearningResource,
    LearningMilestone, LearningPath
)
from src.models.skill_ontology import (
    SkillGap, UserSkill, SkillRequirement, ProficiencyLevel, Job
)
from src.models.user_profile import UserProfile
from src.services.career_recommender import CareerRecommendation
from src.services.skill_matcher import JobMatch


class TestSkillGapAnalyzer:
    """Test suite for SkillGapAnalyzer"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.analyzer = SkillGapAnalyzer()
        
        # Create test user profile
        self.user_profile = UserProfile(
            user_id="test_user",
            skills=[
                UserSkill("python", ProficiencyLevel.BEGINNER),
                UserSkill("sql", ProficiencyLevel.INTERMEDIATE)
            ]
        )
        
        # Create test job with requirements
        self.test_job = Job(
            id="data_scientist",
            title="Data Scientist",
            description="Analyze data and build models",
            required_skills=[
                SkillRequirement("python", 0.9, ProficiencyLevel.ADVANCED, True),
                SkillRequirement("machine_learning", 0.8, ProficiencyLevel.INTERMEDIATE, True),
                SkillRequirement("sql", 0.7, ProficiencyLevel.ADVANCED, True),
                SkillRequirement("communication", 0.6, ProficiencyLevel.INTERMEDIATE, False)
            ]
        )
        
        # Create job match
        self.job_match = JobMatch(
            job=self.test_job,
            match_score=0.6,
            matched_skills=[],
            missing_skills=["Machine Learning", "Communication"],
            transferable_skills=[]
        )
        
        # Create career recommendation
        self.recommendation = CareerRecommendation(
            job=self.test_job,
            match_score=0.6,
            skill_match=self.job_match,
            market_data=None,
            market_validation=None,
            explanation="Test recommendation",
            confidence=0.7,
            recommended_actions=[],
            salary_range=(75000, 125000),
            growth_outlook="good"
        )
    
    def test_build_resource_database(self):
        """Test resource database construction"""
        assert 'Python' in self.analyzer.resource_db
        assert 'Machine Learning' in self.analyzer.resource_db
        assert 'SQL' in self.analyzer.resource_db
        
        # Check Python resources
        python_resources = self.analyzer.resource_db['Python']
        assert len(python_resources) > 0
        assert any(r.provider == "Coursera (University of Michigan)" for r in python_resources)
        assert any(r.cost == "free" for r in python_resources)
    
    def test_analyze_skill_gaps(self):
        """Test skill gap analysis"""
        gaps = self.analyzer.analyze_skill_gaps(self.user_profile, self.recommendation)
        
        assert len(gaps) >= 2  # Should find missing skills and level gaps
        
        # Check for missing skills
        missing_skill_names = [gap.skill_name for gap in gaps if gap.current_level is None]
        assert "Machine Learning" in missing_skill_names
        assert "Communication" in missing_skill_names
        
        # Check for level gaps (Python: beginner -> advanced)
        level_gaps = [gap for gap in gaps if gap.current_level is not None]
        python_gap = next((gap for gap in level_gaps if "python" in gap.skill_id), None)
        if python_gap:
            assert python_gap.current_level == ProficiencyLevel.BEGINNER
            assert python_gap.required_level == ProficiencyLevel.ADVANCED
            assert python_gap.gap_score > 0
    
    def test_prioritize_skills(self):
        """Test skill prioritization"""
        gaps = [
            SkillGap("skill1", "High Priority", None, ProficiencyLevel.ADVANCED, 0.9, 1.0),
            SkillGap("skill2", "Medium Priority", ProficiencyLevel.BEGINNER, ProficiencyLevel.INTERMEDIATE, 0.6, 0.5),
            SkillGap("skill3", "Low Priority", ProficiencyLevel.INTERMEDIATE, ProficiencyLevel.ADVANCED, 0.4, 0.3)
        ]
        
        priority_skills, optional_skills = self.analyzer.prioritize_skills(gaps)
        
        assert "High Priority" in priority_skills
        assert "Medium Priority" in priority_skills  # importance > 0.5
        assert "Low Priority" in optional_skills


class TestLearningPathGenerator:
    """Test suite for LearningPathGenerator"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.analyzer = SkillGapAnalyzer()
        self.generator = LearningPathGenerator(self.analyzer)
        
        # Create test data (same as analyzer tests)
        self.user_profile = UserProfile(
            user_id="test_user",
            skills=[
                UserSkill("python", ProficiencyLevel.BEGINNER)
            ]
        )
        
        self.test_job = Job(
            id="data_scientist",
            title="Data Scientist",
            description="Analyze data and build models",
            required_skills=[
                SkillRequirement("python", 0.9, ProficiencyLevel.ADVANCED, True),
                SkillRequirement("machine_learning", 0.8, ProficiencyLevel.INTERMEDIATE, True)
            ]
        )
        
        self.job_match = JobMatch(
            job=self.test_job,
            match_score=0.5,
            matched_skills=[],
            missing_skills=["Machine Learning"],
            transferable_skills=[]
        )
        
        self.recommendation = CareerRecommendation(
            job=self.test_job,
            match_score=0.5,
            skill_match=self.job_match,
            market_data=None,
            market_validation=None,
            explanation="Test recommendation",
            confidence=0.6,
            recommended_actions=[],
            salary_range=None,
            growth_outlook="fair"
        )
    
    def test_generate_learning_path(self):
        """Test complete learning path generation"""
        learning_path = self.generator.generate_learning_path(
            self.user_profile, self.recommendation
        )
        
        assert isinstance(learning_path, LearningPath)
        assert learning_path.target_job_title == "Data Scientist"
        assert learning_path.total_estimated_weeks > 0
        assert len(learning_path.milestones) > 0
        assert learning_path.difficulty_level in ["beginner", "intermediate", "advanced"]
        assert learning_path.estimated_cost in ["Free to $100", "$100 to $500", "$500 to $1500"]
    
    def test_create_milestone_for_skill(self):
        """Test milestone creation for specific skill"""
        gap = SkillGap(
            skill_id="python",
            skill_name="Python",
            current_level=ProficiencyLevel.BEGINNER,
            required_level=ProficiencyLevel.ADVANCED,
            importance=0.9,
            gap_score=0.5
        )
        
        milestone = self.generator._create_milestone_for_skill(gap)
        
        assert milestone is not None
        assert milestone.skill_name == "Python"
        assert milestone.target_level == ProficiencyLevel.ADVANCED
        assert len(milestone.resources) > 0
        assert milestone.estimated_weeks > 0
        assert milestone.validation_method is not None
    
    def test_create_milestone_for_unknown_skill(self):
        """Test milestone creation for skill without resources"""
        gap = SkillGap(
            skill_id="unknown",
            skill_name="Unknown Skill",
            current_level=None,
            required_level=ProficiencyLevel.INTERMEDIATE,
            importance=0.7,
            gap_score=1.0
        )
        
        milestone = self.generator._create_milestone_for_skill(gap)
        
        assert milestone is not None
        assert milestone.skill_name == "Unknown Skill"
        assert len(milestone.resources) == 1
        assert milestone.resources[0].title == "Learn Unknown Skill"
    
    def test_filter_resources_by_level(self):
        """Test resource filtering by skill level"""
        resources = [
            LearningResource("Beginner Course", "Provider", "", "course", "beginner", 20, "free"),
            LearningResource("Intermediate Course", "Provider", "", "course", "intermediate", 40, "paid"),
            LearningResource("Advanced Course", "Provider", "", "course", "advanced", 60, "paid")
        ]
        
        # Test for complete beginner
        filtered = self.generator._filter_resources_by_level(
            resources, None, ProficiencyLevel.INTERMEDIATE
        )
        difficulties = [r.difficulty for r in filtered]
        assert "beginner" in difficulties
        assert "intermediate" in difficulties
        assert "advanced" not in difficulties
        
        # Test for upgrading existing skill
        filtered = self.generator._filter_resources_by_level(
            resources, ProficiencyLevel.BEGINNER, ProficiencyLevel.ADVANCED
        )
        difficulties = [r.difficulty for r in filtered]
        assert "beginner" not in difficulties
        assert "intermediate" in difficulties or "advanced" in difficulties
    
    def test_optimize_learning_sequence(self):
        """Test learning sequence optimization"""
        milestones = [
            LearningMilestone("Advanced Python", ProficiencyLevel.ADVANCED, [], 4, ["Python"], "test"),
            LearningMilestone("Python", ProficiencyLevel.INTERMEDIATE, [], 6, [], "test"),
            LearningMilestone("Machine Learning", ProficiencyLevel.INTERMEDIATE, [], 8, ["Python", "Statistics"], "test"),
            LearningMilestone("Statistics", ProficiencyLevel.INTERMEDIATE, [], 4, [], "test")
        ]
        
        optimized = self.generator._optimize_learning_sequence(milestones)
        
        # Python and Statistics should come before Advanced Python and ML
        python_index = next(i for i, m in enumerate(optimized) if m.skill_name == "Python")
        stats_index = next(i for i, m in enumerate(optimized) if m.skill_name == "Statistics")
        advanced_python_index = next(i for i, m in enumerate(optimized) if m.skill_name == "Advanced Python")
        ml_index = next(i for i, m in enumerate(optimized) if m.skill_name == "Machine Learning")
        
        assert python_index < advanced_python_index
        assert python_index < ml_index
        assert stats_index < ml_index
    
    def test_estimate_total_cost(self):
        """Test cost estimation"""
        milestones = [
            LearningMilestone("Skill1", ProficiencyLevel.INTERMEDIATE, [
                LearningResource("Free Course", "Provider", "", "course", "beginner", 20, "free")
            ], 4, [], "test"),
            LearningMilestone("Skill2", ProficiencyLevel.INTERMEDIATE, [
                LearningResource("Paid Course", "Provider", "", "course", "intermediate", 40, "paid")
            ], 6, [], "test")
        ]
        
        cost = self.generator._estimate_total_cost(milestones)
        
        assert cost in ["Free to $100", "$100 to $500", "$500 to $1500"]
    
    def test_assess_difficulty_level(self):
        """Test difficulty assessment"""
        # Beginner-level milestones
        beginner_milestones = [
            LearningMilestone("Skill1", ProficiencyLevel.BEGINNER, [
                LearningResource("Easy Course", "Provider", "", "course", "beginner", 20, "free")
            ], 4, [], "test")
        ]
        
        difficulty = self.generator._assess_difficulty_level(beginner_milestones)
        assert difficulty == "beginner"
        
        # Advanced-level milestones
        advanced_milestones = [
            LearningMilestone("Skill1", ProficiencyLevel.ADVANCED, [
                LearningResource("Hard Course", "Provider", "", "course", "advanced", 60, "paid")
            ], 8, [], "test")
        ]
        
        difficulty = self.generator._assess_difficulty_level(advanced_milestones)
        assert difficulty == "advanced"
    
    def test_get_validation_method(self):
        """Test validation method retrieval"""
        # Known skills
        assert "certification" in self.generator._get_validation_method("Python").lower()
        assert "model" in self.generator._get_validation_method("Machine Learning").lower()
        
        # Unknown skill
        validation = self.generator._get_validation_method("Unknown Skill")
        assert "project" in validation.lower()
    
    def test_get_next_milestone(self):
        """Test getting next milestone"""
        learning_path = LearningPath(
            target_job_title="Test Job",
            total_estimated_weeks=20,
            milestones=[
                LearningMilestone("Python", ProficiencyLevel.INTERMEDIATE, [], 6, [], "test"),
                LearningMilestone("Advanced Python", ProficiencyLevel.ADVANCED, [], 4, ["Python"], "test"),
                LearningMilestone("Machine Learning", ProficiencyLevel.INTERMEDIATE, [], 8, ["Python"], "test")
            ],
            priority_skills=["Python"],
            optional_skills=[],
            estimated_cost="$100 to $500",
            difficulty_level="intermediate"
        )
        
        # No skills completed - should get Python first
        next_milestone = self.generator.get_next_milestone(learning_path, [])
        assert next_milestone.skill_name == "Python"
        
        # Python completed - should get either Advanced Python or ML
        next_milestone = self.generator.get_next_milestone(learning_path, ["Python"])
        assert next_milestone.skill_name in ["Advanced Python", "Machine Learning"]
        
        # All completed - should get None
        next_milestone = self.generator.get_next_milestone(
            learning_path, ["Python", "Advanced Python", "Machine Learning"]
        )
        assert next_milestone is None
    
    def test_estimate_completion_date(self):
        """Test completion date estimation"""
        learning_path = LearningPath(
            target_job_title="Test Job",
            total_estimated_weeks=10,
            milestones=[
                LearningMilestone("Skill1", ProficiencyLevel.INTERMEDIATE, [
                    LearningResource("Course", "Provider", "", "course", "intermediate", 50, "free")
                ], 6, [], "test")
            ],
            priority_skills=[],
            optional_skills=[],
            estimated_cost="Free to $100",
            difficulty_level="intermediate"
        )
        
        completion_date = self.generator.estimate_completion_date(learning_path, hours_per_week=10)
        
        # Should be approximately 5 weeks from now (50 hours / 10 hours per week)
        expected_date = datetime.now() + timedelta(weeks=5)
        assert abs((completion_date - expected_date).days) <= 7  # Within a week


class TestLearningDataStructures:
    """Test learning path data structures"""
    
    def test_learning_resource_creation(self):
        """Test LearningResource creation"""
        resource = LearningResource(
            title="Test Course",
            provider="Test Provider",
            url="https://example.com",
            resource_type="course",
            difficulty="intermediate",
            estimated_hours=40,
            cost="freemium",
            rating=4.5,
            prerequisites=["Basic knowledge"]
        )
        
        assert resource.title == "Test Course"
        assert resource.estimated_hours == 40
        assert resource.rating == 4.5
        assert len(resource.prerequisites) == 1
    
    def test_learning_milestone_creation(self):
        """Test LearningMilestone creation"""
        resource = LearningResource("Course", "Provider", "", "course", "beginner", 20, "free")
        milestone = LearningMilestone(
            skill_name="Python",
            target_level=ProficiencyLevel.INTERMEDIATE,
            resources=[resource],
            estimated_weeks=6,
            prerequisites=["Basic programming"],
            validation_method="Complete project"
        )
        
        assert milestone.skill_name == "Python"
        assert milestone.target_level == ProficiencyLevel.INTERMEDIATE
        assert len(milestone.resources) == 1
        assert milestone.estimated_weeks == 6
    
    def test_learning_path_creation(self):
        """Test LearningPath creation"""
        milestone = LearningMilestone("Skill", ProficiencyLevel.INTERMEDIATE, [], 4, [], "test")
        learning_path = LearningPath(
            target_job_title="Data Scientist",
            total_estimated_weeks=12,
            milestones=[milestone],
            priority_skills=["Python"],
            optional_skills=["R"],
            estimated_cost="$100 to $500",
            difficulty_level="intermediate"
        )
        
        assert learning_path.target_job_title == "Data Scientist"
        assert learning_path.total_estimated_weeks == 12
        assert len(learning_path.milestones) == 1
        assert len(learning_path.priority_skills) == 1
        assert learning_path.difficulty_level == "intermediate"


if __name__ == "__main__":
    pytest.main([__file__])