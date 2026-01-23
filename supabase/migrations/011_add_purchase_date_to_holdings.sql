-- Migration: Add purchase_date column to holdings table
-- Purpose: Store purchase date for accurate XIRR calculation
-- Date: 2026-01-23

-- Add purchase_date column to holdings table
DO $$ 
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'holdings' 
    AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE public.holdings 
    ADD COLUMN purchase_date DATE;
    
    -- Add comment
    COMMENT ON COLUMN public.holdings.purchase_date IS 'Purchase date of the holding (for XIRR calculation). For SIP, use first purchase date.';
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_holdings_purchase_date 
    ON public.holdings(purchase_date) 
    WHERE purchase_date IS NOT NULL;
    
    RAISE NOTICE 'Added purchase_date column to holdings table';
  ELSE
    RAISE NOTICE 'Column purchase_date already exists in holdings table';
  END IF;
END $$;

-- Backfill purchase_date from notes JSON metadata for existing MF holdings
-- This migrates data from notes.purchase_date to the new column
DO $$
DECLARE
  holding_record RECORD;
  purchase_date_value DATE;
BEGIN
  FOR holding_record IN 
    SELECT h.id, h.notes, a.asset_type
    FROM public.holdings h
    INNER JOIN public.assets a ON h.asset_id = a.id
    WHERE a.asset_type IN ('mutual_fund', 'index_fund', 'etf')
    AND h.purchase_date IS NULL
    AND h.notes IS NOT NULL
  LOOP
    BEGIN
      -- Try to extract purchase_date from notes JSON
      purchase_date_value := (holding_record.notes::jsonb->>'purchase_date')::DATE;
      
      IF purchase_date_value IS NOT NULL THEN
        UPDATE public.holdings
        SET purchase_date = purchase_date_value
        WHERE id = holding_record.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip if JSON parsing fails or date is invalid
        CONTINUE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfilled purchase_date from notes metadata';
END $$;
