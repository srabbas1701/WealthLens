/**
 * Application-level plan provisioning (replaces DB trigger).
 *
 * Ensures every authenticated user has exactly one row in user_subscriptions.
 * If missing, inserts a row with plan_id = free, status = 'active'.
 *
 * - Uses SERVICE ROLE client (bypasses RLS).
 * - Idempotent: safe to call multiple times.
 * - Fails gracefully: logs errors, never throws; does not block auth/session.
 */

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Ensures the user has a row in user_subscriptions. If none exists, inserts
 * one with plan_id = free, status = 'active'. Safe to call after auth success.
 *
 * @param userId - auth user id (e.g. session.user.id)
 */
export async function ensureUserSubscription(userId: string): Promise<void> {
  if (!userId?.trim()) return;

  try {
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    const { data: freePlan, error: planError } = await admin
      .from('plans')
      .select('id')
      .eq('name', 'free')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (planError) {
      console.error('[ensureUserSubscription] Failed to resolve free plan:', planError.message);
      return;
    }
    if (!freePlan?.id) {
      console.error('[ensureUserSubscription] No free plan found in plans table');
      return;
    }

    const { error: insertError } = await admin.from('user_subscriptions').insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return;
      }
      console.error('[ensureUserSubscription] Insert failed:', insertError.message);
      return;
    }
  } catch (e) {
    console.error('[ensureUserSubscription] Error:', e);
  }
}
