# Real Estate Analytics Engine - Implementation

**Status:** ✅ Complete  
**Date:** January 2025

---

## Overview

Production-ready analytics engine for Real Estate assets that computes:
- **Per-asset analytics** (7 metrics)
- **Portfolio-level analytics** (4 core metrics)

All calculations are:
- ✅ Ownership-percentage adjusted
- ✅ Loan-aware
- ✅ Conservative and explainable
- ✅ Typed using Supabase generated types

---

## File Location

**File:** `src/services/realEstateAnalytics.service.ts`

---

## Per-Asset Analytics (7 Metrics)

### 1. Current Estimated Value

**Function:** `getCurrentEstimatedValue()`

**Formula:**
```
Current Value = Valuation × (Ownership % / 100)

Valuation Priority:
1. user_override_value (highest)
2. (system_estimated_min + system_estimated_max) / 2
3. system_estimated_min OR system_estimated_max
4. purchase_price (fallback)
```

**Returns:** `{ value: number | null, source: 'user_override' | 'system_estimate' | 'purchase_price' }`

---

### 2. Unrealized Gain/Loss

**Function:** `calculateUnrealizedGainLoss()`

**Formula:**
```
Unrealized Gain/Loss = Current Value - Invested Value
Invested Value = purchase_price × (ownership % / 100)

Percentage = (Unrealized Gain/Loss / Invested Value) × 100
```

**Returns:** `{ absolute: number | null, percent: number | null }`

**Edge Cases:**
- Returns null if purchase_price missing
- Returns null if current value missing
- Handles negative values (loss)

---

### 3. Gross Rental Yield

**Function:** `calculateGrossRentalYield()`

**Formula:**
```
Gross Rental Yield = (Annual Rental Income / Current Value) × 100
Annual Rental Income = monthly_rent × 12 × (ownership % / 100)
```

**Returns:** `number | null` (percentage)

**Edge Cases:**
- Returns null if not rented
- Returns null if monthly_rent missing
- Returns null if current value is 0 (division by zero)

---

### 4. Net Rental Yield

**Function:** `calculateNetRentalYield()`

**Formula:**
```
Net Rental Yield = (Net Annual Income / Current Value) × 100

Net Annual Income = Annual Rental Income - Annual Expenses

Annual Rental Income = monthly_rent × 12 × (ownership % / 100)
Annual Expenses = (
  (maintenance_monthly × 12) +
  property_tax_annual +
  (other_expenses_monthly × 12)
) × (ownership % / 100)
```

**Returns:** `number | null` (percentage)

**Edge Cases:**
- Returns null if not rented
- Treats missing expenses as 0
- Handles negative yield (expenses exceed rent)

---

### 5. EMI vs Rent Gap

**Function:** `calculateEMIVsRentGap()`

**Formula:**
```
EMI vs Rent Gap = Monthly Rent (Ownership Adjusted) - Monthly EMI

Where:
  Monthly Rent (Ownership Adjusted) = monthly_rent × (ownership % / 100)
  Monthly EMI = emi (NOT ownership-adjusted)
```

**Returns:** `number | null` (₹)

**Interpretation:**
- Positive: Rent covers EMI (cash flow positive)
- Negative: EMI exceeds rent (cash flow negative)

**Note:** EMI is NOT ownership-adjusted (loan is per property)

---

### 6. Holding Period

**Function:** `calculateHoldingPeriod()`

**Formula:**
```
Holding Period = (Current Date - Purchase Date) / 365.25
```

**Returns:** `number | null` (years, rounded to 2 decimals)

**Edge Cases:**
- Returns null if purchase_date missing
- Returns 0 if purchase date in future
- Uses 365.25 to account for leap years

---

### 7. Loan-Adjusted XIRR

**Function:** `calculateLoanAdjustedXIRR()`

**Formula:**
```
XIRR = ((Net Current Value / Initial Investment)^(1/Holding Period) - 1) × 100

Where:
  Initial Investment = purchase_price × (ownership % / 100)
  Current Value = Current Estimated Value (ownership-adjusted)
  Loan Equity = outstanding_balance × (ownership % / 100)
  Net Current Value = Current Value - Loan Equity
```

