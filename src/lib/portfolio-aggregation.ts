/**
 * Portfolio Data Aggregation Utility
 * 
 * SINGLE SOURCE OF TRUTH for portfolio calculations.
 * All dashboard tiles, allocation charts, and holdings tables
 * must use this utility to ensure consistency.
 * 
 * RULES:
 * - All totals derived ONLY from holdings
 * - No independent or duplicated aggregation logic
 * - Validation ensures data consistency
 * - Incomplete data shows "Data being consolidated"
 */

import { calculateAllocationPercentage, normalizeAllocations } from './portfolio-calculations';

export interface Holding {
  id: string;
  name: string;
  assetType: string;
  investedValue: number;
  currentValue: number;
  allocationPct?: number;
  [key: string]: any; // Allow additional fields
}

export interface AssetAllocation {
  name: string;
  percentage: number;
  color: string;
  value: number;
}

export interface PortfolioAggregation {
  totalInvested: number;
  totalCurrent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  allocation: AssetAllocation[];
  holdingsByAssetType: Map<string, Holding[]>;
  isValid: boolean;
  validationErrors: string[];
}

// Asset type to label mapping
const ASSET_TYPE_LABELS: Record<string, string> = {
  'Equity': 'Equity',
  'Stocks': 'Equity',
  'Mutual Fund': 'Mutual Funds',
  'Mutual Funds': 'Mutual Funds',
  'Fixed Deposit': 'Fixed Deposit',
  'Fixed Deposits': 'Fixed Deposit',
  'PPF': 'PPF',
  'NPS': 'NPS',
  'National Pension System': 'NPS',
  'Gold': 'Gold',
  'ETF': 'ETF',
  'Bonds': 'Bonds',
  'Cash': 'Cash',
};

// Asset type to color mapping
// Using distinct colors to avoid similar shades (especially greens)
const ASSET_TYPE_COLORS: Record<string, string> = {
  'Equity': '#2563EB',      // Blue (changed from green)
  'Stocks': '#2563EB',      // Blue (changed from green)
  'Mutual Fund': '#7C3AED', // Purple
  'Mutual Funds': '#7C3AED', // Purple
  'Fixed Deposit': '#F59E0B', // Amber
  'Fixed Deposits': '#F59E0B', // Amber
  'PPF': '#8B5CF6',         // Violet
  'NPS': '#EC4899',         // Pink (changed from purple)
  'National Pension System': '#EC4899', // Pink
  'Gold': '#DC2626',        // Red
  'ETF': '#10B981',         // Emerald (green)
  'Bonds': '#6366F1',       // Indigo
  'Cash': '#64748B',        // Slate
};

/**
 * Aggregate portfolio data from holdings
 * 
 * This is the ONLY function that should calculate totals and allocations.
 * All other components must use this result.
 */
