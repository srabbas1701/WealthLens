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
    const ourPlanId = planRow.id;

    // total_count: 1 per billing cycle (we use separate Razorpay plans for monthly vs yearly)
    const totalCount = 1;

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

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

    const { data: existing } = await admin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin
        .from('user_subscriptions')
        .update({
          razorpay_subscription_id: subscription.id,
          plan_id: ourPlanId,
          status: 'pending',
        })
        .eq('id', existing.id);
    } else {
      await admin.from('user_subscriptions').insert({
        user_id: userId,
        plan_id: ourPlanId,
        razorpay_subscription_id: subscription.id,
        status: 'pending',
      });
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
