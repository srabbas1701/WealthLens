/**
 * POST /api/payments/subscribe
 *
 * Production-ready Razorpay subscription creation.
 * - Authenticates via Supabase server client
 * - Accepts tier + billing_cycle
 * - Prevents downgrade, cancels old on upgrade
 * - Inserts new user_subscriptions record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import razorpay from '@/lib/payments/razorpay';

const TIER_ORDER = { free: 0, pro: 1, premium: 2 } as const;

type Tier = 'pro' | 'premium';
type BillingCycle = 'monthly' | 'annual';

const PLAN_ENV_KEYS: Record<Tier, Record<BillingCycle, string>> = {
  pro: {
    monthly: 'RAZORPAY_PRO_MONTHLY_PLAN',
    annual: 'RAZORPAY_PRO_ANNUAL_PLAN',
  },
  premium: {
    monthly: 'RAZORPAY_PREMIUM_MONTHLY_PLAN',
    annual: 'RAZORPAY_PREMIUM_ANNUAL_PLAN',
  },
};

function getRazorpayPlanId(tier: Tier, billingCycle: BillingCycle): string | null {
  const key = PLAN_ENV_KEYS[tier][billingCycle];
  const value = process.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Configuration error', details: 'Razorpay credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('[Subscribe] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Sign in required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const admin = createAdminClient();

    let body: { tier?: Tier; billing_cycle?: BillingCycle };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad request', details: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const tier = body?.tier;
    const billingCycle = body?.billing_cycle;

    const validTiers: Tier[] = ['pro', 'premium'];
    const validCycles: BillingCycle[] = ['monthly', 'annual'];

    if (!tier || !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Bad request', details: 'tier must be "pro" or "premium"' },
        { status: 400 }
      );
    }

    if (!billingCycle || !validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Bad request', details: 'billing_cycle must be "monthly" or "annual"' },
        { status: 400 }
      );
    }

    const planId = getRazorpayPlanId(tier, billingCycle);
    if (!planId) {
      const envKey = PLAN_ENV_KEYS[tier][billingCycle];
      return NextResponse.json(
        {
          error: 'Configuration error',
          details: `Razorpay plan not configured. Set ${envKey} in environment.`,
        },
        { status: 500 }
      );
    }

    // Fetch current active subscription
    const { data: currentSub, error: subError } = await admin
      .from('user_subscriptions')
      .select('id, plan_id, provider_subscription_id, razorpay_subscription_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[Subscribe] Fetch subscription error:', subError);
      return NextResponse.json(
        { error: 'Internal error', details: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    let currentTier: keyof typeof TIER_ORDER = 'free';
    if (currentSub?.plan_id) {
      const { data: plan } = await admin
        .from('plans')
        .select('name')
        .eq('id', currentSub.plan_id)
        .maybeSingle();
      const planName = (plan as { name?: string } | null)?.name?.toLowerCase();
      if (planName && planName in TIER_ORDER) {
        currentTier = planName as keyof typeof TIER_ORDER;
      }
    }

    // Prevent downgrade
    if (TIER_ORDER[currentTier] >= TIER_ORDER[tier]) {
      return NextResponse.json(
        {
          error: 'Downgrade not allowed',
          details: `You are already on ${currentTier}. To change plans, choose a higher tier.`,
        },
        { status: 400 }
      );
    }

    // Upgrade: cancel old Razorpay subscription immediately
    if (currentSub?.provider_subscription_id || currentSub?.razorpay_subscription_id) {
      const oldRazorpayId =
        currentSub.provider_subscription_id ?? currentSub.razorpay_subscription_id;
      if (oldRazorpayId) {
        try {
          await razorpay.subscriptions.cancel(oldRazorpayId, false);
        } catch (cancelErr) {
          console.error('[Subscribe] Cancel old subscription error:', cancelErr);
          return NextResponse.json(
            {
              error: 'Upgrade failed',
              details: 'Could not cancel existing subscription. Please try again.',
            },
            { status: 500 }
          );
        }
        const { error: updateErr } = await admin
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', currentSub.id);

        if (updateErr) {
          console.error('[Subscribe] Update old subscription status error:', updateErr);
        }
      }
    }

    // Resolve internal plan UUID
    const { data: plan, error: planError } = await admin
      .from('plans')
      .select('id')
      .eq('name', tier)
      .limit(1)
      .maybeSingle();

    if (planError || !plan) {
      console.error('[Subscribe] Plan lookup error:', planError);
      return NextResponse.json(
        { error: 'Configuration error', details: `Plan "${tier}" not found` },
        { status: 500 }
      );
    }

    // Create Razorpay subscription
    let razorpaySubscription: { id: string };
    try {
      razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 120,
        quantity: 1,
        customer_notify: true,
        notes: {
          user_id: userId,
          billing_cycle: billingCycle,
          tier,
        },
      });
    } catch (rzpErr) {
      const message = rzpErr instanceof Error ? rzpErr.message : 'Unknown error';
      console.error('[Subscribe] Razorpay create error:', rzpErr);
      const status =
        typeof (rzpErr as { statusCode?: number }).statusCode === 'number'
          ? (rzpErr as { statusCode: number }).statusCode
          : 500;
      return NextResponse.json(
        { error: 'Payment error', details: message },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }

    if (!razorpaySubscription?.id) {
      return NextResponse.json(
        { error: 'Payment error', details: 'Subscription creation did not return an ID' },
        { status: 500 }
      );
    }

    // Insert new user_subscriptions record
    const insertPayload = {
      user_id: userId,
      plan_id: plan.id,
      billing_cycle: billingCycle,
      provider_subscription_id: razorpaySubscription.id,
      razorpay_subscription_id: razorpaySubscription.id,
      payment_provider: 'razorpay',
      status: 'pending',
      started_at: new Date().toISOString(),
    };

    const { error: insertError } = await admin
      .from('user_subscriptions')
      .insert(insertPayload);

    if (insertError) {
      console.error('[Subscribe] Insert error:', insertError);
      try {
        await razorpay.subscriptions.cancel(razorpaySubscription.id, false);
      } catch {
        /* best-effort rollback */
      }
      return NextResponse.json(
        {
          error: 'Internal error',
          details: 'Subscription created but failed to save. Please contact support.',
        },
        { status: 500 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      console.warn('[Subscribe] RAZORPAY_KEY_ID not set');
    }

    return NextResponse.json({
      subscriptionId: razorpaySubscription.id,
      key: keyId ?? '',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Subscribe] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal error', details: message },
      { status: 500 }
    );
  }
}
