/**
 * POST /api/payments/webhook
 *
 * Razorpay webhook handler. Verifies signature and updates user_subscriptions.
 * Handles: subscription.authenticated, subscription.charged, subscription.completed,
 * subscription.updated, subscription.halted
 *
 * Uses Node runtime, RAZORPAY_WEBHOOK_SECRET for signature verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type WebhookPayload = {
  entity?: string;
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        plan_id?: string;
        status?: string;
        current_start?: number;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
  };
};

function getSubscriptionEntity(payload: WebhookPayload): {
  id: string;
  current_start?: number;
  current_end?: number;
  notes?: Record<string, string>;
} | null {
  const sub = payload?.payload?.subscription;
  const entity = sub?.entity ?? sub;
  if (!entity?.id || typeof entity.id !== 'string') return null;
  return {
    id: entity.id,
    current_start: typeof entity.current_start === 'number' ? entity.current_start : undefined,
    current_end: typeof entity.current_end === 'number' ? entity.current_end : undefined,
    notes: entity.notes && typeof entity.notes === 'object' ? entity.notes : undefined,
  };
}

function unixToIso(unix?: number): string | null {
  if (typeof unix !== 'number') return null;
  try {
    return new Date(unix * 1000).toISOString();
  } catch {
    return null;
  }
}

// No auth check - webhooks are publicly accessible; security via Razorpay signature verification only
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  
  // LOG IMMEDIATELY before any processing
  console.log('[Webhook] Received payload length:', rawBody.length);
  console.log('[Webhook] Signature present:', !!signature);
  console.log('[Webhook] Raw event:', rawBody.substring(0, 200));
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let valid: boolean;
    try {
      valid = Razorpay.validateWebhookSignature(rawBody, signature, secret);
    } catch (err) {
      console.error('[Webhook] Signature verification error:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const event = payload?.event;
    if (!event || typeof event !== 'string') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const handledEvents = [
      'subscription.authenticated',
      'subscription.charged',
      'subscription.completed',
      'subscription.updated',
      'subscription.halted',
    ];
    if (!handledEvents.includes(event)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const subscription = getSubscriptionEntity(payload);
    if (!subscription) {
      console.warn('[Webhook] No subscription entity in payload for event:', event);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const admin = createAdminClient();

    const activeStateEvents = [
      'subscription.authenticated',
      'subscription.charged',
      'subscription.completed',
      'subscription.updated',
    ];
    if (event === 'subscription.halted') {
      const { error } = await admin
        .from('user_subscriptions')
        .update({
          status: 'halted',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', subscription.id);

      if (error) {
        console.error('[Webhook] Update halted failed:', error);
      }
    } else if (activeStateEvents.includes(event)) {
      const currentPeriodEnd = unixToIso(subscription.current_end);
      const startedAt = unixToIso(subscription.current_start);

      const updates: Record<string, unknown> = {
        status: 'active',
        current_period_end: currentPeriodEnd,
        started_at: startedAt,
        updated_at: new Date().toISOString(),
      };

      const { error } = await admin
        .from('user_subscriptions')
        .update(updates)
        .eq('razorpay_subscription_id', subscription.id);

      if (error) {
        console.error('[Webhook] Update subscription failed:', error);
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Webhook] Unexpected error:', err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
