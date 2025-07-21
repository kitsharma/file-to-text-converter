import React, { useState, useEffect } from 'react';

const InsightsDisplay = ({ jobRole = 'default' }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate 1 second loading animation as required
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await fetch('/trends_data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch trends data');
        }
        
        const data = await response.json();
        
        // Map unlisted roles to default or similar roles
        const roleMapping = {
          'Data Scientist': 'Data Scientist',
          'Software Developer': 'Software Engineer',
          'Web Developer': 'Software Engineer',
          'Frontend Developer': 'Software Engineer',
          'Backend Developer': 'Software Engineer',
          'Full Stack Developer': 'Software Engineer',
          'Marketing Specialist': 'Marketing',
          'Digital Marketing': 'Marketing',
          'Product Manager': 'Product Manager',
          'Project Manager': 'Product Manager',
          'Administrative Assistant': 'Administrative Assistant',
          'Executive Assistant': 'Administrative Assistant',
          'Virtual Assistant': 'Administrative Assistant',
          'HR Specialist': 'Human Resources',
          'Human Resources': 'Human Resources',
          'Sales Representative': 'Sales',
          'Sales Manager': 'Sales',
          'Customer Support': 'Customer Support',
          'Customer Service': 'Customer Support',
          'Technical Support': 'Customer Support',
          'Financial Analyst': 'Finance',
          'Accountant': 'Finance',
          'Designer': 'Design',
          'UX Designer': 'Design',
          'UI Designer': 'Design',
          'Graphic Designer': 'Design',
          'default': 'default'
        };
        
        const mappedRole = roleMapping[jobRole] || 'default';
        const roleData = data[mappedRole] || data.default;
        
        setInsights(roleData.insights);
        setLastUpdated(roleData.lastUpdated);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError(err.message);
        // Fallback to default insights
        setInsights(['AI is transforming all fields—upskill now!']);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [jobRole]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 animate-fade-in">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="loading-spinner"></div>
          <h2 className="text-xl font-semibold text-secondary-800">
            Loading AI Industry Insights...
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-secondary-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Unable to Load Insights
        </h2>
        <p className="text-red-600">
          {error}. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-secondary-800 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          AI Industry Insights
          {jobRole !== 'default' && (
            <span className="ml-2 text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
              {jobRole}
            </span>
          )}
        </h2>
        {lastUpdated && (
          <span className="text-sm text-secondary-500">
            Updated: {new Date(lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
          >
            <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
            <p className="text-secondary-700 leading-relaxed">
              {insight}
            </p>
          </div>
        ))}
      </div>
      
      {jobRole !== 'default' && (
        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="text-sm text-blue-800">
            <strong>💡 Career Tip:</strong> These insights are specifically tailored for {jobRole} roles. 
            Consider developing skills in the highlighted areas to stay competitive in 2025.
          </p>
        </div>
      )}
    </div>
  );
};

export default InsightsDisplay;