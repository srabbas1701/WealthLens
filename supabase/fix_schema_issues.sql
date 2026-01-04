-- =============================================================================
-- FIX SCHEMA ISSUES - Safe Migration
-- =============================================================================
-- Run this in Supabase SQL Editor to fix schema issues
-- This is safe to run multiple times (uses IF NOT EXISTS / IF EXISTS checks)

-- =============================================================================
-- 1. Fix USERS table - Add phone_number if missing
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN phone_number text;
    
    COMMENT ON COLUMN public.users.phone_number IS 'Phone number with country code for OTP auth (e.g., +919876543210)';
    
    RAISE NOTICE 'Added phone_number column to users table';
  ELSE
    RAISE NOTICE 'phone_number column already exists in users table';
  END IF;
END $$;

-- =============================================================================
-- 2. Create STOCK_PRICES table if it doesn't exist
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stock_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,  -- NSE symbol (e.g., 'RELIANCE', 'TCS')
  price_date date NOT NULL,  -- Trading date for this price
  closing_price numeric NOT NULL,  -- EOD closing price in INR
  price_source text DEFAULT 'YAHOO_EOD',  -- Source of the price (e.g., 'YAHOO_EOD')
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one price per symbol per date
  UNIQUE(symbol, price_date)
);

-- Add comments
COMMENT ON TABLE public.stock_prices IS 'EOD stock prices - shared across all users, updated daily';
COMMENT ON COLUMN public.stock_prices.symbol IS 'NSE stock symbol (e.g., RELIANCE, TCS)';
COMMENT ON COLUMN public.stock_prices.price_date IS 'Trading date for this closing price';
COMMENT ON COLUMN public.stock_prices.closing_price IS 'End of day closing price in INR';
COMMENT ON COLUMN public.stock_prices.price_source IS 'Source of the price data (e.g., YAHOO_EOD)';

-- Create indexes for fast lookups (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON public.stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON public.stock_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON public.stock_prices(symbol, price_date DESC);

-- Enable RLS
ALTER TABLE public.stock_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read stock prices (public market data)
DROP POLICY IF EXISTS "Anyone can view stock prices" ON public.stock_prices;
CREATE POLICY "Anyone can view stock prices"
  ON public.stock_prices FOR SELECT
  USING (true);

-- =============================================================================
-- 3. Verify and report
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Schema migration completed successfully!';
  RAISE NOTICE '✓ stock_prices table created/verified';
  RAISE NOTICE '✓ users.phone_number column added/verified';
END $$;

