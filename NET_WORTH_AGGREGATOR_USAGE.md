# Net Worth Aggregator - Usage Guide

## Overview

The `netWorthAggregator` is a unified engine for computing net worth across all asset classes. It serves as the single source of truth for portfolio net worth calculation.

**Location**: `src/analytics/netWorthAggregator.ts`

## Key Features

- **Unified Aggregation**: Combines values from all asset classes (equity, MF, fixed income, cash, real estate, gold, retirement, etc.)
- **Automatic Normalization**: Handles variations in asset class names (e.g., "equity", "stocks", "equities" → "equity")
- **Percentage Calculation**: Automatically calculates allocation percentages that sum to 100%
- **Real Estate Net of Loans**: Real estate value must already be net of loans (handled by Real Estate analytics)

## Functions

### 1. `calculateNetWorth(inputs)`

Convenience function that accepts individual asset class values.

```typescript
import { calculateNetWorth } from '@/analytics/netWorthAggregator';

const breakdown = calculateNetWorth({
  equityValue: 500000,
  mutualFundValue: 300000,
  fixedIncomeValue: 200000,
  cashValue: 100000,
  realEstateValue: 2000000, // Must be net of loans
  goldValue: 50000,
  retirementValue: 400000,
});

// Returns:
// {
//   totalNetWorth: 3550000,
//   assetAllocation: [
//     { assetClass: 'real_estate', value: 2000000, percentage: 56.34 },
//     { assetClass: 'equity', value: 500000, percentage: 14.08 },
//     { assetClass: 'retirement', value: 400000, percentage: 11.27 },
//     { assetClass: 'mutual_funds', value: 300000, percentage: 8.45 },
//     { assetClass: 'fixed_income', value: 200000, percentage: 5.63 },
//     { assetClass: 'cash', value: 100000, percentage: 2.82 },
//     { assetClass: 'gold', value: 50000, percentage: 1.41 },
//   ]
// }
```

### 2. `getNetWorthBreakdown(assetClassValues)`

Lower-level function that accepts an array of asset class values.

```typescript
import { getNetWorthBreakdown, type AssetClassValue } from '@/analytics/netWorthAggregator';

const assetClassValues: AssetClassValue[] = [
  { assetClass: 'equity', value: 500000 },
  { assetClass: 'mutual_funds', value: 300000 },
  { assetClass: 'real_estate', value: 2000000 },
];

const breakdown = getNetWorthBreakdown(assetClassValues);
```

## Integration Points

### Real Estate Dashboard

When wiring data into the Real Estate Dashboard (`src/app/portfolio/real-estate/page.tsx`):

```typescript
// 1. Fetch Real Estate net worth (already net of loans)
const realEstateNetWorth = portfolio.netWorth; // From real estate analytics

// 2. Fetch other asset class values from portfolio API
const portfolioData = await fetch('/api/portfolio/data').then(r => r.json());

// 3. Calculate total net worth using aggregator
const netWorthBreakdown = calculateNetWorth({
  equityValue: getEquityValue(portfolioData.holdings),
  mutualFundValue: getMutualFundValue(portfolioData.holdings),
  fixedIncomeValue: getFixedIncomeValue(portfolioData.holdings),
  cashValue: getCashValue(portfolioData.holdings),
  realEstateValue: realEstateNetWorth, // Net of loans
  goldValue: getGoldValue(portfolioData.holdings),
  retirementValue: getRetirementValue(portfolioData.holdings),
});

// 4. Use breakdown.totalNetWorth for "% of Total Portfolio" KPI
// 5. Use breakdown.assetAllocation for allocation charts
```

### Global Portfolio Dashboard

When aggregating all asset classes for the main dashboard:

```typescript
// 1. Fetch holdings from portfolio API
const portfolioData = await fetch('/api/portfolio/data').then(r => r.json());

// 2. Fetch Real Estate net worth
const realEstateData = await fetch('/api/real-estate/dashboard').then(r => r.json());
const realEstateNetWorth = realEstateData.summary.netRealEstateWorth;

// 3. Aggregate all asset classes
const netWorthBreakdown = calculateNetWorth({
  equityValue: sumByAssetType(portfolioData.holdings, 'equity'),
  mutualFundValue: sumByAssetType(portfolioData.holdings, 'mutual_fund'),
  fixedIncomeValue: sumByAssetType(portfolioData.holdings, 'fixed_deposit'),
  cashValue: sumByAssetType(portfolioData.holdings, 'cash'),
  realEstateValue: realEstateNetWorth,
  goldValue: sumByAssetType(portfolioData.holdings, 'gold'),
  retirementValue: sumByAssetType(portfolioData.holdings, ['ppf', 'epf', 'nps']),
});

// 4. Display breakdown.totalNetWorth as total portfolio value
// 5. Display breakdown.assetAllocation in allocation charts
```

## Important Notes

1. **Real Estate Value**: Must be net of loans (already handled by `calculatePortfolioAnalytics` in Real Estate analytics)

2. **Missing Asset Classes**: The aggregator gracefully handles missing asset classes (returns 0 for their values)

3. **Percentage Normalization**: Percentages are automatically normalized to sum to 100% (handles rounding errors)

4. **No Formatting**: The aggregator returns raw numbers (no ₹, no %). Formatting should be done in UI components.

5. **Asset Class Normalization**: The aggregator automatically normalizes asset class names:
   - "equity", "stocks", "equities" → "equity"
   - "mutual_fund", "mf" → "mutual_funds"
   - "ppf", "epf", "nps" → "retirement"
   - etc.

## Example: Complete Integration

```typescript
// src/lib/portfolio/net-worth.ts

import { calculateNetWorth } from '@/analytics/netWorthAggregator';
import { getUserRealEstateAssets } from '@/lib/real-estate/get-assets';
import { calculateRealEstateAnalytics } from '@/services/realEstateAnalytics.service';
import { getNetWorthFromHoldings } from '@/lib/portfolio-aggregation';

export async function getCompleteNetWorth(userId: string) {
  // 1. Get holdings-based net worth
  const holdings = await getHoldings(userId);
  const holdingsNetWorth = getNetWorthFromHoldings(holdings);
  
  // 2. Get Real Estate net worth (net of loans)
  const realEstateAssets = await getUserRealEstateAssets(userId);
  const { portfolio } = await calculateRealEstateAnalytics(realEstateAssets, null);
  const realEstateNetWorth = portfolio.netWorth;
  
  // 3. Aggregate all asset classes
  const breakdown = calculateNetWorth({
    equityValue: sumByAssetType(holdings, 'equity'),
    mutualFundValue: sumByAssetType(holdings, 'mutual_fund'),
    fixedIncomeValue: sumByAssetType(holdings, 'fixed_deposit'),
    cashValue: sumByAssetType(holdings, 'cash'),
    realEstateValue: realEstateNetWorth,
    goldValue: sumByAssetType(holdings, 'gold'),
    retirementValue: sumByAssetType(holdings, ['ppf', 'epf', 'nps']),
  });
  
  return breakdown;
}
```
