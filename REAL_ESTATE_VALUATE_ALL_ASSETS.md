# Valuate All User Assets Function

**Status:** ✅ Complete  
**Date:** January 2025

---

## Function: `valuateAllUserAssets(userId)`

Valuates all assets for a user with controlled processing and failure handling.

**File:** `src/services/realEstateValuation.service.ts`

---

## Function Signature

```typescript
async function valuateAllUserAssets(
  supabase: SupabaseClientType,
  userId: UserId,
  options?: {
    skipRecentDays?: number;  // Skip assets updated in last N days (default: 90)
    concurrency?: number;     // Concurrent valuations (default: 3)
    sequential?: boolean;      // Process one at a time (default: false)
  }
): Promise<{
  total: number;
  processed: number;
  skipped: number;
  successful: number;
  failed: number;
  results: ValuationUpdateResult[];
  errors: Array<{ assetId: string; error: string }>;
}>
```

---

## Steps

### Step 1: Fetch All Assets for User
```typescript
// Fetches all assets belonging to user
const { data: assets } = await supabase
  .from('real_estate_assets')
  .select('id, valuation_last_updated, carpet_area_sqft, builtup_area_sqft, purchase_price')
  .eq('user_id', userId);
```

### Step 2: Filter Assets (Skip Recent Updates)
```typescript
// Skip assets updated in last 90 days (configurable)
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - skipRecentDays);

// Skip if valuation_last_updated > cutoffDate
if (asset.valuation_last_updated && lastUpdated > cutoffDate) {
  skipped.push(asset.id);
  continue;
}
```

### Step 3: Validate Inputs
```typescript
// Skip if missing required inputs
const hasArea = (carpet_area_sqft > 0) || (builtup_area_sqft > 0);
const hasPurchasePrice = purchase_price > 0;

if (!hasArea && !hasPurchasePrice) {
  skipped.push(asset.id);
  errors.push({ assetId, error: 'Missing area AND purchase_price' });
  continue;
}
```

### Step 4: Valuate Assets
```typescript
// Option 1: Sequential (one at a time)
if (sequential) {
  for (const assetId of assetsToProcess) {
    const result = await valuateAsset(supabase, assetId, userId);
    // Log failures but continue
  }
}

// Option 2: Controlled Parallel (batches)
else {
  for (let i = 0; i < assetsToProcess.length; i += concurrency) {
    const batch = assetsToProcess.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(assetId => valuateAsset(supabase, assetId, userId))
    );
    // Log failures but continue
  }
}
```

### Step 5: Return Summary
```typescript
return {
  total: assets.length,
  processed: assetsToProcess.length,
  skipped: skipped.length,
  successful: results.filter(r => r.success).length,
  failed: results.filter(r => !r.success).length,
  results,
  errors,
};
```

---

## Usage Examples

### Basic Usage

```typescript
import { createServerClient } from '@/lib/supabaseClient';
import { valuateAllUserAssets } from '@/services/realEstateValuation.service';

const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();

const summary = await valuateAllUserAssets(supabase, user.id);

console.log('Valuation summary:', {
  total: summary.total,
  processed: summary.processed,
  skipped: summary.skipped,
  successful: summary.successful,
  failed: summary.failed,
});
```

### Sequential Processing

```typescript
// Process one at a time (slower but safer)
const summary = await valuateAllUserAssets(supabase, user.id, {
  sequential: true,
  skipRecentDays: 90,
});
```

### Controlled Parallel Processing

```typescript
// Process 5 assets concurrently
const summary = await valuateAllUserAssets(supabase, user.id, {
  concurrency: 5,
  skipRecentDays: 60, // Skip assets updated in last 60 days
});
```

### Custom Skip Period

```typescript
// Skip assets updated in last 30 days
const summary = await valuateAllUserAssets(supabase, user.id, {
  skipRecentDays: 30,
  concurrency: 3,
});
```

---

## Return Value

```typescript
{
  total: number;              // Total assets for user
  processed: number;          // Assets processed (not skipped)
  skipped: number;            // Assets skipped (recent or missing inputs)
  successful: number;         // Successful valuations
  failed: number;             // Failed valuations
  results: ValuationUpdateResult[];  // Detailed results for each asset
  errors: Array<{             // Errors for failed/skipped assets
    assetId: string;
    error: string;
  }>;
}
```

---

## Failure Handling

### Logs Failures Without Stopping

