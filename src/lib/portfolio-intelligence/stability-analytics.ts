/**
 * Stability & Safety Analytics
 * 
 * PORTFOLIO INTELLIGENCE - STABILITY ANALYSIS
 * 
 * Analyzes the stability and safety characteristics of the portfolio,
 * focusing on stability-oriented assets, credit risk, and stability contribution
 * from retirement accounts.
 * 
 * Financial Logic:
 * - Stability-oriented assets (FDs, PPF, EPF) provide downside resilience
 * - Policy-backed instruments (NPS) are subject to policy changes and market conditions
 * - Market-linked assets contribute to growth but increase volatility
 * - Stability score helps assess portfolio resilience
 */

import {
  NormalizedHolding,
  filterByStabilityFlag,
  filterByAssetBucket,
  filterByRiskEngine,
  getNormalizedSummary,
} from './asset-normalization';

export interface StabilityMetrics {
  capitalProtected: {
    value: number;
    percentage: number;
    sources: Array<{ name: string; value: number; type: string }>;
  };
  marketLinked: {
    value: number;
    percentage: number;
  };
  stabilityScore: number; // 0-100
  stabilityGrade: 'High' | 'Medium' | 'Low';
}

export interface CreditRiskExposure {
  totalExposure: number;
  breakdown: Array<{
    assetName: string;
    value: number;
    creditRating?: string;
    type: 'FD' | 'Bond' | 'Other';
  }>;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface RetirementContribution {
  totalValue: number;
  percentage: number;
  breakdown: Array<{
    type: 'EPF' | 'PPF' | 'NPS';
    value: number;
    percentage: number;
    stabilityContribution: number; // 0-100
  }>;
  taxBenefits: {
    eeeAssets: number; // EPF + PPF (Exempt-Exempt-Exempt)
    eetAssets: number; // NPS (Exempt-Exempt-Taxable)
  };
}

export interface StabilityAnalysis {
  metrics: StabilityMetrics;
  creditRisk: CreditRiskExposure;
  retirement: RetirementContribution;
  insights: string[];
  metadata: {
    calculatedAt: string;
    totalPortfolioValue: number;
  };
}

/**
 * Calculate stability metrics
 */
export function calculateStabilityMetrics(
  holdings: NormalizedHolding[]
): StabilityMetrics {
  const summary = getNormalizedSummary(holdings);
  const totalValue = summary.totalValue;
  
  if (totalValue === 0) {
    return {
      capitalProtected: { value: 0, percentage: 0, sources: [] },
      marketLinked: { value: 0, percentage: 0 },
      stabilityScore: 0,
      stabilityGrade: 'Low',
    };
  }
  
  // Stability-oriented assets: High stability + Policy-driven or Rate-driven (non-market)
  // Note: Policy-backed instruments like NPS are included but not guaranteed
  const highStability = filterByStabilityFlag(holdings, 'High');
  const nonMarketAssets = holdings.filter(
    h => h.riskEngine !== 'Market-driven' && h.stabilityFlag === 'High'
  );
  
  const capitalProtectedValue = nonMarketAssets.reduce((sum, h) => sum + h.currentValue, 0);
  const capitalProtectedPct = (capitalProtectedValue / totalValue) * 100;
  
  // Market-linked assets
  const marketLinkedAssets = filterByRiskEngine(holdings, 'Market-driven');
  const marketLinkedValue = marketLinkedAssets.reduce((sum, h) => sum + h.currentValue, 0);
  const marketLinkedPct = (marketLinkedValue / totalValue) * 100;
  
  // Sources of stability-oriented assets
  const sources = nonMarketAssets.map(h => ({
    name: h.name,
    value: h.currentValue,
    type: h.assetType,
  })).sort((a, b) => b.value - a.value);
  
  // Calculate stability score (0-100)
  // Higher score = more stable
  // Formula: Stability-oriented % * 1.0 + Medium stability % * 0.5
  const mediumStability = filterByStabilityFlag(holdings, 'Medium');
  const mediumStabilityValue = mediumStability.reduce((sum, h) => sum + h.currentValue, 0);
  const mediumStabilityPct = (mediumStabilityValue / totalValue) * 100;
  
  const stabilityScore = Math.min(100, capitalProtectedPct * 1.0 + mediumStabilityPct * 0.5);
  
  // Determine grade
  let stabilityGrade: 'High' | 'Medium' | 'Low';
  if (stabilityScore >= 60) {
    stabilityGrade = 'High';
  } else if (stabilityScore >= 30) {
    stabilityGrade = 'Medium';
  } else {
    stabilityGrade = 'Low';
  }
  
  return {
    capitalProtected: {
      value: capitalProtectedValue,
      percentage: capitalProtectedPct,
      sources,
    },
    marketLinked: {
      value: marketLinkedValue,
      percentage: marketLinkedPct,
    },
    stabilityScore: Math.round(stabilityScore),
    stabilityGrade,
  };
}

/**
 * Calculate credit risk exposure (FDs + Bonds)
 */
export function calculateCreditRiskExposure(
  holdings: NormalizedHolding[]
): CreditRiskExposure {
  // Filter for FDs and Bonds
  const creditRiskAssets = holdings.filter(
    h => h.assetType === 'fd' || h.assetType === 'bond' || h.assetType === 'fixed_deposit'
  );
  
  const totalExposure = creditRiskAssets.reduce((sum, h) => sum + h.currentValue, 0);
  
  const breakdown = creditRiskAssets.map(h => {
    let creditRating: string | undefined;
    let type: 'FD' | 'Bond' | 'Other';
    
    if (h.assetType === 'fd' || h.assetType === 'fixed_deposit') {
      type = 'FD';
      // FDs from banks are typically safe (implied AAA rating)
      creditRating = 'AAA (Bank FD)';
    } else if (h.assetType === 'bond') {
      type = 'Bond';
      // Extract credit rating from metadata if available
      creditRating = h.metadata?.creditRating || 'Not Rated';
    } else {
      type = 'Other';
    }
    
    return {
      assetName: h.name,
      value: h.currentValue,
      creditRating,
      type,
    };
  }).sort((a, b) => b.value - a.value);
  
  // Determine risk level
  // FDs are low risk, bonds depend on rating
  const hasUnratedBonds = breakdown.some(b => b.type === 'Bond' && b.creditRating === 'Not Rated');
  const hasLowRatedBonds = breakdown.some(
    b => b.type === 'Bond' && b.creditRating && !b.creditRating.includes('AAA') && !b.creditRating.includes('AA')
  );
  
  let riskLevel: 'Low' | 'Medium' | 'High';
  if (hasLowRatedBonds) {
    riskLevel = 'High';
  } else if (hasUnratedBonds) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low'; // All FDs or high-rated bonds
  }
  
