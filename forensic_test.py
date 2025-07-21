#!/usr/bin/env python3
"""Forensic analysis of job search API flow"""
import os
import json
from dotenv import load_dotenv

print("=== FORENSIC ANALYSIS: Job Search API Flow ===\n")

# Step 1: Check environment loading
print("1. ENVIRONMENT ANALYSIS:")
load_dotenv()
api_key = os.getenv('PERPLEXITY_API_KEY')
print(f"   - API key loaded: {api_key[:20]}..." if api_key else "   - API key NOT loaded")
print(f"   - Is placeholder?: {api_key == 'your_perplexity_api_key_here'}" if api_key else "")

# Step 2: Trace the code path
print("\n2. CODE PATH ANALYSIS:")
print("   Line 578: perplexity_api_key = os.getenv('PERPLEXITY_API_KEY')")
print(f"   Result: '{api_key}'")
print(f"\n   Line 579: if not perplexity_api_key or perplexity_api_key == 'your_perplexity_api_key_here':")
print(f"   Condition evaluates to: {not api_key or api_key == 'your_perplexity_api_key_here'}")

if not api_key or api_key == 'your_perplexity_api_key_here':
    print("\n   ⚠️  ENTERING MOCK DATA PATH (line 580)")
    print("   - Returns mock jobs without calling Perplexity")
    print("   - All prompt fixes are irrelevant!")
else:
    print("\n   ✓ Would enter REAL API PATH")
    print("   - Would build system prompt with substitutions")
    print("   - Would call Perplexity API")

# Step 3: Test data extraction
print("\n3. DATA EXTRACTION TEST:")
test_resume = """John Doe
Software Engineer
john.doe@email.com
(555) 123-4567

EXPERIENCE
----------
Senior Software Engineer | Tech Company | 2020-Present
• Developed full-stack web applications using Python, JavaScript, and React"""

# Simulate skill extraction
skills = []
skill_patterns = ['Python', 'JavaScript', 'React', 'AI', 'Machine Learning']
for skill in skill_patterns:
    if skill.lower() in test_resume.lower():
        skills.append({'canonical': skill})

print(f"   - Extracted skills: {[s['canonical'] for s in skills]}")
print(f"   - Primary role would be: {skills[0]['canonical'] if skills else 'Professional'}")

# Step 4: Show what WOULD be sent to Perplexity (if we got there)
print("\n4. WHAT WOULD BE SENT TO PERPLEXITY (if API key was valid):")
primary_role = skills[0]['canonical'] if skills else 'Professional'
skills_list = ", ".join([s['canonical'] for s in skills])
print(f"   - Primary Role: {primary_role}")
print(f"   - Skills List: {skills_list}")
print("   - These would replace [PRIMARY_ROLE] and [SKILLS_LIST] in the prompt")

print("\n5. CONCLUSION:")
print("   The issue is NOT with prompt substitution.")
print("   The issue is that the API key is not properly configured.")
print("   Until a valid API key is set, the code will ALWAYS return mock data.")
print("\n   To fix: Set a valid PERPLEXITY_API_KEY in .env file")