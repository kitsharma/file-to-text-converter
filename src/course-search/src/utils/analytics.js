/**
 * Analytics and Performance Monitoring Utilities
 * 2025 Best Practices for Web Vitals and User Interaction Tracking
 */

import { useEffect } from 'react';

// Performance monitoring for Core Web Vitals
export function reportWebVitals(metric) {
  // In production, you would send this to your analytics service
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}:`, metric.value, metric.unit);
  }
  
  // Example: Send to analytics service
  // analytics.track('web_vital', {
  //   name: metric.name,
  //   value: metric.value,
  //   unit: metric.unit,
  //   id: metric.id
  // });
}

// User interaction tracking
export function trackUserAction(action, properties = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] User Action: ${action}`, properties);
  }
  
  // Example: Send to analytics service
  // analytics.track(action, {
  //   timestamp: Date.now(),
  //   url: window.location.href,
  //   ...properties
  // });
}

// Error tracking
export function trackError(error, context = {}) {
  console.error(`[Error Tracking]`, error, context);
  
  // Example: Send to error tracking service
  // errorTracking.captureException(error, {
  //   extra: context,
  //   tags: {
  //     section: context.component || 'unknown'
  //   }
  // });
}

// Custom hook for tracking page views
export function usePageTracking(pageName) {
  useEffect(() => {
    trackUserAction('page_view', {
      page: pageName,
      timestamp: Date.now()
    });
  }, [pageName]);
}

// Custom hook for tracking performance
export function usePerformanceTracking() {
  useEffect(() => {
    // Track page load time
    if ('performance' in window) {
      const loadTime = performance.now();
      trackUserAction('page_load_time', {
        load_time_ms: Math.round(loadTime),
        performance: {
          navigation: performance.getEntriesByType('navigation')[0],
          timing: performance.timing
        }
      });
    }

    // Track Web Vitals when available
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          reportWebVitals({
            name: 'LCP',
            value: lastEntry.startTime,
            unit: 'ms',
            id: 'lcp'
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Fallback for browsers that don't support LCP
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          reportWebVitals({
            name: 'CLS',
            value: clsValue,
            unit: 'score',
            id: 'cls'
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Fallback for browsers that don't support CLS
      }

      // First Input Delay (FID) - approximated
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            reportWebVitals({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              unit: 'ms',
              id: 'fid'
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Fallback for browsers that don't support FID
      }
    }
  }, []);
}

// Feature usage tracking
export function trackFeatureUsage(feature, data = {}) {
  trackUserAction('feature_usage', {
    feature,
    ...data,
    session_id: getSessionId()
  });
}

// Session management
let sessionId = null;
function getSessionId() {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

// A/B testing support
export function getVariant(testName, variants = ['control', 'test']) {
  // Simple deterministic A/B testing based on session
  const hash = Array.from(getSessionId()).reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const variantIndex = hash % variants.length;
  const variant = variants[variantIndex];
  
  trackUserAction('ab_test_assignment', {
    test_name: testName,
    variant,
    variants
  });
  
  return variant;
}