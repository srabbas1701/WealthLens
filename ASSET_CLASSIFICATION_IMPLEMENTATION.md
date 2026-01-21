# Asset Classification System Implementation

**Status:** ✅ Core Infrastructure Complete  
**Date:** January 2025

---

## 🎯 Overview

This document describes the implementation of a regulator-aligned, investor-proof asset classification system that groups assets by economic behavior and risk-return characteristics, NOT by product names.

---

## ✅ Completed Components

### 1. Database Migration (`006_add_asset_classification_fields.sql`)

**New Fields Added to `assets` table:**
- `top_level_bucket`: User-facing grouping (Growth, IncomeAllocation, Commodity, RealAsset, Cash, Insurance, Liability)
- `risk_behavior`: Risk-return behavior (Growth, Defensive, Hedge, Liquidity, Protection, Obligation)
- `valuation_method`: How asset is valued (MarketLinked, InterestBased, NAVBased, Manual)
- Updated `asset_class` enum to match new system

**New Fields Added to `holdings` table:**
- Denormalized classification fields for fast queries without joins
- Automatic sync via triggers when asset classification changes

**Key Features:**
- Automatic classification sync from assets to holdings
- Indexes for fast classification lookups
- Database constraints to enforce valid values

### 2. Asset Classification Service (`src/lib/asset-classification.ts`)

**Core Function: `classifyAsset()`**
- Maps product types (asset_type) to complete classification
- Handles special cases: ULIP, NPS, Mutual Funds, ETFs
- Supports metadata for fund allocation splits

**Key Mappings:**
- **Equity**: Stocks, Equity MFs, Equity ETFs, ELSS
- **Fixed Income**: FDs, Bonds, PPF, EPF, Debt MFs
- **Hybrid**: NPS (if not split), ULIP (if not split), Hybrid MFs
- **Commodity**: Gold, Silver, Gold ETFs
- **Real Asset**: Real Estate, Land, REITs
- **Cash**: Cash, Savings, Liquid Funds
- **Insurance**: Term Life, Health Insurance
- **Liability**: Loans, Credit Card Dues

**Helper Functions:**
- `getTopLevelBucketLabel()`: User-facing labels
- `getAssetClassLabel()`: Asset class labels
- `isIncludedInNetWorth()`: Excludes Insurance
- `isIncludedInAllocation()`: Excludes Insurance & Liabilities
- Tooltip generators for UI

### 3. Portfolio Classification Aggregation (`src/lib/portfolio-classification-aggregation.ts`)

**Core Function: `aggregateByClassification()`**
- Classifies all holdings using new system
- Groups by top-level buckets
- Calculates net worth (excludes Insurance, includes Liabilities as negative)
- Builds allocation (excludes Insurance & Liabilities)
- Tracks insurance coverage separately

**Key Features:**
- Income & Allocation breakdown (Fixed Income + Hybrid)
- Bucket-level aggregations
- Asset class-level aggregations
- Net worth calculation with proper exclusions

### 4. Validation Rules (`src/lib/asset-classification-validations.ts`)

**Validation Functions:**
- `validateInsuranceNotInNetWorth()`: Ensures Insurance never inflates net worth
- `validateULIPClassification()`: Ensures ULIP doesn't default to Equity
- `validateCashClassification()`: Ensures Cash isn't grouped as Fixed Income
- `validateHybridClassification()`: Ensures Hybrid isn't merged into Equity
- `validateNetWorthCalculation()`: Validates Net Worth = Assets - Liabilities
- `validateAllocationData()`: Ensures allocation excludes Insurance & Liabilities

**Usage:**
```typescript
import { validateAll } from '@/lib/asset-classification-validations';

const result = validateAll(holdings, calculatedNetWorth, allocation);
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
```

---

## 🔄 Migration Path

### Step 1: Run Database Migration

```bash
# Apply the migration
supabase migration up
```

### Step 2: Backfill Existing Assets

Create a script to classify existing assets:

```typescript
// scripts/backfill-classification.ts
import { classifyAsset } from '@/lib/asset-classification';
import { createAdminClient } from '@/lib/supabase/server';

async function backfillClassifications() {
  const supabase = createAdminClient();
  
  // Get all assets
  const { data: assets } = await supabase.from('assets').select('*');
  
  for (const asset of assets || []) {
    const classification = classifyAsset(asset.asset_type, {
      // Add metadata if available
    });
    
    await supabase
      .from('assets')
      .update({
        asset_class: classification.assetClass,
        top_level_bucket: classification.topLevelBucket,
        risk_behavior: classification.riskBehavior,
        valuation_method: classification.valuationMethod,
      })
      .eq('id', asset.id);
  }
}
```

### Step 3: Update API Routes

**Pattern for updating API routes:**

