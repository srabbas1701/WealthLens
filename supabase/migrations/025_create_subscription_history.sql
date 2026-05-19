-- Migration 025: Create subscription_history table
--
-- Immutable audit log written by the Razorpay webhook whenever a subscription
-- is activated, upgraded, or cancelled. Used for support and billing forensics.
-- The webhook INSERT is fire-and-forget; failures are logged but do not block
-- the subscription activation itself.

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL,
  event         TEXT        NOT NULL,          -- 'activated' | 'upgraded' | 'cancelled' | 'halted'
  from_tier     TEXT,
  to_tier       TEXT,
  from_billing_cycle TEXT,
  to_billing_cycle   TEXT,
  razorpay_subscription_id TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_history IS
  'Immutable audit log of subscription lifecycle events written by the Razorpay webhook.';

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Service role (used by webhook) can do everything
CREATE POLICY "Service role full access"
  ON public.subscription_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can read their own history (useful for support/account pages later)
CREATE POLICY "Users read own history"
  ON public.subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id
  ON public.subscription_history(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_history_razorpay_id
  ON public.subscription_history(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;
