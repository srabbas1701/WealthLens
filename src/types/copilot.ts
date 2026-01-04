/**
 * Copilot API Types
 * 
 * Shared types for frontend-backend communication.
 * These prevent UI drift and ensure consistent data handling.
 * 
 * IMPORTANT: Frontend must NOT interpret or modify these values.
 * Render responses verbatim and respect status flags.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ResponseType = 'explanation' | 'summary' | 'confirmation';
export type Status = 'no_action_required' | 'monitor' | 'attention_required';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type Source = 'dashboard' | 'onboarding' | 'homepage' | 'floating_copilot';
export type Intent = 
  | 'portfolio_explanation'
  | 'daily_movement'
  | 'risk_explanation'
  | 'goal_progress'
  | 'sector_exposure'
  | 'general_question'
  | 'onboarding_understanding';

// =============================================================================
// /api/copilot/query
// =============================================================================

/**
 * Request payload for /api/copilot/query
 * 
 * Used by:
 * - Floating Copilot button
 * - Dashboard "Get Help"
 * - Contextual explain buttons
 */
export interface CopilotQueryRequest {
  user_id: string;
  session_id: string;
  source: Source;
  intent: Intent;
  question: string;
}

/**
 * Response payload from /api/copilot/query
 * 
 * Backend responsibilities (frontend does NONE of this):
 * - Fetches portfolio snapshot
 * - Fetches risk profile
 * - Fetches market context
 * - Applies guardrails
 * - Injects system prompt
 * - Calls LLM
 * - Post-processes response
 */
export interface CopilotQueryResponse {
  response_type: ResponseType;
  status: Status;
  summary: string;
  explanation?: string;
  confidence_level: ConfidenceLevel;
  follow_up_suggestions?: string[];
}

// =============================================================================
// /api/copilot/summary
// =============================================================================

/**
 * Request payload for /api/copilot/summary
 * 
 * Used for:
 * - Dashboard top card (AI Daily Summary)
 * - Future notifications
 * - Email digests
 */
export interface CopilotSummaryRequest {
  user_id: string;
  date: string; // ISO date format: YYYY-MM-DD
}

/**
 * Response payload from /api/copilot/summary
 * 
 * Frontend rendering rules:
 * - Render verbatim
 * - No interpretation
 * - No recalculation
 */
export interface CopilotSummaryResponse {
  headline: string;
  summary_points: string[];
  status: Status;
}

// =============================================================================
// /api/onboarding/understanding
// =============================================================================

/**
 * Risk answer options for onboarding
 */
export type RiskAnswer = 
  | 'prefer_safety'
  | 'worried_but_stay_invested'
  | 'comfortable_with_volatility'
  | 'focus_on_growth';

/**
 * Portfolio snapshot for onboarding
 */
export interface PortfolioSnapshot {
  equity_pct: number;
  debt_pct: number;
  cash_pct: number;
  gold_pct?: number;
  other_pct?: number;
}

/**
 * Request payload for /api/onboarding/understanding
 * 
 * Powers the "Here's what we understand" screen
 */
export interface OnboardingUnderstandingRequest {
  user_id: string;
  goals: string;
  horizon_years: number;
  risk_answers: RiskAnswer[];
  portfolio_snapshot: PortfolioSnapshot;
}

/**
 * Response payload from /api/onboarding/understanding
 * 
 * Frontend:
 * - Shows summary
 * - User confirms or edits
 * - Data saved
 */
