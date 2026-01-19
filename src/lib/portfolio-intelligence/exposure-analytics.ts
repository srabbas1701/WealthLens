/**
 * Exposure Analytics Utilities
 * 
 * PORTFOLIO INTELLIGENCE - EXPOSURE ANALYSIS
 * 
 * This module provides utilities for calculating exposure analytics,
 * combining direct holdings with look-through exposure from mutual funds.
 * 
 * Key Principle: Asset ownership ≠ Asset exposure
 * - Ownership: What you own (e.g., ₹10L in MF)
 * - Exposure: What you're exposed to (e.g., ₹8.5L equity via MF)
 */

import { NormalizedHolding } from './asset-normalization';

export interface MFExposureData {
  equity: number;
  debt: number;
  other: number;
  total: number;
}

export interface CombinedExposureView {
  assetType: string;
  directHoldings: number;
  exposureViaMF: number;
  combinedView: number;
}

export interface SectorExposure {
  sector: string;
  directEquity: number;
  viaMF: number;
  total: number;
  percentage: number;
  benchmarkPct?: number; // NIFTY 500 benchmark
}

export interface MarketCapExposure {
  category: 'Large' | 'Mid' | 'Small';
  directEquity: number;
  viaMF: number;
  total: number;
  percentage: number;
  recommendedRange?: { min: number; max: number };
}

export interface GeographyExposure {
  geography: 'India' | 'International';
  value: number;
  percentage: number;
  mfSources: Array<{ name: string; value: number; pct: number }>;
}

/**
 * Calculate mutual fund exposure breakdown
 * 
 * Note: Currently uses estimates. In production, would use factsheet data.
 * For now, assumes:
 * - Equity MF: 85% equity, 12% debt, 3% other
 * - Debt MF: 10% equity, 85% debt, 5% other
 * - Hybrid MF: 50% equity, 45% debt, 5% other
 */
export function calculateMFExposure(
  mfHoldings: NormalizedHolding[],
  factsheetData?: Map<string, { equityPct: number; debtPct: number; otherPct: number }>
): MFExposureData {
  let totalEquity = 0;
  let totalDebt = 0;
  let totalOther = 0;
  
  mfHoldings.forEach(holding => {
    const value = holding.currentValue;
    
    // Use factsheet data if available
    if (factsheetData && holding.isin) {
      const factsheet = factsheetData.get(holding.isin.toUpperCase());
      if (factsheet) {
        totalEquity += value * (factsheet.equityPct / 100);
        totalDebt += value * (factsheet.debtPct / 100);
        totalOther += value * (factsheet.otherPct / 100);
        return;
      }
    }
    
    // Fallback to estimates based on asset class
    const assetClass = holding.assetClass?.toLowerCase() || '';
    
    if (assetClass === 'debt') {
      // Debt funds
      totalEquity += value * 0.10;
      totalDebt += value * 0.85;
      totalOther += value * 0.05;
    } else if (assetClass === 'hybrid') {
      // Hybrid funds
      totalEquity += value * 0.50;
      totalDebt += value * 0.45;
      totalOther += value * 0.05;
    } else {
      // Equity funds (default)
      totalEquity += value * 0.85;
      totalDebt += value * 0.12;
      totalOther += value * 0.03;
    }
  });
  
  return {
    equity: totalEquity,
    debt: totalDebt,
    other: totalOther,
    total: totalEquity + totalDebt + totalOther,
  };
}

/**
 * Calculate combined exposure view (direct + via MF)
 */
export function calculateCombinedExposure(
  directEquityHoldings: NormalizedHolding[],
  mfExposure: MFExposureData,
  totalPortfolioValue: number
): CombinedExposureView[] {
  const directEquity = directEquityHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  
  return [
    {
      assetType: 'Equity',
      directHoldings: directEquity,
      exposureViaMF: mfExposure.equity,
      combinedView: directEquity + mfExposure.equity,
    },
    {
      assetType: 'Debt',
      directHoldings: 0, // Assuming no direct debt holdings (bonds/FDs handled separately)
      exposureViaMF: mfExposure.debt,
      combinedView: mfExposure.debt,
    },
    {
      assetType: 'Cash/Other',
      directHoldings: 0,
      exposureViaMF: mfExposure.other,
      combinedView: mfExposure.other,
    },
  ];
}

/**
 * Calculate sector exposure (direct equity + MF equity exposure)
 * 
 * Note: Sector exposure via MF requires factsheet data with stock-level holdings.
 * This is a placeholder that only calculates direct equity sector exposure.
 */
