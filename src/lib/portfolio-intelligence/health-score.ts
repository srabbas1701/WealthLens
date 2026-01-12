/**
 * Portfolio Health Score (PHS) System
 * 
 * PORTFOLIO INTELLIGENCE - CORE SCORING ENGINE
 * 
 * Implements an explainable 0-100 Portfolio Health Score using
 * 7 weighted pillars. Each pillar returns:
 * - Numeric score (0-100)
 * - Human-readable deduction reasons
 * - UI-ready metadata (color, severity, tooltip text)
 * 
 * Financial Philosophy:
 * - No single metric captures portfolio health
 * - Multiple dimensions must be balanced
 * - Scores should be explainable and actionable
 * - Market-driven vs rate-driven assets require different logic
 */

import {
  NormalizedHolding,
  AssetBucket,
  RiskEngine,
  filterByRiskEngine,
  getNormalizedSummary,
} from './asset-normalization';

export type HealthGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type Severity = 'info' | 'low' | 'medium' | 'high';
export type PillarName =
  | 'asset_allocation'
  | 'concentration_risk'
  | 'diversification_overlap'
  | 'market_cap_balance'
  | 'sector_balance'
  | 'geography_balance'
  | 'investment_quality';

export interface PillarScore {
  name: PillarName;
  displayName: string;
  score: number; // 0-100
  weight: number; // 0-1 (sums to 1.0)
  deductions: Deduction[];
  metadata: {
    color: string; // hex color for UI
    severity: Severity;
    tooltip: string;
  };
}

export interface Deduction {
  reason: string; // Human-readable explanation
  impact: number; // Points deducted (0-100)
  severity: Severity;
  category: string; // For grouping similar issues
}

export interface PortfolioHealthScore {
  totalScore: number; // 0-100
  grade: HealthGrade;
  pillarBreakdown: PillarScore[];
  topRisks: Deduction[];
  topImprovements: string[];
  metadata: {
    calculatedAt: string;
    totalHoldings: number;
    totalValue: number;
  };
}

// Pillar weights (must sum to 1.0)
const PILLAR_WEIGHTS: Record<PillarName, number> = {
  asset_allocation: 0.20,
  concentration_risk: 0.20,
  diversification_overlap: 0.15,
  market_cap_balance: 0.15,
  sector_balance: 0.10,
  geography_balance: 0.05,
  investment_quality: 0.15,
};

// Grade thresholds
const GRADE_THRESHOLDS = {
  Excellent: 80,
  Good: 65,
  Fair: 50,
  Poor: 0,
};

/**
 * Calculate Portfolio Health Score from normalized holdings
 * 
 * Financial Logic:
 * - Only market-driven assets affect volatility-based pillars
 * - Rate & policy-driven assets improve stability
 * - EPF, PPF, FDs, Bonds do NOT affect sector/market-cap/overlap logic
 */
export function calculatePortfolioHealthScore(
  holdings: NormalizedHolding[],
  options?: {
    // For future: MF factsheet data, sector data, etc.
    mfFactsheetData?: Map<string, { equityPct: number; debtPct: number }>;
    sectorData?: Map<string, string>; // symbol -> sector
  }
): PortfolioHealthScore {
  if (holdings.length === 0) {
    return getEmptyHealthScore();
  }

  const summary = getNormalizedSummary(holdings);
  const marketDrivenHoldings = filterByRiskEngine(holdings, 'Market-driven');
  
  // Calculate all pillars
  const pillars: PillarScore[] = [
    calculateAssetAllocationPillar(holdings, summary),
    calculateConcentrationRiskPillar(holdings, summary),
    calculateDiversificationOverlapPillar(marketDrivenHoldings, summary),
    calculateMarketCapBalancePillar(marketDrivenHoldings, summary),
    calculateSectorBalancePillar(marketDrivenHoldings, summary),
    calculateGeographyBalancePillar(marketDrivenHoldings, summary),
    calculateInvestmentQualityPillar(holdings, summary),
  ];

  // Calculate weighted total score
  const totalScore = pillars.reduce((sum, pillar) => {
    return sum + pillar.score * pillar.weight;
  }, 0);

  // Determine grade
  const grade = getGrade(totalScore);

  // Extract top risks (high severity deductions)
  const allDeductions = pillars.flatMap(p => p.deductions);
  const topRisks = allDeductions
    .filter(d => d.severity === 'high')
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  // Generate improvement suggestions
  const topImprovements = generateImprovementSuggestions(pillars, holdings);

  return {
    totalScore: Math.round(totalScore),
    grade,
    pillarBreakdown: pillars,
    topRisks,
    topImprovements,
    metadata: {
      calculatedAt: new Date().toISOString(),
      totalHoldings: holdings.length,
      totalValue: summary.totalValue,
    },
  };
}

