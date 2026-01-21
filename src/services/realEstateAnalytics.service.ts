/**
 * Real Estate Analytics Service
 * 
 * Production-ready analytics engine for Real Estate assets.
 * Computes per-asset and portfolio-level metrics with:
 * - Ownership-percentage adjustment
 * - Loan-aware calculations
 * - Conservative and explainable formulas
 * 
 * @module services/realEstateAnalytics.service
 */

import type { Database } from '@/types/supabase';
import type { OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
import { calculateXIRR } from '@/utils/xirr';

// Type aliases for clarity
type RealEstateAsset = Database['public']['Tables']['real_estate_assets']['Row'];
type RealEstateLoan = Database['public']['Tables']['real_estate_loans']['Row'];
type RealEstateCashflow = Database['public']['Tables']['real_estate_cashflows']['Row'];
type RentalStatus = Database['public']['Enums']['rental_status_enum'];

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Per-Asset Analytics Result
 */
export interface PerAssetAnalytics {
  assetId: string;
  metrics: {
    currentValue: number | null;
    unrealizedGain: number | null;
    grossYield: number | null;
    netYield: number | null;
    emiRentGap: number | null;
    emiRentGapLabel: 'positive_carry' | 'neutral' | 'negative_carry' | null;
    xirr: number | null;
    holdingPeriodYears: number | null;
  };
  metadata: {
    valuationSource: 'user_override' | 'system_estimate' | 'purchase_price';
    ownershipPercentage: number;
    hasLoan: boolean;
    rentalStatus: RentalStatus | null;
  };
}

/**
 * Portfolio-Level Analytics Result
 */
export interface PortfolioAnalytics {
  totalValue: number; // total_real_estate_value
  netWorth: number; // net_real_estate_worth (after deducting loans)
  totalLoanOutstanding: number; // total_loan_outstanding (ownership-adjusted)
  realEstateAllocationPercent: number | null; // % of net worth in real estate
  incomeAssetPercentage: number; // Income-generating assets %
  concentrationMap: Array<{
    assetId: string;
    propertyName: string;
    concentrationPercent: number; // Top property concentration %
    value: number;
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Current Estimated Value (ownership-adjusted)
 * 
 * VALUATION PRIORITY:
 * 1. user_override_value (highest priority - user input)
 * 2. System estimate midpoint: (system_estimated_min + system_estimated_max) / 2
 * 3. System estimate single value: system_estimated_min OR system_estimated_max
 * 4. purchase_price (fallback)
 * 
 * OWNERSHIP ADJUSTMENT:
 * - All values multiplied by (ownership_percentage / 100)
 * - Default to 100% if ownership_percentage is null
 * 
 * @param asset - Asset data
 * @param ownershipPercentage - Ownership percentage (0-100)
 * @returns Current estimated value (ownership-adjusted) or null
 */
function getCurrentEstimatedValue(
  asset: RealEstateAsset,
  ownershipPercentage: number
): { value: number | null; source: 'user_override' | 'system_estimate' | 'purchase_price' } {
  let baseValue: number | null = null;
  let source: 'user_override' | 'system_estimate' | 'purchase_price' = 'purchase_price';

  // Priority 1: User override (highest priority)
  if (asset.user_override_value !== null && asset.user_override_value !== undefined && asset.user_override_value > 0) {
    baseValue = asset.user_override_value;
    source = 'user_override';
  }
  // Priority 2: System estimate midpoint (most accurate)
  else if (
    asset.system_estimated_min !== null &&
    asset.system_estimated_max !== null &&
    asset.system_estimated_min > 0 &&
    asset.system_estimated_max > 0
  ) {
    baseValue = (asset.system_estimated_min + asset.system_estimated_max) / 2;
    source = 'system_estimate';
  }
  // Priority 3: System estimate single value
  else if (asset.system_estimated_min !== null && asset.system_estimated_min > 0) {
    baseValue = asset.system_estimated_min;
    source = 'system_estimate';
  }
  else if (asset.system_estimated_max !== null && asset.system_estimated_max > 0) {
    baseValue = asset.system_estimated_max;
    source = 'system_estimate';
  }
  // Priority 4: Purchase price (fallback)
  else if (asset.purchase_price !== null && asset.purchase_price !== undefined && asset.purchase_price > 0) {
    baseValue = asset.purchase_price;
    source = 'purchase_price';
  }

  if (baseValue === null) {
    return { value: null, source: 'purchase_price' };
  }

  // Apply ownership percentage
  const ownership = ownershipPercentage ?? 100;
  const adjustedValue = baseValue * (ownership / 100);

  return { value: adjustedValue, source };
}

/**
 * Calculate Holding Period in Years
 * 
 * Formula: (Current Date - Purchase Date) / 365
 * 
 * Uses 365 days per year (standard calculation).
 * 
 * @param purchaseDate - Purchase date string (ISO format)
 * @returns Holding period in years (rounded to 2 decimals) or null
 */
function calculateHoldingPeriod(purchaseDate: string | null): number | null {
  if (!purchaseDate) {
    return null;
  }

  const purchase = new Date(purchaseDate);
  const today = new Date();

  // Validate: purchase date should not be in future
  if (purchase > today) {
    return 0; // Invalid date, return 0
  }

  // Calculate days difference
  const diffTime = today.getTime() - purchase.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  // Convert to years (365 days per year)
  const years = diffDays / 365;

  // Round to 2 decimal places
  return Math.round(years * 100) / 100;
}

// ============================================================================
// Per-Asset Analytics
// ============================================================================

/**
 * Calculate Unrealized Gain/Loss
 * 
 * Formula:
 *   Unrealized Gain/Loss = Current Value - Purchase Price
 *   (Both adjusted for ownership %)
 * 
 * Detailed:
 *   Current Value = valuation × (ownership % / 100)
 *   Purchase Price (adjusted) = purchase_price × (ownership % / 100)
 *   Unrealized Gain/Loss = Current Value - Purchase Price (adjusted)
 * 
 * Percentage:
 *   Unrealized Gain/Loss % = (Unrealized Gain/Loss / Purchase Price (adjusted)) × 100
 * 
 * IMPORTANT:
 * - Both current_value and purchase_price are adjusted for ownership %
 * - currentValue parameter is already ownership-adjusted (from getCurrentEstimatedValue)
 * - purchasePrice is adjusted within this function
 * 
 * @param currentValue - Current estimated value (already ownership-adjusted)
 * @param purchasePrice - Purchase price (will be adjusted for ownership %)
 * @param ownershipPercentage - Ownership percentage
 * @returns Unrealized gain/loss (absolute and percentage) or null
 */
function calculateUnrealizedGainLoss(
  currentValue: number | null,
  purchasePrice: number | null,
  ownershipPercentage: number
): { absolute: number | null; percent: number | null } {
  if (currentValue === null || purchasePrice === null || purchasePrice <= 0) {
    return { absolute: null, percent: null };
  }

  // Adjust purchase price for ownership percentage
  const ownership = ownershipPercentage ?? 100;
  const purchasePriceAdjusted = purchasePrice * (ownership / 100);

  if (purchasePriceAdjusted <= 0) {
    return { absolute: null, percent: null };
  }

  // Calculate unrealized gain/loss: current_value - purchase_price (both ownership-adjusted)
  const absolute = currentValue - purchasePriceAdjusted;
  const percent = (absolute / purchasePriceAdjusted) * 100;

  return { absolute, percent };
}

/**
 * Calculate Gross Rental Yield
 * 
 * Formula:
 *   Gross Rental Yield = (annual_rent / current_value) × 100
 * 
 * Where:
 *   annual_rent = monthly_rent × 12 × (ownership % / 100)
 *   current_value = Current Estimated Value (ownership-adjusted)
 * 
 * IMPORTANT:
 * - Security deposit is NOT income (explicitly excluded)
 * - Only use monthly_rent × 12 for annual income
 * - Under-construction properties have no rental yield
 * - Both annual_rent and current_value are ownership-adjusted
 * 
 * Edge Cases:
 * - Returns null if not rented or missing data
 * - Returns null if property is under construction
 * - Returns null if current value is 0 (division by zero)
 * 
 * @param monthlyRent - Monthly rent (NOT including security deposit)
 * @param currentValue - Current estimated value (ownership-adjusted)
 * @param ownershipPercentage - Ownership percentage
 * @param rentalStatus - Rental status
 * @param propertyStatus - Property status (ready | under_construction)
 * @returns Gross rental yield (%) or null
 */
function calculateGrossRentalYield(
  monthlyRent: number | null,
  currentValue: number | null,
  ownershipPercentage: number,
  rentalStatus: RentalStatus | null,
  propertyStatus: 'ready' | 'under_construction'
): number | null {
  // Under-construction properties have no rental yield
  if (propertyStatus === 'under_construction') {
    return null;
  }

  // Only calculate for rented properties
  if (rentalStatus !== 'rented' || monthlyRent === null || monthlyRent <= 0) {
    return null;
  }

  if (currentValue === null || currentValue <= 0) {
    return null; // Division by zero protection
  }

  // Calculate annual rent (ownership-adjusted)
  // annual_rent = monthly_rent × 12 × (ownership % / 100)
  const ownership = ownershipPercentage ?? 100;
  const annualRent = monthlyRent * 12 * (ownership / 100);

  // Calculate gross rental yield
  // Gross Rental Yield = (annual_rent / current_value) × 100
  const yieldPercent = (annualRent / currentValue) * 100;

  return Math.round(yieldPercent * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate Net Rental Yield (After Expenses)
 * 
 * Formula:
 *   Net Rental Yield = ((annual_rent - annual_expenses) / current_value) × 100
 * 
 * Where:
 *   annual_rent = monthly_rent × 12 × (ownership % / 100)
 *   annual_expenses = (
 *     (maintenance_monthly × 12) +
 *     property_tax_annual +
 *     (other_expenses_monthly × 12)
 *   ) × (ownership % / 100)
 *   current_value = Current Estimated Value (ownership-adjusted)
 * 
 * IMPORTANT:
 * - Security deposit is NOT income (explicitly excluded)
 * - Under-construction properties have no rental yield
 * - Expenses: Maintenance (monthly × 12), Property tax (annual), Other expenses (monthly × 12)
 * - All values (rent, expenses, current_value) are ownership-adjusted
 * 
 * @param monthlyRent - Monthly rent (NOT including security deposit)
 * @param currentValue - Current estimated value (ownership-adjusted)
 * @param ownershipPercentage - Ownership percentage
 * @param rentalStatus - Rental status
 * @param propertyStatus - Property status (ready | under_construction)
 * @param cashflow - Cashflow data with expenses
 * @returns Net rental yield (%) or null
 */
function calculateNetRentalYield(
  monthlyRent: number | null,
  currentValue: number | null,
  ownershipPercentage: number,
  rentalStatus: RentalStatus | null,
  propertyStatus: 'ready' | 'under_construction',
  cashflow: RealEstateCashflow | null
): number | null {
  // Under-construction properties have no rental yield
  if (propertyStatus === 'under_construction') {
    return null;
  }

  // Only calculate for rented properties
  if (rentalStatus !== 'rented' || monthlyRent === null || monthlyRent <= 0) {
    return null;
  }

  if (currentValue === null || currentValue <= 0) {
    return null; // Division by zero protection
  }

  const ownership = ownershipPercentage ?? 100;

  // Calculate annual rent (ownership-adjusted)
  // annual_rent = monthly_rent × 12 × (ownership % / 100)
  const annualRent = monthlyRent * 12 * (ownership / 100);

  // Calculate annual expenses (ownership-adjusted)
  // annual_expenses = (
  //   (maintenance_monthly × 12) +
  //   property_tax_annual +
  //   (other_expenses_monthly × 12)
  // ) × (ownership % / 100)
  const maintenanceMonthly = cashflow?.maintenance_monthly ?? 0;
  const propertyTaxAnnual = cashflow?.property_tax_annual ?? 0;
  const otherExpensesMonthly = cashflow?.other_expenses_monthly ?? 0;

  const annualExpenses = (
    (maintenanceMonthly * 12) +
    propertyTaxAnnual +
    (otherExpensesMonthly * 12)
  ) * (ownership / 100);

  // Calculate net rental yield
  // Net Rental Yield = ((annual_rent - annual_expenses) / current_value) × 100
  const yieldPercent = ((annualRent - annualExpenses) / currentValue) * 100;

  return Math.round(yieldPercent * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate EMI vs Rent Gap
 * 
 * Formula:
 *   EMI vs Rent Gap = (monthly_rent - emi)
 * 
 * Where:
 *   monthly_rent = monthly_rent × (ownership % / 100) [ownership-adjusted]
 *   emi = emi [NOT ownership-adjusted - loan is per property]
 * 
 * Labels:
 * - Positive carry: Gap > 0 (rent covers EMI)
 * - Neutral: Gap = 0 (rent equals EMI)
 * - Negative carry: Gap < 0 (EMI exceeds rent)
 * 
 * IMPORTANT:
 * - EMI is cash outflow, NOT capital
 * - Security deposit is NOT income (only monthly_rent used)
 * - Under-construction properties may have EMI but no rent
 * - monthly_rent is ownership-adjusted, emi is NOT ownership-adjusted
 * 
 * @param monthlyRent - Monthly rent (NOT including security deposit)
 * @param emi - Monthly EMI (cash outflow, NOT ownership-adjusted)
 * @param ownershipPercentage - Ownership percentage
 * @param rentalStatus - Rental status
 * @param propertyStatus - Property status (ready | under_construction)
 * @param hasLoan - Whether loan exists
 * @returns EMI vs Rent gap (₹) and label, or null
 */
function calculateEMIVsRentGap(
  monthlyRent: number | null,
  emi: number | null,
  ownershipPercentage: number,
  rentalStatus: RentalStatus | null,
  propertyStatus: 'ready' | 'under_construction',
  hasLoan: boolean
): { gap: number; label: 'positive_carry' | 'neutral' | 'negative_carry' } | null {
  // Only calculate if loan exists
  if (!hasLoan || emi === null || emi <= 0) {
    return null;
  }

  // For under-construction: EMI exists but no rent (gap is negative EMI)
  if (propertyStatus === 'under_construction') {
    // Return negative EMI (cash outflow with no income)
    // Gap = (0 - emi) = -emi
    return {
      gap: -emi,
      label: 'negative_carry',
    };
  }

  // For ready properties: only calculate if rented
  if (rentalStatus !== 'rented' || monthlyRent === null || monthlyRent <= 0) {
    return null;
  }

  // Calculate ownership-adjusted monthly rent
  // monthly_rent = monthly_rent × (ownership % / 100)
  const ownership = ownershipPercentage ?? 100;
  const monthlyRentAdjusted = monthlyRent * (ownership / 100);

  // Calculate EMI vs Rent Gap
  // Gap = (monthly_rent - emi)
  // Note: monthly_rent is ownership-adjusted, emi is NOT ownership-adjusted
  const gap = Math.round((monthlyRentAdjusted - emi) * 100) / 100;

  // Determine label
  let label: 'positive_carry' | 'neutral' | 'negative_carry';
  if (gap > 0) {
    label = 'positive_carry';
  } else if (gap === 0) {
    label = 'neutral';
  } else {
    label = 'negative_carry';
  }

  return { gap, label };
}

/**
 * Calculate XIRR with Cash Flows
 * 
 * Cash Flows:
 * 1. Initial purchase_price (negative) - at purchase_date
 * 2. EMI payments (negative, monthly) - from purchase_date to today
 * 3. Rental income (positive, monthly) - from rent_start_date to today (if rented)
 * 4. Current value as terminal inflow (positive) - at today
 * 
 * Rules:
 * - If no loan → skip EMI
 * - If no rent → skip rent
 * - Use ownership-adjusted values
 * 
 * IMPORTANT:
 * - Loan outstanding_balance is deducted from terminal value (reduces equity)
 * - EMI is cash outflow (negative)
 * - Rental income is cash inflow (positive)
 * - Current value is terminal inflow (positive)
 * 
 * @param currentValue - Current estimated value (ownership-adjusted)
 * @param purchasePrice - Purchase price
 * @param purchaseDate - Purchase date
 * @param outstandingBalance - Outstanding loan balance (deducted from terminal value)
 * @param ownershipPercentage - Ownership percentage
 * @param hasLoan - Whether loan exists
 * @param emi - Monthly EMI (if loan exists)
 * @param monthlyRent - Monthly rent (if rented)
 * @param rentStartDate - Rent start date (if rented)
 * @param rentalStatus - Rental status
 * @param propertyStatus - Property status (ready | under_construction)
 * @returns XIRR as decimal (e.g., 0.125 for 12.5%), or null if insufficient data
 */
async function calculateRealEstateXIRR(
  currentValue: number | null,
  purchasePrice: number | null,
  purchaseDate: string | null,
  outstandingBalance: number | null,
  ownershipPercentage: number,
  hasLoan: boolean,
  emi: number | null,
  monthlyRent: number | null,
  rentStartDate: string | null,
  rentalStatus: RentalStatus | null,
  propertyStatus: 'ready' | 'under_construction'
): Promise<number | null> {
  // Validate required inputs
  if (currentValue === null || purchasePrice === null || purchasePrice <= 0 || !purchaseDate) {
    return null;
  }

  const ownership = ownershipPercentage ?? 100;
  const purchase = new Date(purchaseDate);
  const today = new Date();

  // Validate: purchase date should not be in future
  if (purchase > today) {
    return null;
  }

  // Calculate holding period
  const holdingPeriodDays = (today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24);
  if (holdingPeriodDays < 30) {
    return null; // Minimum 30 days
  }

  // Build cash flows array
  const cashFlows: Array<{ date: Date; amount: number }> = [];

  // 1. Initial purchase_price (negative, ownership-adjusted)
  const purchasePriceAdjusted = purchasePrice * (ownership / 100);
  cashFlows.push({
    date: purchase,
    amount: -purchasePriceAdjusted, // Negative (outflow)
  });

  // 2. EMI payments (negative, monthly) - if loan exists
  if (hasLoan && emi !== null && emi > 0) {
    // Calculate number of months from purchase to today
    const monthsDiff = Math.floor(holdingPeriodDays / 30);
    
    // Add monthly EMI payments
    for (let i = 1; i <= monthsDiff; i++) {
      const emiDate = new Date(purchase);
      emiDate.setMonth(emiDate.getMonth() + i);
      
      // Only add if date is not in future
      if (emiDate <= today) {
        cashFlows.push({
          date: emiDate,
          amount: -emi, // Negative (outflow), NOT ownership-adjusted
        });
      }
    }
  }

  // 3. Rental income (positive, monthly) - if rented and ready
  if (
    propertyStatus === 'ready' &&
    rentalStatus === 'rented' &&
    monthlyRent !== null &&
    monthlyRent > 0 &&
    rentStartDate
  ) {
    const rentStart = new Date(rentStartDate);
    
    // Only add rent if rent_start_date is valid and not in future
    if (rentStart <= today && rentStart >= purchase) {
      // Calculate number of months from rent_start to today
      const rentDays = (today.getTime() - rentStart.getTime()) / (1000 * 60 * 60 * 24);
      const rentMonths = Math.floor(rentDays / 30);
      
      // Calculate ownership-adjusted monthly rent
      const monthlyRentAdjusted = monthlyRent * (ownership / 100);
      
      // Add monthly rental income
      for (let i = 0; i <= rentMonths; i++) {
        const rentDate = new Date(rentStart);
        rentDate.setMonth(rentDate.getMonth() + i);
        
        // Only add if date is not in future
        if (rentDate <= today) {
          cashFlows.push({
            date: rentDate,
            amount: monthlyRentAdjusted, // Positive (inflow), ownership-adjusted
          });
        }
      }
    }
  }

  // 4. Current value as terminal inflow (positive) - at today
  // Deduct outstanding loan balance (ownership-adjusted)
  const loanEquity = hasLoan && outstandingBalance !== null && outstandingBalance > 0
    ? outstandingBalance * (ownership / 100)
    : 0;
  
  const netCurrentValue = currentValue - loanEquity;
  
  if (netCurrentValue > 0) {
    cashFlows.push({
      date: today,
      amount: netCurrentValue, // Positive (inflow)
    });
  }

  // Need at least 2 cash flows for XIRR
  if (cashFlows.length < 2) {
    return null;
  }

  // Calculate XIRR using Newton-Raphson method
  const xirr = calculateXIRR(cashFlows);

  if (xirr === null) {
    return null;
  }

  // Convert to percentage and cap at reasonable limits
  const xirrPercent = xirr * 100;
  const cappedXIRR = Math.max(-999, Math.min(999, xirrPercent));

  return cappedXIRR / 100; // Return as decimal (0.125 for 12.5%)
}

/**
 * Calculate Per-Asset Analytics
 * 
 * Computes all 7 per-asset metrics:
 * 1. Current Value
 * 2. Unrealized Gain
 * 3. Gross Yield
 * 4. Net Yield
 * 5. EMI Rent Gap (with label: positive_carry, neutral, negative_carry)
 * 6. Holding Period Years
 * 7. XIRR (with cash flows: purchase, EMI, rent, current value)
 * 
 * @param assetData - Asset data with loan and cashflow (ownership-adjusted)
 * @returns Per-asset analytics result
 */
export async function calculatePerAssetAnalytics(
  assetData: OwnershipAdjustedAsset
): Promise<PerAssetAnalytics> {
  const { asset, loan, cashflow, ownershipAdjusted } = assetData;

  const ownershipPercentage = asset.ownership_percentage ?? 100;

  // 1. Current Estimated Value
  const { value: currentValue, source: valuationSource } = getCurrentEstimatedValue(
    asset,
    ownershipPercentage
  );

  // 2. Unrealized Gain/Loss
  const unrealizedGainLoss = calculateUnrealizedGainLoss(
    currentValue,
    asset.purchase_price,
    ownershipPercentage
  );

  // 3. Gross Rental Yield
  // Note: Security deposit is NOT income, only monthly_rent × 12
  // Under-construction properties have no rental yield
  const grossRentalYield = calculateGrossRentalYield(
    cashflow?.monthly_rent ?? null,
    currentValue,
    ownershipPercentage,
    cashflow?.rental_status ?? null,
    asset.property_status
  );

  // 4. Net Rental Yield
  // Expenses: Maintenance (monthly × 12), Property tax (annual), Other expenses (monthly × 12)
  // Under-construction properties have no rental yield
  const netRentalYield = calculateNetRentalYield(
    cashflow?.monthly_rent ?? null,
    currentValue,
    ownershipPercentage,
    cashflow?.rental_status ?? null,
    asset.property_status,
    cashflow
  );

  // 5. EMI vs Rent Gap
  // EMI is cash outflow, NOT capital
  // Security deposit is NOT income
  const emiRentGapResult = calculateEMIVsRentGap(
    cashflow?.monthly_rent ?? null,
    loan?.emi ?? null,
    ownershipPercentage,
    cashflow?.rental_status ?? null,
    asset.property_status,
    loan !== null
  );

  // 6. Holding Period
  const holdingPeriodYears = calculateHoldingPeriod(asset.purchase_date ?? null);

  // 7. XIRR (with cash flows)
  // Cash flows: Initial purchase (negative), EMI (negative monthly), Rent (positive monthly), Current value (positive terminal)
  const xirr = await calculateRealEstateXIRR(
    currentValue,
    asset.purchase_price,
    asset.purchase_date ?? null,
    loan?.outstanding_balance ?? null,
    ownershipPercentage,
    loan !== null,
    loan?.emi ?? null,
    cashflow?.monthly_rent ?? null,
    cashflow?.rent_start_date ?? null,
    cashflow?.rental_status ?? null,
    asset.property_status
  );

  return {
    assetId: asset.id,
    metrics: {
      currentValue,
      unrealizedGain: unrealizedGainLoss.absolute,
      grossYield: grossRentalYield,
      netYield: netRentalYield,
      emiRentGap: emiRentGapResult?.gap ?? null,
      emiRentGapLabel: emiRentGapResult?.label ?? null,
      xirr: xirr !== null ? xirr * 100 : null, // Convert to percentage
      holdingPeriodYears,
    },
    metadata: {
      valuationSource,
      ownershipPercentage,
      hasLoan: loan !== null,
      rentalStatus: cashflow?.rental_status ?? null,
    },
  };
}

// ============================================================================
// Portfolio-Level Analytics
// ============================================================================

/**
 * Calculate Portfolio-Level Analytics
 * 
 * Computes:
 * 1. total_real_estate_value - Sum of all property values
 * 2. total_loan_outstanding - Sum of all outstanding loan balances (ownership-adjusted)
 * 3. net_real_estate_worth - Total value minus loan outstanding
 * 4. % of net worth in real estate - Based on net_real_estate_worth
 * 5. Income-generating assets % - Properties with rental_status = 'rented'
 * 6. Top property concentration % - Highest concentration property
 * 
 * IMPORTANT:
 * - Loan outstanding_balance is deducted from net worth (reduces equity)
 * - EMI is cash outflow, NOT capital
 * - Security deposit is NOT income
 * 
 * @param assetsData - Array of asset data with analytics
 * @param totalNetWorth - Total portfolio net worth (optional, for allocation %)
 * @returns Portfolio-level analytics result
 */
export function calculatePortfolioAnalytics(
  assetsData: OwnershipAdjustedAsset[],
  totalNetWorth: number | null = null
): PortfolioAnalytics {
  // 1. Calculate total_real_estate_value
  const totalRealEstateValue = assetsData.reduce((sum, assetData) => {
    const { value: currentValue } = getCurrentEstimatedValue(
      assetData.asset,
      assetData.asset.ownership_percentage ?? 100
    );
    return sum + (currentValue ?? 0);
  }, 0);

  // 2. Calculate total_loan_outstanding (ownership-adjusted)
  // IMPORTANT: Loan outstanding_balance is deducted from net worth (reduces equity)
  const totalLoanOutstanding = assetsData.reduce((sum, assetData) => {
    const { asset, loan } = assetData;
    const ownershipPercentage = asset.ownership_percentage ?? 100;

    if (loan?.outstanding_balance && loan.outstanding_balance > 0) {
      // Outstanding balance is ownership-adjusted
      const adjustedBalance = loan.outstanding_balance * (ownershipPercentage / 100);
      return sum + adjustedBalance;
    }
    return sum;
  }, 0);

  // 3. Calculate net_real_estate_worth (after deducting loan balances)
  const netRealEstateWorth = totalRealEstateValue - totalLoanOutstanding;

  // 4. Calculate % of net worth in real estate
  // Based on net_real_estate_worth (after loans)
  const realEstateAllocationPercent = totalNetWorth !== null && totalNetWorth > 0
    ? (netRealEstateWorth / totalNetWorth) * 100
    : null;

  // Calculate total rental income (annual, ownership-adjusted)
  // IMPORTANT: Security deposit is NOT income, only monthly_rent × 12
  const totalRentalIncomeAnnual = assetsData.reduce((sum, assetData) => {
    const { asset, cashflow } = assetData;
    const ownershipPercentage = asset.ownership_percentage ?? 100;

    // Only count rented properties (not under-construction)
    if (
      asset.property_status === 'ready' &&
      cashflow?.rental_status === 'rented' &&
      cashflow.monthly_rent &&
      cashflow.monthly_rent > 0
    ) {
      // Annual rental income = monthly_rent × 12 (ownership-adjusted)
      // Security deposit is explicitly NOT included
      const annualRent = cashflow.monthly_rent * 12 * (ownershipPercentage / 100);
      return sum + annualRent;
    }
    return sum;
  }, 0);

  // Calculate total EMI (monthly, NOT ownership-adjusted)
  // IMPORTANT: EMI is cash outflow, NOT capital
  const totalEMIMonthly = assetsData.reduce((sum, assetData) => {
    if (assetData.loan?.emi && assetData.loan.emi > 0) {
      return sum + assetData.loan.emi;
    }
    return sum;
  }, 0);

  // Calculate net cash flow (monthly)
  const totalRentalIncomeMonthly = totalRentalIncomeAnnual / 12;

  // Calculate total expenses (monthly, ownership-adjusted)
  // Expenses: Maintenance (monthly × 12), Property tax (annual), Other expenses (monthly × 12)
  const totalExpensesMonthly = assetsData.reduce((sum, assetData) => {
    const { asset, cashflow } = assetData;
    const ownershipPercentage = asset.ownership_percentage ?? 100;

    if (cashflow) {
      // Maintenance: monthly × 12 (converted to monthly for this calculation)
      const maintenanceMonthly = (cashflow.maintenance_monthly ?? 0) * (ownershipPercentage / 100);
      
      // Property tax: annual, converted to monthly
      const propertyTaxMonthly = ((cashflow.property_tax_annual ?? 0) / 12) * (ownershipPercentage / 100);
      
      // Other expenses: monthly × 12 (converted to monthly for this calculation)
      const otherExpensesMonthly = (cashflow.other_expenses_monthly ?? 0) * (ownershipPercentage / 100);

      return sum + maintenanceMonthly + propertyTaxMonthly + otherExpensesMonthly;
    }
    return sum;
  }, 0);

  const netCashFlowMonthly = totalRentalIncomeMonthly - totalEMIMonthly - totalExpensesMonthly;

  // 5. Calculate income-generating assets %
  // Income-generating = properties where rental_status = 'rented' and property_status = 'ready'
  let incomeGeneratingValue = 0;
  let incomeGeneratingCount = 0;

  assetsData.forEach((assetData) => {
    const { value: currentValue } = getCurrentEstimatedValue(
      assetData.asset,
      assetData.asset.ownership_percentage ?? 100
    );

    if (currentValue === null || currentValue <= 0) {
      return;
    }

    // Only count ready properties that are rented
    if (
      assetData.asset.property_status === 'ready' &&
      assetData.cashflow?.rental_status === 'rented'
    ) {
      incomeGeneratingValue += currentValue;
      incomeGeneratingCount++;
    }
  });

  const incomeAssetPercentage = totalRealEstateValue > 0
    ? (incomeGeneratingValue / totalRealEstateValue) * 100
    : 0;

  // 6. Calculate concentration map (top property concentration %)
  const concentrationMap = assetsData
    .map((assetData) => {
      const { value: currentValue } = getCurrentEstimatedValue(
        assetData.asset,
        assetData.asset.ownership_percentage ?? 100
      );

      if (currentValue === null || currentValue <= 0 || totalRealEstateValue <= 0) {
        return null;
      }

      const concentrationPercent = (currentValue / totalRealEstateValue) * 100;

      return {
        assetId: assetData.asset.id,
        propertyName: assetData.asset.property_nickname,
        concentrationPercent: Math.round(concentrationPercent * 100) / 100,
        value: currentValue,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.concentrationPercent - a.concentrationPercent); // Sort by concentration (highest first)

  return {
    totalValue: Math.round(totalRealEstateValue * 100) / 100, // total_real_estate_value
    netWorth: Math.round(netRealEstateWorth * 100) / 100, // net_real_estate_worth
    totalLoanOutstanding: Math.round(totalLoanOutstanding * 100) / 100, // total_loan_outstanding
    realEstateAllocationPercent: realEstateAllocationPercent !== null
      ? Math.round(realEstateAllocationPercent * 100) / 100
      : null, // % of net worth in real estate
    incomeAssetPercentage: Math.round(incomeAssetPercentage * 100) / 100, // Income-generating assets %
    concentrationMap, // Top property concentration %
  };
}

/**
 * Calculate Analytics for All Assets
 * 
 * Computes both per-asset and portfolio-level analytics.
 * 
 * @param assetsData - Array of asset data with loan and cashflow
 * @param totalNetWorth - Total portfolio net worth (optional)
 * @returns Complete analytics result
 */
export async function calculateRealEstateAnalytics(
  assetsData: OwnershipAdjustedAsset[],
  totalNetWorth: number | null = null
): Promise<{
  perAsset: PerAssetAnalytics[];
  portfolio: PortfolioAnalytics;
}> {
  // Calculate per-asset analytics (async because XIRR calculation is async)
  const perAsset = await Promise.all(
    assetsData.map((assetData) => calculatePerAssetAnalytics(assetData))
  );

  // Calculate portfolio-level analytics
  const portfolio = calculatePortfolioAnalytics(assetsData, totalNetWorth);

  return {
    perAsset,
    portfolio,
  };
}
