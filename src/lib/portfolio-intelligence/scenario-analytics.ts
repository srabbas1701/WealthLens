/**
 * Scenario Analytics
 * 
 * V3: Scenario-Linked Analytics
 * 
 * Simulates how portfolio structure behaves under different hypothetical market conditions.
 * Educational and risk-understanding focused. NO predictions, NO investment advice.
 * 
 * Financial Logic:
 * - Uses current exposure and stability data only
 * - Focuses on relative impact and risk understanding
 * - Scenarios are hypothetical and educational
 */

import type { StabilityAnalysis } from './stability-analytics';

export interface ScenarioImpact {
  portfolioImpactPercent: number; // Estimated portfolio impact percentage
  marketLinkedImpact: number; // Impact on market-linked assets
  stabilityCushion: number; // Cushioning effect from stability assets
  explanation: {
    what: string;
    why: string;
    meaning: string;
  };
}

export interface MarketDrawdownScenario extends ScenarioImpact {
  scenarioType: 'marketDrawdown';
  marketDeclinePercent: number; // e.g., -20
  estimatedPortfolioDecline: number;
}

export interface SectorShockScenario extends ScenarioImpact {
  scenarioType: 'sectorShock';
  sector: string;
  sectorExposurePercent: number;
  estimatedSectorImpact: number;
  sectorRank: number;
}

export interface RateShockScenario extends ScenarioImpact {
  scenarioType: 'rateShock';
  marketLinkedVolatility: number; // Estimated volatility impact
  stabilityAssetImpact: number; // Estimated impact on stability assets
}

export interface MarketRecoveryScenario extends ScenarioImpact {
  scenarioType: 'marketRecovery';
  equityExposurePercent: number;
  estimatedRecoveryParticipation: number;
}

export type ScenarioResult = 
  | MarketDrawdownScenario 
  | SectorShockScenario 
  | RateShockScenario 
  | MarketRecoveryScenario;

/**
 * Calculate Market Drawdown Scenario
 * 
 * Estimates portfolio impact if equity markets decline by a given percentage.
 * Uses market-linked exposure from stability analytics.
 */
export function calculateMarketDrawdownScenario(
  stabilityData: StabilityAnalysis,
  marketDeclinePercent: number = -20
): MarketDrawdownScenario {
  const { metrics } = stabilityData;
  const { marketLinked, capitalProtected } = metrics;
  
  // Market-linked assets are affected by market decline
  // Stability-oriented assets provide cushioning (assume minimal impact)
  const marketLinkedExposure = marketLinked.percentage / 100;
  const stabilityExposure = capitalProtected.percentage / 100;
  
  // Estimate portfolio impact
  // Market-linked assets decline by marketDeclinePercent
  // Stability assets have minimal decline (assume 0% for simplicity)
  const estimatedPortfolioDecline = marketLinkedExposure * Math.abs(marketDeclinePercent);
  
  const marketLinkedImpact = Math.abs(marketDeclinePercent);
  const stabilityCushion = stabilityExposure; // Percentage of portfolio cushioned
  
  return {
    scenarioType: 'marketDrawdown',
    marketDeclinePercent,
    estimatedPortfolioDecline,
    portfolioImpactPercent: estimatedPortfolioDecline,
    marketLinkedImpact,
    stabilityCushion,
    explanation: {
      what: `In a ${Math.abs(marketDeclinePercent)}% market decline scenario, market-linked assets typically experience value changes, while stability-oriented assets provide cushioning.`,
      why: `Your portfolio has ${marketLinked.percentage.toFixed(0)}% in market-linked assets, which means ${marketLinked.percentage.toFixed(0)}% of your portfolio value is exposed to equity market movements.`,
      meaning: `Stability-oriented assets (${capitalProtected.percentage.toFixed(0)}%) provide downside protection during market stress, reducing overall portfolio impact compared to a fully equity portfolio.`,
    },
  };
}

/**
 * Calculate Sector Shock Scenario
 * 
 * Estimates impact if the largest sector exposure underperforms.
 * Requires sector exposure data (would need to integrate with sector analytics).
 */
