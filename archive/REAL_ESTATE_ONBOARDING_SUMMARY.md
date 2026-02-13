# Real Estate Onboarding Flow - Implementation Summary

**Status:** ✅ Complete  
**Version:** 1.0  
**Date:** January 2025

---

## 📋 Overview

Complete implementation guide for 7-step Real Estate onboarding flow with draft saving, validation, and progressive disclosure.

---

## 📁 File Structure

```
src/
├── types/
│   └── real-estate.ts                    ✅ Type definitions
│
├── lib/
│   └── real-estate/
│       ├── validation.ts                 ✅ Validation rules (all 7 steps)
│       └── draft-state.ts                ✅ Initial state & utilities
│
├── components/
│   └── real-estate/
│       ├── RealEstateAddModal.tsx        ⏳ Main modal container
│       ├── hooks/
│       │   └── useRealEstateDraft.ts      ⏳ Draft state management hook
│       └── steps/
│           ├── Step1BasicInfo.tsx        ⏳ Property nickname, type, status
│           ├── Step2FinancialDetails.tsx ⏳ Purchase price, date, ownership
│           ├── Step3Location.tsx         ⏳ City, state, pincode, address
│           ├── Step4PropertyDetails.tsx   ⏳ Project, builder, RERA, area
│           ├── Step5Loan.tsx             ⏳ Loan details (optional)
│           ├── Step6Rental.tsx           ⏳ Rental/cashflow (optional)
│           └── Step7Review.tsx           ⏳ Review & submit
│
└── app/
    └── api/
        └── real-estate/
            ├── draft/
            │   └── route.ts               ⏳ Save/Load/Delete draft
            └── assets/
                └── route.ts               ⏳ Create asset + related tables
```

---

## 🎯 7 Steps Overview

### Step 1: Basic Info
- **Required:** Property nickname, type, status
- **Validation:** Min 2 chars nickname, valid enum values
- **Cannot skip**

### Step 2: Financial Details
- **Required:** Purchase price (recommended), purchase date (recommended)
- **Optional:** Registration value, ownership percentage (default 100%)
- **Validation:** Price > 0, date not in future, ownership 0-100%
- **Cannot skip**

### Step 3: Location
- **Required:** City, state
- **Optional:** Pincode (6 digits), address
- **Validation:** Min 2 chars for city/state, valid pincode format
- **Cannot skip**

### Step 4: Property Details
- **All optional:** Project name, builder, RERA, area
- **Validation:** RERA format, area > 0, builtup >= carpet
- **Cannot skip** (but all fields optional)

### Step 5: Loan
- **Optional step** - Can be skipped
- **If enabled:** Lender name, loan amount required
- **Optional:** EMI, interest rate, tenure, outstanding balance
- **Validation:** Amount > 0, outstanding <= loan amount

### Step 6: Rental/Cashflow
- **Optional step** - Can be skipped
- **If enabled:** Rental status required
- **If rented:** Monthly rent required
- **Optional:** Expenses, escalation, rent start date

### Step 7: Review
- **Shows summary** of all entered data
- **Validates all previous steps**
- **Submit button** creates asset + related tables

---

## 🔄 State Management

### Draft State Shape

```typescript
interface RealEstateDraft {
  // Step 1-4: Required fields
  propertyNickname: string;
  propertyType: 'residential' | 'commercial' | 'land' | '';
  propertyStatus: 'ready' | 'under_construction' | '';
  purchasePrice: number | null;
  purchaseDate: string;
  ownershipPercentage: number; // default 100
  city: string;
  state: string;
  pincode: string;
  address: string;
  projectName: string;
  builderName: string;
  reraNumber: string;
  carpetAreaSqft: number | null;
  builtupAreaSqft: number | null;
  
  // Step 5: Optional loan
  hasLoan: boolean;
  loan: LoanDetails | null;
  
  // Step 6: Optional rental
  hasRental: boolean;
  cashflow: CashflowDetails | null;
  
  // Metadata
  currentStep: number;
  lastSavedAt: string | null;
  draftId: string | null;
}
```

### Draft Hook: `useRealEstateDraft`

**Features:**
- Auto-load draft on mount
- Auto-save after 2 seconds of inactivity (debounced)
- Manual save function
- Clear draft function
- Loading and error states

**Usage:**
```typescript
const { draft, updateDraft, saveDraft, clearDraft, isSaving } = useRealEstateDraft(userId);
```

---

## ✅ Validation Rules

### Step 1: Basic Info
- ✅ Property nickname: 2-100 characters
- ✅ Property type: Must be selected
- ✅ Property status: Must be selected

### Step 2: Financial Details
- ✅ Purchase price: > 0 (if provided)
- ✅ Purchase date: Not in future (if provided)
- ✅ Ownership %: 0-100
- ✅ Registration value: >= 0 (if provided)

### Step 3: Location
- ✅ City: Min 2 characters
- ✅ State: Min 2 characters
- ✅ Pincode: 6 digits (if provided)

### Step 4: Property Details
- ✅ RERA format: XX/XX/REALESTATE/YYYY/XXXXX (if provided)
- ✅ Carpet area: > 0 (if provided)
- ✅ Builtup area: > 0 (if provided)
- ✅ Builtup >= Carpet (if both provided)

