/**
 * Asset Classification Service
 * 
 * REGULATOR-ALIGNED, INVESTOR-PROOF CLASSIFICATION SYSTEM
 * =======================================================
 * 
 * CORE PRINCIPLE (NON-NEGOTIABLE):
 * Assets must be grouped by economic behavior and risk-return characteristics,
 * NOT by product names. Products like ULIP, NPS, Mutual Funds are wrappers, not asset classes.
 * 
 * TOP-LEVEL STRUCTURE (LOCKED):
 * - Growth Assets → Equity
 * - Income & Allocation → Fixed Income, Hybrid/Allocation
 * - Commodities
 * - Real Assets
 * - Cash & Liquidity
 * - Insurance (Protection)
 * - Liabilities
 * 
 * This service provides the source-of-truth mapping from products to asset classes.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AssetClass = 
  | 'Equity' 
  | 'FixedIncome' 
  | 'Hybrid' 
  | 'Commodity' 
  | 'RealAsset' 
  | 'Cash' 
  | 'Insurance' 
  | 'Liability';

export type TopLevelBucket = 
  | 'Growth' 
  | 'IncomeAllocation' 
  | 'Commodity' 
  | 'RealAsset' 
  | 'Cash' 
  | 'Insurance' 
  | 'Liability';

export type RiskBehavior = 
  | 'Growth' 
  | 'Defensive' 
  | 'Hedge' 
  | 'Liquidity' 
  | 'Protection' 
  | 'Obligation';

export type ValuationMethod = 
  | 'MarketLinked' 
  | 'InterestBased' 
  | 'NAVBased' 
  | 'Manual';

export interface AssetClassification {
  assetClass: AssetClass;
  topLevelBucket: TopLevelBucket;
  riskBehavior: RiskBehavior;
  valuationMethod: ValuationMethod;
}

export interface ULIPNPSAllocation {
  equityPct?: number;
  debtPct?: number;
  cashPct?: number;
  insuranceCover?: number;
}

// ============================================================================
// PRODUCT-TO-ASSET-CLASS MAPPING
// ============================================================================

/**
 * Map product (asset_type) to asset classification
 * 
 * This is the SOURCE OF TRUTH for all classification logic.
 * All UI, analytics, and calculations must use this function.
 * 
 * @param assetType - Product type from database (e.g., 'equity', 'mutual_fund', 'ulip')
 * @param metadata - Optional metadata for special cases (ULIP/NPS allocation, etc.)
 * @returns Complete asset classification
 */
