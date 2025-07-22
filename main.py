#!/usr/bin/env python3
"""
FastAPI server for Career Resilience Platform
Integrates all backend services with the web interface
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import uvicorn
import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our backend services
from src.models.user_profile import UserProfile
from src.models.skill_ontology import SkillOntology, UserSkill, ProficiencyLevel
from src.services.skill_matcher import SkillMatcher
from src.services.career_recommender import CareerRecommendationEngine
from src.services.learning_path_generator import LearningPathGenerator, SkillGapAnalyzer
from src.services.bias_monitor import BiasDetector
from src.integrations.onet_integration import ONETIntegration
from src.integrations.bls_integration import BLSIntegration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Career Resilience Platform API",
    description="AI-powered career transition platform with bias monitoring",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files in the correct order (specific routes first)
try:
    if os.path.exists("src"):
        app.mount("/src", StaticFiles(directory="src"), name="src")
    if os.path.exists("assets"):
        app.mount("/assets", StaticFiles(directory="assets"), name="assets")
    if os.path.exists("public/js"):
        app.mount("/js", StaticFiles(directory="public/js"), name="js")
    if os.path.exists("public/css"):
        app.mount("/css", StaticFiles(directory="public/css"), name="css")
    # Add data directory for CSV files
    if os.path.exists("assets/data"):
        app.mount("/data", StaticFiles(directory="assets/data"), name="data")
    # Mount public directory for HTML files (must be last to avoid conflicts)
    if os.path.exists("public"):
        app.mount("/public", StaticFiles(directory="public"), name="public")
except Exception as e:
    logger.warning(f"Some static directories not found: {e}")

# Initialize services
skill_ontology = SkillOntology()
onet_integration = ONETIntegration()
skill_matcher = SkillMatcher(skill_ontology, onet_integration)
bls_integration = BLSIntegration()
career_engine = CareerRecommendationEngine(skill_ontology, skill_matcher, bls_integration, onet_integration)
skill_gap_analyzer = SkillGapAnalyzer()
learning_path_generator = LearningPathGenerator(skill_gap_analyzer)
bias_detector = BiasDetector()

# Request/Response Models
class SkillAnalysisRequest(BaseModel):
    skills: List[str]
    experience_level: Optional[str] = "intermediate"

class CareerRecommendationRequest(BaseModel):
    user_profile: Dict[str, Any]
    target_roles: Optional[List[str]] = None
    location: Optional[str] = None

class LearningPathRequest(BaseModel):
    user_profile: Dict[str, Any]
    target_job: str
    weekly_hours: Optional[int] = 10

class BiasAnalysisRequest(BaseModel):
    user_profiles: List[Dict[str, Any]]
    recommendations: List[List[Dict[str, Any]]]

# Serve the main HTML page
@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serve the main application page"""
    try:
        with open("public/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200, media_type="text/html; charset=utf-8")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Index file not found")

@app.get("/test-minimal.html", response_class=HTMLResponse)
async def read_test_minimal():
    """Serve the test minimal page"""
    try:
        with open("public/test-minimal.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200, media_type="text/html; charset=utf-8")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Test page not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/skills/analyze")
