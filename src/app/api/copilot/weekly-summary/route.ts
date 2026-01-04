import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWeeklySummary, getLatestWeeklySummary, getCopilotContext } from '@/lib/db/copilot-context';
import type { WeeklySummaryResponse, Status, RiskAlignmentStatus } from '@/types/copilot';

/**
 * GET /api/copilot/weekly-summary
 * 
 * Retrieves the pre-computed weekly AI summary for a user.
 * 
 * =============================================================================
 * WHY WEEKLY SUMMARIES EXIST
 * =============================================================================
 * 
 * Daily and weekly serve different psychological purposes:
 * 
 * DAILY: "Am I okay today?"
 * - Quick check-in
 * - Immediate reassurance
 * - Noise filtering
 * 
 * WEEKLY: "Am I on track?"
 * - Deeper reflection
 * - Progress assessment
 * - Long-term perspective
 * 
 * =============================================================================
 * WHAT WEEKLY SUMMARIES COVER
 * =============================================================================
 * 
 * 1. ALLOCATION DRIFT
 *    - How did your asset mix change this week?
 *    - Is it still aligned with your target?
 *    - Observational, not prescriptive
 * 
 * 2. RISK ALIGNMENT
 *    - Does your portfolio still match your risk profile?
 *    - "aligned" (most weeks) → "slightly_drifted" → "review_suggested" (rare)
 *    - Never creates panic, just awareness
 * 
 * 3. GOAL PROGRESS
 *    - Are you on track for your stated goals?
 *    - Celebrates consistency ("You stayed the course")
 *    - Gentle nudges when behind, never urgent
 * 
 * 4. DIVERSIFICATION HEALTH
 *    - Is your portfolio still well-diversified?
 *    - Concentration changes over time
 *    - Educational, not alarming
 * 
 * =============================================================================
 * WHAT WEEKLY SUMMARIES DO NOT COVER
 * =============================================================================
 * 
 * NEVER INCLUDES:
 * - Predictions about next week's performance
 * - Recommendations to buy or sell anything
 * - Timing advice ("Now is a good time to...")
 * - Comparisons to other investors
 * - FOMO-inducing language
 * 
 * =============================================================================
 * REFLECTION PROMPTS
 * =============================================================================
 * 
 * Weekly summaries can include optional reflection prompts:
 * 
 * Good examples:
 * - "How do you feel about your progress this week?"
 * - "Is your current allocation still aligned with your goals?"
 * - "Have your financial priorities changed recently?"
 * 
 * Bad examples (never use):
 * - "Are you missing out on opportunities?"
 * - "Should you be doing more?"
 * - "What if markets change next week?"
 * 
 * =============================================================================
 * COPILOT INTEGRATION
 * =============================================================================
 * 
 * The Copilot can EXPLAIN weekly summaries but does NOT regenerate them:
 * 
 * User: "What does 'slightly drifted' mean?"
 * Copilot: "Your allocation has shifted a bit from your target over the past
 *           week. This is normal - markets move and allocations shift. It
 *           doesn't require immediate action, just awareness."
 * 
 * User: "Should I rebalance?"
 * Copilot: "I can't recommend specific actions, but I can explain that
 *           rebalancing is typically done quarterly or annually, not weekly.
 *           Would you like to understand how rebalancing works?"
 * 
 * =============================================================================
 * TONE GUIDELINES
 * =============================================================================
 * 
 * REFLECTIVE, NOT REACTIVE:
 * ✓ "This week, your portfolio..."
 * ✗ "You need to act on..."
 * 
 * CELEBRATORY OF CONSISTENCY:
 * ✓ "You stayed the course despite market volatility"
 * ✗ "Markets were volatile - here's what to do"
 * 
 * EDUCATIONAL ABOUT LONG-TERM PRINCIPLES:
 * ✓ "Allocation drift is normal over time"
 * ✗ "Your allocation is wrong"
 * 
 * NEVER CREATES FOMO OR REGRET:
 * ✓ "Your portfolio performed in line with your risk profile"
 * ✗ "You could have earned more if..."
 * 
 * =============================================================================
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate the start of the current week (Monday)
 */
function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Calculate the end of a week (Sunday) given the start (Monday)
 */
function getWeekEnd(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().split('T')[0];
}

