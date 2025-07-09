# src/services/learning_path_generator.py
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

from src.models.skill_ontology import SkillGap, UserSkill, ProficiencyLevel, Skill, SkillRequirement
from src.models.user_profile import UserProfile
from src.services.career_recommender import CareerRecommendation

logger = logging.getLogger(__name__)


@dataclass
class LearningResource:
    """Represents a learning resource"""
    title: str
    provider: str
    url: str
    resource_type: str  # 'course', 'certification', 'book', 'tutorial', 'practice'
    difficulty: str  # 'beginner', 'intermediate', 'advanced'
    estimated_hours: int
    cost: str  # 'free', 'paid', 'freemium'
    rating: Optional[float] = None
    prerequisites: List[str] = None
    
    def __post_init__(self):
        if self.prerequisites is None:
            self.prerequisites = []


@dataclass
class LearningMilestone:
    """Represents a milestone in learning path"""
    skill_name: str
    target_level: ProficiencyLevel
    resources: List[LearningResource]
    estimated_weeks: int
    prerequisites: List[str]
    validation_method: str  # How to validate skill acquisition


@dataclass
class LearningPath:
    """Complete learning path for career transition"""
    target_job_title: str
    total_estimated_weeks: int
    milestones: List[LearningMilestone]
    priority_skills: List[str]  # Skills to focus on first
    optional_skills: List[str]  # Nice-to-have skills
    estimated_cost: str
    difficulty_level: str


