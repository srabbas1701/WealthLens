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
 * Calculate geography exposure (India vs International)
 * 
 * Note: Requires factsheet data for MF international allocation.
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
    mfHoldings.forEach(holding => {
      if (holding.isin) {
        const geoData = geographyDataViaMF.get(holding.isin.toUpperCase());
        if (geoData) {
          indiaValue += geoData.india;
          internationalValue += geoData.international;
          const total = geoData.india + geoData.international;
          if (total > 0 && geoData.international > 0) {
            mfSources.push({
              name: holding.name,
              value: geoData.international,
              pct: (geoData.international / total) * 100,
            });
          }
        }
      }
    });
  } else {
    // Default: Assume all MF is India
    const mfValue = mfHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    indiaValue += mfValue;
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