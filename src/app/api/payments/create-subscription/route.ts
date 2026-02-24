/**
 * POST /api/payments/create-subscription
 *
 * Creates a Razorpay subscription and returns checkout options.
 * Inserts pending row in user_subscriptions for webhook matching.
 * Activation is handled by webhook only (do not trust frontend).
 *
 * Body: { planId: 'pro' | 'premium', billingCycle: 'monthly' | 'annual', userId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createAdminClient } from '@/lib/supabase/server';

type RequestBody = {
  planId?: 'pro' | 'premium';
  billingCycle?: 'monthly' | 'annual';
  userId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payment configuration error', details: 'Razorpay credentials not configured' },
        { status: 500 }
      );
    }

    let body: RequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad request', details: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { planId, billingCycle } = body;

    const userId = typeof body?.userId === 'string' ? body.userId.trim() : null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Bad request', details: 'userId is required' },
        { status: 400 }
      );
    }

    const validPlans = ['pro', 'premium'];
    const validCycles = ['monthly', 'annual'];
    if (!planId || !validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Bad request', details: 'planId must be "pro" or "premium"' },
        { status: 400 }
      );
    }
    if (!billingCycle || !validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Bad request', details: 'billingCycle must be "monthly" or "annual"' },
        { status: 400 }
      );
    }

    let razorpayPlanId: string | undefined;
    if (planId === 'pro' && billingCycle === 'monthly') {
      razorpayPlanId = process.env.RAZORPAY_PRO_MONTHLY_PLAN;
    }
    if (planId === 'pro' && billingCycle === 'annual') {
      razorpayPlanId = process.env.RAZORPAY_PRO_ANNUAL_PLAN;
    }
    if (planId === 'premium' && billingCycle === 'monthly') {
      razorpayPlanId = process.env.RAZORPAY_PREMIUM_MONTHLY_PLAN;
    }
    if (planId === 'premium' && billingCycle === 'annual') {
      razorpayPlanId = process.env.RAZORPAY_PREMIUM_ANNUAL_PLAN;
    }

    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: 'Plan not found or not configured' },
        { status: 400 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const admin = createAdminClient();
    const { data: planRow, error: planError } = await admin
      .from('plans')
      .select('id')
      .eq('id', planId)
      .limit(1)
      .maybeSingle();

    if (planError || !planRow) {
      return NextResponse.json(
        { error: 'Bad request', details: `Plan "${planId}" not found` },
        { status: 400 }
      );
    }

    // Fetch current subscription (if any)
    const { data: currentSub } = await admin
      .from('user_subscriptions')
      .select('id, tier, status, billing_cycle, razorpay_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    // Block downgrade attempts
    const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };
    const currentTier = currentSub?.tier ?? 'free';
    const currentRank = PLAN_RANK[currentTier] ?? 0;
    const newRank = PLAN_RANK[planId] ?? 0;

    if (currentSub?.status === 'active' && newRank < currentRank) {
      return NextResponse.json(
        { error: 'Downgrade not supported. Please contact support.' },
        { status: 400 }
      );
    }

    // If same plan AND same billing cycle AND active → already subscribed
    if (
      currentSub?.status === 'active' &&
      currentSub?.tier === planId &&
      currentSub?.billing_cycle === billingCycle
    ) {
      return NextResponse.json(
        { error: 'You are already on this plan and billing cycle.' },
        { status: 400 }
      );
    }

    // If upgrading from an active subscription → cancel old Razorpay sub first
    const previousRazorpaySubId = currentSub?.razorpay_subscription_id ?? null;
    if (currentSub?.status === 'active' && previousRazorpaySubId) {
      try {
        await instance.subscriptions.cancel(previousRazorpaySubId, true);
        console.log('[Create subscription] Cancelled previous subscription:', previousRazorpaySubId);
      } catch (cancelErr) {
        // Log but don't block — Razorpay may already have it cancelled
        console.warn('[Create subscription] Could not cancel previous subscription:', cancelErr);
      }
    }

    // total_count: 120 per billing cycle (we use separate Razorpay plans for monthly vs yearly)
    const totalCount = 120;

    const subscription = await instance.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: true,
      notes: {
        user_id: userId,
        billing_cycle: billingCycle,
      },
    });

    if (!subscription?.id) {
      return NextResponse.json(
        { error: 'Payment error', details: 'Subscription creation did not return an ID' },
        { status: 500 }
      );
    }

    const { error: upsertError } = await admin.from('user_subscriptions').upsert(
      {
        user_id: userId,
        tier: planId,
        status: 'pending',
        razorpay_subscription_id: subscription.id,
        billing_cycle: billingCycle === 'annual' ? 'yearly' : billingCycle,
        payment_provider: 'razorpay',
        previous_subscription_id: previousRazorpaySubId,
        upgraded_from: currentSub?.status === 'active' ? currentTier : null,
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      console.error('[Create subscription] Supabase upsert error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to create subscription', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      checkoutOptions: {
        key: keyId,
        subscription_id: subscription.id,
        short_url: subscription.short_url ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Create subscription] Error:', err);

    // Razorpay API errors often have statusCode
    const statusCode =
      typeof (err as { statusCode?: number }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500;

    const httpStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

    return NextResponse.json(
      {
        error: 'Payment error',
        details: message,
      },
      { status: httpStatus }
    );
  }
}
