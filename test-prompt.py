#!/usr/bin/env python3
"""Test prompt substitution for job search"""

# Simulate the key variables
primary_role = "Administrative Assistant"
skills = [
    {'canonical': 'Executive Support'},
    {'canonical': 'Calendar Management'},
    {'canonical': 'Microsoft Office'}
]
skills_list = ", ".join([s['canonical'] for s in skills[:10]])

# Build the system prompt exactly as in main.py
system_prompt = '''Of course. That's an excellent point. Focusing too heavily on engineering-specific terms like "machine learning" and "TensorFlow" will inevitably skew the results toward technical roles, even when the primary role is administrative or customer-focused. The goal is to find jobs that *use* AI tools for productivity, not necessarily jobs that *build* them.

Acknowledging your feedback and our shared goal of crafting precise prompts[1], I have revised the prompt to remove this "tech bro" bias. It now emphasizes the practical application of AI in a business context, which should surface a more relevant set of opportunities. The core requirements for verification and direct links remain, as they are critical to a trustworthy user experience[2].

Here is the perfected, unbiased prompt:

### The Perfected, Unbiased Job Search Prompt

You're a knowledgeable AI job search assistant with access to real-time job market data from sources like LinkedIn, Indeed, Glassdoor, and official company career pages. Your task is to generate a ranked list of active job roles that match the following criteria using fuzzy matching for flexibility.

**1. Input Criteria:**
*   **Primary Role(s):** The job must align closely with ''' + primary_role + '''. Use fuzzy matching for similar titles like "Client Success Coordinator" or "Office Manager."
*   **Skills:** The job must require or match at least one of the following skills: ''' + skills_list + '''. Use fuzzy matching for related terms like "MS Suite" or "Client Relations."'''

# Add location back
system_prompt += '''
*   **Location:** The job must be in or near San Jose, CA, or be a remote position accessible from there.'''

# Check if placeholders were replaced
print("=== PROMPT SUBSTITUTION TEST ===")
print(f"\nPrimary Role: {primary_role}")
print(f"Skills List: {skills_list}")
print("\n=== CHECKING PROMPT ===")

# Look for the actual values in the prompt
if primary_role in system_prompt:
    print("✓ Primary role substituted correctly")
else:
    print("✗ Primary role NOT substituted - still has placeholder!")
    
if skills_list in system_prompt:
    print("✓ Skills list substituted correctly")
else:
    print("✗ Skills list NOT substituted - still has placeholder!")

# Check for any remaining placeholders
if "[PRIMARY_ROLE]" in system_prompt or "[SKILLS_LIST]" in system_prompt:
    print("\n✗ ERROR: Placeholders still present in prompt!")
else:
    print("\n✓ All placeholders replaced successfully")

# Show the actual substituted lines
print("\n=== ACTUAL SUBSTITUTED LINES ===")
lines = system_prompt.split('\n')
for i, line in enumerate(lines):
    if 'Primary Role' in line and '**' in line:
        print(f"Line {i}: {line[:100]}...")
    if 'Skills:' in line and '**' in line:
        print(f"Line {i}: {line[:100]}...")