export function classifyAsset(
  assetType: string,
  metadata?: {
    ulipNpsAllocation?: ULIPNPSAllocation;
    isEquityMF?: boolean;
    isDebtMF?: boolean;
    isHybridMF?: boolean;
    isGoldETF?: boolean;
    isRealEstate?: boolean;
  }
): AssetClassification {
  const normalizedType = assetType.toLowerCase().trim();

  // ========================================================================
  // EQUITY (Growth Assets)
  // ========================================================================
  if (normalizedType === 'equity' || normalizedType === 'stocks') {
    return {
      assetClass: 'Equity',
      topLevelBucket: 'Growth',
      riskBehavior: 'Growth',
      valuationMethod: 'MarketLinked',
    };
  }

  // Equity Mutual Funds
  if (normalizedType === 'mutual_fund' || normalizedType === 'index_fund') {
    // Check if we have explicit classification
    if (metadata?.isEquityMF) {
      return {
        assetClass: 'Equity',
        topLevelBucket: 'Growth',
        riskBehavior: 'Growth',
        valuationMethod: 'NAVBased',
      };
    }
    if (metadata?.isDebtMF) {
      return {
        assetClass: 'FixedIncome',
        topLevelBucket: 'IncomeAllocation',
        riskBehavior: 'Defensive',
        valuationMethod: 'NAVBased',
      };
    }
    if (metadata?.isHybridMF) {
      return {
        assetClass: 'Hybrid',
        topLevelBucket: 'IncomeAllocation',
        riskBehavior: 'Defensive',
        valuationMethod: 'NAVBased',
      };
    }
    // Default: Most MFs are equity-oriented (conservative assumption)
    return {
      assetClass: 'Equity',
      topLevelBucket: 'Growth',
      riskBehavior: 'Growth',
      valuationMethod: 'NAVBased',
    };
  }

  // Equity ETFs
  if (normalizedType === 'etf') {
    if (metadata?.isGoldETF) {
      return {
        assetClass: 'Commodity',
        topLevelBucket: 'Commodity',
        riskBehavior: 'Hedge',
        valuationMethod: 'MarketLinked',
      };
    }
    // Default: Equity ETF
    return {
      assetClass: 'Equity',
      topLevelBucket: 'Growth',
      riskBehavior: 'Growth',
      valuationMethod: 'MarketLinked',
    };
  }

  // ELSS (Equity Linked Savings Scheme)
  if (normalizedType === 'elss') {
    return {
      assetClass: 'Equity',
      topLevelBucket: 'Growth',
      riskBehavior: 'Growth',
      valuationMethod: 'NAVBased',
    };
  }

  // ========================================================================
  // FIXED INCOME (Income & Allocation)
  // ========================================================================
  if (normalizedType === 'fd' || normalizedType === 'fixed_deposit') {
    return {
      assetClass: 'FixedIncome',
      topLevelBucket: 'IncomeAllocation',
      riskBehavior: 'Defensive',
      valuationMethod: 'InterestBased',
    };
  }

  if (normalizedType === 'bond' || normalizedType === 'debenture') {
    return {
      assetClass: 'FixedIncome',
      topLevelBucket: 'IncomeAllocation',
      riskBehavior: 'Defensive',
      valuationMethod: 'InterestBased',
    };
  }

  if (normalizedType === 'ppf' || normalizedType === 'epf') {
    return {
      assetClass: 'FixedIncome',
      topLevelBucket: 'IncomeAllocation',
      riskBehavior: 'Defensive',
      valuationMethod: 'InterestBased',
    };
  }

  // ========================================================================
  // ULIP & NPS HANDLING (CRITICAL LOGIC)
  // ========================================================================
  if (normalizedType === 'ulip') {
    const allocation = metadata?.ulipNpsAllocation;
    
    // Preferred: If fund split data exists, split internally
    if (allocation && (allocation.equityPct || allocation.debtPct)) {
      // ULIP should be split into multiple holdings in the application layer
      // This function returns the classification for the investment component
      // The insurance cover should be tracked separately as Insurance
      if (allocation.equityPct && allocation.equityPct > 0) {
        // This would be one part of the split
        return {
          assetClass: 'Equity',
          topLevelBucket: 'Growth',
          riskBehavior: 'Growth',
          valuationMethod: 'NAVBased',
        };
      }
      if (allocation.debtPct && allocation.debtPct > 0) {
        return {
          assetClass: 'FixedIncome',
          topLevelBucket: 'IncomeAllocation',
          riskBehavior: 'Defensive',
          valuationMethod: 'NAVBased',
        };
      }
    }
    
    // Fallback: If split NOT available, classify as Hybrid
    return {
      assetClass: 'Hybrid',
      topLevelBucket: 'IncomeAllocation',
      riskBehavior: 'Defensive',
      valuationMethod: 'NAVBased',
    };
  }

  if (normalizedType === 'nps') {
    const allocation = metadata?.ulipNpsAllocation;
    
    // Preferred: If fund split data exists
    if (allocation && (allocation.equityPct || allocation.debtPct)) {
      if (allocation.equityPct && allocation.equityPct > 0) {
        return {
          assetClass: 'Equity',
          topLevelBucket: 'Growth',
          riskBehavior: 'Growth',
          valuationMethod: 'NAVBased',
        };
      }
      if (allocation.debtPct && allocation.debtPct > 0) {
        return {
          assetClass: 'FixedIncome',
          topLevelBucket: 'IncomeAllocation',
          riskBehavior: 'Defensive',
          valuationMethod: 'NAVBased',
        };
      }
    }
    
    // Fallback: If split NOT available, classify as Hybrid
    return {
      assetClass: 'Hybrid',
      topLevelBucket: 'IncomeAllocation',
      riskBehavior: 'Defensive',
      valuationMethod: 'NAVBased',
    };
  }

  // ========================================================================
  // HYBRID / ALLOCATION (Income & Allocation)
  // ========================================================================
  // Balanced Advantage Funds, Dynamic Asset Allocation, etc.
  // (Already handled above for MFs, but explicit for clarity)

  // ========================================================================
  // COMMODITIES
  // ========================================================================
  if (normalizedType === 'gold') {
    return {
      assetClass: 'Commodity',
      topLevelBucket: 'Commodity',
      riskBehavior: 'Hedge',
      valuationMethod: 'MarketLinked',
    };
  }

  if (normalizedType === 'silver') {
    return {
      assetClass: 'Commodity',
      topLevelBucket: 'Commodity',
      riskBehavior: 'Hedge',
      valuationMethod: 'MarketLinked',
    };
  }

  // ========================================================================
  // REAL ASSETS
  // ========================================================================
  if (normalizedType === 'real_estate' || normalizedType === 'realestate' || metadata?.isRealEstate) {
    return {
      assetClass: 'RealAsset',
      topLevelBucket: 'RealAsset',
      riskBehavior: 'Defensive',
      valuationMethod: 'Manual',
    };
  }

  if (normalizedType === 'land') {
    return {
      assetClass: 'RealAsset',
      topLevelBucket: 'RealAsset',
      riskBehavior: 'Defensive',
      valuationMethod: 'Manual',
    };
  }

  if (normalizedType === 'reit') {
    return {
      assetClass: 'RealAsset',
      topLevelBucket: 'RealAsset',
      riskBehavior: 'Defensive',
      valuationMethod: 'MarketLinked',
    };
  }

  // ========================================================================
  // CASH & LIQUIDITY
  // ========================================================================
  if (normalizedType === 'cash' || normalizedType === 'savings' || normalizedType === 'current') {
    return {
      assetClass: 'Cash',
      topLevelBucket: 'Cash',
      riskBehavior: 'Liquidity',
      valuationMethod: 'Manual',
    };
  }

  // Liquid Funds, Overnight Funds
  if (normalizedType === 'liquid_fund' || normalizedType === 'overnight_fund') {
    return {
      assetClass: 'Cash',
      topLevelBucket: 'Cash',
      riskBehavior: 'Liquidity',
      valuationMethod: 'NAVBased',
    };
  }

  // ========================================================================
  // INSURANCE (Protection)
  // ========================================================================
  if (normalizedType === 'term_insurance' || normalizedType === 'life_insurance') {
    return {
      assetClass: 'Insurance',
      topLevelBucket: 'Insurance',
      riskBehavior: 'Protection',
      valuationMethod: 'Manual',
    };
  }

  if (normalizedType === 'health_insurance') {
    return {
      assetClass: 'Insurance',
      topLevelBucket: 'Insurance',
      riskBehavior: 'Protection',
      valuationMethod: 'Manual',
    };
  }

  // ========================================================================
  // LIABILITIES
  // ========================================================================
  if (normalizedType === 'home_loan' || normalizedType === 'loan') {
    return {
      assetClass: 'Liability',
      topLevelBucket: 'Liability',
      riskBehavior: 'Obligation',
      valuationMethod: 'Manual',
    };
  }

  if (normalizedType === 'personal_loan' || normalizedType === 'education_loan') {
    return {
      assetClass: 'Liability',
      topLevelBucket: 'Liability',
      riskBehavior: 'Obligation',
      valuationMethod: 'Manual',
    };
  }

  if (normalizedType === 'credit_card' || normalizedType === 'credit_card_dues') {
    return {
      assetClass: 'Liability',
      topLevelBucket: 'Liability',
      riskBehavior: 'Obligation',
      valuationMethod: 'Manual',
    };
  }

  // ========================================================================
  // DEFAULT FALLBACK
  // ========================================================================
  // If we can't classify, default to Equity (conservative assumption)
  // This should be logged and reviewed
  console.warn(`[Asset Classification] Unknown asset type: ${assetType}, defaulting to Equity`);
  return {
    assetClass: 'Equity',
    topLevelBucket: 'Growth',
    riskBehavior: 'Growth',
    valuationMethod: 'MarketLinked',
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user-facing label for top-level bucket
 */
export function getTopLevelBucketLabel(bucket: TopLevelBucket): string {
  const labels: Record<TopLevelBucket, string> = {
    Growth: 'Growth Assets',
    IncomeAllocation: 'Income & Allocation',
    Commodity: 'Commodities',
    RealAsset: 'Real Assets',
    Cash: 'Cash & Liquidity',
    Insurance: 'Insurance',
    Liability: 'Liabilities',
  };
  return labels[bucket] || bucket;
}

/**
 * Get user-facing label for asset class (within Income & Allocation)
 */
export function getAssetClassLabel(assetClass: AssetClass): string {
  const labels: Record<AssetClass, string> = {
    Equity: 'Equity',
    FixedIncome: 'Fixed Income',
    Hybrid: 'Hybrid / Allocation',
    Commodity: 'Commodities',
    RealAsset: 'Real Assets',
    Cash: 'Cash & Liquidity',
    Insurance: 'Insurance',
    Liability: 'Liabilities',
  };
  return labels[assetClass] || assetClass;
}

/**
 * Check if asset class should be included in net worth calculation
 * Insurance and Liabilities are excluded from net worth
 */
export function isIncludedInNetWorth(assetClass: AssetClass): boolean {
  return assetClass !== 'Insurance';
}

/**
 * Check if asset class should be included in asset allocation charts
 * Insurance and Liabilities are excluded
 */
export function isIncludedInAllocation(assetClass: AssetClass): boolean {
  return assetClass !== 'Insurance' && assetClass !== 'Liability';
}

/**
 * Get tooltip text for top-level buckets
 */
export function getBucketTooltip(bucket: TopLevelBucket): string {
  const tooltips: Record<TopLevelBucket, string> = {
    Growth: 'Assets designed for long-term capital appreciation through market-linked returns.',
    IncomeAllocation: 'Assets designed to provide stability, income, or balanced exposure across asset classes.',
    Commodity: 'Physical or paper assets that act as inflation hedges and diversification tools.',
    RealAsset: 'Tangible assets like real estate and land that provide inflation protection.',
    Cash: 'Highly liquid assets for emergency funds and short-term needs.',
    Insurance: 'Protection coverage that does not contribute to net worth growth.',
    Liability: 'Financial obligations that reduce net worth.',
  };
  return tooltips[bucket] || '';
}

/**
 * Get tooltip text for asset classes
 */
export function getAssetClassTooltip(assetClass: AssetClass): string {
  const tooltips: Record<AssetClass, string> = {
    Equity: 'Market-linked investments in stocks and equity mutual funds for growth.',
    FixedIncome: 'Debt instruments providing stable returns with capital protection focus.',
    Hybrid: 'Investments that dynamically allocate across equity and debt to manage risk.',
    Commodity: 'Gold, silver, and other commodities that hedge against inflation.',
    RealAsset: 'Real estate, land, and REITs providing tangible asset exposure.',
    Cash: 'Liquid assets including savings accounts and liquid mutual funds.',
    Insurance: 'Term life, health insurance, and riders providing protection coverage.',
    Liability: 'Loans and credit card dues that represent financial obligations.',
  };
  return tooltips[assetClass] || '';
}

/**
 * Get ULIP tooltip (special case)
 */
export function getULIPTooltip(): string {
  return 'A life insurance product with market-linked investments that may invest in equity, debt, or both.';
}
