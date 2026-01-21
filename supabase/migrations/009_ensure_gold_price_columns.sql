-- =============================================================================
-- ENSURE GOLD_PRICE_DAILY COLUMNS EXIST
-- =============================================================================
-- Verify and add updated_at column if it doesn't exist
-- This ensures the schema is correct even if migrations were applied out of order

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gold_price_daily' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.gold_price_daily 
    ADD COLUMN updated_at timestamptz DEFAULT now();
    
    COMMENT ON COLUMN public.gold_price_daily.updated_at IS 'Timestamp when the record was last updated';
  END IF;
END $$;

-- Verify the column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gold_price_daily' 
    AND column_name = 'updated_at'
  ) THEN
    RAISE EXCEPTION 'Failed to ensure updated_at column exists on gold_price_daily table';
  END IF;
END $$;
