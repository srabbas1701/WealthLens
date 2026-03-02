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
import {
  classifyStockCap,
  detectInternationalMF,
  MF_EQUITY_RATIO_BY_CLASS,
  MF_EQUITY_DEFAULT,
  MF_CAP_SPLIT,
  INTL_EQUITY_RATIO,
} from './index-constituents';

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
 * - Direct stocks classified using Nifty 100 (Large) / Nifty Midcap 150 (Mid) lists
 * - MF equity estimated using typical Indian fund cap split (68/22/10)
 * - Optimal: 50-70% Large, 20-30% Mid, 10-20% Small
 * - Too much small-cap = higher volatility; too little = lower growth potential
 */
function calculateMarketCapBalancePillar(
  marketDrivenHoldings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  if (marketDrivenHoldings.length === 0) {
    return {
      name: 'market_cap_balance',
      displayName: 'Market Cap Balance',
      score: 70,
      weight: PILLAR_WEIGHTS.market_cap_balance,
      deductions: [{ reason: 'No market-driven assets to analyze', impact: 0, severity: 'info', category: 'coverage' }],
      metadata: { color: getScoreColor(70), severity: 'low', tooltip: 'Market cap analysis applies to stocks and equity funds' },
    };
  }

  const equityStocks = marketDrivenHoldings.filter(h => h.assetType === 'equity' || h.assetType === 'etf');
  const mfHoldings = marketDrivenHoldings.filter(h => h.assetType === 'mutual_fund' || h.assetType === 'index_fund');

  let largeCapValue = 0;
  let midCapValue   = 0;
  let smallCapValue = 0;

  // Classify direct equity stocks using Nifty 100 / Midcap 150 lookup
  equityStocks.forEach(h => {
    const cap = classifyStockCap(h.symbol);
    if (cap === 'Large Cap') largeCapValue += h.currentValue;
    else if (cap === 'Mid Cap') midCapValue += h.currentValue;
    else smallCapValue += h.currentValue;
  });

  // Estimate MF market cap distribution (68 large / 22 mid / 10 small)
  mfHoldings.forEach(h => {
    const equityRatio = MF_EQUITY_RATIO_BY_CLASS[h.assetClass ?? ''] ?? MF_EQUITY_DEFAULT;
    const equityValue = h.currentValue * equityRatio;
    largeCapValue += equityValue * MF_CAP_SPLIT['Large Cap'];
    midCapValue   += equityValue * MF_CAP_SPLIT['Mid Cap'];
    smallCapValue += equityValue * MF_CAP_SPLIT['Small Cap'];
  });

  const totalClassified = largeCapValue + midCapValue + smallCapValue;
  if (totalClassified === 0) {
    return {
      name: 'market_cap_balance',
      displayName: 'Market Cap Balance',
      score: 70,
      weight: PILLAR_WEIGHTS.market_cap_balance,
      deductions: [{ reason: 'Could not classify market cap for equity holdings', impact: 0, severity: 'info', category: 'coverage' }],
      metadata: { color: getScoreColor(70), severity: 'low', tooltip: 'Market cap analysis requires classifiable equity holdings' },
    };
  }

  const largePct = (largeCapValue / totalClassified) * 100;
  const midPct   = (midCapValue   / totalClassified) * 100;
  const smallPct = (smallCapValue / totalClassified) * 100;

  // Deduct for excessive small-cap (primary volatility risk)
  if (smallPct > 25) {
    const excess  = smallPct - 25;
    const impact  = Math.min(excess * 1.2, 30);
    score -= impact;
    deductions.push({
      reason: `High small-cap exposure (${smallPct.toFixed(0)}%) significantly increases portfolio volatility`,
      impact,
      severity: smallPct > 40 ? 'high' : 'medium',
      category: 'market_cap',
    });
  } else if (smallPct > 20) {
    const excess  = smallPct - 20;
    const impact  = Math.min(excess * 0.8, 10);
    score -= impact;
    deductions.push({
      reason: `Small-cap exposure (${smallPct.toFixed(0)}%) is above moderate range, adding some volatility`,
      impact,
      severity: 'low',
      category: 'market_cap',
    });
  }

  // Deduct for very low large-cap (stability anchor missing)
  if (largePct < 40) {
    const deficit = 40 - largePct;
    const impact  = Math.min(deficit * 0.8, 20);
    score -= impact;
    deductions.push({
      reason: `Low large-cap allocation (${largePct.toFixed(0)}%) reduces portfolio stability anchor`,
      impact,
      severity: largePct < 25 ? 'medium' : 'low',
      category: 'market_cap',
    });
  }

  // Mild deduction for over-concentration in large caps (limiting growth)
  if (largePct > 80) {
    const excess  = largePct - 80;
    const impact  = Math.min(excess * 0.5, 10);
    score -= impact;
    deductions.push({
      reason: `Very high large-cap concentration (${largePct.toFixed(0)}%) may limit mid/small-cap growth participation`,
      impact,
      severity: 'low',
      category: 'market_cap',
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'market_cap_balance',
    displayName: 'Market Cap Balance',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.market_cap_balance,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `Large: ${largePct.toFixed(0)}%, Mid: ${midPct.toFixed(0)}%, Small: ${smallPct.toFixed(0)}%`,
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
 * - Only applies to market-driven assets (equity + MFs)
 * - Direct NSE/BSE stocks → 100% India
 * - MFs classified as international via fund name patterns
 * - Optimal: 5–30% international exposure for meaningful diversification
 * - 0% international = full India concentration risk
 * - >35% international = elevated currency risk
 */
function calculateGeographyBalancePillar(
  marketDrivenHoldings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  if (marketDrivenHoldings.length === 0) {
    return {
      name: 'geography_balance',
      displayName: 'Geography Balance',
      score: 70,
      weight: PILLAR_WEIGHTS.geography_balance,
      deductions: [{ reason: 'No market-driven assets to analyze', impact: 0, severity: 'info', category: 'coverage' }],
      metadata: { color: getScoreColor(70), severity: 'low', tooltip: 'Geography analysis applies to stocks and equity funds' },
    };
  }

  // Direct stocks are always India
  const directStocks = marketDrivenHoldings.filter(h => h.assetType === 'equity' || h.assetType === 'etf');
  const mfHoldings   = marketDrivenHoldings.filter(h => h.assetType === 'mutual_fund' || h.assetType === 'index_fund');

  let indiaEquityValue   = 0;
  let intlEquityValue    = 0;

  directStocks.forEach(h => { indiaEquityValue += h.currentValue; });

  mfHoldings.forEach(h => {
    const equityRatio = MF_EQUITY_RATIO_BY_CLASS[h.assetClass ?? ''] ?? MF_EQUITY_DEFAULT;
    const equityValue = h.currentValue * equityRatio;
    const confidence  = detectInternationalMF(h.name);
    if (confidence) {
      const intlFraction = INTL_EQUITY_RATIO[confidence];
      intlEquityValue  += equityValue * intlFraction;
      indiaEquityValue += equityValue * (1 - intlFraction);
    } else {
      indiaEquityValue += equityValue;
    }
  });

  const totalEquity = indiaEquityValue + intlEquityValue;
  if (totalEquity === 0) {
    return {
      name: 'geography_balance',
      displayName: 'Geography Balance',
      score: 70,
      weight: PILLAR_WEIGHTS.geography_balance,
      deductions: [{ reason: 'No classifiable equity holdings found', impact: 0, severity: 'info', category: 'coverage' }],
      metadata: { color: getScoreColor(70), severity: 'low', tooltip: 'Geography analysis requires equity holdings' },
    };
  }

  const intlPct  = (intlEquityValue  / totalEquity) * 100;
  const indiaPct = (indiaEquityValue / totalEquity) * 100;

  if (intlPct === 0) {
    // No international exposure — portfolio is entirely India-focused
    score -= 15;
    deductions.push({
      reason: `No international equity exposure — portfolio is 100% India-focused, missing global diversification`,
      impact: 15,
      severity: 'medium',
      category: 'geography',
    });
  } else if (intlPct < 5) {
    score -= 8;
    deductions.push({
      reason: `Minimal international exposure (${intlPct.toFixed(0)}%) — limited geographic diversification benefit`,
      impact: 8,
      severity: 'low',
      category: 'geography',
    });
  } else if (intlPct > 40) {
    const excess  = intlPct - 40;
    const impact  = Math.min(excess * 0.8, 15);
    score -= impact;
    deductions.push({
      reason: `High international exposure (${intlPct.toFixed(0)}%) — significant currency risk (INR vs USD/EUR)`,
      impact,
      severity: intlPct > 55 ? 'medium' : 'low',
      category: 'geography',
    });
  }
  // 5–40% international = healthy diversification range, no deduction

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'geography_balance',
    displayName: 'Geography Balance',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.geography_balance,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `India: ${indiaPct.toFixed(0)}%, International: ${intlPct.toFixed(0)}%`,
    },
  };
}

/**
 * Pillar 7: Investment Quality (15% weight)
 *
 * Financial Logic:
 * - Quality assessed using available return and structural data
 * - Gain/loss ratio: portfolio value in positive-return holdings vs total
 * - Concentrated unrealised losses in large positions are high-severity signals
 * - Government-backed assets (EPF/PPF) are treated as high-quality anchors
 * - Stability-oriented assets with no negative return = quality positive
 */
function calculateInvestmentQualityPillar(
  holdings: NormalizedHolding[],
  summary: ReturnType<typeof getNormalizedSummary>
): PillarScore {
  const deductions: Deduction[] = [];
  let score = 100;

  const totalValue = summary.totalValue;
  if (totalValue === 0 || holdings.length === 0) {
    return getEmptyPillar('investment_quality', 'Investment Quality');
  }

  // Separate government-backed (always quality) from market-driven
  const govBacked    = holdings.filter(h => h.assetType === 'epf' || h.assetType === 'ppf');
  const otherHoldings = holdings.filter(h => h.assetType !== 'epf' && h.assetType !== 'ppf');

  const govValue = govBacked.reduce((s, h) => s + h.currentValue, 0);

  // Compute positive/negative return values from non-gov holdings
  let positiveReturnValue = govValue; // Gov-backed always count as positive quality
  let negativeReturnValue = 0;

  otherHoldings.forEach(h => {
    if (h.currentValue >= h.investedValue) {
      positiveReturnValue += h.currentValue;
    } else {
      negativeReturnValue += h.currentValue;
    }
  });

  const positiveReturnPct = (positiveReturnValue / totalValue) * 100;
  const negativeReturnPct = (negativeReturnValue / totalValue) * 100;

  // Score reduction based on proportion in negative-return holdings
  if (negativeReturnPct > 30) {
    const impact = Math.min((negativeReturnPct - 30) * 0.8, 25);
    score -= impact;
    deductions.push({
      reason: `${negativeReturnPct.toFixed(0)}% of portfolio (by value) shows unrealised losses — indicates quality concerns`,
      impact,
      severity: negativeReturnPct > 50 ? 'high' : 'medium',
      category: 'quality',
    });
  } else if (negativeReturnPct > 15) {
    const impact = Math.min((negativeReturnPct - 15) * 0.6, 15);
    score -= impact;
    deductions.push({
      reason: `${negativeReturnPct.toFixed(0)}% of portfolio is in holdings with unrealised losses`,
      impact,
      severity: 'low',
      category: 'quality',
    });
  }

  // Check for concentrated unrealised losses (large position in deep loss)
  otherHoldings.forEach(h => {
    if (h.investedValue > 0 && h.currentValue < h.investedValue) {
      const holdingWeightPct = (h.currentValue / totalValue) * 100;
      const lossPct = ((h.investedValue - h.currentValue) / h.investedValue) * 100;
      if (holdingWeightPct > 10 && lossPct > 20) {
        const impact = Math.min(lossPct * 0.25, 15);
        score -= impact;
        deductions.push({
          reason: `${h.name} carries a ${lossPct.toFixed(0)}% unrealised loss with ${holdingWeightPct.toFixed(0)}% portfolio weight`,
          impact,
          severity: lossPct > 40 ? 'high' : 'medium',
          category: 'quality',
        });
      }
    }
  });

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'investment_quality',
    displayName: 'Investment Quality',
    score: Math.round(score),
    weight: PILLAR_WEIGHTS.investment_quality,
    deductions,
    metadata: {
      color: getScoreColor(score),
      severity: getScoreSeverity(score),
      tooltip: `${positiveReturnPct.toFixed(0)}% of portfolio value in positive-return holdings`,
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