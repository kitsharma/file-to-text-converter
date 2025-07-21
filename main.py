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
        
        # Build the system prompt with actual values substituted for placeholders
        system_prompt = '''Of course. That's an excellent point. Focusing too heavily on engineering-specific terms like "machine learning" and "TensorFlow" will inevitably skew the results toward technical roles, even when the primary role is administrative or customer-focused. The goal is to find jobs that *use* AI tools for productivity, not necessarily jobs that *build* them.

Acknowledging your feedback and our shared goal of crafting precise prompts[1], I have revised the prompt to remove this "tech bro" bias. It now emphasizes the practical application of AI in a business context, which should surface a more relevant set of opportunities. The core requirements for verification and direct links remain, as they are critical to a trustworthy user experience[2].

Here is the perfected, unbiased prompt:

### The Perfected, Unbiased Job Search Prompt

You're a knowledgeable AI job search assistant with access to real-time job market data from sources like LinkedIn, Indeed, Glassdoor, and official company career pages. Your task is to generate a ranked list of active job roles that match the following criteria using fuzzy matching for flexibility.

**1. Input Criteria:**
*   **Primary Role(s):** The job must align closely with ''' + primary_role + '''. Use fuzzy matching for similar titles like "Client Success Coordinator" or "Office Manager."
*   **Skills:** The job must require or match at least one of the following skills: ''' + skills_list + '''. Use fuzzy matching for related terms like "MS Suite" or "Client Relations."
*   **AI Requirement (Unbiased):** The job must explicitly mention the use of **AI-powered software or tools to enhance productivity, automate tasks, or generate insights**. This includes, but is not limited to:
    *   Using **generative AI tools** (like ChatGPT, Claude, Gemini) for communication, content creation, or research.
    *   Leveraging **AI-driven analytics** in software like CRMs (e.g., Salesforce Einstein) or business intelligence platforms.
    *   Working with **AI-powered automation** tools for scheduling, data entry, or workflow management.
    *   Experience with **conversational AI** or intelligent chatbots for customer support.

**2. Verification of Active Postings:**
To guarantee all jobs are live and not "ghost jobs," you must adhere to the following verification protocol:
*   **Cross-Reference with Company Site:** Verify every posting on the company's official careers page. The link provided **must be to the specific job posting**, not a general careers landing page.
*   **Check Posting Date:** Prioritize jobs posted within the last 30 days. Note the posting date where possible.
*   **Use Status Indicators:** Look for active statuses like "Accepting applications" on job boards.
*   **Avoid Red Flags:** Exclude jobs with vague descriptions, those posted for several months, or those not found on the official company site.

**3. Ranking and Output:**
Generate a list of **10-20 active job matches**, ranked by a "Match Score."
*   **Match Score Calculation:** Calculate a score based on the number of matching skills and the relevance to the primary role. A direct role match with more matching skills gets a higher score.
*   **Output Format:** Present the results in a Markdown table with the following columns, sorted in descending order by the Match Score:
    *   **Rank:** The numerical rank of the job.
    *   **Match Score:** A score (e.g., out of 10) indicating relevance.
    *   **Job Title:** The title of the position.
    *   **Company:** The name of the employer.
    *   **Location:** The job's location.
    *   **Key Matching Skills:** List of your skills found in the posting.
    *   **Required AI Application/Tools:** List the practical AI applications mentioned.
    *   **Estimated Salary Range:** Based on market data.
    *   **Direct Link to Posting:** The URL to the **specific, active job listing**.

**4. Final Analysis:**
Conclude with a brief analysis of how these roles represent positive career opportunities, focusing on growth potential and how AI tools are empowering non-technical roles to become more efficient and data-driven. Cite any supporting data where applicable.

[1] tools.ai_prompt_engineering
[2] work.job_verification

Return the results as JSON with this structure:
{
  "jobs": [
    {
      "rank": 1,
      "matchScore": 8.5,
      "title": "Job Title",
      "company": "Company Name", 
      "location": "Location",
      "description": "Brief description",
      "link": "Direct URL to specific job posting",
      "aiSkillsTools": ["AI Tool 1", "AI Tool 2"],
      "skills": ["Matching Skill 1", "Matching Skill 2"],
      "salaryRange": "$XX,XXX - $XXX,XXX",
      "postingDate": "YYYY-MM-DD",
      "keyMatchingSkills": ["Skill from input list"]
    }
  ],
  "analysis": "Career opportunity analysis focusing on AI empowerment of non-technical roles",
  "totalMatches": 15,
  "searchCriteria": {
    "primaryRole": "extracted role",
    "skillsProvided": ["list of skills"]
  }
}'''
        
        # Add location back to complete the prompt
        system_prompt += '''
*   **Location:** The job must be in or near San Jose, CA, or be a remote position accessible from there.'''
        
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
                timeout=30
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
        try:
            # Try to extract JSON from the response
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            if json_match:
                parsed_data = json.loads(json_match.group(1))
                # Handle new format with jobs and analysis
                if isinstance(parsed_data, dict) and 'jobs' in parsed_data:
                    job_listings = parsed_data['jobs']
                    analysis_text = parsed_data.get('analysis', '')
                elif isinstance(parsed_data, list):
                    job_listings = parsed_data
            else:
                # Try to find JSON object directly
                json_match = re.search(r'(\{.*?\})', content, re.DOTALL)
                if json_match:
                    parsed_data = json.loads(json_match.group(1))
                    if 'jobs' in parsed_data:
                        job_listings = parsed_data['jobs']
                        analysis_text = parsed_data.get('analysis', '')
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse job listings JSON: {e}")
            job_listings = []
        
        # Apply role-based filtering and add match reasons
        filtered_jobs = []
        for job in job_listings:
            job_title = job.get('title', '').lower()
            
            # Role matching (relaxed)
            role_match = (
                any(skill['canonical'].lower() in job_title for skill in skills) or
                'manager' in job_title or 'coordinator' in job_title or 
                'specialist' in job_title or 'assistant' in job_title
            )
            
            # Skill matching
            matching_skills = []
            for skill in skills:
                skill_name = skill['canonical'].lower()
                job_desc = job.get('description', '').lower()
                if skill_name in job_desc or skill_name in job_title:
                    matching_skills.append(skill['canonical'])
            
            # AI tools check
            ai_tools = job.get('aiSkillsTools', [])
            if not ai_tools:
                ai_patterns = ['ai', 'automation', 'chatgpt', 'claude', 'machine learning', 'rpa']
                ai_tools = [pattern for pattern in ai_patterns if pattern in job.get('description', '').lower()]
            
            # Determine match reasons
            match_reasons = []
            if role_match:
                match_reasons.append('Role Match')
            if matching_skills:
                match_reasons.append(f'{len(matching_skills)} Skill Match{"es" if len(matching_skills) > 1 else ""}')
            if ai_tools:
                match_reasons.append('AI Tools Required')
            
            # Include job if it has role match AND (skills OR AI tools)
            if role_match and (matching_skills or ai_tools):
                filtered_jobs.append({
                    **job,
                    'matchingSkills': matching_skills,
                    'aiSkillsTools': ai_tools,
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