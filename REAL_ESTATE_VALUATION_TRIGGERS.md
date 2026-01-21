# Real Estate Valuation Triggers

**Status:** ✅ Complete  
**Date:** January 2025

---

## Overview

Valuation is triggered automatically in three scenarios:
1. **After asset creation** (async, non-blocking)
2. **After location or area update** (async, non-blocking)
3. **Via scheduled job** (quarterly)

**Key Principle:** Valuation never blocks the user flow. All triggers are asynchronous and non-blocking.

---

## Trigger 1: After Asset Creation

### Implementation

**File:** `src/app/api/real-estate/assets/route.ts`

After successful asset creation, valuation is triggered asynchronously:

```typescript
// Asset created successfully
if (result.data?.id) {
  const { triggerValuationAsync } = await import('@/lib/real-estate/trigger-valuation');
  triggerValuationAsync(supabase, result.data.id).catch((error) => {
    // Log error but don't fail the request
    console.error('[Real Estate API] Error triggering valuation:', error);
  });
}
```

### Behavior

- ✅ **Non-blocking**: Returns immediately, doesn't wait for valuation
- ✅ **Fire and forget**: Valuation runs in background
- ✅ **Error handling**: Logs errors but doesn't fail asset creation
- ✅ **User experience**: Asset creation completes instantly

### Flow

```
User creates asset
  ↓
Asset saved to DB
  ↓
API returns success (immediate)
  ↓
[Background] Valuation triggered
  ↓
[Background] Valuation updates system_estimated_min/max
```

---

## Trigger 2: After Location or Area Update

### Implementation

**File:** `src/app/api/real-estate/assets/[id]/route.ts`

When location or area fields are updated, valuation is triggered:

```typescript
const updates = {
  property_nickname: body.property_nickname,
  address: body.address,
  carpet_area_sqft: body.carpet_area_sqft,
  builtup_area_sqft: body.builtup_area_sqft,
  // ... other fields
};

const updatedAsset = await updateRealEstateAsset(supabase, assetId, user.id, updates);

// Trigger valuation if location/area changed
const { shouldTriggerValuation, triggerValuationAsync } = await import('@/lib/real-estate/trigger-valuation');
if (shouldTriggerValuation(updates)) {
  triggerValuationAsync(supabase, assetId).catch((error) => {
    console.error('[Real Estate API] Error triggering valuation:', error);
  });
}
```

### Fields That Trigger Valuation

- `city`
- `state`
- `pincode`
- `address`
- `carpet_area_sqft`
- `builtup_area_sqft`

### Behavior

- ✅ **Conditional**: Only triggers if relevant fields changed
- ✅ **Non-blocking**: Returns immediately
- ✅ **Error handling**: Logs errors but doesn't fail update

### Flow

```
User updates location/area
  ↓
Asset updated in DB
  ↓
API checks if location/area changed
  ↓
If yes → [Background] Trigger valuation
  ↓
API returns success (immediate)
```

---

## Trigger 3: Scheduled Job (Quarterly)

### Implementation

**File:** `src/app/api/real-estate/valuation/update-quarterly/route.ts`

Quarterly scheduled job to update all assets:

```typescript
POST /api/real-estate/valuation/update-quarterly
```

### Authentication

**Option 1: Admin API Key** (recommended for cron)
```bash
curl -X POST https://your-domain.com/api/real-estate/valuation/update-quarterly \
  -H "X-API-Key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"skipRecentDays": 90, "concurrency": 3}'
```

**Option 2: Authenticated User** (for manual testing)
```bash
# With user session cookie
curl -X POST https://your-domain.com/api/real-estate/valuation/update-quarterly \
  -H "Content-Type: application/json" \
  -d '{"skipRecentDays": 90}'
```

### Request Body

```typescript
{
  skipRecentDays?: number;  // Skip assets updated in last N days (default: 90)
  concurrency?: number;      // Concurrent valuations (default: 3)
  userId?: string | null;    // If provided, only update this user's assets
}
```

### Behavior

- ✅ **Quarterly schedule**: Updates assets older than 90 days
- ✅ **Batch processing**: Processes multiple assets concurrently
- ✅ **Failure tolerance**: Logs failures but continues processing
- ✅ **Configurable**: Adjustable skip period and concurrency

