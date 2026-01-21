-- Verify the migration was successful
-- Run this to confirm everything is working

-- 1. Check asset_class values are now in correct format
SELECT 
  asset_class,
  COUNT(*) as count
FROM public.assets
WHERE asset_class IS NOT NULL
GROUP BY asset_class
ORDER BY count DESC;

-- Should show: Equity, FixedIncome, Hybrid, Commodity, Cash (capitalized)

-- 2. Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'assets'
  AND column_name IN ('top_level_bucket', 'risk_behavior', 'valuation_method')
ORDER BY column_name;

-- 3. Check constraints are applied
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'assets'
  AND constraint_name LIKE '%asset_class%' OR constraint_name LIKE '%bucket%' OR constraint_name LIKE '%risk%' OR constraint_name LIKE '%valuation%'
ORDER BY constraint_name;

-- 4. Check how many assets need classification backfill
SELECT 
  COUNT(*) as total_assets,
  COUNT(asset_class) as has_asset_class,
  COUNT(top_level_bucket) as has_top_level_bucket,
  COUNT(risk_behavior) as has_risk_behavior,
  COUNT(valuation_method) as has_valuation_method
FROM public.assets;

-- 5. Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('assets', 'holdings')
  AND trigger_name LIKE '%classification%'
ORDER BY trigger_name;