export function calculateSectorShockScenario(
  stabilityData: StabilityAnalysis,
  largestSector: string,
  sectorExposurePercent: number
): SectorShockScenario {
  const { metrics } = stabilityData;
  
  // Estimate impact if sector underperforms by 30%
  const sectorShockPercent = -30;
  const estimatedSectorImpact = (sectorExposurePercent / 100) * Math.abs(sectorShockPercent);
  
  // Portfolio impact is proportional to sector exposure
  const portfolioImpactPercent = estimatedSectorImpact;
  
  return {
    scenarioType: 'sectorShock',
    sector: largestSector,
    sectorExposurePercent,
    estimatedSectorImpact,
    sectorRank: 1, // Largest sector
    portfolioImpactPercent,
    marketLinkedImpact: Math.abs(sectorShockPercent),
    stabilityCushion: metrics.capitalProtected.percentage,
    explanation: {
      what: `Sector-specific shocks occur when a particular industry faces challenges, affecting companies within that sector.`,
      why: `Your largest sector exposure is ${largestSector} at ${sectorExposurePercent.toFixed(0)}%, meaning a significant portion of your portfolio is linked to this sector's performance.`,
      meaning: `High sector concentration increases vulnerability to sector-specific risks, while diversified portfolios are less affected by individual sector movements.`,
    },
  };
}

/**
 * Calculate Interest Rate Shock Scenario
 * 
 * Explains impact on market-linked vs stability assets during rate changes.
 */
export function calculateRateShockScenario(
  stabilityData: StabilityAnalysis
): RateShockScenario {
  const { metrics } = stabilityData;
  const { marketLinked, capitalProtected } = metrics;
  
  // Rate shocks affect both types but differently
  // Market-linked: volatility through valuation changes
  // Stability assets: minimal principal impact, return adjustments
  const marketLinkedVolatility = 10; // Estimated volatility increase
  const stabilityAssetImpact = 2; // Minimal impact on stability assets
  
  const portfolioImpactPercent = (marketLinked.percentage / 100) * marketLinkedVolatility;
  
  return {
    scenarioType: 'rateShock',
    marketLinkedVolatility,
    stabilityAssetImpact,
    portfolioImpactPercent,
    marketLinkedImpact: marketLinkedVolatility,
    stabilityCushion: capitalProtected.percentage,
    explanation: {
      what: `Interest rate changes can affect both market-linked assets (through valuation) and stability-oriented assets (through returns).`,
      why: `Market-linked assets may experience volatility due to changing valuations, while stability-oriented assets like FDs may see return adjustments but maintain principal stability.`,
      meaning: `A balanced portfolio with both market-linked and stability-oriented assets may experience moderate volatility during rate changes compared to a single-asset-type portfolio.`,
    },
  };
}

/**
 * Calculate Market Recovery Scenario
 * 
 * Illustrates participation in long-term market recovery.
 */
export function calculateMarketRecoveryScenario(
  stabilityData: StabilityAnalysis
): MarketRecoveryScenario {
  const { metrics } = stabilityData;
  const { marketLinked } = metrics;
  
  // Equity exposure equals market-linked exposure
  const equityExposurePercent = marketLinked.percentage;
  
  // Recovery participation is proportional to equity exposure
  const estimatedRecoveryParticipation = equityExposurePercent;
  
  return {
    scenarioType: 'marketRecovery',
    equityExposurePercent,
    estimatedRecoveryParticipation,
    portfolioImpactPercent: estimatedRecoveryParticipation,
    marketLinkedImpact: 100, // Full participation for equity
    stabilityCushion: metrics.capitalProtected.percentage,
    explanation: {
      what: `During market recovery, equity markets typically see value appreciation, benefiting market-linked portfolios.`,
      why: `Your ${equityExposurePercent.toFixed(0)}% equity exposure means your portfolio would participate in market recovery, while stability-oriented assets provide stability but lower participation.`,
      meaning: `A portfolio with equity exposure participates in long-term market growth, while stability-oriented assets preserve capital but may have lower growth participation.`,
    },
  };
}
