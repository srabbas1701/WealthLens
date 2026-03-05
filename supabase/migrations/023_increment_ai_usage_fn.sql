-- Atomic AI usage increment function.
-- Uses INSERT ... ON CONFLICT DO UPDATE so there is no race condition and no
-- separate read needed before the write.
-- SECURITY DEFINER means it runs as the function owner (postgres), bypassing
-- RLS on subscription_usage entirely — safe because the caller always passes
-- the authenticated user's own ID, enforced in the API layer.

CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID, p_month DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscription_usage (user_id, month, analyst_queries, analytics_views)
  VALUES (p_user_id, p_month, 1, 0)
  ON CONFLICT (user_id, month)
  DO UPDATE SET analyst_queries = public.subscription_usage.analyst_queries + 1;
END;
$$;

-- Only authenticated users and the service role may call this function.
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, DATE) TO authenticated, service_role;