// =============================================================================
// MOCK FALLBACK GENERATOR
// =============================================================================

/**
 * Generate a mock weekly summary when no pre-computed summary exists
 * 
 * WHY THIS EXISTS:
 * - New users won't have summaries yet
 * - Backend jobs might not have run yet
 * - Provides graceful degradation
 * 
 * IMPORTANT: This is a fallback, not the primary path
 * In production, summaries should be pre-computed by backend jobs
 */
function generateMockWeeklySummary(
  userId: string,
  weekStart: string,
  portfolioValue: number = 2485420
): WeeklySummaryResponse {
  const weekEnd = getWeekEnd(weekStart);
  
  // Most weeks should be "no_action_required" and "aligned"
  const status: Status = 'no_action_required';
  const riskAlignment: RiskAlignmentStatus = 'aligned';
  
  return {
    found: false, // Indicates this is a generated fallback
    week_start: weekStart,
    week_end: weekEnd,
    headline: 'A steady week for your portfolio',
    summary_points: [
      'Your portfolio remained well-balanced throughout the week',
      'Asset allocation stayed within your target range',
      'Risk profile continues to match your stated preferences',
      'You\'re on track for your long-term financial goals',
    ],
    status,
    allocation_drift_summary: 'Your allocation remained stable this week with no significant drift from your target mix.',
    risk_alignment_status: riskAlignment,
    goal_progress_summary: 'You continue to make steady progress toward your financial goals.',
    diversification_note: 'Your portfolio maintains healthy diversification across asset classes.',
    reflection_prompt: 'How do you feel about your investment journey this week?',
    portfolio_value: portfolioValue,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Transform database summary to API response
 */
function transformWeeklySummary(
  summary: {
    id: string;
    user_id: string;
    portfolio_id: string;
    week_start_date: string;
    week_end_date: string;
    headline: string;
    summary_points: string[];
    status: 'no_action_required' | 'monitor' | 'attention_required';
    allocation_drift_summary: string | null;
    risk_alignment_status: 'aligned' | 'slightly_drifted' | 'review_suggested' | null;
    goal_progress_summary: string | null;
    diversification_note: string | null;
    reflection_prompt: string | null;
    portfolio_value_at_generation: number | null;
    equity_pct_at_generation: number | null;
    debt_pct_at_generation: number | null;
    risk_score_at_generation: number | null;
    generated_at: string;
    created_at: string;
  }
): WeeklySummaryResponse {
  return {
    found: true,
    week_start: summary.week_start_date,
    week_end: summary.week_end_date,
    headline: summary.headline,
    summary_points: summary.summary_points,
    status: summary.status,
    allocation_drift_summary: summary.allocation_drift_summary || undefined,
    risk_alignment_status: summary.risk_alignment_status || undefined,
    goal_progress_summary: summary.goal_progress_summary || undefined,
    diversification_note: summary.diversification_note || undefined,
    reflection_prompt: summary.reflection_prompt || undefined,
    portfolio_value: summary.portfolio_value_at_generation || undefined,
    generated_at: summary.generated_at,
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const weekStart = searchParams.get('week_start'); // Optional: defaults to current week
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      );
    }
    
    // Default to current week if not provided
    const targetWeekStart = weekStart || getCurrentWeekStart();
    
    // Try to fetch pre-computed summary from database
    const supabase = await createClient();
    let summary = await getWeeklySummary(supabase, userId, targetWeekStart);
    
    // If no summary for requested week, try to get the latest available
    if (!summary && !weekStart) {
      summary = await getLatestWeeklySummary(supabase, userId);
    }
    
    // If we found a stored summary, return it
    if (summary) {
      const response = transformWeeklySummary(summary);
      return NextResponse.json(response);
    }
    
    // Fallback: Generate a mock summary
    
    // Try to get real portfolio context for the mock
    let portfolioValue = 2485420;
    
    try {
      const ctx = await getCopilotContext(supabase, userId);
      if (ctx) {
        portfolioValue = ctx.portfolio.total_value || portfolioValue;
      }
    } catch (ctxError) {
      console.error('Failed to fetch context for mock summary:', ctxError);
    }
    
    const mockResponse = generateMockWeeklySummary(userId, targetWeekStart, portfolioValue);
    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error('Weekly summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly summary' },
      { status: 500 }
    );
  }
}

