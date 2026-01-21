# Real Estate Edit & Maintenance Flows - Summary

**Status:** ✅ Design Complete  
**Version:** 1.0  
**Date:** January 2025

---

## 📋 Overview

Complete design for Real Estate asset edit and maintenance flows with change history tracking, data freshness indicators, and user value protection.

---

## 🎯 Key Features

### 1. Monthly Rental Updates
- User can update rental details monthly
- Fields: Monthly rent, expenses, rental status
- Tracks last updated timestamp
- Shows freshness indicator

### 2. Anytime Loan Balance Updates
- User can update outstanding balance anytime
- Tracks previous and new values
- Creates audit log entry
- Shows freshness indicator

### 3. Manual Valuation Updates
- User can set/update manual property value
- User override takes priority over system estimates
- Can clear override to use system estimates
- Tracks change history

### 4. System Valuation Updates
- Background job updates system estimates
- **Never overwrites** user override values
- Only updates when user override is null
- Creates audit log entries

### 5. Change History
- Complete audit trail of all changes
- Filterable by type (valuation, loan, rental)
- Shows previous and new values
- Tracks who made the change (user/system)

### 6. Data Freshness Indicators
- Visual badges showing data age
- Color-coded (green/yellow/orange/red)
- Shows source (manual/auto)
- Different thresholds for different data types

---

## 🔌 API Endpoints

### 1. Update Rental Details
**PUT** `/api/real-estate/cashflow/:assetId`
- Updates rental income, expenses, status
- Partial updates supported
- Creates audit log

### 2. Update Loan Outstanding Balance
**PUT** `/api/real-estate/loan/:loanId/outstanding`
- Updates outstanding balance
- Validates balance <= loan amount
- Creates audit log

### 3. Update Manual Valuation
**PUT** `/api/real-estate/assets/:assetId/valuation`
- Sets/updates user override value
- Can clear override (set to null)
- Creates audit log

### 4. System Valuation Update (Background)
**POST** `/api/real-estate/valuation/update`
- Updates system estimates only
- Skips assets with user override
- Creates audit logs

### 5. Get Change History
**GET** `/api/real-estate/assets/:assetId/history`
- Returns change history
- Filterable by type
- Paginated results

---

## 🗄️ Database Schema

### Change History Table

```sql
real_estate_change_history
├── id (UUID, PK)
├── asset_id (UUID, FK)
├── change_type (TEXT) -- 'valuation', 'loan_balance', 'rental', 'property_details'
├── field_name (TEXT)
├── previous_value (JSONB)
├── new_value (JSONB)
├── changed_by (TEXT) -- 'user' | 'system'
├── changed_by_user_id (UUID, FK)
├── update_date (DATE)
├── source (TEXT)
├── notes (TEXT)
└── created_at (TIMESTAMP)
```

**Indexes:**
- `asset_id` (for fast lookups)
- `asset_id + change_type` (for filtered queries)
- `created_at DESC` (for chronological sorting)
- `update_date DESC` (for date-based queries)

**RLS Policies:**
- Users can only view their own change history

---

## 🛡️ User Value Protection Rules

### Rule 1: User Override Priority
- System valuation updates **never** overwrite user override
- If `user_override_value` exists, system updates are skipped
- User can always set/update/clear override

### Rule 2: Explicit Updates Only
- System only updates when explicitly requested (background job)
- User updates only happen when user explicitly requests
- No automatic overwrites

### Rule 3: Background Jobs Respect User Values
- Background valuation job checks for user override
- Skips assets with user override
- Only updates system estimates

---

## 📊 Data Freshness Thresholds

### Valuation
- **Fresh:** < 30 days (green)
- **Stale:** 30-90 days (yellow/orange)
- **Very Stale:** > 90 days (red)

### Loan Balance
- **Fresh:** < 7 days (green)
- **Stale:** 7-30 days (yellow/orange)
- **Very Stale:** > 30 days (red)

### Rental
- **Fresh:** < 30 days (green)
- **Stale:** 30-60 days (yellow/orange)
- **Very Stale:** > 60 days (red)

---

## 🎨 UI Components

### 1. Data Freshness Badge
- Shows days since last update
- Color-coded by freshness
- Shows source (manual/auto)
- Clickable to view history

### 2. Update Modals
- Quick update forms for rental/loan/valuation
- Pre-filled with current values
- Shows last updated timestamp
- Validation before submit

### 3. Change History Modal
- Chronological list of changes
- Filterable by type
- Shows previous → new values
- Indicates user vs system changes