**Returns:** `number | null` (percentage, rounded to 2 decimals)

**Edge Cases:**
- Returns null if purchase_price or purchase_date missing
- Returns null if holding period < 30 days
- Handles negative XIRR (loss scenario)
- Caps at ±999%

---

## Portfolio-Level Analytics (4 Core Metrics)

### 1. Total Real Estate Value

**Calculation:**
```typescript
Total Real Estate Value = SUM(Current Estimated Value for all properties)
```

**Returns:** `number` (₹)

---

### 2. % of Net Worth in Real Estate

**Calculation:**
```typescript
Real Estate Allocation % = (Total Real Estate Value / Total Net Worth) × 100
```

**Returns:** `number | null` (percentage, null if netWorth not provided)

**Edge Cases:**
- Returns null if totalNetWorth not provided
- Returns null if totalNetWorth is 0

---

### 3. Income vs Non-Income Split

**Calculation:**
```typescript
Income-Generating:
  Count: Properties where rental_status = 'rented'
  Value: SUM(Current Value where rental_status = 'rented')
  Percentage: (Income-Generating Value / Total Real Estate Value) × 100

Non-Income:
  Count: Properties where rental_status IN ('self_occupied', 'vacant')
  Value: SUM(Current Value where rental_status IN ('self_occupied', 'vacant'))
  Percentage: (Non-Income Value / Total Real Estate Value) × 100
```

**Returns:**
```typescript
{
  incomeGenerating: {
    count: number;
    value: number;
    percentage: number;
  };
  nonIncome: {
    count: number;
    value: number;
    percentage: number;
  };
}
```

---

### 4. Concentration Risk Per Property

**Calculation:**
```typescript
Property Concentration % = (Property Value / Total Real Estate Value) × 100
```

**Returns:** Array sorted by concentration (highest first)
```typescript
Array<{
  assetId: string;
  propertyName: string;
  concentrationPercent: number;
  value: number;
}>
```

---

## Additional Portfolio Metrics

The engine also calculates:
- **Total Rental Income (Annual)**: Sum of all annual rental income (ownership-adjusted)
- **Total EMI (Monthly)**: Sum of all EMIs (NOT ownership-adjusted)
- **Net Cash Flow (Monthly)**: Rental Income - EMI - Expenses

---

## Usage

### Calculate Per-Asset Analytics

```typescript
import { calculatePerAssetAnalytics } from '@/services/realEstateAnalytics.service';
import { getUserRealEstateAssets } from '@/lib/real-estate/get-assets';

const assets = await getUserRealEstateAssets(supabase, userId);

const analytics = assets.map((assetData) => 
  calculatePerAssetAnalytics(assetData)
);

// Result:
// {
//   assetId: "asset-123",
//   metrics: {
//     currentEstimatedValue: 6375000,
//     unrealizedGainLoss: 1125000,
//     unrealizedGainLossPercent: 21.43,
//     grossRentalYield: 7.06,
//     netRentalYield: 5.72,
//     emiVsRentGap: -7500,
//     holdingPeriodYears: 5.00,
//     loanAdjustedXIRR: -8.8
//   },
//   metadata: { ... }
// }
```

### Calculate Portfolio Analytics

```typescript
import { calculatePortfolioAnalytics } from '@/services/realEstateAnalytics.service';

const portfolioAnalytics = calculatePortfolioAnalytics(
  assets,
  totalNetWorth // Optional: null if not available
);

// Result:
// {
//   portfolioMetrics: {
//     totalRealEstateValue: 25000000,
//     realEstateAllocationPercent: 62.5,
//     totalRentalIncomeAnnual: 930000,
//     totalEMIMonthly: 80000,
//     netCashFlowMonthly: -12750
//   },
//   propertyConcentrations: [ ... ],
//   incomeBreakdown: { ... }
// }
```

### Calculate Complete Analytics

