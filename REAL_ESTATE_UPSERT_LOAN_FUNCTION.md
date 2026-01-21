# Real Estate Upsert Loan Function

**Status:** ✅ Complete  
**Date:** January 2025

---

## Overview

Function to upsert (insert or update) real estate loans. Automatically determines if loan exists and updates or creates accordingly.

**File:** `src/lib/real-estate/upsert-loan.ts`

---

## Function Signature

```typescript
async function upsertRealEstateLoan(
  supabase: SupabaseClient<Database>,
  assetId: string,
  userId: string,
  loanData: UpsertRealEstateLoanInput
): Promise<RealEstateLoan>
```

---

## Input Interface

```typescript
interface UpsertRealEstateLoanInput {
  lender_name: string;              // Required
  loan_amount: number;               // Required, > 0
  interest_rate?: number | null;     // Optional, 0-100
  emi?: number | null;               // Optional, > 0
  tenure_months?: number | null;    // Optional, > 0
  outstanding_balance?: number | null; // Optional, defaults to loan_amount
}
```

---

## Upsert Logic

### Step 1: Verify Ownership
```typescript
1. Check asset exists and belongs to user
2. If not found → throw error
```

### Step 2: Validate Loan Data
```typescript
1. lender_name: min 2 characters
2. loan_amount: > 0
3. interest_rate: 0-100 (if provided)
4. emi: > 0 (if provided)
5. tenure_months: > 0 (if provided)
6. outstanding_balance: >= 0, <= loan_amount
```

### Step 3: Check if Loan Exists
```typescript
1. Query real_estate_loans for asset_id
2. If found → UPDATE
3. If not found → INSERT
```

### Step 4: Execute Upsert
```typescript
If UPDATE:
  - Update all fields
  - updated_at automatically updated by trigger
  - Return updated loan

If INSERT:
  - Insert new loan
  - Return created loan
```

---

## Usage Example

### Basic Usage

```typescript
import { createClient } from '@/lib/supabase/server';
import { upsertRealEstateLoan } from '@/lib/real-estate/upsert-loan';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

try {
  const loan = await upsertRealEstateLoan(
    supabase,
    assetId,
    user.id,
    {
      lender_name: 'HDFC Bank',
      loan_amount: 5000000,
      interest_rate: 8.5,
      emi: 45000,
      tenure_months: 240,
      outstanding_balance: 4000000,
    }
  );
  
  console.log('Loan upserted:', loan.id);
} catch (error) {
  if (error.message.includes('not found') || error.message.includes('unauthorized')) {
    // Handle 404
  } else if (error.message.includes('must be')) {
    // Handle validation error
  }
}
```

### First Time (INSERT)

```typescript
// Asset has no loan yet
const loan = await upsertRealEstateLoan(supabase, assetId, userId, {
  lender_name: 'SBI',
  loan_amount: 3000000,
  outstanding_balance: 3000000, // Full amount outstanding
});

// Result: New loan created
```

### Update Existing (UPDATE)

```typescript
// Asset already has a loan
const loan = await upsertRealEstateLoan(supabase, assetId, userId, {
  lender_name: 'HDFC Bank',
  loan_amount: 5000000,
  outstanding_balance: 3800000, // Updated balance
});

// Result: Existing loan updated
```

---

## Validation Rules

### Required Fields
- ✅ `lender_name`: Minimum 2 characters
- ✅ `loan_amount`: Must be > 0

### Optional Fields (with validation)
- `interest_rate`: 0-100 (if provided)
- `emi`: > 0 (if provided)
- `tenure_months`: > 0 (if provided)
- `outstanding_balance`: 
  - Defaults to `loan_amount` if not provided
  - Must be >= 0
  - Must be <= loan_amount

---

## Error Handling

### Error Cases

1. **Asset Not Found:**
   ```typescript
   throw new Error('Asset not found or unauthorized')
   ```

2. **Validation Errors:**
   ```typescript
   throw new Error('Lender name is required (minimum 2 characters)')
   throw new Error('Loan amount must be greater than 0')
   throw new Error('Outstanding balance cannot exceed loan amount')
   ```

3. **Database Errors:**
   ```typescript
   throw new Error('Failed to update loan: ...')
   throw new Error('Failed to create loan: ...')
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
// POST /api/real-estate/loans
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json();
  
  const { upsertRealEstateLoan } = await import('@/lib/real-estate/upsert-loan');
  
  try {
    const loan = await upsertRealEstateLoan(
      supabase,
      body.asset_id,
      user.id,
      {
        lender_name: body.lender_name,
        loan_amount: body.loan_amount,
        interest_rate: body.interest_rate,
        emi: body.emi,
        tenure_months: body.tenure_months,
        outstanding_balance: body.outstanding_balance,
      }
    );
    
    return NextResponse.json({
      success: true,
      data: loan,
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

### Example 1: Create New Loan

```typescript
// Asset has no loan
Input: {
  assetId: "asset-123",
  loanData: {
    lender_name: "HDFC Bank",
    loan_amount: 5000000,
    outstanding_balance: 5000000
  }
}

Result: INSERT → New loan created
```

### Example 2: Update Existing Loan

```typescript
// Asset already has loan
Input: {
  assetId: "asset-123",
  loanData: {
    lender_name: "HDFC Bank",
    loan_amount: 5000000,
    outstanding_balance: 3800000  // Updated
  }
}

Result: UPDATE → Existing loan updated
```

### Example 3: Change Lender (Update)

```typescript
// Asset has loan from SBI, updating to HDFC
Input: {
  assetId: "asset-123",
  loanData: {
    lender_name: "HDFC Bank",  // Changed
    loan_amount: 5000000,
    outstanding_balance: 4000000
  }
}

Result: UPDATE → Lender name updated
```

---

## Edge Cases

### 1. Multiple Loans (Shouldn't Happen)

If somehow multiple loans exist for an asset:
- Function takes the first one found
- Updates that loan
- Consider adding validation to prevent multiple loans

### 2. Outstanding Balance > Loan Amount

```typescript
// Validation prevents this
if (outstandingBalance > loanData.loan_amount) {
  throw new Error('Outstanding balance cannot exceed loan amount');
}
```

### 3. Outstanding Balance Not Provided

```typescript
// Defaults to loan_amount
const outstandingBalance = loanData.outstanding_balance ?? loanData.loan_amount;
```

---

## Summary

**Function:** `upsertRealEstateLoan()`

**Features:**
- ✅ Automatic INSERT or UPDATE based on existence
- ✅ Ownership validation (asset must belong to user)
- ✅ Comprehensive validation
- ✅ updated_at automatically tracked
- ✅ Returns created or updated loan
- ✅ Type-safe (uses generated Supabase types)
- ✅ RLS-safe

**Ready for use!** 🚀
