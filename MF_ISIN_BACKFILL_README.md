# Mutual Fund ISIN Backfill System

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Functional Flow](#functional-flow)
5. [Technical Implementation](#technical-implementation)
6. [API Endpoints](#api-endpoints)
7. [Usage Instructions](#usage-instructions)
8. [Troubleshooting](#troubleshooting)
9. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

The **MF ISIN Backfill System** automatically resolves and enriches Mutual Fund assets with ISINs (International Securities Identification Numbers) when they are uploaded without them. This system ensures that:

- ✅ Kuvera/Groww/Zerodha CSV uploads work seamlessly without requiring ISIN columns
- ✅ MF assets are automatically enriched with authoritative identifiers from AMFI data
- ✅ NAV resolution works correctly for all MF holdings
- ✅ Portfolio valuation and analytics function without manual intervention

### Key Principles

1. **mf_scheme_master is the ONLY source of truth** for ISINs
2. **CSV ISINs are ignored** - all resolution comes from scheme master
3. **Upload never fails** due to missing ISINs (non-blocking)
4. **ISIN resolution is best-effort enrichment**, not a requirement
5. **Idempotent operations** - safe to run multiple times

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    MF ISIN Backfill System                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Upload      │    │   Backfill     │    │   NAV Update   │
│   Pipeline    │    │   Service      │    │   Service     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    mf_scheme_master                          │
│              (AMFI Scheme Master Data)                       │
│  - scheme_code (AMFI identifier)                            │
│  - scheme_name (human-readable name)                        │
│  - isin_growth / isin_div_payout / isin_div_reinvest       │
│  - fund_house                                               │
│  - scheme_status (Active/Inactive)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      assets table                            │
│  - id (UUID)                                                │
│  - name (scheme name)                                       │
│  - asset_type ('mutual_fund')                              │
│  - isin (resolved from scheme master)                       │
│  - symbol (scheme_code from AMFI)                           │
│  - is_active (true/false)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Upload Flow**:
   ```
   CSV Upload → Parse Holdings → Attempt ISIN Resolution (best-effort)
   → Create Asset (with or without ISIN) → Create Holding → Success
   ```

2. **Backfill Flow**:
   ```
   Trigger Backfill → Query Assets (isin IS NULL) → Normalize Names
   → Match Against Scheme Master → Update Assets (isin, symbol)
   → Return Statistics
   ```

3. **NAV Resolution Flow**:
   ```
   Portfolio Data Request → Query Holdings → Filter MF Holdings with ISIN
   → Fetch NAVs by ISIN → Compute current_value = units × NAV
   → Return Portfolio Data
   ```

---

## Database Schema

### `mf_scheme_master` Table

**Purpose**: Master data for all Mutual Fund schemes from AMFI. Maps `scheme_code` to ISINs.

```sql
CREATE TABLE mf_scheme_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT NOT NULL UNIQUE,           -- AMFI scheme code (primary identifier)
  scheme_name TEXT NOT NULL,                  -- Full scheme name from AMFI
  fund_house TEXT,                            -- AMC / Fund House name
  scheme_type TEXT,                           -- e.g., 'Open Ended Schemes'
  isin_growth TEXT,                           -- ISIN for Growth option
  isin_div_payout TEXT,                       -- ISIN for Dividend Payout option
  isin_div_reinvest TEXT,                     -- ISIN for Dividend Reinvestment option
  scheme_status TEXT,                          -- 'Active', 'Closed', 'Merged'
  nav_date DATE,                              -- Date of last NAV update
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mf_scheme_master_scheme_code ON mf_scheme_master(scheme_code);
CREATE INDEX idx_mf_scheme_master_isin_growth ON mf_scheme_master(isin_growth) WHERE isin_growth IS NOT NULL;
CREATE INDEX idx_mf_scheme_master_isin_div_payout ON mf_scheme_master(isin_div_payout) WHERE isin_div_payout IS NOT NULL;
CREATE INDEX idx_mf_scheme_master_isin_div_reinvest ON mf_scheme_master(isin_div_reinvest) WHERE isin_div_reinvest IS NOT NULL;
CREATE INDEX idx_mf_scheme_master_fund_house ON mf_scheme_master(fund_house);
```

**Key Characteristics**:
- Shared across all users (public data)
- Populated from AMFI NAV file via `updateSchemeMaster()`
- Updated periodically (daily recommended)
- ~14,000+ active schemes

### `assets` Table (MF-specific columns)

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                         -- Scheme name
  asset_type TEXT NOT NULL,                   -- 'mutual_fund', 'index_fund', 'etf'
  isin TEXT UNIQUE,                           -- ISIN (resolved from scheme master)
  symbol TEXT,                                -- scheme_code for MF assets
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_isin ON assets(isin) WHERE isin IS NOT NULL;
```

**MF Asset Rules**:
- `isin`: Resolved from `mf_scheme_master` (prefer `isin_growth`)
- `symbol`: Stores `scheme_code` from AMFI (not stock symbol)
- `name`: Canonical scheme name from scheme master (if resolved)

### `mf_navs` Table

**Purpose**: Centralized NAV storage for all MF schemes.

```sql
CREATE TABLE mf_navs (
  id UUID PRIMARY KEY,
  scheme_code TEXT NOT NULL,                  -- AMFI scheme code (NOT ISIN)
  scheme_name TEXT NOT NULL,
  nav NUMERIC NOT NULL,
  nav_date DATE NOT NULL,
  price_source TEXT DEFAULT 'AMFI_DAILY',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scheme_code, nav_date)
);
```

**Note**: NAVs are stored by `scheme_code`, not ISIN. ISIN → `scheme_code` mapping is done via `mf_scheme_master`.

---

## Functional Flow

### 1. Upload Flow (`/api/portfolio/upload/confirm`)

**Step-by-step process**:

1. **Parse CSV Holdings**
   - Extract scheme name, units, invested value
   - Ignore CSV ISIN column (not trusted)

2. **Normalize Scheme Name**
   - Lowercase, trim whitespace
   - Remove noise words: `direct`, `regular`, `growth`, `plan`, `option`, `idcw`, `dividend`, `bonus`, `fund`, `mf`
   - Collapse multiple spaces
   - Example: `"ICICI Prudential Innovation Growth Direct Plan"` → `"icici prudential innovation"`

3. **Attempt ISIN Resolution** (best-effort, non-blocking)
   - Query `mf_scheme_master` for ACTIVE schemes
   - **Strategy 1**: Exact match on normalized name
     - Prefer: DIRECT + GROWTH schemes
     - Score: Direct (100) + Growth (10) = 110 max
   - **Strategy 2**: ILIKE match with fund_house preference
     - Score: Fund house match (75) + Direct (10) + Growth (5) = 90 max
   - If match found:
     - Extract ISIN (prefer `isin_growth`, fallback to `isin_div_payout`, then `isin_div_reinvest`)
     - Store `scheme_code` for use as `symbol`
     - Use canonical `scheme_name` from scheme master
   - If no match: Continue without ISIN (log warning)

4. **Create/Find Asset**
   - Try to find existing asset by ISIN (if resolved)
   - If not found, create new asset:
     - `asset_type = 'mutual_fund'`
     - `isin = resolved_isin OR NULL`
     - `symbol = scheme_code OR NULL`
     - `name = canonical_scheme_name OR csv_name`

5. **Create/Merge Holding**
   - Create holding with quantity, invested_value
   - Merge if holding already exists

6. **Return Success** (with warnings if any)

### 2. Backfill Flow (`/api/mf/isin/backfill`)

**Step-by-step process**:

1. **Query Assets**
   ```sql
   SELECT id, name, asset_type, isin, symbol
   FROM assets
   WHERE asset_type = 'mutual_fund'
     AND is_active = true
     AND isin IS NULL
   ```

2. **Load Scheme Master**
   ```sql
   SELECT scheme_code, scheme_name, fund_house, 
          isin_growth, isin_div_payout, isin_div_reinvest,
          scheme_status, last_updated
   FROM mf_scheme_master
   WHERE scheme_status = 'Active'
   ORDER BY last_updated DESC
   ```

3. **For Each Asset Without ISIN**:
   - Normalize asset name (same logic as upload)
   - Attempt matching (same strategies as upload)
   - If match found:
     - Update asset:
       ```sql
       UPDATE assets
       SET isin = resolved_isin,
           symbol = scheme_code,
           updated_at = NOW()
       WHERE id = asset_id
       ```
   - If no match: Log as unresolved

4. **Return Statistics**:
   - `scanned`: Total assets processed
   - `resolved`: Successfully resolved ISINs
   - `unresolved`: Could not be resolved
   - `sample_unresolved`: Sample asset names (max 10)

### 3. NAV Resolution Flow (`/api/portfolio/data`)

**Step-by-step process**:

1. **Query Holdings**
   - Get all holdings with asset details
   - Filter MF holdings: `asset_type IN ('mutual_fund', 'index_fund', 'etf')`

2. **Separate by ISIN Status**:
   - Holdings WITH ISIN: Fetch NAVs
   - Holdings WITHOUT ISIN: Log warning, use `invested_value` as fallback

3. **Fetch NAVs for Holdings with ISIN**:
   - Extract ISINs from holdings
   - Query `mf_navs` via ISIN → `scheme_code` mapping
   - Store NAV in memory: `holding._computedNav = nav`

4. **Compute Current Value**:
   ```typescript
   if (holding.hasISIN && holding._computedNav) {
     currentValue = quantity × holding._computedNav
   } else {
     currentValue = invested_value  // Fallback
   }
   ```

5. **Return Portfolio Data** with computed values

---

## Technical Implementation

### Core Functions

#### 1. `normalizeSchemeName(schemeName: string): string`

**Location**: `src/app/api/portfolio/upload/confirm/route.ts` (exported), `src/lib/mf-isin-backfill.ts` (duplicated)

**Purpose**: Normalize scheme names for matching by removing noise words.

**Algorithm**:
1. Lowercase and trim
2. Remove noise words (in order):
   - `direct plan`, `regular plan`
   - `growth option`, `dividend option`, `idcw option`, `bonus option`
   - `direct`, `regular`, `growth`, `dividend`, `idcw`, `iddr`, `bonus`, `plan`, `option`, `fund`, `mf`
3. Collapse multiple spaces to single space
4. Return normalized string

**Example**:
```typescript
normalizeSchemeName("ICICI Prudential Innovation Growth Direct Plan")
// Returns: "icici prudential innovation"
```

#### 2. `resolveMFScheme(supabase, holding, warnings?): Promise<{isin, schemeCode, schemeName} | null>`

**Location**: `src/app/api/portfolio/upload/confirm/route.ts`

**Purpose**: Resolve MF scheme from `mf_scheme_master` using name matching.

**Matching Strategy**:

**Strategy 1: Exact Match**
- Normalize both asset name and scheme name
- Compare normalized strings
- Score calculation:
  ```typescript
  score = (isDirect ? 100 : 50) + (isGrowth ? 10 : 0)
  ```
- Prefer higher score, then most recently updated

**Strategy 2: ILIKE Match with Fund House**
- If no exact match, try ILIKE: `scheme_name ILIKE '%normalizedName%'`
- Extract fund house from asset name (regex: `^([A-Za-z\s&]+?)(?:\s+(?:Mutual Fund|MF|Fund|Limited|Ltd))?`)
- Score calculation:
  ```typescript
  score = (fundHouseMatch ? 75 : 25) + (isDirect ? 10 : 0) + (isGrowth ? 5 : 0)
  ```

**ISIN Selection Priority**:
1. `isin_growth` (preferred)
2. `isin_div_payout` (fallback)
3. `isin_div_reinvest` (last resort)

#### 3. `backfillMFISINs(): Promise<BackfillResult>`

**Location**: `src/lib/mf-isin-backfill.ts`

**Purpose**: Backfill ISINs for all MF assets without them.

**Process**:
1. Query assets: `asset_type = 'mutual_fund'`, `is_active = true`, `isin IS NULL`
2. Load all ACTIVE schemes from `mf_scheme_master`
3. For each asset:
   - Normalize name
   - Attempt matching (same logic as `resolveMFScheme`)
   - If match found: Update asset with ISIN and `scheme_code`
   - If no match: Log as unresolved
4. Return statistics

**Error Handling**:
- Never throws - only logs warnings
- Continues processing even if individual assets fail
- Returns partial results if fatal error occurs

---

## API Endpoints

### 1. `POST /api/mf/isin/backfill`

**Purpose**: Run ISIN backfill for all MF assets without ISINs.

**Request**:
```json
{
  "force": false  // Optional: If true, re-resolve even assets with ISINs
}
```

**Response**:
```json
{
  "success": true,
  "scanned": 25,
  "resolved": 20,
  "unresolved": 5,
  "sample_unresolved": [
    "Scheme Name 1",
    "Scheme Name 2"
  ],
  "message": "Backfill complete: 20 resolved out of 25 scanned assets"
}
```

**Error Response**:
```json
{
  "success": false,
  "scanned": 0,
  "resolved": 0,
  "unresolved": 0,
  "sample_unresolved": [],
  "error": "Error message"
}
```

**Characteristics**:
- Idempotent (safe to run multiple times)
- Non-blocking (never fails entire process)
- Processes only `mutual_fund` assets with `is_active = true`
- Skips assets that already have ISINs (unless `force: true`)

### 2. `GET /api/mf/isin/backfill`

**Purpose**: Check status - count of MF assets without ISINs.

**Response**:
```json
{
  "success": true,
  "assetsWithoutISIN": 25,
  "message": "Found 25 MF assets without ISIN"
}
```

**Use Case**: Monitor how many assets need ISIN resolution.

---

## Usage Instructions

### Manual Execution

#### Option 1: Browser (Easiest)

1. Ensure dev server is running: `npm run dev`
2. Navigate to: `http://localhost:3000/api/mf/isin/backfill`
3. View JSON response with results

#### Option 2: curl (Terminal)

```bash
# Check status
curl http://localhost:3000/api/mf/isin/backfill

# Run backfill
curl -X POST http://localhost:3000/api/mf/isin/backfill \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Option 3: PowerShell (Windows)

```powershell
# Check status
Invoke-WebRequest -Uri "http://localhost:3000/api/mf/isin/backfill" -Method GET

# Run backfill
Invoke-WebRequest -Uri "http://localhost:3000/api/mf/isin/backfill" -Method POST `
  -ContentType "application/json" -Body '{}'
```

#### Option 4: Browser Console

```javascript
fetch('/api/mf/isin/backfill', { 
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
  .then(r => r.json())
  .then(data => console.log('Backfill Results:', data));
```

### Scheduled Execution

#### Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/mf/isin/backfill",
    "schedule": "30 19 * * *"
  }]
}
```

This runs daily at 7:30 PM IST (19:30 UTC).

#### External Cron Service

Use any cron service (cron-job.org, EasyCron, etc.) to call:
```
POST https://your-domain.com/api/mf/isin/backfill
```

Recommended schedule: Daily at 7:30 PM IST (after AMFI NAV updates).

### Typical Workflow

1. **Upload MF Holdings** (via CSV)
   - Upload Kuvera/Groww/Zerodha CSV
   - Assets created with or without ISINs
   - Upload always succeeds

2. **Run ISIN Backfill** (if needed)
   ```bash
   POST /api/mf/isin/backfill
   ```
   - Resolves ISINs for assets without them
   - Updates `assets.isin` and `assets.symbol`

3. **Update NAVs** (after ISINs resolved)
   ```bash
   POST /api/mf/navs/update
   ```
   - Fetches latest NAVs for all resolved ISINs
   - Stores in `mf_navs` table

4. **View Portfolio** (automatic)
   - Portfolio data API computes `current_value = units × NAV`
   - Holdings show accurate current values

---

## Troubleshooting

### Issue: Many MF holdings show "No NAV available"

**Symptoms**:
- Console logs: `⚠️ MF holding unknown: No NAV available, using invested_value ... as fallback`
- Portfolio shows invested value instead of current value

**Root Cause**: Assets don't have ISINs, so NAVs cannot be fetched.

**Solution**:
1. Check status: `GET /api/mf/isin/backfill`
2. Run backfill: `POST /api/mf/isin/backfill`
3. Update NAVs: `POST /api/mf/navs/update`

### Issue: Backfill resolves 0 assets

**Possible Causes**:

1. **Scheme master is empty**
   - Solution: Run `POST /api/mf/schemes/update` to populate scheme master

2. **Asset names don't match scheme names**
   - Check: Compare asset names with scheme names in `mf_scheme_master`
   - Solution: Improve normalization or manual mapping

3. **All assets already have ISINs**
   - Check: `GET /api/mf/isin/backfill` returns `assetsWithoutISIN: 0`
   - This is expected - no action needed

### Issue: Backfill takes too long

**Cause**: Processing many assets sequentially.

**Solution**: 
- Backfill is designed to be non-blocking
- Run during off-peak hours
- Consider batching if processing > 1000 assets

### Issue: Some assets remain unresolved

**Expected Behavior**: Not all assets can be automatically resolved.

**Reasons**:
- Scheme name in CSV doesn't match AMFI scheme name
- Scheme is inactive/merged in AMFI
- Scheme name is too generic or ambiguous

**Solution**:
- Review `sample_unresolved` in response
- Manually update `assets.isin` if needed
- Improve normalization logic for edge cases

### Issue: NAVs not updating after ISIN backfill

**Checklist**:
1. ✅ ISINs are resolved: `SELECT isin FROM assets WHERE asset_type = 'mutual_fund' AND isin IS NOT NULL`
2. ✅ NAVs are fetched: `SELECT * FROM mf_navs WHERE nav_date = CURRENT_DATE`
3. ✅ Scheme master has ISIN → scheme_code mapping: `SELECT scheme_code, isin_growth FROM mf_scheme_master WHERE isin_growth = 'YOUR_ISIN'`

**Solution**: Run `POST /api/mf/navs/update` after backfill completes.

---

## Future Enhancements

### 1. Automatic Backfill After Upload

**Enhancement**: Trigger backfill automatically after MF upload completes.

**Implementation**:
```typescript
// In /api/portfolio/upload/confirm/route.ts
if (mfAssetsWithoutISIN.length > 0) {
  // Trigger async backfill (non-blocking)
  backfillMFISINs().catch(err => console.error('Backfill failed:', err));
}
```

### 2. Confidence Scoring

**Enhancement**: Add confidence score to ISIN resolution.

**Implementation**:
- Score based on match type (exact = 100, ILIKE = 75, etc.)
- Store confidence in asset metadata
- Allow manual review of low-confidence matches

### 3. Fuzzy Matching

**Enhancement**: Use fuzzy string matching (Levenshtein distance) for better resolution.

**Implementation**:
- Use library like `fuse.js` or `string-similarity`
- Set similarity threshold (e.g., 0.8)
- Fallback to fuzzy matching if exact/ILIKE fails

### 4. Batch Processing

**Enhancement**: Process assets in batches for better performance.

**Implementation**:
- Process 100 assets at a time
- Use Promise.all for parallel processing
- Add progress tracking

### 5. Metadata Storage

**Enhancement**: Store resolution metadata in asset JSONB column.

**Implementation**:
```sql
ALTER TABLE assets ADD COLUMN metadata JSONB;

-- Store in metadata:
{
  "isin_resolution": {
    "resolved_at": "2025-01-15T19:30:00Z",
    "resolution_source": "nightly_backfill",
    "scheme_code": "123456",
    "confidence_score": 100,
    "match_type": "exact"
  }
}
```

### 6. Monitoring Dashboard

**Enhancement**: Create admin dashboard to monitor backfill status.

**Features**:
- Count of assets without ISINs
- Resolution success rate
- Sample unresolved assets
- Historical backfill statistics

---

## Related Documentation

- **MF NAV Update**: See `/api/mf/navs/update` documentation
- **Scheme Master Update**: See `/api/mf/schemes/update` documentation
- **Portfolio Upload**: See `/api/portfolio/upload/confirm` documentation
- **Portfolio Data API**: See `/api/portfolio/data` documentation

---

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review `sample_unresolved` in backfill response
3. Verify `mf_scheme_master` is populated and up-to-date
4. Check database indexes are created correctly

---

**Last Updated**: January 2025
**Version**: 1.0.0


