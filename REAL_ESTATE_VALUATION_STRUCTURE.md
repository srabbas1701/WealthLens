# Real Estate Valuation Code Structure

**Status:** ✅ Complete  
**Date:** January 2025

---

## File Structure

```
src/
  services/
    realEstateValuation.service.ts    # Core valuation service
  jobs/
    valuation.job.ts                  # Scheduled job logic
  lib/
    supabaseClient.ts                 # Unified Supabase client
    real-estate/
      trigger-valuation.ts            # Async trigger utility
  app/
    api/
      real-estate/
        valuation/
          update-quarterly/
            route.ts                  # API endpoint for scheduled job
```

---

## Service Layer

### `src/services/realEstateValuation.service.ts`

**Purpose:** Core valuation logic and calculations

**Exports:**
- `valuateRealEstateAsset()` - Valuate single asset
- `valuateAllUserAssets()` - Valuate all user assets
- `updateSystemValuation()` - Update DB with valuation
- `calculateValuation()` - Calculate valuation range
- `getAssetsNeedingValuation()` - Find assets needing updates
- `batchUpdateValuations()` - Batch processing

**Responsibilities:**
- Valuation calculations
- Database updates
- Input validation
- Ownership checks

---

## Job Layer

### `src/jobs/valuation.job.ts`

**Purpose:** Scheduled job execution logic

**Exports:**
- `runQuarterlyValuationJob()` - Run job for single user
- `runQuarterlyValuationJobForAllUsers()` - Run job for all users (future)

**Responsibilities:**
- Job orchestration
- Error handling
- Result aggregation
- Logging

**Usage:**
```typescript
import { runQuarterlyValuationJob } from '@/jobs/valuation.job';

const result = await runQuarterlyValuationJob({
  skipRecentDays: 90,
  concurrency: 3,
  userId: 'user-123',
});
```

---

## API Layer

### `src/app/api/real-estate/valuation/update-quarterly/route.ts`

**Purpose:** HTTP endpoint for scheduled job

**Endpoints:**
- `POST /api/real-estate/valuation/update-quarterly` - Execute job
- `GET /api/real-estate/valuation/update-quarterly` - Health check

**Responsibilities:**
- Authentication (API key or user session)
- Request validation
- Job invocation
- Response formatting

**Usage:**
```bash
# With API key
curl -X POST https://your-domain.com/api/real-estate/valuation/update-quarterly \
  -H "X-API-Key: admin-key" \
  -H "Content-Type: application/json" \
  -d '{"skipRecentDays": 90, "concurrency": 3}'
```

---

## Utility Layer

### `src/lib/real-estate/trigger-valuation.ts`

**Purpose:** Non-blocking trigger utilities

**Exports:**
- `triggerValuationAsync()` - Fire-and-forget valuation trigger
- `shouldTriggerValuation()` - Check if update should trigger valuation

**Responsibilities:**
- Async triggering (non-blocking)
- Conditional logic
- Error logging

**Usage:**
```typescript
import { triggerValuationAsync, shouldTriggerValuation } from '@/lib/real-estate/trigger-valuation';

// After asset creation
triggerValuationAsync(supabase, assetId);

// After update (conditional)
if (shouldTriggerValuation(updates)) {
  triggerValuationAsync(supabase, assetId);
}
```

---

## Client Layer

### `src/lib/supabaseClient.ts`

**Purpose:** Unified Supabase client exports

**Exports:**
- `createBrowserClient()` - Browser client
- `createServerClient()` - Server client
- `createAdminClient()` - Admin client
- `Database` type

**Usage:**
```typescript
import { createServerClient } from '@/lib/supabaseClient';

const supabase = await createServerClient();
```

---

## Data Flow

### 1. Asset Creation Flow

```
User creates asset
  ↓
POST /api/real-estate/assets
  ↓
createRealEstateAsset() (lib/real-estate/create-asset.ts)
  ↓
Asset saved to DB
  ↓
triggerValuationAsync() (lib/real-estate/trigger-valuation.ts)
  ↓
[Background] valuateRealEstateAsset() (services/realEstateValuation.service.ts)
  ↓
[Background] Valuation updated in DB
```

### 2. Location/Area Update Flow

```
User updates location/area
  ↓
PUT /api/real-estate/assets/{id}
  ↓
updateRealEstateAsset() (lib/real-estate/update-asset.ts)
  ↓
shouldTriggerValuation() checks if location/area changed
  ↓
If yes → triggerValuationAsync()
  ↓
[Background] Valuation updated
```

### 3. Quarterly Update Flow

```
Cron job triggers
  ↓
POST /api/real-estate/valuation/update-quarterly
  ↓
runQuarterlyValuationJob() (jobs/valuation.job.ts)
  ↓
valuateAllUserAssets() (services/realEstateValuation.service.ts)
  ↓
Batch processing with controlled concurrency
  ↓
Results aggregated and returned
```

---

## Separation of Concerns

### Service Layer (`services/`)
- **Pure business logic**
- No HTTP concerns
- No job orchestration
- Reusable across contexts

### Job Layer (`jobs/`)
- **Orchestration logic**
- Error handling
- Result aggregation
- Can be called from API or directly

### API Layer (`app/api/`)
- **HTTP concerns only**
- Authentication
- Request/response handling
- Delegates to job layer

### Utility Layer (`lib/`)
- **Helper functions**
- Non-blocking triggers
- Conditional logic
- Reusable utilities

---

## Benefits of This Structure

1. **Separation of Concerns**
   - Service: Business logic
   - Job: Orchestration
   - API: HTTP handling

2. **Reusability**
   - Service can be used from anywhere
   - Job can be called directly or via API
   - Utilities are shared

3. **Testability**
   - Each layer can be tested independently
   - Mock dependencies easily
   - Clear interfaces

4. **Maintainability**
   - Clear file organization
   - Easy to find code
   - Consistent patterns

5. **Scalability**
   - Easy to add new jobs
   - Service layer is framework-agnostic
   - Can swap API layer if needed

---

## Summary

**Structure:**
- ✅ `services/` - Core business logic
- ✅ `jobs/` - Scheduled job orchestration
- ✅ `lib/` - Utilities and clients
- ✅ `app/api/` - HTTP endpoints

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Reusable components
- ✅ Easy to test and maintain
- ✅ Scalable architecture

**Ready for Production!** 🚀
