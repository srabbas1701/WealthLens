# Analysis: Why Highlighted Stocks Are Not Showing Up

## Problem Summary
The user uploaded a CSV file with stock holdings. Some stocks (highlighted in yellow in the spreadsheet) are not appearing on the stock holdings page, while others (like TMCV, TMPV, TATAPOWER, etc.) are showing up correctly.

**Highlighted Stocks (NOT showing):**
- ADANIPORTS, ASHOKLEY, COCHINSHIP, EXIDEIND, HAL, HGINFRA, INFY, JIOFIN, SAIL, SBIN, URBANCO

**Stocks That ARE Showing:**
- TMCV, TMPV, TATAPOWER, HDFCBANK, IDFCFIRSTB, TATASTEEL, SUZLON, ETERNAL

## CSV Structure
Based on the image, the CSV has these columns:
- **Symbol** (Column A)
- **ISIN** (Column B)  
- **Sector** (Column C) - Values like "LOGISTICS", "AUTO ANCILLARY", "ETF", etc.
- **Quantity** (Column D)
- **Average Price** (Column E)

## Potential Issues Identified

### Issue #1: Column Name Detection Ambiguity ⚠️ CRITICAL
**Location:** `src/app/api/portfolio/upload/route.ts` lines 270-310

**Problem:**
- The "Symbol" column appears in BOTH `NAME_VARIATIONS` and `SYMBOL_VARIATIONS` lists
- The detection logic processes columns sequentially and matches the FIRST variation list that matches
- Since "Symbol" matches `NAME_VARIATIONS` first (line 271), it gets assigned to `columnMap.name`
- This means `columnMap.symbol` remains null (line 305-307 never executes because name is already set)
- However, both columns might be set correctly if the code continues processing...

**Actually, looking more closely:** The code continues processing ALL columns, so "Symbol" could match both name AND symbol. But there's a guard `if (map.symbol === null && ...)` so if symbol column doesn't exist separately, this is fine.

**Impact:** LOW - This shouldn't cause stocks to be skipped, but could affect asset type detection.

---

### Issue #2: Asset Type Detection - Sector Column Mismatch ⚠️ HIGH PROBABILITY
**Location:** `src/app/api/portfolio/upload/route.ts` lines 402-446

**Problem:**
- The CSV has a "Sector" column with values like "LOGISTICS", "AUTO ANCILLARY", "ENGINEERING &", etc.
- The detection code only matches VERY EXPLICIT values:
  - `sectorValue === 'etf'` → ETF
  - `sectorValue === 'mutual fund' || 'mf' || 'mutualfund' || 'mutual'` → Mutual Fund
  - `sectorValue === 'stock' || 'stocks'` → Equity
  - `sectorValue.includes('equity') && sectorValue.includes('stock')` → Equity
- Values like "LOGISTICS", "AUTO ANCILLARY" do NOT match any of these patterns
- So `sectorSignal` remains 'ambiguous' for these stocks

**Impact:** MEDIUM - This shouldn't cause stocks to be skipped, as ISIN signal should still work (INE prefix → equity)

---

### Issue #3: Asset Type Detection - ISIN Signal Should Work ✅
**Location:** `src/app/api/portfolio/upload/route.ts` lines 448-471

**Analysis:**
- All highlighted stocks have ISINs starting with "INE" (e.g., INE742F01042)
- The `classifyByISIN` function correctly identifies INE prefix as 'equity' with 95% confidence
- This should provide a strong signal for asset type detection

**Impact:** NONE - ISIN detection should work correctly

---

### Issue #4: Name Column Detection Issue ⚠️ CRITICAL
**Location:** `src/app/api/portfolio/upload/route.ts` lines 820-823

**Problem:**
- If "Symbol" column is matched to `NAME_VARIATIONS`, then `columnMap.name` points to the Symbol column
- The code extracts: `const name = columnMap.name !== null ? String(row[columnMap.name] || '').trim() : '';`
- For stocks like "ADANIPORTS", this would extract the symbol correctly
- However, there's a validation check: `if (!name && !symbol && !isin)` → mark as invalid

