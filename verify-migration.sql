-- =============================================================================
-- VERIFY MF SCHEME MASTER MIGRATION
-- =============================================================================
-- Run this in Supabase SQL Editor to verify the migration was applied
-- and check if data needs to be populated

-- 1. Check if new columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mf_scheme_master' 
  AND column_name IN ('amc_name', 'category', 'plan_type')
ORDER BY column_name;

-- 2. Check how many rows have populated metadata
SELECT 
  COUNT(*) as total_schemes,
  COUNT(amc_name) as schemes_with_amc,
  COUNT(category) as schemes_with_category,
  COUNT(plan_type) as schemes_with_plan_type,
  COUNT(CASE WHEN amc_name IS NOT NULL AND category IS NOT NULL AND plan_type IS NOT NULL THEN 1 END) as schemes_with_complete_metadata
FROM public.mf_scheme_master;

-- 3. Sample of schemes (to see if columns are populated)
SELECT 
  scheme_code,
  scheme_name,
  amc_name,
  category,
  plan_type
FROM public.mf_scheme_master
LIMIT 10;

-- 4. Check indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'mf_scheme_master'
  AND indexname LIKE '%amc%' OR indexname LIKE '%category%' OR indexname LIKE '%plan%'
ORDER BY indexname;
