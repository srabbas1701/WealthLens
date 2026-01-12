/**
 * Portfolio Analytics API Service
 * 
 * Centralized API service layer for portfolio analytics.
 * All API calls must go through this service.
 * No direct fetch calls in components.
 */

import type { PortfolioHealthScore } from '@/lib/portfolio-intelligence/health-score';
import type { StabilityAnalysis } from '@/lib/portfolio-intelligence/stability-analytics';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch Portfolio Health Score
 */
export async function fetchPortfolioHealthScore(
  userId: string
): Promise<ApiResponse<PortfolioHealthScore>> {
  try {
    const response = await fetch(`/api/portfolio/health-score?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Portfolio Analytics Service] Error fetching health score:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health score',
    };
  }
}

/**
 * Fetch Stability Analytics
 */
export async function fetchStabilityAnalytics(
  userId: string
): Promise<ApiResponse<StabilityAnalysis>> {
  try {
    const response = await fetch(`/api/portfolio/stability-analytics?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Portfolio Analytics Service] Error fetching stability analytics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stability analytics',
    };
  }
}