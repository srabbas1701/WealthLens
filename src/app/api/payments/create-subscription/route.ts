/**
 * POST /api/payments/create-subscription
 *
 * Creates a Razorpay subscription and returns checkout options.
 *
 * CRITICAL SAFETY RULE — NO DB writes for non-active users here:
 * - NEW subscribers / re-subscribers (cancelled/halted): NO DB row written.
 *   The webhook creates/updates the row when payment is confirmed.
 *   This means closing Razorpay without paying = zero DB change. ✓
 *   This also means cancelled users can re-subscribe without row conflicts. ✓
 * - UPGRADING users (currently active): store intent in pending_* columns ONLY.
 *   The active subscription row (tier, status) is NEVER touched here.
 *   ONLY the webhook sets status='active' and updates tier.
 *
 * Body: { planId: 'pro' | 'premium', billingCycle: 'monthly' | 'annual', userId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createAdminClient } from '@/lib/supabase/server';
import { validateRazorpayConfig, getRazorpayPlanId } from '@/lib/payments/razorpay-config';

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

type RequestBody = {
  planId?: 'pro' | 'premium';
  billingCycle?: 'monthly' | 'annual' | 'yearly';
  userId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('[Create subscription] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing');
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

    const { planId } = body;
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : null;

    // Normalize billing cycle — accept 'annual', 'yearly', 'monthly'
    const rawCycle = body.billingCycle ?? 'monthly';
    const billingCycle: 'monthly' | 'yearly' =
      rawCycle === 'annual' || rawCycle === 'yearly' ? 'yearly' : 'monthly';

    if (!userId) {
      return NextResponse.json(
        { error: 'Bad request', details: 'userId is required' },
        { status: 400 }
      );
    }

    const validPlans = ['pro', 'premium'];
    if (!planId || !validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Bad request', details: 'planId must be "pro" or "premium"' },
        { status: 400 }
      );
    }

    // Map to Razorpay plan ID — throws with a clear message if any env var is missing
    let razorpayPlanId: string;
    try {
      const planConfig = validateRazorpayConfig();
      razorpayPlanId = getRazorpayPlanId(planConfig, planId, billingCycle);
    } catch (configErr) {
      console.error('[Create subscription] Razorpay plan config error:', configErr);
      return NextResponse.json(
        { error: 'Payment configuration error', details: configErr instanceof Error ? configErr.message : 'Plan env vars missing' },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    // Verify plan exists in DB
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

    // Fetch current subscription
    const { data: currentSub } = await admin
      .from('user_subscriptions')
      .select('tier, status, billing_cycle, razorpay_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    const currentTier = currentSub?.tier ?? 'free';
    const currentRank = PLAN_RANK[currentTier] ?? 0;
    const newRank = PLAN_RANK[planId] ?? 0;
    const isCurrentlyActive = currentSub?.status === 'active';

    // Block downgrade
    if (isCurrentlyActive && newRank < currentRank) {
      return NextResponse.json(
        { error: 'Downgrade not supported. Please contact support.' },
        { status: 400 }
      );
    }

    // Block same plan + same cycle (already subscribed)
    if (
      isCurrentlyActive &&
      currentSub?.tier === planId &&
      currentSub?.billing_cycle === billingCycle
    ) {
      return NextResponse.json(
        { error: 'You are already on this plan and billing cycle.' },
        { status: 400 }
      );
    }

    // Create Razorpay subscription
    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const subscription = await instance.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 120,
      quantity: 1,
      customer_notify: true,
      notes: {
        user_id: userId,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    });

    if (!subscription?.id) {
      return NextResponse.json(
        { error: 'Payment error', details: 'Subscription creation did not return an ID' },
        { status: 500 }
      );
    }

    if (isCurrentlyActive) {
      // UPGRADING USER — NEVER touch tier or status.
      // Store intent in pending_* columns only; webhook promotes on payment confirmation.
      const { error: updateError } = await admin
        .from('user_subscriptions')
        .update({
          pending_tier: planId,
          pending_billing_cycle: billingCycle,
          pending_razorpay_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Create subscription] Failed to store pending upgrade:', updateError);
        return NextResponse.json(
          { error: 'Failed to initiate upgrade', details: updateError.message },
          { status: 500 }
        );
      }

      console.log(
        `[Create subscription] Pending upgrade stored for user ${userId}: ` +
        `${currentTier} → ${planId} (${billingCycle}), sub: ${subscription.id}`
      );
    } else {
      // NEW / RE-SUBSCRIBING USER — do NOT write to DB here.
      // The webhook writes the row when payment is confirmed (FLOW 3 via notes).
      // Benefits:
      //   1. Closing the modal leaves zero DB artefacts.
      //   2. Cancelled/halted users can re-subscribe with no row conflicts.
      console.log(
        `[Create subscription] Razorpay subscription created for user ${userId}: ` +
        `${planId} (${billingCycle}), sub: ${subscription.id} — DB row deferred to webhook`
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
    const razorpayError = err as { statusCode?: number; error?: { description?: string; code?: string } };
    const razorpayDescription = razorpayError?.error?.description ?? null;
    const razorpayCode = razorpayError?.error?.code ?? null;
    console.error(
      '[Create subscription] Unhandled error:',
      JSON.stringify({ message, razorpayCode, razorpayDescription, err }, null, 2)
    );
    const statusCode =
      typeof razorpayError.statusCode === 'number' ? razorpayError.statusCode : 500;
    const httpStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    return NextResponse.json(
      { error: 'Payment error', details: razorpayDescription ?? message },
      { status: httpStatus }
    );
  }
}
