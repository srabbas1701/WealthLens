/**
 * Web Vitals Monitoring Hook
 * 
 * Measures and reports Core Web Vitals (performance metrics) to track real-world performance.
 * 
 * Features:
 * - Measures 5 Core Web Vitals: CLS, FID, FCP, LCP, TTFB
 * - Logs metrics to console in development mode
 * - Sends metrics to API endpoint in production mode
 * - Lazy loads web-vitals library to avoid bundle bloat
 * - Completely non-blocking and error-safe
 * 
 * Usage:
 *   function Dashboard() {
 *     useWebVitals(); // Just call it, that's all
 *     // ... rest of component
 *   }
 */

'use client';

import { useEffect } from 'react';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function useWebVitals() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Lazy load web-vitals library
    let isMounted = true;
    let webVitalsModule: any = null;

    const loadWebVitals = async () => {
      try {
        // Dynamic import to avoid bundle bloat
        webVitalsModule = await import('web-vitals');
      } catch (error) {
        console.warn('[Web Vitals] Failed to load web-vitals library:', error);
        return;
      }

      if (!isMounted || !webVitalsModule) {
        return;
      }

      const { onCLS, onFID, onFCP, onLCP, onTTFB } = webVitalsModule;

      // Helper function to format metric for logging/API
      const handleMetric = (metric: WebVitalMetric) => {
        const { name, value, rating, delta, id } = metric;
        
        // In development: Log to console
        if (process.env.NODE_ENV === 'development') {
          const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
          console.log(
            `[Web Vitals] ${emoji} ${name}: ${value.toFixed(2)}ms (${rating})`,
            { delta, id }
          );
        }

        // In production: Send to API
        if (process.env.NODE_ENV === 'production') {
          sendMetricToAPI({
            name,
            value,
            rating,
            delta,
            id,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }).catch((error) => {
            // Silently fail - don't break the app if monitoring fails
            console.warn('[Web Vitals] Failed to send metric to API:', error);
          });
        }
      };

      // Measure all 5 Core Web Vitals
      try {
        onCLS(handleMetric);
        onFID(handleMetric);
        onFCP(handleMetric);
        onLCP(handleMetric);
        onTTFB(handleMetric);
      } catch (error) {
        console.warn('[Web Vitals] Error setting up metrics:', error);
      }
    };

    // Load web-vitals library
    loadWebVitals();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []); // Empty deps - only run once on mount
}

/**
 * Send metric to API endpoint
 */
async function sendMetricToAPI(metric: {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: string;
  userAgent: string;
  url: string;
}) {
  try {
    const response = await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    // Silently fail - don't break the app if API call fails
    throw error;
  }
}
