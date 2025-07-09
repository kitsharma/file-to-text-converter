# tests/test_career_recommender.py
import pytest
from unittest.mock import Mock, patch
from datetime import datetime

from src.services.career_recommender import (
    CareerRecommendationEngine, PerplexityValidator, 
    CareerRecommendation, MarketValidation
)
from src.models.user_profile import UserProfile
from src.models.skill_ontology import (
    SkillOntology, Skill, Job, UserSkill, SkillRequirement,
    SkillType, ProficiencyLevel
)
from src.services.skill_matcher import SkillMatcher, JobMatch, SkillMatch
from src.integrations.bls_integration import BLSIntegration, JobProjection
from src.integrations.onet_integration import ONETIntegration


class TestPerplexityValidator:
    """Test suite for PerplexityValidator"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = PerplexityValidator(api_key="test_key")
        
        # Mock Perplexity API response
        self.mock_response = {
            "choices": [{
                "message": {
                    "content": "Data Scientists are experiencing strong growth in 2024, with 20-25% projected growth according to BLS. Median salary ranges from $95,000 to $165,000. Key skills include Python, machine learning, and statistical analysis. Sources: Bureau of Labor Statistics 2024 Employment Projections."
                }
            }],
            "citations": [
                {"url": "https://bls.gov/employment-projections", "title": "BLS Employment Projections"},
                {"url": "https://indeed.com/career-advice/data-scientist", "title": "Indeed Career Guide"}
            ]
        }
    
    @patch('requests.Session.post')
    def test_validate_job_outlook_success(self, mock_post):
        """Test successful job outlook validation"""
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = self.mock_response
        mock_post.return_value = mock_response
        
        # Test projection data
        bls_projection = JobProjection(
            occupation_code="15-2051",
            occupation_title="Data Scientists",
            employment_2022=192800,
            employment_2032=231900,
            change_numeric=39100,
            change_percent=20.3,
            median_annual_wage=131490,
            typical_education="Bachelor's degree",
            work_experience="None"
        )
        
        validation = self.validator.validate_job_outlook("Data Scientists", bls_projection)
        
        assert validation.confidence > 0.5
        assert validation.is_current is True
        assert len(validation.sources) == 2
        assert "bls.gov" in validation.sources[0]
        assert "20-25%" in validation.response
    
    @patch('requests.Session.post')
    def test_validate_job_outlook_api_error(self, mock_post):
        """Test handling of API errors"""
        # Mock API error
        mock_post.side_effect = Exception("API Error")
        
        validation = self.validator.validate_job_outlook("Data Scientists")
        
        assert validation.confidence == 0.1
        assert validation.is_current is False
        assert len(validation.sources) == 0
        assert "Unable to validate" in validation.response
    
    def test_assess_source_confidence_high_quality(self):
        """Test confidence assessment with high-quality sources"""
        sources = ["https://bls.gov/employment-projections", "https://indeed.com/salary"]
        content = "According to Bureau of Labor Statistics data from 2024..."
        
        confidence = self.validator._assess_source_confidence(sources, content)
        
        assert confidence > 0.7  # Should be high due to government source
    
    def test_assess_source_confidence_low_quality(self):
        """Test confidence assessment with low-quality sources"""
        sources = ["https://random-blog.com/predictions"]
        content = "I think this job might grow..."
        
        confidence = self.validator._assess_source_confidence(sources, content)
        
        assert confidence < 0.6  # Should be lower due to poor sources
    
    def test_assess_source_confidence_no_sources(self):
        """Test confidence assessment with no sources"""
        sources = []
        content = "Some general information about jobs..."
        
        confidence = self.validator._assess_source_confidence(sources, content)
        
        assert confidence <= 0.3  # Should be low due to no sources


class TestCareerRecommendationEngine:
    """Test suite for CareerRecommendationEngine"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Create ontology with test data
        self.ontology = SkillOntology()
        
        # Add test skills
        skills = [
            Skill("python", "Python", "Python programming", SkillType.TECHNICAL),
            Skill("ml", "Machine Learning", "ML algorithms", SkillType.TECHNICAL),
            Skill("sql", "SQL", "Database queries", SkillType.TECHNICAL),
            Skill("communication", "Communication", "Communication skills", SkillType.SOFT)
        ]
        
        for skill in skills:
            self.ontology.add_skill(skill)
        
        # Add test job
        self.test_job = Job(
            id="data_scientist",
            title="Data Scientist",
            description="Analyze data and build models",
            onet_code="15-2051",
            required_skills=[
                SkillRequirement("python", 0.9, ProficiencyLevel.ADVANCED),
                SkillRequirement("ml", 0.8, ProficiencyLevel.INTERMEDIATE),
                SkillRequirement("sql", 0.7, ProficiencyLevel.INTERMEDIATE),
                SkillRequirement("communication", 0.6, ProficiencyLevel.INTERMEDIATE)
            ]
        )
        self.ontology.add_job(self.test_job)
        
        # Create components
        self.onet = ONETIntegration()
        self.skill_matcher = SkillMatcher(self.ontology, self.onet)
        self.bls = BLSIntegration()
        
        # Mock validator
        self.mock_validator = Mock(spec=PerplexityValidator)
        
        # Create recommendation engine
        self.engine = CareerRecommendationEngine(
            self.ontology, self.skill_matcher, self.bls, self.onet, self.mock_validator
        )
        
        # Test user profile
        self.user_profile = UserProfile(
            user_id="test_user",
            skills=[
                UserSkill("python", ProficiencyLevel.ADVANCED),
                UserSkill("sql", ProficiencyLevel.INTERMEDIATE),
                UserSkill("communication", ProficiencyLevel.INTERMEDIATE)
            ]
        )
    
    @patch.object(BLSIntegration, 'get_occupation_outlook')
    def test_get_career_recommendations_with_validation(self, mock_bls_outlook):
        """Test career recommendations with Perplexity validation"""
        # Mock BLS projection
        bls_projection = JobProjection(
            occupation_code="15-2051",
            occupation_title="Data Scientists",
            employment_2022=192800,
            employment_2032=231900,
            change_numeric=39100,
            change_percent=20.3,
            median_annual_wage=131490,
            typical_education="Bachelor's degree",
            work_experience="None"
        )
        mock_bls_outlook.return_value = bls_projection
        
        # Mock Perplexity validation
        mock_validation = MarketValidation(
            query="test query",
            response="Data Scientists show strong growth in 2024 with 20% projected growth.",
            sources=["https://bls.gov", "https://indeed.com"],
            confidence=0.8,
            is_current=True,
            last_updated=datetime.now()
        )
        self.mock_validator.validate_job_outlook.return_value = mock_validation
        
        recommendations = self.engine.get_career_recommendations(
            self.user_profile, limit=5, validate_with_perplexity=True
        )
        
        assert len(recommendations) > 0
        assert isinstance(recommendations[0], CareerRecommendation)
        assert recommendations[0].job.title == "Data Scientist"
        assert recommendations[0].confidence > 0.5
        assert recommendations[0].market_validation == mock_validation
        assert recommendations[0].growth_outlook in ["excellent", "good", "fair", "poor"]
        
        # Verify Perplexity was called
        self.mock_validator.validate_job_outlook.assert_called_once()
    
    @patch.object(BLSIntegration, 'get_occupation_outlook')
    def test_get_career_recommendations_without_validation(self, mock_bls_outlook):
        """Test career recommendations without Perplexity validation"""
        mock_bls_outlook.return_value = None
        
        recommendations = self.engine.get_career_recommendations(
            self.user_profile, limit=5, validate_with_perplexity=False
        )
        
        assert len(recommendations) > 0
        assert recommendations[0].market_validation is None
        
        # Verify Perplexity was not called
        self.mock_validator.validate_job_outlook.assert_not_called()
    
    def test_create_recommendation_with_full_data(self):
        """Test creating recommendation with complete data"""
        # Create job match
        job_match = JobMatch(
            job=self.test_job,
            match_score=0.8,
            matched_skills=[],
            missing_skills=["Machine Learning"],
            transferable_skills=[]
        )
        
        # BLS projection
        bls_projection = JobProjection(
            occupation_code="15-2051",
            occupation_title="Data Scientists",
            employment_2022=192800,
            employment_2032=231900,
            change_numeric=39100,
            change_percent=20.3,
            median_annual_wage=131490,
            typical_education="Bachelor's degree",
            work_experience="None"
        )
        
        # Market validation
        market_validation = MarketValidation(
            query="test",
            response="Strong growth expected",
            sources=["bls.gov"],
            confidence=0.9,
            is_current=True,
            last_updated=datetime.now()
        )
        
        recommendation = self.engine._create_recommendation(
            self.test_job, job_match, bls_projection, market_validation
        )
        
        assert recommendation.confidence > 0.8
        assert recommendation.salary_range is not None
        assert recommendation.growth_outlook == "excellent"  # 20.3% growth
        assert len(recommendation.recommended_actions) > 0
        assert "Machine Learning" in recommendation.explanation
    
    def test_generate_explanation(self):
        """Test explanation generation"""
        job_match = JobMatch(
            job=self.test_job,
            match_score=0.75,
            matched_skills=[],
            missing_skills=["Machine Learning"],
            transferable_skills=[]
        )
        
        bls_projection = JobProjection(
            occupation_code="15-2051",
            occupation_title="Data Scientists",
            employment_2022=192800,
            employment_2032=231900,
            change_numeric=39100,
            change_percent=15.5,
            median_annual_wage=131490,
            typical_education="Bachelor's degree",
            work_experience="None"
        )
        
        explanation = self.engine._generate_explanation(
            self.test_job, job_match, bls_projection, None
        )
        
        assert "75% skill match" in explanation
        assert "Data Scientist" in explanation
        assert "consider developing: Machine Learning" in explanation
        assert "15.5% projected growth" in explanation
    
    def test_determine_growth_outlook(self):
        """Test growth outlook determination"""
        # Excellent growth
        projection_excellent = JobProjection(
            "test", "Test", None, None, None, 20.0, None, None, None
        )
        outlook = self.engine._determine_growth_outlook(projection_excellent, None)
        assert outlook == "excellent"
        
        # Good growth
        projection_good = JobProjection(
            "test", "Test", None, None, None, 10.0, None, None, None
        )
        outlook = self.engine._determine_growth_outlook(projection_good, None)
        assert outlook == "good"
        
        # Fair growth
        projection_fair = JobProjection(
            "test", "Test", None, None, None, 3.0, None, None, None
        )
        outlook = self.engine._determine_growth_outlook(projection_fair, None)
        assert outlook == "fair"
        
        # Poor growth
        projection_poor = JobProjection(
            "test", "Test", None, None, None, -5.0, None, None, None
        )
        outlook = self.engine._determine_growth_outlook(projection_poor, None)
        assert outlook == "poor"
    
    def test_determine_salary_range(self):
        """Test salary range determination"""
        projection = JobProjection(
            "test", "Test", None, None, None, None, 100000, None, None
        )
        
        salary_range = self.engine._determine_salary_range(projection, None)
        
        assert salary_range is not None
        assert salary_range[0] == 75000  # 75% of median
        assert salary_range[1] == 125000  # 125% of median
    
    def test_generate_actions(self):
        """Test action generation"""
        job_match = JobMatch(
            job=self.test_job,
            match_score=0.7,
            matched_skills=[],
            missing_skills=["Machine Learning", "Deep Learning"],
            transferable_skills=["Python Programming"]
        )
        
        bls_projection = JobProjection(
            "test", "Test", None, None, None, None, None, "Master's degree", None
        )
        
        actions = self.engine._generate_actions(job_match, bls_projection)
        
        assert len(actions) > 0
        assert any("Machine Learning" in action for action in actions)
        assert any("transferable skills" in action for action in actions)
        assert any("master's degree" in action.lower() for action in actions)
    
    @patch.object(BLSIntegration, 'get_fastest_growing_occupations')
    def test_get_trending_careers(self, mock_fastest_growing):
        """Test getting trending careers"""
        # Mock BLS data
        mock_projections = [
            JobProjection(
                occupation_code="15-2051",
                occupation_title="Data Scientists",
                employment_2022=192800,
                employment_2032=231900,
                change_numeric=39100,
                change_percent=20.3,
                median_annual_wage=131490,
                typical_education="Bachelor's degree",
                work_experience="None"
            )
        ]
        mock_fastest_growing.return_value = mock_projections
        
        # Mock Perplexity validation
        mock_validation = MarketValidation(
            query="test",
            response="trending career",
            sources=["bls.gov"],
            confidence=0.8,
            is_current=True,
            last_updated=datetime.now()
        )
        self.mock_validator.validate_job_outlook.return_value = mock_validation
        
        trending = self.engine.get_trending_careers(limit=5)
        
        assert len(trending) > 0
        assert trending[0].job.title == "Data Scientists"
        assert trending[0].match_score == 0.5  # Neutral for trending


