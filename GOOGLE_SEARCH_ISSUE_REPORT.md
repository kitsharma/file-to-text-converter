# Google Job Search Integration Issue Report

## Executive Summary
The Google Custom Search API is returning search result pages instead of actual job postings, leading to broken links and poor user experience.

## Current Issues

### 1. **Incorrect Result Types**
- Getting: Search result pages from Indeed/LinkedIn
- Expected: Direct links to job postings
- Impact: All "View Job" links are broken (404 errors)

### 2. **Missing Job Details**
- No company names extracted ("Company Not Listed")
- No locations extracted ("Location Not Specified")
- Job descriptions are just snippets of search pages

### 3. **Examples of Broken Results**
```
"Automation Assistant Jobs, Employment | Indeed" ❌
"Administrative Assistant Remote Jobs, Employment in Ohio | Indeed" ❌
"Office Automation Assistant Jobs, Employment | Indeed" ❌
```

## Root Cause Analysis

The Google Custom Search API is designed for general web search, not job-specific searches. When searching job sites, it returns:
- Category/search pages instead of individual job listings
- Meta descriptions instead of job descriptions
- No structured job data

## Recommendations for Product Owner

### Option 1: Use Dedicated Job APIs (Recommended)
- **Indeed API**: Direct access to job listings with structured data
- **LinkedIn Jobs API**: Professional job postings with company info
- **Adzuna API**: Aggregates multiple job boards
- **TheJobs API**: Free tier available, good coverage

### Option 2: Improve Google Search Implementation
If we must use Google Custom Search:
1. **Exclude search result pages**: Add `-inurl:search -inurl:jobs/search`
2. **Target specific job posting patterns**: Look for URLs like `/job/` or `/careers/`
3. **Use structured data queries**: Add `more:pagemap:job` to find pages with job schema
4. **Parse job posting pages**: Extract actual job details from the pages

### Option 3: Hybrid Approach
1. Keep Perplexity for AI-enhanced job matching
2. Add one dedicated job API for reliable results
3. Use Google only as a fallback

## Immediate Actions Needed

1. **Disable Google search** until properly implemented
2. **Research and select** a proper job search API
3. **Update UI** to set correct expectations
4. **Add validation** to ensure links work before showing to users

## Sample Better Query Format
Instead of current approach, consider:
```
site:indeed.com/viewjob OR site:linkedin.com/jobs/view 
"Administrative Assistant" "San Jose" 
-inurl:search -inurl:mobileapps
```

## Conclusion
The current implementation damages user trust by showing non-functional links. We need either a proper job API or significant improvements to the Google search approach.