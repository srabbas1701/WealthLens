# NAV Update Issues - FIXED (Both Issues)

## Problem 1: NAVs Not Updating (Missing Code)
NAV values were not updating in the Mutual Funds holdings page even after clicking "Update NAVs" button.

## Problem 2: Wrong Date (Timezone Issue)
NAV update was checking for Sunday (2026-01-04) instead of the correct previous trading day because it was using UTC instead of IST.

## Root Cause
**Line 139 in `src/app/api/mf/navs/update/route.ts` was missing:**

The code was collecting scheme codes from ISINs but **not assigning them** to the `schemeCodesToUpdate` array before calling the update function.

```typescript
// BEFORE (BUG):
for (const isin of isins) {
  // ... code to get scheme codes ...
  schemeCodeSet.add(schemeCode);
}
// Missing: schemeCodesToUpdate = Array.from(schemeCodeSet);

// AFTER (FIXED):
for (const isin of isins) {
  // ... code to get scheme codes ...
  schemeCodeSet.add(schemeCode);
}
schemeCodesToUpdate = Array.from(schemeCodeSet); // ✅ ADDED THIS LINE
```

## How NAV Update Works

### Flow:
1. **User clicks "Update NAVs"** → Frontend calls `/api/mf/navs/update` (POST)
2. **API fetches ISINs** from holdings table for all mutual funds
3. **Maps ISINs → Scheme Codes** using `mf_scheme_master` table
4. **Fetches NAVs from AMFI** for those scheme codes
5. **Stores NAVs** in `mf_navs` table (upsert by scheme_code + nav_date)
6. **Frontend refreshes** portfolio data
7. **Portfolio Data API** (`/api/portfolio/data`) reads NAVs from `mf_navs` and updates `current_value` in holdings
8. **MF Page calculates** `latestNav = current_value / units` and displays it

### The Bug Impact:
- `schemeCodesToUpdate` was empty `[]`
- API returned `{ success: true, updated: 0, failed: 0 }`
- No NAVs were actually fetched or stored
- Holdings `current_value` remained unchanged
- Displayed NAV = old value

## Additional Improvements

### 1. Added Console Logging
```typescript
console.log(`[MF NAV Update API] Updating NAVs for ${schemeCodesToUpdate.length} schemes`);
console.log(`[MF NAV Update API] Updated ${successCount} NAVs, ${failureCount} failed`);
```

### 2. Added Success Alert
Shows user how many schemes were updated:
```typescript
alert(`NAVs updated successfully! ${data.updated} schemes updated.`);
```

### 3. Fixed TypeScript Errors
Added type assertions for `maybeSingle()` results.

## Testing
1. Click "Update NAVs" button
2. Check browser console for logs
3. Should see: `[MF NAV Update API] Updating NAVs for X schemes`
4. Should see alert: `NAVs updated successfully! X schemes updated.`
5. NAV values in table should update

## Fix 2: IST Timezone Issue

### Root Cause
```typescript
// BEFORE (BUG):
export function getPreviousTradingDay(): string {
  const today = new Date(); // ❌ Uses UTC on server!
  let date = new Date(today);
  date.setDate(date.getDate() - 1);
  // ... weekend logic ...
  return date.toISOString().split('T')[0];
}
```

When it's **Monday, Jan 6, 2026 at 8:00 AM IST**:
- Server (UTC): Current = Jan 5, 2:30 AM → Yesterday = Jan 4 (Sat) → Jan 3 (Fri) ✅
- But at **midnight to 5:30 AM IST**: UTC is still on previous day, causing wrong calculations!

### The Fix
```typescript
// AFTER (FIXED):
export function getPreviousTradingDay(): string {
  // Get current time in IST (GMT+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // ✅ IST offset
  const istTime = new Date(now.getTime() + istOffset);
  
  let date = new Date(istTime);
  date.setDate(date.getDate() - 1);
  
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  
  // Format as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
```

## Files Modified
1. `src/app/api/mf/navs/update/route.ts` - Fixed missing assignment + added date logging
2. `src/app/portfolio/mutualfunds/page.tsx` - Added success alert + logging
3. `src/lib/stock-prices.ts` - Fixed `getPreviousTradingDay()` to use IST timezone

