# Real Estate Edit & Maintenance Flows Design

**Status:** Design Document  
**Version:** 1.0  
**Date:** January 2025

---

## Overview

Edit and maintenance flows for Real Estate assets with change history tracking, data freshness indicators, and user value protection.

**Key Principles:**
- Never auto-overwrite user values
- Track all changes with timestamps
- Show data freshness indicators
- Support monthly rental updates
- Support anytime loan balance updates
- Support manual valuation updates

---

## Update Scenarios

### 1. Monthly Rental Update
**Frequency:** Monthly (user-initiated)  
**Fields:** Monthly rent, expenses, rental status  
**Purpose:** Keep rental income/expenses current

### 2. Loan Outstanding Balance Update
**Frequency:** Anytime (user-initiated)  
**Fields:** Outstanding balance  
**Purpose:** Track loan repayment progress

### 3. Manual Valuation Update
**Frequency:** Anytime (user-initiated)  
**Fields:** User override value  
**Purpose:** User sets custom property value

### 4. System Valuation Update
**Frequency:** Background job (daily/weekly)  
**Fields:** System estimated min/max  
**Purpose:** Auto-update property valuations from market data

---

## API Endpoints

### 1. Update Rental Details

**Endpoint:** `PUT /api/real-estate/cashflow/:assetId`

**Request:**
```typescript
{
  monthlyRent?: number | null;
  rentalStatus?: 'self_occupied' | 'rented' | 'vacant';
  rentStartDate?: string; // YYYY-MM-DD
  escalationPercent?: number | null;
  maintenanceMonthly?: number | null;
  propertyTaxAnnual?: number | null;
  otherExpensesMonthly?: number | null;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    id: string;
    assetId: string;
    updatedAt: string; // ISO timestamp
    changes: string[]; // Array of changed field names
  };
  error?: string;
}
```

**Rules:**
- Only updates provided fields (partial update)
- If `rentalStatus` changes to 'rented', `monthlyRent` becomes required
- If `rentalStatus` changes to non-'rented', `monthlyRent` can be null
- Updates `updated_at` timestamp
- Creates audit log entry

**Example:**
```json
PUT /api/real-estate/cashflow/123e4567-e89b-12d3-a456-426614174000
{
  "monthlyRent": 55000,
  "maintenanceMonthly": 6000
}

Response:
{
  "success": true,
  "data": {
    "id": "cashflow-id",
    "assetId": "123e4567-e89b-12d3-a456-426614174000",
    "updatedAt": "2025-01-15T10:30:00Z",
    "changes": ["monthlyRent", "maintenanceMonthly"]
  }
}
```

---

### 2. Update Loan Outstanding Balance

**Endpoint:** `PUT /api/real-estate/loan/:loanId/outstanding`

**Request:**
```typescript
{
  outstandingBalance: number;
  updateDate?: string; // YYYY-MM-DD, defaults to today
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    loanId: string;
    previousBalance: number;
    newBalance: number;
    updatedAt: string;
  };
  error?: string;
}
```

**Rules:**
- Outstanding balance must be >= 0
- Outstanding balance must be <= loan amount
- Updates `updated_at` timestamp
- Creates audit log entry with previous and new values

**Example:**
```json
PUT /api/real-estate/loan/loan-id-123/outstanding
{
  "outstandingBalance": 3800000,
  "updateDate": "2025-01-15"
}

Response:
{
  "success": true,
  "data": {
    "loanId": "loan-id-123",
    "previousBalance": 4000000,
    "newBalance": 3800000,
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### 3. Update Manual Valuation

**Endpoint:** `PUT /api/real-estate/assets/:assetId/valuation`

**Request:**
```typescript
{
  userOverrideValue: number | null; // null to clear override
  updateDate?: string; // YYYY-MM-DD, defaults to today
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    assetId: string;
    previousValue: number | null;
    newValue: number | null;
    updatedAt: string;
    valuationSource: 'user_override' | 'system_estimate';
  };
  error?: string;
}
```

**Rules:**
- User override value must be > 0 (if not null)
- Setting to `null` clears override and uses system estimate
- Updates `valuation_last_updated` timestamp
- Creates audit log entry
- **Never auto-overwrite** - only updates when explicitly requested

**Example:**
```json
PUT /api/real-estate/assets/123e4567-e89b-12d3-a456-426614174000/valuation
{
  "userOverrideValue": 9200000
}

