/**
 * Real Estate Validation Rules
 * 
 * Validation functions for each step of the Real Estate onboarding flow.
 */

import type { RealEstateDraft, ValidationResult } from '@/types/real-estate';

/**
 * Step 1: Basic Info Validation
 */
export function validateStep1(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  if (!draft.propertyNickname || draft.propertyNickname.trim().length < 2) {
    errors.push('Property nickname must be at least 2 characters');
  }
  if (draft.propertyNickname.length > 100) {
    errors.push('Property nickname must be less than 100 characters');
  }
  if (!draft.propertyType || !['residential', 'commercial', 'land'].includes(draft.propertyType)) {
    errors.push('Please select a property type');
  }
  if (!draft.propertyStatus || !['ready', 'under_construction'].includes(draft.propertyStatus)) {
    errors.push('Please select property status');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 2: Financial Details Validation
 */
export function validateStep2(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  if (draft.purchasePrice !== null && draft.purchasePrice <= 0) {
    errors.push('Purchase price must be greater than 0');
  }
  if (draft.purchaseDate) {
    const purchaseDate = new Date(draft.purchaseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (purchaseDate > today) {
      errors.push('Purchase date cannot be in the future');
    }
  }
  if (draft.ownershipPercentage < 0 || draft.ownershipPercentage > 100) {
    errors.push('Ownership percentage must be between 0 and 100');
  }
  if (draft.registrationValue !== null && draft.registrationValue < 0) {
    errors.push('Registration value cannot be negative');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 3: Location Validation
 */
export function validateStep3(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  if (!draft.city || draft.city.trim().length < 2) {
    errors.push('City is required (minimum 2 characters)');
  }
  if (!draft.state || draft.state.trim().length < 2) {
    errors.push('State is required (minimum 2 characters)');
  }
  if (draft.pincode && !/^\d{6}$/.test(draft.pincode)) {
    errors.push('Pincode must be 6 digits');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 4: Property Details Validation
 */
export function validateStep4(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  // RERA number format validation (if provided)
  if (draft.reraNumber && !/^[A-Z]{2}\/[A-Z]{2}\/REALESTATE\/\d{4}\/\d{5}$/i.test(draft.reraNumber)) {
    errors.push('RERA number format is invalid (expected: XX/XX/REALESTATE/YYYY/XXXXX)');
  }
  
  // Area validation (if provided)
  if (draft.carpetAreaSqft !== null && draft.carpetAreaSqft <= 0) {
    errors.push('Carpet area must be greater than 0');
  }
  if (draft.builtupAreaSqft !== null && draft.builtupAreaSqft <= 0) {
    errors.push('Built-up area must be greater than 0');
  }
  // Built-up should generally be >= carpet area
  if (draft.carpetAreaSqft !== null && draft.builtupAreaSqft !== null && 
      draft.builtupAreaSqft < draft.carpetAreaSqft) {
    errors.push('Built-up area should be greater than or equal to carpet area');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 5: Loan Validation
 */
export function validateStep5(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  if (!draft.hasLoan) {
    return { valid: true, errors: [] }; // Skip validation if no loan
  }
  
  if (!draft.loan) {
    errors.push('Loan details are required when loan is enabled');
    return { valid: false, errors };
  }
  
  if (!draft.loan.lenderName || draft.loan.lenderName.trim().length < 2) {
    errors.push('Lender name is required');
  }
  if (draft.loan.loanAmount === null || draft.loan.loanAmount <= 0) {
    errors.push('Loan amount must be greater than 0');
  }
  if (draft.loan.emi !== null && draft.loan.emi <= 0) {
    errors.push('EMI must be greater than 0');
  }
  if (draft.loan.interestRate !== null && (draft.loan.interestRate < 0 || draft.loan.interestRate > 100)) {
    errors.push('Interest rate must be between 0 and 100');
  }
  if (draft.loan.tenureMonths !== null && draft.loan.tenureMonths <= 0) {
    errors.push('Loan tenure must be greater than 0');
  }
  if (draft.loan.outstandingBalance !== null && draft.loan.outstandingBalance < 0) {
    errors.push('Outstanding balance cannot be negative');
  }
  if (draft.loan.loanAmount !== null && draft.loan.outstandingBalance !== null &&
      draft.loan.outstandingBalance > draft.loan.loanAmount) {
    errors.push('Outstanding balance cannot exceed loan amount');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 6: Rental/Cashflow Validation
 */
export function validateStep6(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  if (!draft.hasRental) {
    return { valid: true, errors: [] }; // Skip validation if no rental
  }
  
  if (!draft.cashflow) {
    errors.push('Cashflow details are required when rental is enabled');
    return { valid: false, errors };
  }
  
  // If rented, monthly rent is required
  if (draft.cashflow.rentalStatus === 'rented') {
    if (draft.cashflow.monthlyRent === null || draft.cashflow.monthlyRent <= 0) {
      errors.push('Monthly rent is required for rented properties');
    }
  }
  
  // Expense validations
  if (draft.cashflow.maintenanceMonthly !== null && draft.cashflow.maintenanceMonthly < 0) {
    errors.push('Maintenance charges cannot be negative');
  }
  if (draft.cashflow.propertyTaxAnnual !== null && draft.cashflow.propertyTaxAnnual < 0) {
    errors.push('Property tax cannot be negative');
  }
  if (draft.cashflow.otherExpensesMonthly !== null && draft.cashflow.otherExpensesMonthly < 0) {
    errors.push('Other expenses cannot be negative');
  }
  if (draft.cashflow.escalationPercent !== null && 
      (draft.cashflow.escalationPercent < 0 || draft.cashflow.escalationPercent > 100)) {
    errors.push('Rent escalation percentage must be between 0 and 100');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 7: Review - Validate all previous steps
 */
export function validateStep7(draft: RealEstateDraft): ValidationResult {
  const errors: string[] = [];
  
  // Re-validate all previous steps
  const step1 = validateStep1(draft);
  const step2 = validateStep2(draft);
  const step3 = validateStep3(draft);
  const step4 = validateStep4(draft);
  const step5 = validateStep5(draft);
  const step6 = validateStep6(draft);
  
  errors.push(...step1.errors, ...step2.errors, ...step3.errors, 
              ...step4.errors, ...step5.errors, ...step6.errors);
  
  return { valid: errors.length === 0, errors };
}
