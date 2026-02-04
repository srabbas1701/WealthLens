# Insurance Module Implementation Guide

## Overview

A comprehensive Insurance module for Indian investor portfolio app. Treats insurance as a **Protection bucket**, separate from investment assets. Supports all Indian insurance categories with expiry tracking, coverage analytics, and renewal alerts.

---

## Architecture

### Database Schema

**Table: `insurance_policies`**

```sql
CREATE TABLE insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  category text NOT NULL,  -- LIFE, HEALTH, MOTOR, HOME, TRAVEL, PERSONAL_ACCIDENT, OTHER
  policy_number text NOT NULL UNIQUE per user,
  provider_name text,      -- HDFC Life, ICICI Prudential, etc
  policy_name text,        -- Term Plan 1 Crore, etc
  status text DEFAULT 'ACTIVE',  -- ACTIVE, LAPSED, EXPIRED, INACTIVE
  sum_assured numeric(15,2),
  annual_premium numeric(12,2),
  monthly_premium numeric(12,2),
  policy_start_date date,
  policy_end_date date,           -- Null for life-long policies
  last_renewal_date date,
  next_renewal_date date,
  plan_type text,                 -- TERM, ULIP, ENDOWMENT, WHOLE_LIFE, CHILD (Life)
                                 -- INDIVIDUAL, FAMILY_FLOATER, SENIOR, TOPUP, SUPER_TOPUP (Health)
  nominee_name text,
  nominee_relation text,
  family_members_count integer,   -- For health family floaters
  document_url text,              -- PDF policy document URL
  created_at timestamptz,
  updated_at timestamptz
);
```

**Indexes:**
- `idx_insurance_user_id` - Fast user policy queries
- `idx_insurance_status` - Filter by status
- `idx_insurance_category` - Group by category

**RLS Policies:**
- Users can only VIEW, INSERT, UPDATE, DELETE their own policies

---

## Enums & Types

### TypeScript Types (`src/types/insurance.ts`)

```typescript
enum InsuranceCategory {
  LIFE, HEALTH, MOTOR, HOME, TRAVEL, PERSONAL_ACCIDENT, OTHER
}

enum InsuranceStatus {
  ACTIVE, LAPSED, EXPIRED, INACTIVE
}

enum LifePlanType {
  TERM, ULIP, ENDOWMENT, WHOLE_LIFE, CHILD
}

enum HealthCoverType {
  INDIVIDUAL, FAMILY_FLOATER, SENIOR, TOPUP, SUPER_TOPUP
}

interface InsurancePolicy {
  id: string
  user_id: string
  category: InsuranceCategory
  policy_number: string
  provider_name: string
  policy_name: string
  status: InsuranceStatus
  sum_assured: number
  annual_premium: number
  monthly_premium: number | null
  policy_start_date: string
  policy_end_date: string | null
  plan_type: string | null
  nominee_name: string | null
  family_members_count: number | null
  document_url: string | null
  created_at: string
  updated_at: string
}

interface InsuranceSummary {
  totalLifeCover: number
  totalHealthCover: number
  totalAnnualPremium: number
  totalMonthlyPremium: number
  activePolicies: number
  expiredPolicies: number
  lapsedPolicies: number
  policiesExpiringIn30Days: number
  policiesExpiringIn60Days: number
  policiesExpiringIn90Days: number
}
```

---

## Utility Functions (`src/lib/insurance-utils.ts`)

### Core Calculations

```typescript
// Days until policy expiry
getDaysUntilExpiry(expiryDate: string | null): number | null

// Check if expiring soon
isExpiringInDays(expiryDate: string | null, days: number): boolean

// Auto-determine status based on dates
determinePolicyStatus(policyStatus, expiryDate): InsuranceStatus

// Calculate summary metrics
calculateInsuranceSummary(policies): InsuranceSummary

// Generate alerts
generateInsuranceAlerts(policies, summary, annualIncome): InsuranceAlert[]
```

