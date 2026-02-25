-- Create subscription_usage table for tracking trial AI & scenario usage per month.
-- Referenced by src/lib/entitlements.ts (getUsageCounters, incrementTrialUsage).

CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,                        -- first of month, e.g. '2026-02-01'
  analyst_queries INTEGER NOT NULL DEFAULT 0,
  insights_viewed INTEGER NOT NULL DEFAULT 0,
  analytics_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

COMMENT ON TABLE public.subscription_usage IS 'Monthly usage counters for trial/subscription limits (AI queries, scenario views).';

-- RLS: users can only read/write their own rows
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.subscription_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.subscription_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.subscription_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (used by API routes) bypasses RLS, so no extra policy needed for backend writes.

-- Index for fast lookups by user + month
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_month
  ON public.subscription_usage(user_id, month);