Response:
{
  "success": true,
  "data": {
    "assetId": "123e4567-e89b-12d3-a456-426614174000",
    "previousValue": 8500000,
    "newValue": 9200000,
    "updatedAt": "2025-01-15T10:30:00Z",
    "valuationSource": "user_override"
  }
}
```

---

### 4. System Valuation Update (Background Job)

**Endpoint:** `POST /api/real-estate/valuation/update` (Internal)

**Request:**
```typescript
{
  assetIds?: string[]; // Optional: specific assets, or all if empty
}
```

**Response:**
```typescript
{
  success: boolean;
  updated: number;
  skipped: number; // Skipped due to user override
  results: Array<{
    assetId: string;
    success: boolean;
    minValue?: number;
    maxValue?: number;
    skipped?: boolean;
    skipReason?: string;
  }>;
}
```

**Rules:**
- **Never updates** if `user_override_value` exists
- Only updates `system_estimated_min` and `system_estimated_max`
- Updates `valuation_last_updated` only if values changed
- Creates audit log entry for each update

**Example:**
```json
POST /api/real-estate/valuation/update
{
  "assetIds": ["asset-id-1", "asset-id-2"]
}

Response:
{
  "success": true,
  "updated": 1,
  "skipped": 1,
  "results": [
    {
      "assetId": "asset-id-1",
      "success": true,
      "minValue": 8000000,
      "maxValue": 9000000
    },
    {
      "assetId": "asset-id-2",
      "success": false,
      "skipped": true,
      "skipReason": "User override exists"
    }
  ]
}
```

---

### 5. Get Change History

**Endpoint:** `GET /api/real-estate/assets/:assetId/history`

**Query Parameters:**
- `type`: 'valuation' | 'loan' | 'rental' | 'all' (default: 'all')
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response:**
```typescript
{
  success: boolean;
  data?: {
    assetId: string;
    history: Array<{
      id: string;
      type: 'valuation' | 'loan_balance' | 'rental';
      field: string; // Field name that changed
      previousValue: any;
      newValue: any;
      changedBy: 'user' | 'system';
      changedAt: string; // ISO timestamp
      metadata?: {
        updateDate?: string;
        source?: string;
      };
    }>;
    total: number;
  };
  error?: string;
}
```

**Example:**
```json
GET /api/real-estate/assets/123e4567-e89b-12d3-a456-426614174000/history?type=valuation&limit=10

Response:
{
  "success": true,
  "data": {
    "assetId": "123e4567-e89b-12d3-a456-426614174000",
    "history": [
      {
        "id": "history-id-1",
        "type": "valuation",
        "field": "user_override_value",
        "previousValue": 8500000,
        "newValue": 9200000,
        "changedBy": "user",
        "changedAt": "2025-01-15T10:30:00Z",
        "metadata": {
          "updateDate": "2025-01-15"
        }
      },
      {
        "id": "history-id-2",
        "type": "valuation",
        "field": "system_estimated_max",
        "previousValue": 9000000,
        "newValue": 9500000,
        "changedBy": "system",
        "changedAt": "2025-01-14T02:00:00Z"
      }
    ],
    "total": 15
  }
}
```

---

## Audit Strategy

### Database Schema: Change History Table

```sql
CREATE TABLE real_estate_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES real_estate_assets(id) ON DELETE CASCADE,
    
    -- Change details
    change_type TEXT NOT NULL, -- 'valuation', 'loan_balance', 'rental', 'property_details'
    field_name TEXT NOT NULL, -- Field that changed
    previous_value JSONB, -- Previous value (can be null, number, string, etc.)
    new_value JSONB, -- New value
    changed_by TEXT NOT NULL, -- 'user' | 'system'
    changed_by_user_id UUID REFERENCES auth.users(id), -- If changed_by = 'user'
    
    -- Metadata
    update_date DATE, -- Date of the update (for valuation/loan balance)
    source TEXT, -- 'manual', 'valuation_service', 'user_edit', etc.
    notes TEXT, -- Optional notes
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_change_type CHECK (change_type IN ('valuation', 'loan_balance', 'rental', 'property_details')),
    CONSTRAINT valid_changed_by CHECK (changed_by IN ('user', 'system'))
);

