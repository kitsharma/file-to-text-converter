# src/services/career_recommender.py
import os
import json
import requests
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging

from src.models.user_profile import UserProfile
from src.models.skill_ontology import SkillOntology, Job
from src.services.skill_matcher import SkillMatcher, JobMatch
from src.integrations.bls_integration import BLSIntegration, JobProjection
from src.integrations.onet_integration import ONETIntegration

logger = logging.getLogger(__name__)


@dataclass
class MarketValidation:
    """Validation of job market data from Perplexity"""
    query: str
    response: str
    sources: List[str]
    confidence: float  # 0.0 to 1.0
    is_current: bool
    last_updated: datetime


@dataclass
class CareerRecommendation:
    """Complete career recommendation with explanations"""
    job: Job
    match_score: float  # 0.0 to 1.0
    skill_match: JobMatch
    market_data: Optional[JobProjection]
    market_validation: Optional[MarketValidation]
    explanation: str
    confidence: float  # 0.0 to 1.0
    recommended_actions: List[str]
    salary_range: Optional[Tuple[int, int]]
    growth_outlook: str  # 'excellent', 'good', 'fair', 'poor'


class PerplexityValidator:
    """Service for validating job market data using Perplexity API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('PERPLEXITY_API_KEY')
        self.base_url = "https://api.perplexity.ai/chat/completions"
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        })
        
        # Cache for validation results
        self._cache: Dict[str, MarketValidation] = {}
    
    def validate_job_outlook(self, occupation_title: str, 
                           bls_projection: Optional[JobProjection] = None) -> MarketValidation:
        """Validate job outlook using current market data"""
        cache_key = f"outlook_{occupation_title.lower().replace(' ', '_')}"
        
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            # Use cache if less than 24 hours old
            if (datetime.now() - cached.last_updated).total_seconds() < 86400:
                return cached
        
        # Construct query for Perplexity
        query = f"""What is the current job market outlook for {occupation_title} in 2024-2025? 
        Please provide:
        1. Current employment growth rate and projections
        2. Average salary ranges
        3. In-demand skills and requirements
        4. Industry trends affecting this role
        
        Please cite reliable sources like Bureau of Labor Statistics, industry reports, or recent job market studies."""
        
        if bls_projection:
            query += f"\n\nNote: BLS projects {bls_projection.change_percent}% growth and median wage of ${bls_projection.median_annual_wage}. Please validate or update this data."
        
        try:
            response = self.session.post(self.base_url, json={
                'model': 'llama-3.1-sonar-small-128k-online',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a career analyst providing factual, current job market information. Always cite your sources and indicate when data is from reliable government or industry sources.'
                    },
                    {
                        'role': 'user',
                        'content': query
                    }
                ],
                'max_tokens': 1000,
                'temperature': 0.2,
                'return_citations': True
            }, timeout=30)
            
            response.raise_for_status()
            data = response.json()
            
            content = data['choices'][0]['message']['content']
            citations = data.get('citations', [])
            
            # Extract sources from citations
            sources = []
            for citation in citations:
                if 'url' in citation:
                    sources.append(citation['url'])
                elif 'title' in citation:
                    sources.append(citation['title'])
            
            # Determine confidence based on source quality
            confidence = self._assess_source_confidence(sources, content)
            
            # Check if data appears current (mentions 2024/2025)
            is_current = any(year in content for year in ['2024', '2025']) and len(sources) > 0
            
            validation = MarketValidation(
                query=query,
                response=content,
                sources=sources,
                confidence=confidence,
                is_current=is_current,
                last_updated=datetime.now()
            )
            
            self._cache[cache_key] = validation
            return validation
            
        except Exception as e:
            logger.error(f"Error validating job outlook via Perplexity: {e}")
            
            # Return low-confidence validation on error
            return MarketValidation(
                query=query,
                response=f"Unable to validate current market data: {str(e)}",
                sources=[],
                confidence=0.1,
                is_current=False,
                last_updated=datetime.now()
            )
    
    def _assess_source_confidence(self, sources: List[str], content: str) -> float:
        """Assess confidence based on source quality"""
        confidence = 0.3  # Base confidence
        
        # High-quality sources
        high_quality = ['bls.gov', 'bureau of labor statistics', 'indeed.com', 
                       'glassdoor.com', 'linkedin.com', 'payscale.com']
        
        # Government and official sources
        gov_sources = ['bls.gov', '.gov', 'bureau of labor statistics', 
                      'department of labor', 'onet']
        
        # Industry sources
        industry_sources = ['mckinsey', 'deloitte', 'pwc', 'forbes', 
                          'harvard business review', 'mit']
        
        source_text = ' '.join(sources).lower() + ' ' + content.lower()
        
        # Boost confidence for quality sources
        if any(source in source_text for source in gov_sources):
            confidence += 0.4  # Government sources are highly reliable
        
        if any(source in source_text for source in high_quality):
            confidence += 0.2
        
        if any(source in source_text for source in industry_sources):
            confidence += 0.1
        
        # Boost for multiple sources
        if len(sources) >= 3:
            confidence += 0.1
        elif len(sources) >= 2:
            confidence += 0.05
        
        # Reduce confidence if no sources
        if not sources:
            confidence = max(0.1, confidence - 0.3)
        
        return min(1.0, confidence)


class CareerRecommendationEngine:
    """Main career recommendation engine"""
    
    def __init__(self, ontology: SkillOntology, skill_matcher: SkillMatcher,
                 bls_integration: BLSIntegration, onet_integration: ONETIntegration,
                 perplexity_validator: Optional[PerplexityValidator] = None):
        self.ontology = ontology
        self.skill_matcher = skill_matcher
        self.bls = bls_integration
        self.onet = onet_integration
        self.validator = perplexity_validator or PerplexityValidator()
    
    def get_career_recommendations(self, user_profile: UserProfile, 
                                 limit: int = 10, 
                                 validate_with_perplexity: bool = True) -> List[CareerRecommendation]:
        """Generate comprehensive career recommendations"""
        
        # Step 1: Find matching jobs based on user skills
        skill_matches = self.skill_matcher.match_user_skills(
            [skill.skill_id for skill in user_profile.skills]
        )
        
        job_matches = self.skill_matcher.find_matching_jobs(skill_matches, min_match_score=0.3)
        
        # Step 2: Enrich with BLS market data
        recommendations = []
        
        for job_match in job_matches[:limit * 2]:  # Get extra to filter
            job = job_match.job
            
            # Get BLS projection data
            bls_projection = None
            if hasattr(job, 'onet_code') and job.onet_code:
                bls_projection = self.bls.get_occupation_outlook(job.onet_code)
            
            # Step 3: Validate with Perplexity if enabled
            market_validation = None
            if validate_with_perplexity:
                try:
                    market_validation = self.validator.validate_job_outlook(
                        job.title, bls_projection
                    )
                except Exception as e:
                    logger.warning(f"Perplexity validation failed for {job.title}: {e}")
            
            # Step 4: Calculate overall recommendation score
            recommendation = self._create_recommendation(
                job, job_match, bls_projection, market_validation
            )
            
            recommendations.append(recommendation)
        
        # Sort by confidence and match score
        recommendations.sort(key=lambda r: (r.confidence, r.match_score), reverse=True)
        
        return recommendations[:limit]
    
    def _create_recommendation(self, job: Job, job_match: JobMatch,
                             bls_projection: Optional[JobProjection],
                             market_validation: Optional[MarketValidation]) -> CareerRecommendation:
        """Create a comprehensive career recommendation"""
        
        # Calculate base confidence from skill match
        base_confidence = job_match.match_score
        
        # Adjust confidence based on market data
        market_confidence = 0.5  # Neutral if no data
        
        if bls_projection:
            if bls_projection.change_percent and bls_projection.change_percent > 0:
                market_confidence = min(0.9, 0.5 + (bls_projection.change_percent / 50))
            elif bls_projection.change_percent and bls_projection.change_percent < 0:
                market_confidence = max(0.1, 0.5 + (bls_projection.change_percent / 100))
        
        # Further adjust with Perplexity validation
        if market_validation:
            if market_validation.confidence > 0.7 and market_validation.is_current:
                market_confidence = min(0.95, market_confidence + 0.2)
            elif market_validation.confidence < 0.4:
                market_confidence = max(0.2, market_confidence - 0.2)
        
        # Overall confidence
        overall_confidence = (base_confidence * 0.6) + (market_confidence * 0.4)
        
        # Generate explanation
        explanation = self._generate_explanation(
            job, job_match, bls_projection, market_validation
        )
        
        # Generate recommended actions
        recommended_actions = self._generate_actions(job_match, bls_projection)
        
        # Determine salary range
        salary_range = self._determine_salary_range(bls_projection, market_validation)
        
        # Determine growth outlook
        growth_outlook = self._determine_growth_outlook(bls_projection, market_validation)
        
        return CareerRecommendation(
            job=job,
            match_score=job_match.match_score,
            skill_match=job_match,
            market_data=bls_projection,
            market_validation=market_validation,
            explanation=explanation,
            confidence=overall_confidence,
            recommended_actions=recommended_actions,
            salary_range=salary_range,
            growth_outlook=growth_outlook
        )
    
    def _generate_explanation(self, job: Job, job_match: JobMatch,
                            bls_projection: Optional[JobProjection],
                            market_validation: Optional[MarketValidation]) -> str:
        """Generate human-readable explanation for recommendation"""
        
        explanation_parts = []
        
        # Skill match explanation
        match_pct = int(job_match.match_score * 100)
        matched_skills = [m.matched_skill.name for m in job_match.matched_skills]
        
        explanation_parts.append(
            f"You have a {match_pct}% skill match for {job.title}. "
            f"Your matching skills include: {', '.join(matched_skills[:3])}."
        )
        
        # Missing skills
        if job_match.missing_skills:
            explanation_parts.append(
                f"To strengthen your candidacy, consider developing: {', '.join(job_match.missing_skills[:3])}."
            )
        
        # Market outlook
        if bls_projection:
            if bls_projection.change_percent > 10:
                explanation_parts.append(
                    f"This field shows strong growth potential with {bls_projection.change_percent}% projected growth."
                )
            elif bls_projection.change_percent > 0:
                explanation_parts.append(
                    f"This field shows moderate growth with {bls_projection.change_percent}% projected growth."
                )
            else:
                explanation_parts.append(
                    f"This field faces challenges with {bls_projection.change_percent}% projected change. "
                    "Consider specialized skills to remain competitive."
                )
        
        # Perplexity validation insights
        if market_validation and market_validation.confidence > 0.6:
            if market_validation.is_current:
                explanation_parts.append(
                    "Current market data confirms strong demand for this role."
                )
            else:
                explanation_parts.append(
                    "Market validation indicates stable demand for this role."
                )
        
        return " ".join(explanation_parts)
    
    def _generate_actions(self, job_match: JobMatch, 
                         bls_projection: Optional[JobProjection]) -> List[str]:
        """Generate recommended actions for the user"""
        actions = []
        
        # Skill development actions
        if job_match.missing_skills:
            for skill in job_match.missing_skills[:3]:
                actions.append(f"Learn {skill} through online courses or certification")
        
        # Experience building
        if job_match.transferable_skills:
            actions.append("Highlight transferable skills in your resume and interviews")
        
        # Market-specific actions
        if bls_projection:
            if bls_projection.typical_education:
                actions.append(f"Consider {bls_projection.typical_education.lower()} if not already completed")
        
        # General actions
        actions.extend([
            "Build a portfolio showcasing relevant projects",
            "Network with professionals in this field",
            "Apply to entry-level positions to gain experience"
        ])
        
        return actions[:5]  # Limit to 5 actions
    
    def _determine_salary_range(self, bls_projection: Optional[JobProjection],
                               market_validation: Optional[MarketValidation]) -> Optional[Tuple[int, int]]:
        """Determine salary range from available data"""
        if bls_projection and bls_projection.median_annual_wage:
            median = bls_projection.median_annual_wage
            # Estimate range as ±25% of median
            low = int(median * 0.75)
            high = int(median * 1.25)
            return (low, high)
        
        return None
    
    def _determine_growth_outlook(self, bls_projection: Optional[JobProjection],
                                market_validation: Optional[MarketValidation]) -> str:
        """Determine growth outlook rating"""
        if bls_projection and bls_projection.change_percent:
            growth = bls_projection.change_percent
            
            if growth >= 15:
                return "excellent"
            elif growth >= 7:
                return "good"
            elif growth >= 0:
                return "fair"
            else:
                return "poor"
        
        # Default if no data
        return "fair"
    
    def get_trending_careers(self, limit: int = 10) -> List[CareerRecommendation]:
        """Get trending careers regardless of user profile"""
        fastest_growing = self.bls.get_fastest_growing_occupations(limit * 2)
        
        trending = []
        for projection in fastest_growing:
            # Create a basic job object for trending careers
            job = Job(
                id=f"trending_{projection.occupation_code}",
                title=projection.occupation_title,
                description=f"Growing career in {projection.occupation_title.lower()}",
                onet_code=projection.occupation_code
            )
            
            # Create basic job match (no user skills)
            from src.services.skill_matcher import JobMatch
            job_match = JobMatch(
                job=job,
                match_score=0.5,  # Neutral since no user profile
                matched_skills=[],
                missing_skills=[],
                transferable_skills=[]
            )
            
            # Get market validation
            market_validation = self.validator.validate_job_outlook(
                projection.occupation_title, projection
            )
            
            recommendation = self._create_recommendation(
                job, job_match, projection, market_validation
            )
            
            trending.append(recommendation)
        
        return trending[:limit]