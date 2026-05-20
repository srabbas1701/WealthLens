-- Performance indexes for add-flow related queries
-- Safe, additive migration only (no destructive changes).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Portfolio holdings fetch/sort path used by multiple asset pages
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_invested_value_desc
  ON public.holdings (portfolio_id, invested_value DESC);

-- Portfolio metrics lookup by portfolio id
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_portfolio_id
  ON public.portfolio_metrics (portfolio_id);

-- Equity search path for /api/stocks/search
CREATE INDEX IF NOT EXISTS idx_assets_equity_active
  ON public.assets (asset_type, is_active);

CREATE INDEX IF NOT EXISTS idx_assets_name_trgm
  ON public.assets USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_assets_symbol_trgm
  ON public.assets USING gin (symbol gin_trgm_ops);

-- MF NAV resolution path by ISIN columns
CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_isin_growth
  ON public.mf_scheme_master (isin_growth);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_isin_div_payout
  ON public.mf_scheme_master (isin_div_payout);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_isin_div_reinvest
  ON public.mf_scheme_master (isin_div_reinvest);
