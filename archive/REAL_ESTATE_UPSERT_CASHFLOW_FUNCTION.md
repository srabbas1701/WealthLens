# Real Estate Upsert Cashflow Function

**Status:** ✅ Complete  
**Date:** January 2025

---

## Overview

Function to upsert (insert or update) real estate cashflows. Automatically determines if cashflow exists and updates or creates accordingly, with rental status transition validation.

**File:** `src/lib/real-estate/upsert-cashflow.ts`

---

## Function Signature

```typescript
async function upsertRealEstateCashflow(
  supabase: SupabaseClient<Database>,
  assetId: string,
  userId: string,
  cashflowData: UpsertRealEstateCashflowInput
): Promise<RealEstateCashflow>
```

---

## Input Interface

```typescript
interface UpsertRealEstateCashflowInput {
  rental_status: 'self_occupied' | 'rented' | 'vacant';  // Required
  monthly_rent?: number | null;                          // Required if rented
  rent_start_date?: string | null;                       // Optional
  escalation_percent?: number | null;                    // Optional, 0-100
  maintenance_monthly?: number | null;                   // Optional, >= 0
  property_tax_annual?: number | null;                   // Optional, >= 0
  other_expenses_monthly?: number | null;                // Optional, >= 0
}
```

---

## Upsert Logic

### Step 1: Verify Ownership
```typescript
1. Check asset exists and belongs to user
2. If not found → throw error
```

### Step 2: Validate Rental Status
```typescript
If rental_status === 'rented':
  - monthly_rent must be > 0
  - rent_start_date recommended but not required

If rental_status === 'self_occupied' or 'vacant':
  - monthly_rent should be null or 0
```

### Step 3: Validate Numeric Fields
```typescript
- monthly_rent: >= 0
- escalation_percent: 0-100 (if provided)
- maintenance_monthly: >= 0 (if provided)
- property_tax_annual: >= 0 (if provided)
- other_expenses_monthly: >= 0 (if provided)
```

### Step 4: Check if Cashflow Exists
```typescript
1. Query real_estate_cashflows for asset_id
2. If found → Validate transition → UPDATE
3. If not found → INSERT
```

### Step 5: Validate Status Transition
```typescript
- All transitions are allowed
- Function tracks transition for audit purposes
- Could add business rules here (e.g., require rent_start_date when transitioning to 'rented')
```

### Step 6: Execute Upsert
```typescript
If UPDATE:
  - Update all fields
  - updated_at automatically updated by trigger
  - Return updated cashflow

If INSERT:
  - Insert new cashflow
  - Return created cashflow
```

---

## Rental Status Validation Rules

### Status: 'rented'
```typescript
✅ monthly_rent: Required, must be > 0
✅ rent_start_date: Optional (recommended)
✅ All expense fields: Optional
```

### Status: 'self_occupied' or 'vacant'
```typescript
✅ monthly_rent: Should be null or 0
✅ rent_start_date: Should be null
✅ All expense fields: Optional
```

---

## Rental Status Transitions

### Allowed Transitions

All transitions are currently allowed:

1. **vacant → rented**
   - New tenant moved in
   - Requires monthly_rent > 0

2. **rented → vacant**
   - Tenant left
   - monthly_rent should be set to null or 0

3. **self_occupied → rented**
   - Started renting out
   - Requires monthly_rent > 0

4. **rented → self_occupied**
   - Stopped renting, moved in
   - monthly_rent should be set to null or 0

5. **Any → Any**
   - All transitions are valid
   - Business logic can be added in `validateRentalStatusTransition()`

---

## Usage Example

### Basic Usage

```typescript
import { createClient } from '@/lib/supabase/server';
import { upsertRealEstateCashflow } from '@/lib/real-estate/upsert-cashflow';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

try {
  const cashflow = await upsertRealEstateCashflow(
    supabase,
    assetId,
    user.id,
    {
      rental_status: 'rented',
      monthly_rent: 50000,
      rent_start_date: '2024-01-15',
      maintenance_monthly: 5000,
      property_tax_annual: 30000,
    }
  );
  
  console.log('Cashflow upserted:', cashflow.id);
} catch (error) {
  if (error.message.includes('not found') || error.message.includes('unauthorized')) {
    // Handle 404
  } else if (error.message.includes('required') || error.message.includes('must be')) {
    // Handle validation error
  }
}
```

### First Time (INSERT)

```typescript
// Asset has no cashflow yet
const cashflow = await upsertRealEstateCashflow(supabase, assetId, userId, {
  rental_status: 'rented',
  monthly_rent: 50000,
  rent_start_date: '2024-01-15',
  maintenance_monthly: 5000,
});

// Result: New cashflow created
```

### Update Existing (UPDATE)

```typescript
// Asset already has cashflow
const cashflow = await upsertRealEstateCashflow(supabase, assetId, userId, {
  rental_status: 'rented',
  monthly_rent: 55000,  // Updated rent
  maintenance_monthly: 6000,  // Updated maintenance
});

// Result: Existing cashflow updated
```

### Status Transition Example