/**
 * Pillar 1: Asset Allocation Balance (20% weight)
 * 
 * Financial Logic:
 * - Optimal allocation depends on age, risk profile, goals
 * - Conservative: 40-60% equity, 30-50% debt, 10% gold
 * - Moderate: 60-70% equity, 20-30% debt, 10% gold
 * - Aggressive: 70-85% equity, 10-20% debt, 5-10% gold
 * - Default: Moderate profile (60% equity, 30% debt, 10% others)
 */
function calculateAssetAllocationPillar(
  holdings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  const total = summary.totalValue;
  if (total === 0) {
    return getEmptyPillar('asset_allocation', 'Asset Allocation Balance');
  }

  const equityPct = (summary.byAssetBucket.Equity / total) * 100;
  const debtPct = (summary.byAssetBucket.Debt / total) * 100;
  const retirementPct = (summary.byAssetBucket.Retirement / total) * 100;
  const goldPct = (summary.byAssetBucket.Gold / total) * 100;
  const cashPct = (summary.byAssetBucket.Cash / total) * 100;

  // Optimal ranges (Moderate profile - can be made configurable)
  const optimalEquity = { min: 55, max: 75 };
  const optimalDebt = { min: 20, max: 35 };
  const optimalOthers = { min: 5, max: 15 };

  // Check equity allocation
  if (equityPct < optimalEquity.min) {
    const deficit = optimalEquity.min - equityPct;
    const impact = Math.min(deficit * 1.5, 30);
    score -= impact;
    deductions.push({
      reason: `Equity allocation (${equityPct.toFixed(1)}%) is below optimal range (${optimalEquity.min}-${optimalEquity.max}%)`,
      impact,
      severity: equityPct < 30 ? 'high' : 'medium',
      category: 'allocation',
    });
  } else if (equityPct > optimalEquity.max) {
    const excess = equityPct - optimalEquity.max;
    const impact = Math.min(excess * 1.2, 25);
    score -= impact;
    deductions.push({
      reason: `Equity allocation (${equityPct.toFixed(1)}%) exceeds optimal range (${optimalEquity.min}-${optimalEquity.max}%)`,
      impact,
      severity: equityPct > 90 ? 'high' : 'medium',
      category: 'allocation',
    });
  }

  // Check debt allocation
  if (debtPct < optimalDebt.min && equityPct > 50) {
    const deficit = optimalDebt.min - debtPct;
    const impact = Math.min(deficit * 1.2, 20);
    score -= impact;
    deductions.push({
      reason: `Debt allocation (${debtPct.toFixed(1)}%) is low for stability`,
      impact,
      severity: debtPct < 10 ? 'high' : 'low',
      category: 'allocation',
    });
  }

  // Retirement allocation is positive (tax benefits)
  if (retirementPct > 0 && retirementPct < 10) {
    // Small deduction if retirement savings are low
    score -= 5;
    deductions.push({
      reason: `Retirement allocation (${retirementPct.toFixed(1)}%) could be higher for tax efficiency`,
      impact: 5,
      severity: 'low',
      category: 'allocation',
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'asset_allocation',
    displayName: 'Asset Allocation Balance',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.asset_allocation,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `Equity: ${equityPct.toFixed(1)}%, Debt: ${debtPct.toFixed(1)}%, Others: ${(goldPct + cashPct + retirementPct).toFixed(1)}%`,
    },
  };
}

/**
 * Pillar 2: Concentration Risk (20% weight)
 * 
 * Financial Logic:
 * - Single holding >25% is high concentration
 * - Top 5 holdings >60% is concentrated
 * - Diversification reduces unsystematic risk
 */
function calculateConcentrationRiskPillar(
  holdings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  const total = summary.totalValue;
  if (total === 0) {
    return getEmptyPillar('concentration_risk', 'Concentration Risk');
  }

  // Sort by value descending
  const sortedHoldings = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  
  // Check single holding concentration
  const topHoldingPct = (sortedHoldings[0]?.currentValue / total) * 100;
  if (topHoldingPct > 25) {
    const excess = topHoldingPct - 25;
    const impact = Math.min(excess * 2, 40);
    score -= impact;
    deductions.push({
      reason: `${sortedHoldings[0].name} represents ${topHoldingPct.toFixed(1)}% of portfolio (high concentration)`,
      impact,
      severity: topHoldingPct > 40 ? 'high' : 'medium',
      category: 'concentration',
    });
  }

  // Check top 5 concentration
  const top5Value = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + h.currentValue, 0);
  const top5Pct = (top5Value / total) * 100;
  if (top5Pct > 60) {
    const excess = top5Pct - 60;
    const impact = Math.min(excess * 0.8, 30);
    score -= impact;
    deductions.push({
      reason: `Top 5 holdings represent ${top5Pct.toFixed(1)}% of portfolio`,
      impact,
      severity: top5Pct > 75 ? 'high' : 'medium',
      category: 'concentration',
    });
  }

  // Check number of holdings (diversification)
  if (holdings.length < 10 && total > 100000) {
    const impact = (10 - holdings.length) * 2;
    score -= Math.min(impact, 15);
    deductions.push({
      reason: `Portfolio has only ${holdings.length} holdings (more diversification recommended)`,
      impact: Math.min(impact, 15),
      severity: holdings.length < 5 ? 'medium' : 'low',
      category: 'diversification',
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'concentration_risk',
    displayName: 'Concentration Risk',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.concentration_risk,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `Top holding: ${topHoldingPct.toFixed(1)}%, Top 5: ${top5Pct.toFixed(1)}%`,
    },
  };
}

/**
 * Pillar 3: Diversification & Overlap (15% weight)
 * 
 * Financial Logic:
 * - Only applies to market-driven assets (stocks, equity MFs)
 * - Overlap between MFs reduces diversification benefit
 * - Multiple funds with similar holdings = redundancy
 */
function calculateDiversificationOverlapPillar(
  marketDrivenHoldings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  // Only market-driven assets (stocks, MFs) affect this pillar
  if (marketDrivenHoldings.length === 0) {
    // No market-driven assets - score based on having other assets
    return {
      name: 'diversification_overlap',
      displayName: 'Diversification & Overlap',
      score: 70, // Neutral score if no market assets
      weight: PILLAR_WEIGHTS.diversification_overlap,
      deductions: [{
        reason: 'No market-driven assets to analyze for overlap',
        impact: 0,
        severity: 'info',
        category: 'coverage',
      }],
      metadata: {
        color: getScoreColor(70),
        severity: 'low',
        tooltip: 'Overlap analysis applies to stocks and equity mutual funds',
      },
    };
  }

  // Count mutual funds
  const mfHoldings = marketDrivenHoldings.filter(
    h => h.assetType === 'mutual_fund' || h.assetType === 'index_fund'
  );
  const stockHoldings = marketDrivenHoldings.filter(h => h.assetType === 'equity');

  // If too many similar MFs, deduct
  if (mfHoldings.length > 15) {
    const excess = mfHoldings.length - 15;
    const impact = Math.min(excess * 1.5, 20);
    score -= impact;
    deductions.push({
      reason: `Portfolio has ${mfHoldings.length} mutual funds (consider consolidating)`,
      impact,
      severity: mfHoldings.length > 20 ? 'medium' : 'low',
      category: 'overlap',
    });
  }

  // If only stocks (no MFs), deduct for lack of professional management
  if (stockHoldings.length > 0 && mfHoldings.length === 0) {
    score -= 10;
    deductions.push({
      reason: 'Portfolio has only direct stocks (no mutual funds for diversification)',
      impact: 10,
      severity: 'low',
      category: 'diversification',
    });
  }

  // Note: Actual overlap detection would require factsheet data
  // This is a placeholder - in production, would analyze stock-level overlap

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'diversification_overlap',
    displayName: 'Diversification & Overlap',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.diversification_overlap,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `${mfHoldings.length} mutual funds, ${stockHoldings.length} stocks`,
    },
  };
}