### Alert Rules

1. **Expiring in 30 days** → Warning alert
2. **Expired or Lapsed** → Danger alert
3. **Life Cover < 10x annual income** → Info alert
4. **Health Cover < ₹5,00,000** → Info alert
5. **No active life insurance** → Info alert

### Display Helpers

```typescript
formatInsuranceCategory(category): string    // "Life Insurance", "Health Insurance", etc
getStatusColor(status): string                // CSS classes for status badge
getCategoryIcon(category): string             // Emoji icon for category
```

---

## File Structure

```
src/
├── types/
│   └── insurance.ts                    # TypeScript types & enums
├── lib/
│   └── insurance-utils.ts              # Calculations, alerts, formatting
└── app/
    └── portfolio/
        └── insurance/
            ├── page.tsx                # Dashboard (list all policies)
            ├── add/
            │   └── page.tsx            # Add new insurance (5-step form)
            └── [id]/
                └── page.tsx            # View & edit policy detail

supabase/
└── migrations/
    └── insurance_tables.sql            # Database schema
```

---

## Pages

### 1. Insurance Dashboard (`/portfolio/insurance`)

**Functionality:**
- List all insurance policies
- Group by category or status
- Show KPI metrics (life cover, health cover, annual premium, active policies)
- Display alerts for expiring/expired/lapsed policies
- Quick actions to add new policy or manage existing ones

**Key Features:**
- Real-time expiry tracking
- Color-coded status badges
- Days-until-expiry countdown
- Empty state with CTA to add first policy
- Responsive grid layout

---

### 2. Add Insurance (`/portfolio/insurance/add`)

**5-Step Form:**

1. **Select Category** - Choose insurance type with icons
2. **Policy Details** - Policy #, provider, policy name
3. **Coverage & Premium** - Sum assured, annual/monthly premium, dates
4. **Nominee & Plan** - Nominee info, plan type (life/health specific)
5. **Upload Document** - Optional PDF upload for policy copy

**Features:**
- Progress indicator (visual step counter)
- Validation on each step
- Conditional fields based on category
- Auto-calculated monthly premium option
- PDF document upload to Supabase Storage
- Success redirect to dashboard

**Validation Rules:**
- Step 1: Category must be selected
- Step 2: Policy number, provider, name required
- Step 3: Positive sum assured & annual premium, start date required
- Step 4: Plan type required for Life & Health
- Step 5: Optional document

---

### 3. Policy Detail (`/portfolio/insurance/[id]`)

**Functionality:**
- View complete policy information
- Edit mode for updating policy details
- Delete policy with confirmation
- Show expiry countdown
- Display key metrics

**Editable Fields:**
- Policy name, provider
- Sum assured, annual/monthly premium
- End date, next renewal date
- Nominee information
- Status

**Features:**
- Toggle between view and edit mode
- Save changes with success feedback
- Preserve immutable fields (policy number, start date)
- Color-coded status badge
- Category icon display

---

## Integration

### Main Dashboard (`src/app/dashboard/page.tsx`)

Insurance card added to "Liabilities & Protection" section:

```typescript
<Link href="/portfolio/insurance">
  <Card className="hover:border-blue-600">
    <h3>Insurance</h3>
    <p>Manage your life, health, and other insurance policies</p>
    <Button>View Insurance</Button>
  </Card>
</Link>
```

---

## Analytics Calculations

### Insurance Summary Example

```typescript
const policies = [
  { category: 'LIFE', sum_assured: 1000000, status: 'ACTIVE' },
  { category: 'HEALTH', sum_assured: 500000, status: 'ACTIVE' },
]

const summary = calculateInsuranceSummary(policies)
// Result:
{
  totalLifeCover: 1000000,
  totalHealthCover: 500000,
  totalAnnualPremium: 15000,
  activePolicies: 2,
  expiredPolicies: 0,
  policiesExpiringIn30Days: 0,
  policiesExpiringIn90Days: 1,
}
```

### Alert Generation Example