```typescript
import { calculateRealEstateAnalytics } from '@/services/realEstateAnalytics.service';

const analytics = calculateRealEstateAnalytics(
  assets,
  totalNetWorth // Optional
);

// Result:
// {
//   perAsset: [ ... ],  // Array of per-asset analytics
//   portfolio: { ... }   // Portfolio-level analytics
// }
```

---

## Key Features

### ✅ Ownership-Percentage Adjusted

All value calculations apply ownership percentage:
- Purchase price: `purchase_price × (ownership % / 100)`
- Current value: `valuation × (ownership % / 100)`
- Rental income: `monthly_rent × (ownership % / 100)`
- Expenses: `expenses × (ownership % / 100)`
- Loan balance: `outstanding_balance × (ownership % / 100)`

**Exception:** EMI is NOT ownership-adjusted (loan is per property)

### ✅ Loan-Aware

- Handles assets without loans (null loan)
- Uses outstanding balance in XIRR calculations
- Calculates EMI vs Rent gap
- Loan equity subtracted from current value for XIRR

### ✅ Conservative

- Uses midpoint of valuation range (not optimistic max)
- Handles missing data gracefully (returns null, not 0)
- Caps XIRR at ±999%
- Validates inputs before calculations

### ✅ Explainable

- Detailed function comments with formulas
- Clear variable names
- Step-by-step calculations
- Edge cases documented

### ✅ Type-Safe

- Uses Supabase generated types
- Fully typed function signatures
- No `any` types
- Compile-time type checking

---

## Edge Case Handling

### Missing Data
- Returns `null` when calculation cannot be performed
- Does NOT use 0 as fallback (0 has meaning, null means "cannot calculate")

### Division by Zero
- Returns `null` if denominator is 0
- Protected in yield calculations

### Invalid Dates
- Returns `null` if purchase_date missing
- Returns 0 if purchase date in future

### Negative Values
- Allows negative values (loss scenarios)
- Negative XIRR, negative cash flow, etc.

---

## Example Output

### Per-Asset Analytics

```typescript
{
  assetId: "123e4567-e89b-12d3-a456-426614174000",
  metrics: {
    currentEstimatedValue: 6375000,        // ₹63,75,000
    unrealizedGainLoss: 1125000,           // ₹11,25,000
    unrealizedGainLossPercent: 21.43,      // 21.43%
    grossRentalYield: 7.06,                // 7.06%
    netRentalYield: 5.72,                  // 5.72%
    emiVsRentGap: -7500,                   // -₹7,500 (negative)
    holdingPeriodYears: 5.00,              // 5.00 years
    loanAdjustedXIRR: -8.8                 // -8.8%
  },
  metadata: {
    valuationSource: "system_estimate",
    ownershipPercentage: 75,
    hasLoan: true,
    rentalStatus: "rented"
  }
}
```

### Portfolio Analytics

```typescript
{
  portfolioMetrics: {
    totalRealEstateValue: 25000000,        // ₹2,50,00,000
    realEstateAllocationPercent: 62.5,    // 62.5%
    totalRentalIncomeAnnual: 930000,       // ₹9,30,000
    totalEMIMonthly: 80000,                // ₹80,000
    netCashFlowMonthly: -12750             // -₹12,750
  },
  propertyConcentrations: [
    {
      assetId: "asset-1",
      propertyName: "2BHK Apartment, Mumbai",
      concentrationPercent: 40.0,
      value: 10000000
    },
    // ... more properties
  ],
  incomeBreakdown: {
    incomeGenerating: {
      count: 1,
      value: 10000000,
      percentage: 40.0
    },
    nonIncome: {
      count: 2,
      value: 15000000,
      percentage: 60.0
    }
  }
}
```

---

## Summary

**Features:**
- ✅ 7 per-asset metrics
- ✅ 4 portfolio-level metrics
- ✅ Ownership-percentage adjusted
- ✅ Loan-aware
- ✅ Conservative and explainable
- ✅ Type-safe with Supabase types
- ✅ Comprehensive edge case handling

**Ready for Production!** 🚀