/**
 * Pillar 4: Market Cap Balance (15% weight)
 * 
 * Financial Logic:
 * - Only applies to market-driven assets
 * - Optimal: 50-60% Large, 25-35% Mid, 10-20% Small
 * - Too much large-cap = lower growth potential
 * - Too much small-cap = higher volatility
 */
function calculateMarketCapBalancePillar(
  marketDrivenHoldings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  // Only market-driven assets affect this
  if (marketDrivenHoldings.length === 0) {
    return {
      name: 'market_cap_balance',
      displayName: 'Market Cap Balance',
      score: 70,
      weight: PILLAR_WEIGHTS.market_cap_balance,
      deductions: [{
        reason: 'No market-driven assets to analyze',
        impact: 0,
        severity: 'info',
        category: 'coverage',
      }],
      metadata: {
        color: getScoreColor(70),
        severity: 'low',
        tooltip: 'Market cap analysis applies to stocks and equity funds',
      },
    };
  }

  // Note: Actual market cap breakdown would require:
  // 1. For stocks: Market cap data from stock master
  // 2. For MFs: Factsheet data showing market cap allocation
  // This is a placeholder - defaults to neutral score

  return {
    name: 'market_cap_balance',
    displayName: 'Market Cap Balance',
    score: 75, // Placeholder - would calculate from market cap data
    weight: PILLAR_WEIGHTS.market_cap_balance,
    deductions: [{
      reason: 'Market cap data not available (requires factsheet data)',
      impact: 0,
      severity: 'info',
      category: 'data',
    }],
    metadata: {
      color: getScoreColor(75),
      severity: 'low',
      tooltip: 'Market cap analysis requires fund factsheet data',
    },
  };
}