**Wait, let me re-check:** If Symbol column is used for name, then `name` will have a value. If Symbol column also matches SYMBOL_VARIATIONS (but it won't because name was set first), then symbol might be undefined.

**Actually, the real issue:** The code processes ALL headers sequentially. If "Symbol" matches NAME_VARIATIONS, it sets `map.name`. Then when it processes the same column again for SYMBOL_VARIATIONS, it won't match because `map.name !== null` is not the condition - the condition is `map.symbol === null`. So it SHOULD still set symbol.

**Impact:** UNKNOWN - Need to verify if name extraction is working correctly

---

### Issue #5: Validation Failure - Missing or Invalid Data ⚠️ HIGH PROBABILITY
**Location:** `src/app/api/portfolio/upload/route.ts` lines 829-873

**Possible causes for validation failure:**

1. **Missing Name/Symbol/ISIN:** 
   - Check: `if (!name && !symbol && !isin)` → marks as invalid
   - If name extraction fails or is empty, this could fail

2. **Invalid Quantity:**
   - Check: `if (quantity === null || quantity <= 0)` → marks as invalid
   - If quantity parsing fails or is 0, this could fail

3. **Missing/Invalid Price:**
   - Check: `if (computedInvestedValue <= 0 && isValid)` → marks as invalid
   - If average price parsing fails or both totalInvested and averagePrice are missing, this could fail

**Most Likely:** The "Average Price" column should match `AVERAGE_PRICE_VARIATIONS`, but if parsing fails or value is 0, the stock would be marked invalid.

---

### Issue #6: Asset Type vs Display Label Mismatch ✅ NOT AN ISSUE
**Location:** 
- Database: `src/app/api/portfolio/upload/confirm/route.ts` stores `asset_type = 'equity'`
- API Transform: `src/app/api/portfolio/data/route.ts` line 621 transforms `'equity'` → `'Stocks'`
- Frontend Filter: `src/app/portfolio/equity/page.tsx` line 88 filters for `'Equity' || 'Stocks'`

**Analysis:**
- Database stores: `'equity'` (lowercase)
- API transforms to: `'Stocks'` (via ASSET_TYPE_LABELS)
- Frontend filters for: `'Equity' || 'Stocks'`
- So `'Stocks'` should match the filter ✓

**Impact:** NONE - The transformation chain is correct

---

## Recommended Investigation Steps

1. **Check Upload Preview Logs**
   - Look at browser console or server logs during upload
   - Check if the highlighted stocks appear in the preview with `isValid: false`
   - Check the `validationNote` field for each stock

2. **Verify Column Detection**
   - Check server logs for: `[Upload] Detected columns:` 
   - Verify that "Symbol", "ISIN", "Quantity", "Average Price" are all detected correctly
   - Verify which column is matched to `name` vs `symbol`

3. **Check Asset Type Detection**
   - Check server logs for: `[Upload] Row X: "STOCK_NAME" → equity (confidence %)`
   - Verify that highlighted stocks are detected as 'equity' with sufficient confidence (>=70%)

4. **Verify Data Parsing**
   - Check if quantity values are parsed correctly (should be numbers like 199, 200, etc.)
   - Check if average price values are parsed correctly (should be numbers like 1425.6568, etc.)
   - Check if computed invested_value is > 0

5. **Check Database Records**
   - Query the database to see if these stocks were actually saved
   - Check if they have the correct `asset_type = 'equity'`
   - Check if they're linked to holdings correctly

## Most Likely Root Cause

Based on the analysis, the most likely issues are:

1. **Data Validation Failure** - The stocks are being marked as invalid during parsing/validation, likely due to:
   - Quantity parsing failure (though values look valid in the image)
   - Average price parsing failure (though values look valid)
   - Missing name extraction (if Symbol column isn't being used correctly)

2. **Asset Type Detection Failure** - Less likely, but possible if:
   - ISIN is not being extracted correctly
   - Confidence score is below 70% (unlikely for stocks with INE ISINs)

3. **Column Detection Issue** - Possible if:
   - "Symbol" column is not being matched to NAME_VARIATIONS
   - "Average Price" column is not being matched to AVERAGE_PRICE_VARIATIONS

## Next Steps

Before making any changes, I recommend:
1. **Check the upload preview page** - Do the highlighted stocks appear with validation errors?
2. **Check server logs** - What do the detection/parsing logs show for these specific stocks?
3. **Check database** - Are these stocks actually saved in the database?

This analysis should help identify the exact issue before making code changes.
