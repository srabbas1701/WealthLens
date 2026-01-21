/**
 * Real Estate Types
 * 
 * Type definitions for Real Estate onboarding flow and asset management.
 */

export type PropertyType = 'residential' | 'commercial' | 'land';
export type PropertyStatus = 'ready' | 'under_construction';
export type RentalStatus = 'self_occupied' | 'rented' | 'vacant';

/**
 * Draft state for Real Estate onboarding flow
 */
export interface RealEstateDraft {
  // Step 1: Basic Info
  propertyNickname: string;
  propertyType: PropertyType | '';
  propertyStatus: PropertyStatus | '';
  
  // Step 2: Financial Details
  purchasePrice: number | null;
  purchaseDate: string; // YYYY-MM-DD
  registrationValue: number | null;
  ownershipPercentage: number; // 0-100, default 100
  
  // Step 3: Location
  city: string;
  state: string;
  pincode: string;
  address: string;
  
  // Step 4: Property Details
  projectName: string;
  builderName: string;
  reraNumber: string;
  carpetAreaSqft: number | null;
  builtupAreaSqft: number | null;
  
  // Step 5: Loan (optional)
  hasLoan: boolean;
  loan: {
    lenderName: string;
    loanAmount: number | null;
    interestRate: number | null;
    emi: number | null;
    tenureMonths: number | null;
    outstandingBalance: number | null;
  } | null;
  
  // Step 6: Rental/Cashflow (optional)
  hasRental: boolean;
  cashflow: {
    rentalStatus: RentalStatus;
    monthlyRent: number | null;
    rentStartDate: string;
    escalationPercent: number | null;
    maintenanceMonthly: number | null;
    propertyTaxAnnual: number | null;
    otherExpensesMonthly: number | null;
  } | null;
  
  // Metadata
  currentStep: number; // 1-7
  lastSavedAt: string | null; // ISO timestamp
  draftId: string | null; // Backend draft ID
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
