#!/bin/bash
echo "=== DEFINITIVE TEST: Why 'Not specified' appears ==="
echo ""
echo "1. Testing with actual resume data..."
echo ""

# Create a test resume
cat > test_admin_resume.txt << 'EOF'
Jane Smith
Administrative Assistant
jane.smith@email.com

EXPERIENCE
Executive Assistant | Fortune 500 Company | 2019-Present
• Managed executive calendars and travel arrangements
• Coordinated meetings and events
• Handled confidential documents
• Proficient in Microsoft Office Suite

SKILLS
Administrative Support, Calendar Management, Executive Support, 
Microsoft Office, Communication, Problem Solving
EOF

echo "2. Sending resume to API..."
curl -s -X POST http://localhost:8000/api/jobs/search \
  -H "Content-Type: application/json" \
  -d "{\"resumeText\": \"$(cat test_admin_resume.txt | tr '\n' ' ')\"}" \
  > api_response.json

echo ""
echo "3. Checking what was returned..."
echo ""
echo "Jobs returned:"
python3 -c "import json; d=json.load(open('api_response.json')); print(f'  - First job title: {d[\"jobs\"][0][\"title\"]}'); print(f'  - Company: {d[\"jobs\"][0][\"company\"]}')"
echo ""
echo "Message field:"
python3 -c "import json; d=json.load(open('api_response.json')); print(f'  {d.get(\"message\", \"No message field\")}')"
echo ""
echo "4. THE KEY INSIGHT:"
echo "   - If you see 'Demo mode: Configure PERPLEXITY_API_KEY', then we never called Perplexity"
echo "   - The 'Not specified' you saw was from a DIFFERENT source (maybe the UI itself)"
echo "   - Your fixes to the prompt were correct but irrelevant because API was never called"