import React, { useState, useEffect } from 'react';

const OpportunitiesList = ({ field = null }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);

  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const response = await fetch('/opportunities_data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch opportunities data');
        }
        
        const data = await response.json();
        setOpportunities(data);
        
        // Filter opportunities based on field
        if (field) {
          const filtered = data.filter(opportunity => 
            opportunity.tags.some(tag => 
              tag.toLowerCase().includes(field.toLowerCase()) ||
              field.toLowerCase().includes(tag.toLowerCase())
            )
          );
          setFilteredOpportunities(filtered);
        } else {
          setFilteredOpportunities(data);
        }
      } catch (err) {
        console.error('Error fetching opportunities:', err);
        setError(err.message);
        setFilteredOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [field]);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const formatPrice = (price) => {
    if (price.toLowerCase() === 'free') {
      return <span className="text-green-600 font-semibold">Free</span>;
    }
    return <span className="text-secondary-700">{price}</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="loading-spinner"></div>
          <h2 className="text-xl font-semibold text-secondary-800">
            Loading Learning Opportunities...
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-secondary-100 rounded-lg p-4 space-y-3">
                <div className="h-4 bg-secondary-200 rounded w-3/4"></div>
                <div className="h-3 bg-secondary-200 rounded w-full"></div>
                <div className="h-3 bg-secondary-200 rounded w-2/3"></div>
              </div>
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
          Unable to Load Learning Opportunities
        </h2>
        <p className="text-red-600">
          {error}. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Skill-Building Opportunities
          {field && (
            <span className="ml-2 text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
              {field}
            </span>
          )}
        </h2>
        <span className="text-sm text-secondary-500">
          {filteredOpportunities.length} courses found
        </span>
      </div>

      {filteredOpportunities.length === 0 ? (
        <div className="text-center py-8 text-secondary-500">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-secondary-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p>No courses found for the selected field.</p>
          <p className="text-sm">Try searching for a different field or check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className="border border-secondary-200 rounded-lg p-5 card-hover bg-white"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(opportunity.difficulty)}`}>
                  {opportunity.difficulty}
                </span>
                <div className="flex items-center text-sm text-secondary-500">
                  <svg className="w-4 h-4 mr-1 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {opportunity.rating}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-secondary-900 mb-2 line-clamp-2">
                {opportunity.title}
              </h3>
              
              <p className="text-sm text-secondary-600 mb-3 line-clamp-3">
                {opportunity.description}
              </p>
              
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {opportunity.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {opportunity.tags.length > 3 && (
                    <span className="text-xs text-secondary-500 px-2 py-1">
                      +{opportunity.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm text-secondary-500 mb-4">
                <span>{opportunity.provider}</span>
                <span>{opportunity.duration}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  {formatPrice(opportunity.price)}
                </div>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm px-3 py-2 inline-flex items-center"
                >
                  Learn More
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              <strong>Affiliate Disclosure:</strong> Some course links are affiliate partnerships. 
              We may earn a commission if you enroll, at no additional cost to you. This helps support our platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunitiesList;