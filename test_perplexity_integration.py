#!/usr/bin/env python3
"""
Test script to verify Perplexity integration is working correctly
"""
import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=== Testing Perplexity Job Search Integration ===\n")

# Step 1: Check API Key
api_key = os.getenv('PERPLEXITY_API_KEY')
print("1. API Key Check:")
if not api_key:
    print("   ❌ PERPLEXITY_API_KEY not found in environment")
    exit(1)
elif api_key == 'your_perplexity_api_key_here':
    print("   ❌ PERPLEXITY_API_KEY still has placeholder value")
    print("   Please update .env with your actual API key")
    exit(1)
elif api_key.startswith('pplx-'):
    print(f"   ✅ API key found: {api_key[:10]}...")
else:
    print(f"   ⚠️  API key found but doesn't start with 'pplx-': {api_key[:10]}...")

# Step 2: Test API endpoint
print("\n2. Testing Job Search API:")
test_resume = """
Jane Smith
Administrative Assistant
jane.smith@email.com

EXPERIENCE
Executive Assistant | Fortune 500 Company | 2019-Present
• Managed executive calendars and travel arrangements
• Coordinated meetings and events for C-suite executives
• Handled confidential documents and communications
• Proficient in Microsoft Office Suite, Salesforce, and AI tools

SKILLS
Administrative Support, Calendar Management, Executive Support, 
Microsoft Office, Communication, Problem Solving, ChatGPT, Claude
"""

try:
    response = requests.post(
        'http://localhost:8000/api/jobs/search',
        json={'resumeText': test_resume},
        timeout=30
    )
    
    print(f"   Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("   ✅ API call successful!")
        print(f"\n3. Results Summary:")
        print(f"   - Total jobs found: {len(data.get('jobs', []))}")
        if data.get('searchCriteria'):
            print(f"   - Primary role: {data['searchCriteria'].get('primaryRole', 'N/A')}")
            print(f"   - Skills extracted: {', '.join(data['searchCriteria'].get('skillsProvided', []))}")
        
        if data.get('jobs'):
            print(f"\n4. First Job Match:")
            job = data['jobs'][0]
            print(f"   - Title: {job.get('title', 'N/A')}")
            print(f"   - Company: {job.get('company', 'N/A')}")
            print(f"   - Match Score: {job.get('matchScore', 'N/A')}")
            print(f"   - AI Tools: {', '.join(job.get('aiSkillsTools', []))}")
            
        print("\n✅ Integration test PASSED! The job search is working correctly.")
        
    elif response.status_code == 503:
        print("   ❌ Service unavailable - API key not configured")
        print(f"   Error: {response.json().get('detail', 'Unknown error')}")
    elif response.status_code == 401:
        print("   ❌ Authentication failed - API key is invalid")
        print(f"   Error: {response.json().get('detail', 'Unknown error')}")
    else:
        print(f"   ❌ Unexpected error: {response.status_code}")
        print(f"   Details: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("   ❌ Cannot connect to server")
    print("   Make sure the server is running: source venv/bin/activate && python main.py")
except Exception as e:
    print(f"   ❌ Test failed with error: {str(e)}")

print("\n" + "="*50)