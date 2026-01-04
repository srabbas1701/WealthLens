import { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Database, 
  CopilotContext, 
  CopilotLogEntry,
  AIDailySummary,
  AIWeeklySummary 
} from '@/types/database';

/**
 * Copilot Database Operations
 * 
 * This module handles all database operations for the Copilot.
 * 
 * Copilot READS:
 * - users
 * - portfolios
 * - holdings (with assets)
 * - portfolio_metrics
 * - portfolio_insights
 * - market_context
 * 
 * Copilot WRITES:
 * - copilot_sessions (logs only)
 * 
 * ⚠️ Copilot NEVER modifies holdings or assets
 */

/**
 * Fetch complete context for Copilot
 * 
 * This assembles all the data the Copilot needs to generate responses.
 * Called before every LLM invocation.
 */
export async function getCopilotContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CopilotContext | null> {
  try {
    // 1. Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Failed to fetch user:', userError);
      return null;
    }

    // 2. Get primary portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (portfolioError || !portfolio) {
      console.error('Failed to fetch portfolio:', portfolioError);
      return null;
    }

    // 3. Get holdings with asset details
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select(`
        *,
        asset:assets(*)
      `)
      .eq('portfolio_id', portfolio.id);

    if (holdingsError) {
      console.error('Failed to fetch holdings:', holdingsError);
      return null;
    }

    // 4. Get portfolio metrics (pre-computed intelligence)
    const { data: metrics, error: metricsError } = await supabase
      .from('portfolio_metrics')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .single();

    // Metrics might not exist yet, that's okay
    const portfolioMetrics = metrics || {
      portfolio_id: portfolio.id,
      equity_pct: 0,
      debt_pct: 0,
      gold_pct: 0,
      cash_pct: 0,
      hybrid_pct: 0,
      risk_score: null,
      risk_label: null,
      diversification_score: null,
      concentration_score: null,
      sector_concentration_pct: null,
      top_holding_pct: null,
      goal_alignment: null,
      goal_progress_pct: null,
      last_calculated: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // 5. Get active portfolio insights
    const { data: insights, error: insightsError } = await supabase
      .from('portfolio_insights')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (insightsError) {
      console.error('Failed to fetch insights:', insightsError);
    }

    // 6. Get today's market context
    const today = new Date().toISOString().split('T')[0];
    const { data: marketContext } = await supabase
      .from('market_context')
      .select('*')
      .eq('date', today)
      .single();

    return {
      user,
      portfolio,
      holdings: (holdings || []).map(h => ({
        ...h,
        asset: h.asset as any, // Type assertion for joined data
      })),
      metrics: portfolioMetrics as any,
      insights: insights || [],
      marketContext: marketContext || null,
    };
  } catch (error) {
    console.error('Error fetching Copilot context:', error);
    return null;
  }
}

/**
 * Log Copilot session
 * 
 * Records every Copilot interaction for:
 * - Conversation continuity
 * - Audit trail
 * - Analytics
 */
export async function logCopilotSession(
  supabase: SupabaseClient<Database>,
  entry: CopilotLogEntry
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('copilot_sessions')
      .insert({
        user_id: entry.user_id,
        session_id: entry.session_id,
        question: entry.question,
        intent: entry.intent,
        response: entry.response,
        response_status: entry.response_status,
        context_snapshot: entry.context_snapshot,
        guardrails_triggered: entry.guardrails_triggered,
      });

    if (error) {
      console.error('Failed to log Copilot session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging Copilot session:', error);
    return false;
  }
}

/**
 * Get recent Copilot sessions for context
 * 
 * Used for conversation continuity
 */
export async function getRecentSessions(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  limit: number = 5
): Promise<{ question: string; response: string }[]> {
  try {
    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('question, response')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }
}

/**
 * Get user's portfolio summary for quick access
 */
