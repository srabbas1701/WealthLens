# Analytics Pages - Stocks/Equity Terminology Fix

## Issues Fixed

### 1. Direct Equity Holdings Filtering
**Problem**: Analytics pages were only filtering for `assetType === 'Equity'`, missing holdings labeled as 'Stocks'.

**Fix**: Updated all filters to check for both:
```typescript
// Before
const equityHoldings = portfolioData.holdings.filter((h: any) => h.assetType === 'Equity');

// After
const equityHoldings = portfolioData.holdings.filter((h: any) => h.assetType === 'Equity' || h.assetType === 'Stocks');
```

### 2. Allocation Lookup
**Problem**: Analytics Overview was only looking for `a.name === 'Equity'` in allocation, missing 'Stocks'.

**Fix**: Updated to check for both:
```typescript
// Before
const equityOwnership = portfolioData.allocation.find((a: any) => a.name === 'Equity')?.value || 0;

// After
const equityAllocation = portfolioData.allocation.find((a: any) => a.name === 'Stocks' || a.name === 'Equity');
const equityOwnership = equityAllocation?.value || 0;
```

### 3. User-Facing Terminology
**Problem**: Some user-facing text still said "Equity" instead of "Stocks" for direct holdings.

**Fix**: Updated labels to use "Stocks" for direct holdings:
- Analytics Overview: "Equity" → "Stocks" (for direct holdings)
- MF Exposure: "Equity" → "Stocks" (for direct holdings)
- All references to direct holdings now say "Stocks"

### 4. Fixed Deposits Consistency
**Problem**: Allocation lookup only checked 'Fixed Deposit' (singular), missing 'Fixed Deposits' (plural).

**Fix**: Updated to check for both:
```typescript
const fdOwnership = portfolioData.allocation.find((a: any) => a.name === 'Fixed Deposit' || a.name === 'Fixed Deposits')?.value || 0;
```

## Files Updated

1. ✅ `src/app/analytics/overview/page.tsx`
   - Fixed allocation lookup (Stocks/Equity)
   - Fixed others filter (excludes Stocks)
   - Updated user-facing text to "Stocks"
   - Fixed Fixed Deposits lookup

2. ✅ `src/app/analytics/sector-exposure/page.tsx`
   - Fixed holdings filter (Stocks/Equity)

3. ✅ `src/app/analytics/marketcap-exposure/page.tsx`
   - Fixed holdings filter (Stocks/Equity)

4. ✅ `src/app/analytics/geography-exposure/page.tsx`
   - Fixed holdings filter (Stocks/Equity)

5. ✅ `src/app/analytics/mutualfund-exposure/page.tsx`
   - Fixed holdings filter (Stocks/Equity)
   - Updated assetType in combinedView to 'Stocks'
   - Updated user-facing text to "Stocks" for direct holdings

## Terminology Rules

### Direct Holdings (Ownership)
- **Label**: "Stocks" (not "Equity")
- **Filter**: `assetType === 'Equity' || assetType === 'Stocks'`
- **Allocation**: Check for both `'Stocks'` and `'Equity'`

### Equity Exposure (via Mutual Funds)
- **Label**: "Equity" (correct - refers to asset class exposure)
- **Context**: "Equity (via Mutual Funds)" is correct terminology
- **Not Changed**: This refers to exposure, not direct holdings

## Result

✅ All analytics pages now correctly identify direct equity/stocks holdings  
✅ No more blank direct equity values  
✅ Consistent "Stocks" terminology for direct holdings  
✅ "Equity" terminology preserved for exposure analytics  

---

**Status**: ✅ Complete  
**Result**: All analytics pages now correctly handle Stocks/Equity terminology and show direct equity holdings properly.









