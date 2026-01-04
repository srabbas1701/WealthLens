# Manual Investment Entry System

## Overview

This document describes the **Manual Investment Entry** system for WealthLens, which allows users to add and manage non-market instruments to their portfolios:

- **Fixed Deposits (FD)**
- **Bonds / Debentures**
- **Gold** (SGB / Physical / ETF)
- **Cash / Savings**

This system is **insight-only** (no advisory), complements the CSV upload flow, and reuses the same component in both onboarding and dashboard contexts.

---

## Architecture

### Component Structure

```
ManualInvestmentModal
├── Entry Step (Asset Type Selection + Forms)
├── Preview Step (Review Before Save)
├── Saving Step (Loading Indicator)
├── Success Step (Confirmation)
└── Error Step (Retry)
```

### API Routes

```
POST /api/investments/manual
├── Validate form data
├── Get or create portfolio
├── Create asset record
├── Upsert holding
├── Recalculate portfolio_metrics
└── Regenerate portfolio_insights
```

---

## Data Model

### Asset Storage

**Key Design Decision:** All manual investments are stored as **quantity = 1** because they are not traded in markets and have fixed values.

```sql
-- Assets Table
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  name VARCHAR,              -- e.g., "HDFC Bank", "NTPC Bond", "Gold (SGB)"
  symbol VARCHAR,            -- First 10 chars of name (auto-generated)
  asset_type VARCHAR,        -- 'fd', 'bond', 'gold', 'cash'
  asset_metadata JSONB,      -- Type-specific data
  is_manual BOOLEAN,         -- true for manual entries
  created_at TIMESTAMP
);

-- Holdings Table (unchanged)
CREATE TABLE holdings (
  id UUID PRIMARY KEY,
  portfolio_id UUID,
  asset_id UUID,
  quantity NUMERIC,          -- Always 1 for manual
  average_price NUMERIC,     -- Equals invested_value
  invested_value NUMERIC,    -- Principal / Amount entered
  current_value NUMERIC,     -- Equals invested_value (MVP)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Asset Metadata Structure

#### FD
```json
{
  "institution": "HDFC Bank",
  "principal": 100000,
  "interest_rate": 6.5,
  "start_date": "2024-01-15",
  "maturity_date": "2025-01-15",
  "risk_bucket": "low"
}
```

#### Bond
```json
{
  "issuer": "NTPC Ltd",
  "coupon_rate": 7.5,
  "coupon_frequency": "annual",
  "maturity_date": "2030-12-31",
  "risk_bucket": "medium"
}
```

#### Gold
```json
{
  "type": "sgb",  // or "physical", "etf"
  "purchase_date": "2024-01-10",
  "risk_bucket": "medium"
}
```

#### Cash
```json
{
  "account_type": "Savings Account",
  "risk_bucket": "low"
}
```

---

## Risk Bucket Assignment

Automatic risk classification (no user input required):

| Asset Type | Risk Bucket | Reasoning |
|---|---|---|
| FD | Low | Guaranteed returns |
| Cash | Low | Liquidity + safety |
| Bond | Medium | Fixed income, some credit risk |
| Gold | Medium | Hedging asset, moderate volatility |

**Used for:** Portfolio risk scoring and diversification insights.

---

## UI/UX Flow

### 1. Entry Step

User selects asset type, then fills asset-specific form:

**FD Form:**
- Bank / Institution (text)
- Principal (₹)
- Interest Rate (%)
- Start Date
- Maturity Date

**Bond Form:**
- Issuer Name (text)
- Invested Amount (₹)
- Coupon Rate (%)
- Coupon Frequency (dropdown)
- Maturity Date

**Gold Form:**
- Type (SGB / Physical / ETF)
- Invested Amount (₹)
- Purchase Date

**Cash Form:**
- Amount (₹)
- Account Type (text)

### 2. Preview Step

Summary card showing:
- Asset name
- Investment amount
- Key details (rate, maturity, etc.)
- Confirmation message

### 3. Save & Completion

- `Saving Step`: Loading spinner
- `Success Step`: Confirmation + redirect hint
- `Error Step`: Error message + retry button

---

## Integration Points

### 1. Onboarding Flow

```tsx
// In src/app/onboarding/page.tsx
import ManualInvestmentModal from '@/components/ManualInvestmentModal';

export default function OnboardingPage() {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <ManualInvestmentModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        userId={user?.id}
        source="onboarding"
        onSuccess={() => {
          // Refresh portfolio data
          setIsManualOpen(false);
        }}
      />
    </>
  );
}
```

### 2. Dashboard Flow

```tsx
// In src/app/dashboard/page.tsx (or separate component)
import ManualInvestmentModal from '@/components/ManualInvestmentModal';

export default function DashboardPage() {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <button onClick={() => setIsManualOpen(true)}>
        Add Investment
      </button>

      <ManualInvestmentModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        userId={user?.id}
        source="dashboard"
        onSuccess={() => {
          // Refresh portfolio data
          setIsManualOpen(false);
        }}
      />
    </>
  );
}
```

### 3. Edit Existing Investment

```tsx
<ManualInvestmentModal
  isOpen={isEditOpen}
  onClose={() => setIsEditOpen(false)}
  userId={user?.id}
  editingHoldingId={selectedHolding.id}
  editingData={{
    assetType: 'fd',
    fdInstitution: 'HDFC Bank',
    fdPrincipal: 100000,
    // ... other fields
  }}
  source="dashboard"
  onSuccess={() => {
    setIsEditOpen(false);
    // Refresh portfolio
  }}
