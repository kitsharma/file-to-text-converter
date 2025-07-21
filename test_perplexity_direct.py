#!/usr/bin/env python3
"""Test Perplexity API directly"""
import os
import requests
from dotenv import load_dotenv

# Load the API key the same way main.py does
load_dotenv('../.env')
api_key = os.getenv('PERPLEXITY_API_KEY')

print("=== Direct Perplexity API Test ===\n")
print(f"API Key: {api_key[:20]}...{api_key[-4:]}")

# Test with a simple query
test_payload = {
    'model': 'sonar-pro',
    'messages': [
        {
            'role': 'system',
            'content': 'You are a helpful assistant.'
        },
        {
            'role': 'user',
            'content': 'Hello, can you find one job posting for an Administrative Assistant in San Jose, CA?'
        }
    ],
    'temperature': 0.1,
    'max_tokens': 200
}

try:
    response = requests.post(
        'https://api.perplexity.ai/chat/completions',
        json=test_payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ SUCCESS! API key is valid")
        content = data['choices'][0]['message']['content']
        print(f"Response: {content[:200]}...")
    else:
        print(f"\n❌ FAILED: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check specific error types
        if response.status_code == 401:
            print("\nPossible causes:")
            print("- API key is invalid")
            print("- API key is expired")
            print("- Account has no credits")
        elif response.status_code == 429:
            print("\nRate limited - try again in a moment")
            
except Exception as e:
    print(f"❌ Request failed: {e}")