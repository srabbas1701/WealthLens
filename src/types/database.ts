/**
 * Supabase Database Types
 * 
 * Generated from schema.sql
 * These types ensure type-safety when working with Supabase
 * 
 * To regenerate after schema changes:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone_number: string | null;  // Phone number with country code (e.g., +919876543210)
          // Verification status for secondary contacts (non-blocking)
          email_verified_at: string | null;
          phone_verified_at: string | null;
          // Auth method tracking for progressive data collection
          primary_auth_method: 'mobile' | 'email' | null;
          risk_label: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive' | null;
          risk_score: number | null;
          primary_goal: string | null;
          horizon_years: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone_number?: string | null;
          email_verified_at?: string | null;
          phone_verified_at?: string | null;
          primary_auth_method?: 'mobile' | 'email' | null;
          risk_label?: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive' | null;
          risk_score?: number | null;
          primary_goal?: string | null;
          horizon_years?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          phone_number?: string | null;
          email_verified_at?: string | null;
          phone_verified_at?: string | null;
          primary_auth_method?: 'mobile' | 'email' | null;
          risk_label?: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive' | null;
          risk_score?: number | null;
          primary_goal?: string | null;
          horizon_years?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_primary: boolean;
          total_value: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          is_primary?: boolean;
          total_value?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_primary?: boolean;
          total_value?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          name: string;
          asset_type: 'equity' | 'mutual_fund' | 'index_fund' | 'etf' | 'fd' | 'bond' | 'gold' | 'cash' | 'ppf' | 'epf' | 'nps' | 'other';
          isin: string | null;
          symbol: string | null;
          sector: string | null;
          sub_sector: string | null;
          risk_bucket: 'low' | 'medium' | 'high' | null;
          asset_class: 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          asset_type: 'equity' | 'mutual_fund' | 'index_fund' | 'etf' | 'fd' | 'bond' | 'gold' | 'cash' | 'ppf' | 'epf' | 'nps' | 'other';
          isin?: string | null;
          symbol?: string | null;
          sector?: string | null;
          sub_sector?: string | null;
          risk_bucket?: 'low' | 'medium' | 'high' | null;
          asset_class?: 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          asset_type?: 'equity' | 'mutual_fund' | 'index_fund' | 'etf' | 'fd' | 'bond' | 'gold' | 'cash' | 'ppf' | 'epf' | 'nps' | 'other';
          isin?: string | null;
          symbol?: string | null;
          sector?: string | null;
          sub_sector?: string | null;
          risk_bucket?: 'low' | 'medium' | 'high' | null;
          asset_class?: 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      holdings: {
        Row: {
          id: string;
          portfolio_id: string;
          asset_id: string;
          quantity: number;
          invested_value: number;
          current_value: number;
          average_price: number | null;
          source: 'csv' | 'manual' | 'sample' | 'api' | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          asset_id: string;
          quantity?: number;
          invested_value?: number;
          current_value?: number;
          average_price?: number | null;
          source?: 'csv' | 'manual' | 'sample' | 'api' | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          asset_id?: string;
          quantity?: number;
          invested_value?: number;
          current_value?: number;
          average_price?: number | null;
          source?: 'csv' | 'manual' | 'sample' | 'api' | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolio_metrics: {
        Row: {
          portfolio_id: string;
          equity_pct: number;
          debt_pct: number;
          gold_pct: number;
          cash_pct: number;
          hybrid_pct: number;
          risk_score: number | null;
          risk_label: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive' | null;
          diversification_score: number | null;
          concentration_score: number | null;
          sector_concentration_pct: number | null;
          top_holding_pct: number | null;
          goal_alignment: 'On Track' | 'Ahead' | 'Behind' | 'Needs Review' | null;
          goal_progress_pct: number | null;
          last_calculated: string;
          created_at: string;
        };
        Insert: {
          portfolio_id: string;
          equity_pct?: number;
          debt_pct?: number;
          gold_pct?: number;
          cash_pct?: number;
          hybrid_pct?: number;
          risk_score?: number | null;
          risk_label?: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive' | null;
          diversification_score?: number | null;
          concentration_score?: number | null;
          sector_concentration_pct?: number | null;
          top_holding_pct?: number | null;
          goal_alignment?: 'On Track' | 'Ahead' | 'Behind' | 'Needs Review' | null;
          goal_progress_pct?: number | null;
          last_calculated?: string;
          created_at?: string;
        };
        Update: {
          portfolio_id?: string;
          equity_pct?: number;
          debt_pct?: number;
          gold_pct?: number;
          cash_pct?: number;
          hybrid_pct?: number;
          risk_score?: number | null;
          risk_label?: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive' | null;
          diversification_score?: number | null;
          concentration_score?: number | null;
          sector_concentration_pct?: number | null;
          top_holding_pct?: number | null;
          goal_alignment?: 'On Track' | 'Ahead' | 'Behind' | 'Needs Review' | null;
          goal_progress_pct?: number | null;
          last_calculated?: string;
          created_at?: string;
        };
      };
      portfolio_insights: {
        Row: {
          id: string;
          portfolio_id: string;
          insight_type: 'concentration' | 'overlap' | 'fd_drag' | 'sector_risk' | 'tax_opportunity' | 'sip_reminder' | 'goal_drift' | 'risk_mismatch' | 'diversification' | 'rebalance' | 'general';
          severity: 'low' | 'medium' | 'high' | null;
          title: string;
          summary: string;
          details: string | null;
          action_label: string | null;
          action_type: string | null;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          insight_type: 'concentration' | 'overlap' | 'fd_drag' | 'sector_risk' | 'tax_opportunity' | 'sip_reminder' | 'goal_drift' | 'risk_mismatch' | 'diversification' | 'rebalance' | 'general';
          severity?: 'low' | 'medium' | 'high' | null;
          title: string;
          summary: string;
          details?: string | null;
          action_label?: string | null;
          action_type?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          insight_type?: 'concentration' | 'overlap' | 'fd_drag' | 'sector_risk' | 'tax_opportunity' | 'sip_reminder' | 'goal_drift' | 'risk_mismatch' | 'diversification' | 'rebalance' | 'general';
          severity?: 'low' | 'medium' | 'high' | null;
          title?: string;
          summary?: string;
          details?: string | null;
          action_label?: string | null;
          action_type?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      market_context: {
        Row: {
          date: string;
          market_mood: 'stable' | 'volatile' | 'bullish' | 'bearish' | 'mixed' | null;
          nifty_change: number | null;
          sensex_change: number | null;
          summary: string;
          detailed_summary: string | null;
          affected_sectors: string[] | null;
          top_gainers: string[] | null;
          top_losers: string[] | null;
          created_at: string;
        };
        Insert: {
          date: string;
          market_mood?: 'stable' | 'volatile' | 'bullish' | 'bearish' | 'mixed' | null;
          nifty_change?: number | null;
          sensex_change?: number | null;
          summary: string;
          detailed_summary?: string | null;
          affected_sectors?: string[] | null;
          top_gainers?: string[] | null;
          top_losers?: string[] | null;
          created_at?: string;
        };
        Update: {
          date?: string;
          market_mood?: 'stable' | 'volatile' | 'bullish' | 'bearish' | 'mixed' | null;
          nifty_change?: number | null;
          sensex_change?: number | null;
          summary?: string;
          detailed_summary?: string | null;
          affected_sectors?: string[] | null;
          top_gainers?: string[] | null;
          top_losers?: string[] | null;
          created_at?: string;
        };
      };
      copilot_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          question: string;
          intent: string | null;
          response: string;
          response_status: string | null;
          context_snapshot: Json | null;
          guardrails_triggered: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          question: string;
          intent?: string | null;
          response: string;
          response_status?: string | null;
          context_snapshot?: Json | null;
          guardrails_triggered?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          question?: string;
          intent?: string | null;
          response?: string;
          response_status?: string | null;
          context_snapshot?: Json | null;
          guardrails_triggered?: string[] | null;
          created_at?: string;
        };
      };
      onboarding_snapshots: {
        Row: {
          user_id: string;
          goals: string[] | null;
          primary_goal: string | null;
          horizon_years: number | null;
          risk_answers: Json | null;
          risk_label: string | null;
          risk_score: number | null;
          portfolio_snapshot: Json | null;
          ai_summary: string[] | null;
          confidence: 'high' | 'medium' | 'low' | null;
          is_complete: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          goals?: string[] | null;
          primary_goal?: string | null;
          horizon_years?: number | null;
          risk_answers?: Json | null;
          risk_label?: string | null;
          risk_score?: number | null;
          portfolio_snapshot?: Json | null;
          ai_summary?: string[] | null;
          confidence?: 'high' | 'medium' | 'low' | null;
          is_complete?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          goals?: string[] | null;
          primary_goal?: string | null;
          horizon_years?: number | null;
          risk_answers?: Json | null;
          risk_label?: string | null;
          risk_score?: number | null;
          portfolio_snapshot?: Json | null;
          ai_summary?: string[] | null;
          confidence?: 'high' | 'medium' | 'low' | null;
          is_complete?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * AI Daily Summaries
       * 
       * Pre-computed daily summaries for the habit loop.
       * 
       * WHY THIS TABLE EXISTS:
       * - Users should feel INFORMED, not ANXIOUS
       * - Most days, nothing significant happens - this is GOOD
       * - Default status "no_action_required" reinforces calm investing
       * - Summaries are generated once/day, NOT on-demand
       * 
       * COPILOT BEHAVIOR:
       * - Copilot READS this table to explain summaries
       * - Copilot NEVER regenerates summaries (they're pre-computed)
       * - Copilot uses stored data to provide context
       */
      ai_daily_summaries: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          portfolio_id: string;
          summary_date: string;
          headline: string;
          summary_points: string[];
          status?: 'no_action_required' | 'monitor' | 'attention_required';
          portfolio_value_at_generation?: number | null;
          market_mood_at_generation?: string | null;
          risk_score_at_generation?: number | null;
          generated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          portfolio_id?: string;
          summary_date?: string;
          headline?: string;
          summary_points?: string[];
          status?: 'no_action_required' | 'monitor' | 'attention_required';
          portfolio_value_at_generation?: number | null;
          market_mood_at_generation?: string | null;
          risk_score_at_generation?: number | null;
          generated_at?: string;
          created_at?: string;
        };
      };
      /**
       * AI Weekly Summaries
       * 
       * Weekly reflection summaries for deeper habit engagement.
       * 
       * WHY WEEKLY MATTERS:
       * - Daily is for "am I okay?" - Weekly is for "am I on track?"
       * - Allocation drift is only meaningful over time
       * - Goal progress is a weekly/monthly concept, not daily
       * - Reduces noise - not every fluctuation deserves attention
       * 
       * WHAT WEEKLY SUMMARIES COVER:
       * - Risk profile alignment (did allocation drift?)
       * - Goal progress (on track, ahead, behind)
       * - Diversification health
       * - NO predictions about future performance
       * - NO recommendations to buy/sell
       */
      ai_weekly_summaries: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          portfolio_id: string;
          week_start_date: string;
          week_end_date: string;
          headline: string;
          summary_points: string[];
          status?: 'no_action_required' | 'monitor' | 'attention_required';
          allocation_drift_summary?: string | null;
          risk_alignment_status?: 'aligned' | 'slightly_drifted' | 'review_suggested' | null;
          goal_progress_summary?: string | null;
          diversification_note?: string | null;
          reflection_prompt?: string | null;
          portfolio_value_at_generation?: number | null;
          equity_pct_at_generation?: number | null;
          debt_pct_at_generation?: number | null;
          risk_score_at_generation?: number | null;
          generated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          portfolio_id?: string;
          week_start_date?: string;
          week_end_date?: string;
          headline?: string;
          summary_points?: string[];
          status?: 'no_action_required' | 'monitor' | 'attention_required';
          allocation_drift_summary?: string | null;
          risk_alignment_status?: 'aligned' | 'slightly_drifted' | 'review_suggested' | null;
          goal_progress_summary?: string | null;
          diversification_note?: string | null;
          reflection_prompt?: string | null;
          portfolio_value_at_generation?: number | null;
          equity_pct_at_generation?: number | null;
          debt_pct_at_generation?: number | null;
          risk_score_at_generation?: number | null;
          generated_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

