-- Create subscription_usage table for tracking trial AI & scenario usage per month.
-- Referenced by src/lib/entitlements.ts (getUsageCounters, incrementTrialUsage).
--
-- NOTE: No FK to auth.users — cross-schema FKs can cause permission issues in Supabase.
-- user_id integrity is enforced by application logic (authenticated user context).

CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  analyst_queries INTEGER NOT NULL DEFAULT 0,
  insights_viewed INTEGER NOT NULL DEFAULT 0,
  analytics_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

COMMENT ON TABLE public.subscription_usage IS 'Monthly usage counters for trial/subscription limits (AI queries, scenario views).';

ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.subscription_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_month
  ON public.subscription_usage(user_id, month);
