/**
 * Real Estate Sell vs Hold Simulation Engine
 * 
 * Pure computation engine for comparing sell today vs hold scenarios.
 * No database access - works with existing analytics data.
 */

import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';
import type {
  SellHoldSimulationInputs,
  SellVsHoldResult,
} from '@/types/realEstateSellHold.types';
import { calculateXIRR } from '@/utils/xirr';

/**
 * Simulate Sell vs Hold
 * 
 * Compares selling property today vs holding for N years.
 * 
 * @param propertyData - Property detail analytics data
 * @param inputs - Simulation assumptions
 * @returns Sell vs Hold comparison result
 */
export function simulateSellVsHold(
  propertyData: RealEstatePropertyDetailData,
  inputs: SellHoldSimulationInputs
): SellVsHoldResult | null {
  // Validate required data
  if (
    propertyData.currentEstimatedValue === null ||
    propertyData.currentEstimatedValue <= 0
  ) {
    return null; // Cannot simulate without current value
  }

  const currentValue = propertyData.currentEstimatedValue;
  const outstandingLoan = propertyData.outstandingBalance ?? 0;
  const purchasePrice = propertyData.purchasePrice ?? 0;
  const monthlyRent = propertyData.monthlyRent ?? 0;
  const monthlyEmi = propertyData.monthlyEmi ?? 0;
  const monthlyExpenses = propertyData.monthlyExpenses ?? 0;

  // ========================================================================
  // SELL TODAY SCENARIO
  // ========================================================================

  const exitCostsToday = currentValue * (inputs.exitCostsPercent / 100);
  const capitalGainsToday = Math.max(0, currentValue - purchasePrice);
  const capitalGainsTaxToday = capitalGainsToday * (inputs.capitalGainsTaxRate / 100);

  const sellTodayNetProceeds =
    currentValue - outstandingLoan - exitCostsToday - capitalGainsTaxToday;

  // ========================================================================
  // HOLD SCENARIO (Year-by-year simulation)
  // ========================================================================

  const years = inputs.holdingPeriodYears;
  let projectedValue = currentValue;
  let annualRent = monthlyRent * 12;
  let cumulativeRentalIncome = 0;
  let cumulativeExpenses = 0;
  let cumulativeEmi = 0;

  // Track cash flows for IRR calculation
  const cashFlows: Array<{ date: Date; amount: number }> = [];
  const today = new Date();

  // Initial cash flow (negative - what we're holding)
  cashFlows.push({
    date: today,
    amount: -(currentValue - outstandingLoan), // Net equity today
  });

  // Simulate year by year
  for (let year = 1; year <= years; year++) {
    // Property value appreciation
    projectedValue = projectedValue * (1 + inputs.expectedPriceAppreciationPercent / 100);

    // Rent growth
    annualRent = annualRent * (1 + inputs.expectedRentGrowthPercent / 100);

    // Accumulate rental income (positive cash flow)
    cumulativeRentalIncome += annualRent;

    // Accumulate expenses
    const annualExpenses = monthlyExpenses * 12;
    cumulativeExpenses += annualExpenses;

    // Accumulate EMI (if loan still exists)
    // Simplified: assume loan continues for full period
    // In reality, loan would end when tenure completes
    if (monthlyEmi > 0) {
      cumulativeEmi += monthlyEmi * 12;
    }

    // Monthly cash flow: rent - EMI - expenses
    const monthlyNetCashFlow = annualRent / 12 - monthlyEmi - monthlyExpenses;
    const annualNetCashFlow = monthlyNetCashFlow * 12;

    // Add annual cash flow (positive if rent covers expenses)
    const yearDate = new Date(today);
    yearDate.setFullYear(today.getFullYear() + year);
    cashFlows.push({
      date: yearDate,
      amount: annualNetCashFlow,
    });
  }

  // At exit: projected value minus remaining loan (simplified - assume same ratio)
  // Simplified assumption: loan balance reduces proportionally with property value
  // In reality, loan balance would reduce based on EMI schedule
  const loanRatio = outstandingLoan > 0 && currentValue > 0
    ? outstandingLoan / currentValue
    : 0;
  const projectedLoanBalance = projectedValue * loanRatio;

  const exitCostsFuture = projectedValue * (inputs.exitCostsPercent / 100);
  const capitalGainsFuture = Math.max(0, projectedValue - purchasePrice);
  const capitalGainsTaxFuture = capitalGainsFuture * (inputs.capitalGainsTaxRate / 100);

  // Net rental surplus (income - expenses - EMI)
  const netRentalSurplus = cumulativeRentalIncome - cumulativeExpenses - cumulativeEmi;

  // Terminal cash flow: property sale proceeds (rental income already in annual cash flows)
  const propertySaleProceeds = projectedValue - projectedLoanBalance - exitCostsFuture - capitalGainsTaxFuture;

  // Add terminal cash flow (property sale only - rental income already accounted in annual flows)
  const exitDate = new Date(today);
  exitDate.setFullYear(today.getFullYear() + years);
  cashFlows.push({
    date: exitDate,
    amount: propertySaleProceeds,
  });

  // Calculate IRR for hold scenario
  let holdIRR: number | null = null;
  try {
    const xirrResult = calculateXIRR(cashFlows);
    holdIRR = xirrResult !== null ? xirrResult * 100 : null; // Convert to percentage
  } catch {
    // IRR calculation failed - insufficient data or invalid cash flows
    holdIRR = null;
  }

  // Net proceeds = property sale proceeds + cumulative rental surplus
  const holdNetProceeds = propertySaleProceeds + netRentalSurplus;

  // ========================================================================
  // COMPARISON
  // ========================================================================

  const absoluteDifference = holdNetProceeds - sellTodayNetProceeds;
  const percentageDifference =
    sellTodayNetProceeds > 0
      ? (absoluteDifference / sellTodayNetProceeds) * 100
      : null;

  // Determine better option (with threshold to avoid false precision)
  let betterOption: 'sell' | 'hold' | 'neutral' = 'neutral';
  if (Math.abs(absoluteDifference) < 1000) {
    // Less than ₹1000 difference = neutral
    betterOption = 'neutral';
  } else if (absoluteDifference > 0) {
    betterOption = 'hold';
  } else {
    betterOption = 'sell';
  }

  return {
    sellToday: {
      netProceeds: Math.round(sellTodayNetProceeds),
      currentValue: Math.round(currentValue),
      outstandingLoan: Math.round(outstandingLoan),
      exitCosts: Math.round(exitCostsToday),
      capitalGainsTax: Math.round(capitalGainsTaxToday),
    },
    holdScenario: {
      years,
      projectedExitValue: Math.round(projectedValue),
      cumulativeRentalIncome: Math.round(cumulativeRentalIncome),
      cumulativeExpenses: Math.round(cumulativeExpenses),
      netRentalSurplus: Math.round(netRentalSurplus),
      exitCosts: Math.round(exitCostsFuture),
      capitalGainsTax: Math.round(capitalGainsTaxFuture),
      netProceeds: Math.round(holdNetProceeds),
      irr: holdIRR !== null ? Math.round(holdIRR * 100) / 100 : null, // Round to 2 decimals
    },
    comparison: {
      absoluteDifference: Math.round(absoluteDifference),
      percentageDifference:
        percentageDifference !== null
          ? Math.round(percentageDifference * 100) / 100
          : null,
      betterOption,
    },
  };
}
