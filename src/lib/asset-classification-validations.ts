/**
 * Asset Classification Validation Rules
 * 
 * Enforces business logic constraints to ensure regulator-aligned classification.
 * These validations must pass for the system to be investor-proof.
 */

import { classifyAsset, isIncludedInNetWorth, type AssetClass } from './asset-classification';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate that insurance does not inflate net worth
 * 
 * Rule: Insurance must never be included in net worth calculations
 */
export function validateInsuranceNotInNetWorth(
  holdings: Array<{
    assetType: string;
    currentValue: number;
    name?: string;
  }>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  holdings.forEach(h => {
    const classification = classifyAsset(h.assetType);
    
    if (classification.assetClass === 'Insurance') {
      // Check if this holding is being included in net worth
      if (isIncludedInNetWorth(classification.assetClass)) {
        errors.push({
          field: 'netWorth',
          message: `Insurance holding "${h.name || h.assetType}" (${h.currentValue}) is incorrectly included in net worth calculation. Insurance must be excluded.`,
          severity: 'error',
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate ULIP classification
 * 
 * Rule: ULIP must not default to Equity unless fund-level breakup exists
 */
export function validateULIPClassification(
  holding: {
    assetType: string;
    metadata?: {
      ulipNpsAllocation?: {
        equityPct?: number;
        debtPct?: number;
      };
    };
  }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (holding.assetType.toLowerCase() === 'ulip') {
    const classification = classifyAsset(holding.assetType, {
      ulipNpsAllocation: holding.metadata?.ulipNpsAllocation,
    });

    // If ULIP is classified as Equity, it must have allocation data
    if (classification.assetClass === 'Equity') {
      const hasAllocation = 
        holding.metadata?.ulipNpsAllocation?.equityPct !== undefined ||
        holding.metadata?.ulipNpsAllocation?.debtPct !== undefined;

      if (!hasAllocation) {
        errors.push({
          field: 'assetClass',
          message: 'ULIP cannot be classified as Equity without fund allocation data. It should be classified as Hybrid.',
          severity: 'error',
        });
      }
    }

    // Warn if ULIP has allocation data but is still classified as Hybrid
    if (classification.assetClass === 'Hybrid') {
      const hasAllocation = 
        holding.metadata?.ulipNpsAllocation?.equityPct !== undefined ||
        holding.metadata?.ulipNpsAllocation?.debtPct !== undefined;

      if (hasAllocation) {
        warnings.push({
          field: 'assetClass',
          message: 'ULIP has fund allocation data but is classified as Hybrid. Consider splitting into Equity and Fixed Income holdings.',
          severity: 'warning',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate cash classification
 * 
 * Rule: Cash must not be grouped as Fixed Income
 */
export function validateCashClassification(
  holding: {
    assetType: string;
  }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const cashTypes = ['cash', 'savings', 'current', 'liquid_fund', 'overnight_fund'];
  const isCash = cashTypes.includes(holding.assetType.toLowerCase());

  if (isCash) {
    const classification = classifyAsset(holding.assetType);

    if (classification.assetClass === 'FixedIncome') {
      errors.push({
        field: 'assetClass',
        message: `Cash-type asset "${holding.assetType}" is incorrectly classified as Fixed Income. It should be classified as Cash.`,
        severity: 'error',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate hybrid classification
 * 
 * Rule: Hybrid must not be merged into Equity
 */
export function validateHybridClassification(
  holdings: Array<{
    assetType: string;
    name?: string;
  }>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  holdings.forEach(h => {
    const classification = classifyAsset(h.assetType);

    // Check if this is a hybrid product that's been misclassified
    const hybridTypes = ['nps', 'ulip', 'balanced_advantage', 'dynamic_asset_allocation'];
    const isHybridProduct = hybridTypes.includes(h.assetType.toLowerCase());

    if (isHybridProduct && classification.assetClass === 'Equity') {
      // This is only an error if there's no allocation data
      // (If there's allocation data, it should be split, not classified as hybrid)
      warnings.push({
        field: 'assetClass',
        message: `Hybrid product "${h.name || h.assetType}" is classified as Equity. If fund allocation data is available, consider splitting it. Otherwise, it should be classified as Hybrid.`,
        severity: 'warning',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate net worth calculation
 * 
 * Rule: Net Worth = (All Assets except Insurance) - Liabilities
 */
export function validateNetWorthCalculation(
  holdings: Array<{
    assetType: string;
    currentValue: number;
    assetClass?: AssetClass;
  }>,
  calculatedNetWorth: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Calculate expected net worth
  let totalAssets = 0;
  let totalLiabilities = 0;
  let insuranceValue = 0;

  holdings.forEach(h => {
    const classification = classifyAsset(h.assetType);
    const assetClass = h.assetClass || classification.assetClass;

    if (assetClass === 'Insurance') {
      insuranceValue += h.currentValue;
    } else if (assetClass === 'Liability') {
      totalLiabilities += h.currentValue;
    } else {
      totalAssets += h.currentValue;
    }
  });

  const expectedNetWorth = totalAssets - totalLiabilities;
  const difference = Math.abs(calculatedNetWorth - expectedNetWorth);

  // Allow small rounding differences (0.01)
  if (difference > 0.01) {
    errors.push({
      field: 'netWorth',
      message: `Net worth calculation mismatch. Expected: ${expectedNetWorth}, Got: ${calculatedNetWorth}. Net Worth = Assets (${totalAssets}) - Liabilities (${totalLiabilities}). Insurance (${insuranceValue}) should be excluded.`,
      severity: 'error',
    });
  }

  // Warn if insurance is included
  if (insuranceValue > 0 && calculatedNetWorth >= totalAssets) {
    warnings.push({
      field: 'netWorth',
      message: `Insurance value (${insuranceValue}) may be incorrectly included in net worth. Insurance should be tracked separately.`,
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate allocation chart data
 * 
 * Rule: Allocation charts must exclude Insurance and Liabilities
 */
export function validateAllocationData(
  allocation: Array<{
    assetClass?: AssetClass;
    name: string;
    percentage: number;
  }>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  allocation.forEach(item => {
    // Check if Insurance or Liability is in allocation
    if (item.name.toLowerCase().includes('insurance')) {
      errors.push({
        field: 'allocation',
        message: `Insurance "${item.name}" (${item.percentage}%) is incorrectly included in asset allocation. Insurance must be excluded from allocation charts.`,
        severity: 'error',
      });
    }

    if (item.name.toLowerCase().includes('liability') || item.name.toLowerCase().includes('loan')) {
      errors.push({
        field: 'allocation',
        message: `Liability "${item.name}" (${item.percentage}%) is incorrectly included in asset allocation. Liabilities must be excluded from allocation charts.`,
        severity: 'error',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run all validations
 */
export function validateAll(
  holdings: Array<{
    id: string;
    assetType: string;
    currentValue: number;
    name?: string;
    assetClass?: AssetClass;
    metadata?: any;
  }>,
  calculatedNetWorth: number,
  allocation: Array<{
    assetClass?: AssetClass;
    name: string;
    percentage: number;
  }>
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Run all validations
  const insuranceValidation = validateInsuranceNotInNetWorth(holdings);
  allErrors.push(...insuranceValidation.errors);
  allWarnings.push(...insuranceValidation.warnings);

  holdings.forEach(h => {
    const ulipValidation = validateULIPClassification(h);
    allErrors.push(...ulipValidation.errors);
    allWarnings.push(...ulipValidation.warnings);

    const cashValidation = validateCashClassification(h);
    allErrors.push(...cashValidation.errors);
    allWarnings.push(...cashValidation.warnings);
  });

  const hybridValidation = validateHybridClassification(holdings);
  allErrors.push(...hybridValidation.errors);
  allWarnings.push(...hybridValidation.warnings);

  const netWorthValidation = validateNetWorthCalculation(holdings, calculatedNetWorth);
  allErrors.push(...netWorthValidation.errors);
  allWarnings.push(...netWorthValidation.warnings);

  const allocationValidation = validateAllocationData(allocation);
  allErrors.push(...allocationValidation.errors);
  allWarnings.push(...allocationValidation.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
