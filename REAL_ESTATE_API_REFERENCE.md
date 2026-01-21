# Real Estate API Reference

**Status:** ✅ Complete  
**Date:** January 2025

---

## 📋 API Endpoints Overview

All endpoints are RLS-safe, ownership-aware, and use generated Supabase types.

### Base URL
```
/api/real-estate
```

---

## 🔐 Authentication

All endpoints require authentication via Supabase Auth:
- Uses `createClient()` from `@/lib/supabase/server`
- Verifies user via `auth.getUser()`
- Returns `401 Unauthorized` if not authenticated

---

## 📚 Endpoints

### 1. List All Assets

**GET** `/api/real-estate/assets`

**Description:** Fetch all real estate assets for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "property_nickname": "2BHK Apartment, Mumbai",
      "property_type": "residential",
      "property_status": "ready",
      "purchase_price": 7000000,
      "purchase_date": "2020-01-15",
      "ownership_percentage": 75,
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "user_override_value": 8500000,
      "system_estimated_min": 8000000,
      "system_estimated_max": 9000000,
      "valuation_last_updated": "2025-01-15T10:30:00Z",
      "real_estate_loans": [
        {
          "id": "uuid",
          "asset_id": "uuid",
          "lender_name": "HDFC Bank",
          "loan_amount": 5000000,
          "outstanding_balance": 4000000,
          "emi": 45000,
          "interest_rate": 8.5,
          "tenure_months": 240
        }
      ],
      "real_estate_cashflows": [
        {
          "id": "uuid",
          "asset_id": "uuid",
          "rental_status": "rented",
          "monthly_rent": 50000,
          "maintenance_monthly": 5000,
          "property_tax_annual": 30000
        }
      ]
    }
  ]
}
```

**Features:**
- Includes related loans and cashflows via join
- Ordered by creation date (newest first)
- RLS ensures user only sees their own assets

---

### 2. Get Single Asset

**GET** `/api/real-estate/assets/:id`

**Description:** Fetch a single asset by ID with related loans and cashflows.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    // ... asset fields ...
    "real_estate_loans": [...],
    "real_estate_cashflows": [...]
  }
}
```

**Errors:**
- `404` - Asset not found or unauthorized

---

### 3. Create Asset

**POST** `/api/real-estate/assets`

**Description:** Create a new real estate asset with optional loan and cashflow.

**Request Body:**
```json
{
  "property_nickname": "2BHK Apartment, Mumbai",
  "property_type": "residential",
  "property_status": "ready",
  "purchase_price": 7000000,
  "purchase_date": "2020-01-15",
  "ownership_percentage": 75,
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "loan": {
    "lender_name": "HDFC Bank",
    "loan_amount": 5000000,
    "interest_rate": 8.5,
    "emi": 45000,
    "tenure_months": 240,
    "outstanding_balance": 4000000
  },
  "cashflow": {
    "rental_status": "rented",
    "monthly_rent": 50000,
    "maintenance_monthly": 5000,
    "property_tax_annual": 30000
  }
}
```

**Required Fields:**
- `property_nickname`
- `property_type` (enum: 'residential' | 'commercial' | 'land')
- `property_status` (enum: 'ready' | 'under_construction')

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    // ... complete asset with relations ...
  }
}
```

**Features:**
- Automatically sets `user_id` from authenticated user
- Creates loan if provided
- Creates cashflow if provided
- Returns complete asset with relations

---

### 4. Update Asset

**PUT** `/api/real-estate/assets/:id`

**Description:** Update asset fields (partial update supported).

**Request Body:**
```json
{
  "property_nickname": "Updated Name",
  "purchase_price": 7500000,
  "city": "Pune"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated asset with relations ...
  }
}
```

**Features:**
- Only updates provided fields
- Verifies ownership before update
- Returns complete asset with relations

---

### 5. Delete Asset

**DELETE** `/api/real-estate/assets/:id`

**Description:** Delete asset (cascades to loans and cashflows).

**Response:**
```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

**Features:**
- Verifies ownership before deletion
- Cascades to related loans and cashflows (via FK)

---

### 6. Update Loan

**PUT** `/api/real-estate/loans/:id`

**Description:** Update loan details.

**Request Body:**
```json
{
  "outstanding_balance": 3800000,
  "emi": 45000,
  "interest_rate": 8.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "lender_name": "HDFC Bank",
    "loan_amount": 5000000,
    "outstanding_balance": 3800000,
    // ... other fields ...
  }
}
```

**Validation:**
- Outstanding balance must be <= loan amount
- Outstanding balance must be >= 0

---

### 7. Delete Loan

**DELETE** `/api/real-estate/loans/:id`

**Description:** Delete loan.

**Response:**
```json
{
  "success": true,
  "message": "Loan deleted successfully"
}
```

---

### 8. Update Cashflow

**PUT** `/api/real-estate/cashflows/:id`

**Description:** Update rental/expense details.

**Request Body:**
```json
{
  "monthly_rent": 55000,
  "maintenance_monthly": 6000,
  "rental_status": "rented"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rental_status": "rented",
    "monthly_rent": 55000,
    // ... other fields ...
  }
}
```

