/*
  # Create ETF Prices Table

  1. New Tables
    - `etf_prices`
      - `id` (uuid, primary key) - Unique identifier for each price record
      - `isin` (text) - ISIN code for the ETF
      - `symbol` (text, optional) - Trading symbol
      - `nav` (decimal) - Net Asset Value per unit
      - `date` (date) - Date of the NAV
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - When the record was last updated

  2. Indexes
    - Index on (isin, date) for fast lookups
    - Unique constraint on (isin, date) to prevent duplicates

  3. Security
    - Enable RLS on `etf_prices` table
    - Add policy for authenticated users to read data
    - Only system/admin can insert/update data
*/

-- Create etf_prices table
CREATE TABLE IF NOT EXISTS public.etf_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin text NOT NULL,
  symbol text,
  nav decimal(15, 4) NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT etf_prices_isin_date_unique UNIQUE (isin, date)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_etf_prices_isin ON public.etf_prices(isin);
CREATE INDEX IF NOT EXISTS idx_etf_prices_date ON public.etf_prices(date);
CREATE INDEX IF NOT EXISTS idx_etf_prices_isin_date ON public.etf_prices(isin, date);

-- Enable Row Level Security
ALTER TABLE public.etf_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read ETF prices
CREATE POLICY "Authenticated users can view ETF prices"
  ON public.etf_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert ETF prices
CREATE POLICY "Only service role can insert ETF prices"
  ON public.etf_prices
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Only service role can update ETF prices
CREATE POLICY "Only service role can update ETF prices"
  ON public.etf_prices
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.etf_prices IS 'Stores historical NAV data for ETFs';
COMMENT ON COLUMN public.etf_prices.isin IS 'ISIN code uniquely identifying the ETF';
COMMENT ON COLUMN public.etf_prices.nav IS 'Net Asset Value per unit in INR';
COMMENT ON COLUMN public.etf_prices.date IS 'Date of the NAV (YYYY-MM-DD)';