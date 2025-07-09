# src/services/bias_monitor.py
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime
import logging
from collections import defaultdict, Counter
import statistics

from src.models.user_profile import UserProfile
from src.services.career_recommender import CareerRecommendation

logger = logging.getLogger(__name__)


@dataclass
class BiasMetric:
    """Represents a bias measurement"""
    metric_name: str
    protected_attribute: str  # e.g., 'gender', 'age_group', 'education'
    reference_group: str  # e.g., 'male', 'young', 'bachelor'
    comparison_group: str  # e.g., 'female', 'older', 'high_school'
    metric_value: float
    threshold: float
    is_biased: bool
    severity: str  # 'low', 'medium', 'high'
    description: str
    timestamp: datetime


@dataclass
class FairnessReport:
    """Comprehensive fairness assessment report"""
    report_id: str
    generation_time: datetime
    total_recommendations: int
    demographics_summary: Dict[str, Dict[str, int]]
    bias_metrics: List[BiasMetric]
    overall_fairness_score: float  # 0.0 to 1.0
    recommendations: List[str]
    data_period: str


class DemographicInference:
    """Infers demographic information from user profiles"""
    
    def __init__(self):
        # Common name patterns for gender inference (simplified)
        self.male_names = {
            'john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 
            'charles', 'joseph', 'thomas', 'christopher', 'daniel', 'paul', 
            'mark', 'donald', 'george', 'kenneth', 'steven', 'edward', 'brian'
        }
        
        self.female_names = {
            'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 
            'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 
            'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle'
        }
        
        # Education level patterns (order matters - check higher levels first)
        self.education_keywords = {
            'doctorate': ['phd', 'doctorate', 'doctoral', 'ed.d'],
            'master': ['master', 'ma', 'ms', 'mba', 'graduate'],
            'bachelor': ['bachelor', 'ba', 'bs', 'undergraduate'],
            'associate': ['associate', 'aa', 'as'],
            'high_school': ['high school', 'diploma', 'ged']
        }
    
    def infer_demographics(self, user_profile: UserProfile) -> Dict[str, Optional[str]]:
        """Infer demographic information from user profile"""
        demographics = {
            'gender': None,
            'age_group': None,
            'education_level': None,
            'experience_level': None
        }
        
        # Gender inference from name
        if user_profile.name:
            first_name = user_profile.name.split()[0].lower()
            if first_name in self.male_names:
                demographics['gender'] = 'male'
            elif first_name in self.female_names:
                demographics['gender'] = 'female'
        
        # Education level inference
        if user_profile.education:
            education_text = ' '.join([edu.degree.lower() for edu in user_profile.education])
            for level, keywords in self.education_keywords.items():
                if any(keyword in education_text for keyword in keywords):
                    demographics['education_level'] = level
                    break
        
        # Experience level inference
        if user_profile.work_experiences:
            total_years = len(user_profile.work_experiences) * 2  # Rough estimate
            if total_years <= 2:
                demographics['experience_level'] = 'entry'
            elif total_years <= 5:
                demographics['experience_level'] = 'mid'
            else:
                demographics['experience_level'] = 'senior'
        
        # Age group inference (very rough based on experience)
        if user_profile.work_experiences:
            exp_count = len(user_profile.work_experiences)
            if exp_count <= 1:
                demographics['age_group'] = 'young'  # 22-30
            elif exp_count <= 3:
                demographics['age_group'] = 'middle'  # 30-45
            else:
                demographics['age_group'] = 'older'  # 45+
        
        return demographics


