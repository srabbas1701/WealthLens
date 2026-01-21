/**
 * Real Estate Property Detail Data Mapper
 * 
 * Maps analytics outputs to property detail data contract.
 * Pure mapping logic - no business calculations.
 */

import type { OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
import { calculatePerAssetAnalytics } from '@/services/realEstateAnalytics.service';
import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';

/**
 * Get Real Estate Property Detail Data
 * 
 * Maps analytics outputs to property detail data contract.
 * All values are ownership-adjusted and in raw numeric format.
 * 
 * @param assetData - Real estate asset with loan and cashflow (ownership-adjusted)
 * @returns Property detail data conforming to RealEstatePropertyDetailData contract
 */
export async function getRealEstatePropertyDetailData(
  assetData: OwnershipAdjustedAsset
): Promise<RealEstatePropertyDetailData> {
  const { asset, loan, cashflow, ownershipAdjusted } = assetData;

  // Compute analytics
  const analytics = await calculatePerAssetAnalytics(assetData);

  // Calculate monthly expenses (ownership-adjusted)
  const ownershipPercentage = asset.ownership_percentage ?? 100;
  const ownership = ownershipPercentage / 100;

  const maintenanceMonthlyRaw = cashflow?.maintenance_monthly ?? null;
  const propertyTaxAnnualRaw = cashflow?.property_tax_annual ?? null;
  const otherExpensesMonthlyRaw = cashflow?.other_expenses_monthly ?? null;

  const maintenanceMonthly =
    maintenanceMonthlyRaw !== null ? maintenanceMonthlyRaw * ownership : null;
  const propertyTaxMonthly =
    propertyTaxAnnualRaw !== null ? (propertyTaxAnnualRaw / 12) * ownership : null;
  const otherExpensesMonthly =
    otherExpensesMonthlyRaw !== null ? otherExpensesMonthlyRaw * ownership : null;

  const monthlyExpenses =
    maintenanceMonthly !== null || propertyTaxMonthly !== null || otherExpensesMonthly !== null
      ? (maintenanceMonthly ?? 0) + (propertyTaxMonthly ?? 0) + (otherExpensesMonthly ?? 0)
      : null;

  // Calculate net monthly cash flow
  const monthlyRent = ownershipAdjusted.monthlyRent;
  const monthlyEmi = loan?.emi ?? null;
  const expenses = monthlyExpenses ?? 0;
  const netMonthlyCashFlow =
    monthlyRent !== null && monthlyEmi !== null
      ? monthlyRent - monthlyEmi - expenses
      : monthlyRent !== null
      ? monthlyRent - expenses
      : monthlyEmi !== null
      ? -monthlyEmi - expenses
      : null;

  // Format purchase date
  const purchaseDate = asset.purchase_date
    ? new Date(asset.purchase_date).toISOString().split('T')[0]
    : null;

  return {
    // Basic Property Info
    propertyId: asset.id,
    propertyName: asset.property_nickname,
    city: asset.city,
    propertyType: asset.property_type,
    ownershipPercentage,

    // KPI Fields
    currentEstimatedValue: analytics.metrics.currentValue,
    unrealizedGain: analytics.metrics.unrealizedGain,
    xirr: analytics.metrics.xirr,
    netRentalYield: analytics.metrics.netYield,
    emiRentGap: analytics.metrics.emiRentGap,

    // Performance Fields
    purchasePrice: ownershipAdjusted.purchasePrice,
    holdingPeriodYears: analytics.metrics.holdingPeriodYears,

    // Cash Flow Fields
    monthlyRent,
    monthlyEmi,
    maintenanceMonthly,
    propertyTaxMonthly,
    otherExpensesMonthly,
    monthlyExpenses,
    netMonthlyCashFlow,
    escalationPercent: cashflow?.escalation_percent ?? null,

    // Loan Fields
    loanId: loan?.id ?? null,
    lenderName: loan?.lender_name ?? null,
    loanAmount: loan ? loan.loan_amount * ownership : null,
    interestRate: loan?.interest_rate ?? null,
    emi: loan?.emi ?? null,
    outstandingBalance: ownershipAdjusted.outstandingBalance,
    tenureMonths: loan?.tenure_months ?? null,

    // Cashflow Fields (for editing)
    cashflowId: cashflow?.id ?? null,

    // Property Info Fields
    purchaseDate,
    registrationValue: asset.registration_value
      ? asset.registration_value * ownership
      : null,
    carpetAreaSqft: asset.carpet_area_sqft,
    builtupAreaSqft: asset.builtup_area_sqft,
    reraNumber: asset.rera_number,
    builderName: asset.builder_name,
    projectName: asset.project_name,
    address: asset.address,
    state: asset.state,
    pincode: asset.pincode,
    valuationLastUpdated: asset.valuation_last_updated,
  };
}