class SkillGapAnalyzer:
    """Analyzes skill gaps and creates detailed reports"""
    
    def __init__(self):
        # Learning resource database
        self.resource_db = self._build_resource_database()
    
    def _build_resource_database(self) -> Dict[str, List[LearningResource]]:
        """Build database of learning resources for common skills"""
        resources = {
            'Python': [
                LearningResource(
                    title="Python for Everybody Specialization",
                    provider="Coursera (University of Michigan)",
                    url="https://www.coursera.org/specializations/python",
                    resource_type="course",
                    difficulty="beginner",
                    estimated_hours=120,
                    cost="freemium",
                    rating=4.8,
                    prerequisites=[]
                ),
                LearningResource(
                    title="Automate the Boring Stuff with Python",
                    provider="No Starch Press",
                    url="https://automatetheboringstuff.com/",
                    resource_type="book",
                    difficulty="beginner",
                    estimated_hours=40,
                    cost="free",
                    rating=4.7,
                    prerequisites=[]
                ),
                LearningResource(
                    title="Python Institute Certification (PCAP)",
                    provider="Python Institute",
                    url="https://pythoninstitute.org/pcap",
                    resource_type="certification",
                    difficulty="intermediate",
                    estimated_hours=80,
                    cost="paid",
                    prerequisites=["Basic Python knowledge"]
                )
            ],
            'Machine Learning': [
                LearningResource(
                    title="Machine Learning Specialization",
                    provider="Coursera (Stanford/DeepLearning.AI)",
                    url="https://www.coursera.org/specializations/machine-learning-introduction",
                    resource_type="course",
                    difficulty="intermediate",
                    estimated_hours=120,
                    cost="freemium",
                    rating=4.9,
                    prerequisites=["Python", "Basic Statistics"]
                ),
                LearningResource(
                    title="Hands-On Machine Learning",
                    provider="O'Reilly Media",
                    url="https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/",
                    resource_type="book",
                    difficulty="intermediate",
                    estimated_hours=60,
                    cost="paid",
                    rating=4.8,
                    prerequisites=["Python", "NumPy", "Pandas"]
                ),
                LearningResource(
                    title="Kaggle Learn: Machine Learning",
                    provider="Kaggle",
                    url="https://www.kaggle.com/learn/machine-learning",
                    resource_type="tutorial",
                    difficulty="beginner",
                    estimated_hours=20,
                    cost="free",
                    rating=4.5,
                    prerequisites=["Python basics"]
                )
            ],
            'SQL': [
                LearningResource(
                    title="SQL for Data Science",
                    provider="Coursera (UC Davis)",
                    url="https://www.coursera.org/learn/sql-for-data-science",
                    resource_type="course",
                    difficulty="beginner",
                    estimated_hours=25,
                    cost="freemium",
                    rating=4.6,
                    prerequisites=[]
                ),
                LearningResource(
                    title="SQLBolt Interactive Tutorial",
                    provider="SQLBolt",
                    url="https://sqlbolt.com/",
                    resource_type="tutorial",
                    difficulty="beginner",
                    estimated_hours=10,
                    cost="free",
                    rating=4.7,
                    prerequisites=[]
                ),
                LearningResource(
                    title="HackerRank SQL Practice",
                    provider="HackerRank",
                    url="https://www.hackerrank.com/domains/sql",
                    resource_type="practice",
                    difficulty="intermediate",
                    estimated_hours=30,
                    cost="free",
                    prerequisites=["SQL basics"]
                )
            ],
            'Data Analysis': [
                LearningResource(
                    title="Google Data Analytics Certificate",
                    provider="Coursera (Google)",
                    url="https://www.coursera.org/professional-certificates/google-data-analytics",
                    resource_type="certification",
                    difficulty="beginner",
                    estimated_hours=180,
                    cost="freemium",
                    rating=4.7,
                    prerequisites=[]
                ),
                LearningResource(
                    title="Python for Data Analysis",
                    provider="O'Reilly Media",
                    url="https://wesmckinney.com/book/",
                    resource_type="book",
                    difficulty="intermediate",
                    estimated_hours=50,
                    cost="free",
                    rating=4.6,
                    prerequisites=["Python basics"]
                )
            ],
            'Communication': [
                LearningResource(
                    title="Presentation Skills: Speechwriting, Slides and Delivery",
                    provider="Coursera (University of Washington)",
                    url="https://www.coursera.org/specializations/presentation-skills",
                    resource_type="course",
                    difficulty="beginner",
                    estimated_hours=40,
                    cost="freemium",
                    rating=4.5,
                    prerequisites=[]
                ),
                LearningResource(
                    title="Technical Writing Fundamentals",
                    provider="edX (IBM)",
                    url="https://www.edx.org/course/technical-writing",
                    resource_type="course",
                    difficulty="intermediate",
                    estimated_hours=25,
                    cost="free",
                    rating=4.3,
                    prerequisites=[]
                )
            ],
            'Project Management': [
                LearningResource(
                    title="Google Project Management Certificate",
                    provider="Coursera (Google)",
                    url="https://www.coursera.org/professional-certificates/google-project-management",
                    resource_type="certification",
                    difficulty="beginner",
                    estimated_hours=140,
                    cost="freemium",
                    rating=4.8,
                    prerequisites=[]
                ),
                LearningResource(
                    title="PMP Certification Training",
                    provider="PMI",
                    url="https://www.pmi.org/certifications/project-management-pmp",
                    resource_type="certification",
                    difficulty="advanced",
                    estimated_hours=200,
                    cost="paid",
                    prerequisites=["3+ years project management experience"]
                )
            ]
        }
        
        return resources
    
    def analyze_skill_gaps(self, user_profile: UserProfile, 
                          target_recommendation: CareerRecommendation) -> List[SkillGap]:
        """Perform detailed skill gap analysis"""
        gaps = []
        
        # Get user's current skills
        user_skills = {skill.skill_id: skill for skill in user_profile.skills}
        
        # Analyze gaps from the job match
        for missing_skill in target_recommendation.skill_match.missing_skills:
            # Find the skill in the ontology to get more details
            skill_obj = None
            for skill in target_recommendation.job.required_skills:
                if skill.skill_id == missing_skill or missing_skill in skill.skill_id or missing_skill.lower() in skill.skill_id.lower():
                    skill_obj = skill
                    break
            
            # If not found by ID, create a default requirement
            if not skill_obj:
                skill_obj = SkillRequirement(
                    skill_id=missing_skill.lower().replace(' ', '_'),
                    importance=0.8,  # Default importance
                    required_level=ProficiencyLevel.INTERMEDIATE,
                    is_mandatory=True
                )
            
            gap = SkillGap(
                skill_id=skill_obj.skill_id,
                skill_name=missing_skill,
                current_level=None,  # Missing entirely
                required_level=skill_obj.required_level,
                importance=skill_obj.importance,
                gap_score=1.0  # Complete gap
            )
            gaps.append(gap)
        
        # Check for skill level gaps (user has skill but at lower level)
        for req_skill in target_recommendation.job.required_skills:
            if req_skill.skill_id in user_skills:
                user_skill = user_skills[req_skill.skill_id]
                
                # Compare proficiency levels
                level_values = {
                    ProficiencyLevel.BEGINNER: 1,
                    ProficiencyLevel.INTERMEDIATE: 2,
                    ProficiencyLevel.ADVANCED: 3,
                    ProficiencyLevel.EXPERT: 4
                }
                
                user_level = level_values[user_skill.proficiency_level]
                required_level = level_values[req_skill.required_level]
                
                if user_level < required_level:
                    gap_score = (required_level - user_level) / required_level
                    
                    gap = SkillGap(
                        skill_id=req_skill.skill_id,
                        skill_name=req_skill.skill_id,  # Will be resolved later
                        current_level=user_skill.proficiency_level,
                        required_level=req_skill.required_level,
                        importance=req_skill.importance,
                        gap_score=gap_score
                    )
                    gaps.append(gap)
        
        # Sort by priority (importance * gap_score)
        gaps.sort(key=lambda g: g.importance * g.gap_score, reverse=True)
        
        return gaps
    
    def prioritize_skills(self, gaps: List[SkillGap]) -> Tuple[List[str], List[str]]:
        """Prioritize skills into must-have and nice-to-have"""
        priority_skills = []
        optional_skills = []
        
        for gap in gaps:
            priority_score = gap.importance * gap.gap_score
            
            # High priority: importance > 0.5 or gap_score = 1.0 (missing entirely)
            if gap.importance > 0.5 or gap.gap_score >= 1.0:
                priority_skills.append(gap.skill_name)
            else:
                optional_skills.append(gap.skill_name)
        
        return priority_skills, optional_skills