export async function getPortfolioSummary(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{
  totalValue: number;
  riskScore: number | null;
  goalAlignment: string | null;
  holdingsCount: number;
} | null> {
  try {
    // Get primary portfolio with metrics
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select(`
        total_value,
        portfolio_metrics(risk_score, goal_alignment)
      `)
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!portfolio) return null;

    // Get holdings count
    const { count } = await supabase
      .from('holdings')
      .select('*', { count: 'exact', head: true })
      .eq('portfolio_id', (portfolio as any).id);

    const metrics = (portfolio as any).portfolio_metrics?.[0];

    return {
      totalValue: portfolio.total_value || 0,
      riskScore: metrics?.risk_score || null,
      goalAlignment: metrics?.goal_alignment || null,
      holdingsCount: count || 0,
    };
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    return null;
  }
}

// =============================================================================
// AI DAILY SUMMARY OPERATIONS
// =============================================================================

/**
 * Get daily AI summary for a user
 * 
 * WHY THIS IS READ-ONLY:
 * - Summaries are pre-computed by backend jobs
 * - Copilot READS but never WRITES summaries
 * - This prevents "refresh anxiety" - users can't regenerate
 * - Ensures consistent, calm messaging
 * 
 * HABIT LOOP DESIGN:
 * - User checks daily → sees calm summary → feels informed
 * - Most days: "no_action_required" → reinforces patience
 * - Occasional: "monitor" → feels engaged without anxiety
 * - Rare: "attention_required" → knows platform is watching
 */
export async function getDailySummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  date?: string
): Promise<AIDailySummary | null> {
  try {
    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('ai_daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('summary_date', targetDate)
      .single();

    if (error) {
      // Not found is expected for days without summaries (no logging)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to fetch daily summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return null;
  }
}

/**
 * Get the most recent daily summary for a user
 * 
 * Useful when today's summary isn't available yet
 * Returns the latest available summary
 */
export async function getLatestDailySummary(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AIDailySummary | null> {
  try {
    const { data, error } = await supabase
      .from('ai_daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('summary_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to fetch latest daily summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching latest daily summary:', error);
    return null;
  }
}

// =============================================================================
// AI WEEKLY SUMMARY OPERATIONS
// =============================================================================

/**
 * Get weekly AI summary for a user
 * 
 * WHY WEEKLY SUMMARIES EXIST:
 * - Daily is "am I okay?" - Weekly is "am I on track?"
 * - Allocation drift is only meaningful over time
 * - Goal progress is a weekly/monthly concept, not daily
 * - Provides "zoom out" moment for reflection
 * 
 * WHAT WEEKLY SUMMARIES COVER:
 * - Risk profile alignment (did allocation drift?)
 * - Goal progress (on track, ahead, behind)
 * - Diversification health
 * - NO predictions about future performance
 * - NO recommendations to buy/sell
 */
export async function getWeeklySummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekStartDate?: string
): Promise<AIWeeklySummary | null> {
  try {
    // Calculate current week start (Monday) if not provided
    let targetWeekStart = weekStartDate;
    if (!targetWeekStart) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      const monday = new Date(today.setDate(diff));
      targetWeekStart = monday.toISOString().split('T')[0];
    }
    
    const { data, error } = await supabase
      .from('ai_weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', targetWeekStart)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to fetch weekly summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    return null;
  }
}

/**
 * Get the most recent weekly summary for a user
 * 
 * Useful when current week's summary isn't available yet
 * Returns the latest available weekly summary
 */
export async function getLatestWeeklySummary(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AIWeeklySummary | null> {
  try {
    const { data, error } = await supabase
      .from('ai_weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to fetch latest weekly summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching latest weekly summary:', error);
    return null;
  }
}

/**
 * Get recent weekly summaries for trend analysis
 * 
 * Returns the last N weekly summaries for a user
 * Useful for showing progress over time
 */
export async function getRecentWeeklySummaries(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit: number = 4
): Promise<AIWeeklySummary[]> {
  try {
    const { data, error } = await supabase
      .from('ai_weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent weekly summaries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching recent weekly summaries:', error);
    return [];
  }
}

