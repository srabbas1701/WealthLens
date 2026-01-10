/**
 * Fix ETF Symbols - Emergency Patch
 * 
 * PROBLEM:
 * ETFs were incorrectly treated as Mutual Funds during upload, causing their
 * symbols to be set to NULL. Without symbols, Yahoo Finance cannot fetch prices.
 * 
 * SOLUTION:
 * Extract trading symbols from ETF names and update the assets table.
 * 
 * Date: January 10, 2026
 * Status: Emergency Fix
 */

-- ============================================================================
-- STEP 1: Identify ETFs with NULL symbols
-- ============================================================================

SELECT 
  id,
  name,
  symbol,
  isin,
  asset_type
FROM assets
WHERE asset_type = 'etf'
  AND symbol IS NULL
ORDER BY name;

-- Expected: 8 ETFs with NULL symbols


-- ============================================================================
-- STEP 2: Update ETF symbols based on name patterns
-- ============================================================================

-- CPSE ETF (XNSE:CPSEETF)
UPDATE assets
SET symbol = 'CPSEETF'
WHERE asset_type = 'etf'
  AND name ILIKE '%CPSE ETF%'
  AND symbol IS NULL;

-- Motilal Osw BSE EnhVal ETF (XNSE:MOVALUE)
UPDATE assets
SET symbol = 'MOVALUE'
WHERE asset_type = 'etf'
  AND name ILIKE '%Motilal%EnhVal%'
  AND symbol IS NULL;

-- Bharat 22 ETF (XNSE:ICICIB22)
UPDATE assets
SET symbol = 'ICICIB22'
WHERE asset_type = 'etf'
  AND name ILIKE '%Bharat 22%'
  AND symbol IS NULL;

-- NipponETFNifty Next 50 Jr BeES (XNSE:JUNIORBEES)
UPDATE assets
SET symbol = 'JUNIORBEES'
WHERE asset_type = 'etf'
  AND name ILIKE '%Nifty Next 50%BeES%'
  AND symbol IS NULL;

-- NipponINETFNifty PSU Bank BeES (XNSE:PSUBNKBEES)
UPDATE assets
SET symbol = 'PSUBNKBEES'
WHERE asset_type = 'etf'
  AND name ILIKE '%PSU Bank BeES%'
  AND symbol IS NULL;

-- Nippon IN ETF Nifty Bank BeES (XNSE:BANKBEES)
UPDATE assets
SET symbol = 'BANKBEES'
WHERE asset_type = 'etf'
  AND name ILIKE '%Nifty Bank BeES%'
  AND symbol IS NULL;

-- Nippon India ETF Gold BeES (XNSE:GOLDBEES)
UPDATE assets
SET symbol = 'GOLDBEES'
WHERE asset_type = 'etf'
  AND name ILIKE '%Gold BeES%'
  AND symbol IS NULL;

-- Nippon India ETF Nifty 50 BeES (XNSE:NIFTYBEES)
UPDATE assets
SET symbol = 'NIFTYBEES'
WHERE asset_type = 'etf'
  AND name ILIKE '%Nifty 50 BeES%'
  AND symbol IS NULL;

-- Bharat 22 ETF (alternative pattern)
UPDATE assets
SET symbol = 'ICICIB22'
WHERE asset_type = 'etf'
  AND name ILIKE '%Bharat%22%'
  AND symbol IS NULL;


-- ============================================================================
-- STEP 3: Verify updates
-- ============================================================================

SELECT 
  id,
  name,
  symbol,
  isin,
  asset_type,
  CASE 
    WHEN symbol IS NOT NULL THEN '✅ Fixed'
    ELSE '❌ Still NULL'
  END as status
FROM assets
WHERE asset_type = 'etf'
ORDER BY symbol NULLS LAST, name;


-- ============================================================================
-- STEP 4: Check for any remaining NULL symbols
-- ============================================================================

SELECT 
  COUNT(*) as remaining_null_symbols,
  STRING_AGG(name, ', ') as etf_names
FROM assets
WHERE asset_type = 'etf'
  AND symbol IS NULL;

-- Expected: 0 remaining NULL symbols


-- ============================================================================
-- STEP 5: Verify Yahoo Finance compatibility
-- ============================================================================

-- All ETF symbols should be valid NSE symbols
-- Yahoo Finance format: SYMBOL.NS (e.g., CPSEETF.NS)

SELECT 
  symbol,
  name,
  CONCAT(symbol, '.NS') as yahoo_symbol,
  'https://finance.yahoo.com/quote/' || symbol || '.NS' as yahoo_url
FROM assets
WHERE asset_type = 'etf'
  AND symbol IS NOT NULL
ORDER BY symbol;


-- ============================================================================
-- NOTES FOR FUTURE UPLOADS
-- ============================================================================

-- 1. ETFs MUST have trading symbols in the CSV
-- 2. Symbol column should contain: CPSEETF, NIFTYBEES, etc.
-- 3. ETFs are NOT mutual funds - they trade on exchanges like stocks
-- 4. Without symbols, price updates from Yahoo Finance will fail
-- 5. The upload API has been fixed to handle ETFs correctly

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback these changes (NOT RECOMMENDED):
-- UPDATE assets SET symbol = NULL WHERE asset_type = 'etf';