async def analyze_skills(request: SkillAnalysisRequest):
    """Analyze skills and find matches in ontology"""
    try:
        # Convert skills to UserSkill objects
        user_skills = []
        for skill_name in request.skills:
            # Map experience level to proficiency
            proficiency_map = {
                "beginner": ProficiencyLevel.BEGINNER,
                "intermediate": ProficiencyLevel.INTERMEDIATE,
                "advanced": ProficiencyLevel.ADVANCED,
                "expert": ProficiencyLevel.EXPERT
            }
            proficiency = proficiency_map.get(request.experience_level, ProficiencyLevel.INTERMEDIATE)
            user_skills.append(UserSkill(skill_name.lower().replace(" ", "_"), proficiency))
        
        # Find skill matches
        skill_matches = skill_matcher.match_user_skills(request.skills)
        
        # Find matching jobs
        job_matches = skill_matcher.find_matching_jobs(skill_matches)
        
        return {
            "skill_matches": [
                {
                    "original_skill": match.original_skill,
                    "matched_skill_id": match.matched_skill.id if match.matched_skill else None,
                    "match_type": match.match_type,
                    "confidence": match.confidence,
                    "synonyms": match.synonyms
                }
                for match in skill_matches
            ],
            "job_matches": [
                {
                    "job_id": match.job.id,
                    "job_title": match.job.title,
                    "match_score": match.match_score,
                    "matched_skills": [skill.skill_id for skill in match.matched_skills],
                    "missing_skills": match.missing_skills,
                    "transferable_skills": match.transferable_skills
                }
                for match in job_matches[:10]  # Limit to top 10
            ]
        }
    except Exception as e:
        logger.error(f"Error analyzing skills: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/career/recommendations")
async def get_career_recommendations(request: CareerRecommendationRequest):
    """Get career recommendations based on user profile"""
    try:
        # Create user profile from request data
        user_profile = UserProfile(
            user_id=request.user_profile.get("user_id", "temp_user"),
            name=request.user_profile.get("name"),
            email=request.user_profile.get("email"),
            skills=[
                UserSkill(skill["skill_id"], ProficiencyLevel(skill["proficiency_level"]))
                for skill in request.user_profile.get("skills", [])
            ]
        )
        
        # Get recommendations
        recommendations = await career_engine.get_recommendations(
            user_profile,
            max_recommendations=10,
            location=request.location
        )
        
        return {
            "recommendations": [
                {
                    "job_title": rec.job.title,
                    "job_description": rec.job.description,
                    "match_score": rec.match_score,
                    "confidence": rec.confidence,
                    "explanation": rec.explanation,
                    "salary_range": rec.salary_range,
                    "growth_outlook": rec.growth_outlook,
                    "required_skills": [
                        skill.skill_id for skill in rec.job.required_skills
                    ],
                    "recommended_actions": rec.recommended_actions
                }
                for rec in recommendations
            ]
        }
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.post("/api/learning/path")
async def generate_learning_path(request: LearningPathRequest):
    """Generate learning path for career transition"""
    try:
        # Create user profile
        user_profile = UserProfile(
            user_id=request.user_profile.get("user_id", "temp_user"),
            skills=[
                UserSkill(skill["skill_id"], ProficiencyLevel(skill["proficiency_level"]))
                for skill in request.user_profile.get("skills", [])
            ]
        )
        
        # Find target job in ontology
        target_jobs = skill_ontology.search_jobs(request.target_job)
        if not target_jobs:
            raise HTTPException(status_code=404, detail="Target job not found")
        
        target_job = target_jobs[0]
        
        # Create mock recommendation for learning path generation
        from src.services.career_recommender import CareerRecommendation
        from src.services.skill_matcher import JobMatch
        
        job_match = JobMatch(target_job, 0.7, [], [], [])
        recommendation = CareerRecommendation(
            job=target_job,
            match_score=0.7,
            skill_match=job_match,
            market_data=None,
            market_validation=None,
            explanation="Target role for learning path",
            confidence=0.8,
            recommended_actions=[],
            salary_range=None,
            growth_outlook="good"
        )
        
        # Generate learning path
        learning_path = learning_path_generator.generate_learning_path(
            user_profile, recommendation
        )
        
        # Estimate completion date
        completion_date = learning_path_generator.estimate_completion_date(
            learning_path, request.weekly_hours
        )
        
        return {
            "target_job_title": learning_path.target_job_title,
            "total_estimated_weeks": learning_path.total_estimated_weeks,
            "estimated_cost": learning_path.estimated_cost,
            "difficulty_level": learning_path.difficulty_level,
            "completion_date": completion_date.isoformat(),
            "priority_skills": learning_path.priority_skills,
            "optional_skills": learning_path.optional_skills,
            "milestones": [
                {
                    "skill_name": milestone.skill_name,
                    "target_level": milestone.target_level.value,
                    "estimated_weeks": milestone.estimated_weeks,
                    "prerequisites": milestone.prerequisites,
                    "validation_method": milestone.validation_method,
                    "resources": [
                        {
                            "title": resource.title,
                            "provider": resource.provider,
                            "url": resource.url,
                            "type": resource.resource_type,
                            "difficulty": resource.difficulty,
                            "estimated_hours": resource.estimated_hours,
                            "cost": resource.cost,
                            "rating": resource.rating
                        }
                        for resource in milestone.resources
                    ]
                }
                for milestone in learning_path.milestones
            ]
        }
    except Exception as e:
        logger.error(f"Error generating learning path: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Learning path generation failed: {str(e)}")

