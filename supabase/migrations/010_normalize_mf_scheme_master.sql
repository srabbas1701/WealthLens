-- =============================================================================
-- NORMALIZE MF SCHEME MASTER TABLE
-- =============================================================================
-- Adds normalized columns for AMC name, category, and plan type
-- These columns will be populated by the backfill script (backfill-mf-metadata.ts)
-- This migration only adds the columns and indexes - data population is separate

-- Add amc_name column (normalized AMC name extracted from scheme_name)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mf_scheme_master' 
    AND column_name = 'amc_name'
  ) THEN
    ALTER TABLE public.mf_scheme_master 
    ADD COLUMN amc_name TEXT;
    
    COMMENT ON COLUMN public.mf_scheme_master.amc_name IS 'Normalized AMC name extracted from scheme_name (e.g., "HDFC", "ICICI Prudential")';
  END IF;
END $$;

-- Add category column (normalized category extracted from scheme_name)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mf_scheme_master' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.mf_scheme_master 
    ADD COLUMN category TEXT;
    
    COMMENT ON COLUMN public.mf_scheme_master.category IS 'Normalized category extracted from scheme_name (e.g., "Large Cap", "Debt", "Hybrid")';
  END IF;
END $$;

-- Add plan_type column (normalized plan type extracted from scheme_name)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mf_scheme_master' 
    AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE public.mf_scheme_master 
    ADD COLUMN plan_type TEXT;
    
    COMMENT ON COLUMN public.mf_scheme_master.plan_type IS 'Normalized plan type extracted from scheme_name (e.g., "Direct - Growth", "Regular - Dividend")';
  END IF;
END $$;

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_amc_name 
  ON public.mf_scheme_master(amc_name) 
  WHERE amc_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_category 
  ON public.mf_scheme_master(category) 
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_plan_type 
  ON public.mf_scheme_master(plan_type) 
  WHERE plan_type IS NOT NULL;

-- Composite indexes for cascading dropdown queries
CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_amc_category 
  ON public.mf_scheme_master(amc_name, category) 
  WHERE amc_name IS NOT NULL AND category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_amc_category_plan 
  ON public.mf_scheme_master(amc_name, category, plan_type) 
  WHERE amc_name IS NOT NULL AND category IS NOT NULL AND plan_type IS NOT NULL;

-- Composite index with scheme_status for common query pattern
CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_amc_status 
  ON public.mf_scheme_master(amc_name, scheme_status) 
  WHERE amc_name IS NOT NULL AND scheme_status = 'Active';

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_amc_category_status 
  ON public.mf_scheme_master(amc_name, category, scheme_status) 
  WHERE amc_name IS NOT NULL AND category IS NOT NULL AND scheme_status = 'Active';

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_amc_category_plan_status 
  ON public.mf_scheme_master(amc_name, category, plan_type, scheme_status) 
  WHERE amc_name IS NOT NULL AND category IS NOT NULL AND plan_type IS NOT NULL AND scheme_status = 'Active';

-- Verify columns were added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mf_scheme_master' 
    AND column_name = 'amc_name'
  ) THEN
    RAISE EXCEPTION 'Failed to add amc_name column to mf_scheme_master table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mf_scheme_master' 
    AND column_name = 'category'
  ) THEN
    RAISE EXCEPTION 'Failed to add category column to mf_scheme_master table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mf_scheme_master' 
    AND column_name = 'plan_type'
  ) THEN
    RAISE EXCEPTION 'Failed to add plan_type column to mf_scheme_master table';
  END IF;
END $$;