-- Indexes
CREATE INDEX idx_real_estate_history_asset_id ON real_estate_change_history(asset_id);
CREATE INDEX idx_real_estate_history_type ON real_estate_change_history(asset_id, change_type);
CREATE INDEX idx_real_estate_history_created_at ON real_estate_change_history(created_at DESC);
CREATE INDEX idx_real_estate_history_user_id ON real_estate_change_history(changed_by_user_id);

-- RLS Policies
ALTER TABLE real_estate_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own change history"
    ON real_estate_change_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_change_history.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );
```

### Audit Log Creation

**Function to create audit log entry:**

```typescript
async function createAuditLog(
  assetId: string,
  changeType: 'valuation' | 'loan_balance' | 'rental' | 'property_details',
  fieldName: string,
  previousValue: any,
  newValue: any,
  changedBy: 'user' | 'system',
  userId?: string,
  metadata?: {
    updateDate?: string;
    source?: string;
    notes?: string;
  }
) {
  const supabase = createAdminClient();
  
  await supabase
    .from('real_estate_change_history')
    .insert({
      asset_id: assetId,
      change_type: changeType,
      field_name: fieldName,
      previous_value: previousValue,
      new_value: newValue,
      changed_by: changedBy,
      changed_by_user_id: changedBy === 'user' ? userId : null,
      update_date: metadata?.updateDate || new Date().toISOString().split('T')[0],
      source: metadata?.source,
      notes: metadata?.notes,
    });
}
```

### When to Create Audit Logs

1. **Valuation Changes:**
   - User sets/updates `user_override_value`
   - System updates `system_estimated_min` or `system_estimated_max`
   - User clears override (sets to null)

2. **Loan Balance Changes:**
   - User updates `outstanding_balance`
   - Track both previous and new values

3. **Rental Changes:**
   - User updates `monthly_rent`
   - User updates any expense field
   - User changes `rental_status`

4. **Property Details Changes:**
   - User updates property nickname, location, etc.
   - (Optional: track major property detail changes)

---

## Data Freshness Indicators

### UI Component: Data Freshness Badge

```typescript
interface DataFreshnessProps {
  lastUpdated: string | null; // ISO timestamp
  type: 'valuation' | 'loan' | 'rental';
  source?: 'user' | 'system';
}