/**
 * Pillar 5: Sector Balance (10% weight)
 * 
 * Financial Logic:
 * - Only applies to market-driven assets
 * - Single sector >25% is high concentration
 * - Compare vs NIFTY 500 benchmark
 */
function calculateSectorBalancePillar(
  marketDrivenHoldings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  if (marketDrivenHoldings.length === 0) {
    return {
      name: 'sector_balance',
      displayName: 'Sector Balance',
      score: 70,
      weight: PILLAR_WEIGHTS.sector_balance,
      deductions: [{
        reason: 'No market-driven assets to analyze',
        impact: 0,
        severity: 'info',
        category: 'coverage',
      }],
      metadata: {
        color: getScoreColor(70),
        severity: 'low',
        tooltip: 'Sector analysis applies to stocks and equity funds',
      },
    };
  }

  // Count sectors from direct equity holdings
  const sectorCounts = new Map<string, number>();
  marketDrivenHoldings.forEach(h => {
    if (h.assetType === 'equity' && h.sector) {
      const current = sectorCounts.get(h.sector) || 0;
      sectorCounts.set(h.sector, current + h.currentValue);
    }
  });

  const totalMarketValue = marketDrivenHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  
  // Check for single-sector concentration (only in direct stocks)
  sectorCounts.forEach((value, sector) => {
    const pct = (value / totalMarketValue) * 100;
    if (pct > 25) {
      const excess = pct - 25;
      const impact = Math.min(excess * 1.5, 25);
      score -= impact;
      deductions.push({
        reason: `${sector} sector represents ${pct.toFixed(1)}% of equity holdings (high concentration)`,
        impact,
        severity: pct > 35 ? 'high' : 'medium',
        category: 'sector_concentration',
      });
    }
  });

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'sector_balance',
    displayName: 'Sector Balance',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.sector_balance,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `${sectorCounts.size} sectors represented`,
    },
  };
}

/**
 * Pillar 6: Geography Balance (5% weight)
 * 
 * Financial Logic:
 * - Only applies to market-driven assets
 * - India vs International exposure
 * - Currency diversification benefit
 */