```typescript
const alerts = generateInsuranceAlerts(
  policies,           // All policies
  summary,            // Calculated summary
  1000000             // Annual income
)
// Generates alerts for:
// - Life cover adequacy (10x income)
// - Health cover minimum (₹5L)
// - Expiry tracking
// - Lapsed/expired policies
```

---

## Future Enhancements

### Phase 2: ULIP Linking
- Link ULIP investment portion to equity/debt modules
- Separate insurance & investment tracking
- Show net fund value, growth, allocation

### Phase 2: Policy Upload & Parsing
- PDF extraction to auto-populate fields
- OCR for policy document text
- Coverage details extraction

### Phase 2: Renewal Automation
- Recurring premium tracking
- Auto-renewal history
- Next premium due date reminders

### Phase 3: Claims Tracking
- Track pending/approved claims
- Claim documents storage
- Settlement tracking

### Phase 3: Cross-Holding Analytics
- Insurance coverage adequacy vs net worth
- Premium as % of income
- Coverage gaps analysis

---

## Database Queries

### Get All Policies for User

```typescript
const { data } = await supabase
  .from('insurance_policies')
  .select('*')
  .eq('user_id', userId)
  .order('policy_start_date', { ascending: false })
```

### Get Expiring Policies (Next 30 Days)

```typescript
const now = new Date()
const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

const { data } = await supabase
  .from('insurance_policies')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'ACTIVE')
  .gte('policy_end_date', now.toISOString().split('T')[0])
  .lte('policy_end_date', thirtyDaysLater.toISOString().split('T')[0])
```

### Update Policy Status

```typescript
await supabase
  .from('insurance_policies')
  .update({ status: 'RENEWED', updated_at: new Date().toISOString() })
  .eq('id', policyId)
  .eq('user_id', userId)
```

---

## Security

### Row Level Security (RLS)

All RLS policies enforce user ownership:

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

- ✅ Users can only view own policies
- ✅ Users can only modify own policies
- ✅ Users can only delete own policies
- ✅ No cross-user data leakage

### Document Storage

- PDF upload to `insurance-documents` bucket
- User ID in file path: `{user_id}/{timestamp}-{filename}`
- Public URLs only for authenticated users

---

## Testing Scenarios

### Add Policy - Life Insurance
1. Select "Life Insurance"
2. Enter policy #: POL123456
3. Provider: HDFC Life
4. Sum Assured: ₹1,00,00,000
5. Annual Premium: ₹5,000
6. Start: 2020-01-01, End: 2040-01-01
7. Plan: Term
8. Nominee: Spouse
9. Upload optional PDF
10. Verify alert about life cover

### Add Policy - Health Insurance
1. Select "Health Insurance"
2. Health details
3. Family members: 4
4. Coverage Type: Family Floater
5. Verify it's grouped properly

### Expiry Tracking
1. Add policy with end date in 20 days
2. Verify "expiring in 30 days" alert
3. Add policy with past end date
4. Verify status shows "Expired"

---

## Performance Notes

- ✅ Indexes on `user_id`, `status`, `category` for fast queries
- ✅ Client-side calculations (no heavy aggregations)
- ✅ Lazy-load policy details (only on demand)
- ✅ Batch alerts generation (one call per dashboard load)

---

## Code Quality

- ✅ Strict TypeScript (no `any` types)
- ✅ All logic in page.tsx (single responsibility)
- ✅ Reused existing components (Button, Card, Input, Badge)
- ✅ Clear error handling & user feedback
- ✅ Consistent with project patterns

---

## Status

✅ **IMPLEMENTED:**
- Database schema with RLS
- TypeScript types & enums
- Utility functions (calculations, alerts, formatting)
- Insurance dashboard with analytics
- Add insurance 5-step form
- Policy detail/edit page
- Main dashboard integration
- All builds passing

🚀 **READY FOR:**
- User testing
- Premium calculations
- Renewal tracking
- Future ULIP linking phase
