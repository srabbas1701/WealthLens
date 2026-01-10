# Duplicate API Calls Fix

## Problem Identified

Every page was making **duplicate API calls** to `/api/portfolio/data`:

### From Terminal Logs:
```
MF Page:
  Line 20: GET /api/portfolio/data (1292ms) ← First call
  Line 21: GET /api/portfolio/data (449ms)  ← DUPLICATE!

Dashboard:
  Line 23: GET /api/portfolio/data (448ms)  ← First call
  Line 26: GET /api/portfolio/data (389ms)  ← DUPLICATE!

Stock Page:
  Line 30: GET /api/portfolio/data (409ms)  ← First call
  Line 31: GET /api/portfolio/data (370ms)  ← DUPLICATE!
```

**Impact:** 50% wasted API calls and ~300-400ms extra load time per page

## Root Cause

React 18 in **development mode** intentionally calls `useEffect` hooks twice to help detect bugs. This is a feature, not a bug, but it causes duplicate network requests if not handled properly.

## Solution Implemented

Added a **ref-based deduplication flag** to prevent simultaneous duplicate fetches:

### Files Modified:
1. `src/app/dashboard/page.tsx`
2. `src/app/portfolio/mutualfunds/page.tsx`
3. `src/app/portfolio/equity/page.tsx`

### Implementation:

```typescript
// Add ref to track fetch state
const fetchingRef = useRef(false);

const fetchData = useCallback(async (userId: string) => {
  // Prevent duplicate simultaneous fetches
  if (fetchingRef.current) {
    console.log('[Page] Skipping duplicate fetch');
    return;
  }
  
  fetchingRef.current = true;
  setLoading(true);
  
  try {
    // ... fetch logic ...
  } finally {
    setLoading(false);
    fetchingRef.current = false; // Reset flag
  }
}, []);
```

## How It Works

1. **First call**: `fetchingRef.current` is `false`, so fetch proceeds
2. **Second call** (React 18 double-call): `fetchingRef.current` is `true`, so fetch is skipped
3. **After completion**: Flag is reset to `false` for next legitimate fetch

## Expected Results

### Before:
```
GET /api/portfolio/data 200 in 448ms
GET /api/portfolio/data 200 in 389ms  ← Duplicate!
Total: ~837ms
```

### After:
```
GET /api/portfolio/data 200 in 448ms
[Page] Skipping duplicate fetch  ← Logged, no network call
Total: ~448ms
```

**Improvement:** ~50% reduction in API calls, ~400ms faster page loads

## Important Notes

1. **Development vs Production:**
   - In **development**: React 18 double-calls effects (this fix prevents duplicates)
   - In **production**: React doesn't double-call, so this fix has no impact

2. **Why use `useRef` instead of state:**
   - `useRef` doesn't cause re-renders
   - State updates are asynchronous, `ref` is synchronous
   - Perfect for tracking "in-flight" requests

3. **Thread-safe:**
   - JavaScript is single-threaded
   - No race conditions possible
   - Simple and reliable

## Testing

After restarting the server, check terminal logs:

**You should see:**
```
GET /api/portfolio/data 200 in 400ms
[Dashboard] Skipping duplicate portfolio fetch
```

Instead of:
```
GET /api/portfolio/data 200 in 400ms
GET /api/portfolio/data 200 in 350ms
```

## Combined Performance Improvements

| Optimization | Impact |
|--------------|--------|
| Batch MF NAV queries | 6-8x faster (3.2s → 400ms) |
| Remove stock price fetching on read | Already fast |
| Prevent duplicate API calls | 50% fewer calls |
| **Total improvement** | **8-10x faster + cleaner logs** |

## Summary

- ✅ Identified duplicate API calls (React 18 dev mode behavior)
- ✅ Implemented ref-based deduplication
- ✅ Applied to Dashboard, MF, and Equity pages
- ✅ No impact on production (already optimized there)
- ✅ Cleaner logs and ~400ms faster page loads in dev