function calculateGeographyBalancePillar(
  marketDrivenHoldings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  // Placeholder - would require MF factsheet data for international exposure
  return {
    name: 'geography_balance',
    displayName: 'Geography Balance',
    score: 75,
    weight: PILLAR_WEIGHTS.geography_balance,
    deductions: [{
      reason: 'Geography analysis requires fund factsheet data',
      impact: 0,
      severity: 'info',
      category: 'data',
    }],
    metadata: {
      color: getScoreColor(75),
      severity: 'low',
      tooltip: 'Geography analysis requires factsheet data',
    },
  };
}

/**
 * Pillar 7: Investment Quality (15% weight)
 * 
 * Financial Logic:
 * - Quality of individual holdings
 * - For stocks: Earnings consistency, ROE, debt levels
 * - For funds: Rolling returns, downside capture
 * - Placeholder for now
 */
function calculateInvestmentQualityPillar(
  holdings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  // Placeholder - would require fundamental data for stocks,
  // performance data for funds
  return {
    name: 'investment_quality',
    displayName: 'Investment Quality',
    score: 75,
    weight: PILLAR_WEIGHTS.investment_quality,
    deductions: [{
      reason: 'Quality analysis requires fundamental data',
      impact: 0,
      severity: 'info',
      category: 'data',
    }],
    metadata: {
      color: getScoreColor(75),
      severity: 'low',
      tooltip: 'Quality analysis requires additional data sources',
    },
  };
}

// Helper functions

function getGrade(score: number): HealthGrade {
  if (score >= GRADE_THRESHOLDS.Excellent) return 'Excellent';
  if (score >= GRADE_THRESHOLDS.Good) return 'Good';
  if (score >= GRADE_THRESHOLDS.Fair) return 'Fair';
  return 'Poor';
}

/**
 * Get grade display label (compliance-friendly)
 */
export function getGradeLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Attention';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 65) return '#3B82F6'; // Blue
  if (score >= 50) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

function getScoreSeverity(score: number): Severity {
  if (score >= 80) return 'info';
  if (score >= 65) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

function getEmptyPillar(name: PillarName, displayName: string): PillarScore {
  return {
    name,
    displayName,
    score: 0,
    weight: PILLAR_WEIGHTS[name],
    deductions: [],
    metadata: {
      color: '#64748B',
      severity: 'info',
      tooltip: 'No data available',
    },
  };
}

function getEmptyHealthScore(): PortfolioHealthScore {
  return {
    totalScore: 0,
    grade: 'Poor',
    pillarBreakdown: [],
    topRisks: [],
    topImprovements: ['Add holdings to analyze portfolio health'],
    metadata: {
      calculatedAt: new Date().toISOString(),
      totalHoldings: 0,
      totalValue: 0,
    },
  };
}

/**
 * Get grade display label for UI (compliance-friendly)
 * Maps internal grade to user-facing label
 * "Poor" → "Needs Attention"
 */
export function getGradeDisplayLabel(grade: HealthGrade): string {
  switch (grade) {
    case 'Excellent':
      return 'Excellent';
    case 'Good':
      return 'Good';
    case 'Fair':
      return 'Fair';
    case 'Poor':
      return 'Needs Attention';
    default:
      return 'Needs Attention';
  }
}

function generateImprovementSuggestions(
  pillars: PillarScore[],
  holdings: NormalizedHolding[]
): string[] {
  const suggestions: string[] = [];
  
  // Get worst-performing pillars
  const worstPillars = [...pillars]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  
  worstPillars.forEach(pillar => {
    if (pillar.score < 70) {
      switch (pillar.name) {
        case 'asset_allocation':
          suggestions.push('Review asset allocation to balance risk and return');
          break;
        case 'concentration_risk':
          suggestions.push('Review diversification to manage concentration risk');
          break;
        case 'diversification_overlap':
          suggestions.push('Review mutual fund overlap for portfolio clarity');
          break;
        case 'sector_balance':
          suggestions.push('Review sector exposure to manage concentration');
          break;
      }
    }
  });
  
  // Add general suggestions if portfolio is small
  const summary = getNormalizedSummary(holdings);
  if (summary.totalValue < 100000 && holdings.length < 5) {
    suggestions.push('Review portfolio diversification');
  }
  
  return suggestions.slice(0, 5); // Max 5 suggestions
}