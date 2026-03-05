/**
 * User entitlements – flat map from getUserEntitlements().
 * This is the ONLY source of truth for what a user can do and remaining usage.
 */

import type { TrialLimits } from '@/types/capabilities';

/** Trial info when user has an active trial (user_trials). */
export interface EntitlementsTrial {
  active: true;
  ends_at: string;
  limits?: TrialLimits;
}

/** Capability keys are booleans; usage counters are numbers; trial when on trial. */
export interface UserEntitlements {
  [capabilityKey: string]: boolean | number | string | EntitlementsTrial | undefined;
  /** Remaining AI (e.g. analyst) uses this period; set when trial or limited plan */
  ai_remaining?: number;
  /** Monthly query limit for this user's plan (free=5, trial=15, pro=20, premium=50) */
  ai_query_limit?: number;
  /** Date when AI usage counter resets (billing cycle end for paid, first of next month for free/trial) */
  ai_reset_date?: string;
  /** Remaining scenario views this period; set when trial or limited plan */
  scenario_remaining?: number;
  /** Set when user has an active trial */
  trial?: EntitlementsTrial;
  /** Active paid plan tier: 'free' | 'pro' | 'premium'. 'free' for unauthenticated/no-plan users. */
  plan_tier?: string;
}
