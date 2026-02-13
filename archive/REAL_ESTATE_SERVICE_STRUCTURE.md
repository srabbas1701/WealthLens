# Real Estate Service Structure

**Status:** ✅ Complete  
**Date:** January 2025

---

## File Structure

```
src/
  lib/
    supabaseClient.ts          # Unified Supabase client exports
  services/
    realEstate.service.ts      # Real Estate service layer
  types/
    supabase.ts               # Generated Supabase types
```

---

## Files Created

### 1. `src/lib/supabaseClient.ts`

**Purpose:** Unified exports for Supabase clients

**Exports:**
```typescript
// Browser client (Client Components)
export { createClient as createBrowserClient } from './supabase/client';

// Server client (Server Components, API routes, Server Actions)
export { createClient as createServerClient, createAdminClient } from './supabase/server';

// Database type
export type { Database } from '@/types/supabase';
```

**Usage:**
```typescript
// In Client Components
import { createBrowserClient } from '@/lib/supabaseClient';
const supabase = createBrowserClient();

// In Server Components / API Routes
import { createServerClient } from '@/lib/supabaseClient';
const supabase = await createServerClient();

// Type imports
import type { Database } from '@/lib/supabaseClient';
```

---

### 2. `src/services/realEstate.service.ts`

**Purpose:** Service layer for Real Estate operations

**Features:**
- ✅ Class-based service (`RealEstateService`)
- ✅ Convenience function (`createRealEstateService`)
- ✅ Direct function exports (backward compatibility)
- ✅ Type exports for all interfaces

**Usage Examples:**

#### Using the Service Class

```typescript
import { createServerClient } from '@/lib/supabaseClient';
import { createRealEstateService } from '@/services/realEstate.service';

// In API route
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();

const service = createRealEstateService(supabase, user.id);

// Get all assets
const assets = await service.getAllAssets();

// Get single asset
const asset = await service.getAssetById(assetId);

// Create asset
const result = await service.createAsset({
  property_nickname: '2BHK Apartment',
  property_type: 'residential',
  property_status: 'ready',
  // ... other fields
});

// Update asset
const updated = await service.updateAsset(assetId, {
  property_nickname: 'Updated Name',
  user_override_value: 9200000,
});

// Upsert loan
const loan = await service.upsertLoan(assetId, {
  lender_name: 'HDFC Bank',
  loan_amount: 5000000,
  outstanding_balance: 4000000,
});

// Upsert cashflow
const cashflow = await service.upsertCashflow(assetId, {
  rental_status: 'rented',
  monthly_rent: 50000,
});
```

#### Using Direct Functions (Backward Compatible)

```typescript
import { createServerClient } from '@/lib/supabaseClient';
import { getUserRealEstateAssets, createRealEstateAsset } from '@/services/realEstate.service';

const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();

// Direct function calls
const assets = await getUserRealEstateAssets(supabase, user.id);
const result = await createRealEstateAsset(supabase, {
  user_id: user.id,
  // ... asset data
});
```

---

## Type Exports

All types are re-exported from the service:

```typescript
import type {
  OwnershipAdjustedAsset,
  CreateRealEstateAssetInput,
  CreateRealEstateAssetResult,
  UpdateRealEstateAssetInput,
  UpsertRealEstateLoanInput,
  UpsertRealEstateCashflowInput,
} from '@/services/realEstate.service';
```

---

## Migration Guide

### Before (Direct Function Calls)

```typescript
// Old way
import { getUserRealEstateAssets } from '@/lib/real-estate/get-assets';
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const assets = await getUserRealEstateAssets(supabase, user.id);
```

### After (Service Layer)

```typescript
// New way (recommended)
import { createServerClient } from '@/lib/supabaseClient';
import { createRealEstateService } from '@/services/realEstate.service';

const supabase = await createServerClient();
const service = createRealEstateService(supabase, user.id);
const assets = await service.getAllAssets();
```

### After (Direct Functions - Still Supported)

```typescript
// Still works (backward compatible)
import { createServerClient } from '@/lib/supabaseClient';
import { getUserRealEstateAssets } from '@/services/realEstate.service';

const supabase = await createServerClient();
const assets = await getUserRealEstateAssets(supabase, user.id);
```

---

## Benefits

### 1. Cleaner API
- Service class provides a consistent interface
- Methods are organized and easy to discover
- No need to remember individual function names

### 2. Type Safety
- All types exported from one place
- Consistent typing across the application
- Better IDE autocomplete

### 3. Centralized Client Management
- Single source of truth for Supabase clients
- Consistent client creation across the app
- Easier to update client configuration

### 4. Backward Compatibility
- Direct function exports still available
- No breaking changes to existing code
- Gradual migration possible

---

## API Reference

### RealEstateService Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAllAssets()` | Get all assets for user | `Promise<OwnershipAdjustedAsset[]>` |
| `getAssetById(assetId)` | Get single asset | `Promise<OwnershipAdjustedAsset>` |
| `createAsset(input)` | Create new asset | `Promise<CreateRealEstateAssetResult>` |
| `updateAsset(assetId, updates)` | Update asset | `Promise<RealEstateAsset>` |
| `upsertLoan(assetId, loanData)` | Upsert loan | `Promise<RealEstateLoan>` |
| `upsertCashflow(assetId, cashflowData)` | Upsert cashflow | `Promise<RealEstateCashflow>` |

---

## Summary

**Files Created:**
- ✅ `src/lib/supabaseClient.ts` - Unified client exports
- ✅ `src/services/realEstate.service.ts` - Service layer

**Features:**
- ✅ Service class for clean API
- ✅ Direct function exports for backward compatibility
- ✅ Type exports for all interfaces
- ✅ Consistent client management

**Ready for use!** 🚀
