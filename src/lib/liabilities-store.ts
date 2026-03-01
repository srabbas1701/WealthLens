/**
 * Liabilities Store — types and pure computation helpers.
 *
 * Data is persisted via /api/liabilities (Supabase).
 * This file only contains the Liability type, LiabilityType enum,
 * and stateless computation helpers (totals, etc.).
 */

export type LiabilityType =
  | 'HOME_LOAN'
  | 'VEHICLE_LOAN'
  | 'CREDIT_CARD'
  | 'PERSONAL_LOAN'
  | 'EDUCATION_LOAN'
  | 'OTHER';

export interface Liability {
  id: string;
  type: LiabilityType;
  lender: string;
  outstanding: number;
  interestRate?: number | null;
  emi?: number | null;
  secured?: boolean;
  taxBenefit?: boolean;
  prepayment?: boolean;
  createdAt: string;

  // Loan-type fields (HOME_LOAN, VEHICLE_LOAN, PERSONAL_LOAN, EDUCATION_LOAN)
  originalLoanAmount?: number | null;
  loanStartDate?: string | null;
  tenureMonths?: number | null;

  // VEHICLE_LOAN specific
  vehicleType?: 'car' | 'bike' | 'commercial' | 'other' | null;
  vehicleNumber?: string | null;

  // CREDIT_CARD specific
  creditLimit?: number | null;
  billingCycleDate?: number | null; // day of month 1-28
  minimumDue?: number | null;

  // PERSONAL_LOAN specific
  purpose?: string | null;

  // EDUCATION_LOAN specific
  institutionName?: string | null;
  courseName?: string | null;
  moratoriumMonths?: number | null;

  // OTHER specific
  description?: string | null;
}

export function getLiabilityTotals(liabilities: Liability[]): {
  totalOutstanding: number;
  totalEmi: number;
  securedCount: number;
  unsecuredCount: number;
  avgInterest: number | null;
} {
  const totalOutstanding = liabilities.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi = liabilities.reduce((s, l) => s + (l.emi ?? 0), 0);
  const securedCount = liabilities.filter((l) => l.secured).length;
  const unsecuredCount = liabilities.filter((l) => !l.secured).length;
  const withRate = liabilities.filter((l) => l.interestRate != null && l.interestRate > 0);
  const avgInterest =
    withRate.length > 0
      ? withRate.reduce((s, l) => s + (l.interestRate ?? 0), 0) / withRate.length
      : null;
  return { totalOutstanding, totalEmi, securedCount, unsecuredCount, avgInterest };
}
