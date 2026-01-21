/**
 * Real Estate Draft State Management
 * 
 * Initial state and utility functions for Real Estate draft.
 */

import type { RealEstateDraft } from '@/types/real-estate';

/**
 * Initial draft state
 */
export const initialDraft: RealEstateDraft = {
  propertyNickname: '',
  propertyType: '',
  propertyStatus: '',
  purchasePrice: null,
  purchaseDate: '',
  registrationValue: null,
  ownershipPercentage: 100,
  city: '',
  state: '',
  pincode: '',
  address: '',
  projectName: '',
  builderName: '',
  reraNumber: '',
  carpetAreaSqft: null,
  builtupAreaSqft: null,
  hasLoan: false,
  loan: null,
  hasRental: false,
  cashflow: null,
  currentStep: 1,
  lastSavedAt: null,
  draftId: null,
};

/**
 * Create initial loan object
 */
export function createInitialLoan() {
  return {
    lenderName: '',
    loanAmount: null,
    interestRate: null,
    emi: null,
    tenureMonths: null,
    outstandingBalance: null,
  };
}

/**
 * Create initial cashflow object
 */
export function createInitialCashflow() {
  return {
    rentalStatus: 'self_occupied' as const,
    monthlyRent: null,
    rentStartDate: '',
    escalationPercent: null,
    maintenanceMonthly: null,
    propertyTaxAnnual: null,
    otherExpensesMonthly: null,
  };
}
