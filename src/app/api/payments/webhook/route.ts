/**
 * POST /api/payments/webhook
 * Razorpay webhook — the ONLY place that activates subscriptions.
 *
 * Two flows handled:
 * 1. NEW subscription: finds row by razorpay_subscription_id, sets active
 * 2. UPGRADE: finds row by pending_razorpay_subscription_id, promotes 
 *    pending_tier → tier, logs history, clears pending columns
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

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  console.log('[Webhook] Received, length:', rawBody.length, 'sig:', !!signature);

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
      console.error('[Webhook] Signature error:', err);
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

    console.log('[Webhook] Event:', event);

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
      console.warn('[Webhook] No subscription entity for event:', event);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (event === 'subscription.halted') {
      await admin
        .from('user_subscriptions')
        .update({ status: 'halted', updated_at: now })
        .or(
          `razorpay_subscription_id.eq.${subscription.id},` +
          `pending_razorpay_subscription_id.eq.${subscription.id}`
        );
      return NextResponse.json({ received: true });
    }

    // Active state events
    const currentPeriodEnd = unixToIso(subscription.current_end);
    const startedAt = unixToIso(subscription.current_start);

    // FLOW 1: Check if this is a PENDING UPGRADE (stored in pending_* columns)
    const { data: upgradeRow } = await admin
      .from('user_subscriptions')
      .select('user_id, tier, billing_cycle, pending_tier, pending_billing_cycle')
      .eq('pending_razorpay_subscription_id', subscription.id)
      .maybeSingle();

    if (upgradeRow) {
      console.log(
        `[Webhook] Upgrade confirmed: ${upgradeRow.tier} → ${upgradeRow.pending_tier} ` +
        `for user ${upgradeRow.user_id}`
      );

      // Record history BEFORE changing (non-fatal — activation must not depend on this)
      const { error: historyErr1 } = await admin.from('subscription_history').insert({
        user_id: upgradeRow.user_id,
        event: 'upgraded',
        from_tier: upgradeRow.tier,
        to_tier: upgradeRow.pending_tier,
        from_billing_cycle: upgradeRow.billing_cycle,
        to_billing_cycle: upgradeRow.pending_billing_cycle,
        razorpay_subscription_id: subscription.id,
        occurred_at: now,
      });
      if (historyErr1) console.error('[Webhook] History insert failed (upgrade):', historyErr1);

      // Now promote pending → active, clear pending columns
      const { error } = await admin
        .from('user_subscriptions')
        .update({
          tier: upgradeRow.pending_tier,
          billing_cycle: upgradeRow.pending_billing_cycle,
          razorpay_subscription_id: subscription.id,
          status: 'active',
          current_period_end: currentPeriodEnd,
          started_at: startedAt,
          // Clear pending columns
          pending_tier: null,
          pending_billing_cycle: null,
          pending_razorpay_subscription_id: null,
          updated_at: now,
        })
        .eq('user_id', upgradeRow.user_id);

      if (error) {
        console.error('[Webhook] Upgrade update failed:', error);
      }
      return NextResponse.json({ received: true });
    }

    // FLOW 2: New subscription (find by razorpay_subscription_id)
    const { data: newSubRow } = await admin
      .from('user_subscriptions')
      .select('user_id, tier, billing_cycle')
      .eq('razorpay_subscription_id', subscription.id)
      .maybeSingle();

    if (newSubRow) {
      console.log(
        `[Webhook] New subscription activated: ${newSubRow.tier} ` +
        `for user ${newSubRow.user_id}`
      );

      // Record history (non-fatal — activation must not depend on this)
      const { error: historyErr2 } = await admin.from('subscription_history').insert({
        user_id: newSubRow.user_id,
        event: 'activated',
        from_tier: 'free',
        to_tier: newSubRow.tier,
        from_billing_cycle: null,
        to_billing_cycle: newSubRow.billing_cycle,
        razorpay_subscription_id: subscription.id,
        occurred_at: now,
      });
      if (historyErr2) console.error('[Webhook] History insert failed (activation):', historyErr2);

      const { error } = await admin
        .from('user_subscriptions')
        .update({
          status: 'active',
          current_period_end: currentPeriodEnd,
          started_at: startedAt,
          updated_at: now,
        })
        .eq('razorpay_subscription_id', subscription.id);

      if (error) {
        console.error('[Webhook] New sub activation failed:', error);
      }
      return NextResponse.json({ received: true });
    }

    // FLOW 3: primary path for new and re-subscribing users.
    // create-subscription no longer writes a DB row for non-active users,
    // so this is now the canonical activation path (not just a fallback).
    // Handles three cases:
    //   a) Brand-new user  → INSERT a fresh active row
    //   b) Re-subscriber (cancelled/halted/expired) → UPDATE the existing row
    //   c) True fallback (sub ID mismatch) → same UPDATE logic
    const notesUserId = subscription.notes?.user_id;
    if (notesUserId) {
      console.log(`[Webhook] FLOW 3 activation for user ${notesUserId}, sub ${subscription.id}`);
      const targetTier = subscription.notes?.plan_id;
      const targetCycle = subscription.notes?.billing_cycle === 'annual'
        ? 'yearly'
        : subscription.notes?.billing_cycle ?? 'monthly';

      if (targetTier && ['pro', 'premium'].includes(targetTier)) {
        // Check whether this user already has a row (any status)
        const { data: existingRow } = await admin
          .from('user_subscriptions')
          .select('user_id')
          .eq('user_id', notesUserId)
          .maybeSingle();

        if (existingRow) {
          // Re-subscriber or fallback — reset and activate the existing row
          const { error: updateErr } = await admin
            .from('user_subscriptions')
            .update({
              tier: targetTier,
              billing_cycle: targetCycle,
              razorpay_subscription_id: subscription.id,
              status: 'active',
              current_period_end: currentPeriodEnd,
              started_at: startedAt,
              pending_tier: null,
              pending_billing_cycle: null,
              pending_razorpay_subscription_id: null,
              updated_at: now,
            })
            .eq('user_id', notesUserId);

          if (updateErr) console.error('[Webhook] FLOW 3 update failed:', updateErr);
          else console.log(`[Webhook] FLOW 3 re-subscriber activated: ${notesUserId} → ${targetTier}`);
        } else {
          // Brand-new user — insert a fresh active row
          const { error: insertErr } = await admin
            .from('user_subscriptions')
            .insert({
              user_id: notesUserId,
              tier: targetTier,
              billing_cycle: targetCycle,
              razorpay_subscription_id: subscription.id,
              status: 'active',
              current_period_end: currentPeriodEnd,
              started_at: startedAt,
              payment_provider: 'razorpay',
              updated_at: now,
            });

          if (insertErr) console.error('[Webhook] FLOW 3 insert failed:', insertErr);
          else console.log(`[Webhook] FLOW 3 new subscriber activated: ${notesUserId} → ${targetTier}`);
        }
      } else {
        console.warn(`[Webhook] FLOW 3 skipped — invalid targetTier: ${targetTier}`);
      }
    } else {
      console.warn(`[Webhook] No user_id in notes for sub ${subscription.id} — cannot activate`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Webhook] Unexpected error:', err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
