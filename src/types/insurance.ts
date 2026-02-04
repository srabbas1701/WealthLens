/**
 * Insurance Types
 *
 * Covers all insurance categories and plan types for Indian investors
 */

export enum InsuranceCategory {
  LIFE = 'LIFE',
  HEALTH = 'HEALTH',
  MOTOR = 'MOTOR',
  HOME = 'HOME',
  TRAVEL = 'TRAVEL',
  PERSONAL_ACCIDENT = 'PERSONAL_ACCIDENT',
  OTHER = 'OTHER',
}

export enum InsuranceStatus {
  ACTIVE = 'ACTIVE',
  LAPSED = 'LAPSED',
  EXPIRED = 'EXPIRED',
  INACTIVE = 'INACTIVE',
}

export enum LifePlanType {
  TERM = 'TERM',
  ULIP = 'ULIP',
  ENDOWMENT = 'ENDOWMENT',
  WHOLE_LIFE = 'WHOLE_LIFE',
  CHILD = 'CHILD',
}

export enum HealthCoverType {
  INDIVIDUAL = 'INDIVIDUAL',
  FAMILY_FLOATER = 'FAMILY_FLOATER',
  SENIOR = 'SENIOR',
  TOPUP = 'TOPUP',
  SUPER_TOPUP = 'SUPER_TOPUP',
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  category: InsuranceCategory;
  policy_number: string;
  provider_name: string;
  policy_name: string;
  status: InsuranceStatus;
  sum_assured: number;
  annual_premium: number;
  monthly_premium: number | null;
  policy_start_date: string;
  policy_end_date: string | null;
  last_renewal_date: string | null;
  next_renewal_date: string | null;
  plan_type: string | null;
  nominee_name: string | null;
  nominee_relation: string | null;
  family_members_count: number | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceSummary {
  totalLifeCover: number;
  totalHealthCover: number;
  totalAnnualPremium: number;
  totalMonthlyPremium: number;
  activePolicies: number;
  expiredPolicies: number;
  lapsedPolicies: number;
  policiesExpiringIn30Days: number;
  policiesExpiringIn60Days: number;
  policiesExpiringIn90Days: number;
}

export interface InsuranceAlert {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export interface InsuranceFormData {
  category: InsuranceCategory;
  policy_number: string;
  provider_name: string;
  policy_name: string;
  sum_assured: number;
  annual_premium: number;
  monthly_premium?: number;
  policy_start_date: string;
  policy_end_date?: string;
  next_renewal_date?: string;
  plan_type?: string;
  nominee_name?: string;
  nominee_relation?: string;
  family_members_count?: number;
  document_url?: string;
}
