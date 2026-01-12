/**
 * Unified Asset Normalization Layer
 * 
 * PORTFOLIO INTELLIGENCE FOUNDATION
 * 
 * This module normalizes ALL holdings into a single internal schema,
 * regardless of their source asset type. This unified schema is used
 * by all analytics, scoring, and intelligence layers.
 * 
 * Financial Reasoning:
 * - Different asset types have different risk drivers
 * - Normalization enables apples-to-apples comparison
 * - Allows consistent analytics across all asset classes
 */

export type AssetBucket = 'Equity' | 'Debt' | 'Gold' | 'Cash' | 'Retirement';
export type RiskEngine = 'Market-driven' | 'Rate-driven' | 'Policy-driven';
export type LiquidityLevel = 'Liquid' | 'Semi-liquid' | 'Locked';
export type TaxCategory = 'Taxable' | 'EEE' | 'EET';
export type StabilityFlag = 'High' | 'Medium' | 'Low';

export interface NormalizedHolding {
  // Original holding data
  holdingId: string;
  assetId: string;
  name: string;
  assetType: string; // Original asset_type from database
  
  // Financial values
  investedValue: number;
  currentValue: number;
  quantity: number;
  
  // Normalized classification
  assetBucket: AssetBucket;
  riskEngine: RiskEngine;
  liquidityLevel: LiquidityLevel;
  taxCategory: TaxCategory;
  stabilityFlag: StabilityFlag;
  
  // Additional metadata (for analytics)
  sector?: string | null;
  assetClass?: string | null;
  isin?: string | null;
  symbol?: string | null;
  
  // Metadata for holdings that need special handling
  metadata?: {
    // For EPF/PPF: lock-in period
    lockInYears?: number;
    // For FDs: maturity date
    maturityDate?: string;
    // For NPS: tier type
    tierType?: 'Tier I' | 'Tier II';
    // For Bonds: credit rating
    creditRating?: string;
  };
}

/**
 * Normalize a single holding into the unified schema
 * 
 * Financial Logic:
 * - Asset buckets group holdings by economic behavior
 * - Risk engines identify what drives volatility
 * - Liquidity levels determine access to capital
 * - Tax categories affect after-tax returns
 */
export function normalizeHolding(
  holding: {
    id: string;
    assets?: {
      id: string;
      name: string;
      asset_type: string;
      sector?: string | null;
      asset_class?: string | null;
      isin?: string | null;
      symbol?: string | null;
    } | null;
    invested_value: number;
    current_value: number;
    quantity: number;
    notes?: string | null;
  }
): NormalizedHolding {
  const assetType = holding.assets?.asset_type || 'other';
  const asset = holding.assets;
  
  // Determine asset bucket
  const assetBucket = getAssetBucket(assetType);
  
  // Determine risk engine
  const riskEngine = getRiskEngine(assetType);
  
  // Determine liquidity level
  const liquidityLevel = getLiquidityLevel(assetType, holding.notes);
  
  // Determine tax category
  const taxCategory = getTaxCategory(assetType);
  
  // Determine stability flag
  const stabilityFlag = getStabilityFlag(assetType, assetBucket, riskEngine);
  
  // Extract metadata from notes (for PPF, EPF, FD, etc.)
  let metadata: NormalizedHolding['metadata'] = undefined;
  try {
    if (holding.notes) {
      const parsed = JSON.parse(holding.notes);
      if (assetType === 'ppf' || assetType === 'epf') {
        metadata = { lockInYears: parsed.lockInYears || parsed.maturityYears };
      } else if (assetType === 'fd') {
        metadata = { maturityDate: parsed.maturityDate };
      } else if (assetType === 'nps') {
        metadata = { tierType: parsed.tierType };
      } else if (assetType === 'bond') {
        metadata = { creditRating: parsed.creditRating };
      }
    }
  } catch (e) {
    // Notes not in JSON format, ignore
  }
  
  return {
    holdingId: holding.id,
    assetId: asset?.id || '',
    name: asset?.name || 'Unknown',
    assetType: assetType,
    investedValue: holding.invested_value || 0,
    currentValue: holding.current_value || holding.invested_value || 0,
    quantity: holding.quantity || 0,
    assetBucket,
    riskEngine,
    liquidityLevel,
    taxCategory,
    stabilityFlag,
    sector: asset?.sector || null,
    assetClass: asset?.asset_class || null,
    isin: asset?.isin || null,
    symbol: asset?.symbol || null,
    metadata,
  };
}

/**
 * Map asset type to asset bucket
 * 
 * Financial Reasoning:
 * - Equity bucket: Market-linked, growth-oriented
 * - Debt bucket: Fixed income, capital protection focus
 * - Gold bucket: Inflation hedge, diversification
 * - Cash bucket: Liquidity, emergency funds
 * - Retirement bucket: Long-term, tax-advantaged
 */
