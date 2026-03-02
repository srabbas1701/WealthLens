/**
 * getUserEntitlements(userId) – ONLY source of truth for what a user can do.
 *
 * 1. Fetch active plan from user_subscriptions
 * 2. Fetch enabled capabilities from plan_capabilities
 * 3. If user_trials is active and not expired: temporarily enable all Premium capabilities, return usage counters (AI, scenarios)
 * 4. Return flat map: { view_holdings: true, use_ai_help: true, ai_remaining: 8, scenario_remaining: 2, trial?, ... }
 *
 * Wrapped in React cache() so multiple callers in the same request share one result (no DB spam).
 */

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { UserEntitlements } from '@/types/entitlements';
import type { TrialLimits } from '@/types/capabilities';

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Trial limits: AI 15, scenarios 5. Block when used >= limit. */
const DEFAULT_TRIAL_LIMITS: TrialLimits = {
  analyst_queries_per_month: 15,
  scenario_views_per_month: 5,
};

/** Paid plan AI query limits per month. Pro=15, Premium=50. */
const PAID_PLAN_AI_LIMITS: Record<string, number> = {
  pro: 15,
  premium: 50,
};

async function getUserEntitlementsUncached(
  userId: string,
  supabase?: SupabaseClient
): Promise<UserEntitlements> {
  const db = supabase ?? (await createClient());

  // 1. All capability keys from DB (to build full map)
  const { data: allCaps } = await db
    .from('capabilities')
    .select('key');
  const allKeys = (allCaps ?? []).map((r: { key: string }) => r.key);

  // 2. User's active plan from user_subscriptions
  const now = new Date().toISOString();
  const { data: sub } = await db
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', now)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const planId = sub?.tier ?? null;

  // 3. Enabled capabilities from plan_capabilities
  let enabledByPlan = new Set<string>();
  if (planId) {
    const { data: planCaps } = await db
      .from('plan_capabilities')
      .select('capability_key')
      .eq('plan_id', planId)
      .eq('enabled', true);
    for (const row of planCaps ?? []) {
      if (row.capability_key) enabledByPlan.add(row.capability_key);
    }
  }

  const entitlements: UserEntitlements = {};
  for (const key of allKeys) {
    entitlements[key] = enabledByPlan.has(key);
  }

  // 4. Trial may expire anytime: always check ends_at dynamically (never rely on frontend state)
  const { data: trial } = await db
    .from('user_trials')
    .select('ends_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('ends_at', now)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (trial?.ends_at) {
    const premiumKeys = await getPremiumCapabilityKeys(db);
    for (const key of premiumKeys) {
      entitlements[key] = true;
    }
    const limits = { ...DEFAULT_TRIAL_LIMITS };
    const aiLimit = limits.analyst_queries_per_month ?? 15;
    const scenarioLimit = limits.scenario_views_per_month ?? 5;
    const usage = await getUsageCounters(db, userId, limits);
    entitlements.ai_remaining = Math.max(0, aiLimit - (usage.ai_used ?? 0));
    entitlements.scenario_remaining = Math.max(0, scenarioLimit - (usage.scenario_used ?? 0));
    entitlements.trial = { active: true, ends_at: trial.ends_at, limits };
  } else if (planId && PAID_PLAN_AI_LIMITS[planId] !== undefined) {
    // Paid plan (Pro/Premium): enforce monthly AI query limit.
    // Also explicitly grant use_ai_help — paid plans may be missing this row in
    // plan_capabilities (e.g. premium), but the PAID_PLAN_AI_LIMITS entry IS the
    // source of truth that this plan has AI access.
    entitlements['use_ai_help'] = true;
    entitlements.plan_tier = planId;
    const paidAiLimit = PAID_PLAN_AI_LIMITS[planId];
    const usage = await getUsageCounters(db, userId, DEFAULT_TRIAL_LIMITS);
    entitlements.ai_remaining = Math.max(0, paidAiLimit - (usage.ai_used ?? 0));
  }

  return entitlements;
}

/**
 * Request-scoped cached getUserEntitlements. Use this everywhere so the same request
 * does not hit the DB multiple times for the same user.
 */
export const getUserEntitlements = cache(getUserEntitlementsUncached);

/** Get capability keys enabled for any plan with monthly_price > 0 (Premium). */
async function getPremiumCapabilityKeys(db: SupabaseClient): Promise<string[]> {
  const { data: plans } = await db
    .from('plans')
    .select('id')
    .gt('monthly_price', 0);
  if (!plans?.length) return [];
  const planIds = plans.map((p: { id: string }) => p.id);
  const { data: rows } = await db
    .from('plan_capabilities')
    .select('capability_key')
    .in('plan_id', planIds)
    .eq('enabled', true);
  const keys = new Set<string>();
  for (const row of rows ?? []) {
    if (row.capability_key) keys.add(row.capability_key);
  }
  return Array.from(keys);
}

