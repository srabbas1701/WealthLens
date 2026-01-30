/**
 * Credit Health Score — Internal score based ONLY on tracked liabilities
 *
 * NOT a CIBIL score. No income, payment history, or external APIs.
 * Uses only: secured flag, interest rate, liability count, EMI presence.
 *
 * GUARDRAILS:
 * - Missing data → neutral (mid-range), not zero
 * - Liabilities may have partial data
 * - Score 0–100, label: Excellent / Good / Needs Attention / High Risk
 */

import type { Liability } from './liabilities-store';

export type CreditHealthLabel = 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk';

export interface CreditHealthBreakdown {
  /** Debt Mix: secured vs unsecured (0–30). More secured = better. */
  debtMix: { score: number; max: 30 };
  /** Interest Quality: lower avg rate = better (0–30). */
  interestQuality: { score: number; max: 30 };
  /** Liability Count: fewer = better (0–20). */
  liabilityCount: { score: number; max: 20 };
  /** EMI Discipline: more liabilities with EMI = better (0–20). */
  emiDiscipline: { score: number; max: 20 };
}

export interface CreditHealthScoreResult {
  score: number;
  label: CreditHealthLabel;
  breakdown: CreditHealthBreakdown;
}

const NEUTRAL_DEBT_MIX = 15;
const NEUTRAL_INTEREST = 15;
const NEUTRAL_EMI = 10;

/**
 * Calculates Credit Health Score from liabilities.
 * Returns null if liabilities.length < 2 (caller should not display).
 */
export function calculateCreditHealthScore(liabilities: Liability[]): CreditHealthScoreResult | null {
  if (liabilities.length < 2) return null;

  const total = liabilities.length;

  // ---- Debt Mix (30 pts): secured vs unsecured ----
  const securedCount = liabilities.filter((l) => l.secured === true).length;
  const unsecuredCount = liabilities.filter((l) => l.secured === false).length;
  const unknownSecured = total - securedCount - unsecuredCount;

  let debtMixScore: number;
  if (unknownSecured === total) {
    debtMixScore = NEUTRAL_DEBT_MIX; // No data → neutral
  } else {
    const effectiveSecured = securedCount + 0.5 * unknownSecured;
    debtMixScore = Math.round((effectiveSecured / total) * 30);
  }

  // ---- Interest Quality (30 pts): lower avg = better ----
  const withRate = liabilities.filter((l) => l.interestRate != null && l.interestRate > 0);
  const totalOutstanding = liabilities.reduce((s, l) => s + l.outstanding, 0);

  let interestScore: number;
  if (withRate.length === 0 || totalOutstanding === 0) {
    interestScore = NEUTRAL_INTEREST; // No data → neutral
  } else {
    const weightedAvg =
      withRate.reduce((s, l) => s + (l.interestRate ?? 0) * l.outstanding, 0) /
      withRate.reduce((s, l) => s + l.outstanding, 0);
    // Map: 0–6% = 30, 6–10% = 20, 10–14% = 10, >14% = 0 (linear segments)
    if (weightedAvg <= 6) interestScore = 30;
    else if (weightedAvg <= 10) interestScore = 30 - ((weightedAvg - 6) / 4) * 10;
    else if (weightedAvg <= 14) interestScore = 20 - ((weightedAvg - 10) / 4) * 10;
    else interestScore = Math.max(0, 10 - ((weightedAvg - 14) / 6) * 10);
    interestScore = Math.round(interestScore);
  }

  // ---- Liability Count (20 pts): fewer = better ----
  const countScore = Math.max(0, 20 - (total - 1) * 4);

  // ---- EMI Discipline (20 pts): more with EMI = better ----
  const withEmi = liabilities.filter((l) => l.emi != null && l.emi > 0);
  let emiScore: number;
  if (withEmi.length === 0) {
    emiScore = NEUTRAL_EMI; // No EMI data → neutral
  } else {
    emiScore = Math.round((withEmi.length / total) * 20);
  }

  const totalScore = Math.round(debtMixScore + interestScore + countScore + emiScore);
  const clampedScore = Math.max(0, Math.min(100, totalScore));

  const label: CreditHealthLabel =
    clampedScore >= 80 ? 'Excellent' : clampedScore >= 60 ? 'Good' : clampedScore >= 40 ? 'Needs Attention' : 'High Risk';

  return {
    score: clampedScore,
    label,
    breakdown: {
      debtMix: { score: debtMixScore, max: 30 },
      interestQuality: { score: interestScore, max: 30 },
      liabilityCount: { score: countScore, max: 20 },
      emiDiscipline: { score: emiScore, max: 20 },
    },
  };
}
