-- Fix Mutual Fund Assets Incorrectly Categorized as "Other"
-- This script identifies assets that should be mutual funds/index funds
-- based on their name patterns and updates them accordingly.

-- Strategy:
-- 1. Find assets with asset_type='other' that have MF-like names
-- 2. Update asset_type to 'mutual_fund' or 'index_fund'
-- 3. Update asset_class to 'equity' (most MFs are equity-oriented)
-- 4. Update risk_bucket to 'medium' for mutual funds

-- Pattern 1: Mutual Funds (contain "Fund", "Scheme", "Plan", etc.)
-- These are regular mutual funds
UPDATE public.assets
SET 
  asset_type = 'mutual_fund',
  asset_class = CASE 
    WHEN asset_class IS NULL OR asset_class = 'other' THEN 'equity'
    ELSE asset_class
  END,
  risk_bucket = CASE 
    WHEN risk_bucket IS NULL THEN 'medium'
    ELSE risk_bucket
  END,
  updated_at = NOW()
WHERE 
  asset_type = 'other'
  AND (
    -- Check if name contains fund-related keywords
    LOWER(name) LIKE '%fund%'
    OR LOWER(name) LIKE '%scheme%'
    OR LOWER(name) LIKE '%plan%'
    OR LOWER(name) LIKE '%mf%'
    OR LOWER(name) LIKE '%mutual%'
  )
  -- Exclude ETFs (they usually have ETF in the name or are traded)
  AND NOT (
    LOWER(name) LIKE '%etf%'
    OR LOWER(name) LIKE '%exchange traded%'
  )
  -- Exclude other types
  AND NOT (
    LOWER(name) LIKE '%fixed deposit%'
    OR LOWER(name) LIKE '%fd%'
    OR LOWER(name) LIKE '%bond%'
    OR LOWER(name) LIKE '%gold%'
    OR LOWER(name) LIKE '%sgb%'
    OR LOWER(name) LIKE '%ppf%'
    OR LOWER(name) LIKE '%epf%'
    OR LOWER(name) LIKE '%nps%'
  );

-- Pattern 2: Index Funds (contain "Index" in name)
-- These are index funds, not regular mutual funds
UPDATE public.assets
SET 
  asset_type = 'index_fund',
  asset_class = CASE 
    WHEN asset_class IS NULL OR asset_class = 'other' THEN 'equity'
    ELSE asset_class
  END,
  risk_bucket = CASE 
    WHEN risk_bucket IS NULL THEN 'medium'
    ELSE risk_bucket
  END,
  updated_at = NOW()
WHERE 
  asset_type = 'other'
  AND (
    LOWER(name) LIKE '%index%'
    OR LOWER(name) LIKE '%passive%'
    OR LOWER(name) LIKE '%nifty%'
    OR LOWER(name) LIKE '%sensex%'
  )
  -- Must also have fund-related keywords
  AND (
    LOWER(name) LIKE '%fund%'
    OR LOWER(name) LIKE '%scheme%'
    OR LOWER(name) LIKE '%plan%'
  );

-- Show summary of what was fixed
SELECT 
  asset_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 5) as sample_names
FROM public.assets
WHERE updated_at >= NOW() - INTERVAL '1 minute'
  AND (asset_type = 'mutual_fund' OR asset_type = 'index_fund')
GROUP BY asset_type;
