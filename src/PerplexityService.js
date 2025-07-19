/**
 * Perplexity AI Service - Simple direct API integration
 */

export class PerplexityService {
  constructor() {
    this.apiUrl = 'https://api.perplexity.ai/chat/completions';
    this.apiKey = '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';
    this.rateLimit = 20;
    this.timeout = 15000;
    
    this.requestCount = 0;
    this.lastReset = Date.now();
    
    console.log('🧠 Perplexity Service initialized');
  }

  /**
   * Extract primary role from resume text
   */
  extractPrimaryRole(resumeText) {
    const lowerText = resumeText.toLowerCase();
    
    const rolePatterns = [
      /(?:current|present|now)\s+(?:position|role|job|title):\s*([^\.]+)/i,
      /(?:software|web|mobile|frontend|backend|full[\s-]?stack)\s+(?:engineer|developer|programmer)/i,
      /(?:data|business|financial|marketing|sales|project|product|operations)\s+(?:analyst|manager|specialist|coordinator)/i,
      /(?:accountant|accounting|bookkeeper|cpa)/i,
      /(?:teacher|educator|instructor|professor)/i,
      /(?:nurse|doctor|physician|healthcare|medical)/i,
      /(?:designer|artist|creative|ux|ui)/i,
      /(?:consultant|advisor|specialist)/i
    ];
    
    for (const pattern of rolePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        return match[0].replace(/^\w+\s+/, '').trim();
      }
    }
    
    const jobTitles = [
      'software engineer', 'web developer', 'data analyst', 'project manager',
      'business analyst', 'accountant', 'sales manager', 'marketing specialist',
      'teacher', 'nurse', 'designer', 'consultant'
    ];
    
    for (const title of jobTitles) {
      if (lowerText.includes(title)) {
        return title;
      }
    }
    