/>
```

---

## Backend Logic

### API Endpoint: POST /api/investments/manual

**Request Body:**
```typescript
{
  user_id: string;
  portfolio_id?: string;        // Auto-created if not provided
  form_data: ManualInvestmentFormData;
  editing_holding_id?: string;  // For edit operations
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
  holding_id?: string;
  asset_id?: string;
}
```

### Processing Steps

1. **Validate** form data (type-specific validation)
2. **Get or Create Portfolio** (if not provided)
3. **Create Asset Record**
   - Determine asset type and metadata
   - Store in `assets` table with `is_manual = true`
4. **Upsert Holding**
   - If edit: update existing holding
   - If new: create new holding with `quantity = 1`
5. **Recalculate Metrics**
   - Fetch all holdings for portfolio
   - Calculate allocations (equity%, debt%, etc.)
   - Compute concentration risk
   - Assign risk score
6. **Regenerate Insights**
   - Deactivate old insights
   - Generate new insights based on metrics

### Edit vs. Create

| Operation | Behavior |
|---|---|
| **Create** | New asset created, new holding inserted |
| **Edit** | Existing asset metadata updated, existing holding updated (quantity stays 1) |

**Important:** Edits update the **existing holding**, not creating duplicates.

---

## Computing Portfolio Totals

After any manual investment save, metrics are **automatically recomputed**:

```typescript
// Fetch all holdings
const holdings = await db.from('holdings')
  .select('*, asset:assets(*)')
  .eq('portfolio_id', portfolioId);

// Calculate by asset type
let totalValue = 0;
let equityValue = 0;
let debtValue = 0;
let goldValue = 0;
let cashValue = 0;

holdings.forEach(h => {
  totalValue += h.current_value;
  
  if (h.asset.asset_type === 'equity') equityValue += h.current_value;
  if (h.asset.asset_type === 'bond') debtValue += h.current_value;
  if (h.asset.asset_type === 'gold') goldValue += h.current_value;
  if (h.asset.asset_type === 'cash') cashValue += h.current_value;
});

// Calculate percentages
const equityPct = (equityValue / totalValue) * 100;
const debtPct = (debtValue / totalValue) * 100;
// ... etc

// Upsert metrics
await db.from('portfolio_metrics').upsert({
  portfolio_id: portfolioId,
  total_value: totalValue,
  equity_pct: equityPct,
  debt_pct: debtPct,
  gold_pct: goldPct,
  cash_pct: cashPct,
  // ... other metrics
});
```

---

## Security & Validation

### Form Validation (Frontend)

- All required fields must be filled
- Amounts must be > 0
- Dates must be valid
- Maturity date must be after start date (for FD)

### Backend Validation

- User ID must exist
- Portfolio must belong to authenticated user (via RLS)
- All amounts parsed and validated
- No trust in calculated values from user

### Rate Limiting

- Consider adding rate limiting on API route (e.g., max 5 manual entries per 5 min)

---

## Future Enhancements

### Phase 2: Market Sync
- Periodically update `current_value` for gold (via market data API)
- Include FD maturity notifications

### Phase 3: Advanced Insights
- "FD ladder" analysis (maturity dates spread over time)
- Bond duration risk
- Gold allocation recommendations

### Phase 4: Bulk Operations
- Import manual investments from CSV
- Batch edit multiple holdings

---

## Testing

### Test Cases

1. **Create FD** → Verify asset created, holding inserted, metrics updated
2. **Create Bond** → Check coupon frequency saved correctly
3. **Create Gold (SGB)** → Verify type stored in metadata
4. **Create Cash** → Verify amount added to portfolio
5. **Edit Existing** → Verify holding updated, no duplicates
6. **Error Handling** → Missing fields, invalid dates, DB errors

### Manual Testing Checklist

- [ ] Modal opens/closes correctly
- [ ] Form validation triggers on submit
- [ ] Preview shows correct data
- [ ] Save completes and redirects
- [ ] Dashboard reflects updated totals
- [ ] Edit opens with pre-filled data
- [ ] Update saves without creating duplicate
- [ ] Error messages display clearly

---

## Type Safety

All types are defined in `src/types/manual-investments.ts`:

```typescript
export type ManualAssetType = 'fd' | 'bond' | 'gold' | 'cash';
export interface FixedDepositData { ... }
export interface BondData { ... }
export interface GoldData { ... }
export interface CashData { ... }
export type ManualInvestmentFormData = FixedDepositData | BondData | GoldData | CashData;
```

**Benefits:**
- TypeScript catches form field mismatches
- Backend validation matches frontend types
- Self-documenting code

---

## Troubleshooting

### "Portfolio not found"
→ User record not created in `public.users` table. Check `useAuth()` hook creates record on sign-up.

### "Asset creation failed"
→ Symbol field may be exceeding length limit. Check in `createAsset()` function.

### "Holdings not updating totals"
→ RLS policy may be blocking read. Verify `portfolio_metrics` RLS allows authenticated user to read their own metrics.

### Modal doesn't close after success
→ Check `onSuccess` callback is being called and `handleClose()` is triggering.

---

## File References

- **Component:** `src/components/ManualInvestmentModal.tsx`
- **API Route:** `src/app/api/investments/manual/route.ts`
- **Types:** `src/types/manual-investments.ts`
- **Icons:** `src/components/icons.tsx` (already includes all needed icons)

---

## Design Philosophy

✅ **What This System Does:**
- Records non-market investments accurately
- Maintains portfolio integrity
- Supports repeated uploads safely (edit, not duplicate)
- Provides calm, jargon-free UX
- Keeps portfolio data trustworthy

❌ **What This System Doesn't Do:**
- Provide trading advice
- Calculate taxes or returns
- Recommend asset types
- Show advisory language

---

## Questions?

Refer to the inline comments in:
- `ManualInvestmentModal.tsx` (UX logic)
- `route.ts` (backend data flow)
- `manual-investments.ts` (type definitions)