@app.post("/api/bias/analyze")
async def analyze_bias(request: BiasAnalysisRequest):
    """Analyze recommendations for bias"""
    try:
        # Convert request data to proper objects
        profiles = []
        recommendations = []
        
        for profile_data in request.user_profiles:
            profile = UserProfile(
                user_id=profile_data.get("user_id", "temp"),
                name=profile_data.get("name"),
                skills=[
                    UserSkill(skill["skill_id"], ProficiencyLevel(skill["proficiency_level"]))
                    for skill in profile_data.get("skills", [])
                ]
            )
            profiles.append(profile)
        
        # Convert recommendations (simplified for this example)
        for rec_list in request.recommendations:
            profile_recs = []
            for rec_data in rec_list:
                # Create mock recommendation objects
                from src.models.skill_ontology import Job
                from src.services.career_recommender import CareerRecommendation
                from src.services.skill_matcher import JobMatch
                
                job = Job(
                    rec_data.get("job_id", "temp"),
                    rec_data.get("job_title", "Unknown"),
                    rec_data.get("job_description", "")
                )
                
                job_match = JobMatch(job, rec_data.get("match_score", 0.5), [], [], [])
                
                recommendation = CareerRecommendation(
                    job=job,
                    match_score=rec_data.get("match_score", 0.5),
                    skill_match=job_match,
                    market_data=None,
                    market_validation=None,
                    explanation=rec_data.get("explanation", ""),
                    confidence=rec_data.get("confidence", 0.5),
                    recommended_actions=[],
                    salary_range=rec_data.get("salary_range"),
                    growth_outlook=rec_data.get("growth_outlook", "fair")
                )
                profile_recs.append(recommendation)
            recommendations.append(profile_recs)
        
        # Analyze bias
        fairness_report = bias_detector.analyze_recommendations(profiles, recommendations)
        
        return {
            "report_id": fairness_report.report_id,
            "generation_time": fairness_report.generation_time.isoformat(),
            "total_recommendations": fairness_report.total_recommendations,
            "overall_fairness_score": fairness_report.overall_fairness_score,
            "demographics_summary": fairness_report.demographics_summary,
            "bias_metrics": [
                {
                    "metric_name": metric.metric_name,
                    "protected_attribute": metric.protected_attribute,
                    "reference_group": metric.reference_group,
                    "comparison_group": metric.comparison_group,
                    "metric_value": metric.metric_value,
                    "threshold": metric.threshold,
                    "is_biased": metric.is_biased,
                    "severity": metric.severity,
                    "description": metric.description
                }
                for metric in fairness_report.bias_metrics
            ],
            "recommendations": fairness_report.recommendations
        }
    except Exception as e:
        logger.error(f"Error analyzing bias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bias analysis failed: {str(e)}")

@app.get("/api/onet/skills")
async def get_onet_skills(search: Optional[str] = None, limit: int = 50):
    """Get O*NET skills data"""
    try:
        skills = skill_ontology.get_all_skills()
        
        if search:
            # Filter skills by search term
            search_lower = search.lower()
            skills = [
                skill for skill in skills 
                if search_lower in skill.id.lower() or 
                (hasattr(skill, 'name') and search_lower in skill.name.lower())
            ]
        
        return {
            "skills": [
                {
                    "id": skill.id,
                    "name": getattr(skill, 'name', skill.id),
                    "category": getattr(skill, 'category', 'unknown'),
                    "importance": getattr(skill, 'importance', 0.5)
                }
                for skill in skills[:limit]
            ],
            "total": len(skills)
        }
    except Exception as e:
        logger.error(f"Error getting O*NET skills: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get skills: {str(e)}")