function DataFreshnessBadge({ lastUpdated, type, source }: DataFreshnessProps) {
  if (!lastUpdated) {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
        Never updated
      </span>
    );
  }
  
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  let color: string;
  let label: string;
  
  if (daysSinceUpdate === 0) {
    color = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    label = 'Updated today';
  } else if (daysSinceUpdate === 1) {
    color = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    label = 'Updated yesterday';
  } else if (daysSinceUpdate <= 7) {
    color = 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    label = `${daysSinceUpdate} days ago`;
  } else if (daysSinceUpdate <= 30) {
    color = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    label = `${daysSinceUpdate} days ago`;
  } else {
    color = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    label = `${daysSinceUpdate} days ago`;
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-xs font-medium rounded ${color}`}>
        {label}
      </span>
      {source && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({source === 'user' ? 'Manual' : 'Auto'})
        </span>
      )}
    </div>
  );
}
```

### Freshness Thresholds

**Valuation:**
- **Fresh:** < 30 days
- **Stale:** 30-90 days
- **Very Stale:** > 90 days

**Loan Balance:**
- **Fresh:** < 7 days
- **Stale:** 7-30 days
- **Very Stale:** > 30 days

**Rental:**
- **Fresh:** < 30 days (monthly updates expected)
- **Stale:** 30-60 days
- **Very Stale:** > 60 days

---

## User Value Protection Rules

### Rule 1: User Override Priority

```typescript
// System valuation update logic
async function updateSystemValuation(assetId: string) {
  const asset = await getAsset(assetId);
  
  // NEVER update if user override exists
  if (asset.user_override_value !== null) {
    return {
      skipped: true,
      reason: 'User override exists - not updating system estimate'
    };
  }
  
  // Only update system estimates
  const newEstimate = await fetchMarketValuation(asset);
  
  await updateAsset(assetId, {
    system_estimated_min: newEstimate.min,
    system_estimated_max: newEstimate.max,
    valuation_last_updated: new Date().toISOString(),
  });
  
  // Create audit log
  await createAuditLog(
    assetId,
    'valuation',
    'system_estimated_min',
    asset.system_estimated_min,
    newEstimate.min,
    'system',
    undefined,
    { source: 'valuation_service' }
  );
}
```

### Rule 2: Explicit User Updates Only

```typescript
// User valuation update - only updates when explicitly requested
async function updateUserValuation(assetId: string, userOverrideValue: number | null) {
  const asset = await getAsset(assetId);
  
  // Always allow user to set/clear override
  await updateAsset(assetId, {
    user_override_value: userOverrideValue,
    valuation_last_updated: new Date().toISOString(),
  });
  
  // Create audit log
  await createAuditLog(
    assetId,
    'valuation',
    'user_override_value',
    asset.user_override_value,
    userOverrideValue,
    'user',
    userId,
    { source: 'manual' }
  );
}
```

### Rule 3: Background Jobs Respect User Values

```typescript
// Background job: Update all valuations
async function updateAllValuations() {
  const assets = await getAllAssets();
  
  for (const asset of assets) {
    // Skip if user override exists
    if (asset.user_override_value !== null) {
      continue;
    }
    
    // Update system estimate only
    await updateSystemValuation(asset.id);
  }
}
```

---

## UI Display Examples

### Property Card with Freshness Indicators

```tsx
<div className="property-card">
  <h3>2BHK Apartment, Mumbai</h3>
  
  {/* Valuation Section */}
  <div className="valuation-section">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">Estimated Value</span>
      <DataFreshnessBadge 
        lastUpdated={asset.valuation_last_updated}
        type="valuation"
        source={asset.user_override_value ? 'user' : 'system'}
      />
    </div>
    <p className="text-2xl font-semibold">
      ₹{formatCurrency(asset.user_override_value || getMidpoint(asset))}
    </p>
    {asset.user_override_value && (
      <p className="text-xs text-gray-500">Manual override</p>
    )}
    <button onClick={() => openValuationModal(asset)}>
      Update Valuation
    </button>
  </div>
  
  {/* Loan Section */}
  {asset.loan && (
    <div className="loan-section">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Outstanding Balance</span>
        <DataFreshnessBadge 
          lastUpdated={asset.loan.updated_at}
          type="loan"
          source="user"
        />
      </div>
      <p className="text-xl font-semibold">
        ₹{formatCurrency(asset.loan.outstanding_balance)}
      </p>
      <button onClick={() => openLoanUpdateModal(asset.loan)}>
        Update Balance
      </button>
    </div>
  )}
  
  {/* Rental Section */}
  {asset.cashflow && (
    <div className="rental-section">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Monthly Rent</span>
        <DataFreshnessBadge 
          lastUpdated={asset.cashflow.updated_at}
          type="rental"
          source="user"
        />
      </div>
      <p className="text-xl font-semibold">
        ₹{formatCurrency(asset.cashflow.monthly_rent)}
      </p>
      <button onClick={() => openRentalUpdateModal(asset.cashflow)}>
        Update Rental Details
      </button>
    </div>
  )}
</div>
```

### Change History Modal

```tsx
function ChangeHistoryModal({ assetId, type }: { assetId: string; type: 'valuation' | 'loan' | 'rental' }) {
  const { data, loading } = useChangeHistory(assetId, type);
  
  return (
    <div className="modal">
      <h2>Change History</h2>
      <div className="history-list">
        {data?.history.map((entry) => (
          <div key={entry.id} className="history-item">
            <div className="flex items-center justify-between">
              <span className="font-medium">{entry.field}</span>
              <span className="text-xs text-gray-500">
                {formatDate(entry.changedAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {formatValue(entry.previousValue)}
              </span>
              <ArrowRightIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formatValue(entry.newValue)}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {entry.changedBy === 'user' ? 'Manual update' : 'System update'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Summary

This design provides:

- ✅ **4 API endpoints** for updates (rental, loan, valuation, system)
- ✅ **Change history tracking** with audit table
- ✅ **Data freshness indicators** in UI
- ✅ **User value protection** (never auto-overwrite)
- ✅ **Timestamp tracking** for all updates
- ✅ **Audit logs** for compliance and transparency

**Key Features:**
1. User can update rental monthly
2. User can update loan balance anytime
3. User can set/update manual valuation
4. System can update estimates (but never overwrites user override)
5. Full change history visible to users
6. Clear freshness indicators for all data

The system is designed to be transparent, user-controlled, and audit-friendly.