**Validation:**
- If `rental_status` is 'rented', `monthly_rent` must be > 0

---

### 9. Delete Cashflow

**DELETE** `/api/real-estate/cashflows/:id`

**Description:** Delete cashflow.

**Response:**
```json
{
  "success": true,
  "message": "Cashflow deleted successfully"
}
```

---

### 10. Update Valuation

**PUT** `/api/real-estate/assets/:id/valuation`

**Description:** Set/update/clear user override value.

**Request Body:**
```json
{
  "user_override_value": 9200000
}
```

**To clear override:**
```json
{
  "user_override_value": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assetId": "uuid",
    "previousValue": 8500000,
    "newValue": 9200000,
    "valuationSource": "user_override",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Validation:**
- Value must be > 0 (if not null)
- Automatically updates `valuation_last_updated` timestamp

---

### 11. Update Loan Outstanding Balance

**PUT** `/api/real-estate/loans/:id/outstanding`

**Description:** Update loan outstanding balance (specialized endpoint).

**Request Body:**
```json
{
  "outstanding_balance": 3800000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "loanId": "uuid",
    "previousBalance": 4000000,
    "newBalance": 3800000,
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Validation:**
- Outstanding balance must be >= 0
- Outstanding balance must be <= loan amount

---

## 🔒 Ownership Verification

All endpoints verify ownership:

1. **Asset endpoints:** Check `user_id` matches authenticated user
2. **Loan endpoints:** Verify loan belongs to user's asset via join
3. **Cashflow endpoints:** Verify cashflow belongs to user's asset via join

**Pattern:**
```typescript
// Verify ownership
const { data: asset } = await supabase
  .from('real_estate_assets')
  .select('id, user_id')
  .eq('id', assetId)
  .eq('user_id', user.id) // RLS + explicit check
  .single();
```

---

## 🔗 Joins

### Asset with Relations

All GET endpoints return assets with related data:

```typescript
.select(`
  *,
  real_estate_loans (*),
  real_estate_cashflows (*)
`)
```

**Result:**
- Asset fields
- Array of loans (if any)
- Array of cashflows (if any)

---

## ✅ Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `404` - Not Found (resource doesn't exist or unauthorized)
- `500` - Internal Server Error

---

## 📝 Type Safety

All endpoints use generated Supabase types:

```typescript
import type { Database } from '@/types/supabase';

type RealEstateAsset = Database['public']['Tables']['real_estate_assets']['Row'];
type RealEstateAssetInsert = Database['public']['Tables']['real_estate_assets']['Insert'];
type RealEstateAssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];
```

---

## 🎯 Usage Examples

### Create Asset with Loan and Cashflow

```typescript
const response = await fetch('/api/real-estate/assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    property_nickname: '2BHK Apartment',
    property_type: 'residential',
    property_status: 'ready',
    purchase_price: 7000000,
    purchase_date: '2020-01-15',
    city: 'Mumbai',
    state: 'Maharashtra',
    loan: {
      lender_name: 'HDFC Bank',
      loan_amount: 5000000,
      outstanding_balance: 4000000,
      emi: 45000,
    },
    cashflow: {
      rental_status: 'rented',
      monthly_rent: 50000,
    },
  }),
});

const { success, data } = await response.json();
```

### Update Loan Outstanding Balance

```typescript
const response = await fetch(`/api/real-estate/loans/${loanId}/outstanding`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    outstanding_balance: 3800000,
  }),
});

const { success, data } = await response.json();
// data.previousBalance, data.newBalance
```

### Update Valuation

```typescript
const response = await fetch(`/api/real-estate/assets/${assetId}/valuation`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_override_value: 9200000,
  }),
});

const { success, data } = await response.json();
// data.previousValue, data.newValue, data.valuationSource
```

---

## 📊 Summary

**Endpoints Created:**
- ✅ GET `/api/real-estate/assets` - List all
- ✅ GET `/api/real-estate/assets/:id` - Get single
- ✅ POST `/api/real-estate/assets` - Create
- ✅ PUT `/api/real-estate/assets/:id` - Update
- ✅ DELETE `/api/real-estate/assets/:id` - Delete
- ✅ PUT `/api/real-estate/loans/:id` - Update loan
- ✅ DELETE `/api/real-estate/loans/:id` - Delete loan
- ✅ PUT `/api/real-estate/cashflows/:id` - Update cashflow
- ✅ DELETE `/api/real-estate/cashflows/:id` - Delete cashflow
- ✅ PUT `/api/real-estate/assets/:id/valuation` - Update valuation
- ✅ PUT `/api/real-estate/loans/:id/outstanding` - Update balance

**Features:**
- ✅ RLS-safe queries
- ✅ Ownership verification
- ✅ Proper joins (assets + loans + cashflows)
- ✅ Type-safe (uses generated Supabase types)
- ✅ Validation and error handling
- ✅ No schema changes

**Ready for frontend integration!** 🚀
