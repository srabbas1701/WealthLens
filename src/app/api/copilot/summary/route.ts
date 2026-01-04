import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCopilotContext } from '@/lib/db/copilot-context';
import type { 
  CopilotSummaryRequest, 
  CopilotSummaryResponse,
  Status
} from '@/types/copilot';
import type { CopilotContext } from '@/types/database';

/**
 * POST /api/copilot/summary
 * 
 * Daily AI Summary endpoint.
 * 
 * Used for:
 * - Dashboard top card (AI Daily Summary)
 * - Future notifications
 * - Email digests
 * 
 * Frontend rendering rules:
 * - Render verbatim
 * - No interpretation
 * - No recalculation
 */

// =============================================================================
// CONTEXT INTERFACES
// =============================================================================

interface DailySummaryContext {
  portfolio_value: number;
  portfolio_change_pct: number;
  market_change_pct: number;
  market_mood: string;
  significant_events: string[];
  risk_status: 'stable' | 'elevated' | 'reduced';
  risk_score: number | null;
  risk_label: string | null;
  goal_status: 'on_track' | 'ahead' | 'behind' | 'needs_review';
  goal_progress_pct: number | null;
  active_insights: string[];
  user_name: string;
}

// =============================================================================
// MOCK DATA (Fallback)
// =============================================================================

function getMockSummaryContext(): DailySummaryContext {
  return {
    portfolio_value: 2485420,
    portfolio_change_pct: 0.2,
    market_change_pct: -0.3,
    market_mood: 'stable',
    significant_events: [],
    risk_status: 'stable',
    risk_score: 62,
    risk_label: 'Moderate',
    goal_status: 'on_track',
    goal_progress_pct: 78,
    active_insights: [
      'IT sector is 28% of your equity',
      'Tax harvesting opportunity available',
    ],
    user_name: 'Rahul',
  };
}

// =============================================================================
// TRANSFORM SUPABASE CONTEXT
// =============================================================================

function transformToSummaryContext(ctx: CopilotContext): DailySummaryContext {
  // Determine goal status from goal_alignment
  let goalStatus: 'on_track' | 'ahead' | 'behind' | 'needs_review' = 'on_track';
  const goalAlignment = ctx.metrics.goal_alignment;
  if (goalAlignment === 'Ahead') goalStatus = 'ahead';
  else if (goalAlignment === 'Behind') goalStatus = 'behind';
  else if (goalAlignment === 'Needs Review') goalStatus = 'needs_review';

  // Determine risk status based on risk score
  let riskStatus: 'stable' | 'elevated' | 'reduced' = 'stable';
  const riskScore = ctx.metrics.risk_score;
  if (riskScore && riskScore > 75) riskStatus = 'elevated';
  else if (riskScore && riskScore < 30) riskStatus = 'reduced';

  return {
    portfolio_value: ctx.portfolio.total_value || 0,
    portfolio_change_pct: 0.2, // Would come from historical data
    market_change_pct: ctx.marketContext?.nifty_change || 0,
    market_mood: ctx.marketContext?.market_mood || 'stable',
    significant_events: ctx.marketContext?.affected_sectors?.map(s => `${s} sector affected`) || [],
    risk_status: riskStatus,
    risk_score: ctx.metrics.risk_score,
    risk_label: ctx.metrics.risk_label,
    goal_status: goalStatus,
    goal_progress_pct: ctx.metrics.goal_progress_pct,
    active_insights: ctx.insights.map(i => i.summary),
    user_name: ctx.user.full_name || 'Investor',
  };
}

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

function generateDailySummary(context: DailySummaryContext): {
  headline: string;
  summary_points: string[];
  status: Status;
} {
  const summaryPoints: string[] = [];
  let status: Status = 'no_action_required';
  let headline = '';
  
  // Determine headline based on portfolio status
  if (Math.abs(context.portfolio_change_pct) < 1) {
    headline = 'Your portfolio remains stable today';
  } else if (context.portfolio_change_pct > 0) {
    headline = `Your portfolio is up ${context.portfolio_change_pct.toFixed(1)}% today`;
  } else {
    headline = `Your portfolio is slightly down ${Math.abs(context.portfolio_change_pct).toFixed(1)}% today`;
  }
  
  // Add market context
  if (context.market_mood === 'volatile' || context.market_change_pct < -1) {
    summaryPoints.push('Markets saw some volatility due to global cues');
  } else if (context.market_change_pct > 0) {
    summaryPoints.push('Markets traded in a positive range today');
  } else {
    summaryPoints.push('Markets were relatively flat today');
  }
  
  // Portfolio impact assessment
  if (Math.abs(context.portfolio_change_pct) < Math.abs(context.market_change_pct)) {
    summaryPoints.push('Your portfolio impact was limited due to diversification');
  } else {
    summaryPoints.push('Your portfolio moved in line with broader markets');
  }
  
  // Risk status
  if (context.risk_status === 'stable') {
    summaryPoints.push('Your risk level remains within your comfort zone');
  } else if (context.risk_status === 'elevated') {
    summaryPoints.push('Risk levels are slightly elevated - worth monitoring');
    status = 'monitor';
  }
  
  // Goal alignment
  if (context.goal_status === 'on_track') {
    summaryPoints.push('You remain on track for your financial goals');
  } else if (context.goal_status === 'ahead') {
    summaryPoints.push('You\'re ahead of schedule on your goals');
  } else if (context.goal_status === 'behind') {
    summaryPoints.push('Your goals may need a review - consider checking your SIPs');
    status = 'monitor';
  }
  
  // Add top insight if available
  if (context.active_insights.length > 0) {
    summaryPoints.push(context.active_insights[0]);
  }
  
  return {
    headline,
    summary_points: summaryPoints.slice(0, 4), // Max 4 points for clarity
    status,
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CopilotSummaryRequest = await request.json();
    
    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }
    
    // Default to today if no date provided
    const date = body.date || new Date().toISOString().split('T')[0];
    
    // Fetch context from Supabase (with fallback to mock)
    let summaryContext: DailySummaryContext;
    
    try {
      const supabase = await createClient();
      const ctx = await getCopilotContext(supabase, body.user_id);
      
      if (ctx) {
        summaryContext = transformToSummaryContext(ctx);
      } else {
        summaryContext = getMockSummaryContext();
      }
    } catch (dbError) {
      console.error('Database error, falling back to mock:', dbError);
      summaryContext = getMockSummaryContext();
    }
    
    // Generate summary
    const summary = generateDailySummary(summaryContext);
    
    // Build response
    const response: CopilotSummaryResponse = {
      headline: summary.headline,
      summary_points: summary.summary_points,
      status: summary.status,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Copilot summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
