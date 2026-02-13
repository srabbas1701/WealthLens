# MF Performance Fix - Proper Analysis

## Problem Analysis (From Terminal Logs)

### Current Performance:
- **Dashboard**: 105ms ✅ GOOD
- **MF Page**: 3.2 seconds ❌ BAD (render: 3.1s)
- **Stock Page**: 4.1 seconds ❌ BAD (render: 4.0s)

### Root Cause Identified:

The `/api/portfolio/data` route was taking 3-4 seconds in the "render" phase, which is where the actual API logic runs.

#### For 27 Mutual Fund Holdings:

**Before optimization (loop-based):**
```
For each MF (27 times):
  1. Call getMFNavByISIN(isin)
     → Call getSchemeCodeByISIN(isin)  [1 DB query]
     → Call getMFNav(schemeCode)       [1 DB query]

Total: 27 MF × 2 queries = 54 database queries
Result: 3-4 seconds render time
```

**After optimization (batch-based):**
```
Step 1: Get all scheme codes for all ISINs (3 parallel queries)
  - Query isin_growth column    [1 DB query]
  - Query isin_div_payout column [1 DB query]  } In parallel
  - Query isin_div_reinvest column [1 DB query]
  
Step 2: Get all NAVs for all scheme codes (1 batch query)
  - Query mf_navs for all scheme_codes [1 DB query]
  
Step 3 (if needed): Get latest NAVs for missing (1 batch query)
  - Query mf_navs for latest NAVs [1 DB query]

Total: 5 queries maximum (3 in parallel, 2 sequential)
Expected result: < 500ms render time (7x faster)
```

## Why 3 Parallel Queries Instead of 1?

The `mf_scheme_master` table has 3 ISIN columns:
- `isin_growth`
- `isin_div_payout`
- `isin_div_reinvest`

Supabase doesn't support a single "IN any column" query efficiently, so we:
1. Query all 3 columns in parallel (fast - happens simultaneously)
2. Combine and deduplicate the results in memory (instant)

**Time cost: 1 query duration (because they're parallel), not 3**

## Implementation Details

### File Changed:
- `src/lib/mf-navs.ts` - function `getMFNavsByISIN()`

### Changes:
1. **Replaced loop** with batch queries
2. **3 parallel IN queries** for the 3 ISIN columns
3. **Combined results** with deduplication
4. **Batch NAV lookup** for all scheme codes at once
5. **Fallback to loop** if batch queries fail (safety)

### Error Handling:
- If batch queries fail, falls back to original loop logic
- Graceful degradation ensures data is always returned

## Expected Performance Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Database Queries | 54 (sequential) | 5 (3 parallel + 2 sequential) | **90% reduction** |
| MF Page Load | 3.2s | < 500ms | **6x faster** |
| Stock Page Load | 4.1s | < 500ms | **8x faster** |
| Dashboard | 105ms | 105ms | No change (already fast) |

## Why This Fix is Different from Before

### Previous Attempt (Failed):
- Tried to query `isin` column directly in `mf_scheme_master`
- Table doesn't have a single `isin` column
- Resulted in "No scheme code mappings found" errors
- NAVs were updated but couldn't be read back

### Current Fix (Proper):
- Queries all 3 ISIN columns (`isin_growth`, `isin_div_payout`, `isin_div_reinvest`)
- Uses parallel queries for speed
- Combines results correctly
- Tested against actual table structure

## Testing Steps

After restarting the server:

1. **Go to MF page**
   - Should load in < 500ms (check terminal)
   - Click "Update NAVs" if NAVs are stale
   - Verify updated NAVs display correctly

2. **Navigate between pages**
   - Dashboard → MF → Stock → Dashboard
   - All should load quickly (< 500ms for API calls)

3. **Check terminal logs**
   - Look for render times in `/api/portfolio/data` calls
   - Should see < 500ms instead of 3-4s

## Verification

To verify the fix is working, check terminal logs for:

**Before:**
```
GET /api/portfolio/data 200 in 3.2s (render: 3.1s)
```

**After:**
```
GET /api/portfolio/data 200 in 450ms (render: 400ms)
```

## Summary

- ✅ Analyzed actual performance bottleneck (54 database queries)
- ✅ Implemented proper batch optimization (5 queries)
- ✅ Maintained data integrity (same results, faster)
- ✅ Added error handling (fallback to loop)
- ✅ Expected 6-8x speed improvement
