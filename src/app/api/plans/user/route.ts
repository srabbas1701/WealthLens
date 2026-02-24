/**
 * User Plan API (UI ONLY)
 *
 * GET /api/plans/user
 *
 * IMPORTANT:
 * - This endpoint is for DISPLAY PURPOSES ONLY
 * - Do NOT use this for feature gating or authorization
 * - Trials and entitlements are handled elsewhere
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (validates JWT server-side)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Fetch user's current plan (active only, not expired)
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier, status, razorpay_subscription_id, current_period_end, billing_cycle')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle();

    if (subError) {
      console.error('[User Plan API] Subscription fetch failed:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    if (!subscription?.tier) {
      return NextResponse.json({ plan_id: 'free', tier: 'free' });
    }

    // Fetch plan metadata (UI only)
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, monthly_price, annual_price')
      .eq('id', subscription.tier)
      .single();

    if (planError || !plan) {
      console.error('[User Plan API] Plan fetch failed:', planError);
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      plan_id: plan.id,
      plan_name: plan.name,
      tier: subscription.tier,
      status: subscription.status,
      billing_cycle: subscription.billing_cycle,
      current_period_end: subscription.current_period_end,
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      plan: { id: plan.id, name: plan.name, monthly_price: plan.monthly_price, annual_price: plan.annual_price },
    });
  } catch (error) {
    console.error('[User Plan API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
