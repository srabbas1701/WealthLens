/**
 * Net Worth Timeline — Pure logic for forward-looking projection
 *
 * Generates a derived timeline from current values only.
 * No historical data. No backfill. No forecasting assumptions.
 *
 * ASSUMPTIONS:
 * - assetsTotal remains constant (no new investments)
 * - liabilities reduce month-by-month only if EMI exists
 * - If EMI missing, liability stays flat
 * - Interest rate used only when present (future: amortization accuracy)
 * - No negative outstanding values
 *
 * TODO: Add tenure/remaining-months when available for more accurate liability reduction.
 * TODO: Support new investments/loans as optional inputs.
 */

import type { Liability } from './liabilities-store';

export interface TimelinePoint {
  month: number;
  assets_value: number;
  liabilities_value: number;
  net_worth: number;
}

export interface GenerateNetWorthTimelineParams {
  /** Total assets value (constant across all months). */
  assetsTotal: number;
  /** Liabilities with optional EMI. If EMI missing, outstanding stays flat. */
  liabilities: Liability[];
  /** Number of future months to project (includes month 0 = current). */
  months: number;
}

/**
 * Generates a forward-looking net worth timeline.
 *
 * - Month 0 = current state
 * - Months 1..N = projected (liabilities reduce by EMI if present)
 * - Assets stay constant
 */
export function generateNetWorthTimeline({
  assetsTotal,
  liabilities,
  months,
}: GenerateNetWorthTimelineParams): TimelinePoint[] {
  const result: TimelinePoint[] = [];
  const numPoints = Math.max(0, Math.floor(months)) + 1; // +1 for month 0

  // Track outstanding per liability (mutable copy for projection)
  const outstandingByLiability = liabilities.map((l) => ({
    id: l.id,
    outstanding: Math.max(0, l.outstanding ?? 0),
    emi: l.emi != null && l.emi > 0 ? l.emi : 0,
    // Interest rate used only if present — future: amortization accuracy
    interestRate: l.interestRate != null && l.interestRate > 0 ? l.interestRate : null,
  }));

  for (let m = 0; m < numPoints; m++) {
    // Liabilities total for this month
    let liabilitiesTotal = 0;
    for (const item of outstandingByLiability) {
      liabilitiesTotal += item.outstanding;
      // Reduce by EMI for next month (only if EMI exists)
      if (item.emi > 0) {
        item.outstanding = Math.max(0, item.outstanding - item.emi);
      }
    }

    const netWorth = assetsTotal - liabilitiesTotal;
    result.push({
      month: m,
      assets_value: assetsTotal,
      liabilities_value: liabilitiesTotal,
      net_worth: netWorth,
    });
  }

  return result;
}