### Scheduling

#### Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/real-estate/valuation/update-quarterly",
    "schedule": "0 2 1 */3 *"
  }]
}
```

This runs at 2 AM UTC on the 1st day of every 3rd month (quarterly).

#### External Cron Service

Use any cron service (cron-job.org, EasyCron, etc.):

```
POST https://your-domain.com/api/real-estate/valuation/update-quarterly
Header: X-API-Key: your-admin-api-key
```

Schedule: Quarterly (e.g., Jan 1, Apr 1, Jul 1, Oct 1)

---

## Utility Functions

### `triggerValuationAsync(supabase, assetId)`

**File:** `src/lib/real-estate/trigger-valuation.ts`

Non-blocking function to trigger valuation:

```typescript
export async function triggerValuationAsync(
  supabase: SupabaseClientType,
  assetId: string
): Promise<void>
```

**Features:**
- Fire and forget (doesn't await)
- Logs success/failure
- Never throws errors
- Returns immediately

### `shouldTriggerValuation(updates)`

**File:** `src/lib/real-estate/trigger-valuation.ts`

Checks if location or area fields were updated:

```typescript
export function shouldTriggerValuation(updates: {
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  carpet_area_sqft?: number | null;
  builtup_area_sqft?: number | null;
}): boolean
```

**Returns:** `true` if any location or area field is being updated

---

## Example Flows

### Example 1: Asset Creation

```typescript
// User creates new asset
POST /api/real-estate/assets
{
  "property_nickname": "My Apartment",
  "city": "Mumbai",
  "carpet_area_sqft": 1000,
  // ... other fields
}

// Response (immediate)
{
  "success": true,
  "data": {
    "id": "asset-123",
    // ... asset data
  }
}

// [Background] Valuation triggered
// [Background] system_estimated_min/max updated after ~2-5 seconds
```

### Example 2: Location Update

```typescript
// User updates location
PUT /api/real-estate/assets/asset-123
{
  "city": "Delhi",  // Changed from Mumbai
  "pincode": "110001"
}

// Response (immediate)
{
  "success": true,
  "data": { /* updated asset */ }
}

// [Background] Valuation triggered (location changed)
// [Background] system_estimated_min/max updated with new locality data
```

### Example 3: Quarterly Update

```bash
# Cron job triggers quarterly update
POST /api/real-estate/valuation/update-quarterly
Header: X-API-Key: admin-key-123

# Response
{
  "success": true,
  "message": "Quarterly valuation update completed",
  "data": {
    "total": 50,
    "processed": 35,
    "skipped": 15,
    "successful": 32,
    "failed": 3,
    "errors": [
      { "assetId": "asset-5", "error": "Missing area AND purchase_price" }
    ]
  }
}
```

---

## Error Handling

### Asset Creation/Update Errors

- **Valuation failure does NOT fail asset creation/update**
- Errors are logged to console
- User flow is never blocked

### Scheduled Job Errors

- **Individual asset failures don't stop batch**
- Errors are collected and returned in response
- Summary includes success/failure counts

---

## Environment Variables

### Required for Scheduled Jobs

```env
# Admin API key for cron job authentication
ADMIN_API_KEY=your-secure-admin-api-key-here
```

---

## Monitoring

### Logs

All valuation triggers are logged:

```
[triggerValuationAsync] Valuation updated for asset asset-123: { min: 7650000, max: 9975000 }
[triggerValuationAsync] Valuation failed for asset asset-456: Missing area AND purchase_price
```

### Metrics to Monitor

1. **Valuation success rate**: Check logs for failures
2. **Valuation freshness**: Ensure assets are updated quarterly
3. **Trigger frequency**: Monitor background triggers after creation/updates

---

## Summary

**Triggers:**
- ✅ After asset creation (async, non-blocking)
- ✅ After location/area update (async, conditional)
- ✅ Via scheduled job (quarterly)

**Key Features:**
- ✅ Never blocks user flow
- ✅ Fire and forget pattern
- ✅ Error handling without failing requests
- ✅ Configurable scheduling
- ✅ Batch processing support

**Ready for Production!** 🚀