```typescript
// Transition from 'rented' to 'vacant'
const cashflow = await upsertRealEstateCashflow(supabase, assetId, userId, {
  rental_status: 'vacant',
  monthly_rent: null,  // Clear rent
  rent_start_date: null,  // Clear start date
  maintenance_monthly: 5000,  // Maintenance still applies
});

// Result: Status transition validated and updated
```

---

## Validation Rules

### Required Fields
- ✅ `rental_status`: Must be one of 'self_occupied', 'rented', 'vacant'

### Conditional Requirements
- ✅ If `rental_status === 'rented'`: `monthly_rent` must be > 0
- ✅ If `rental_status === 'self_occupied'` or `'vacant'`: `monthly_rent` should be null or 0

### Optional Fields (with validation)
- `monthly_rent`: >= 0
- `escalation_percent`: 0-100 (if provided)
- `maintenance_monthly`: >= 0 (if provided)
- `property_tax_annual`: >= 0 (if provided)
- `other_expenses_monthly`: >= 0 (if provided)

---

## Error Handling

### Error Cases

1. **Asset Not Found:**
   ```typescript
   throw new Error('Asset not found or unauthorized')
   ```

2. **Validation Errors:**
   ```typescript
   throw new Error('Monthly rent is required and must be greater than 0 for rented properties')
   throw new Error('Monthly rent should be 0 or null for self-occupied or vacant properties')
   throw new Error('Escalation percent must be between 0 and 100')
   throw new Error('Maintenance monthly cannot be negative')
   ```

3. **Database Errors:**
   ```typescript
   throw new Error('Failed to update cashflow: ...')
   throw new Error('Failed to create cashflow: ...')
   ```

---

## Updated Timestamp

- `updated_at` is automatically updated by database trigger
- No manual timestamp needed
- Trigger fires on both INSERT and UPDATE

---

## Integration Example

### In API Route

```typescript
// POST /api/real-estate/cashflows
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json();
  
  const { upsertRealEstateCashflow } = await import('@/lib/real-estate/upsert-cashflow');
  
  try {
    const cashflow = await upsertRealEstateCashflow(
      supabase,
      body.asset_id,
      user.id,
      {
        rental_status: body.rental_status,
        monthly_rent: body.monthly_rent,
        rent_start_date: body.rent_start_date,
        escalation_percent: body.escalation_percent,
        maintenance_monthly: body.maintenance_monthly,
        property_tax_annual: body.property_tax_annual,
        other_expenses_monthly: body.other_expenses_monthly,
      }
    );
    
    return NextResponse.json({
      success: true,
      data: cashflow,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('not found') ? 404 : 400 }
    );
  }
}
```

---

## Behavior Examples

### Example 1: Create New Cashflow (Rented)

```typescript
// Asset has no cashflow
Input: {
  assetId: "asset-123",
  cashflowData: {
    rental_status: "rented",
    monthly_rent: 50000,
    rent_start_date: "2024-01-15"
  }
}

Result: INSERT → New cashflow created
```

### Example 2: Update Existing Cashflow

```typescript
// Asset already has cashflow
Input: {
  assetId: "asset-123",
  cashflowData: {
    rental_status: "rented",
    monthly_rent: 55000,  // Updated
    maintenance_monthly: 6000  // Updated
  }
}

Result: UPDATE → Existing cashflow updated
```

### Example 3: Status Transition (Rented → Vacant)

```typescript
// Transition from rented to vacant
Input: {
  assetId: "asset-123",
  cashflowData: {
    rental_status: "vacant",  // Changed
    monthly_rent: null,  // Cleared
    rent_start_date: null  // Cleared
  }
}

Result: UPDATE → Status transition validated and updated
```

### Example 4: Status Transition (Vacant → Rented)

```typescript
// Transition from vacant to rented
Input: {
  assetId: "asset-123",
  cashflowData: {
    rental_status: "rented",  // Changed
    monthly_rent: 50000,  // Required
    rent_start_date: "2024-06-01"  // New tenant
  }
}

Result: UPDATE → Status transition validated and updated
```

---

## Edge Cases

### 1. Multiple Cashflows (Shouldn't Happen)

If somehow multiple cashflows exist for an asset:
- Function takes the first one found
- Updates that cashflow
- Consider adding validation to prevent multiple cashflows

### 2. Invalid Rental Status

```typescript
// Validation prevents invalid status
if (rentalStatus === 'rented' && (!monthlyRent || monthlyRent <= 0)) {
  throw new Error('Monthly rent is required and must be greater than 0 for rented properties');
}
```

### 3. Negative Values

```typescript
// All expense fields must be >= 0
if (maintenance_monthly < 0) {
  throw new Error('Maintenance monthly cannot be negative');
}
```

---

## Summary

**Function:** `upsertRealEstateCashflow()`

**Features:**
- ✅ Automatic INSERT or UPDATE based on existence
- ✅ Ownership validation (asset must belong to user)
- ✅ Rental status validation (rented requires monthly_rent > 0)
- ✅ Status transition validation (all transitions allowed, tracked for audit)
- ✅ Comprehensive field validation
- ✅ updated_at automatically tracked
- ✅ Returns created or updated cashflow
- ✅ Type-safe (uses generated Supabase types)
- ✅ RLS-safe

**Ready for use!** 🚀
