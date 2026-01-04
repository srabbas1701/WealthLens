-- =============================================================================
-- CREATE STOCK_PRICES TABLE
-- =============================================================================
-- Run this in Supabase SQL Editor to create the stock_prices table
-- This is safe to run multiple times (uses IF NOT EXISTS)

-- Create stock_prices table if it doesn't exist
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

-- Create indexes for fast lookups
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'stock_prices table created successfully!';
END $$;