  return {
    totalExposure,
    breakdown,
    riskLevel,
  };
}

/**
 * Calculate retirement contribution analysis
 */
export function calculateRetirementContribution(
  holdings: NormalizedHolding[]
): RetirementContribution {
  const retirementAssets = filterByAssetBucket(holdings, 'Retirement');
  const summary = getNormalizedSummary(holdings);
  const totalValue = summary.totalValue;
  
  const epfHoldings = retirementAssets.filter(h => h.assetType === 'epf');
  const ppfHoldings = retirementAssets.filter(h => h.assetType === 'ppf');
  const npsHoldings = retirementAssets.filter(h => h.assetType === 'nps');
  
  const epfValue = epfHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const ppfValue = ppfHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const npsValue = npsHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  
  const totalRetirementValue = epfValue + ppfValue + npsValue;
  const retirementPct = totalValue > 0 ? (totalRetirementValue / totalValue) * 100 : 0;
  
  // Stability contribution: EPF/PPF = 100 (government-backed), NPS = 80 (diversified but market-linked)
  const breakdown = [
    {
      type: 'EPF' as const,
      value: epfValue,
      percentage: totalRetirementValue > 0 ? (epfValue / totalRetirementValue) * 100 : 0,
      stabilityContribution: 100, // Government-backed
    },
    {
      type: 'PPF' as const,
      value: ppfValue,
      percentage: totalRetirementValue > 0 ? (ppfValue / totalRetirementValue) * 100 : 0,
      stabilityContribution: 100, // Government-backed
    },
    {
      type: 'NPS' as const,
      value: npsValue,
      percentage: totalRetirementValue > 0 ? (npsValue / totalRetirementValue) * 100 : 0,
      stabilityContribution: 80, // Diversified but market-linked
    },
  ].filter(item => item.value > 0);
  
  // Tax benefits
  const eeeAssets = epfValue + ppfValue; // EEE = Exempt-Exempt-Exempt
  const eetAssets = npsValue; // EET = Exempt-Exempt-Taxable
  
  return {
    totalValue: totalRetirementValue,
    percentage: retirementPct,
    breakdown,
    taxBenefits: {
      eeeAssets,
      eetAssets,
    },
  };
}

/**
 * Calculate comprehensive stability analysis
 */
export function calculateStabilityAnalysis(
  holdings: NormalizedHolding[]
): StabilityAnalysis {
  const summary = getNormalizedSummary(holdings);
  const metrics = calculateStabilityMetrics(holdings);
  const creditRisk = calculateCreditRiskExposure(holdings);
  const retirement = calculateRetirementContribution(holdings);
  
  // Generate insights (compliance-friendly language: no buy/sell, use review/consider)
  const insights: string[] = [];
  
  if (metrics.capitalProtected.percentage < 20 && summary.totalValue > 500000) {
    insights.push(`${metrics.capitalProtected.percentage.toFixed(0)}% in stability-oriented assets — consider reviewing allocation for portfolio balance`);
  }
  
  if (metrics.stabilityScore >= 60) {
    insights.push(`Stability score of ${metrics.stabilityScore} indicates strong stability characteristics`);
  } else if (metrics.stabilityScore < 30) {
    insights.push(`Stability score of ${metrics.stabilityScore} — portfolio is primarily market-linked, which may increase volatility`);
  }
  
  if (creditRisk.riskLevel === 'High') {
    insights.push(`High credit risk exposure in debt instruments — review to understand potential impact`);
  }
  
  if (retirement.percentage < 10 && summary.totalValue > 1000000) {
    insights.push(`${retirement.percentage.toFixed(0)}% in retirement instruments — review to understand potential tax efficiency benefits`);
  }
  
  if (retirement.taxBenefits.eeeAssets > 0) {
    insights.push(`${((retirement.taxBenefits.eeeAssets / summary.totalValue) * 100).toFixed(1)}% in EEE assets (EPF/PPF) provides tax efficiency through long-term savings`);
  }
  
  return {
    metrics,
    creditRisk,
    retirement,
    insights: insights.slice(0, 5), // Max 5 insights
    metadata: {
      calculatedAt: new Date().toISOString(),
      totalPortfolioValue: summary.totalValue,
    },
  };
}