export function calculateSectorExposure(
  directEquityHoldings: NormalizedHolding[],
  mfHoldings: NormalizedHolding[],
  totalMarketValue: number,
  sectorDataViaMF?: Map<string, Map<string, number>> // fund ISIN -> sector -> value
): SectorExposure[] {
  const sectorMap = new Map<string, { direct: number; viaMF: number }>();
  
  // Add direct equity sector exposure
  directEquityHoldings.forEach(holding => {
    if (holding.sector) {
      const current = sectorMap.get(holding.sector) || { direct: 0, viaMF: 0 };
      current.direct += holding.currentValue;
      sectorMap.set(holding.sector, current);
    }
  });
  
  // Add MF sector exposure (if data available)
  if (sectorDataViaMF) {
    mfHoldings.forEach(holding => {
      if (holding.isin) {
        const fundSectors = sectorDataViaMF.get(holding.isin.toUpperCase());
        if (fundSectors) {
          fundSectors.forEach((value, sector) => {
            const current = sectorMap.get(sector) || { direct: 0, viaMF: 0 };
            current.viaMF += value;
            sectorMap.set(sector, current);
          });
        }
      }
    });
  }
  
  // Convert to array and calculate percentages
  const exposures: SectorExposure[] = Array.from(sectorMap.entries()).map(([sector, values]) => {
    const total = values.direct + values.viaMF;
    return {
      sector,
      directEquity: values.direct,
      viaMF: values.viaMF,
      total,
      percentage: totalMarketValue > 0 ? (total / totalMarketValue) * 100 : 0,
    };
  });
  
  return exposures.sort((a, b) => b.total - a.total);
}

/**
 * Calculate market cap exposure
 * 
 * Note: Requires factsheet data for MF market cap breakdown.
 * This is a placeholder.
 */
export function calculateMarketCapExposure(
  directEquityHoldings: NormalizedHolding[],
  mfHoldings: NormalizedHolding[],
  totalMarketValue: number,
  marketCapDataViaMF?: Map<string, { large: number; mid: number; small: number }>
): MarketCapExposure[] {
  // Placeholder - would require market cap data for stocks and MF factsheets
  const exposures: MarketCapExposure[] = [
    {
      category: 'Large',
      directEquity: 0,
      viaMF: 0,
      total: 0,
      percentage: 0,
      recommendedRange: { min: 50, max: 60 },
    },
    {
      category: 'Mid',
      directEquity: 0,
      viaMF: 0,
      total: 0,
      percentage: 0,
      recommendedRange: { min: 25, max: 35 },
    },
    {
      category: 'Small',
      directEquity: 0,
      viaMF: 0,
      total: 0,
      percentage: 0,
      recommendedRange: { min: 10, max: 20 },
    },
  ];
  
  return exposures;
}

/**
 * Detect if a mutual fund is likely international based on fund name patterns
 * 
 * This is a fallback when factsheet geography data is not available.
 * Uses clear, unambiguous indicators in fund names.
 * 
 * Returns: { isInternational: boolean; confidence: 'high' | 'medium' | 'low' }
 */
function detectInternationalFundFromName(fundName: string): { isInternational: boolean; confidence: 'high' | 'medium' | 'low' } {
  if (!fundName) return { isInternational: false, confidence: 'low' };
  
  const nameLower = fundName.toLowerCase();
  
  // HIGH CONFIDENCE indicators (unambiguous international exposure)
  const highConfidencePatterns = [
    /\b(global|international|overseas|foreign)\b/i,
    /\b(nyse|nasdaq|s&p|dow|sp500|s&p 500)\b/i,
    /\b(us|usa|america|american|united states)\b/i,
    /\b(fang|faang)\b/i, // FANG/FAANG funds are typically US tech
    /\b(world|worldwide)\b/i,
    /\b(emerging markets|developed markets)\b/i,
    /\b(europe|european|uk|united kingdom|japan|china|asia pacific)\b/i,
  ];
  
  for (const pattern of highConfidencePatterns) {
    if (pattern.test(nameLower)) {
      return { isInternational: true, confidence: 'high' };
    }
  }
  
  // MEDIUM CONFIDENCE indicators (likely international but could be ambiguous)
  const mediumConfidencePatterns = [
    /\b(etf fund of fund|fof|fund of fund)\b/i, // FoF often invests in international ETFs
    /\b(technology etf|tech etf)\b/i, // Tech ETFs are often international
    /\b(artificial intelligence|ai)\b/i, // AI funds often have international exposure
  ];
  
  for (const pattern of mediumConfidencePatterns) {
    if (pattern.test(nameLower)) {
      return { isInternational: true, confidence: 'medium' };
    }
  }
  
  return { isInternational: false, confidence: 'low' };
}

/**
 * Calculate geography exposure (India vs International)
 * 
 * ZERO-HALLUCINATION GUARANTEE:
 * - Only processes holdings passed to this function
 * - Never assumes or hardcodes fund names
 * - Only includes funds in mfSources if they have international exposure > 0
 * - If geography data is missing, uses intelligent name-based detection as fallback
 * 
 * REQUIREMENTS:
 * - directEquityHoldings: MUST be actual user holdings (not mock/test data)
 * - mfHoldings: MUST be actual user MF holdings (not mock/test data)
 * - geographyDataViaMF: Optional map of ISIN -> {india, international} values
 * 
 * FALLBACK LOGIC:
 * - If geographyDataViaMF is not provided, uses name-based detection
 * - Only marks funds as international if name contains clear indicators (high/medium confidence)
 * - Conservative approach: when in doubt, assumes India
 */
