-- Performance indexes for add-flow related queries
-- Mirror of supabase/migrations/20260501120000_add_performance_indexes_add_flows.sql
-- kept here to align with workspace migration documentation convention.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_invested_value_desc
  ON public.holdings (portfolio_id, invested_value DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_portfolio_id
  ON public.portfolio_metrics (portfolio_id);

CREATE INDEX IF NOT EXISTS idx_assets_equity_active
  ON public.assets (asset_type, is_active);

CREATE INDEX IF NOT EXISTS idx_assets_name_trgm
  ON public.assets USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_assets_symbol_trgm
  ON public.assets USING gin (symbol gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_isin_growth
  ON public.mf_scheme_master (isin_growth);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_isin_div_payout
  ON public.mf_scheme_master (isin_div_payout);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_isin_div_reinvest
  ON public.mf_scheme_master (isin_div_reinvest);
