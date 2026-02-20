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

    const baseUrl = new URL(request.url).origin;

    // Build fetch URLs for existing APIs
    const portfolioUrl = `${baseUrl}/api/portfolio/data?user_id=${encodeURIComponent(userId)}`;
    const dailySummaryUrl = `${baseUrl}/api/copilot/daily-summary?user_id=${encodeURIComponent(userId)}`;
    const weeklySummaryUrl = `${baseUrl}/api/copilot/weekly-summary?user_id=${encodeURIComponent(userId)}`;

    // Parallel fetch: investments (portfolio), insurance, transactions, daily summary, weekly summary
    const [portfolioRes, dailySummaryRes, weeklySummaryRes, insuranceData, transactionsData] = await Promise.all([
      fetch(portfolioUrl, { headers: { Accept: 'application/json' } }),
      fetch(dailySummaryUrl, { headers: { Accept: 'application/json' } }),
      fetch(weeklySummaryUrl, { headers: { Accept: 'application/json' } }),
      fetchInsurance(userId),
      fetchTransactions(userId),
    ]);

    // Parse portfolio response
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

    // Parse daily summary
    const dailySummaryData = dailySummaryRes.ok ? await dailySummaryRes.json() : null;

    // Parse weekly summary
    const weeklySummaryData = weeklySummaryRes.ok ? await weeklySummaryRes.json() : null;

    const response: DashboardSummaryResponse = {
      success: true,
      data: {
        portfolio: portfolioData,
        dailySummary: dailySummaryData,
        weeklySummary: weeklySummaryData,
        insurance: insuranceData,
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
 * Fetch insurance policies for user (runs in parallel with other fetches)
 */
async function fetchInsurance(userId: string): Promise<unknown[]> {
  try {
    const supabase = createAdminClient();
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
