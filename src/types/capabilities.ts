/**
 * Capability Types
 * 
 * Types for capability-based feature access control
 */

export interface Capability {
  id: string;
  key: string; // Unique identifier (e.g., 'advanced_analytics', 'unlimited_analyst')
  name: string; // Human-readable name
  description: string | null;
  category: string | null; // Optional category grouping
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCapability {
  user_id: string;
  capability_key: string;
  capability: Capability;
}

/** Limits applied when user is on an active trial (Premium capabilities with caps) */
export interface TrialLimits {
  analyst_queries_per_month?: number;
  insights_per_week?: number;
  analytics_views_per_month?: number;
  pdf_exports_per_month?: number;
  scenario_views_per_month?: number;
}

/** Active trial info when user_trials.is_active = true AND now() < ends_at */
export interface ActiveTrial {
  active: true;
  ends_at: string; // ISO date
  limits: TrialLimits;
}

export interface UserCapabilities {
  user_id: string;
  plan_id: string | null;
  capabilities: Capability[];
  capability_keys: string[]; // For quick lookup
  /** Set when user has an active trial; grants Premium capabilities with limits */
  trial?: ActiveTrial;
}

/**
 * Common capability keys used throughout the app.
 * Backend: hasCapability(userId, key) → trial active ? true : isCapabilityEnabled(planId, key).
 * Frontend: hasCapability(key) ? showFeature() : showUpgradeModal().
 */
export const CAPABILITY_KEYS = {
  // Analytics
  ADVANCED_ANALYTICS: 'advanced_analytics',
  SECTOR_EXPOSURE: 'sector_exposure',
  MARKET_CAP_EXPOSURE: 'market_cap_exposure',
  GEOGRAPHY_EXPOSURE: 'geography_exposure',

  // Portfolio Analyst
  UNLIMITED_ANALYST: 'unlimited_analyst',
  ANALYST_QUERIES: 'analyst_queries',

  // Insights
  ADVANCED_INSIGHTS: 'advanced_insights',
  UNLIMITED_INSIGHTS: 'unlimited_insights',

  // Reports & Exports
  PDF_REPORTS: 'pdf_reports',
  EXCEL_EXPORTS: 'excel_exports',

  // Health & Risk
  PORTFOLIO_HEALTH_SCORE: 'portfolio_health_score',
  STABILITY_ANALYSIS: 'stability_analysis',
  SCENARIO_ANALYSIS: 'scenario_analysis',

  // Weekly Summaries
  WEEKLY_DEEP_DIVES: 'weekly_deep_dives',

  // Liabilities & other features
  MANAGE_LIABILITIES: 'manage_liabilities',
  VIEW_HOLDINGS: 'view_holdings',

  // AI
  USE_AI_HELP: 'use_ai_help',
} as const;

export type CapabilityKey = typeof CAPABILITY_KEYS[keyof typeof CAPABILITY_KEYS];
