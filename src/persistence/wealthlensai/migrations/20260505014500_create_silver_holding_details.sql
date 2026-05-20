-- =============================================================================
-- CREATE SILVER HOLDING DETAILS TABLE
-- =============================================================================
-- Purpose:
-- - Store Silver-specific holding metadata in normalized relational columns
-- - Avoid relying only on JSON notes at production scale
-- - Keep one row per holding_id

CREATE TABLE IF NOT EXISTS public.silver_holding_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id uuid NOT NULL UNIQUE REFERENCES public.holdings(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,

  silver_type text NOT NULL CHECK (silver_type IN ('physical', 'etf', 'digital')),
  unit_type text NOT NULL CHECK (unit_type IN ('gram', 'unit')),
  purchase_date date NOT NULL,

  form text NULL CHECK (form IN ('jewellery', 'coin', 'bar')),
  purity text NULL,
  gross_weight numeric NULL,
  net_weight numeric NULL,
  making_charges numeric NULL,
  physical_quantity numeric NULL,
  total_grams numeric NULL,

  etf_name text NULL,
  scheme_code text NULL,
  isin text NULL,
  exchange text NULL,

  platform text NULL,
  provider text NULL,
  vaulted boolean NOT NULL DEFAULT false,

  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_silver_holding_details_portfolio
  ON public.silver_holding_details (portfolio_id);

CREATE INDEX IF NOT EXISTS idx_silver_holding_details_type
  ON public.silver_holding_details (silver_type);

CREATE INDEX IF NOT EXISTS idx_silver_holding_details_isin
  ON public.silver_holding_details (isin);

ALTER TABLE public.silver_holding_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own silver holding details" ON public.silver_holding_details;
CREATE POLICY "Users can view own silver holding details"
  ON public.silver_holding_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolios p
      WHERE p.id = silver_holding_details.portfolio_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own silver holding details" ON public.silver_holding_details;
CREATE POLICY "Users can insert own silver holding details"
  ON public.silver_holding_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.portfolios p
      WHERE p.id = silver_holding_details.portfolio_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own silver holding details" ON public.silver_holding_details;
CREATE POLICY "Users can update own silver holding details"
  ON public.silver_holding_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolios p
      WHERE p.id = silver_holding_details.portfolio_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.portfolios p
      WHERE p.id = silver_holding_details.portfolio_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own silver holding details" ON public.silver_holding_details;
CREATE POLICY "Users can delete own silver holding details"
  ON public.silver_holding_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolios p
      WHERE p.id = silver_holding_details.portfolio_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage silver holding details" ON public.silver_holding_details;
CREATE POLICY "Service role can manage silver holding details"
  ON public.silver_holding_details FOR ALL
  TO service_role
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

DROP TRIGGER IF EXISTS set_updated_at ON public.silver_holding_details;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.silver_holding_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.silver_holding_details IS 'Normalized Silver holding metadata linked 1:1 to holdings table';
