-- Check existing asset_class values in your database
-- Run this FIRST to see what values need to be migrated

SELECT 
  asset_class,
  COUNT(*) as count
FROM public.assets
WHERE asset_class IS NOT NULL
GROUP BY asset_class
ORDER BY count DESC;

-- This will show you all the different asset_class values currently in your database
