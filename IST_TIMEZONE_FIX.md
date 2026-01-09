# IST Timezone Fix for NAV Updates

## Problem
NAV update was checking for Sunday (2026-01-04) instead of the correct previous trading day because the server was using UTC timezone instead of IST.

## Root Cause
The `getPreviousTradingDay()` function in `src/lib/stock-prices.ts` was using:
```typescript
const today = new Date(); // Uses system timezone (UTC on server)
```

When it's **Monday, Jan 6, 2026 at 8:00 AM IST**:
- In IST: Current date = Jan 6 → Yesterday = Jan 5 (Sunday) → Go back to Friday Jan 3
- In UTC: Current date = Jan 5 (2:30 AM) → Yesterday = Jan 4 (Saturday) → Go back to Friday Jan 3

But if it's early morning IST (before 5:30 AM), UTC is still on the previous day, causing incorrect calculations.

## The Fix
Updated `getPreviousTradingDay()` to use **IST timezone (GMT+5:30)**:

```typescript
export function getPreviousTradingDay(): string {
  // Get current time in IST (GMT+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  // Get yesterday's date in IST
  let date = new Date(istTime);
  date.setDate(date.getDate() - 1);
  
  // If yesterday was Sunday (0) or Saturday (6), go back to Friday
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  
  // Return in YYYY-MM-DD format
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
```

## Impact
This function is used in:
1. **Stock prices** - `src/lib/stock-prices.ts`
2. **MF NAVs** - `src/lib/mf-navs.ts`
3. **Portfolio data API** - When fetching current prices/NAVs

Now all date calculations are based on IST, ensuring:
- Monday morning IST correctly identifies Friday as the previous trading day
- Weekend detection works correctly
- NAV/price dates match Indian market trading days

## Testing
Check the console logs after clicking "Update NAVs":
```
[MF NAV Update API] Target NAV date (IST): 2026-01-05
```

If today is Monday Jan 6, 2026, it should show Friday Jan 3, 2026 (not Sunday Jan 4).

## Files Modified
1. `src/lib/stock-prices.ts` - Fixed `getPreviousTradingDay()` to use IST
2. `src/app/api/mf/navs/update/route.ts` - Added logging for target date