class LearningPathGenerator:
    """Generates personalized learning paths"""
    
    def __init__(self, skill_gap_analyzer: SkillGapAnalyzer):
        self.analyzer = skill_gap_analyzer
    
    def generate_learning_path(self, user_profile: UserProfile,
                             target_recommendation: CareerRecommendation) -> LearningPath:
        """Generate complete learning path for career transition"""
        
        # Step 1: Analyze skill gaps
        gaps = self.analyzer.analyze_skill_gaps(user_profile, target_recommendation)
        
        # Step 2: Prioritize skills
        priority_skills, optional_skills = self.analyzer.prioritize_skills(gaps)
        
        # Step 3: Create milestones for each gap
        milestones = []
        total_weeks = 0
        
        for gap in gaps:
            milestone = self._create_milestone_for_skill(gap)
            if milestone:
                milestones.append(milestone)
                total_weeks += milestone.estimated_weeks
        
        # Step 4: Optimize learning sequence
        optimized_milestones = self._optimize_learning_sequence(milestones)
        
        # Step 5: Calculate estimates
        estimated_cost = self._estimate_total_cost(optimized_milestones)
        difficulty_level = self._assess_difficulty_level(optimized_milestones)
        
        return LearningPath(
            target_job_title=target_recommendation.job.title,
            total_estimated_weeks=total_weeks,
            milestones=optimized_milestones,
            priority_skills=priority_skills,
            optional_skills=optional_skills,
            estimated_cost=estimated_cost,
            difficulty_level=difficulty_level
        )
    
    def _create_milestone_for_skill(self, gap: SkillGap) -> Optional[LearningMilestone]:
        """Create learning milestone for a specific skill gap"""
        
        # Find resources for this skill
        resources = self.analyzer.resource_db.get(gap.skill_name, [])
        
        if not resources:
            # Create generic milestone for skills without specific resources
            return LearningMilestone(
                skill_name=gap.skill_name,
                target_level=gap.required_level,
                resources=[
                    LearningResource(
                        title=f"Learn {gap.skill_name}",
                        provider="Various",
                        url="",
                        resource_type="course",
                        difficulty="intermediate",
                        estimated_hours=40,
                        cost="freemium",
                        prerequisites=[]
                    )
                ],
                estimated_weeks=6,
                prerequisites=[],
                validation_method="Complete online course and practice project"
            )
        
        # Filter resources based on current level and target level
        suitable_resources = self._filter_resources_by_level(
            resources, gap.current_level, gap.required_level
        )
        
        # Estimate time based on gap severity
        base_weeks = 4
        if gap.gap_score >= 1.0:  # Missing skill entirely
            estimated_weeks = base_weeks + 4
        elif gap.gap_score >= 0.5:  # Significant gap
            estimated_weeks = base_weeks + 2
        else:  # Minor gap
            estimated_weeks = base_weeks
        
        # Determine prerequisites
        prerequisites = []
        if gap.current_level is None:  # New skill
            if gap.skill_name in ['Machine Learning', 'Data Analysis']:
                prerequisites.extend(['Python', 'Statistics'])
            elif gap.skill_name in ['Advanced SQL']:
                prerequisites.append('SQL')
        
        return LearningMilestone(
            skill_name=gap.skill_name,
            target_level=gap.required_level,
            resources=suitable_resources[:3],  # Top 3 resources
            estimated_weeks=estimated_weeks,
            prerequisites=prerequisites,
            validation_method=self._get_validation_method(gap.skill_name)
        )
    
    def _filter_resources_by_level(self, resources: List[LearningResource],
                                  current_level: Optional[ProficiencyLevel],
                                  target_level: ProficiencyLevel) -> List[LearningResource]:
        """Filter resources appropriate for skill level"""
        
        # If complete beginner, start with beginner resources
        if current_level is None:
            return [r for r in resources if r.difficulty in ['beginner', 'intermediate']]
        
        # If upgrading existing skill, focus on intermediate/advanced
        if current_level in [ProficiencyLevel.BEGINNER, ProficiencyLevel.INTERMEDIATE]:
            return [r for r in resources if r.difficulty in ['intermediate', 'advanced']]
        
        # If already advanced, focus on advanced/certification
        return [r for r in resources if r.difficulty == 'advanced' or r.resource_type == 'certification']
    
    def _optimize_learning_sequence(self, milestones: List[LearningMilestone]) -> List[LearningMilestone]:
        """Optimize the sequence of learning milestones"""
        optimized = []
        completed_skills = set()
        
        # First, add milestones with no prerequisites
        for milestone in milestones:
            if not milestone.prerequisites:
                optimized.append(milestone)
                completed_skills.add(milestone.skill_name)
        
        # Then add milestones whose prerequisites are met
        remaining = [m for m in milestones if m.prerequisites]
        
        while remaining:
            added_any = False
            
            for milestone in remaining[:]:
                if all(prereq in completed_skills for prereq in milestone.prerequisites):
                    optimized.append(milestone)
                    completed_skills.add(milestone.skill_name)
                    remaining.remove(milestone)
                    added_any = True
            
            # If we can't add any more, break to avoid infinite loop
            if not added_any:
                # Add remaining milestones anyway (prerequisites may be external)
                optimized.extend(remaining)
                break
        
        return optimized
    
    def _estimate_total_cost(self, milestones: List[LearningMilestone]) -> str:
        """Estimate total cost of learning path"""
        free_resources = 0
        paid_resources = 0
        freemium_resources = 0
        
        for milestone in milestones:
            for resource in milestone.resources:
                if resource.cost == 'free':
                    free_resources += 1
                elif resource.cost == 'paid':
                    paid_resources += 1
                else:  # freemium
                    freemium_resources += 1
        
        if paid_resources == 0:
            return "Free to $100"
        elif paid_resources <= 2:
            return "$100 to $500"
        else:
            return "$500 to $1500"
    
    def _assess_difficulty_level(self, milestones: List[LearningMilestone]) -> str:
        """Assess overall difficulty of learning path"""
        difficulty_scores = {'beginner': 1, 'intermediate': 2, 'advanced': 3}
        
        total_score = 0
        total_resources = 0
        
        for milestone in milestones:
            for resource in milestone.resources:
                total_score += difficulty_scores.get(resource.difficulty, 2)
                total_resources += 1
        
        if total_resources == 0:
            return "intermediate"
        
        avg_difficulty = total_score / total_resources
        
        if avg_difficulty <= 1.5:
            return "beginner"
        elif avg_difficulty <= 2.5:
            return "intermediate"
        else:
            return "advanced"
    
    def _get_validation_method(self, skill_name: str) -> str:
        """Get appropriate validation method for skill"""
        validation_methods = {
            'Python': 'Complete coding project and pass Python certification',
            'Machine Learning': 'Build ML model and deploy to production',
            'SQL': 'Complete database project with complex queries',
            'Data Analysis': 'Complete end-to-end data analysis project',
            'Communication': 'Give presentation and receive feedback',
            'Project Management': 'Lead a project from start to finish'
        }
        
        return validation_methods.get(skill_name, 'Complete practical project demonstrating skill')
    
    def get_next_milestone(self, learning_path: LearningPath, 
                          completed_skills: List[str]) -> Optional[LearningMilestone]:
        """Get the next milestone user should work on"""
        completed_set = set(completed_skills)
        
        for milestone in learning_path.milestones:
            # Skip if already completed
            if milestone.skill_name in completed_set:
                continue
            
            # Check if prerequisites are met
            if all(prereq in completed_set for prereq in milestone.prerequisites):
                return milestone
        
        return None
    
    def estimate_completion_date(self, learning_path: LearningPath,
                               hours_per_week: int = 10) -> datetime:
        """Estimate completion date based on study schedule"""
        total_hours = sum(
            sum(resource.estimated_hours for resource in milestone.resources)
            for milestone in learning_path.milestones
        )
        
        weeks_needed = max(1, total_hours // hours_per_week)
        completion_date = datetime.now() + timedelta(weeks=weeks_needed)
        
        return completion_date