class TestMarketValidation:
    """Test MarketValidation data structure"""
    
    def test_market_validation_creation(self):
        """Test MarketValidation creation"""
        validation = MarketValidation(
            query="test query",
            response="test response",
            sources=["source1", "source2"],
            confidence=0.8,
            is_current=True,
            last_updated=datetime.now()
        )
        
        assert validation.query == "test query"
        assert validation.confidence == 0.8
        assert validation.is_current is True
        assert len(validation.sources) == 2


class TestCareerRecommendation:
    """Test CareerRecommendation data structure"""
    
    def test_career_recommendation_creation(self):
        """Test CareerRecommendation creation"""
        job = Job("test", "Test Job", "Test description")
        recommendation = CareerRecommendation(
            job=job,
            match_score=0.8,
            skill_match=Mock(),
            market_data=None,
            market_validation=None,
            explanation="Test explanation",
            confidence=0.7,
            recommended_actions=["Action 1", "Action 2"],
            salary_range=(75000, 125000),
            growth_outlook="good"
        )
        
        assert recommendation.job.title == "Test Job"
        assert recommendation.match_score == 0.8
        assert recommendation.confidence == 0.7
        assert recommendation.growth_outlook == "good"
        assert len(recommendation.recommended_actions) == 2


if __name__ == "__main__":
    pytest.main([__file__])