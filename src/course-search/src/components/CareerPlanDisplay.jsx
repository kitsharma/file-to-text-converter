import React, { useState, useEffect } from 'react';
import { generatePlan, analyzeSkillGaps, getPersonalizedRecommendations } from '../utils/generatePlan';

const CareerPlanDisplay = ({ userProfile, onPlanGenerated }) => {
  const [plan, setPlan] = useState(null);
  const [skillGaps, setSkillGaps] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('shortTerm');
  const [opportunitiesData, setOpportunitiesData] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  // Load opportunities data on component mount
  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await fetch('/opportunities_data.json');
        if (response.ok) {
          const data = await response.json();
          setOpportunitiesData(data);
        }
      } catch (error) {
        console.warn('Could not load opportunities data:', error);
      }
    };

    fetchOpportunities();
  }, []);

  const handleGeneratePlan = async () => {
    if (!userProfile?.role) {
      alert('Please provide a role to generate your career plan.');
      return;
    }

    setIsGenerating(true);
    setAnnouncement('Generating your personalized career plan...');
    
    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generatedPlan = generatePlan(userProfile, opportunitiesData);
      const gaps = analyzeSkillGaps(userProfile.role, userProfile.currentSkills || []);
      const recs = getPersonalizedRecommendations(generatedPlan);
      
      setPlan(generatedPlan);
      setSkillGaps(gaps);
      setRecommendations(recs);
      setAnnouncement(`Career plan generated successfully. ${generatedPlan.shortTerm.actions.length} short-term goals and ${generatedPlan.longTerm.actions.length} long-term goals identified.`);
      
      if (onPlanGenerated) {
        onPlanGenerated(generatedPlan);
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      setAnnouncement('Failed to generate career plan. Please try again.');
      alert('Failed to generate career plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTimeframe = (timeframe) => {
    const date = new Date();
    if (timeframe.includes('12 months')) {
      date.setFullYear(date.getFullYear() + 1);
    } else if (timeframe.includes('1-3 years')) {
      date.setFullYear(date.getFullYear() + 3);
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const renderSkillGapAnalysis = () => {
    if (!skillGaps) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 00-2 2H9z" />
          </svg>
          Skill Gap Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {skillGaps.overallReadiness}%
            </div>
            <div className="text-sm text-secondary-600">Overall Readiness</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {skillGaps.existingStrengths.length}
            </div>
            <div className="text-sm text-secondary-600">Current Strengths</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {skillGaps.criticalGaps.length}
            </div>
            <div className="text-sm text-secondary-600">Critical Gaps</div>
          </div>
        </div>

        {skillGaps.criticalGaps.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-secondary-800 mb-2">Priority Skills to Develop:</h4>
            <div className="flex flex-wrap gap-2">
              {skillGaps.criticalGaps.map((skill, index) => (
                <span key={index} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlanSection = (section, type) => {
    const isActive = activeTab === type;
    const bgColor = type === 'shortTerm' ? 'bg-green-50' : 'bg-purple-50';
    const borderColor = type === 'shortTerm' ? 'border-green-200' : 'border-purple-200';
    const iconColor = type === 'shortTerm' ? 'text-green-600' : 'text-purple-600';

    return (
      <div className={`${bgColor} ${borderColor} border rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-800 flex items-center">
            <svg className={`w-5 h-5 mr-2 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={type === 'shortTerm' ? 
                      "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : 
                      "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"} />
            </svg>
            {section.title}
          </h3>
          <div className="text-right">
            <div className="text-sm text-secondary-600">{section.timeframe}</div>
            <div className="text-xs text-secondary-500">Target: {formatTimeframe(section.timeframe)}</div>
          </div>
        </div>

        <div className="space-y-3">
          {section.actions.map((action, index) => {
            const actionText = typeof action === 'string' ? action : action.text;
            const actionOpportunity = typeof action === 'object' ? action.opportunity : null;
            const requiredSkill = typeof action === 'object' ? action.requiredSkill : null;
            
            return (
              <div key={index} className="flex items-start space-x-3 bg-white rounded-lg p-3 shadow-sm">
                <div className={`flex-shrink-0 w-6 h-6 ${type === 'shortTerm' ? 'bg-green-100' : 'bg-purple-100'} rounded-full flex items-center justify-center`}>
                  <span className={`text-xs font-medium ${iconColor}`}>
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-secondary-700 text-sm mb-2">{actionText}</p>
                  {requiredSkill && (
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="bg-secondary-100 text-secondary-600 px-2 py-1 rounded">
                        Skill: {requiredSkill}
                      </span>
                      {actionOpportunity && (
                        <a
                          href={actionOpportunity.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center bg-primary-100 text-primary-700 px-2 py-1 rounded hover:bg-primary-200 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Recommended: {actionOpportunity.title}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {section.focusAreas && (
          <div className="mt-4">
            <h4 className="font-medium text-secondary-800 mb-2">Key Focus Areas:</h4>
            <div className="flex flex-wrap gap-2">
              {section.focusAreas.map((area, index) => (
                <span key={index} className={`${type === 'shortTerm' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'} px-3 py-1 rounded-full text-sm`}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {section.estimatedTimeCommitment && (
          <div className="mt-3 text-sm text-secondary-600">
            <strong>Time Commitment:</strong> {section.estimatedTimeCommitment}
          </div>
        )}

        {section.milestones && (
          <div className="mt-4">
            <h4 className="font-medium text-secondary-800 mb-2">Key Milestones:</h4>
            <div className="space-y-2">
              {section.milestones.map((milestone, index) => (
                <div key={index} className="text-sm text-secondary-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {milestone}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!plan) {
    return (
      <>
        {/* Screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-primary-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h2 className="text-2xl font-semibold text-secondary-800 mb-2">
            Ready to Plan Your Career Path?
          </h2>
          <p className="text-secondary-600 mb-6">
            Generate a personalized career development plan based on your role, experience, and goals.
          </p>
        </div>

        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating || !userProfile?.role}
          className="btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <div className="loading-spinner mr-3"></div>
              Generating Your Plan...
            </span>
          ) : (
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Career Plan
            </span>
          )}
        </button>

        {!userProfile?.role && (
          <p className="text-sm text-red-600 mt-4">
            Please provide your role information to generate a plan.
          </p>
        )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-secondary-800 flex items-center">
            <svg className="w-6 h-6 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Your Personalized Career Plan
          </h2>
          <p className="text-secondary-600">
            Generated for {plan.profile.role} • {plan.profile.experience} level
          </p>
        </div>
        <button
          onClick={handleGeneratePlan}
          className="btn-secondary text-sm"
        >
          Regenerate Plan
        </button>
      </div>

      {renderSkillGapAnalysis()}

      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Personalized Recommendations
          </h3>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-blue-800 text-sm">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderPlanSection(plan.shortTerm, 'shortTerm')}
        {renderPlanSection(plan.longTerm, 'longTerm')}
      </div>

      <div className="mt-6 text-center text-sm text-secondary-500">
        Plan generated on {new Date(plan.generatedAt).toLocaleDateString()} • 
        Next review recommended: {new Date(plan.nextReviewDate).toLocaleDateString()}
      </div>
      </div>
    </>
  );
};

export default CareerPlanDisplay;