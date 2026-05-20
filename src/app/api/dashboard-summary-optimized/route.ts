/**
 * GET /api/dashboard-summary-optimized
 *
 * Optimized dashboard data endpoint that fetches all required data in parallel
 * using Promise.all. Same response structure as the existing dashboard APIs.
 *
 * PERFORMANCE IMPROVEMENTS:
 * - Parallel execution: investments (portfolio), insurance, transactions,
 *   daily summary, weekly summary fetched simultaneously
 * - Reduces 3-5 sequential client round-trips to 1
 * - No business logic changes - delegates to existing data sources
 *
 * DO NOT modify: existing API routes, DB schema, response formats
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getDailySummary, getLatestDailySummary, getWeeklySummary, getLatestWeeklySummary } from '@/lib/db/copilot-context';

// ============================================================================
// RESPONSE TYPES (matches existing dashboard API structures)
// ============================================================================

interface DashboardSummaryResponse {
  success: boolean;
  data?: {
    /** Portfolio data - same structure as GET /api/portfolio/data */
    portfolio: {
      metrics: {
        netWorth: number;
        netWorthChange: number;
        riskScore: number;
        riskLabel: string;
        goalAlignment: number;
      };
      allocation: Array<{ name: string; percentage: number; color: string; value: number }>;
      holdings: unknown[];
      topHoldings: unknown[];
      insights: Array<{ id: number; type: string; title: string; description: string }>;
      hasData: boolean;
      summary: {
        totalHoldings: number;
        totalAssetTypes: number;
        largestHoldingPct: number;
        lastUpdated: string | null;
        createdAt: string | null;
      };
    };
    /** Daily AI summary - same structure as GET /api/copilot/daily-summary */
    dailySummary: unknown;
    /** Weekly AI summary - same structure as GET /api/copilot/weekly-summary */
    weeklySummary: unknown;
    /** Insurance policies from insurance_policies table */
    insurance: unknown[];
    /** Active liabilities from liabilities table */
    liabilities: unknown[];
    /** Portfolio health score (null if user lacks capability) */
    healthScore: unknown | null;
    /** Transactions - placeholder for future (no table exists yet) */
    transactions: unknown[];
  };
  error?: string;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json<DashboardSummaryResponse>(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Single shared Supabase client for all helper functions
    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Build internal API URLs (same-process fetch — no external network hop)
    const baseUrl = new URL(request.url);

    const portfolioApiUrl = new URL(baseUrl);
    portfolioApiUrl.pathname = '/api/portfolio/data';
    portfolioApiUrl.search = `?user_id=${encodeURIComponent(userId)}`;

    const healthScoreApiUrl = new URL(baseUrl);
    healthScoreApiUrl.pathname = '/api/portfolio/health-score';
    healthScoreApiUrl.search = `?user_id=${encodeURIComponent(userId)}`;

    const liabilitiesApiUrl = new URL(baseUrl);
    liabilitiesApiUrl.pathname = '/api/liabilities';
    liabilitiesApiUrl.search = `?user_id=${encodeURIComponent(userId)}`;

    // Fire all 7 fetches in parallel — total time = slowest individual fetch
    const [
      portfolioRes,
      healthScoreRes,
      liabilitiesRes,
      dailySummaryRaw,
      weeklySummaryRaw,
      insuranceData,
      transactionsData,
    ] = await Promise.all([
      fetch(portfolioApiUrl.toString(), { headers: request.headers }),
      fetch(healthScoreApiUrl.toString(), { headers: request.headers }).catch(() => null),
      fetch(liabilitiesApiUrl.toString(), { headers: request.headers }).catch(() => null),
      getDailySummary(supabase, userId, today)
        .then(s => s ?? getLatestDailySummary(supabase, userId))
        .catch(() => null),
      getWeeklySummary(supabase, userId, today)
        .then(s => s ?? getLatestWeeklySummary(supabase, userId))
        .catch(() => null),
      fetchInsurance(userId, supabase),
      fetchTransactions(userId),
    ]);

    const portfolioJson = await portfolioRes.json();
    const portfolioData = portfolioJson.success && portfolioJson.data
      ? portfolioJson.data
      : {
          metrics: {
            netWorth: 0,
            netWorthChange: 0,
            riskScore: 0,
            riskLabel: 'Not Set',
            goalAlignment: 0,
          },
          allocation: [],
          holdings: [],
          topHoldings: [],
          insights: [{
            id: 1,
            type: 'info' as const,
            title: 'Upload your portfolio to get started',
            description: 'Import your holdings from a CSV or Excel file to see personalized insights.',
          }],
          hasData: false,
          summary: {
            totalHoldings: 0,
            totalAssetTypes: 0,
            largestHoldingPct: 0,
            lastUpdated: null,
            createdAt: null,
          },
        };

    // Health score: null if user lacks capability (403) or fetch failed
    let healthScoreData: unknown | null = null;
    if (healthScoreRes && healthScoreRes.ok) {
      const healthScoreJson = await healthScoreRes.json();
      healthScoreData = healthScoreJson.success ? healthScoreJson.data : null;
    }

    // Liabilities: already mapped by /api/liabilities route
    let liabilitiesData: unknown[] = [];
    if (liabilitiesRes && liabilitiesRes.ok) {
      const liabilitiesJson = await liabilitiesRes.json();
      liabilitiesData = liabilitiesJson.success && Array.isArray(liabilitiesJson.data)
        ? liabilitiesJson.data
        : [];
    }

    const response: DashboardSummaryResponse = {
      success: true,
      data: {
        portfolio: portfolioData,
        dailySummary: dailySummaryRaw,
        weeklySummary: weeklySummaryRaw,
        insurance: insuranceData,
        liabilities: liabilitiesData,
        healthScore: healthScoreData,
        transactions: transactionsData,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Dashboard Summary Optimized] Error:', error);
    return NextResponse.json<DashboardSummaryResponse>(
      { success: false, error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}

/**
 * Fetch insurance policies for user (shares the admin client from the main handler)
 */
async function fetchInsurance(userId: string, supabase: ReturnType<typeof createAdminClient>): Promise<unknown[]> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', userId)
      .order('policy_start_date', { ascending: false });

    if (error) {
      console.warn('[Dashboard Summary Optimized] Insurance fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[Dashboard Summary Optimized] Insurance fetch failed:', e);
    return [];
  }
}

/**
 * Fetch transactions for user (runs in parallel with other fetches)
 * Placeholder - no transactions table exists in schema. Returns [] for future extensibility.
 */
async function fetchTransactions(_userId: string): Promise<unknown[]> {
  // No transactions table in current schema - return empty array
  return [];
}
