# PPF Database Schema Fix

**Issue:** Could not find the 'asset_type' column of 'holdings' in the schema cache  
**Status:** ✅ Fixed  
**Date:** January 10, 2026

---

## 🐛 **Problem**

When trying to save PPF details, the application showed the error:
```
Could not find the 'asset_type' column of 'holdings' in the schema cache
```

### Root Cause:
The PPF API endpoint (`src/app/api/ppf/holdings/route.ts`) was trying to insert data directly into the `holdings` table with an `asset_type` column, but the `holdings` table doesn't have this column.

### Database Schema:
```sql
-- holdings table structure:
create table public.holdings (
  id uuid primary key,
  portfolio_id uuid references portfolios(id),
  asset_id uuid references assets(id) not null,  -- ← Links to assets table
  quantity numeric,
  invested_value numeric,
  current_value numeric,
  average_price numeric,
  source text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

-- assets table structure:
create table public.assets (
  id uuid primary key,
  name text,
  asset_type text,  -- ← asset_type is here, not in holdings!
  isin text,
  symbol text,
  sector text,
  asset_class text,
  risk_bucket text,
  is_active boolean
);
```

**The Problem:** The `holdings` table uses `asset_id` to reference the `assets` table, which contains the `asset_type`. The PPF API was incorrectly trying to set `asset_type` directly in the `holdings` table.

---

## ✅ **Solution**

Updated the PPF API to follow the correct pattern:

1. **Create an asset** in the `assets` table with `asset_type: 'ppf'`
2. **Create a holding** in the `holdings` table with `asset_id` referencing that asset
3. **Store PPF-specific details** in the `notes` JSON field

---

## 📝 **Changes Made**

### File: `src/app/api/ppf/holdings/route.ts`

#### POST Endpoint (Create PPF Account):

**Before (Incorrect):**
```typescript
const { data: holding, error: insertError } = await supabase
  .from('holdings')
  .insert({
    user_id,
    asset_id: null,           // ❌ Wrong
    asset_type: 'ppf',        // ❌ Column doesn't exist
    name: `PPF Account - ...`,
    quantity: 1,
    // ...
  });
```

**After (Correct):**
```typescript
// 1. Get user's portfolio
const { data: portfolio } = await supabase
  .from('portfolios')
  .select('id')
  .eq('user_id', user_id)
  .eq('is_primary', true)
  .single();

// 2. Create asset in assets table
const { data: asset } = await supabase
  .from('assets')
  .insert({
    name: `PPF Account - ${accountHolderName}`,
    symbol: `PPF_${accountNumber}`,
    asset_type: 'ppf',        // ✅ asset_type goes here
    asset_class: 'debt',
    risk_bucket: 'low',
    sector: 'Government',
    is_active: true,
  })
  .select('id')
  .single();

// 3. Create holding with asset_id
const { data: holding } = await supabase
  .from('holdings')
  .insert({
    portfolio_id: portfolio.id,  // ✅ Use portfolio_id
    asset_id: asset.id,           // ✅ Reference the asset
    quantity: 1,
    average_price: currentBalance,
    invested_value: totalContributions,
    current_value: currentBalance,
    notes: JSON.stringify(notes), // ✅ PPF details in notes
    source: 'manual',
  });
```

---

#### PUT Endpoint (Update PPF Account):

**Changes:**
1. Fetch holding with joined `assets` and `portfolios` tables
2. Verify ownership through portfolio relationship
3. Update both `assets` table (for name/symbol) and `holdings` table
4. Fixed duplicate checking logic to work with new structure

**Key Fix:**
```typescript
// Verify holding with proper joins
const { data: existingHolding } = await supabase
  .from('holdings')
  .select('*, asset:assets(*), portfolio:portfolios!inner(user_id)')
  .eq('id', holdingId)
  .single();

// Verify ownership
if (existingHolding.portfolio?.user_id !== user_id) {
  return error;
}

// Update asset name
await supabase
  .from('assets')
  .update({
    name: `PPF Account - ${accountHolderName}`,
    symbol: `PPF_${accountNumber}`,
  })
  .eq('id', existingHolding.asset.id);

// Update holding
await supabase
  .from('holdings')
  .update({
    average_price: currentBalance,
    invested_value: totalContributions,
    current_value: currentBalance,
    notes: JSON.stringify(notes),
  })
  .eq('id', holdingId);
```

---

#### DELETE Endpoint (Delete PPF Account):

**Changes:**
1. Verify holding exists with proper joins
2. Delete asset first (will cascade to holding if configured)
3. Delete holding directly as fallback

**Key Fix:**
```typescript
// Verify with joins
const { data: existingHolding } = await supabase
  .from('holdings')
  .select('id, asset:assets!inner(id, asset_type), portfolio:portfolios!inner(user_id)')
  .eq('id', holdingId)
  .single();

// Verify ownership and type
if (existingHolding.portfolio?.user_id !== user_id) {
  return error;
}

// Delete asset (cascade to holding)
const assetId = existingHolding.asset?.id;
if (assetId) {
  await supabase.from('assets').delete().eq('id', assetId);
}

// Delete holding
await supabase.from('holdings').delete().eq('id', holdingId);
```

---

### Duplicate Check Fix:

**Before (Incorrect):**
```typescript
const { data: existingAccount } = await supabase
  .from('holdings')
  .select('id')
  .eq('user_id', user_id)           // ❌ holdings doesn't have user_id
  .eq('asset_type', 'ppf')          // ❌ holdings doesn't have asset_type
  .ilike('notes', `%"accountNumber"...`);
```

