# How to Run the Asset Classification Migration

## Option 1: SQL Editor (Quick Test)

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/006_add_asset_classification_fields.sql`
4. Paste into the SQL Editor
5. Click **Run**

⚠️ **Note:** This will apply the migration but may not track it in the migrations table. For production, use the CLI.

---

## Option 2: Supabase CLI (Recommended)

### Install Supabase CLI (if not installed):

```bash
# Using npm
npm install -g supabase

# Or using Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Run the migration:

```bash
# Navigate to project directory
cd "d:\3. AIGF Fellowship\Investment Portfolio\Cursor\investment-copilot"

# Run migration
supabase migration up

# Or if using remote database
supabase db push
```

---

## Option 3: Manual Execution (If needed)

If you need to run specific parts manually, the migration is safe to run multiple times (uses `IF NOT EXISTS` and `DROP IF EXISTS`).

---

## Verify Migration

After running, verify the migration worked:

```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN ('top_level_bucket', 'risk_behavior', 'valuation_method');

-- Check if constraints are applied
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'assets'
AND constraint_name LIKE '%asset_class%';
```

---

## Next Steps After Migration

1. **Backfill existing assets** with classification (see `ASSET_CLASSIFICATION_IMPLEMENTATION.md`)
2. **Update API routes** to use new classification system
3. **Update UI components** to show new bucket structure
