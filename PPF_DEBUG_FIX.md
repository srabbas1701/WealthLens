# PPF Debugging Fix

**Date:** February 3, 2026  
**Status:** ✅ Fixed

---

## Issues Reported

1. **PPF gave error with random account details but did not show specific error detail**
2. **When details were corrected, PPF still did not allow saving**

---

## Root Cause

### 1. `asset_class` Constraint Mismatch (Primary Cause)

Migration `006_add_asset_classification_fields.sql` changed the `assets.asset_class` check constraint from lowercase values (`'debt'`, `'equity'`, etc.) to capitalized values (`'FixedIncome'`, `'Equity'`, etc.):

```sql
-- Old (schema.sql): asset_class in ('equity', 'debt', 'gold', 'cash', 'hybrid')
-- New (migration 006): asset_class in ('Equity', 'FixedIncome', 'Hybrid', 'Commodity', ...)
```

The PPF API was still inserting `asset_class: 'debt'`, which violated the new constraint and caused asset creation to fail with a database error. The API returned a generic "Failed to create PPF asset" message without surfacing the actual Supabase error.

### 2. Generic Error Messages

When asset creation or holding insert failed, the API returned generic messages instead of the actual Supabase error (e.g., constraint violation details), making debugging difficult.

### 3. Frontend Error Handling

The modal showed "Something went wrong" as the primary message and did not handle non-JSON responses gracefully.

---

## Fixes Applied

### 1. PPF API (`src/app/api/ppf/holdings/route.ts`)

- **Changed `asset_class`** from `'debt'` to `'FixedIncome'` to match migration 006 constraint
- **Propagate specific errors** from Supabase (assetError.message, insertError.message) to the client
- **Added try-catch** around JSON.parse in duplicate-check logic to avoid unhandled exceptions on malformed notes

### 2. EPF API (`src/app/api/epf/holdings/route.ts`)

- Same `asset_class: 'FixedIncome'` fix for consistency
- Same error propagation improvements

### 3. NPS API (`src/app/api/nps/holdings/route.ts`)

- Changed `asset_class` from `'debt'` to `'FixedIncome'`

### 4. Fixed Deposits API (`src/app/api/fixed-deposits/route.ts`)

- Changed `asset_class` from `'debt'` to `'FixedIncome'`

### 5. PPFAddModal (`src/components/PPFAddModal.tsx`)

- **Robust JSON parsing** – wrap `response.json()` in try-catch for non-JSON responses
- **Improved error display** – show specific API error messages prominently
- **Better catch block** – surface actual error message instead of generic "Something went wrong"

---

## Verification

1. **Add PPF Account** – Fill in account details (valid or test data) and click "Save PPF Account"
2. **Expected:** Account saves successfully, or a specific error message is shown (e.g., duplicate account, validation error)
3. **No more:** Generic "Failed to create PPF asset" or "Something went wrong" without details

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/ppf/holdings/route.ts` | asset_class fix, error propagation, JSON parse safety |
| `src/app/api/epf/holdings/route.ts` | asset_class fix, error propagation |
| `src/app/api/nps/holdings/route.ts` | asset_class fix |
| `src/app/api/fixed-deposits/route.ts` | asset_class fix |
| `src/components/PPFAddModal.tsx` | Error handling, JSON parse safety, error display |
