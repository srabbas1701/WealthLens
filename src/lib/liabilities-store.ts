/**
 * Liabilities Store (UI-only)
 *
 * In-memory + localStorage persistence for liabilities.
 * No backend - integration point for future API when backend is ready.
 * Keyed by userId for multi-user support.
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

const STORAGE_KEY_PREFIX = 'liabilities_';

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function getLiabilities(userId: string): Liability[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLiabilities(userId: string, liabilities: Liability[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(liabilities));
  } catch {
    // Ignore storage errors
  }
}

export function addLiability(userId: string, liability: Omit<Liability, 'id' | 'createdAt'>): Liability {
  const existing = getLiabilities(userId);
  const newLiability: Liability = {
    ...liability,
    id: `liab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, newLiability];
  setLiabilities(userId, updated);
  return newLiability;
}

export function updateLiability(userId: string, id: string, updates: Partial<Liability>): Liability | null {
  const existing = getLiabilities(userId);
  const idx = existing.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const updated = { ...existing[idx], ...updates };
  const newList = [...existing];
  newList[idx] = updated;
  setLiabilities(userId, newList);
  return updated;
}

export function deleteLiability(userId: string, id: string): boolean {
  const existing = getLiabilities(userId);
  const filtered = existing.filter((l) => l.id !== id);
  if (filtered.length === existing.length) return false;
  setLiabilities(userId, filtered);
  return true;
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
