/**
 * Net Worth Aggregator
 * 
 * Unified aggregation engine for computing net worth across all asset classes.
 * Single source of truth for portfolio net worth calculation.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AssetClassValue {
  assetClass: string;
  value: number;
}

export interface NetWorthBreakdown {
  totalNetWorth: number;
  assetAllocation: Array<{
    assetClass: string;
    value: number;
    percentage: number;
  }>;
}

// ============================================================================
// ASSET CLASS NORMALIZATION
// ============================================================================

/**
 * Normalize asset class names to standard format
 */
function normalizeAssetClass(assetClass: string): string {
  const normalized = assetClass.toLowerCase().trim();

  // Map variations to standard names
  const mapping: Record<string, string> = {
    equity: 'equity',
    equities: 'equity',
    stocks: 'equity',
    stock: 'equity',
    mutual_fund: 'mutual_funds',
    mutualfunds: 'mutual_funds',
    mutual_funds: 'mutual_funds',
    mf: 'mutual_funds',
    fixed_income: 'fixed_income',
    fixedincome: 'fixed_income',
    fd: 'fixed_income',
    fixed_deposit: 'fixed_income',
    bonds: 'fixed_income',
    bond: 'fixed_income',
    cash: 'cash',
    real_estate: 'real_estate',
    realestate: 'real_estate',
    property: 'real_estate',
    properties: 'real_estate',
    gold: 'gold',
    epf: 'retirement',
    nps: 'retirement',
    ppf: 'retirement',
    retirement: 'retirement',
  };

  return mapping[normalized] || normalized;
}

// ============================================================================
// NET WORTH AGGREGATION
// ============================================================================

/**
 * Get Net Worth Breakdown
 * 
 * Aggregates values from all asset classes into a unified net worth breakdown.
 * Real estate value must be net of loans (already adjusted in input).
 * 
 * @param assetClassValues - Array of asset class values
 * @returns Net worth breakdown with allocation percentages
 */
export function getNetWorthBreakdown(
  assetClassValues: AssetClassValue[]
): NetWorthBreakdown {
  // Normalize and aggregate asset class values
  const aggregated = new Map<string, number>();

  assetClassValues.forEach(({ assetClass, value }) => {
    if (value === null || value === undefined || isNaN(value) || value < 0) {
      return; // Skip invalid values
    }

    const normalized = normalizeAssetClass(assetClass);
    const current = aggregated.get(normalized) || 0;
    aggregated.set(normalized, current + value);
  });

  // Calculate total net worth
  const totalNetWorth = Array.from(aggregated.values()).reduce(
    (sum, value) => sum + value,
    0
  );

  // Calculate allocation percentages
  const assetAllocation = Array.from(aggregated.entries())
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      percentage:
        totalNetWorth > 0 ? (value / totalNetWorth) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  // Normalize percentages to ensure they sum to 100 (handle rounding errors)
  if (assetAllocation.length > 0 && totalNetWorth > 0) {
    const totalPercentage = assetAllocation.reduce(
      (sum, item) => sum + item.percentage,
      0
    );
    const difference = 100 - totalPercentage;

    // Adjust the largest allocation to account for rounding differences
    if (Math.abs(difference) > 0.01) {
      assetAllocation[0].percentage += difference;
    }
  }

  return {
    totalNetWorth: Math.round(totalNetWorth),
    assetAllocation: assetAllocation.map((item) => ({
      assetClass: item.assetClass,
      value: Math.round(item.value),
      percentage: Math.round(item.percentage * 100) / 100, // Round to 2 decimals
    })),
  };
}

/**
 * Get Net Worth from Standard Asset Classes
 * 
 * Convenience function that accepts individual asset class values.
 * Real estate value should already be net of loans.
 * 
 * @param inputs - Asset class values
 * @returns Net worth breakdown
 */
export function calculateNetWorth(inputs: {
  equityValue?: number | null;
  mutualFundValue?: number | null;
  fixedIncomeValue?: number | null;
  cashValue?: number | null;
  realEstateValue?: number | null;
  goldValue?: number | null;
  retirementValue?: number | null;
  otherValue?: number | null;
}): NetWorthBreakdown {
  const assetClassValues: AssetClassValue[] = [];

  if (inputs.equityValue !== null && inputs.equityValue !== undefined) {
    assetClassValues.push({ assetClass: 'equity', value: inputs.equityValue });
  }

  if (inputs.mutualFundValue !== null && inputs.mutualFundValue !== undefined) {
    assetClassValues.push({
      assetClass: 'mutual_funds',
      value: inputs.mutualFundValue,
    });
  }

  if (inputs.fixedIncomeValue !== null && inputs.fixedIncomeValue !== undefined) {
    assetClassValues.push({
      assetClass: 'fixed_income',
      value: inputs.fixedIncomeValue,
    });
  }

  if (inputs.cashValue !== null && inputs.cashValue !== undefined) {
    assetClassValues.push({ assetClass: 'cash', value: inputs.cashValue });
  }

  if (inputs.realEstateValue !== null && inputs.realEstateValue !== undefined) {
    assetClassValues.push({
      assetClass: 'real_estate',
      value: inputs.realEstateValue, // Should already be net of loans
    });
  }

  if (inputs.goldValue !== null && inputs.goldValue !== undefined) {
    assetClassValues.push({ assetClass: 'gold', value: inputs.goldValue });
  }

  if (inputs.retirementValue !== null && inputs.retirementValue !== undefined) {
    assetClassValues.push({
      assetClass: 'retirement',
      value: inputs.retirementValue,
    });
  }

  if (inputs.otherValue !== null && inputs.otherValue !== undefined) {
    assetClassValues.push({ assetClass: 'other', value: inputs.otherValue });
  }

  return getNetWorthBreakdown(assetClassValues);
}
