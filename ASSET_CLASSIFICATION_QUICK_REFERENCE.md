# Asset Classification Quick Reference

## 🎯 Core Principle

**Assets grouped by economic behavior, NOT product names.**

Products like ULIP, NPS, Mutual Funds are wrappers, not asset classes.

---

## 📋 Top-Level Buckets (User-Facing)

| Bucket | Contains | Excluded from Net Worth? |
|--------|----------|-------------------------|
| **Growth Assets** | Equity | No |
| **Income & Allocation** | Fixed Income, Hybrid | No |
| **Commodities** | Gold, Silver | No |
| **Real Assets** | Real Estate, Land, REITs | No |
| **Cash & Liquidity** | Cash, Savings, Liquid Funds | No |
| **Insurance** | Term Life, Health Insurance | **Yes** |
| **Liabilities** | Loans, Credit Card Dues | No (subtracted) |

---

## 🗺️ Product-to-Asset-Class Mapping

### Equity (Growth Assets)
- Stocks (`equity`)
- Equity Mutual Funds (`mutual_fund` with `isEquityMF: true`)
- Equity ETFs (`etf` - default)
- ELSS (`elss`)

### Fixed Income (Income & Allocation)
- Fixed Deposits (`fd`)
- Bonds (`bond`)
- PPF (`ppf`)
- EPF (`epf`)
- Debt Mutual Funds (`mutual_fund` with `isDebtMF: true`)

### Hybrid (Income & Allocation)
- NPS (`nps` - if no allocation data)
- ULIP (`ulip` - if no allocation data)
- Hybrid Mutual Funds (`mutual_fund` with `isHybridMF: true`)

### Commodity
- Gold (`gold`)
- Silver (`silver`)
- Gold ETFs (`etf` with `isGoldETF: true`)

### Real Asset
- Real Estate (`real_estate`)
- Land (`land`)
- REITs (`reit`)

### Cash
- Cash (`cash`)
- Savings Account (`savings`)
- Liquid Funds (`liquid_fund`)
- Overnight Funds (`overnight_fund`)

### Insurance
- Term Life Insurance (`term_insurance`)
- Health Insurance (`health_insurance`)

### Liability
- Home Loan (`home_loan`)
- Personal Loan (`personal_loan`)
- Education Loan (`education_loan`)
- Credit Card Dues (`credit_card`)

---

## 💻 Code Usage

### Classify an Asset

```typescript
import { classifyAsset } from '@/lib/asset-classification';

const classification = classifyAsset('ulip', {
  ulipNpsAllocation: {
    equityPct: 70,
    debtPct: 30,
  },
});

// Returns:
// {
//   assetClass: 'Equity', // or 'FixedIncome' if debtPct > equityPct
//   topLevelBucket: 'Growth',
//   riskBehavior: 'Growth',
//   valuationMethod: 'NAVBased',
// }
```

### Aggregate Portfolio

```typescript
import { aggregateByClassification } from '@/lib/portfolio-classification-aggregation';

const aggregation = aggregateByClassification(holdings);

// Use:
// - aggregation.netWorth (excludes Insurance, includes Liabilities as negative)
// - aggregation.allocation (excludes Insurance & Liabilities)
// - aggregation.buckets (grouped by top-level buckets)
// - aggregation.insuranceCoverage (separate tracking)
```

### Validate Classification

```typescript
import { validateAll } from '@/lib/asset-classification-validations';

const validation = validateAll(holdings, netWorth, allocation);

if (!validation.isValid) {
  console.error('Errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}
```

---

## 🔥 ULIP & NPS Special Handling

### With Allocation Data (Preferred)

```typescript
// Split ULIP into multiple holdings
const ulipClassification = classifyAsset('ulip', {
  ulipNpsAllocation: {
    equityPct: 70,
    debtPct: 30,
    insuranceCover: 1000000,
  },
});

// Create separate holdings:
// 1. Equity holding (70% of investment)
// 2. Fixed Income holding (30% of investment)
// 3. Insurance coverage (tracked separately, not in net worth)
```

### Without Allocation Data (Fallback)

```typescript
// Classify as Hybrid
const ulipClassification = classifyAsset('ulip');
// Returns: { assetClass: 'Hybrid', topLevelBucket: 'IncomeAllocation', ... }
```

---

## 📊 Net Worth Calculation

```typescript
// Correct formula:
const netWorth = totalAssets - totalLiabilities;
// Where:
// - totalAssets = all holdings except Insurance
// - totalLiabilities = all liability holdings (subtracted)
// - Insurance = tracked separately, not in net worth
```

---

## 🚫 Validation Rules

1. **Insurance must never inflate net worth**
   ```typescript
   if (assetClass === 'Insurance') {
     // Exclude from net worth calculation
   }
   ```

2. **ULIP must not default to Equity**
   ```typescript
   if (assetType === 'ulip' && !hasAllocationData) {
     // Classify as Hybrid, not Equity
   }
   ```

3. **Cash must not be grouped as Fixed Income**
   ```typescript
   if (assetType === 'cash' || assetType === 'savings') {
     // Classify as Cash, not FixedIncome
   }
   ```

4. **Hybrid must not be merged into Equity**
   ```typescript
   if (assetType === 'nps' || assetType === 'ulip') {
     // Classify as Hybrid (if no split), not Equity
   }
   ```

---

## 🎨 UI Labels & Tooltips

### Top-Level Bucket Labels

```typescript
import { getTopLevelBucketLabel } from '@/lib/asset-classification';

getTopLevelBucketLabel('IncomeAllocation'); // "Income & Allocation"
getTopLevelBucketLabel('Growth'); // "Growth Assets"
```

### Asset Class Labels

```typescript
import { getAssetClassLabel } from '@/lib/asset-classification';

getAssetClassLabel('FixedIncome'); // "Fixed Income"
getAssetClassLabel('Hybrid'); // "Hybrid / Allocation"
```

### Tooltips

```typescript
import { getBucketTooltip, getAssetClassTooltip, getULIPTooltip } from '@/lib/asset-classification';

getBucketTooltip('IncomeAllocation');
// "Assets designed to provide stability, income, or balanced exposure across asset classes."

getAssetClassTooltip('Hybrid');
// "Investments that dynamically allocate across equity and debt to manage risk."

getULIPTooltip();
// "A life insurance product with market-linked investments that may invest in equity, debt, or both."
```

---

## ✅ Checklist for Implementation

- [ ] Run database migration (`006_add_asset_classification_fields.sql`)
- [ ] Backfill existing assets with classification
- [ ] Update API routes to use `aggregateByClassification()`
- [ ] Update net worth calculation to exclude Insurance
- [ ] Update allocation charts to exclude Insurance & Liabilities
- [ ] Update UI to show new bucket structure
- [ ] Add tooltips for Income & Allocation, Hybrid, ULIP
- [ ] Add validation checks in critical paths
- [ ] Test with ULIP (with and without allocation data)
- [ ] Test with NPS (with and without allocation data)
- [ ] Verify Insurance is excluded from net worth
- [ ] Verify Liabilities are subtracted from net worth

---

## 📚 Related Documentation

- `ASSET_CLASSIFICATION_IMPLEMENTATION.md` - Full implementation guide
- `src/lib/asset-classification.ts` - Classification service
- `src/lib/portfolio-classification-aggregation.ts` - Aggregation logic
- `src/lib/asset-classification-validations.ts` - Validation rules