```typescript
import { aggregateByClassification } from '@/lib/portfolio-classification-aggregation';
import { validateAll } from '@/lib/asset-classification-validations';

// In your API route:
const classificationAgg = aggregateByClassification(holdings);

// Use classificationAgg.netWorth instead of totalValue
// Use classificationAgg.allocation for charts
// Use classificationAgg.buckets for UI grouping

// Validate
const validation = validateAll(
  holdings,
  classificationAgg.netWorth,
  classificationAgg.allocation
);
```

### Step 4: Update UI Components

**Dashboard (`src/app/dashboard/page.tsx`):**
- Use `classificationAgg.buckets` for top-level grouping
- Show "Income & Allocation" with drill-down to Fixed Income and Hybrid
- Display Insurance separately as "Protection Coverage"
- Show Liabilities separately

**Portfolio Summary (`src/app/portfolio/summary/page.tsx`):**
- Group by top-level buckets
- Expand "Income & Allocation" to show Fixed Income and Hybrid
- Add tooltips using `getBucketTooltip()` and `getAssetClassTooltip()`

---

## 📊 Top-Level Structure (LOCKED)

```
Net Worth
 ├── Growth Assets
 │    └── Equity
 │
 ├── Income & Allocation
 │    ├── Fixed Income (Debt)
 │    └── Hybrid / Allocation
 │
 ├── Commodities
 │
 ├── Real Assets
 │
 ├── Cash & Liquidity
 │
 ├── Insurance (Protection)
 │
 └── Liabilities
```

**DO NOT rename these unless explicitly instructed.**

---

## 🔥 ULIP & NPS Handling

### Preferred (If fund split data exists)

Split internally:
- ULIP / NPS → Equity portion → Equity
- ULIP / NPS → Debt portion → Fixed Income
- ULIP / NPS → Cash portion → Cash (if applicable)
- Insurance cover → Insurance (Protection)

### Fallback (If split NOT available)

- ULIP → Hybrid / Allocation
- NPS → Hybrid / Allocation

**⚠️ Never classify ULIP directly as Equity unless fund-level breakup exists.**

---

## 📊 Analytics Rules

### Asset Allocation Charts

Include ONLY:
- Equity
- Fixed Income
- Hybrid
- Commodities
- Real Assets
- Cash

**🚫 Exclude Insurance & Liabilities.**

### Net Worth Calculation

```
Net Worth = (All Assets except Insurance) − Liabilities
```

Insurance must be displayed separately as Protection Coverage.

---

## 🔐 Validation Rules (ENFORCED)

- ❌ Insurance must never inflate net worth
- ❌ ULIP must not default to Equity
- ❌ Cash must not be grouped as Fixed Income
- ❌ Hybrid must not be merged into Equity

---

## 🧪 Test Scenarios

1. **ULIP with 70% equity, 30% debt** → split correctly
2. **NPS without allocation data** → Hybrid
3. **FD + Savings** → Fixed Income + Cash
4. **Real Estate + Home Loan** → Asset + Liability
5. **Gold ETF** → Commodity

---

## 🚀 Next Steps

1. **Update API Routes:**
   - `/api/portfolio/data/route.ts` - Use new classification aggregation
   - `/api/portfolio/upload/confirm/route.ts` - Classify assets on creation
   - Other portfolio APIs

2. **Update UI Components:**
   - Dashboard: Show new bucket structure
   - Portfolio Summary: Group by buckets
   - Add tooltips for Income & Allocation, Hybrid, ULIP

3. **Update Analytics:**
   - Risk scoring using new classification
   - Exposure analytics using new buckets
   - Portfolio intelligence using new structure

4. **Backfill Existing Data:**
   - Run classification backfill script
   - Verify all assets are classified correctly
   - Test with real user data

---

## 📝 Notes

- The old `getAssetClass()` function is kept for backward compatibility but should be migrated
- Classification is computed at read-time, not stored (except for denormalized fields in holdings)
- ULIP/NPS splitting should be handled in the application layer when allocation data is available
- Real Estate is handled separately (already has its own table and logic)

---

## ✅ Success Criteria

The implementation should:
- ✅ Match institutional portfolio theory
- ✅ Align with Indian regulatory reality
- ✅ Simplify UX without losing correctness
- ✅ Support future analytics & scoring
- ✅ Survive scrutiny by CFPs & CAs

---

## 🔗 Related Files

- `supabase/migrations/006_add_asset_classification_fields.sql` - Database migration
- `src/lib/asset-classification.ts` - Classification service
- `src/lib/portfolio-classification-aggregation.ts` - Aggregation logic
- `src/lib/asset-classification-validations.ts` - Validation rules
- `src/lib/portfolio-calculations.ts` - Updated (backward compatible)
