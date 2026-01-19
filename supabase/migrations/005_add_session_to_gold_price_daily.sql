-- =============================================================================
-- ADD SESSION COLUMN TO GOLD_PRICE_DAILY
-- =============================================================================
-- Adds session (AM/PM) column to support IBJA session-based pricing

-- Add session column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gold_price_daily' AND column_name = 'session'
  ) THEN
    ALTER TABLE public.gold_price_daily 
    ADD COLUMN session text CHECK (session IN ('AM', 'PM'));
    
    -- Update existing rows to have AM session
    UPDATE public.gold_price_daily 
    SET session = 'AM' 
    WHERE session IS NULL;
    
    COMMENT ON COLUMN public.gold_price_daily.session IS 'IBJA session: AM or PM';
  END IF;
END $$;

-- Update source to IBJA for existing rows
UPDATE public.gold_price_daily 
SET source = 'IBJA' 
WHERE source = 'MOCK' OR source IS NULL;
