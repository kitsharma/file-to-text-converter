#!/bin/bash

echo "=== Perplexity API Key Setup Guide ==="
echo ""
echo "To use the job search feature, you need a Perplexity API key."
echo ""
echo "Steps to get your API key:"
echo "1. Go to: https://www.perplexity.ai/settings/api"
echo "2. Sign in or create an account"
echo "3. Generate an API key"
echo "4. Copy the key (it starts with 'pplx-')"
echo ""
echo "Current status:"

# Check if API key is configured
if grep -q "PERPLEXITY_API_KEY=your_perplexity_api_key_here" .env; then
    echo "❌ API key is NOT configured (still using placeholder)"
    echo ""
    echo "To fix, edit .env and replace line 32:"
    echo "  PERPLEXITY_API_KEY=your_perplexity_api_key_here"
    echo "With:"
    echo "  PERPLEXITY_API_KEY=pplx-YOUR_ACTUAL_KEY_HERE"
else
    API_KEY=$(grep "^PERPLEXITY_API_KEY=" .env | cut -d'=' -f2)
    if [[ $API_KEY == pplx-* ]]; then
        echo "✅ API key appears to be configured (starts with 'pplx-')"
        echo ""
        echo "If you're still getting errors, verify:"
        echo "1. The key is valid and not expired"
        echo "2. You have API credits available"
        echo "3. The server was restarted after updating .env"
    else
        echo "⚠️  API key is set but doesn't look like a Perplexity key"
        echo "   Perplexity keys start with 'pplx-'"
    fi
fi

echo ""
echo "After updating .env, restart the server:"
echo "  pkill -f 'python main.py'"
echo "  source venv/bin/activate && python main.py"