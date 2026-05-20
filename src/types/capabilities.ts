/**
 * Capability Types
 * 
 * Types for capability-based feature access control
 */

export interface Capability {
  id: string;
  key: string; // Unique identifier (e.g., 'view_advanced_analytics', 'use_ai_help')
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
 * Capability keys – SOURCE OF TRUTH, must match database capabilities table exactly.
 * Backend: hasCapability(userId, key) → trial active ? true : isCapabilityEnabled(planId, key).
 * Frontend: hasCapability(key) ? showFeature() : showUpgradeModal().
 */
export const CAPABILITY_KEYS = {
  VIEW_HOLDINGS: 'view_holdings',
  VIEW_BASIC_ANALYTICS: 'view_basic_analytics',
  VIEW_ADVANCED_ANALYTICS: 'view_advanced_analytics',
  RUN_SCENARIOS: 'run_scenarios',
  MANAGE_COMMODITIES: 'manage_commodities',
  MANAGE_REAL_ASSETS: 'manage_real_assets',
  MANAGE_LIABILITIES: 'manage_liabilities',
  MANAGE_INSURANCE: 'manage_insurance',
  DOWNLOAD_REPORTS: 'download_reports',
  USE_AI_HELP: 'use_ai_help',
} as const;

export type CapabilityKey = typeof CAPABILITY_KEYS[keyof typeof CAPABILITY_KEYS];
