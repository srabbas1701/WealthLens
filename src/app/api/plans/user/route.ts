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

    // Get current user session
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

    const userId = session.user.id;

    // Fetch user's current plan
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('[User Plan API] Subscription fetch failed:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    if (!subscription?.plan_id) {
      return NextResponse.json({ plan_id: 'free' });
    }

    // Fetch plan metadata (UI only)
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, monthly_price, annual_price')
      .eq('id', subscription.plan_id)
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
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
    });
  } catch (error) {
    console.error('[User Plan API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
