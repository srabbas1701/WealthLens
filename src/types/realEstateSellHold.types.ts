/**
 * Real Estate Sell vs Hold Simulation Types
 * 
 * Type definitions for property sell/hold decision simulation.
 */

// ============================================================================
// SIMULATION INPUTS
// ============================================================================

export interface SellHoldSimulationInputs {
  holdingPeriodYears: number; // 1 to 10
  expectedPriceAppreciationPercent: number; // Annual %
  expectedRentGrowthPercent: number; // Annual %
  exitCostsPercent: number; // % of property value
  capitalGainsTaxRate: number; // %
}

// ============================================================================
// SIMULATION RESULTS
// ============================================================================

export interface SellVsHoldResult {
  sellToday: {
    netProceeds: number;
    currentValue: number;
    outstandingLoan: number;
    exitCosts: number;
    capitalGainsTax: number;
  };

  holdScenario: {
    years: number;
    projectedExitValue: number;
    cumulativeRentalIncome: number;
    cumulativeExpenses: number;
    netRentalSurplus: number;
    exitCosts: number;
    capitalGainsTax: number;
    netProceeds: number;
    irr: number | null;
  };

  comparison: {
    absoluteDifference: number;
    percentageDifference: number | null;
    betterOption: 'sell' | 'hold' | 'neutral';
  };
}
