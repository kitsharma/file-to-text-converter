# tests/test_onet_integration.py
import pytest
import tempfile
import csv
from pathlib import Path
from unittest.mock import Mock, patch

from src.integrations.onet_integration import (
    ONETIntegration, ONETSkillRecord, ONETOccupationRecord
)
from src.models.skill_ontology import SkillType, ProficiencyLevel


class TestONETIntegration:
    """Test suite for O*NET integration"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Create temporary directory for test data
        self.temp_dir = tempfile.mkdtemp()
        self.data_dir = Path(self.temp_dir)
        
        # Create test CSV files
        self._create_test_skills_csv()
        self._create_test_occupations_csv()
        
        # Initialize integration
        self.integration = ONETIntegration(data_dir=str(self.data_dir))
    
    def _create_test_skills_csv(self):
        """Create test skills CSV file"""
        skills_data = [
            {
                'element_id': '2.A.1.a',
                'element_name': 'Reading Comprehension',
                'description': 'Understanding written sentences and paragraphs',
                'scale_id': 'IM',
                'data_value': '3.5',
                'standard_error': '0.1',
                'upper_ci_bound': '3.6',
                'lower_ci_bound': '3.4',
                'recommend_suppress': 'N',
                'not_relevant': 'N',
                'date': '2023-01-01'
            },
            {
                'element_id': '2.A.1.b',
                'element_name': 'Active Listening',
                'description': 'Giving full attention to what other people are saying',
                'scale_id': 'IM',
                'data_value': '3.8',
                'standard_error': '0.2',
                'upper_ci_bound': '4.0',
                'lower_ci_bound': '3.6',
                'recommend_suppress': 'N',
                'not_relevant': 'N',
                'date': '2023-01-01'
            },
            {
                'element_id': '2.A.2.a',
                'element_name': 'Critical Thinking',
                'description': 'Using logic and reasoning to identify solutions',
                'scale_id': 'IM',
                'data_value': '4.0',
                'standard_error': '0.15',
                'upper_ci_bound': '4.15',
                'lower_ci_bound': '3.85',
                'recommend_suppress': 'N',
                'not_relevant': 'N',
                'date': '2023-01-01'
            }
        ]
        
        skills_file = self.data_dir / "skills.csv"
        with open(skills_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=skills_data[0].keys())
            writer.writeheader()
            writer.writerows(skills_data)
    
    def _create_test_occupations_csv(self):
        """Create test occupations CSV file"""
        occupations_data = [
            {
                'onetsoc_code': '15-1251.00',
                'title': 'Computer Programmers',
                'description': 'Create, modify, and test computer programs'
            },
            {
                'onetsoc_code': '15-2051.00',
                'title': 'Data Scientists',
                'description': 'Develop and implement data-driven solutions'
            },
            {
                'onetsoc_code': '29-1141.00',
                'title': 'Registered Nurses',
                'description': 'Provide patient care and support'
            }
        ]
        
        occupations_file = self.data_dir / "occupations.csv"
        with open(occupations_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=occupations_data[0].keys())
            writer.writeheader()
            writer.writerows(occupations_data)
    
    def test_load_skills_csv(self):
        """Test loading skills from CSV"""
        assert len(self.integration.skills_cache) == 3
        
        # Check specific skill
        skill = self.integration.get_skill_by_id('2.A.1.a')
        assert skill is not None
        assert skill.element_name == 'Reading Comprehension'
        assert skill.data_value == 3.5
        assert skill.description == 'Understanding written sentences and paragraphs'
    
    def test_load_occupations_csv(self):
        """Test loading occupations from CSV"""
        assert len(self.integration.occupations_cache) == 3
        
        # Check specific occupation
        occupation = self.integration.get_occupation_by_code('15-1251.00')
        assert occupation is not None
        assert occupation.title == 'Computer Programmers'
        assert occupation.description == 'Create, modify, and test computer programs'
    
    def test_search_skills(self):
        """Test skill search functionality"""
        # Search by exact name
        results = self.integration.search_skills('Reading Comprehension')
        assert len(results) == 1
        assert results[0].element_name == 'Reading Comprehension'
        
        # Search by partial name
        results = self.integration.search_skills('reading')
        assert len(results) == 1
        assert results[0].element_name == 'Reading Comprehension'
        
        # Search by description
        results = self.integration.search_skills('attention')
        assert len(results) == 1
        assert results[0].element_name == 'Active Listening'
        
        # Search with no matches
        results = self.integration.search_skills('nonexistent')
        assert len(results) == 0
    
    def test_search_occupations(self):
        """Test occupation search functionality"""
        # Search by exact title
        results = self.integration.search_occupations('Computer Programmers')
        assert len(results) == 1
        assert results[0].title == 'Computer Programmers'
        
        # Search by partial title
        results = self.integration.search_occupations('data')
        assert len(results) == 1
        assert results[0].title == 'Data Scientists'
        
        # Search by description
        results = self.integration.search_occupations('patient')
        assert len(results) == 1
        assert results[0].title == 'Registered Nurses'
    
    def test_convert_to_ontology_skill(self):
        """Test converting O*NET skill to ontology Skill"""
        onet_skill = self.integration.get_skill_by_id('2.A.1.a')
        skill = self.integration.convert_to_ontology_skill(onet_skill)
        
        assert skill.id == 'onet_2.A.1.a'
        assert skill.name == 'Reading Comprehension'
        assert skill.description == 'Understanding written sentences and paragraphs'
        assert skill.onet_code == '2.A.1.a'
        assert skill.skill_type == SkillType.COGNITIVE
        assert 'reading' in skill.synonyms
        assert 'comprehension' in skill.synonyms
    
    def test_convert_to_ontology_job(self):
        """Test converting O*NET occupation to ontology Job"""
        onet_occupation = self.integration.get_occupation_by_code('15-1251.00')
        job = self.integration.convert_to_ontology_job(onet_occupation)
        
        assert job.id == 'onet_15-1251.00'
        assert job.title == 'Computer Programmers'
        assert job.description == 'Create, modify, and test computer programs'
        assert job.onet_code == '15-1251.00'
        # Required skills would be empty since we don't have occupation-skill mapping
        assert job.required_skills == []
    
    def test_determine_skill_type(self):
        """Test skill type determination"""
        # Test technical skill
        skill_type = self.integration._determine_skill_type(
            'Programming', 'Writing computer programs'
        )
        assert skill_type == SkillType.TECHNICAL
        
        # Test soft skill
        skill_type = self.integration._determine_skill_type(
            'Active Listening', 'Giving full attention to what other people are saying'
        )
        assert skill_type == SkillType.SOFT
        
        # Test cognitive skill
        skill_type = self.integration._determine_skill_type(
            'Critical Thinking', 'Using logic and reasoning to identify solutions'
        )
        assert skill_type == SkillType.COGNITIVE
        
        # Test physical skill
        skill_type = self.integration._determine_skill_type(
            'Manual Dexterity', 'Ability to quickly move your hand, your hand together with your arm'
        )
        assert skill_type == SkillType.PHYSICAL
    
    def test_generate_synonyms(self):
        """Test synonym generation"""
        synonyms = self.integration._generate_synonyms('Active Listening')
        assert 'listening' in synonyms
        assert 'hearing' in synonyms
        assert 'attention' in synonyms
        
        # Test compound skill name
        synonyms = self.integration._generate_synonyms('Critical Thinking')
        assert 'analysis' in synonyms
        assert 'reasoning' in synonyms
        assert 'problem solving' in synonyms
        
        # Test with spaces
        synonyms = self.integration._generate_synonyms('Reading Comprehension')
        assert 'reading' in synonyms
        assert 'comprehension' in synonyms
        assert 'understanding' in synonyms
    
    def test_bulk_import_skills(self):
        """Test bulk import of all skills"""
        skills = self.integration.bulk_import_skills()
        assert len(skills) == 3
        
        # Check that all skills are properly converted
        skill_names = [skill.name for skill in skills]
        assert 'Reading Comprehension' in skill_names
        assert 'Active Listening' in skill_names
        assert 'Critical Thinking' in skill_names
    
    def test_bulk_import_jobs(self):
        """Test bulk import of all jobs"""
        jobs = self.integration.bulk_import_jobs()
        assert len(jobs) == 3
        
        # Check that all jobs are properly converted
        job_titles = [job.title for job in jobs]
        assert 'Computer Programmers' in job_titles
        assert 'Data Scientists' in job_titles
        assert 'Registered Nurses' in job_titles
    
    def test_get_statistics(self):
        """Test statistics retrieval"""
        stats = self.integration.get_statistics()
        assert stats['skills_count'] == 3
        assert stats['occupations_count'] == 3
    
    def test_no_data_files(self):
        """Test behavior when no data files exist"""
        empty_dir = Path(tempfile.mkdtemp())
        integration = ONETIntegration(data_dir=str(empty_dir))
        
        assert len(integration.skills_cache) == 0
        assert len(integration.occupations_cache) == 0
        
        stats = integration.get_statistics()
        assert stats['skills_count'] == 0
        assert stats['occupations_count'] == 0


class TestONETSkillRecord:
    """Test ONETSkillRecord data structure"""
    
    def test_skill_record_creation(self):
        """Test creating ONETSkillRecord"""
        record = ONETSkillRecord(
            element_id='2.A.1.a',
            element_name='Reading Comprehension',
            description='Understanding written sentences',
            scale_id='IM',
            data_value=3.5,
            standard_error=0.1
        )
        
        assert record.element_id == '2.A.1.a'
        assert record.element_name == 'Reading Comprehension'
        assert record.data_value == 3.5
        assert record.standard_error == 0.1


class TestONETOccupationRecord:
    """Test ONETOccupationRecord data structure"""
    
    def test_occupation_record_creation(self):
        """Test creating ONETOccupationRecord"""
        record = ONETOccupationRecord(
            onetsoc_code='15-1251.00',
            title='Computer Programmers',
            description='Create, modify, and test computer programs'
        )
        
        assert record.onetsoc_code == '15-1251.00'
        assert record.title == 'Computer Programmers'
        assert record.description == 'Create, modify, and test computer programs'


if __name__ == "__main__":
    pytest.main([__file__])