# Real Estate Implementation Guide

**Status:** Ready for Implementation  
**Date:** January 2025

---

## ✅ Context Confirmed

- ✅ Database schema exists and **MUST NOT be modified**
- ✅ Supabase types generated at `src/types/supabase.ts`
- ✅ Auth already implemented via Supabase
- ✅ RLS policies already in place
- ✅ All queries must be RLS-safe and user-scoped

---

## 📋 Available Tables & Types

### Tables (Already Created)
1. `real_estate_assets` ✅
2. `real_estate_loans` ✅
3. `real_estate_cashflows` ✅
4. `real_estate_change_history` ✅ (optional, for audit trail)

### Type Imports

```typescript
import type { Database } from '@/types/supabase';

// Table types
type RealEstateAsset = Database['public']['Tables']['real_estate_assets']['Row'];
type RealEstateAssetInsert = Database['public']['Tables']['real_estate_assets']['Insert'];
type RealEstateAssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];

type RealEstateLoan = Database['public']['Tables']['real_estate_loans']['Row'];
type RealEstateLoanInsert = Database['public']['Tables']['real_estate_loans']['Insert'];
type RealEstateLoanUpdate = Database['public']['Tables']['real_estate_loans']['Update'];

type RealEstateCashflow = Database['public']['Tables']['real_estate_cashflows']['Row'];
type RealEstateCashflowInsert = Database['public']['Tables']['real_estate_cashflows']['Insert'];
type RealEstateCashflowUpdate = Database['public']['Tables']['real_estate_cashflows']['Update'];

// Enum types
type PropertyType = Database['public']['Enums']['property_type_enum'];
type PropertyStatus = Database['public']['Enums']['property_status_enum'];
type RentalStatus = Database['public']['Enums']['rental_status_enum'];
```

---

## 🔐 RLS-Safe Query Patterns

### Pattern 1: User-Scoped Queries (Recommended)

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

