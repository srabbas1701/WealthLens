import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDailySummary, getLatestDailySummary, getCopilotContext } from '@/lib/db/copilot-context';
import type { DailySummaryResponse, Status } from '@/types/copilot';

/**
 * GET /api/copilot/daily-summary
 * 
 * Retrieves the pre-computed daily AI summary for a user.
 * 
 * =============================================================================
 * WHY THIS IS A GET ENDPOINT (NOT POST)
 * =============================================================================
 * 
 * Summaries are PRE-COMPUTED, not generated on-demand. This is intentional:
 * 
 * 1. PREVENTS REFRESH ANXIETY
 *    - Users can't "regenerate" to get a different answer
 *    - What they see is what they get - builds trust
 *    - No "maybe if I refresh it will say something different"
 * 
 * 2. ENSURES CONSISTENCY
 *    - Everyone sees the same summary for the same day
 *    - No variation based on time of day or server load
 *    - Summaries are immutable once generated
 * 
 * 3. SUPPORTS HABIT LOOPS
 *    - User checks daily → sees calm summary → feels informed
 *    - The ritual is "check", not "generate"
 *    - Builds a healthy, non-anxious relationship with the platform
 * 
 * =============================================================================
 * WHY MOST DAYS SAY "NO ACTION REQUIRED"
 * =============================================================================
 * 
 * This is the CORRECT behavior for a long-term investment platform:
 * 
 * 1. LONG-TERM INVESTING IS BORING (AND THAT'S GOOD)
 *    - Daily fluctuations are noise, not signal
 *    - Most days, nothing meaningful changes
 *    - "No action required" = "You're doing fine, keep going"
 * 
 * 2. CALM LANGUAGE BUILDS TRUST
 *    - Users who feel calm stay invested longer
 *    - Anxiety leads to panic selling
 *    - Trust leads to referrals and retention
 * 
 * 3. RARE ALERTS HAVE MORE IMPACT
 *    - If everything is "urgent", nothing is urgent
 *    - When we DO say "monitor" or "attention", users listen
 *    - Scarcity of alerts = credibility of alerts
 * 
 * =============================================================================
 * COPILOT INTEGRATION
 * =============================================================================
 * 
 * The Copilot can EXPLAIN summaries but does NOT regenerate them:
 * 
 * User: "Why does my summary say no action required?"
 * Copilot: "Your portfolio is well-diversified and aligned with your goals.
 *           Most days, this is exactly what you want to see - it means
 *           your long-term strategy is working as expected."
 * 
 * User: "Can you give me a different summary?"
 * Copilot: "I can't regenerate summaries - they're created once daily based
 *           on your portfolio at market close. This ensures you always get
 *           consistent, reliable information."
 * 
 * =============================================================================
 * TONE GUIDELINES (Enforced by generation logic)
 * =============================================================================
 * 
 * NEVER USE:
 * - Urgency language ("act now", "urgent", "immediately", "don't wait")
 * - Trading language ("buy", "sell", "exit", "enter")
 * - Fear language ("crash", "plummet", "disaster", "crisis")
 * - FOMO language ("missing out", "opportunity ending", "last chance")
 * 
 * ALWAYS USE:
 * - Calm, observational language ("Your portfolio is...", "Markets were...")
 * - Context, not predictions ("This is typical for...", "Historically...")
 * - Reassurance where appropriate ("Your diversification helped...", "On track...")
 * 
 * =============================================================================
 */

// =============================================================================
// MOCK FALLBACK GENERATOR
// =============================================================================

/**
 * Generate a mock daily summary when no pre-computed summary exists
 * 
 * WHY THIS EXISTS:
 * - New users won't have summaries yet
 * - Backend jobs might not have run yet
 * - Provides graceful degradation
 * 
 * IMPORTANT: This is a fallback, not the primary path
 * In production, summaries should be pre-computed by backend jobs
 */
function generateMockDailySummary(
  userId: string,
  date: string,
  portfolioValue: number = 2485420,
  marketMood: string = 'stable'
): DailySummaryResponse {
  // Most days should be "no_action_required" - this is correct behavior
  const status: Status = 'no_action_required';
  
  return {
    found: false, // Indicates this is a generated fallback, not stored data
    date,
    headline: 'Your portfolio remains stable today',
    summary_points: [
      'Markets traded in a narrow range with mild movements',
      'Your portfolio impact was limited due to diversification',
      'Your risk level remains within your comfort zone',
      'You remain on track for your financial goals',
    ],
    status,
    portfolio_value: portfolioValue,
    market_mood: marketMood,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Transform database summary to API response
 */
function transformDailySummary(
  summary: {
    id: string;
    user_id: string;
    portfolio_id: string;
    summary_date: string;
    headline: string;
    summary_points: string[];
    status: 'no_action_required' | 'monitor' | 'attention_required';
    portfolio_value_at_generation: number | null;
    market_mood_at_generation: string | null;
    risk_score_at_generation: number | null;
    generated_at: string;
    created_at: string;
  }
): DailySummaryResponse {
  return {
    found: true,
    date: summary.summary_date,
    headline: summary.headline,
    summary_points: summary.summary_points,
    status: summary.status,
    portfolio_value: summary.portfolio_value_at_generation || undefined,
    market_mood: summary.market_mood_at_generation || undefined,
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
    const date = searchParams.get('date'); // Optional: defaults to today
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      );
    }
    
    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Try to fetch pre-computed summary from database
    const supabase = await createClient();
    let summary = await getDailySummary(supabase, userId, targetDate);
    
    // If no summary for requested date, try to get the latest available
    if (!summary && !date) {
      summary = await getLatestDailySummary(supabase, userId);
    }
    
    // If we found a stored summary, return it
    if (summary) {
      const response = transformDailySummary(summary);
      return NextResponse.json(response);
    }
    
    // Fallback: Generate a mock summary
    // This should only happen for new users or before backend jobs run
    
    // Try to get real portfolio context for the mock
    let portfolioValue = 2485420; // Default mock value
    let marketMood = 'stable';
    
    try {
      const ctx = await getCopilotContext(supabase, userId);
      if (ctx) {
        portfolioValue = ctx.portfolio.total_value || portfolioValue;
        marketMood = ctx.marketContext?.market_mood || marketMood;
      }
    } catch (ctxError) {
      console.error('Failed to fetch context for mock summary:', ctxError);
    }
    
    const mockResponse = generateMockDailySummary(userId, targetDate, portfolioValue, marketMood);
    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error('Daily summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily summary' },
      { status: 500 }
    );
  }
}