### Step 5: Loan (if enabled)
- ✅ Lender name: Min 2 characters
- ✅ Loan amount: > 0
- ✅ EMI: > 0 (if provided)
- ✅ Interest rate: 0-100 (if provided)
- ✅ Tenure: > 0 (if provided)
- ✅ Outstanding balance: >= 0, <= loan amount

### Step 6: Rental (if enabled)
- ✅ Monthly rent: > 0 (if rented)
- ✅ All expenses: >= 0 (if provided)
- ✅ Escalation %: 0-100 (if provided)

### Step 7: Review
- ✅ Re-validates all previous steps
- ✅ Shows all errors before submission

---

## 🔌 API Endpoints

### 1. Save Draft
**POST** `/api/real-estate/draft`
```json
{
  "userId": "uuid",
  "draft": { /* RealEstateDraft object */ }
}
```

**Response:**
```json
{
  "success": true,
  "draftId": "uuid",
  "lastSavedAt": "2025-01-15T10:30:00Z"
}
```

### 2. Load Draft
**GET** `/api/real-estate/draft?userId=xxx`

**Response:**
```json
{
  "success": true,
  "draft": { /* RealEstateDraft object */ }
}
```

### 3. Delete Draft
**DELETE** `/api/real-estate/draft?draftId=xxx`

**Response:**
```json
{
  "success": true
}
```

### 4. Submit Asset
**POST** `/api/real-estate/assets`
```json
{
  /* RealEstateDraft object */
}
```

**Response:**
```json
{
  "success": true,
  "assetId": "uuid",
  "loanId": "uuid" | null,
  "cashflowId": "uuid" | null
}
```

**Backend Logic:**
1. Create `real_estate_assets` record
2. If `hasLoan`: Create `real_estate_loans` record
3. If `hasRental`: Create `real_estate_cashflows` record
4. Delete draft
5. Return created IDs

---

## 🎨 UI/UX Features

### Progress Indicator
- Visual progress bar showing 7 steps
- Current step highlighted
- Completed steps marked

### Navigation
- **Previous:** Go back to previous step
- **Next:** Validate and move forward (auto-saves draft)
- **Skip:** Available for steps 5 & 6 only
- **Save Property:** Final submit on step 7

### Error Display
- Inline error messages below form fields
- Summary of all errors at top of step
- Validation on "Next" click
- Clear error messages

### Draft Saving
- Auto-save after 2 seconds of inactivity
- "Saving draft..." indicator in footer
- Resume from last step on modal reopen
- Draft persists across browser sessions

### Progressive Disclosure
- Basic fields required first
- Advanced fields optional
- Loan and rental steps can be skipped entirely
- Review step shows all entered data

---

## 📝 Implementation Checklist

### ✅ Completed
- [x] Type definitions (`real-estate.ts`)
- [x] Validation rules (all 7 steps)
- [x] Draft state management utilities
- [x] Implementation guide document

### ⏳ Pending
- [ ] `useRealEstateDraft` hook
- [ ] `RealEstateAddModal` main component
- [ ] Step 1 component (Basic Info)
- [ ] Step 2 component (Financial Details)
- [ ] Step 3 component (Location)
- [ ] Step 4 component (Property Details)
- [ ] Step 5 component (Loan)
- [ ] Step 6 component (Rental)
- [ ] Step 7 component (Review)
- [ ] API endpoint: Save/Load/Delete draft
- [ ] API endpoint: Submit asset
- [ ] Database table: `real_estate_drafts` (optional, can use localStorage)

---

## 🗄️ Database Schema (Optional)

If storing drafts in database:

```sql
CREATE TABLE real_estate_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 1,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX idx_real_estate_drafts_user_id ON real_estate_drafts(user_id);
```

**Alternative:** Use localStorage (simpler, no backend needed)

---

## 🚀 Usage Example

```typescript
import RealEstateAddModal from '@/components/real-estate/RealEstateAddModal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Add Real Estate Property
      </button>
      
      <RealEstateAddModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          // Refresh portfolio data
          console.log('Property added successfully!');
        }}
      />
    </>
  );
}
```

---

## 📚 Key Design Decisions

1. **Draft Persistence:** Auto-save after each step, resume from last step
2. **Validation:** Per-step validation, all errors shown on review
3. **Progressive Disclosure:** Required fields first, optional fields later
4. **Skip Functionality:** Loan and rental steps can be skipped
5. **State Management:** Single draft object, updated incrementally
6. **Error Handling:** Clear error messages, validation before navigation

---

## 🎯 Next Steps

1. Implement `useRealEstateDraft` hook
2. Create main modal component
3. Build each step component
4. Implement API endpoints
5. Add to portfolio page (trigger modal)
6. Test complete flow
7. Add edit mode support (pre-fill from existing asset)

---

## 📖 Reference

- **Schema:** `supabase/migrations/real_estate_schema.sql`
- **Analytics:** `REAL_ESTATE_ANALYTICS_DESIGN.md`
- **Valuation:** `REAL_ESTATE_VALUATION_SERVICE_DESIGN.md`
- **Insights:** `REAL_ESTATE_INSIGHTS_ENGINE_DESIGN.md`
- **Implementation:** `REAL_ESTATE_ONBOARDING_IMPLEMENTATION.md`

---

**Status:** Ready for component implementation! 🚀
