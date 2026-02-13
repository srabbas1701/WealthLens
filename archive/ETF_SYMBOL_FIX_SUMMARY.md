# ETF Symbol Fix - Executive Summary

**Issue:** ETF prices not updating  
**Root Cause:** Symbols set to NULL during upload  
**Status:** ✅ Code Fixed | ⚠️ Database Update Required  
**Priority:** 🔴 CRITICAL

---

## 🐛 The Problem in 30 Seconds

**What happened:**
- Your ETFs have `symbol = NULL` in the database
- Without symbols, Yahoo Finance can't fetch prices
- ETF values are stuck at purchase price

**Why it happened:**
- Code incorrectly treated ETFs as Mutual Funds
- Mutual Funds don't use trading symbols (they use AMFI codes)
- ETFs DO need trading symbols (they trade like stocks)
- Result: ETF symbols became NULL

---

## ✅ What I Fixed

### Code Changes (3 locations):
1. **`findAsset()`** - ETFs now use symbol lookup (like stocks)
2. **`createAsset()`** - ETFs get trading symbols (not scheme codes)
3. **Main loop** - Warns if ETF missing symbol

### Files Modified:
- ✅ `src/app/api/portfolio/upload/confirm/route.ts`

---

## ⚠️ What You Need to Do

### Run This SQL Script:

**File:** `supabase/fix_etf_symbols.sql`

**Quick version (copy-paste into Supabase SQL Editor):**

```sql
-- Fix all 8 ETFs
UPDATE assets SET symbol = 'CPSEETF' WHERE name ILIKE '%CPSE ETF%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'MOVALUE' WHERE name ILIKE '%Motilal%EnhVal%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'ICICIB22' WHERE name ILIKE '%Bharat 22%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'JUNIORBEES' WHERE name ILIKE '%Nifty Next 50%BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'PSUBNKBEES' WHERE name ILIKE '%PSU Bank BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'BANKBEES' WHERE name ILIKE '%Nifty Bank BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'GOLDBEES' WHERE name ILIKE '%Gold BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'NIFTYBEES' WHERE name ILIKE '%Nifty 50 BeES%' AND asset_type = 'etf';

-- Verify (should show 8 ETFs with symbols)
SELECT name, symbol FROM assets WHERE asset_type = 'etf' ORDER BY name;
```

---

## 🧪 Testing After Fix

1. **Verify Database:**
   - All 8 ETFs should have symbols
   - No NULL symbols remaining

2. **Test Price Update:**
   - Go to `/portfolio/etfs`
   - Click "Update Prices" button
   - Wait for completion
   - Verify NAVs are updated

3. **Check Values:**
   - Current Value should change from invested value
   - Gain/Loss should show actual performance
   - Price date should show today's date

---

## 📊 Expected Results

### Before Fix:
```
CPSE ETF: ₹90.20 (stuck at purchase price)
Symbol: NULL ❌
```

### After Fix:
```
CPSE ETF: ₹92.50 (updated from Yahoo Finance)
Symbol: CPSEETF ✅
```

---

## 🎯 Impact

### What This Fixes:
- ✅ ETF price updates from Yahoo Finance
- ✅ Accurate current values
- ✅ Correct gain/loss calculations
- ✅ Portfolio totals accuracy
- ✅ Price date tracking

### What Future Uploads Need:
- CSV must include Symbol column for ETFs
- Example: `CPSEETF`, `NIFTYBEES`, etc.
- Upload will warn if ETF missing symbol

---

## 📋 Quick Checklist

- [x] Code fixed (3 locations)
- [x] SQL script created
- [ ] **Run SQL script in Supabase** ← YOU ARE HERE
- [ ] Verify all ETFs have symbols
- [ ] Test price update button
- [ ] Confirm values are correct

---

## 🚨 Action Required NOW

**Copy this into Supabase SQL Editor and run:**

```sql
UPDATE assets SET symbol = 'CPSEETF' WHERE name ILIKE '%CPSE ETF%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'MOVALUE' WHERE name ILIKE '%Motilal%EnhVal%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'ICICIB22' WHERE name ILIKE '%Bharat 22%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'JUNIORBEES' WHERE name ILIKE '%Nifty Next 50%BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'PSUBNKBEES' WHERE name ILIKE '%PSU Bank BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'BANKBEES' WHERE name ILIKE '%Nifty Bank BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'GOLDBEES' WHERE name ILIKE '%Gold BeES%' AND asset_type = 'etf';
UPDATE assets SET symbol = 'NIFTYBEES' WHERE name ILIKE '%Nifty 50 BeES%' AND asset_type = 'etf';
```

**Then test the "Update Prices" button on your ETF page!**

---

**Files Created:**
- ✅ `supabase/fix_etf_symbols.sql` - Full SQL script with verification
- ✅ `ETF_SYMBOL_FIX_GUIDE.md` - Detailed guide
- ✅ `ETF_SYMBOL_FIX_SUMMARY.md` - This summary
