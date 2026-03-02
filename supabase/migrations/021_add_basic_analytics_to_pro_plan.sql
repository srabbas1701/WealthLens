-- Migration: Add view_basic_analytics to Pro and Premium plans
--
-- Context:
--   Sector Exposure, Market Cap Exposure, Geography Exposure, and Mutual Fund
--   Exposure analytics pages check for 'view_basic_analytics' capability.
--   These are Pro-tier features. Without this mapping, Pro users are blocked.
--
-- Schema: plan_capabilities(plan_id TEXT, capability_key TEXT, enabled BOOLEAN)
--   plan_id values: 'free', 'pro', 'premium'
--
-- Safe to run multiple times.

DELETE FROM public.plan_capabilities
WHERE plan_id IN ('pro', 'premium')
  AND capability_key = 'view_basic_analytics';

INSERT INTO public.plan_capabilities (plan_id, capability_key, enabled)
VALUES
  ('pro',     'view_basic_analytics', true),
  ('premium', 'view_basic_analytics', true);