### 4. Property Card
- Shows current values
- Freshness badges for each section
- Quick update buttons
- View history links

---

## 📝 Audit Log Creation

### When to Create Logs

1. **Valuation Changes:**
   - User sets/updates override
   - System updates estimates
   - User clears override

2. **Loan Balance Changes:**
   - User updates outstanding balance
   - Track previous and new values

3. **Rental Changes:**
   - User updates monthly rent
   - User updates expenses
   - User changes rental status

4. **Property Details:**
   - User updates property info
   - (Optional: track major changes)

### Audit Log Structure

```typescript
{
  asset_id: string;
  change_type: 'valuation' | 'loan_balance' | 'rental' | 'property_details';
  field_name: string;
  previous_value: any;
  new_value: any;
  changed_by: 'user' | 'system';
  changed_by_user_id?: string;
  update_date?: string;
  source?: string;
  notes?: string;
}
```

---

## 🔄 Update Flow Examples

### Example 1: User Updates Rental

```
1. User clicks "Update Rental Details"
2. Modal opens with current values
3. User updates monthly rent: ₹50,000 → ₹55,000
4. User updates maintenance: ₹5,000 → ₹6,000
5. User clicks "Save"
6. API updates real_estate_cashflows table
7. API creates audit log entries:
   - monthly_rent: 50000 → 55000
   - maintenance_monthly: 5000 → 6000
8. UI refreshes with new values and freshness badge
```

### Example 2: User Updates Loan Balance

```
1. User clicks "Update Balance"
2. Modal opens with current outstanding balance
3. User enters new balance: ₹3,800,000
4. User clicks "Save"
5. API validates: balance <= loan amount
6. API updates real_estate_loans.outstanding_balance
7. API creates audit log:
   - outstanding_balance: 4000000 → 3800000
8. UI refreshes with new balance and freshness badge
```

### Example 3: System Updates Valuation

```
1. Background job runs (daily/weekly)
2. For each asset:
   a. Check if user_override_value exists
   b. If yes: Skip (don't update)
   c. If no: Fetch market valuation
   d. Update system_estimated_min/max
   e. Create audit log
3. Update valuation_last_updated timestamp
4. UI shows updated system estimates
```

### Example 4: User Sets Manual Valuation

```
1. User clicks "Set Manual Value"
2. Modal opens with current system estimate
3. User enters override value: ₹9,200,000
4. User clicks "Save"
5. API updates user_override_value
6. API creates audit log:
   - user_override_value: null → 9200000
7. UI shows manual value with "Manual override" badge
8. Future system updates will skip this asset
```

---

## ✅ Implementation Checklist

### Backend
- [ ] Create change history table migration
- [ ] Implement audit log creation function
- [ ] Create rental update endpoint
- [ ] Create loan balance update endpoint
- [ ] Create valuation update endpoint
- [ ] Create system valuation update endpoint
- [ ] Create change history retrieval endpoint
- [ ] Add RLS policies for change history

### Frontend
- [ ] Create DataFreshnessBadge component
- [ ] Create rental update modal
- [ ] Create loan balance update modal
- [ ] Create valuation update modal
- [ ] Create change history modal
- [ ] Add freshness badges to property cards
- [ ] Add update buttons to property cards
- [ ] Integrate with property listing page

### Testing
- [ ] Test user override protection
- [ ] Test system update skipping
- [ ] Test audit log creation
- [ ] Test change history retrieval
- [ ] Test freshness indicators
- [ ] Test validation rules

---

## 📚 Related Documents

- **Schema:** `supabase/migrations/real_estate_schema.sql`
- **Change History Schema:** `supabase/migrations/real_estate_change_history.sql`
- **Analytics:** `REAL_ESTATE_ANALYTICS_DESIGN.md`
- **Valuation:** `REAL_ESTATE_VALUATION_SERVICE_DESIGN.md`
- **Insights:** `REAL_ESTATE_INSIGHTS_ENGINE_DESIGN.md`
- **Onboarding:** `REAL_ESTATE_ONBOARDING_IMPLEMENTATION.md`

---

## 🎯 Key Takeaways

1. **User Control:** Users always have control over their data
2. **No Auto-Overwrites:** System never overwrites user values
3. **Full Transparency:** Complete audit trail of all changes
4. **Data Freshness:** Clear indicators of data age
5. **Flexible Updates:** Support for monthly, anytime, and manual updates

**The system is designed to be user-friendly, transparent, and audit-compliant!** 🚀
