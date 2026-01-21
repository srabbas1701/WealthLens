/**
 * Real Estate Property Detail Data Contract
 * 
 * Type definitions for property detail dashboard data.
 * All values are ownership-adjusted and in raw numeric format.
 * UI layer handles formatting (currency, percentages, labels).
 */

// ============================================================================
// PROPERTY DETAIL DATA CONTRACT
// ============================================================================

export interface RealEstatePropertyDetailData {
  // Basic Property Info
  propertyId: string;
  propertyName: string;
  city: string;
  propertyType: 'residential' | 'commercial' | 'land';
  ownershipPercentage: number;

  // KPI Fields
  currentEstimatedValue: number | null;
  unrealizedGain: number | null;
  xirr: number | null;
  netRentalYield: number | null;
  emiRentGap: number | null;

  // Performance Fields
  purchasePrice: number | null;
  holdingPeriodYears: number | null;

  // Cash Flow Fields
  monthlyRent: number | null;
  monthlyEmi: number | null;
  maintenanceMonthly: number | null;
  propertyTaxMonthly: number | null;
  otherExpensesMonthly: number | null;
  monthlyExpenses: number | null;
  netMonthlyCashFlow: number | null;
  escalationPercent: number | null;

  // Loan Fields
  loanId: string | null;
  lenderName: string | null;
  loanAmount: number | null;
  interestRate: number | null;
  emi: number | null;
  outstandingBalance: number | null;
  tenureMonths: number | null;

  // Cashflow Fields (for editing)
  cashflowId: string | null;

  // Property Info Fields
  purchaseDate: string | null;
  registrationValue: number | null;
  carpetAreaSqft: number | null;
  builtupAreaSqft: number | null;
  reraNumber: string | null;
  builderName: string | null;
  projectName: string | null;
  address: string | null;
  state: string | null;
  pincode: string | null;
  valuationLastUpdated: string | null;
}
