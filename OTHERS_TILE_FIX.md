# Others Tile Calculation Fix

## The Issue

The "Others" tile was showing incorrect values because:
1. It wasn't excluding "Stocks" (which is the same as "Equity")
2. It wasn't excluding "Fixed Deposits" (plural) - only "Fixed Deposit" (singular)

## The Fix

Updated the "Others" tile filter to exclude:
- 'Mutual Funds'
- 'Equity'
- 'Stocks' (added - this is the label used for equity)
- 'Fixed Deposit' (singular)
- 'Fixed Deposits' (plural - added)

## What "Others" Should Include

"Others" should include all asset types that are NOT:
- Mutual Funds
- Equity/Stocks (direct stock holdings)
- Fixed Deposits

Examples of what "Others" includes:
- Bonds
- Gold
- PPF
- EPF
- NPS
- Cash
- ETFs
- Index Funds
- Hybrid funds
- Any other asset types

## Calculation Logic

```typescript
// Sum all allocation items that are NOT the main asset types
portfolio.allocation
  .filter(a => !['Mutual Funds', 'Equity', 'Stocks', 'Fixed Deposit', 'Fixed Deposits'].includes(a.name))
  .reduce((sum, a) => sum + a.value, 0)
```

## Result

Now "Others" will correctly show:
- Only non-main asset types
- Excludes Stocks (which is counted in Equity tile)
- Excludes Fixed Deposits (which is counted in Fixed Deposits tile)
- Percentages should now add up to 100%

---

**Status**: ✅ Fixed  
**Result**: "Others" tile now shows correct value excluding all main asset types