export function calculateGeographyExposure(
  directEquityHoldings: NormalizedHolding[],
  mfHoldings: NormalizedHolding[],
  totalMarketValue: number,
  geographyDataViaMF?: Map<string, { india: number; international: number }>
): GeographyExposure[] {
  let indiaValue = 0;
  let internationalValue = 0;
  const mfSources: Array<{ name: string; value: number; pct: number }> = [];
  
  // All direct equity is India (assuming Indian stocks)
  indiaValue += directEquityHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  
  // Add MF exposure (if data available)
  if (geographyDataViaMF) {
    // CRITICAL: Only process funds that are in mfHoldings (user's actual holdings)
    mfHoldings.forEach(holding => {
      if (holding.isin) {
        const geoData = geographyDataViaMF.get(holding.isin.toUpperCase());
        if (geoData) {
          // geographyDataViaMF format: {india: number, international: number}
          // These can be either:
          // 1. Percentages (0-100) - sum should be ~100
          // 2. Absolute values (in currency) - already calculated exposure
          // 
          // We'll handle both cases by checking if they sum to ~100 (percentages) or larger (absolute)
          const fundValue = holding.currentValue;
          const totalGeo = geoData.india + geoData.international;
          
          let indiaExposure: number;
          let internationalExposure: number;
          let internationalPct: number;
          
          if (totalGeo > 0 && totalGeo <= 110) {
            // Likely percentages (0-100, allow some tolerance)
            const indiaPct = geoData.india;
            const internationalPctRaw = geoData.international;
            
            // Normalize to ensure they sum to 100
            const normalizedIndiaPct = (geoData.india / totalGeo) * 100;
            const normalizedInternationalPct = (geoData.international / totalGeo) * 100;
            
            indiaExposure = fundValue * (normalizedIndiaPct / 100);
            internationalExposure = fundValue * (normalizedInternationalPct / 100);
            internationalPct = normalizedInternationalPct;
          } else {
            // Likely absolute values (already calculated exposure in currency)
            // Use as-is, but ensure they don't exceed fund value
            indiaExposure = Math.min(geoData.india, fundValue);
            internationalExposure = Math.min(geoData.international, fundValue - indiaExposure);
            internationalPct = fundValue > 0 ? (internationalExposure / fundValue) * 100 : 0;
          }
          
          indiaValue += indiaExposure;
          internationalValue += internationalExposure;
          
          // Only add to sources if international exposure > 0
          if (internationalExposure > 0) {
            mfSources.push({
              name: holding.name,
              value: internationalExposure,
              pct: internationalPct,
            });
          }
        }
        // If geography data is missing for this fund, exclude it from geography calc
        // (Don't assume - let caller handle missing data)
      }
    });
  } else {
    // FALLBACK: Use intelligent name-based detection when geography data is not available
    // This is a reasonable fallback for international funds with clear indicators
    mfHoldings.forEach(holding => {
      const fundValue = holding.currentValue;
      const detection = detectInternationalFundFromName(holding.name);
      
      if (detection.isInternational && detection.confidence === 'high') {
        // High confidence: Assume 100% international (typical for global/international funds)
        internationalValue += fundValue;
        mfSources.push({
          name: holding.name,
          value: fundValue,
          pct: 100, // 100% international
        });
      } else if (detection.isInternational && detection.confidence === 'medium') {
        // Medium confidence: Assume 80% international (FoF/tech ETFs often have some India exposure)
        const internationalExposure = fundValue * 0.80;
        const indiaExposure = fundValue * 0.20;
        internationalValue += internationalExposure;
        indiaValue += indiaExposure;
        mfSources.push({
          name: holding.name,
          value: internationalExposure,
          pct: 80, // 80% international
        });
      } else {
        // Low confidence or no indicators: Assume India (conservative default)
        indiaValue += fundValue;
      }
    });
  }
  
  const total = indiaValue + internationalValue;
  
  return [
    {
      geography: 'India',
      value: indiaValue,
      percentage: total > 0 ? (indiaValue / total) * 100 : 100,
      mfSources: [],
    },
    {
      geography: 'International',
      value: internationalValue,
      percentage: total > 0 ? (internationalValue / total) * 100 : 0,
      mfSources: mfSources.sort((a, b) => b.value - a.value),
    },
  ];
}

/**
 * Flag sectors with >25% concentration
 */
export function flagSectorConcentration(exposures: SectorExposure[]): SectorExposure[] {
  return exposures.map(exposure => ({
    ...exposure,
    // Add flag in metadata if needed
  })).filter(e => e.percentage > 25);
}