@app.get("/api/bls/occupations")
async def get_bls_occupations(search: Optional[str] = None):
    """Get BLS occupation data"""
    try:
        # Get sample occupation data
        occupations = [
            {
                "code": "15-1254",
                "title": "Web Developers",
                "employment": 199400,
                "growth_rate": 13.0,
                "median_wage": 77200
            },
            {
                "code": "15-1256",
                "title": "Software Developers and Software Quality Assurance Analysts and Testers",
                "employment": 1847900,
                "growth_rate": 22.0,
                "median_wage": 110140
            },
            {
                "code": "15-1244",
                "title": "Network and Computer Systems Administrators",
                "employment": 350300,
                "growth_rate": 5.0,
                "median_wage": 84810
            }
        ]
        
        if search:
            search_lower = search.lower()
            occupations = [
                occ for occ in occupations
                if search_lower in occ["title"].lower()
            ]
        
        return {"occupations": occupations}
    except Exception as e:
        logger.error(f"Error getting BLS data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get occupation data: {str(e)}")

# Background task for loading data
async def load_initial_data():
    """Load initial skill ontology and job data"""
    try:
        logger.info("Loading initial data...")
        
        # Load some basic skills and jobs
        from src.models.skill_ontology import Skill, SkillType
        
        skill_ontology.add_skill(Skill("python", "Python Programming", "Python programming language", SkillType.TECHNICAL))
        skill_ontology.add_skill(Skill("javascript", "JavaScript", "JavaScript programming language", SkillType.TECHNICAL))
        skill_ontology.add_skill(Skill("machine_learning", "Machine Learning", "Machine learning and AI", SkillType.TECHNICAL))
        skill_ontology.add_skill(Skill("sql", "SQL", "Structured Query Language", SkillType.TECHNICAL))
        skill_ontology.add_skill(Skill("communication", "Communication", "Communication skills", SkillType.SOFT))
        
        # Add sample jobs
        from src.models.skill_ontology import Job, SkillRequirement
        
        data_scientist_job = Job(
            id="data_scientist",
            title="Data Scientist",
            description="Analyze data and build predictive models",
            required_skills=[
                SkillRequirement("python", 0.9, ProficiencyLevel.ADVANCED, True),
                SkillRequirement("machine_learning", 0.8, ProficiencyLevel.INTERMEDIATE, True),
                SkillRequirement("sql", 0.7, ProficiencyLevel.INTERMEDIATE, True),
                SkillRequirement("communication", 0.6, ProficiencyLevel.INTERMEDIATE, False)
            ]
        )
        
        web_developer_job = Job(
            id="web_developer",
            title="Web Developer", 
            description="Build and maintain websites and web applications",
            required_skills=[
                SkillRequirement("javascript", 0.9, ProficiencyLevel.ADVANCED, True),
                SkillRequirement("python", 0.6, ProficiencyLevel.INTERMEDIATE, False),
                SkillRequirement("sql", 0.5, ProficiencyLevel.BEGINNER, False),
                SkillRequirement("communication", 0.7, ProficiencyLevel.INTERMEDIATE, False)
            ]
        )
        
        skill_ontology.add_job(data_scientist_job)
        skill_ontology.add_job(web_developer_job)
        
        logger.info("Initial data loaded successfully")
        
    except Exception as e:
        logger.error(f"Error loading initial data: {str(e)}")


# Job Search Integration
class JobSearchRequest(BaseModel):
    resumeText: str

