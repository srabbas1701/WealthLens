-- =============================================================================
-- FIX GOLD_PRICE_DAILY TRIGGER
-- =============================================================================
-- Fix the trigger issue: "record 'new' has no field 'updated_at'"
-- The problem occurs when upsert does INSERT operations
-- Solution: Remove the trigger since we explicitly set updated_at in code

-- Drop the existing trigger to avoid conflicts
-- We'll set updated_at explicitly in the application code
DROP TRIGGER IF EXISTS set_gold_price_updated_at ON public.gold_price_daily;

-- Note: updated_at will be set explicitly in the application code
-- This avoids trigger conflicts with upsert operations
COMMENT ON TABLE public.gold_price_daily IS 'Daily gold prices (IBJA or MCX) - updated_at is set explicitly in application code, not via trigger';
