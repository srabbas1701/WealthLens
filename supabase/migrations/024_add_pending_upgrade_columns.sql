-- Migration 024: Add pending upgrade columns to user_subscriptions
--
-- These columns hold an in-flight upgrade intent (e.g. Pro → Premium).
-- ONLY the webhook sets tier/status=active; the frontend-triggered
-- create-subscription API writes here so the active plan is never touched
-- until payment is confirmed.
--
-- Idempotent via ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS pending_tier TEXT,
  ADD COLUMN IF NOT EXISTS pending_billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS pending_razorpay_subscription_id TEXT;

COMMENT ON COLUMN public.user_subscriptions.pending_tier IS
  'Target tier for an in-flight upgrade; cleared by webhook on payment confirmation.';
COMMENT ON COLUMN public.user_subscriptions.pending_billing_cycle IS
  'Target billing cycle for an in-flight upgrade; cleared by webhook.';
COMMENT ON COLUMN public.user_subscriptions.pending_razorpay_subscription_id IS
  'Razorpay subscription ID for a pending upgrade; used by webhook to match the event.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_pending_razorpay_id
  ON public.user_subscriptions(pending_razorpay_subscription_id)
  WHERE pending_razorpay_subscription_id IS NOT NULL;
