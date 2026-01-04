-- =============================================================================
-- MIGRATION: Add price_source column to stock_prices table
-- =============================================================================
-- Run this in Supabase SQL Editor if stock_prices table already exists
-- This adds the price_source column to track the source of price data (YAHOO_EOD)

-- Add price_source column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_prices' 
    AND column_name = 'price_source'
  ) THEN
    ALTER TABLE public.stock_prices 
    ADD COLUMN price_source text DEFAULT 'YAHOO_EOD';
    
    -- Add comment
    COMMENT ON COLUMN public.stock_prices.price_source IS 'Source of the price data (e.g., YAHOO_EOD)';
    
    RAISE NOTICE 'Added price_source column to stock_prices table';
  ELSE
    RAISE NOTICE 'price_source column already exists in stock_prices table';
  END IF;
END $$;

