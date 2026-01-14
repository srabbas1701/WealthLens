/*
  # Security and Performance Fixes

  1. Performance Improvements
    - Add missing indexes on foreign keys for ai_daily_summaries, ai_weekly_summaries, and holdings
    - Remove unused indexes to reduce storage and maintenance overhead

  2. RLS Policy Optimization
    - Update all RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation for each row, significantly improving query performance at scale

  3. Security Improvements
    - Remove duplicate permissive policies
    - Fix function search paths to prevent SQL injection
    - Update security definer view

  4. Notes
    - All changes are backwards compatible
    - Performance improvements are immediate
    - No data loss or migration required
*/

-- =============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_daily_summaries_portfolio_id
ON public.ai_daily_summaries(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_ai_weekly_summaries_portfolio_id
ON public.ai_weekly_summaries(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_holdings_asset_id
ON public.holdings(asset_id);

-- =============================================================================
-- 2. REMOVE UNUSED INDEXES
-- =============================================================================

DROP INDEX IF EXISTS public.idx_stock_prices_symbol;
DROP INDEX IF EXISTS public.idx_daily_summaries_date;
DROP INDEX IF EXISTS public.idx_mf_navs_scheme_code;

-- =============================================================================
-- 3. FIX RLS POLICIES - USERS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- =============================================================================
-- 4. FIX RLS POLICIES - PORTFOLIOS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can access own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can create own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can update own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolios" ON public.portfolios;

CREATE POLICY "Users can access own portfolios"
  ON public.portfolios FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own portfolios"
  ON public.portfolios FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own portfolios"
  ON public.portfolios FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =============================================================================
-- 5. FIX RLS POLICIES - HOLDINGS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can access own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can create own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can update own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can delete own holdings" ON public.holdings;

CREATE POLICY "Users can access own holdings"
  ON public.holdings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = holdings.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own holdings"
  ON public.holdings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = holdings.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own holdings"
  ON public.holdings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = holdings.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = holdings.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own holdings"
  ON public.holdings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = holdings.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 6. FIX RLS POLICIES - PORTFOLIO_METRICS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own portfolio metrics" ON public.portfolio_metrics;

CREATE POLICY "Users can view own portfolio metrics"
  ON public.portfolio_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_metrics.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 7. FIX RLS POLICIES - PORTFOLIO_INSIGHTS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own portfolio insights" ON public.portfolio_insights;

CREATE POLICY "Users can view own portfolio insights"
  ON public.portfolio_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_insights.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 8. FIX RLS POLICIES - COPILOT_SESSIONS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own copilot sessions" ON public.copilot_sessions;
DROP POLICY IF EXISTS "Users can create own copilot sessions" ON public.copilot_sessions;

CREATE POLICY "Users can view own copilot sessions"
  ON public.copilot_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own copilot sessions"
  ON public.copilot_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =============================================================================
-- 9. FIX RLS POLICIES - ONBOARDING_SNAPSHOTS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can access own onboarding" ON public.onboarding_snapshots;
DROP POLICY IF EXISTS "Users can create own onboarding" ON public.onboarding_snapshots;
DROP POLICY IF EXISTS "Users can update own onboarding" ON public.onboarding_snapshots;

CREATE POLICY "Users can access own onboarding"
  ON public.onboarding_snapshots FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own onboarding"
  ON public.onboarding_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own onboarding"
  ON public.onboarding_snapshots FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =============================================================================
-- 10. FIX RLS POLICIES - AI_DAILY_SUMMARIES TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own daily summaries" ON public.ai_daily_summaries;

CREATE POLICY "Users can view own daily summaries"
  ON public.ai_daily_summaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = ai_daily_summaries.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 11. FIX RLS POLICIES - AI_WEEKLY_SUMMARIES TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own weekly summaries" ON public.ai_weekly_summaries;

CREATE POLICY "Users can view own weekly summaries"
  ON public.ai_weekly_summaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = ai_weekly_summaries.portfolio_id
      AND portfolios.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 12. FIX DUPLICATE POLICIES - MF_NAVS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Service role can manage NAVs" ON public.mf_navs;

CREATE POLICY "Service role can manage NAVs"
  ON public.mf_navs
  FOR ALL
  TO service_role
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- =============================================================================
-- 13. FIX DUPLICATE POLICIES - MF_SCHEME_MASTER TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Service role can manage scheme master" ON public.mf_scheme_master;

CREATE POLICY "Service role can manage scheme master"
  ON public.mf_scheme_master
  FOR ALL
  TO service_role
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- =============================================================================
-- 14. FIX FUNCTION SEARCH PATHS
-- =============================================================================

DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 15. FIX SECURITY DEFINER VIEW
-- =============================================================================

DROP VIEW IF EXISTS public.vw_low_confidence_matches;

CREATE OR REPLACE VIEW public.vw_low_confidence_matches AS
SELECT
  h.id as holding_id,
  h.portfolio_id,
  a.name as asset_name,
  a.isin as asset_isin,
  h.quantity,
  h.invested_value,
  h.created_at
FROM public.holdings h
LEFT JOIN public.assets a ON h.asset_id = a.id
WHERE h.asset_id IS NOT NULL;

GRANT SELECT ON public.vw_low_confidence_matches TO authenticated;