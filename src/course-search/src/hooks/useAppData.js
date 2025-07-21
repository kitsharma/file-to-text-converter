import { useState, useEffect } from 'react';

/**
 * Custom hook for fetching and caching app data
 * Uses sessionStorage for caching and /api/data endpoint
 * Following 2025 best practices for data fetching
 */
export function useAppData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppData();
  }, []);

  const fetchAppData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check sessionStorage cache first
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        // Still fetch fresh data in background for next time
        fetchFreshData();
        return;
      }

      // If no cache, fetch fresh data
      await fetchFreshData();
    } catch (err) {
      console.error('Error fetching app data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchFreshData = async () => {
    try {
      const response = await fetch('/api/data');
      
      if (!response.ok) {
        // Fallback to direct file loading if API fails
        console.warn('API endpoint failed, falling back to direct file loading');
        const fallbackData = await loadFallbackData();
        setData(fallbackData);
        setCachedData(fallbackData);
        setLoading(false);
        return;
      }

      const freshData = await response.json();
      setData(freshData);
      setCachedData(freshData);
      setLoading(false);
    } catch (err) {
      // Final fallback to direct file loading
      console.warn('API fetch failed, using direct file loading:', err);
      try {
        const fallbackData = await loadFallbackData();
        setData(fallbackData);
        setCachedData(fallbackData);
      } catch (fallbackErr) {
        console.error('All data loading methods failed:', fallbackErr);
        setError('Failed to load application data');
      }
      setLoading(false);
    }
  };

  const loadFallbackData = async () => {
    const [trendsResponse, opportunitiesResponse] = await Promise.all([
      fetch('/trends_data.json'),
      fetch('/opportunities_data.json')
    ]);

    if (!trendsResponse.ok || !opportunitiesResponse.ok) {
      throw new Error('Failed to load fallback data files');
    }

    const trends = await trendsResponse.json();
    const opportunities = await opportunitiesResponse.json();

    return {
      trends,
      opportunities,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0-fallback',
        source: 'direct-files'
      }
    };
  };

  const getCachedData = () => {
    try {
      const cached = sessionStorage.getItem('appData');
      if (!cached) return null;

      const parsedCache = JSON.parse(cached);
      const cacheAge = Date.now() - parsedCache.timestamp;
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

      if (cacheAge > CACHE_DURATION) {
        sessionStorage.removeItem('appData');
        return null;
      }

      return parsedCache.data;
    } catch (error) {
      console.warn('Error reading cache:', error);
      sessionStorage.removeItem('appData');
      return null;
    }
  };

  const setCachedData = (newData) => {
    try {
      const cacheObject = {
        data: newData,
        timestamp: Date.now()
      };
      sessionStorage.setItem('appData', JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Error setting cache:', error);
    }
  };

  const refreshData = () => {
    sessionStorage.removeItem('appData');
    fetchAppData();
  };

  return {
    data,
    loading,
    error,
    refreshData,
    trends: data?.trends || null,
    opportunities: data?.opportunities || [],
    metadata: data?.metadata || null
  };
}