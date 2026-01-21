# Real Estate Get Assets Function

**Status:** ✅ Complete  
**Date:** January 2025

---

## Overview

Function to fetch all real estate assets for a user with ownership-adjusted values and proper joins.

**File:** `src/lib/real-estate/get-assets.ts`

---

## Function Signature

```typescript
async function getUserRealEstateAssets(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OwnershipAdjustedAsset[]>
```

---

## Response Shape

```typescript
interface OwnershipAdjustedAsset {
  asset: RealEstateAsset;
  loan: RealEstateLoan | null;
  cashflow: RealEstateCashflow | null;
  ownershipAdjusted: {
    purchasePrice: number | null;
    currentValue: number | null;
    monthlyRent: number | null;
    outstandingBalance: number | null;
  };
}
```

---

## Features

### 1. LEFT JOIN Loans and Cashflows
- Uses Supabase's nested select syntax
- Returns null if no loan/cashflow exists
- Handles array responses (takes first item if multiple)

### 2. Ownership-Adjusted Values
- **Purchase Price:** `purchase_price × (ownership_percentage / 100)`
- **Current Value:** Valuation × ownership percentage
  - Priority: user_override_value → midpoint → purchase_price
- **Monthly Rent:** `monthly_rent × (ownership_percentage / 100)`
- **Outstanding Balance:** `outstanding_balance × (ownership_percentage / 100)`

### 3. Sorting
- Sorted by `created_at` descending (newest first)

### 4. RLS-Safe
- Uses authenticated Supabase client
- Explicit `user_id` check for defense in depth
- RLS policies ensure user can only see their own assets

---

## Usage Example

### In API Route

```typescript
import { createClient } from '@/lib/supabase/server';
import { getUserRealEstateAssets } from '@/lib/real-estate/get-assets';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const assets = await getUserRealEstateAssets(supabase, user.id);
  
  return NextResponse.json({
    success: true,
    data: assets,
  });
}
```

### Direct Usage

```typescript
import { createClient } from '@/lib/supabase/server';
import { getUserRealEstateAssets } from '@/lib/real-estate/get-assets';

const supabase = await createClient();
const assets = await getUserRealEstateAssets(supabase, userId);

assets.forEach((item) => {
  console.log('Property:', item.asset.property_nickname);
  console.log('Ownership:', item.asset.ownership_percentage, '%');
  console.log('Adjusted Value:', item.ownershipAdjusted.currentValue);
  console.log('Loan:', item.loan?.lender_name || 'No loan');
  console.log('Rental:', item.cashflow?.monthly_rent || 'Not rented');
});
```

---

## Response Example

```json
[
  {
    "asset": {
      "id": "uuid",
      "user_id": "uuid",
      "property_nickname": "2BHK Apartment, Mumbai",
      "property_type": "residential",
      "property_status": "ready",
      "purchase_price": 7000000,
      "purchase_date": "2020-01-15",
      "ownership_percentage": 75,
      "city": "Mumbai",
      "state": "Maharashtra",
      "user_override_value": 8500000,
      "system_estimated_min": 8000000,
      "system_estimated_max": 9000000,
      "created_at": "2025-01-15T10:00:00Z"
    },
    "loan": {
      "id": "uuid",
      "asset_id": "uuid",
      "lender_name": "HDFC Bank",
      "loan_amount": 5000000,
      "outstanding_balance": 4000000,
      "emi": 45000,
      "interest_rate": 8.5,
      "tenure_months": 240
    },
    "cashflow": {
      "id": "uuid",
      "asset_id": "uuid",
      "rental_status": "rented",
      "monthly_rent": 50000,
      "maintenance_monthly": 5000,
      "property_tax_annual": 30000
    },
    "ownershipAdjusted": {
      "purchasePrice": 5250000,
      "currentValue": 6375000,
      "monthlyRent": 37500,
      "outstandingBalance": 3000000
    }
  }
]
```

---

## Ownership Adjustment Logic

### Current Value Calculation

```typescript
// Priority order:
1. user_override_value (if exists)
2. (system_estimated_min + system_estimated_max) / 2 (if both exist)
3. purchase_price (fallback)

// Then apply ownership:
currentValue × (ownership_percentage / 100)
```

### Example Calculation

```
Asset:
  purchase_price: ₹70,00,000
  user_override_value: ₹85,00,000
  ownership_percentage: 75%

Ownership-Adjusted Current Value:
  Base Value: ₹85,00,000 (user override)
  Adjusted: ₹85,00,000 × 0.75 = ₹63,75,000
```

---

## Edge Cases Handled

### 1. No Loan
```typescript
{
  asset: {...},
  loan: null,
  cashflow: {...},
  ownershipAdjusted: {
    outstandingBalance: null
  }
}
```

### 2. No Cashflow
```typescript
{
  asset: {...},
  loan: {...},
  cashflow: null,
  ownershipAdjusted: {
    monthlyRent: null
  }
}
```

### 3. No Valuation Data
```typescript
// Uses purchase_price as fallback
ownershipAdjusted: {
  currentValue: purchase_price × ownership_percentage
}
```

### 4. Ownership Percentage Null
```typescript
// Defaults to 100%
ownership_percentage: null → treated as 100%
```

### 5. Multiple Loans/Cashflows
```typescript
// Takes first item (shouldn't happen in normal flow)
// But handles gracefully if it does
```

---

## Integration

### Used By

- ✅ `GET /api/real-estate/assets` - Main API endpoint
- Can be used by:
  - Analytics calculations
  - Portfolio aggregation
  - Dashboard displays
  - Export functions

### Dependencies

- `@supabase/supabase-js` - Supabase client
- `@/types/supabase` - Generated types
- Database tables: `real_estate_assets`, `real_estate_loans`, `real_estate_cashflows`

---

## Performance

### Query Optimization

- Single query with nested selects (efficient)
- Indexed on `user_id` and `created_at`
- LEFT JOINs (no unnecessary data)

### Expected Performance

- **Small portfolios (< 10 assets):** < 100ms
- **Medium portfolios (10-50 assets):** < 200ms
- **Large portfolios (50+ assets):** < 500ms

---

## Summary

**Function:** `getUserRealEstateAssets()`

**Features:**
- ✅ Fetches all assets for user
- ✅ LEFT JOIN loans and cashflows
- ✅ Returns ownership-adjusted values
- ✅ Sorted by created_at desc
- ✅ Response shape: { asset, loan, cashflow }
- ✅ RLS-safe and ownership-aware
- ✅ Type-safe (uses generated Supabase types)

**Ready for use!** 🚀
