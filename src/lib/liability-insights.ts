/**
 * Liability Insights — Pure math utilities for debt optimization
 *
 * All functions return null when required inputs are missing.
 * Interest calculations are approximate and must be clearly labeled in UI.
 * No EMI derivation — we never calculate EMI from other fields.
 *
 * TODO: Add timeline/tenure support when available (remaining months).
 * TODO: Add export to PDF/CSV for insights.
 * TODO: Integrate with credit score context when available.
 */

import type { Liability } from './liabilities-store';

/** Interest priority for payoff ordering. Higher rate = higher priority. */
export type InterestPriorityTag = 'High' | 'Medium' | 'Low';

/** Result of approximate interest cost calculation. */
export interface ApproxInterestCostResult {
  /** Approximate yearly interest (₹). Uses outstanding × rate. */
  yearlyInterest: number;
  /** Label for UI: must indicate approximation. */
  label: 'approx_yearly_interest';
}

/** Result of prepayment impact calculation. */
export interface PrepaymentImpactResult {
  /** Approximate interest saved over remaining life (₹). */
  approxInterestSaved: number;
  /** New outstanding after prepayment (capped at 0). */
  newOutstanding: number;
  /** Approximate months saved (if EMI known). */
  approxMonthsSaved?: number;
  label: 'approx_prepayment_impact';
}

/**
 * Returns interest priority tag for payoff ordering.
 * High (>12%) = credit cards, personal loans. Medium (8–12%). Low (<8%).
 */
export function getInterestPriorityTag(interestRate: number | null | undefined): InterestPriorityTag | null {
  if (interestRate == null || interestRate <= 0 || !Number.isFinite(interestRate)) {
    return null;
  }
  if (interestRate > 12) return 'High';
  if (interestRate >= 8) return 'Medium';
  return 'Low';
}

/**
 * Approximate yearly interest cost. Does NOT compute EMI or total life interest.
 * Requires: outstanding > 0, interestRate > 0.
 */
export function calculateApproxInterestCost(liability: Liability): ApproxInterestCostResult | null {
  const { outstanding, interestRate } = liability;
  if (
    outstanding == null ||
    outstanding <= 0 ||
    interestRate == null ||
    interestRate <= 0 ||
    !Number.isFinite(outstanding) ||
    !Number.isFinite(interestRate)
  ) {
    return null;
  }
  const yearlyInterest = (outstanding * interestRate) / 100;
  return {
    yearlyInterest,
    label: 'approx_yearly_interest',
  };
}

/**
 * Approximate prepayment impact. Requires EMI to estimate remaining tenure.
 * Does NOT derive EMI — returns null if EMI missing.
 */
export function calculatePrepaymentImpact(
  liability: Liability,
  prepaymentAmount: number
): PrepaymentImpactResult | null {
  const { outstanding, interestRate, emi } = liability;
  if (
    outstanding == null ||
    outstanding <= 0 ||
    prepaymentAmount <= 0 ||
    !Number.isFinite(outstanding) ||
    !Number.isFinite(prepaymentAmount)
  ) {
    return null;
  }
  // Require EMI — we never calculate it
  if (emi == null || emi <= 0 || !Number.isFinite(emi)) {
    return null;
  }
  const rate = interestRate != null && interestRate > 0 && Number.isFinite(interestRate)
    ? interestRate
    : 0;

  const cappedPrepayment = Math.min(prepaymentAmount, outstanding);
  const newOutstanding = Math.max(0, outstanding - cappedPrepayment);

  // Approx remaining months = outstanding / emi
  const remainingMonths = outstanding / emi;
  // Approx interest saved: prepaid amount × rate × (remaining period in years)
  // Simplified: interest per year on prepaid = prepaid × rate/100; total ≈ that × (remainingMonths/12)
  const approxInterestSaved = rate > 0
    ? (cappedPrepayment * rate / 100) * (remainingMonths / 12)
    : 0;
  const approxMonthsSaved = emi > 0 ? cappedPrepayment / emi : undefined;

  return {
    approxInterestSaved,
    newOutstanding,
    approxMonthsSaved: approxMonthsSaved != null && Number.isFinite(approxMonthsSaved)
      ? Math.round(approxMonthsSaved)
      : undefined,
    label: 'approx_prepayment_impact',
  };
}