@app.post("/api/jobs/search")
async def search_jobs(request: JobSearchRequest):
    """
    Search for AI-enhanced job opportunities based on resume text
    """
    try:
        import os
        import requests
        import json
        import re
        
        # Input validation and sanitization
        resume_text = request.resumeText.strip()
        if not resume_text:
            raise HTTPException(status_code=400, detail="Resume text is required")
        
        if len(resume_text) > 10000:  # Limit input size
            resume_text = resume_text[:10000]
        
        # Remove potential PII patterns (basic sanitization)
        # Remove email addresses
        resume_text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', resume_text)
        # Remove phone numbers
        resume_text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', resume_text)
        # Remove SSN patterns
        resume_text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', resume_text)
        
        logger.info(f"Job search request received, text length: {len(resume_text)}")
        
        # Extract basic skills (simplified version)
        skills = []
        skill_patterns = [
            'Project Management', 'Microsoft Office', 'Administrative', 'Executive Support',
            'Calendar Management', 'Communication', 'Leadership', 'Training', 'Marketing',
            'Python', 'JavaScript', 'React', 'Node.js', 'AI', 'Machine Learning'
        ]
        
        for skill in skill_patterns:
            if skill.lower() in resume_text.lower():
                skills.append({'canonical': skill, 'id': None})
        
        if not skills:
            skills = [{'canonical': 'General Professional', 'id': None}]
        
        logger.info(f"Extracted skills: {[s['canonical'] for s in skills]}")
        
        # Enhanced role extraction from resume text
        role_patterns = [
            r'(?i)(?:administrative\s+assistant|admin\s+assistant|executive\s+assistant)',
            r'(?i)(?:coordinator|manager|director|supervisor|specialist)',
            r'(?i)(?:analyst|officer|representative|support)',
            r'(?i)(?:secretary|clerk|aide)'
        ]
        
        extracted_roles = []
        for pattern in role_patterns:
            import re
            matches = re.findall(pattern, resume_text)
            extracted_roles.extend(matches)
        
        # Determine primary role - prefer extracted roles over skills
        if extracted_roles:
            primary_role = extracted_roles[0].title()
        elif 'Administrative' in [s['canonical'] for s in skills]:
            primary_role = 'Administrative Assistant'
        else:
            primary_role = skills[0]['canonical'] if skills else 'Professional'
        
        # Query Perplexity API
        perplexity_api_key = os.getenv('PERPLEXITY_API_KEY')
        logger.info(f"API key loaded: {perplexity_api_key[:15] if perplexity_api_key else 'None'}...")
        if not perplexity_api_key or perplexity_api_key == 'your_perplexity_api_key_here':
            logger.error("PERPLEXITY_API_KEY not configured")
            raise HTTPException(
                status_code=503, 
                detail="Job search service unavailable. Please configure PERPLEXITY_API_KEY in .env file."
            )
        
        # Build skills list string
        skills_list = ", ".join([s['canonical'] for s in skills[:10]])  # Limit to top 10 skills
        
        # SIMPLIFIED prompt to test JSON parsing without timeouts
        system_prompt = '''Find 3-5 REAL, ACTIVE job postings for "''' + primary_role + '''" with skills "''' + skills_list + '''" in San Jose, CA that use AI tools. 

CRITICAL: Include direct links to actual job postings that are currently accepting applications.

Return ONLY this JSON structure:
{
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name", 
      "location": "Location",
      "description": "Brief description",
      "link": "Direct URL to active job posting",
      "aiSkillsTools": ["AI Tool 1", "AI Tool 2"]
    }
  ]
}'''
        
        # Build query with simple execution instruction
        query = "Please execute the job search using the criteria specified in your instructions."
        
        try:
            perplexity_response = requests.post(
                'https://api.perplexity.ai/chat/completions',
                json={
                    'model': 'sonar-pro',
                    'messages': [
                        {
                            'role': 'system',
                            'content': system_prompt
                        },
                        {
                            'role': 'user',
                            'content': query
                        }
                    ],
                    'temperature': 0.1,
                    'max_tokens': 2000
                },
                headers={
                    'Authorization': f'Bearer {perplexity_api_key}',
                    'Content-Type': 'application/json'
                },
                timeout=60
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"Perplexity API request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Job search API connection failed: {str(e)}")
        
        if perplexity_response.status_code == 401:
            logger.error("Perplexity API authentication failed - invalid or expired API key")
            raise HTTPException(
                status_code=401,
                detail="Perplexity API authentication failed. Please check your PERPLEXITY_API_KEY."
            )
        elif perplexity_response.status_code != 200:
            logger.error(f"Perplexity API error: {perplexity_response.status_code} - {perplexity_response.text}")
            raise HTTPException(status_code=500, detail=f"External job search API error: {perplexity_response.status_code}")
        
        response_data = perplexity_response.json()
        content = response_data['choices'][0]['message']['content']
        
        # Parse job listings from response
        job_listings = []
        analysis_text = ""
        logger.info(f"Response content length: {len(content)} characters")
        logger.info(f"First 100 chars: {repr(content[:100])}")
        logger.info(f"Last 100 chars: {repr(content[-100:])}")
        
        try:
            # First check for JSON in code blocks
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            if json_match:
                logger.info("Found JSON in code block")
                json_str = json_match.group(1)
            else:
                # Find JSON boundaries using bracket counting (Kristina's method)
                json_start = content.find('{')
                if json_start == -1:
                    raise ValueError("No JSON found in response")
                
                logger.info(f"JSON starts at position {json_start}")
                
                # Count brackets to find matching closing brace
                bracket_count = 0
                json_end = json_start
                
                for i in range(json_start, len(content)):
                    char = content[i]
                    if char == '{':
                        bracket_count += 1
                    elif char == '}':
                        bracket_count -= 1
                        if bracket_count == 0:
                            json_end = i + 1
                            break
                
                # Extract ONLY the JSON
                json_str = content[json_start:json_end]
                logger.info(f"Extracted JSON from positions {json_start} to {json_end} ({json_end - json_start} chars)")
            
            # Parse the extracted JSON
            parsed_data = json.loads(json_str)
            
            # Extract jobs and analysis
            if isinstance(parsed_data, dict) and 'jobs' in parsed_data:
                job_listings = parsed_data['jobs']
                analysis_text = parsed_data.get('analysis', '')
                logger.info(f"Successfully parsed {len(job_listings)} jobs from response")
            elif isinstance(parsed_data, list):
                job_listings = parsed_data
                logger.info(f"Found job list with {len(job_listings)} items")
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error at position {e.pos}: {e.msg}")
            logger.error(f"Context: ...{json_str[max(0,e.pos-50):e.pos+50]}...")
            job_listings = []
        except Exception as e:
            logger.error(f"Error parsing response: {str(e)}")
            job_listings = []
        
        # Trust Perplexity's filtering - just pass through the jobs with minimal processing
        filtered_jobs = []
        for job in job_listings:
            # Add basic match reasons based on what Perplexity already filtered
            match_reasons = ['Perplexity Verified', 'AI Tools Required']
            
            # Pass through Perplexity's results with our expected structure
            filtered_jobs.append({
                **job,
                'matchingSkills': job.get('keyMatchingSkills', []),
                'aiSkillsTools': job.get('aiSkillsTools', []),
                'matchReasons': match_reasons,
                'classification': 'ai-enhanced'
            })
        
        logger.info(f"Returning {len(filtered_jobs)} filtered jobs from {len(job_listings)} total")
        
        return {
            "jobs": filtered_jobs[:20],  # Limit to 20 jobs
            "citations": response_data.get('citations', []),
            "totalFound": len(job_listings),
            "filtered": len(filtered_jobs),
            "analysis": analysis_text,  # Include career opportunity analysis
            "rawResponse": content,  # Include full Perplexity response for debugging/display
            "searchCriteria": {
                "primaryRole": primary_role,
                "skillsProvided": [s['canonical'] for s in skills]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    await load_initial_data()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )