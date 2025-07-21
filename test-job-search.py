#!/usr/bin/env python3
"""Test script for job search functionality"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Mock the environment for testing
os.environ['PERPLEXITY_API_KEY'] = 'test_key_123'

# Import after setting environment
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_job_search():
    """Test the job search endpoint"""
    
    # Test data - administrative assistant resume
    test_resume = """
    Jane Doe
    Administrative Assistant
    
    Experience:
    - Executive Assistant at Tech Corp (2020-2023)
    - Administrative Assistant at Business Inc (2018-2020)
    
    Skills:
    - Microsoft Office
    - Calendar Management
    - Project Management
    - Communication Skills
    - Google Workspace
    """
    
    print("Testing job search endpoint...")
    
    response = client.post(
        "/api/jobs/search",
        json={"resumeText": test_resume}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nJobs found: {len(data.get('jobs', []))}")
        
        if data.get('jobs'):
            print("\nFirst job:")
            job = data['jobs'][0]
            print(f"- Title: {job.get('title')}")
            print(f"- Company: {job.get('company')}")
            print(f"- AI Tools: {job.get('aiSkillsTools')}")
            print(f"- Matching Skills: {job.get('matchingSkills')}")
        
        print(f"\nMessage: {data.get('message')}")
        print("✅ Test PASSED")
    else:
        print("❌ Test FAILED")

if __name__ == "__main__":
    test_job_search()