-- Add Razorpay subscription tracking fields to user_subscriptions
-- Used by webhook to match and update subscription status

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_id
  ON public.user_subscriptions(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;