export interface OnboardingUnderstandingResponse {
  risk_label: string;
  goal_alignment: string;
  summary: string[];
  confidence: ConfidenceLevel;
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

/**
 * Status to UI color mapping
 * 
 * UI rendering rules:
 * - no_action_required → green pill
 * - monitor → neutral/gray
 * - attention_required → amber (rare)
 * 
 * 🚫 NEVER RED
 */
export const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  no_action_required: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  monitor: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  attention_required: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

/**
 * Get status display text
 */
export const STATUS_LABELS: Record<Status, string> = {
  no_action_required: 'No action needed',
  monitor: 'Worth monitoring',
  attention_required: 'Review suggested',
};

// =============================================================================
// /api/copilot/daily-summary (GET)
// =============================================================================

/**
 * Query parameters for GET /api/copilot/daily-summary
 * 
 * WHY THIS IS A GET ENDPOINT:
 * - Summaries are pre-computed, not generated on-demand
 * - This prevents "refresh anxiety" - users can't regenerate
 * - Copilot explains summaries but doesn't create them
 * 
 * HABIT LOOP DESIGN:
 * - User checks daily → sees calm summary → feels informed
 * - Most days: "no_action_required" → reinforces patience
 * - Occasional: "monitor" → feels engaged without anxiety
 * - Rare: "attention_required" → knows platform is watching
 */
export interface DailySummaryQuery {
  user_id: string;
  date?: string; // ISO date format: YYYY-MM-DD (defaults to today)
}

/**
 * Response from GET /api/copilot/daily-summary
 * 
 * TONE PRINCIPLES:
 * - headline: Always calm, never urgent
 * - summary_points: Factual observations, no predictions
 * - status: "no_action_required" is the happy path (most days)
 * 
 * WHY MOST DAYS SAY "NO ACTION REQUIRED":
 * - Long-term investing is about patience
 * - Daily fluctuations are noise, not signal
 * - Users who feel calm stay invested longer
 * - This builds trust and reduces churn
 */
export interface DailySummaryResponse {
  /** Whether a summary exists for this date */
  found: boolean;
  /** The summary date (ISO format) */
  date: string;
  /** Single-line calm headline - never uses urgency language */
  headline: string;
  /** 2-4 factual summary points - observations, not predictions */
  summary_points: string[];
  /** Status: no_action_required (default), monitor, attention_required */
  status: Status;
  /** Portfolio value at time of generation (for context) */
  portfolio_value?: number;
  /** Market mood when generated (stable, volatile, etc.) */
  market_mood?: string;
  /** When this summary was generated */
  generated_at: string;
}

// =============================================================================
// /api/copilot/weekly-summary (GET)
// =============================================================================

/**
 * Query parameters for GET /api/copilot/weekly-summary
 * 
 * WHY WEEKLY SUMMARIES MATTER:
 * - Daily is "am I okay?" - Weekly is "am I on track?"
 * - Allocation drift only matters over time
 * - Goal progress is a weekly/monthly concept
 * - Provides "zoom out" moment for reflection
 */
export interface WeeklySummaryQuery {
  user_id: string;
  week_start?: string; // ISO date format (defaults to current week)
}

/**
 * Risk alignment status for weekly summaries
 * 
 * WHY THIS EXISTS:
 * - Users want to know if their portfolio still matches their risk profile
 * - "aligned" = everything is fine (most weeks)
 * - "slightly_drifted" = worth noting but not urgent
 * - "review_suggested" = rare, only for significant drift
 */
export type RiskAlignmentStatus = 'aligned' | 'slightly_drifted' | 'review_suggested';

/**
 * Response from GET /api/copilot/weekly-summary
 * 
 * WEEKLY SUMMARY PHILOSOPHY:
 * - Reflective, not reactive
 * - Celebrates consistency ("You stayed the course")
 * - Educational about long-term principles
 * - Never creates FOMO or regret
 * 
 * WHAT IT COVERS:
 * - Risk profile alignment (did allocation drift?)
 * - Goal progress (on track, ahead, behind)
 * - Diversification health
 * - NO predictions about future performance
 * - NO recommendations to buy/sell
 */
export interface WeeklySummaryResponse {
  /** Whether a summary exists for this week */
  found: boolean;
  /** Week start date (Monday) */
  week_start: string;
  /** Week end date (Sunday) */
  week_end: string;
  /** Reflective headline - focuses on the journey, not predictions */
  headline: string;
  /** 3-5 summary points covering the week's observations */
  summary_points: string[];
  /** Status: no_action_required (default), monitor, attention_required */
  status: Status;
  /** How allocation changed over the week - observational, not prescriptive */
  allocation_drift_summary?: string;
  /** Risk alignment: aligned (most weeks), slightly_drifted, review_suggested */
  risk_alignment_status?: RiskAlignmentStatus;
  /** Goal progress observation - never creates anxiety */
  goal_progress_summary?: string;
  /** Diversification observation */
  diversification_note?: string;
  /** Optional reflection prompt to encourage engagement */
  reflection_prompt?: string;
  /** Portfolio value at generation */
  portfolio_value?: number;
  /** When this summary was generated */
  generated_at: string;
}