```typescript
// Each failure is logged but doesn't stop the batch
try {
  const result = await valuateAsset(supabase, assetId, userId);
  if (!result.success) {
    console.error(`Failed to valuate asset ${assetId}:`, result.error);
    errors.push({ assetId, error: result.error });
  }
} catch (error) {
  // Log error but continue
  console.error(`Error valuating asset ${assetId}:`, error);
  errors.push({ assetId, error: error.message });
}
```

### Example Output

```typescript
{
  total: 10,
  processed: 7,
  skipped: 3,
  successful: 5,
  failed: 2,
  results: [
    { success: true, assetId: 'asset-1', newMin: 7650000, newMax: 9975000 },
    { success: true, assetId: 'asset-2', newMin: 5400000, newMax: 6650000 },
    { success: false, assetId: 'asset-3', error: 'Missing area AND purchase_price' },
    // ... more results
  ],
  errors: [
    { assetId: 'asset-3', error: 'Missing area AND purchase_price' },
    { assetId: 'asset-4', error: 'Asset not found or does not belong to user' },
  ]
}
```

---

## Skip Logic

### Assets Skipped If:

1. **Recently Updated:**
   - `valuation_last_updated` is within last 90 days (configurable)
   - Prevents unnecessary re-valuation

2. **Missing Inputs:**
   - Both `carpet_area_sqft` AND `builtup_area_sqft` are missing/null
   - AND `purchase_price` is missing/null
   - Cannot calculate valuation without these

---

## Processing Modes

### Sequential Mode
```typescript
sequential: true
```
- Processes one asset at a time
- Slower but safer
- Lower resource usage
- Better for debugging

### Parallel Mode (Default)
```typescript
sequential: false
concurrency: 3  // Process 3 at a time
```
- Processes multiple assets concurrently
- Faster processing
- Controlled concurrency prevents overwhelming system
- 500ms delay between batches

---

## Example Scenarios

### Scenario 1: All Assets Need Valuation

```typescript
// User has 10 assets, none updated in last 90 days
Input: {
  userId: 'user-123',
  skipRecentDays: 90
}

Output: {
  total: 10,
  processed: 10,
  skipped: 0,
  successful: 8,
  failed: 2,
  results: [...],
  errors: [
    { assetId: 'asset-5', error: 'Missing area AND purchase_price' },
    { assetId: 'asset-8', error: 'Network error' }
  ]
}
```

### Scenario 2: Some Assets Recently Updated

```typescript
// User has 10 assets, 3 updated in last 90 days
Input: {
  userId: 'user-123',
  skipRecentDays: 90
}

Output: {
  total: 10,
  processed: 7,  // 3 skipped (recently updated)
  skipped: 3,
  successful: 7,
  failed: 0,
  results: [...],
  errors: []
}
```

### Scenario 3: Some Assets Missing Inputs

```typescript
// User has 10 assets, 2 missing area and purchase_price
Input: {
  userId: 'user-123',
  skipRecentDays: 90
}

Output: {
  total: 10,
  processed: 8,  // 2 skipped (missing inputs)
  skipped: 2,
  successful: 8,
  failed: 0,
  results: [...],
  errors: [
    { assetId: 'asset-3', error: 'Skipped: Missing area AND purchase_price' },
    { assetId: 'asset-7', error: 'Skipped: Missing area AND purchase_price' }
  ]
}
```

---

## Integration Example

### API Route

```typescript
// POST /api/real-estate/valuation/update-all
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json();

  const summary = await valuateAllUserAssets(supabase, user.id, {
    skipRecentDays: body.skipRecentDays || 90,
    concurrency: body.concurrency || 3,
    sequential: body.sequential || false,
  });

  return NextResponse.json({
    success: true,
    data: summary,
  });
}
```

### Background Job / Cron

```typescript
// Daily cron job
export async function dailyValuationUpdate() {
  const supabase = await createServerClient();
  
  // Get all users (or process per user)
  const { data: users } = await supabase.auth.admin.listUsers();
  
  for (const user of users) {
    const summary = await valuateAllUserAssets(supabase, user.id, {
      skipRecentDays: 90,
      concurrency: 3,
    });
    
    console.log(`User ${user.id}: ${summary.successful}/${summary.processed} successful`);
  }
}
```

---

## Summary

**Function:** `valuateAllUserAssets(userId)`

**Features:**
- ✅ Fetches all assets for user
- ✅ Skips assets updated in last 90 days (configurable)
- ✅ Sequential or controlled parallel processing
- ✅ Logs failures without stopping batch
- ✅ Returns detailed summary with errors
- ✅ Validates inputs before processing
- ✅ Ownership validation for each asset

**Ready for use!** 🚀
