# Real Estate Valuation Function

**Status:** ✅ Complete  
**Date:** January 2025

---

## Function: `valuateRealEstateAsset(assetId)`

Main function to valuate a single real estate asset.

**File:** `src/services/realEstateValuation.service.ts`

---

## Function Signature

```typescript
async function valuateRealEstateAsset(
  supabase: SupabaseClientType,
  assetId: AssetId
): Promise<ValuationUpdateResult>
```

---

## Steps

### Step 1: Fetch Asset by ID
```typescript
// Validates ownership (asset must belong to authenticated user)
const { data: asset } = await supabase
  .from('real_estate_assets')
  .select('*')
  .eq('id', assetId)
  .eq('user_id', user.id) // Ownership validation
  .single();
```

### Step 2: Compute Valuation Range
```typescript
// Calculates min/max valuation range
const valuation = await calculateValuation(asset);
// Returns: { systemEstimatedMin, systemEstimatedMax, confidence, source }
```

### Step 3: Update DB with system_estimated_min/max
```typescript
// Updates ONLY these fields:
.update({
  system_estimated_min: valuation.systemEstimatedMin, // Numeric (₹)
  system_estimated_max: valuation.systemEstimatedMax, // Numeric (₹)
  valuation_last_updated: valuation.lastUpdated,
})
```

### Step 4: Return Valuation Result
```typescript
// Returns update result with previous and new values
return {
  success: true,
  assetId,
  previousMin,
  previousMax,
  newMin,
  newMax,
};
```

---

## Usage Example

```typescript
import { createServerClient } from '@/lib/supabaseClient';
import { valuateRealEstateAsset } from '@/services/realEstateValuation.service';

const supabase = await createServerClient();
const result = await valuateRealEstateAsset(supabase, assetId);

if (result.success) {
  console.log('Valuation updated:', {
    min: result.newMin,  // ₹7,650,000
    max: result.newMax,  // ₹9,975,000
  });
} else {
  console.error('Valuation failed:', result.error);
}
```

---

## Validation Rules

### ✅ Ownership Check
- Asset must belong to authenticated user
- Throws error if asset not found or unauthorized

### ✅ Input Validation
- Requires: `area` (carpet_area_sqft OR builtup_area_sqft) OR `purchase_price`
- Throws error if both missing

### ✅ Field Protection
- Updates ONLY: `system_estimated_min`, `system_estimated_max`, `valuation_last_updated`
- NEVER touches `user_override_value`

### ✅ Numeric Values
- Values stored as `number` (not strings)
- No currency symbols in database

---

## Return Value

```typescript
interface ValuationUpdateResult {
  success: boolean;
  assetId: string;
  previousMin: number | null;  // Previous system_estimated_min
  previousMax: number | null;  // Previous system_estimated_max
  newMin: number | null;      // New system_estimated_min (numeric ₹)
  newMax: number | null;      // New system_estimated_max (numeric ₹)
  error?: string;             // Error message if failed
}
```

---

## Error Cases

### 1. Unauthorized
```typescript
{
  success: false,
  error: 'Unauthorized: User not authenticated'
}
```

### 2. Asset Not Found
```typescript
{
  success: false,
  error: 'Asset not found or does not belong to user'
}
```

### 3. Missing Inputs
```typescript
{
  success: false,
  error: 'Cannot calculate valuation: Missing area AND purchase_price'
}
```

---

## Example Flow

```typescript
// Input
assetId: "123e4567-e89b-12d3-a456-426614174000"

// Step 1: Fetch asset
asset: {
  id: "123e4567...",
  user_id: "user-123",
  property_type: "residential",
  city: "Mumbai",
  carpet_area_sqft: 1000,
  purchase_price: 10000000
}

// Step 2: Compute valuation
valuation: {
  systemEstimatedMin: 7650000,
  systemEstimatedMax: 9975000,
  confidence: "high",
  source: "locality_data"
}

// Step 3: Update DB
UPDATE real_estate_assets SET
  system_estimated_min = 7650000,
  system_estimated_max = 9975000,
  valuation_last_updated = '2025-01-15T10:30:00Z'
WHERE id = '123e4567...' AND user_id = 'user-123'

// Step 4: Return result
{
  success: true,
  assetId: "123e4567...",
  previousMin: 8000000,
  previousMax: 10000000,
  newMin: 7650000,
  newMax: 9975000
}
```

---

## Summary

**Function:** `valuateRealEstateAsset(assetId)`

**Steps:**
1. ✅ Fetch asset by ID (with ownership validation)
2. ✅ Compute valuation range (min/max)
3. ✅ Update DB (system_estimated_min/max only)
4. ✅ Return valuation result

**Safety:**
- ✅ Ownership validation
- ✅ Input validation
- ✅ Field protection
- ✅ Numeric values only

**Ready for use!** 🚀
