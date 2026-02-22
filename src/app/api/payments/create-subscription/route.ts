/**
 * POST /api/payments/create-subscription
 *
 * Creates a Razorpay subscription and returns checkout options.
 * Inserts pending row in user_subscriptions for webhook matching.
 * Activation is handled by webhook only (do not trust frontend).
 *
 * Body: { planId: string, userId: string, billingCycle: 'monthly' | 'yearly' }
 * - planId: App plan UUID (looks up razorpay_plan_id) or Razorpay plan ID (plan_xxx)
 * - userId: App user ID
 * - billingCycle: 'monthly' | 'yearly' → total_count: 1 or 12
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createAdminClient } from '@/lib/supabase/server';

type RequestBody = {
  planId?: string;
  userId?: string;
  billingCycle?: 'monthly' | 'yearly';
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

    const planId = typeof body?.planId === 'string' ? body.planId.trim() : null;
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : null;
    const billingCycle = body?.billingCycle;

    if (!planId) {
      return NextResponse.json(
        { error: 'Bad request', details: 'planId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Bad request', details: 'userId is required' },
        { status: 400 }
      );
    }

    const validCycles = ['monthly', 'yearly'];
    if (!billingCycle || !validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Bad request', details: 'billingCycle must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let razorpayPlanId: string;
    let ourPlanId: string;

    if (planId.startsWith('plan_')) {
      const { data: plans } = await admin
        .from('plans')
        .select('id, razorpay_plan_id, razorpay_plan_id_monthly, razorpay_plan_id_yearly')
        .eq('is_active', true)
        .limit(20);
      const plan = (plans ?? []).find(
        (p: { razorpay_plan_id?: string; razorpay_plan_id_monthly?: string; razorpay_plan_id_yearly?: string }) =>
          p.razorpay_plan_id === planId ||
          p.razorpay_plan_id_monthly === planId ||
          p.razorpay_plan_id_yearly === planId
      );
      if (!plan) {
        return NextResponse.json(
          { error: 'Invalid plan', details: 'Razorpay plan not mapped in plans table' },
          { status: 400 }
        );
      }
      razorpayPlanId = planId;
      ourPlanId = plan.id;
    } else {
      const { data: plan, error: planError } = await admin
        .from('plans')
        .select('id, razorpay_plan_id, razorpay_plan_id_monthly, razorpay_plan_id_yearly')
        .eq('id', planId)
        .eq('is_active', true)
        .maybeSingle();

      if (planError || !plan) {
        return NextResponse.json(
          { error: 'Invalid plan', details: 'Plan not found' },
          { status: 400 }
        );
      }
      const planRow = plan as {
        id: string;
        razorpay_plan_id?: string | null;
        razorpay_plan_id_monthly?: string | null;
        razorpay_plan_id_yearly?: string | null;
      };
      const monthlyId = planRow.razorpay_plan_id_monthly ?? planRow.razorpay_plan_id;
      const yearlyId = planRow.razorpay_plan_id_yearly ?? planRow.razorpay_plan_id;
      razorpayPlanId =
        billingCycle === 'yearly' ? (yearlyId ?? monthlyId) : (monthlyId ?? yearlyId);
      if (!razorpayPlanId) {
        return NextResponse.json(
          { error: 'Invalid plan', details: 'Razorpay plan not configured' },
          { status: 400 }
        );
      }
      ourPlanId = plan.id;
    }

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
