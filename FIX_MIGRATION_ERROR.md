# Fix Migration Error

## Problem

The error shows that a row with `asset_class = 'FixedIncome'` is violating the constraint, even though `'FixedIncome'` is in the allowed list. This suggests:

1. The constraint might have been applied before data migration completed
2. There might be whitespace or case issues
3. The migration might have failed partway through

## Solution

### Option 1: Run the Fixed Migration (Recommended)

1. **First, check what values you currently have:**
   ```sql
   SELECT asset_class, COUNT(*) as count
   FROM public.assets
   WHERE asset_class IS NOT NULL
   GROUP BY asset_class
   ORDER BY count DESC;
   ```

2. **Run the fixed migration:**
   - Open `006_add_asset_classification_fields_fixed.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Run it

   This migration:
   - Drops all constraints first
   - Migrates data safely
   - Re-applies constraints
   - Handles all edge cases

### Option 2: Manual Fix (If Option 1 doesn't work)

1. **Drop the constraint temporarily:**
   ```sql
   ALTER TABLE public.assets
   DROP CONSTRAINT IF EXISTS assets_asset_class_check;
   ```

2. **Fix the data:**
   ```sql
   UPDATE public.assets
   SET asset_class = CASE
     WHEN LOWER(TRIM(asset_class)) = 'equity' THEN 'Equity'
     WHEN LOWER(TRIM(asset_class)) = 'debt' THEN 'FixedIncome'
     WHEN LOWER(TRIM(asset_class)) = 'hybrid' THEN 'Hybrid'
     WHEN LOWER(TRIM(asset_class)) = 'gold' THEN 'Commodity'
     WHEN LOWER(TRIM(asset_class)) = 'cash' THEN 'Cash'
     WHEN asset_class IN ('Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability') THEN asset_class
     ELSE NULL
   END
   WHERE asset_class IS NOT NULL;
   ```

3. **Re-apply the constraint:**
   ```sql
   ALTER TABLE public.assets
   ADD CONSTRAINT assets_asset_class_check CHECK (
     asset_class IS NULL OR asset_class IN (
       'Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability'
     )
   );
   ```

## Verify Fix

After running the fix, verify it worked:

```sql
-- Check for any invalid values
SELECT asset_class, COUNT(*) as count
FROM public.assets
WHERE asset_class IS NOT NULL
  AND asset_class NOT IN ('Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability')
GROUP BY asset_class;

-- Should return 0 rows

-- Check constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'assets'
  AND constraint_name = 'assets_asset_class_check';
```

## Next Steps

After the migration succeeds:
1. Run a backfill script to populate `top_level_bucket`, `risk_behavior`, and `valuation_method` for existing assets
2. Update your application code to use the new classification system