function getMonthStart(): string {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  return startOfMonth.toISOString().slice(0, 10);
}

/** Get current period usage for AI and scenarios (subscription_usage if present). */
async function getUsageCounters(
  db: SupabaseClient,
  userId: string,
  _limits: TrialLimits
): Promise<{ ai_used: number; scenario_used: number }> {
  try {
    const monthStart = getMonthStart();

    const { data: usage, error } = await db
      .from('subscription_usage')
      .select('analyst_queries, analytics_views')
      .eq('user_id', userId)
      .eq('month', monthStart)
      .maybeSingle();

    if (error || !usage) return { ai_used: 0, scenario_used: 0 };
    const u = usage as { analyst_queries?: number; scenario_views?: number; analytics_views?: number };
    return {
      ai_used: u.analyst_queries ?? 0,
      scenario_used: u.scenario_views ?? u.analytics_views ?? 0,
    };
  } catch {
    return { ai_used: 0, scenario_used: 0 };
  }
}

export type TrialUsageType = 'ai' | 'scenario';

/**
 * Increment trial usage for the current month (subscription_usage).
 * Call after a successful AI query or scenario view.
 * Always re-checks ends_at dynamically: only increments if user still has an active trial (ends_at > now).
 */
export async function incrementTrialUsage(
  db: SupabaseClient,
  userId: string,
  type: TrialUsageType
): Promise<void> {
  const now = new Date().toISOString();
  const { data: trial } = await db
    .from('user_trials')
    .select('ends_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('ends_at', now)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!trial?.ends_at) return;

  const monthStart = getMonthStart();
  const column = type === 'ai' ? 'analyst_queries' : 'analytics_views';

  const { data: row, error: fetchError } = await db
    .from('subscription_usage')
    .select(column)
    .eq('user_id', userId)
    .eq('month', monthStart)
    .maybeSingle();

  if (fetchError) {
    console.error('[incrementTrialUsage] fetch error:', fetchError);
    return;
  }

  const current = (row as Record<string, number>)?.[column] ?? 0;
  const next = current + 1;

  if (row) {
    const { error: updateError } = await db
      .from('subscription_usage')
      .update({ [column]: next })
      .eq('user_id', userId)
      .eq('month', monthStart);
    if (updateError) console.error('[incrementTrialUsage] update error:', updateError);
  } else {
    const { error: insertError } = await db.from('subscription_usage').insert({
      user_id: userId,
      month: monthStart,
      analyst_queries: type === 'ai' ? 1 : 0,
      analytics_views: type === 'scenario' ? 1 : 0,
    });
    if (insertError) console.error('[incrementTrialUsage] insert error:', insertError);
  }
}

/**
 * Increment AI usage for any user type (trial OR paid plan).
 * Replaces incrementTrialUsage for the AI analyst endpoint.
 * - Trial users: increments if trial is active
 * - Pro/Premium users: always increments (limit was pre-checked by requirePaidAction)
 */
export async function incrementAIUsage(
  db: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const monthStart = getMonthStart();
  const column = 'analyst_queries';

  // Check if user is on an active trial
  const { data: trial } = await db
    .from('user_trials')
    .select('ends_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('ends_at', now)
    .limit(1)
    .maybeSingle();

  // Check if user is on an active paid plan
  const { data: sub } = await db
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', now)
    .limit(1)
    .maybeSingle();

  const shouldIncrement = !!trial?.ends_at || !!(sub?.tier && PAID_PLAN_AI_LIMITS[sub.tier] !== undefined);
  if (!shouldIncrement) return;

  const { data: row, error: fetchError } = await db
    .from('subscription_usage')
    .select(column)
    .eq('user_id', userId)
    .eq('month', monthStart)
    .maybeSingle();

  if (fetchError) {
    console.error('[incrementAIUsage] fetch error:', fetchError);
    return;
  }

  const current = (row as Record<string, number>)?.[column] ?? 0;
  const next = current + 1;

  if (row) {
    const { error: updateError } = await db
      .from('subscription_usage')
      .update({ [column]: next })
      .eq('user_id', userId)
      .eq('month', monthStart);
    if (updateError) console.error('[incrementAIUsage] update error:', updateError);
  } else {
    const { error: insertError } = await db.from('subscription_usage').insert({
      user_id: userId,
      month: monthStart,
      analyst_queries: 1,
      analytics_views: 0,
    });
    if (insertError) console.error('[incrementAIUsage] insert error:', insertError);
  }
}
