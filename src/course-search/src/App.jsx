import React, { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import InsightsDisplay from './components/InsightsDisplay';
import OpportunitiesList from './components/OpportunitiesList';
import CareerPlanDisplay from './components/CareerPlanDisplay';
import { usePerformanceTracking, trackUserAction, trackFeatureUsage } from './utils/analytics';
import './index.css';

function App() {
  const { data, loading, error, refreshData } = useAppData();
  const [userProfile, setUserProfile] = useState({
    role: 'Software Engineer',
    experience: 'mid',
    goals: ['tech lead', 'leadership'],
    currentSkills: ['JavaScript', 'React', 'Python']
  });
  const [showCareerPlan, setShowCareerPlan] = useState(false);
  
  // Performance monitoring
  usePerformanceTracking();

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">
            Loading AI Career Platform
          </h2>
          <p className="text-secondary-600">
            Initializing your personalized career insights...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">
            Failed to Load Platform
          </h2>
          <p className="text-secondary-600 mb-4">
            {error}
          </p>
          <button
            onClick={refreshData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleProfileChange = (field, value) => {
    setUserProfile(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Track profile changes
    trackUserAction('profile_update', {
      field,
      value: Array.isArray(value) ? value.join(',') : value
    });
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Skip Navigation for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary-700">
                  AI Career Insights
                </h1>
              </div>
              <nav className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <span className="text-secondary-600 text-sm">
                    Personalized career development with AI
                  </span>
                </div>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {data?.metadata && (
                <span className="text-xs text-secondary-500">
                  Updated: {new Date(data.metadata.lastUpdated).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={refreshData}
                className="text-secondary-400 hover:text-secondary-600"
                title="Refresh data"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Your Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Role
              </label>
              <select
                value={userProfile.role}
                onChange={(e) => handleProfileChange('role', e.target.value)}
                className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="Software Engineer">Software Engineer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Marketing">Marketing</option>
                <option value="Administrative Assistant">Administrative Assistant</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Sales">Sales</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Finance">Finance</option>
                <option value="Design">Design</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Experience Level
              </label>
              <select
                value={userProfile.experience}
                onChange={(e) => handleProfileChange('experience', e.target.value)}
                className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="entry">Entry Level</option>
                <option value="junior">Junior (1-2 years)</option>
                <option value="mid">Mid Level (3-5 years)</option>
                <option value="senior">Senior (5+ years)</option>
                <option value="expert">Expert (10+ years)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Career Goals
              </label>
              <select
                multiple
                value={userProfile.goals}
                onChange={(e) => handleProfileChange('goals', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                size="3"
              >
                <option value="tech lead">Tech Leadership</option>
                <option value="management">Management</option>
                <option value="career change">Career Change</option>
                <option value="skill development">Skill Development</option>
                <option value="entrepreneurship">Entrepreneurship</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={() => setShowCareerPlan(!showCareerPlan)}
                className="btn-primary mb-2"
              >
                {showCareerPlan ? 'Hide' : 'Generate'} Career Plan
              </button>
              <p className="text-xs text-secondary-500">
                {userProfile.currentSkills.length} skills tracked
              </p>
            </div>
          </div>
        </div>

        {/* Career Plan Section */}
        {showCareerPlan && (
          <CareerPlanDisplay 
            userProfile={userProfile}
            onPlanGenerated={(plan) => console.log('Plan generated:', plan)}
          />
        )}

        {/* AI Insights Section */}
        <InsightsDisplay jobRole={userProfile.role} />

        {/* Learning Opportunities Section */}
        <OpportunitiesList field={userProfile.role} />

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-secondary-500">
          <p>
            Powered by AI • Data updated regularly • 
            {data?.metadata && (
              <span className="ml-1">
                {data.metadata.totalTrends} insights • {data.metadata.totalOpportunities} opportunities
              </span>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;