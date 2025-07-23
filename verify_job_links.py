#!/usr/bin/env python3
"""
TESTING SCRIPT: Verify job links from Perplexity responses
This script reads the test output files and checks if the job links are valid
"""

import json
import requests
import glob
import sys
from datetime import datetime

def verify_link(url, timeout=10):
    """Check if a URL is accessible"""
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        return {
            'status_code': response.status_code,
            'accessible': response.status_code < 400,
            'final_url': response.url if response.url != url else None,
            'error': None
        }
    except requests.exceptions.RequestException as e:
        return {
            'status_code': None,
            'accessible': False,
            'final_url': None,
            'error': str(e)
        }

def main():
    # Find the most recent test output file
    test_files = glob.glob('perplexity_test_output_*.json')
    if not test_files:
        print("No test output files found. Run a job search first.")
        return
    
    # Sort by modification time and get the most recent
    latest_file = max(test_files, key=lambda f: f.split('_')[-1])
    print(f"\nVerifying links from: {latest_file}")
    
    with open(latest_file, 'r') as f:
        data = json.load(f)
    
    print(f"\nPrompt used: {data['prompt_used']}")
    print(f"Primary role: {data['primary_role']}")
    print(f"Skills: {data['skills']}")
    print(f"Timestamp: {data['timestamp']}")
    print(f"\nTotal jobs found: {len(data['parsed_jobs'])}")
    
    print("\n" + "="*80)
    print("LINK VERIFICATION RESULTS")
    print("="*80)
    
    verified_count = 0
    failed_count = 0
    
    for i, job in enumerate(data['parsed_jobs']):
        print(f"\n[Job #{i+1}] {job.get('title', 'Unknown Title')} at {job.get('company', 'Unknown Company')}")
        
        # Check direct link
        direct_link = job.get('directLink') or job.get('link')
        if direct_link:
            print(f"Direct Link: {direct_link}")
            result = verify_link(direct_link)
            
            if result['accessible']:
                print(f"✅ VERIFIED - Status: {result['status_code']}")
                if result['final_url']:
                    print(f"   Redirected to: {result['final_url']}")
                verified_count += 1
            else:
                print(f"❌ FAILED - Status: {result['status_code']} - Error: {result['error']}")
                failed_count += 1
        else:
            print("❌ No direct link provided")
            failed_count += 1
        
        # Check fallback link
        fallback_link = job.get('fallbackLink')
        if fallback_link:
            print(f"Fallback Link: {fallback_link}")
            result = verify_link(fallback_link)
            if result['accessible']:
                print(f"✅ Fallback accessible - Status: {result['status_code']}")
            else:
                print(f"❌ Fallback failed - Status: {result['status_code']}")
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total jobs: {len(data['parsed_jobs'])}")
    print(f"✅ Verified links: {verified_count}")
    print(f"❌ Failed links: {failed_count}")
    print(f"Success rate: {verified_count / len(data['parsed_jobs']) * 100:.1f}%" if data['parsed_jobs'] else "N/A")
    
    # Save verification results
    verification_file = latest_file.replace('.json', '_verified.json')
    with open(verification_file, 'w') as f:
        json.dump({
            'original_file': latest_file,
            'verification_time': datetime.now().isoformat(),
            'total_jobs': len(data['parsed_jobs']),
            'verified_count': verified_count,
            'failed_count': failed_count,
            'success_rate': verified_count / len(data['parsed_jobs']) * 100 if data['parsed_jobs'] else 0
        }, f, indent=2)
    
    print(f"\nVerification results saved to: {verification_file}")

if __name__ == "__main__":
    main()