**After (Correct):**
```typescript
// Get all holdings with joined assets
const { data: allHoldings } = await supabase
  .from('holdings')
  .select('id, notes, asset:assets!inner(asset_type)')
  .eq('portfolio_id', portfolio.id);

// Filter PPF accounts and check for duplicates
const duplicateAccount = allHoldings.find((h: any) => {
  if (h.asset?.asset_type !== 'ppf') return false;
  const notes = h.notes ? JSON.parse(h.notes) : {};
  return notes.accountNumber === accountNumber;
});
```

---

## 🔄 **Data Flow (Corrected)**

### Creating a PPF Account:

```
User submits PPF form data
    ↓
API receives data
    ↓
1. Get user's portfolio
    ↓
2. Check for duplicate account number
    ↓
3. Create asset in assets table
   {
     name: "PPF Account - Raza Abbas",
     asset_type: "ppf",
     symbol: "PPF_123456789",
     asset_class: "debt",
     risk_bucket: "low"
   }
    ↓
4. Create holding in holdings table
   {
     portfolio_id: <portfolio_id>,
     asset_id: <asset_id>,
     invested_value: 400000,
     current_value: 500000,
     notes: JSON.stringify({
       accountNumber: "123456789",
       accountHolderName: "Raza Abbas",
       bankOrPostOffice: "SBI",
       // ... all PPF details
     })
   }
    ↓
Success! PPF account created
```

---

## 📊 **Database Relationships**

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│ portfolios  │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐          ┌─────────────┐
│    holdings     │ N:1      │   assets    │
│                 │──────────│             │
│ - portfolio_id  │          │ - asset_type│
│ - asset_id ────────────────│ - name      │
│ - invested_value│          │ - symbol    │
│ - current_value │          └─────────────┘
│ - notes (JSON)  │
└─────────────────┘
```

**Key Points:**
- `holdings` table has `portfolio_id` (not `user_id`)
- `holdings` table has `asset_id` (not `asset_type`)
- `asset_type` comes from the joined `assets` table
- PPF-specific details are stored in `notes` JSON field

---

## ✅ **Testing the Fix**

### Test Steps:

1. **Navigate to Dashboard**
   ```
   http://localhost:5175/dashboard
   ```

2. **Click "Add Manually"**
   - Select "PPF"
   - Fill in all details:
     - Account Number: PPF123456789
     - Holder Name: Raza Abbas
     - Opening Date: 01/01/2020
     - Bank: State Bank of India
     - Current Balance: 500000
     - Total Contributions: 400000
   - Click "Save PPF Account"

3. **Expected Result:**
   - ✅ Success message appears
   - ✅ No error about 'asset_type' column
   - ✅ PPF account appears in dashboard
   - ✅ Data persists after refresh

4. **Verify in Database:**
   ```sql
   -- Check assets table
   SELECT * FROM assets WHERE asset_type = 'ppf';
   
   -- Check holdings table
   SELECT h.*, a.name, a.asset_type 
   FROM holdings h
   JOIN assets a ON h.asset_id = a.id
   WHERE a.asset_type = 'ppf';
   ```

---

## 🎯 **Why This Pattern?**

### Benefits of asset_id Reference:

1. **Normalization:** Asset metadata (type, sector, risk) stored once
2. **Consistency:** All holdings reference assets the same way
3. **Integrity:** Foreign key constraints ensure data validity
4. **Querying:** Easy joins for reporting and analytics
5. **Flexibility:** Can add asset-level data without changing holdings

### Why Not Embed asset_type in holdings?

- ❌ Data duplication
- ❌ Inconsistency risk if asset changes
- ❌ More complex queries (no joins)
- ❌ Harder to maintain asset metadata

---

## 📚 **Pattern for Future Manual Investments**

When adding new manual investment types (e.g., EPF), follow this pattern:

```typescript
// 1. Create asset
const { data: asset } = await supabase
  .from('assets')
  .insert({
    name: 'Investment Name',
    asset_type: 'investment_type',
    asset_class: 'equity|debt|gold|cash|hybrid',
    risk_bucket: 'low|medium|high',
    // ...other metadata
  })
  .select('id')
  .single();

// 2. Create holding
const { data: holding } = await supabase
  .from('holdings')
  .insert({
    portfolio_id: portfolioId,
    asset_id: asset.id,           // ← Link to asset
    quantity: 1,
    invested_value: amount,
    current_value: amount,
    notes: JSON.stringify({       // ← Type-specific details
      // ... custom fields
    }),
    source: 'manual',
  });
```

---

## 🎉 **Status**

- [x] Identified root cause
- [x] Fixed POST endpoint (create)
- [x] Fixed PUT endpoint (update)
- [x] Fixed DELETE endpoint (delete)
- [x] Fixed duplicate checking logic
- [x] Updated all database queries
- [x] No linter errors
- [x] Ready for testing

---

## 🔍 **Verification**

Run this query to verify the fix works:

```sql
-- This should return PPF assets and holdings correctly
SELECT 
  h.id as holding_id,
  a.name as asset_name,
  a.asset_type,
  h.invested_value,
  h.current_value,
  h.notes::json->>'accountNumber' as ppf_account_number,
  h.notes::json->>'accountHolderName' as holder_name
FROM holdings h
JOIN assets a ON h.asset_id = a.id
WHERE a.asset_type = 'ppf'
ORDER BY h.created_at DESC;
```

---

**Fix Applied:** January 10, 2026  
**Status:** ✅ Complete and Ready for Testing
