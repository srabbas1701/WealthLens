/**
 * PATCH /api/subscription/plan
 *
 * Upgrade/downgrade: update user_subscriptions.plan_id only.
 * - Do NOT touch data tables (holdings, portfolios, etc.).
 * - Entitlements auto-update via getUserEntitlements (reads plan_id → plan_capabilities).
 *
 * Body: { plan_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const planId = typeof body?.plan_id === 'string' ? body.plan_id.trim() : null;

    if (!planId) {
      return NextResponse.json(
        { error: 'Bad request', details: 'plan_id is required' },
        { status: 400 }
      );
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Invalid plan', details: 'Plan not found or inactive' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ plan_id: planId })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[Subscription plan] Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription', details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase.from('user_subscriptions').insert({
        user_id: userId,
        plan_id: planId,
      });

      if (insertError) {
        console.error('[Subscription plan] Insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to set subscription', details: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, plan_id: planId });
  } catch (err) {
    console.error('[Subscription plan] Error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
