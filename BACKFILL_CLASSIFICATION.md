# Backfill Asset Classification

## ✅ Migration Complete!

Your migration has been successfully applied. The database now has:
- ✅ New classification columns (`top_level_bucket`, `risk_behavior`, `valuation_method`)
- ✅ Updated `asset_class` values (capitalized format)
- ✅ Constraints and triggers in place

## 🎯 Next Step: Backfill Classification

The existing assets have their `asset_class` updated, but they still need the new classification fields populated. You have two options:

### Option 1: Run the Backfill Script (Recommended)

1. **Install dependencies** (if not already installed):
   ```bash
   npm install tsx
   ```

2. **Run the backfill script**:
   ```bash
   npx tsx scripts/backfill-asset-classification.ts
   ```

   This will:
   - Fetch all assets
   - Classify each asset using the classification service
   - Update `top_level_bucket`, `risk_behavior`, and `valuation_method`
   - Automatically sync to holdings via triggers

### Option 2: Manual SQL Backfill (Alternative)

If you prefer SQL, you can run this query to backfill based on `asset_type`:

```sql
-- This is a simplified version - the TypeScript script is more comprehensive
UPDATE public.assets
SET 
  top_level_bucket = CASE
    WHEN asset_type IN ('equity', 'mutual_fund', 'index_fund', 'etf', 'elss') THEN 'Growth'
    WHEN asset_type IN ('fd', 'bond', 'ppf', 'epf') THEN 'IncomeAllocation'
    WHEN asset_type IN ('nps', 'ulip') THEN 'IncomeAllocation'  -- Will be refined by classification service
    WHEN asset_type = 'gold' THEN 'Commodity'
    WHEN asset_type IN ('cash', 'savings') THEN 'Cash'
    ELSE NULL
  END,
  risk_behavior = CASE
    WHEN asset_type IN ('equity', 'mutual_fund', 'index_fund', 'etf', 'elss') THEN 'Growth'
    WHEN asset_type IN ('fd', 'bond', 'ppf', 'epf') THEN 'Defensive'
    WHEN asset_type = 'gold' THEN 'Hedge'
    WHEN asset_type IN ('cash', 'savings') THEN 'Liquidity'
    ELSE NULL
  END,
  valuation_method = CASE
    WHEN asset_type IN ('equity', 'etf') THEN 'MarketLinked'
    WHEN asset_type IN ('mutual_fund', 'index_fund', 'nps', 'ulip') THEN 'NAVBased'
    WHEN asset_type IN ('fd', 'bond', 'ppf', 'epf') THEN 'InterestBased'
    WHEN asset_type IN ('cash', 'savings', 'gold') THEN 'Manual'
    ELSE NULL
  END
WHERE top_level_bucket IS NULL;
```

**Note:** The TypeScript script is more accurate as it uses the full classification service with proper ULIP/NPS handling.

## 🔍 Verify the Backfill

After running the backfill, verify it worked:

```sql
-- Check how many assets have classification
SELECT 
  COUNT(*) as total,
  COUNT(top_level_bucket) as has_bucket,
  COUNT(risk_behavior) as has_risk,
  COUNT(valuation_method) as has_valuation
FROM public.assets;

-- Should show all counts matching (or close to) total

-- Check distribution by top_level_bucket
SELECT 
  top_level_bucket,
  COUNT(*) as count
FROM public.assets
WHERE top_level_bucket IS NOT NULL
GROUP BY top_level_bucket
ORDER BY count DESC;
```

## 📋 What Happens Next?

After backfilling:

1. **All new assets** will automatically get classification via the trigger
2. **All new holdings** will automatically sync classification from assets
3. **You can now use** the new classification system in your application:
   - Use `aggregateByClassification()` for portfolio aggregation
   - Use `classifyAsset()` when creating new assets
   - Use validation functions to ensure correctness

## 🚀 Ready to Use!

Your asset classification system is now fully operational! You can:
- Update API routes to use the new classification
- Update UI to show the new bucket structure
- Use validation rules to ensure data quality

See `ASSET_CLASSIFICATION_IMPLEMENTATION.md` for integration details.