// ✅ CORRECT: Use createClient() - respects RLS automatically
export async function getUserRealEstateAssets(userId: string) {
  const supabase = await createClient();
  
  // RLS automatically filters to user's assets
  const { data, error } = await supabase
    .from('real_estate_assets')
    .select('*')
    .eq('user_id', userId); // Explicit user_id check (defense in depth)
  
  if (error) throw error;
  return data;
}
```

### Pattern 2: Verify Ownership Before Updates

```typescript
// ✅ CORRECT: Verify asset belongs to user before updating
export async function updateAsset(assetId: string, userId: string, updates: RealEstateAssetUpdate) {
  const supabase = await createClient();
  
  // First, verify ownership
  const { data: asset, error: fetchError } = await supabase
    .from('real_estate_assets')
    .select('id, user_id')
    .eq('id', assetId)
    .eq('user_id', userId) // RLS + explicit check
    .single();
  
  if (fetchError || !asset) {
    throw new Error('Asset not found or unauthorized');
  }
  
  // Then update (RLS ensures user can only update their own)
  const { data, error } = await supabase
    .from('real_estate_assets')
    .update(updates)
    .eq('id', assetId)
    .eq('user_id', userId) // Defense in depth
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Pattern 3: Related Table Queries (Loans/Cashflows)

```typescript
// ✅ CORRECT: Join with assets to ensure RLS applies
export async function getAssetWithLoan(assetId: string, userId: string) {
  const supabase = await createClient();
  
  // RLS on assets ensures user can only see their assets
  // RLS on loans ensures user can only see loans for their assets
  const { data, error } = await supabase
    .from('real_estate_assets')
    .select(`
      *,
      real_estate_loans (*),
      real_estate_cashflows (*)
    `)
    .eq('id', assetId)
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data;
}
```

### Pattern 4: Admin Operations (Background Jobs Only)

```typescript
import { createAdminClient } from '@/lib/supabase/server';

// ⚠️ WARNING: Only use for background jobs, never for user-facing operations
export async function updateSystemValuations() {
  const supabase = createAdminClient(); // Bypasses RLS
  
  // Get all assets without user override
  const { data: assets } = await supabase
    .from('real_estate_assets')
    .select('id, city, pincode, property_type')
    .is('user_override_value', null);
  
  // Update system estimates (respects user override rule)
  for (const asset of assets || []) {
    // ... fetch valuation ...
    await supabase
      .from('real_estate_assets')
      .update({
        system_estimated_min: newMin,
        system_estimated_max: newMax,
        valuation_last_updated: new Date().toISOString(),
      })
      .eq('id', asset.id);
  }
}
```

---

## 🚫 Common Mistakes to Avoid

### ❌ DON'T: Use Admin Client for User Operations

```typescript
// ❌ WRONG: Admin client bypasses RLS
export async function getUserAssets(userId: string) {
  const supabase = createAdminClient(); // ❌ Bypasses RLS!
  // This would return ALL users' assets, not just this user's
}
```

### ❌ DON'T: Skip User ID Verification

```typescript
// ❌ WRONG: No user_id check
export async function updateAsset(assetId: string, updates: any) {
  const supabase = await createClient();
  // ❌ Missing user_id check - relies only on RLS
  // Always add explicit checks for defense in depth
}
```

### ❌ DON'T: Modify Schema

```typescript
// ❌ WRONG: Never modify existing tables
// Schema is fixed - work with what exists
```

---

## 📝 API Route Template

### Example: GET Assets

```typescript
// src/app/api/real-estate/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user's assets (RLS ensures only their assets)
    const { data: assets, error } = await supabase
      .from('real_estate_assets')
      .select(`
        *,
        real_estate_loans (*),
        real_estate_cashflows (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[Real Estate API] Error fetching assets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: assets,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Example: POST Create Asset

```typescript
// src/app/api/real-estate/assets/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.property_nickname || !body.property_type || !body.property_status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create asset (RLS ensures user_id matches auth.uid())
    const assetInsert: Database['public']['Tables']['real_estate_assets']['Insert'] = {
      user_id: user.id, // Must match authenticated user
      property_nickname: body.property_nickname,
      property_type: body.property_type,
      property_status: body.property_status,
      purchase_price: body.purchase_price,
      purchase_date: body.purchase_date,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      // ... other fields
    };
    
    const { data: asset, error } = await supabase
      .from('real_estate_assets')
      .insert(assetInsert)
      .select()
      .single();
    
    if (error) {
      console.error('[Real Estate API] Error creating asset:', error);
      return NextResponse.json(
        { error: 'Failed to create asset' },
        { status: 500 }
      );
    }
    
    // Create loan if provided
    if (body.loan) {
      const loanInsert: Database['public']['Tables']['real_estate_loans']['Insert'] = {
        asset_id: asset.id,
        lender_name: body.loan.lender_name,
        loan_amount: body.loan.loan_amount,
        interest_rate: body.loan.interest_rate,
        emi: body.loan.emi,
        tenure_months: body.loan.tenure_months,
        outstanding_balance: body.loan.outstanding_balance,
      };
      
      await supabase
        .from('real_estate_loans')
        .insert(loanInsert);
    }
    
    // Create cashflow if provided
    if (body.cashflow) {
      const cashflowInsert: Database['public']['Tables']['real_estate_cashflows']['Insert'] = {
        asset_id: asset.id,
        rental_status: body.cashflow.rental_status,
        monthly_rent: body.cashflow.monthly_rent,
        // ... other fields
      };
      
      await supabase
        .from('real_estate_cashflows')
        .insert(cashflowInsert);
    }
    
    return NextResponse.json({
      success: true,
      data: asset,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🔍 Type Safety Checklist

### ✅ Always Use Generated Types

```typescript
// ✅ CORRECT: Use generated types
import type { Database } from '@/types/supabase';

type Asset = Database['public']['Tables']['real_estate_assets']['Row'];
type AssetInsert = Database['public']['Tables']['real_estate_assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];
```

### ✅ Use Enum Types

```typescript
// ✅ CORRECT: Use generated enum types
import type { Database } from '@/types/supabase';

type PropertyType = Database['public']['Enums']['property_type_enum'];
// 'residential' | 'commercial' | 'land'

type PropertyStatus = Database['public']['Enums']['property_status_enum'];
// 'ready' | 'under_construction'

type RentalStatus = Database['public']['Enums']['rental_status_enum'];
// 'self_occupied' | 'rented' | 'vacant'
```

---

## 📚 Implementation Checklist

### Backend (API Routes)
- [ ] Use `createClient()` from `@/lib/supabase/server`
- [ ] Always verify `auth.getUser()` before operations
- [ ] Use generated types from `@/types/supabase`
- [ ] Add explicit `user_id` checks (defense in depth)
- [ ] Handle RLS errors gracefully
- [ ] Never use `createAdminClient()` for user operations

### Frontend (Components)
- [ ] Use Supabase client for client-side queries
- [ ] Handle auth state properly
- [ ] Show loading/error states
- [ ] Validate inputs before API calls

### Testing
- [ ] Test RLS policies (user can only see own data)
- [ ] Test unauthorized access (should fail)
- [ ] Test type safety (TypeScript should catch errors)
- [ ] Test enum values (only valid enums accepted)

---

## 🎯 Key Principles

1. **RLS First:** Always use `createClient()` for user operations
2. **Type Safety:** Always use generated types from `supabase.ts`
3. **Defense in Depth:** Add explicit `user_id` checks even with RLS
4. **No Schema Changes:** Work with existing schema only
5. **Admin Client:** Only for background jobs, never user-facing

---

## 📖 Related Documents

- **Schema:** Existing tables (no modifications)
- **Types:** `src/types/supabase.ts` (generated)
- **Auth:** Supabase Auth (already implemented)
- **RLS:** Policies already in place
- **Design Docs:**
  - `REAL_ESTATE_ANALYTICS_DESIGN.md`
  - `REAL_ESTATE_VALUATION_SERVICE_DESIGN.md`
  - `REAL_ESTATE_INSIGHTS_ENGINE_DESIGN.md`
  - `REAL_ESTATE_ONBOARDING_IMPLEMENTATION.md`
  - `REAL_ESTATE_EDIT_MAINTENANCE_DESIGN.md`

---

**Ready to implement with full type safety and RLS compliance!** 🚀
