/**
 * Server-side hasCapability(userId, capabilityKey).
 * Use in API routes, middleware, server actions.
 *
 * Delegates to getUserEntitlements() – the ONLY source of truth.
 * Never check plan === premium; use this helper only.
 *
 * For paid actions (AI help, downloads, scenarios): use requirePaidAction()
 * so capability + trial limits are enforced (403 if not allowed, 429 if limit exceeded).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserEntitlements } from '@/lib/entitlements';
import type { UserEntitlements } from '@/types/entitlements';

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Returns true if the user has the capability.
 * Uses getUserEntitlements(userId) as the single source of truth.
 */
export async function hasCapability(
  userId: string,
  capabilityKey: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId, supabase);
  return entitlements[capabilityKey] === true;
}

export type RequireCapabilityResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; response: NextResponse };

/**
 * API guard: ensure the current user has the given capability.
 * Use at the start of protected API routes.
 * Returns { ok: true, userId, supabase } or { ok: false, response } to return.
 */
export async function requireCapability(
  capabilityKey: string,
  supabase?: SupabaseClient
): Promise<RequireCapabilityResult> {
  const db = supabase ?? (await createClient());
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      ),
    };
  }

  const allowed = await hasCapability(user.id, capabilityKey, db);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Upgrade required' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id, supabase: db };
}

/** Capability keys that consume a per-period limit; value is the key in entitlements for remaining count. */
const LIMIT_BY_CAPABILITY: Record<string, 'ai_remaining' | 'scenario_remaining'> = {
  use_ai_help: 'ai_remaining',
  run_scenarios: 'scenario_remaining',
};

export type RequirePaidActionResult =
  | { ok: true; userId: string; supabase: SupabaseClient; entitlements: UserEntitlements }
  | { ok: false; response: NextResponse };

/**
 * Paid action guard: call getUserEntitlements(userId), then:
 * - If capability not allowed → 403
 * - If capability has a remaining limit and it is 0 → 429 (trial limit exceeded)
 *
 * Use at the start of every paid action API (AI help, downloads, scenarios).
 * Never trust frontend gating.
 */
export async function requirePaidAction(
  capabilityKey: string,
  supabase?: SupabaseClient
): Promise<RequirePaidActionResult> {
  const db = supabase ?? (await createClient());
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      ),
    };
  }

  const entitlements = await getUserEntitlements(user.id, db);

  if (entitlements[capabilityKey] !== true) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Upgrade required', details: 'Capability not allowed' },
        { status: 403 }
      ),
    };
  }

  const remainingKey = LIMIT_BY_CAPABILITY[capabilityKey];
  if (remainingKey) {
    const remaining = entitlements[remainingKey];
    // Enforce limits for both trial users and paid plan users with monthly caps.
    // ai_remaining is set for trial users (limit 15) and paid plan users (Pro: 10, Premium: 25).
    if (typeof remaining === 'number' && remaining <= 0) {
      const isTrialUser = !!entitlements.trial;
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: isTrialUser ? 'Trial limit exceeded' : 'Monthly limit reached',
            details: `No ${remainingKey} remaining this period`,
            is_trial: isTrialUser,
          },
          { status: 429 }
        ),
      };
    }
  }

  return {
    ok: true,
    userId: user.id,
    supabase: db,
    entitlements,
  };
}