function getAssetBucket(assetType: string): AssetBucket {
  const normalized = assetType.toLowerCase();
  
  if (normalized === 'equity' || normalized === 'stocks') {
    return 'Equity';
  }
  
  if (
    normalized === 'mutual_fund' ||
    normalized === 'index_fund' ||
    normalized === 'etf'
  ) {
    // MF/ETF bucket depends on asset_class, default to Equity for analytics
    // In production, this would use factsheet data
    return 'Equity'; // Will be refined by exposure analytics
  }
  
  if (
    normalized === 'fd' ||
    normalized === 'fixed_deposit' ||
    normalized === 'bond' ||
    normalized === 'debenture'
  ) {
    return 'Debt';
  }
  
  if (normalized === 'gold') {
    return 'Gold';
  }
  
  if (normalized === 'cash' || normalized === 'savings' || normalized === 'current') {
    return 'Cash';
  }
  
  if (normalized === 'ppf' || normalized === 'epf' || normalized === 'nps') {
    return 'Retirement';
  }
  
  return 'Equity'; // Default fallback
}

/**
 * Determine risk engine for the asset
 * 
 * Financial Reasoning:
 * - Market-driven: Value fluctuates with stock/bond markets
 * - Rate-driven: Value affected by interest rate changes
 * - Policy-driven: Value determined by government policies (EPF rates, etc.)
 */
function getRiskEngine(assetType: string): RiskEngine {
  const normalized = assetType.toLowerCase();
  
  // Market-driven assets
  if (
    normalized === 'equity' ||
    normalized === 'stocks' ||
    normalized === 'mutual_fund' ||
    normalized === 'index_fund' ||
    normalized === 'etf'
  ) {
    return 'Market-driven';
  }
  
  // Rate-driven assets
  if (
    normalized === 'fd' ||
    normalized === 'fixed_deposit' ||
    normalized === 'bond' ||
    normalized === 'debenture'
  ) {
    return 'Rate-driven';
  }
  
  // Policy-driven assets
  if (normalized === 'epf' || normalized === 'ppf') {
    return 'Policy-driven';
  }
  
  // NPS is partially policy-driven (but also has market exposure in equity allocation)
  if (normalized === 'nps') {
    return 'Policy-driven'; // Overall structure is policy-driven
  }
  
  // Cash and gold are less affected by rates/policy
  if (normalized === 'cash' || normalized === 'gold') {
    return 'Rate-driven'; // Gold can be rate-sensitive, cash is rate-driven via savings rates
  }
  
  return 'Market-driven'; // Default fallback
}

/**
 * Determine liquidity level
 * 
 * Financial Reasoning:
 * - Liquid: Can be converted to cash within 1-2 days
 * - Semi-liquid: Can be converted within weeks/months (with some penalty)
 * - Locked: Cannot be accessed until maturity/retirement
 */
function getLiquidityLevel(assetType: string, notes?: string | null): LiquidityLevel {
  const normalized = assetType.toLowerCase();
  
  // Always liquid
  if (normalized === 'cash' || normalized === 'savings' || normalized === 'current') {
    return 'Liquid';
  }
  
  // Liquid (traded on exchanges)
  if (
    normalized === 'equity' ||
    normalized === 'stocks' ||
    normalized === 'etf'
  ) {
    return 'Liquid';
  }
  
  // Semi-liquid (can redeem, but may have exit loads)
  if (
    normalized === 'mutual_fund' ||
    normalized === 'index_fund'
  ) {
    return 'Semi-liquid';
  }
  
  // Check notes for lock-in information
  if (notes) {
    try {
      const parsed = JSON.parse(notes);
      // NPS Tier II is semi-liquid, Tier I is locked
      if (normalized === 'nps' && parsed.tierType === 'Tier II') {
        return 'Semi-liquid';
      }
    } catch (e) {
      // Not JSON, continue with defaults
    }
  }
  
  // Locked assets
  if (
    normalized === 'ppf' ||
    normalized === 'epf' ||
    normalized === 'nps' ||
    normalized === 'fd' ||
    normalized === 'fixed_deposit'
  ) {
    return 'Locked';
  }
  
  // Bonds (depends on maturity, default to semi-liquid)
  if (normalized === 'bond' || normalized === 'debenture') {
    return 'Semi-liquid';
  }
  
  // Gold (physical is semi-liquid, ETF is liquid)
  if (normalized === 'gold') {
    return 'Semi-liquid'; // Default, can be refined
  }
  
  return 'Semi-liquid'; // Default fallback
}

/**
 * Determine tax category
 * 
 * Financial Reasoning (Indian Tax System):
 * - Taxable: Regular income tax applies (stocks, FDs, bonds)
 * - EEE (Exempt-Exempt-Exempt): No tax on contribution, growth, or withdrawal (EPF, PPF)
 * - EET (Exempt-Exempt-Taxable): Tax on withdrawal only (NPS)
 */