class BiasDetector:
    """Detects bias in career recommendations"""
    
    def __init__(self):
        self.demographic_inference = DemographicInference()
        
        # Bias thresholds
        self.thresholds = {
            'demographic_parity': 0.1,  # Max 10% difference in positive rates
            'equal_opportunity': 0.1,   # Max 10% difference in true positive rates
            'salary_disparity': 0.15,   # Max 15% difference in average salaries
            'role_diversity': 0.2,      # Max 20% difference in role types
            'confidence_gap': 0.1       # Max 10% difference in confidence scores
        }
    
    def analyze_recommendations(self, user_profiles: List[UserProfile],
                              recommendations: List[List[CareerRecommendation]]) -> FairnessReport:
        """Analyze recommendations for bias across demographics"""
        
        # Pair profiles with their recommendations
        profile_recommendations = list(zip(user_profiles, recommendations))
        
        # Infer demographics for all users
        demographic_data = []
        for profile, user_recs in profile_recommendations:
            demographics = self.demographic_inference.infer_demographics(profile)
            demographic_data.append((profile, user_recs, demographics))
        
        # Calculate demographic statistics
        demographics_summary = self._calculate_demographic_summary(demographic_data)
        
        # Run bias detection tests
        bias_metrics = []
        
        # Test 1: Demographic Parity
        bias_metrics.extend(self._test_demographic_parity(demographic_data))
        
        # Test 2: Equal Opportunity
        bias_metrics.extend(self._test_equal_opportunity(demographic_data))
        
        # Test 3: Salary Disparity
        bias_metrics.extend(self._test_salary_disparity(demographic_data))
        
        # Test 4: Role Diversity
        bias_metrics.extend(self._test_role_diversity(demographic_data))
        
        # Test 5: Confidence Gap
        bias_metrics.extend(self._test_confidence_gap(demographic_data))
        
        # Calculate overall fairness score
        overall_score = self._calculate_overall_fairness_score(bias_metrics)
        
        # Generate recommendations
        recommendations_list = self._generate_fairness_recommendations(bias_metrics)
        
        return FairnessReport(
            report_id=f"fairness_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            generation_time=datetime.now(),
            total_recommendations=len(profile_recommendations),
            demographics_summary=demographics_summary,
            bias_metrics=bias_metrics,
            overall_fairness_score=overall_score,
            recommendations=recommendations_list,
            data_period="Current analysis"
        )
    
    def _calculate_demographic_summary(self, demographic_data: List[Tuple]) -> Dict[str, Dict[str, int]]:
        """Calculate summary statistics for demographics"""
        summary = defaultdict(lambda: defaultdict(int))
        
        for profile, recs, demographics in demographic_data:
            for attr, value in demographics.items():
                if value:
                    summary[attr][value] += 1
        
        return dict(summary)
    
    def _test_demographic_parity(self, demographic_data: List[Tuple]) -> List[BiasMetric]:
        """Test for demographic parity in recommendations"""
        metrics = []
        
        for protected_attr in ['gender', 'age_group', 'education_level']:
            # Group by protected attribute
            groups = defaultdict(list)
            for profile, recs, demographics in demographic_data:
                attr_value = demographics.get(protected_attr)
                if attr_value and recs:
                    # Calculate average match score for this user
                    avg_match = statistics.mean([rec.match_score for rec in recs[:3]])
                    groups[attr_value].append(avg_match)
            
            # Compare pairs of groups
            group_names = list(groups.keys())
            for i in range(len(group_names)):
                for j in range(i + 1, len(group_names)):
                    group1, group2 = group_names[i], group_names[j]
                    
                    if groups[group1] and groups[group2]:
                        avg1 = statistics.mean(groups[group1])
                        avg2 = statistics.mean(groups[group2])
                        
                        disparity = abs(avg1 - avg2)
                        is_biased = disparity > self.thresholds['demographic_parity']
                        
                        severity = 'high' if disparity > 0.2 else 'medium' if disparity > 0.1 else 'low'
                        
                        metrics.append(BiasMetric(
                            metric_name='demographic_parity',
                            protected_attribute=protected_attr,
                            reference_group=group1,
                            comparison_group=group2,
                            metric_value=disparity,
                            threshold=self.thresholds['demographic_parity'],
                            is_biased=is_biased,
                            severity=severity,
                            description=f'Average match score difference between {group1} and {group2}',
                            timestamp=datetime.now()
                        ))
        
        return metrics
    
    def _test_equal_opportunity(self, demographic_data: List[Tuple]) -> List[BiasMetric]:
        """Test for equal opportunity in high-quality recommendations"""
        metrics = []
        
        for protected_attr in ['gender', 'age_group']:
            # Group by protected attribute and find high-quality recommendations
            groups = defaultdict(list)
            for profile, recs, demographics in demographic_data:
                attr_value = demographics.get(protected_attr)
                if attr_value and recs:
                    # Count high-quality recommendations (confidence > 0.7)
                    high_quality = sum(1 for rec in recs if rec.confidence > 0.7)
                    total = len(recs)
                    if total > 0:
                        groups[attr_value].append(high_quality / total)
            
            # Compare groups
            group_names = list(groups.keys())
            for i in range(len(group_names)):
                for j in range(i + 1, len(group_names)):
                    group1, group2 = group_names[i], group_names[j]
                    
                    if groups[group1] and groups[group2]:
                        rate1 = statistics.mean(groups[group1])
                        rate2 = statistics.mean(groups[group2])
                        
                        disparity = abs(rate1 - rate2)
                        is_biased = disparity > self.thresholds['equal_opportunity']
                        
                        severity = 'high' if disparity > 0.2 else 'medium' if disparity > 0.1 else 'low'
                        
                        metrics.append(BiasMetric(
                            metric_name='equal_opportunity',
                            protected_attribute=protected_attr,
                            reference_group=group1,
                            comparison_group=group2,
                            metric_value=disparity,
                            threshold=self.thresholds['equal_opportunity'],
                            is_biased=is_biased,
                            severity=severity,
                            description=f'High-quality recommendation rate difference between {group1} and {group2}',
                            timestamp=datetime.now()
                        ))
        
        return metrics
    
    def _test_salary_disparity(self, demographic_data: List[Tuple]) -> List[BiasMetric]:
        """Test for salary disparity in recommendations"""
        metrics = []
        
        for protected_attr in ['gender', 'education_level']:
            # Group by protected attribute and collect salary data
            groups = defaultdict(list)
            for profile, recs, demographics in demographic_data:
                attr_value = demographics.get(protected_attr)
                if attr_value and recs:
                    # Get salary ranges from top recommendations
                    for rec in recs[:3]:
                        if rec.salary_range:
                            avg_salary = (rec.salary_range[0] + rec.salary_range[1]) / 2
                            groups[attr_value].append(avg_salary)
            
            # Compare groups
            group_names = list(groups.keys())
            for i in range(len(group_names)):
                for j in range(i + 1, len(group_names)):
                    group1, group2 = group_names[i], group_names[j]
                    
                    if groups[group1] and groups[group2]:
                        avg1 = statistics.mean(groups[group1])
                        avg2 = statistics.mean(groups[group2])
                        
                        if avg1 > 0 and avg2 > 0:
                            disparity = abs(avg1 - avg2) / max(avg1, avg2)
                            is_biased = disparity > self.thresholds['salary_disparity']
                            
                            severity = 'high' if disparity > 0.3 else 'medium' if disparity > 0.15 else 'low'
                            
                            metrics.append(BiasMetric(
                                metric_name='salary_disparity',
                                protected_attribute=protected_attr,
                                reference_group=group1,
                                comparison_group=group2,
                                metric_value=disparity,
                                threshold=self.thresholds['salary_disparity'],
                                is_biased=is_biased,
                                severity=severity,
                                description=f'Average salary difference between {group1} and {group2}',
                                timestamp=datetime.now()
                            ))
        
        return metrics
    
    def _test_role_diversity(self, demographic_data: List[Tuple]) -> List[BiasMetric]:
        """Test for diversity in recommended job roles"""
        metrics = []
        
        for protected_attr in ['gender', 'age_group']:
            # Group by protected attribute and collect job titles
            groups = defaultdict(list)
            for profile, recs, demographics in demographic_data:
                attr_value = demographics.get(protected_attr)
                if attr_value and recs:
                    job_titles = [rec.job.title for rec in recs[:5]]
                    groups[attr_value].extend(job_titles)
            
            # Compare diversity (unique job titles)
            group_names = list(groups.keys())
            for i in range(len(group_names)):
                for j in range(i + 1, len(group_names)):
                    group1, group2 = group_names[i], group_names[j]
                    
                    if groups[group1] and groups[group2]:
                        unique1 = len(set(groups[group1])) / len(groups[group1])
                        unique2 = len(set(groups[group2])) / len(groups[group2])
                        
                        disparity = abs(unique1 - unique2)
                        is_biased = disparity > self.thresholds['role_diversity']
                        
                        severity = 'high' if disparity > 0.4 else 'medium' if disparity > 0.2 else 'low'
                        
                        metrics.append(BiasMetric(
                            metric_name='role_diversity',
                            protected_attribute=protected_attr,
                            reference_group=group1,
                            comparison_group=group2,
                            metric_value=disparity,
                            threshold=self.thresholds['role_diversity'],
                            is_biased=is_biased,
                            severity=severity,
                            description=f'Job role diversity difference between {group1} and {group2}',
                            timestamp=datetime.now()
                        ))
        
        return metrics
    
    def _test_confidence_gap(self, demographic_data: List[Tuple]) -> List[BiasMetric]:
        """Test for confidence gaps in recommendations"""
        metrics = []
        
        for protected_attr in ['gender', 'education_level']:
            # Group by protected attribute and collect confidence scores
            groups = defaultdict(list)
            for profile, recs, demographics in demographic_data:
                attr_value = demographics.get(protected_attr)
                if attr_value and recs:
                    avg_confidence = statistics.mean([rec.confidence for rec in recs[:3]])
                    groups[attr_value].append(avg_confidence)
            
            # Compare groups
            group_names = list(groups.keys())
            for i in range(len(group_names)):
                for j in range(i + 1, len(group_names)):
                    group1, group2 = group_names[i], group_names[j]
                    
                    if groups[group1] and groups[group2]:
                        avg1 = statistics.mean(groups[group1])
                        avg2 = statistics.mean(groups[group2])
                        
                        disparity = abs(avg1 - avg2)
                        is_biased = disparity > self.thresholds['confidence_gap']
                        
                        severity = 'high' if disparity > 0.2 else 'medium' if disparity > 0.1 else 'low'
                        
                        metrics.append(BiasMetric(
                            metric_name='confidence_gap',
                            protected_attribute=protected_attr,
                            reference_group=group1,
                            comparison_group=group2,
                            metric_value=disparity,
                            threshold=self.thresholds['confidence_gap'],
                            is_biased=is_biased,
                            severity=severity,
                            description=f'Average confidence difference between {group1} and {group2}',
                            timestamp=datetime.now()
                        ))
        
        return metrics
    
    def _calculate_overall_fairness_score(self, bias_metrics: List[BiasMetric]) -> float:
        """Calculate overall fairness score (0.0 to 1.0)"""
        if not bias_metrics:
            return 1.0
        
        # Count biased metrics by severity
        high_bias = sum(1 for m in bias_metrics if m.is_biased and m.severity == 'high')
        medium_bias = sum(1 for m in bias_metrics if m.is_biased and m.severity == 'medium')
        low_bias = sum(1 for m in bias_metrics if m.is_biased and m.severity == 'low')
        
        # Calculate penalty
        penalty = (high_bias * 0.3) + (medium_bias * 0.2) + (low_bias * 0.1)
        
        # Normalize by total metrics
        max_penalty = len(bias_metrics) * 0.3
        if max_penalty > 0:
            penalty_ratio = penalty / max_penalty
        else:
            penalty_ratio = 0
        
        return max(0.0, 1.0 - penalty_ratio)
    
    def _generate_fairness_recommendations(self, bias_metrics: List[BiasMetric]) -> List[str]:
        """Generate recommendations to address bias"""
        recommendations = []
        
        # Group by bias type
        bias_by_type = defaultdict(list)
        for metric in bias_metrics:
            if metric.is_biased:
                bias_by_type[metric.metric_name].append(metric)
        
        # Generate specific recommendations
        if bias_by_type['demographic_parity']:
            recommendations.append(
                "Implement demographic parity constraints in recommendation scoring to ensure equal treatment across groups."
            )
        
        if bias_by_type['equal_opportunity']:
            recommendations.append(
                "Adjust recommendation thresholds to ensure equal opportunity for high-quality recommendations across demographics."
            )
        
        if bias_by_type['salary_disparity']:
            recommendations.append(
                "Review salary data sources and recommendation logic to address systematic salary disparities."
            )
        
        if bias_by_type['role_diversity']:
            recommendations.append(
                "Expand job role diversity by reducing stereotypical role associations and broadening search criteria."
            )
        
        if bias_by_type['confidence_gap']:
            recommendations.append(
                "Calibrate confidence scoring to ensure consistent confidence levels across demographic groups."
            )
        
        # General recommendations
        if any(m.severity == 'high' for m in bias_metrics):
            recommendations.append(
                "Implement immediate bias mitigation measures due to high-severity bias detection."
            )
        
        if not recommendations:
            recommendations.append(
                "Continue monitoring for bias and maintain current fairness standards."
            )
        
        return recommendations
    
    def monitor_single_recommendation(self, user_profile: UserProfile,
                                   recommendation: CareerRecommendation) -> Dict[str, Any]:
        """Monitor a single recommendation for potential bias indicators"""
        demographics = self.demographic_inference.infer_demographics(user_profile)
        
        # Check for potential bias indicators
        bias_indicators = {}
        
        # Check for stereotypical role associations
        if demographics.get('gender') == 'female':
            typically_male_roles = ['engineer', 'developer', 'architect', 'cto', 'ceo']
            if any(role in recommendation.job.title.lower() for role in typically_male_roles):
                bias_indicators['gender_stereotype'] = False  # Good - breaking stereotypes
            else:
                bias_indicators['gender_stereotype'] = True  # Potential stereotype reinforcement
        
        # Check confidence levels
        if recommendation.confidence < 0.5:
            bias_indicators['low_confidence'] = True
        
        # Check salary fairness
        if recommendation.salary_range:
            avg_salary = (recommendation.salary_range[0] + recommendation.salary_range[1]) / 2
            if avg_salary < 50000:
                bias_indicators['low_salary'] = True
        
        return {
            'user_demographics': demographics,
            'recommendation_title': recommendation.job.title,
            'confidence': recommendation.confidence,
            'bias_indicators': bias_indicators,
            'monitoring_timestamp': datetime.now()
        }