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
  /** Remaining scenario views this period; set when trial or limited plan */
  scenario_remaining?: number;
  /** Set when user has an active trial */
  trial?: EntitlementsTrial;
  /** Active paid plan tier, e.g. 'pro' | 'premium'. Undefined for free/trial-only users. */
  plan_tier?: string;
}
