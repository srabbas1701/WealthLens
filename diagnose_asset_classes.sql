-- Diagnostic query to check current state
-- Run this FIRST to understand what's happening

-- 1. Check what asset_class values exist
SELECT 
  asset_class,
  LENGTH(asset_class) as length,
  COUNT(*) as count,
  string_to_array(asset_class, '') as chars  -- Shows if there are hidden characters
FROM public.assets
WHERE asset_class IS NOT NULL
GROUP BY asset_class
ORDER BY count DESC;

-- 2. Check if constraint exists and what it allows
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'assets_asset_class_check';

-- 3. Find any rows that might violate the constraint
SELECT 
  id,
  name,
  asset_type,
  asset_class,
  LENGTH(asset_class) as length,
  asset_class = 'FixedIncome' as is_exact_match
FROM public.assets
WHERE asset_class IS NOT NULL
  AND asset_class NOT IN ('Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability')
LIMIT 10;
