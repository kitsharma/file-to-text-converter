#!/usr/bin/env python3
"""Debug which API key is being loaded"""
import os
from dotenv import load_dotenv

print("=== API Key Debug ===\n")

# Test 1: Current directory .env
load_dotenv()
key1 = os.getenv('PERPLEXITY_API_KEY')
print(f"1. From current dir .env: {key1[:20] if key1 else 'None'}...")

# Test 2: Parent directory .env  
os.environ.clear()
load_dotenv('../.env')
key2 = os.getenv('PERPLEXITY_API_KEY')
print(f"2. From ../.env: {key2[:20] if key2 else 'None'}...")

# Test 3: What main.py is doing
os.environ.clear()
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
key3 = os.getenv('PERPLEXITY_API_KEY')
print(f"3. From ../../.env (what main.py does): {key3[:20] if key3 else 'None'}...")

# Show full path
import os.path
full_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
print(f"\nFull path being used: {full_path}")
print(f"File exists: {os.path.exists(full_path)}")

if key3:
    print(f"\nAPI Key details:")
    print(f"- Starts with 'pplx-': {key3.startswith('pplx-')}")
    print(f"- Length: {len(key3)}")
    print(f"- Last 4 chars: ...{key3[-4:]}")