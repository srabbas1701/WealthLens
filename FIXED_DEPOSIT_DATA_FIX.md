# Fixed Deposit Holdings Data Mismatch - Fixed

## The Issue

Portfolio Summary showed Fixed Deposits data (₹3.50 L, 1 holding), but the Fixed Deposit Holdings page showed no data (₹0, 0 holdings).

## Root Cause

**Label mismatch** between API and page filters:

1. **API Label Mapping**: 
   - `'fd'` → `'Fixed Deposits'` (plural) in `ASSET_TYPE_LABELS`

2. **Portfolio Summary**:
   - Matches by `asset.name` which is `'Fixed Deposits'` (plural) ✅ Works

3. **Fixed Deposit Holdings Page**:
   - Filtered by `assetType === 'Fixed Deposit'` (singular) ❌ Doesn't match

## The Fix

Updated the Fixed Deposit Holdings page filter to check for both:
```typescript
.filter((h: any) => h.assetType === 'Fixed Deposit' || h.assetType === 'Fixed Deposits')
```

## Also Fixed

Updated Equity page to handle both 'Equity' and 'Stocks' labels:
```typescript
.filter((h: any) => h.assetType === 'Equity' || h.assetType === 'Stocks')
```

## Result

Now both pages will correctly show:
- Fixed Deposit Holdings: Shows all FD holdings matching either label
- Equity Holdings: Shows all equity holdings matching either label
- Data consistency: Portfolio Summary and detail pages now match

---

**Status**: ✅ Fixed  
**Files Updated**:
- `src/app/portfolio/fixeddeposits/page.tsx`
- `src/app/portfolio/equity/page.tsx`