    return 'professional';
  }

  /**
   * Identify relevant industries from resume and skills
   */
  identifyIndustries(resumeText, skills) {
    const industries = [];
    const lowerText = resumeText.toLowerCase();
    
    const industryMap = {
      'technology': ['software', 'programming', 'development', 'tech', 'it', 'computer'],
      'healthcare': ['medical', 'hospital', 'nurse', 'doctor', 'patient', 'clinical'],
      'finance': ['bank', 'financial', 'accounting', 'investment', 'insurance', 'audit'],
      'education': ['school', 'university', 'teaching', 'student', 'academic', 'curriculum'],
      'retail': ['sales', 'customer', 'store', 'merchandise', 'retail', 'commerce'],
      'manufacturing': ['production', 'manufacturing', 'operations', 'supply chain', 'quality'],
      'consulting': ['consulting', 'advisory', 'client', 'strategy', 'solutions']
    };
    
    for (const [industry, keywords] of Object.entries(industryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        industries.push(industry);
      }
    }
    
    const skillsText = skills.join(' ').toLowerCase();
    for (const [industry, keywords] of Object.entries(industryMap)) {
      if (keywords.some(keyword => skillsText.includes(keyword))) {
        if (!industries.includes(industry)) {
          industries.push(industry);
        }
      }
    }
    
    return industries.length > 0 ? industries : ['technology', 'business services', 'consulting'];
  }

  /**
   * Build the Perplexity query
   */
  buildPerplexityQuery(resumeText, skills, primaryRole, industries) {
    const query = {
      "model": "llama-3.1-sonar-large-128k-online",
      "messages": [
        {
          "role": "system",
          "content": `You are a job search assistant. CRITICAL RULES:
1. Extract the PRIMARY ROLE from the resume (e.g., "Executive Assistant", "Data Analyst")
2. ONLY return jobs that match this PRIMARY ROLE - DO NOT return unrelated jobs
3. Look for AI tools mentioned in job descriptions (ChatGPT, automation, AI-powered tools)
4. Return as JSON with jobMatches array
5. Each job must include: title, company, location, salary, description, link, aiSkillsTools, matchingSkills
6. NEVER CREATE FICTIONAL CONTENT - If no real jobs found, return empty jobMatches array
7. NEVER make up company names, job links, or job descriptions - use only real data from search results
8. If insufficient real data is available, return fewer jobs rather than fictional ones`
        },
        {
          "role": "user",
          "content": `Based on the uploaded resume with primary role '${primaryRole}', search for 10-20 similar job roles in related industries posted within the last 30 days that require matching skills AND explicit AI tools. For each role, provide: job title, company name, matching skills from resume, AI skills/tools mentioned, and direct link to the company's official career page. Target industries like ${industries.join(', ')}.`
        }
      ],
      "web_search_options": {
        "search_context_size": "high",
        "search_domain_filter": ["official company career pages", "reputable job boards like LinkedIn, Indeed"]
      },
      "return_citations": true,
      "return_related_questions": true,
      "max_tokens": 2000
    };
    
    return query;
  }

  /**
   * Check rate limits
   */
  checkRateLimit() {
    const now = Date.now();
    const timeSinceReset = now - this.lastReset;
    
    if (timeSinceReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    if (this.requestCount >= this.rateLimit) {
      const waitTime = 60000 - timeSinceReset;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  /**
   * Query Perplexity AI directly
   */
  async queryPerplexity(resumeText, skills, statusCallback = null) {
    try {
      this.checkRateLimit();
      this.requestCount++;
      
      if (statusCallback) {
        statusCallback('🔄 Analyzing your profile...');
      }
      
      const primaryRole = this.extractPrimaryRole(resumeText);
      const industries = this.identifyIndustries(resumeText, skills);
      
      if (statusCallback) {
        statusCallback(`👤 Role: ${primaryRole} | Industries: ${industries.join(', ')}`);
      }
      
      const query = this.buildPerplexityQuery(resumeText, skills, primaryRole, industries);
      
      if (statusCallback) {
        statusCallback('🌐 Searching job market...');
      }
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (statusCallback) {
        statusCallback('✅ Processing results...');
      }
      
      // Store debug information
      const debugInfo = {
        extractedRole: primaryRole,
        extractedIndustries: industries,
        extractedSkills: skills,
        queryUsed: query,
        rawResponse: data
      };
      
      return {
        success: true,
        jobs: this.parseJobResults(data),
        citations: data.citations || [],
        debug: debugInfo,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Job search failed:', error);
      
      return {
        success: false,
        error: error.message,
        jobs: [],
        citations: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse job results from Perplexity response
   */
  parseJobResults(data) {
    try {
      const content = data.choices[0].message.content;
      
      // Try to parse JSON from response
      try {
        const parsedContent = JSON.parse(content);
        if (parsedContent.jobMatches && Array.isArray(parsedContent.jobMatches)) {
          return parsedContent.jobMatches;
        }
      } catch (directParseError) {
        // Try markdown JSON block format
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            const parsedMarkdownJson = JSON.parse(jsonMatch[1]);
            if (parsedMarkdownJson.jobMatches && Array.isArray(parsedMarkdownJson.jobMatches)) {
              return parsedMarkdownJson.jobMatches;
            }
          } catch (markdownParseError) {
            console.error('Failed to parse markdown JSON:', markdownParseError);
          }
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing job results:', error);
      return [];
    }
  }

  /**
   * Provide fallback response when Perplexity is unavailable
   */
  getFallbackResponse(primaryRole) {
    return {
      message: `Perplexity AI is currently unavailable. Here's what we know about ${primaryRole} roles:`,
      suggestions: [
        '• AI-enhanced roles are becoming common across all industries',
        '• Consider roles that combine your expertise with AI tools',
        '• Look for positions mentioning AI analytics, automation, or intelligent systems',
        '• Many companies are seeking professionals who can bridge traditional skills with AI'
      ],
      industries: ['Technology', 'Consulting', 'Finance', 'Healthcare'],
      note: 'This is a fallback response. Try again later for live job market data.'
    };
  }
}