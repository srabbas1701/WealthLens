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
  portfolioImpactPercent: number; // Estimated portfolio impact %
  marketLinkedImpact: number;     // Impact magnitude on market-linked assets
  stabilityCushion: number;       // % of portfolio cushioned by stability assets
  explanation: {
    what: string;
    why: string;
    meaning: string;
  };
}

export interface MarketDrawdownScenario extends ScenarioImpact {
  scenarioType: 'marketDrawdown';
  marketDeclinePercent: number;
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
  rateHikeBps: number;
  marketLinkedVolatility: number;
  stabilityAssetImpact: number;
}

export interface MarketRecoveryScenario extends ScenarioImpact {
  scenarioType: 'marketRecovery';
  equityExposurePercent: number;
  marketRecoveryPercent: number;
  estimatedPortfolioGain: number;
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
 * stabilityCushion correctly uses the percentage value (not fraction).
 */
export function calculateMarketDrawdownScenario(
  stabilityData: StabilityAnalysis,
  marketDeclinePercent: number = -20
): MarketDrawdownScenario {
  const { metrics } = stabilityData;
  const { marketLinked, capitalProtected } = metrics;

  const marketLinkedFraction      = marketLinked.percentage / 100;
  const estimatedPortfolioDecline = marketLinkedFraction * Math.abs(marketDeclinePercent);

  return {
    scenarioType: 'marketDrawdown',
    marketDeclinePercent,
    estimatedPortfolioDecline,
    portfolioImpactPercent: estimatedPortfolioDecline,
    marketLinkedImpact: Math.abs(marketDeclinePercent),
    stabilityCushion: capitalProtected.percentage,
    explanation: {
      what: `In a ${Math.abs(marketDeclinePercent)}% market decline scenario, market-linked assets typically experience value changes proportional to the decline, while stability-oriented assets provide downside cushioning.`,
      why: `Your portfolio has ${marketLinked.percentage.toFixed(0)}% in market-linked assets, so only that portion is exposed to equity market movements. The remaining ${capitalProtected.percentage.toFixed(0)}% in stability-oriented assets acts as a buffer.`,
      meaning: `With ${capitalProtected.percentage.toFixed(0)}% in stability-oriented assets, your portfolio is estimated to decline ${estimatedPortfolioDecline.toFixed(1)}% rather than the full ${Math.abs(marketDeclinePercent)}% a 100% equity portfolio would face.`,
    },
  };
}

/**
 * Calculate Sector Shock Scenario
 *
 * Estimates impact if the largest sector exposure underperforms by 30%.
 * Uses real sector data from stability analytics (topSectors field).
 */
export function calculateSectorShockScenario(
  stabilityData: StabilityAnalysis,
  largestSector: string,
  sectorExposurePercent: number
): SectorShockScenario {
  const { metrics } = stabilityData;

  const sectorShockPercent     = 30;
  const portfolioImpactPercent = (sectorExposurePercent / 100) * sectorShockPercent;

  return {
    scenarioType: 'sectorShock',
    sector: largestSector,
    sectorExposurePercent,
    estimatedSectorImpact: portfolioImpactPercent,
    sectorRank: 1,
    portfolioImpactPercent,
    marketLinkedImpact: sectorShockPercent,
    stabilityCushion: metrics.capitalProtected.percentage,
    explanation: {
      what: `A ${sectorShockPercent}% sector-specific shock occurs when an industry faces concentrated headwinds — regulatory changes, commodity price swings, or sector-wide earnings misses.`,
      why: `Your largest equity sector exposure is ${largestSector} at ${sectorExposurePercent.toFixed(0)}% of direct equity. A ${sectorShockPercent}% decline in this sector alone could reduce overall portfolio value by approximately ${portfolioImpactPercent.toFixed(1)}%.`,
      meaning: `Sector concentration amplifies sector-specific risk. Portfolios spread across 6+ sectors typically show lower drawdown from any single sector shock. Stability-oriented assets (${metrics.capitalProtected.percentage.toFixed(0)}% of portfolio) are unaffected by equity sector movements.`,
    },
  };
}

/**
 * Calculate Interest Rate Shock Scenario
 *
 * Models the impact of a 50 bps RBI rate hike.
 * - Equity: ~6% P/E compression on rate-sensitive valuations
 * - FDs/PPF/EPF: principal unaffected; FD renewals benefit from higher rates
 */
export function calculateRateShockScenario(
  stabilityData: StabilityAnalysis
): RateShockScenario {
  const { metrics } = stabilityData;
  const { marketLinked, capitalProtected } = metrics;

  const rateHikeBps            = 50;
  const equityVolatilityPct    = 6;
  const stabilityImpactPct     = 0;

  const portfolioImpactPercent = (marketLinked.percentage / 100) * equityVolatilityPct;

  return {
    scenarioType: 'rateShock',
    rateHikeBps,
    marketLinkedVolatility: equityVolatilityPct,
    stabilityAssetImpact: stabilityImpactPct,
    portfolioImpactPercent,
    marketLinkedImpact: equityVolatilityPct,
    stabilityCushion: capitalProtected.percentage,
    explanation: {
      what: `A ${rateHikeBps} basis point RBI rate hike typically causes equity market P/E compression, particularly for rate-sensitive sectors (real estate, NBFCs, utilities). Stability-oriented assets like FDs and PPF are largely unaffected in principal value.`,
      why: `Your ${marketLinked.percentage.toFixed(0)}% in market-linked assets is exposed to equity valuation changes. The ${capitalProtected.percentage.toFixed(0)}% in stability-oriented assets (EPF, PPF, FDs) maintains principal stability — and FDs renewing post-hike may benefit from higher interest rates.`,
      meaning: `Your portfolio is estimated to experience approximately ${portfolioImpactPercent.toFixed(1)}% impact from a ${rateHikeBps} bps rate shock, significantly less than a fully equity portfolio (${equityVolatilityPct}%). The stability allocation acts as a natural rate-shock buffer.`,
    },
  };
}

/**
 * Calculate Market Recovery Scenario
 *
 * Models participation in a 20% market recovery.
 * portfolioImpactPercent = equity% × recovery% (realistic gain, not full equity%).
 */
export function calculateMarketRecoveryScenario(
  stabilityData: StabilityAnalysis,
  marketRecoveryPercent: number = 20
): MarketRecoveryScenario {
  const { metrics } = stabilityData;
  const { marketLinked, capitalProtected } = metrics;

  const equityExposurePercent  = marketLinked.percentage;
  const estimatedPortfolioGain = (equityExposurePercent / 100) * marketRecoveryPercent;

  return {
    scenarioType: 'marketRecovery',
    equityExposurePercent,
    marketRecoveryPercent,
    estimatedPortfolioGain,
    portfolioImpactPercent: estimatedPortfolioGain,
    marketLinkedImpact: marketRecoveryPercent,
    stabilityCushion: capitalProtected.percentage,
    explanation: {
      what: `In a ${marketRecoveryPercent}% equity market recovery, market-linked assets participate proportionally in the upswing. Stability-oriented assets preserve capital but participate less in equity-driven rallies.`,
      why: `Your ${equityExposurePercent.toFixed(0)}% equity exposure means your portfolio captures approximately ${equityExposurePercent.toFixed(0)}% of the recovery benefit — estimated at ${estimatedPortfolioGain.toFixed(1)}% overall portfolio gain from a ${marketRecoveryPercent}% market rise.`,
      meaning: `The ${capitalProtected.percentage.toFixed(0)}% in stability-oriented assets limits full participation in equity rallies, but this is the same cushion that protected you during the drawdown scenario. A balanced portfolio trades some upside for meaningful downside protection.`,
    },
  };
}
