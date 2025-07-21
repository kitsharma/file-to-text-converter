/**
 * Serverless function for Vercel
 * Returns combined trends and opportunities data
 * Following 2025 best practices for concurrency and caching
 */

import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Enable CORS for all origins (configure for production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    
    // Read both data files concurrently (2025 best practice)
    const [trendsData, opportunitiesData] = await Promise.all([
      readDataFile('trends_data.json'),
      readDataFile('opportunities_data.json')
    ]);

    // Combine data with metadata
    const combinedData = {
      trends: trendsData,
      opportunities: opportunitiesData,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        totalTrends: Object.keys(trendsData).length,
        totalOpportunities: opportunitiesData.length
      }
    };

    res.status(200).json(combinedData);
  } catch (error) {
    console.error('Error serving data:', error);
    res.status(500).json({ 
      error: 'Failed to load data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Helper function to read and parse JSON data files
 * @param {string} filename - Name of the JSON file to read
 * @returns {Promise<Object>} - Parsed JSON data
 */
async function readDataFile(filename) {
  try {
    // In Vercel serverless functions, files are in the public directory
    const filePath = path.join(process.cwd(), 'public', filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn(`Could not read ${filename}, using fallback data:`, error.message);
    
    // Provide fallback data if files are not found
    if (filename === 'trends_data.json') {
      return {
        default: {
          insights: ["AI is transforming all fields—upskill now!"],
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      };
    } else if (filename === 'opportunities_data.json') {
      return [{
        id: 'fallback-course',
        title: 'AI Fundamentals for Professionals',
        description: 'Learn essential AI concepts for modern professionals.',
        url: 'https://example.com/ai-course',
        provider: 'Example Academy',
        tags: ['AI', 'Professional Development'],
        difficulty: 'Beginner',
        duration: '4 weeks',
        price: 'Free',
        rating: 4.5,
        enrollments: 1000
      }];
    }
    
    return {};
  }
}