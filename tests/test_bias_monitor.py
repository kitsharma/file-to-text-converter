# tests/test_bias_monitor.py
import pytest
from datetime import datetime

from src.services.bias_monitor import (
    BiasDetector, DemographicInference, BiasMetric, FairnessReport
)
from src.models.user_profile import UserProfile, WorkExperience, Education
from src.models.skill_ontology import Job, UserSkill, ProficiencyLevel
from src.services.career_recommender import CareerRecommendation
from src.services.skill_matcher import JobMatch


class TestDemographicInference:
    """Test suite for DemographicInference"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.inference = DemographicInference()
    
    def test_gender_inference_male(self):
        """Test gender inference for male names"""
        profile = UserProfile(
            user_id="test1",
            name="John Smith"
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['gender'] == 'male'
    
    def test_gender_inference_female(self):
        """Test gender inference for female names"""
        profile = UserProfile(
            user_id="test2",
            name="Mary Johnson"
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['gender'] == 'female'
    
    def test_gender_inference_unknown(self):
        """Test gender inference for unknown names"""
        profile = UserProfile(
            user_id="test3",
            name="Alex Taylor"
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['gender'] is None
    
    def test_education_inference_bachelor(self):
        """Test education level inference for bachelor's degree"""
        profile = UserProfile(
            user_id="test4",
            education=[
                Education(
                    degree="Bachelor of Science",
                    institution="Test University",
                    field_of_study="Computer Science"
                )
            ]
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['education_level'] == 'bachelor'
    
    def test_education_inference_master(self):
        """Test education level inference for master's degree"""
        profile = UserProfile(
            user_id="test5",
            education=[
                Education(
                    degree="Master of Business Administration",
                    institution="Test University",
                    field_of_study="Business"
                )
            ]
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['education_level'] == 'master'
    
    def test_experience_inference_entry(self):
        """Test experience level inference for entry level"""
        profile = UserProfile(
            user_id="test6",
            work_experiences=[
                WorkExperience(
                    job_title="Junior Developer",
                    company="Test Company"
                )
            ]
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['experience_level'] == 'entry'
    
    def test_experience_inference_senior(self):
        """Test experience level inference for senior level"""
        profile = UserProfile(
            user_id="test7",
            work_experiences=[
                WorkExperience(job_title="Senior Engineer", company="Company1"),
                WorkExperience(job_title="Lead Developer", company="Company2"),
                WorkExperience(job_title="Principal Engineer", company="Company3"),
                WorkExperience(job_title="Engineering Manager", company="Company4")
            ]
        )
        
        demographics = self.inference.infer_demographics(profile)
        assert demographics['experience_level'] == 'senior'
    
    def test_age_group_inference(self):
        """Test age group inference based on experience"""
        # Young (1 job)
        profile_young = UserProfile(
            user_id="test8",
            work_experiences=[WorkExperience("Junior Dev", "Company")]
        )
        demographics = self.inference.infer_demographics(profile_young)
        assert demographics['age_group'] == 'young'
        
        # Middle (2-3 jobs)
        profile_middle = UserProfile(
            user_id="test9",
            work_experiences=[
                WorkExperience("Dev", "Company1"),
                WorkExperience("Senior Dev", "Company2"),
                WorkExperience("Lead Dev", "Company3")
            ]
        )
        demographics = self.inference.infer_demographics(profile_middle)
        assert demographics['age_group'] == 'middle'
        
        # Older (4+ jobs)
        profile_older = UserProfile(
            user_id="test10",
            work_experiences=[
                WorkExperience("Dev", "Company1"),
                WorkExperience("Senior Dev", "Company2"),
                WorkExperience("Lead Dev", "Company3"),
                WorkExperience("Manager", "Company4"),
                WorkExperience("Director", "Company5")
            ]
        )
        demographics = self.inference.infer_demographics(profile_older)
        assert demographics['age_group'] == 'older'


class TestBiasDetector:
    """Test suite for BiasDetector"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.detector = BiasDetector()
        
        # Create test profiles with different demographics
        self.profiles = [
            # Male profiles
            UserProfile(
                user_id="male1",
                name="John Smith",
                education=[Education("Bachelor of Science", "University", "CS")]
            ),
            UserProfile(
                user_id="male2",
                name="James Johnson",
                education=[Education("Master of Science", "University", "Engineering")]
            ),
            # Female profiles
            UserProfile(
                user_id="female1",
                name="Mary Wilson",
                education=[Education("Bachelor of Arts", "University", "Business")]
            ),
            UserProfile(
                user_id="female2",
                name="Jennifer Davis",
                education=[Education("Master of Business Administration", "University", "MBA")]
            )
        ]
        
        # Create test jobs
        self.jobs = [
            Job("job1", "Software Engineer", "Develop software"),
            Job("job2", "Data Scientist", "Analyze data"),
            Job("job3", "Product Manager", "Manage products"),
            Job("job4", "Marketing Manager", "Manage marketing")
        ]
        
        # Create test recommendations
        self.recommendations = [
            # Recommendations for male1 (higher confidence/salaries)
            [
                CareerRecommendation(
                    job=self.jobs[0],
                    match_score=0.9,
                    skill_match=JobMatch(self.jobs[0], 0.9, [], [], []),
                    market_data=None,
                    market_validation=None,
                    explanation="Great match",
                    confidence=0.85,
                    recommended_actions=[],
                    salary_range=(90000, 120000),
                    growth_outlook="excellent"
                ),
                CareerRecommendation(
                    job=self.jobs[1],
                    match_score=0.8,
                    skill_match=JobMatch(self.jobs[1], 0.8, [], [], []),
                    market_data=None,
                    market_validation=None,
                    explanation="Good match",
                    confidence=0.75,
                    recommended_actions=[],
                    salary_range=(95000, 130000),
                    growth_outlook="good"
                )
            ],
            # Recommendations for male2 (similar to male1)
            [
                CareerRecommendation(
                    job=self.jobs[0],
                    match_score=0.88,
                    skill_match=JobMatch(self.jobs[0], 0.88, [], [], []),
                    market_data=None,
                    market_validation=None,
                    explanation="Great match",
                    confidence=0.82,
                    recommended_actions=[],
                    salary_range=(92000, 125000),
                    growth_outlook="excellent"
                )
            ],
            # Recommendations for female1 (lower confidence/salaries)
            [
                CareerRecommendation(
                    job=self.jobs[2],
                    match_score=0.7,
                    skill_match=JobMatch(self.jobs[2], 0.7, [], [], []),
                    market_data=None,
                    market_validation=None,
                    explanation="Decent match",
                    confidence=0.65,
                    recommended_actions=[],
                    salary_range=(70000, 90000),
                    growth_outlook="fair"
                )
            ],
            # Recommendations for female2
            [
                CareerRecommendation(
                    job=self.jobs[3],
                    match_score=0.72,
                    skill_match=JobMatch(self.jobs[3], 0.72, [], [], []),
                    market_data=None,
                    market_validation=None,
                    explanation="Good match",
                    confidence=0.68,
                    recommended_actions=[],
                    salary_range=(75000, 95000),
                    growth_outlook="good"
                )
            ]
        ]
    
    def test_analyze_recommendations(self):
        """Test full recommendation analysis"""
        report = self.detector.analyze_recommendations(self.profiles, self.recommendations)
        
        assert isinstance(report, FairnessReport)
        assert report.total_recommendations == 4
        assert len(report.bias_metrics) > 0
        assert 0.0 <= report.overall_fairness_score <= 1.0
        assert len(report.recommendations) > 0
        assert report.generation_time is not None
    
    def test_calculate_demographic_summary(self):
        """Test demographic summary calculation"""
        demographic_data = []
        for profile, recs in zip(self.profiles, self.recommendations):
            demographics = self.detector.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, recs, demographics))
        
        summary = self.detector._calculate_demographic_summary(demographic_data)
        
        assert 'gender' in summary
        assert 'education_level' in summary
        assert summary['gender']['male'] == 2
        assert summary['gender']['female'] == 2
    
    def test_demographic_parity(self):
        """Test demographic parity detection"""
        demographic_data = []
        for profile, recs in zip(self.profiles, self.recommendations):
            demographics = self.detector.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, recs, demographics))
        
        metrics = self.detector._test_demographic_parity(demographic_data)
        
        assert len(metrics) > 0
        
        # Should detect gender disparity in match scores
        gender_metrics = [m for m in metrics if m.protected_attribute == 'gender']
        assert len(gender_metrics) > 0
        
        # Check that at least one metric is biased (due to our test data)
        assert any(m.is_biased for m in gender_metrics)
    
    def test_salary_disparity(self):
        """Test salary disparity detection"""
        demographic_data = []
        for profile, recs in zip(self.profiles, self.recommendations):
            demographics = self.detector.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, recs, demographics))
        
        metrics = self.detector._test_salary_disparity(demographic_data)
        
        assert len(metrics) > 0
        
        # Should detect salary disparity
        salary_metrics = [m for m in metrics if m.metric_name == 'salary_disparity']
        assert len(salary_metrics) > 0
        
        # Check for gender salary gap
        gender_salary_metrics = [m for m in salary_metrics if m.protected_attribute == 'gender']
        if gender_salary_metrics:
            assert any(m.is_biased for m in gender_salary_metrics)
    
    def test_confidence_gap(self):
        """Test confidence gap detection"""
        demographic_data = []
        for profile, recs in zip(self.profiles, self.recommendations):
            demographics = self.detector.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, recs, demographics))
        
        metrics = self.detector._test_confidence_gap(demographic_data)
        
        assert len(metrics) > 0
        
        # Should detect confidence gap
        confidence_metrics = [m for m in metrics if m.metric_name == 'confidence_gap']
        assert len(confidence_metrics) > 0
    
    def test_calculate_overall_fairness_score(self):
        """Test overall fairness score calculation"""
        # Test with no bias
        no_bias_metrics = [
            BiasMetric(
                "test", "gender", "male", "female", 0.05, 0.1, False, "low", "test", datetime.now()
            )
        ]
        score = self.detector._calculate_overall_fairness_score(no_bias_metrics)
        assert score > 0.8
        
        # Test with high bias
        high_bias_metrics = [
            BiasMetric(
                "test", "gender", "male", "female", 0.3, 0.1, True, "high", "test", datetime.now()
            )
        ]
        score = self.detector._calculate_overall_fairness_score(high_bias_metrics)
        assert score < 0.8
    
    def test_generate_fairness_recommendations(self):
        """Test fairness recommendation generation"""
        bias_metrics = [
            BiasMetric(
                "demographic_parity", "gender", "male", "female", 0.15, 0.1, True, "medium", "test", datetime.now()
            ),
            BiasMetric(
                "salary_disparity", "gender", "male", "female", 0.2, 0.15, True, "high", "test", datetime.now()
            )
        ]
        
        recommendations = self.detector._generate_fairness_recommendations(bias_metrics)
        
        assert len(recommendations) > 0
        assert any("demographic parity" in rec.lower() for rec in recommendations)
        assert any("salary" in rec.lower() for rec in recommendations)
        assert any("immediate" in rec.lower() for rec in recommendations)  # Due to high severity
    
    def test_monitor_single_recommendation(self):
        """Test single recommendation monitoring"""
        profile = UserProfile(
            user_id="test_user",
            name="Mary Johnson"  # Female name
        )
        
        recommendation = CareerRecommendation(
            job=Job("job1", "Software Engineer", "Develop software"),
            match_score=0.8,
            skill_match=JobMatch(Job("job1", "Software Engineer", "Develop software"), 0.8, [], [], []),
            market_data=None,
            market_validation=None,
            explanation="Good match",
            confidence=0.75,
            recommended_actions=[],
            salary_range=(80000, 120000),
            growth_outlook="good"
        )
        
        result = self.detector.monitor_single_recommendation(profile, recommendation)
        
        assert 'user_demographics' in result
        assert 'recommendation_title' in result
        assert 'confidence' in result
        assert 'bias_indicators' in result
        assert 'monitoring_timestamp' in result
        
        # Check that gender stereotype is detected as positive (breaking stereotypes)
        assert result['user_demographics']['gender'] == 'female'
        assert result['bias_indicators']['gender_stereotype'] is False  # Good - female in tech
    
    def test_role_diversity(self):
        """Test role diversity detection"""
        demographic_data = []
        for profile, recs in zip(self.profiles, self.recommendations):
            demographics = self.detector.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, recs, demographics))
        
        metrics = self.detector._test_role_diversity(demographic_data)
        
        assert len(metrics) > 0
        
        # Should detect diversity differences
        diversity_metrics = [m for m in metrics if m.metric_name == 'role_diversity']
        assert len(diversity_metrics) > 0
    
    def test_equal_opportunity(self):
        """Test equal opportunity detection"""
        demographic_data = []
        for profile, recs in zip(self.profiles, self.recommendations):
            demographics = self.detector.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, recs, demographics))
        
        metrics = self.detector._test_equal_opportunity(demographic_data)
        
        assert len(metrics) > 0
        
        # Should detect equal opportunity issues
        eq_opp_metrics = [m for m in metrics if m.metric_name == 'equal_opportunity']
        assert len(eq_opp_metrics) > 0


class TestBiasMetric:
    """Test BiasMetric data structure"""
    
    def test_bias_metric_creation(self):
        """Test BiasMetric creation"""
        metric = BiasMetric(
            metric_name="demographic_parity",
            protected_attribute="gender",
            reference_group="male",
            comparison_group="female",
            metric_value=0.15,
            threshold=0.1,
            is_biased=True,
            severity="medium",
            description="Test metric",
            timestamp=datetime.now()
        )
        
        assert metric.metric_name == "demographic_parity"
        assert metric.protected_attribute == "gender"
        assert metric.is_biased is True
        assert metric.severity == "medium"
        assert metric.metric_value == 0.15


class TestFairnessReport:
    """Test FairnessReport data structure"""
    
    def test_fairness_report_creation(self):
        """Test FairnessReport creation"""
        report = FairnessReport(
            report_id="test_report",
            generation_time=datetime.now(),
            total_recommendations=100,
            demographics_summary={"gender": {"male": 50, "female": 50}},
            bias_metrics=[],
            overall_fairness_score=0.85,
            recommendations=["Test recommendation"],
            data_period="Test period"
        )
        
        assert report.report_id == "test_report"
        assert report.total_recommendations == 100
        assert report.overall_fairness_score == 0.85
        assert len(report.recommendations) == 1
        assert report.demographics_summary["gender"]["male"] == 50


if __name__ == "__main__":
    pytest.main([__file__])