// =============================================================================
// HELPER TYPES
// =============================================================================

// Shorthand types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

// Specific table types for convenience
export type User = Tables<'users'>;
export type Portfolio = Tables<'portfolios'>;
export type Asset = Tables<'assets'>;
export type Holding = Tables<'holdings'>;
export type PortfolioMetrics = Tables<'portfolio_metrics'>;
export type PortfolioInsight = Tables<'portfolio_insights'>;
export type MarketContext = Tables<'market_context'>;
export type CopilotSession = Tables<'copilot_sessions'>;
export type OnboardingSnapshot = Tables<'onboarding_snapshots'>;

// Insert types
export type UserInsert = InsertTables<'users'>;
export type PortfolioInsert = InsertTables<'portfolios'>;
export type HoldingInsert = InsertTables<'holdings'>;
export type CopilotSessionInsert = InsertTables<'copilot_sessions'>;
export type OnboardingSnapshotInsert = InsertTables<'onboarding_snapshots'>;

// AI Summary types
export type AIDailySummary = Tables<'ai_daily_summaries'>;
export type AIWeeklySummary = Tables<'ai_weekly_summaries'>;
export type AIDailySummaryInsert = InsertTables<'ai_daily_summaries'>;
export type AIWeeklySummaryInsert = InsertTables<'ai_weekly_summaries'>;

// =============================================================================
// COPILOT CONTEXT TYPES
// =============================================================================

/**
 * What Copilot READS for context assembly
 */
export interface CopilotContext {
  user: User;
  portfolio: Portfolio;
  holdings: (Holding & { asset: Asset })[];
  metrics: PortfolioMetrics;
  insights: PortfolioInsight[];
  marketContext: MarketContext | null;
}

/**
 * What Copilot WRITES (logs only)
 */
export interface CopilotLogEntry {
  user_id: string;
  session_id: string;
  question: string;
  intent: string;
  response: string;
  response_status: string;
  context_snapshot?: Json;
  guardrails_triggered?: string[];
}

