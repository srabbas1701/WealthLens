/**
 * User Capabilities API – where everything connects
 *
 * GET /api/capabilities/user
 *
 * Backend logic (canonical):
 * 1. Check trial: if user_trials.is_active && ends_at > now() → grant ALL capabilities (limits handled separately).
 * 2. Else: plan_id from user_subscriptions → capabilities from plan_capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserCapabilities, Capability, ActiveTrial, TrialLimits } from '@/types/capabilities';

/** Default limits for trial users; enforcement is separate from capability checks. */
const TRIAL_LIMITS: TrialLimits = {
  analyst_queries_per_month: 20,
  insights_per_week: 10,
  analytics_views_per_month: 50,
  pdf_exports_per_month: 3,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 1. Check trial: is_active && ends_at > now() → grant all capabilities (limits handled separately)
    const { data: trialRow, error: trialError } = await supabase
      .from('user_trials')
      .select('ends_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!trialError && trialRow?.ends_at) {
      const capabilities = await getAllActiveCapabilities(supabase);
      const capabilityKeys = capabilities.map(c => c.key);

      const trial: ActiveTrial = {
        active: true,
        ends_at: trialRow.ends_at,
        limits: TRIAL_LIMITS,
      };

      const userCapabilities: UserCapabilities = {
        user_id: userId,
        plan_id: null,
        capabilities,
        capability_keys: capabilityKeys,
        trial,
      };
      return NextResponse.json(userCapabilities);
    }

    // 2. Else: plan from user_subscriptions → isCapabilityEnabled(planId, capability)
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[User Capabilities API] Error fetching user subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription', details: subError.message },
        { status: 500 }
      );
    }

    const planId = subscription?.plan_id ?? null;

    if (!planId) {
      return NextResponse.json({
        user_id: userId,
        plan_id: null,
        capabilities: [],
        capability_keys: [],
      } as UserCapabilities);
    }

    const capabilities = await getCapabilitiesForPlanIds(supabase, [planId]);
    const capabilityKeys = capabilities.map(c => c.key);

    const userCapabilities: UserCapabilities = {
      user_id: userId,
      plan_id: planId,
      capabilities,
      capability_keys: capabilityKeys,
    };

    return NextResponse.json(userCapabilities);
  } catch (error) {
    console.error('[User Capabilities API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** All active capabilities (used when user is on trial – grant all; limits handled separately). */
async function getAllActiveCapabilities(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Capability[]> {
  const { data: rows, error } = await supabase
    .from('capabilities')
    .select('id, key, name, description, category, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('key', { ascending: true });

  if (error || !rows?.length) return [];
  return rows as Capability[];
}

/** Fetch and dedupe capabilities for given plan IDs. */
async function getCapabilitiesForPlanIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planIds: string[]
): Promise<Capability[]> {
  if (planIds.length === 0) return [];

  const { data: planCapabilities, error } = await supabase
    .from('plan_capabilities')
    .select(`
      capability_id,
      capabilities (
        id,
        key,
        name,
        description,
        category,
        is_active,
        created_at,
        updated_at
      )
    `)
    .in('plan_id', planIds);

  if (error || !planCapabilities?.length) return [];

  const seen = new Set<string>();
  const list: Capability[] = [];

  for (const pc of planCapabilities as any[]) {
    const cap = pc.capabilities;
    if (!cap || !cap.is_active || seen.has(cap.id)) continue;
    seen.add(cap.id);
    list.push({
      id: cap.id,
      key: cap.key,
      name: cap.name,
      description: cap.description,
      category: cap.category,
      is_active: cap.is_active,
      created_at: cap.created_at,
      updated_at: cap.updated_at,
    });
  }

  return list;
}