function getTaxCategory(assetType: string): TaxCategory {
  const normalized = assetType.toLowerCase();
  
  // EEE (Exempt-Exempt-Exempt) - No tax at any stage
  if (normalized === 'ppf' || normalized === 'epf') {
    return 'EEE';
  }
  
  // EET (Exempt-Exempt-Taxable) - Tax on withdrawal
  if (normalized === 'nps') {
    return 'EET';
  }
  
  // All others are taxable (subject to applicable tax rules)
  return 'Taxable';
}

/**
 * Determine stability flag
 * 
 * Financial Reasoning:
 * - High: Stability-oriented (government-backed or bank-guaranteed)
 * - Medium: Market-linked but diversified
 * - Low: Single-stock or high-volatility assets
 */
function getStabilityFlag(
  assetType: string,
  assetBucket: AssetBucket,
  riskEngine: RiskEngine
): StabilityFlag {
  const normalized = assetType.toLowerCase();
  
  // High stability
  if (
    normalized === 'ppf' ||
    normalized === 'epf' ||
    normalized === 'fd' ||
    normalized === 'fixed_deposit' ||
    normalized === 'cash'
  ) {
    return 'High';
  }
  
  // Medium stability (diversified, policy-backed)
  if (normalized === 'nps') {
    return 'High'; // Government-backed, diversified
  }
  
  // Medium stability (diversified funds)
  if (
    normalized === 'mutual_fund' ||
    normalized === 'index_fund'
  ) {
    return 'Medium'; // Diversified, but market-linked
  }
  
  // Low stability (single stocks)
  if (normalized === 'equity' || normalized === 'stocks') {
    return 'Low'; // Single-stock risk
  }
  
  // Gold and bonds: medium stability
  if (normalized === 'gold' || normalized === 'bond') {
    return 'Medium';
  }
  
  // ETFs: depends on underlying, default to medium
  if (normalized === 'etf') {
    return 'Medium';
  }
  
  return 'Medium'; // Default fallback
}

/**
 * Normalize multiple holdings at once
 */
export function normalizeHoldings(
  holdings: Array<{
    id: string;
    assets?: {
      id: string;
      name: string;
      asset_type: string;
      sector?: string | null;
      asset_class?: string | null;
      isin?: string | null;
      symbol?: string | null;
    } | null;
    invested_value: number;
    current_value: number;
    quantity: number;
    notes?: string | null;
  }>
): NormalizedHolding[] {
  return holdings.map(normalizeHolding);
}

/**
 * Filter normalized holdings by asset bucket
 */
export function filterByAssetBucket(
  holdings: NormalizedHolding[],
  bucket: AssetBucket
): NormalizedHolding[] {
  return holdings.filter(h => h.assetBucket === bucket);
}

/**
 * Filter normalized holdings by risk engine
 */
export function filterByRiskEngine(
  holdings: NormalizedHolding[],
  engine: RiskEngine
): NormalizedHolding[] {
  return holdings.filter(h => h.riskEngine === engine);
}

/**
 * Filter normalized holdings by liquidity level
 */
export function filterByLiquidityLevel(
  holdings: NormalizedHolding[],
  level: LiquidityLevel
): NormalizedHolding[] {
  return holdings.filter(h => h.liquidityLevel === level);
}

/**
 * Filter normalized holdings by stability flag
 */
export function filterByStabilityFlag(
  holdings: NormalizedHolding[],
  flag: StabilityFlag
): NormalizedHolding[] {
  return holdings.filter(h => h.stabilityFlag === flag);
}

/**
 * Get summary statistics from normalized holdings
 */
export function getNormalizedSummary(holdings: NormalizedHolding[]): {
  totalValue: number;
  totalInvested: number;
  byAssetBucket: Record<AssetBucket, number>;
  byRiskEngine: Record<RiskEngine, number>;
  byLiquidityLevel: Record<LiquidityLevel, number>;
  byStabilityFlag: Record<StabilityFlag, number>;
} {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  
  const byAssetBucket: Record<AssetBucket, number> = {
    Equity: 0,
    Debt: 0,
    Gold: 0,
    Cash: 0,
    Retirement: 0,
  };
  
  const byRiskEngine: Record<RiskEngine, number> = {
    'Market-driven': 0,
    'Rate-driven': 0,
    'Policy-driven': 0,
  };
  
  const byLiquidityLevel: Record<LiquidityLevel, number> = {
    Liquid: 0,
    'Semi-liquid': 0,
    Locked: 0,
  };
  
  const byStabilityFlag: Record<StabilityFlag, number> = {
    High: 0,
    Medium: 0,
    Low: 0,
  };
  
  holdings.forEach(holding => {
    byAssetBucket[holding.assetBucket] += holding.currentValue;
    byRiskEngine[holding.riskEngine] += holding.currentValue;
    byLiquidityLevel[holding.liquidityLevel] += holding.currentValue;
    byStabilityFlag[holding.stabilityFlag] += holding.currentValue;
  });
  
  return {
    totalValue,
    totalInvested,
    byAssetBucket,
    byRiskEngine,
    byLiquidityLevel,
    byStabilityFlag,
  };
}