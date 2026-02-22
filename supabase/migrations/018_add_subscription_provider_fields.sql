-- Add provider fields for payment-agnostic subscription tracking

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_provider_id
  ON public.user_subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