export function aggregatePortfolioData(holdings: Holding[]): PortfolioAggregation {
  const validationErrors: string[] = [];
  
  // Validate holdings data
  if (!holdings || holdings.length === 0) {
    return {
      totalInvested: 0,
      totalCurrent: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      allocation: [],
      holdingsByAssetType: new Map(),
      isValid: false,
      validationErrors: ['No holdings data available'],
    };
  }

  // Check for missing or invalid values
  const invalidHoldings = holdings.filter(h => 
    !h.assetType || 
    h.investedValue === undefined || 
    h.investedValue === null ||
    isNaN(h.investedValue) ||
    h.currentValue === undefined ||
    h.currentValue === null ||
    isNaN(h.currentValue)
  );

  if (invalidHoldings.length > 0) {
    validationErrors.push(`${invalidHoldings.length} holding(s) have incomplete data`);
  }

  // Calculate totals from holdings (source of truth)
  const totalInvested = holdings.reduce((sum, h) => {
    const value = h.investedValue || 0;
    if (isNaN(value) || value < 0) {
      validationErrors.push(`Invalid invested value for ${h.name || h.id}`);
      return sum;
    }
    return sum + value;
  }, 0);

  const totalCurrent = holdings.reduce((sum, h) => {
    const value = h.currentValue || h.investedValue || 0;
    if (isNaN(value) || value < 0) {
      return sum;
    }
    return sum + value;
  }, 0);

  const totalGainLoss = totalCurrent - totalInvested;
  const totalGainLossPercent = totalInvested > 0 
    ? (totalGainLoss / totalInvested) * 100 
    : 0;

  // Group holdings by asset type
  const holdingsByAssetType = new Map<string, Holding[]>();
  holdings.forEach(holding => {
    const assetType = holding.assetType || 'Other';
    if (!holdingsByAssetType.has(assetType)) {
      holdingsByAssetType.set(assetType, []);
    }
    holdingsByAssetType.get(assetType)!.push(holding);
  });

  // Calculate allocation by asset type
  const allocationMap = new Map<string, number>();
  holdings.forEach(holding => {
    const assetType = holding.assetType || 'Other';
    const value = holding.investedValue || 0;
    if (!isNaN(value) && value >= 0) {
      allocationMap.set(assetType, (allocationMap.get(assetType) || 0) + value);
    }
  });

  // Convert to allocation array with percentages
  let allocation: AssetAllocation[] = Array.from(allocationMap.entries())
    .map(([assetType, value]) => {
      const label = ASSET_TYPE_LABELS[assetType] || assetType;
      const percentage = calculateAllocationPercentage(value, totalInvested);
      const color = ASSET_TYPE_COLORS[assetType] || '#64748B';
      
      return {
        name: label,
        percentage,
        color,
        value,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Normalize allocations to ensure they sum to 100%
  if (allocation.length > 0 && totalInvested > 0) {
    allocation = normalizeAllocations(allocation);
  }

  // Validate allocation sums to ~100%
  const totalPercentage = allocation.reduce((sum, a) => sum + a.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.1 && totalInvested > 0) {
    validationErrors.push(`Allocation percentages sum to ${totalPercentage.toFixed(2)}% instead of 100%`);
  }

  // Validate totals match sum of holdings
  const sumOfHoldings = holdings.reduce((sum, h) => sum + (h.investedValue || 0), 0);
  if (Math.abs(totalInvested - sumOfHoldings) > 0.01) {
    validationErrors.push(`Total invested (${totalInvested}) does not match sum of holdings (${sumOfHoldings})`);
  }

  return {
    totalInvested,
    totalCurrent,
    totalGainLoss,
    totalGainLossPercent,
    allocation,
    holdingsByAssetType,
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * Get asset-specific totals from holdings
 */
export function getAssetTotals(
  holdings: Holding[],
  assetType: string
): {
  totalInvested: number;
  totalCurrent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  count: number;
} {
  const assetHoldings = holdings.filter(h => {
    const hType = (h.assetType || '').toLowerCase();
    const aType = assetType.toLowerCase();
    
    return hType === aType || 
           hType === aType + 's' ||
           (assetType === 'Equity' && (h.assetType === 'Stocks' || hType === 'stocks')) ||
           (assetType === 'Stocks' && (h.assetType === 'Equity' || hType === 'equity')) ||
           (assetType === 'NPS' && (h.assetType === 'NPS' || hType === 'nps' || h.assetType === 'National Pension System' || hType === 'national pension system'));
  });

  const totalInvested = assetHoldings.reduce((sum, h) => sum + (h.investedValue || 0), 0);
  const totalCurrent = assetHoldings.reduce((sum, h) => sum + (h.currentValue || h.investedValue || 0), 0);
  const totalGainLoss = totalCurrent - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrent,
    totalGainLoss,
    totalGainLossPercent,
    count: assetHoldings.length,
  };
}

/**
 * Check if portfolio data is complete and consistent
 */
export function validatePortfolioData(
  aggregation: PortfolioAggregation,
  holdings: Holding[]
): { isValid: boolean; message?: string } {
  if (!aggregation.isValid) {
    return {
      isValid: false,
      message: 'Data being consolidated',
    };
  }

  if (holdings.length === 0) {
    return {
      isValid: false,
      message: 'No holdings data available',
    };
  }

  // Check for missing critical fields
  const incompleteHoldings = holdings.filter(h => 
    !h.name || 
    !h.assetType || 
    h.investedValue === undefined || 
    h.investedValue === null
  );

  if (incompleteHoldings.length > 0) {
    return {
      isValid: false,
      message: 'Data being consolidated',
    };
  }

  return { isValid: true };
}

