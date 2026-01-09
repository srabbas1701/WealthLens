# Equity vs Stocks - Terminology Fix

## The Issue

You noticed a discrepancy:
- **Equity tile**: Shows ₹0 (0%)
- **Allocation chart**: Shows "Stocks" at 44%

## Root Cause

This was a **terminology mismatch** in the code:

1. **API Label Mapping**: The backend API (`/api/portfolio/data`) has a mapping that converts:
   - `asset_type: 'equity'` → Display label: `'Stocks'`

2. **Dashboard Tile Lookup**: The Equity tile was looking for:
   - `allocation.find(a => a.name === 'Equity')`
   - But the allocation array contains `'Stocks'` (not `'Equity'`)

3. **Result**: 
   - Equity tile couldn't find "Equity" → showed 0%
   - Allocation chart correctly showed "Stocks" at 44%

## The Fix

Updated the Equity tile to look for **both** labels:
```typescript
portfolio.allocation.find(a => a.name === 'Equity' || a.name === 'Stocks')
```

Now the Equity tile will correctly show the value whether it's labeled as "Equity" or "Stocks".

## Terminology Clarification

**"Equity" and "Stocks" are the same thing** - they both refer to direct stock holdings (shares you own directly, not via mutual funds).

- **Equity** = Direct stock holdings (what you own)
- **Stocks** = Same thing, just a different label

**Important**: This is different from:
- **Equity Exposure (via MF)** = Stocks that your mutual funds hold (shown in Advanced Analytics, not dashboard)

## What You'll See Now

After the fix:
- **Equity tile**: Will show the correct value (matching the "Stocks" in allocation chart)
- **Allocation chart**: Still shows "Stocks" (this is correct)
- **Both show the same value**: Direct stock holdings only

---

**Status**: ✅ Fixed  
**Result**: Equity tile now correctly displays direct stock holdings value









