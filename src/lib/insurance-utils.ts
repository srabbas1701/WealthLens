/**
 * Insurance Utility Functions
 *
 * Handles calculations, expiry tracking, analytics, and alerts
 */

import {
  InsurancePolicy,
  InsuranceSummary,
  InsuranceAlert,
  InsuranceCategory,
  InsuranceStatus,
} from '@/types/insurance';

/**
 * Calculate days until policy expiry
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if policy is expiring soon
 */
export function isExpiringInDays(expiryDate: string | null, days: number): boolean {
  if (!expiryDate) return false;
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return false;
  return daysUntil > 0 && daysUntil <= days;
}

/**
 * Determine policy status based on dates
 */
export function determinePolicyStatus(
  policyStatus: InsuranceStatus,
  expiryDate: string | null
): InsuranceStatus {
  if (policyStatus === InsuranceStatus.INACTIVE) return policyStatus;

  if (expiryDate) {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil !== null && daysUntil < 0) {
      return InsuranceStatus.EXPIRED;
    }
  }

  return policyStatus;
}

/**
 * Calculate insurance summary from policies
 */
export function calculateInsuranceSummary(
  policies: InsurancePolicy[]
): InsuranceSummary {
  const now = new Date();

  const summary: InsuranceSummary = {
    totalLifeCover: 0,
    totalHealthCover: 0,
    totalAnnualPremium: 0,
    totalMonthlyPremium: 0,
    activePolicies: 0,
    expiredPolicies: 0,
    lapsedPolicies: 0,
    policiesExpiringIn30Days: 0,
    policiesExpiringIn60Days: 0,
    policiesExpiringIn90Days: 0,
  };

  policies.forEach((policy) => {
    // Only count active policies for coverage
    if (policy.status === InsuranceStatus.ACTIVE) {
      if (policy.category === InsuranceCategory.LIFE) {
        summary.totalLifeCover += policy.sum_assured;
      } else if (policy.category === InsuranceCategory.HEALTH) {
        summary.totalHealthCover += policy.sum_assured;
      }
    }

    // Count premiums (for active only)
    if (policy.status === InsuranceStatus.ACTIVE) {
      summary.totalAnnualPremium += policy.annual_premium;
      if (policy.monthly_premium) {
        summary.totalMonthlyPremium += policy.monthly_premium;
      }
    }

    // Status counts
    if (policy.status === InsuranceStatus.ACTIVE) {
      summary.activePolicies += 1;
    } else if (policy.status === InsuranceStatus.EXPIRED) {
      summary.expiredPolicies += 1;
    } else if (policy.status === InsuranceStatus.LAPSED) {
      summary.lapsedPolicies += 1;
    }

    // Expiry tracking
    if (
      policy.status === InsuranceStatus.ACTIVE &&
      policy.policy_end_date
    ) {
      if (isExpiringInDays(policy.policy_end_date, 30)) {
        summary.policiesExpiringIn30Days += 1;
      }
      if (isExpiringInDays(policy.policy_end_date, 60)) {
        summary.policiesExpiringIn60Days += 1;
      }
      if (isExpiringInDays(policy.policy_end_date, 90)) {
        summary.policiesExpiringIn90Days += 1;
      }
    }
  });

  return summary;
}

/**
 * Generate insurance alerts
 */
export function generateInsuranceAlerts(
  policies: InsurancePolicy[],
  summary: InsuranceSummary,
  annualIncome: number | null
): InsuranceAlert[] {
  const alerts: InsuranceAlert[] = [];

  // Check expiring policies
  if (summary.policiesExpiringIn30Days > 0) {
    alerts.push({
      id: 'expiring-30',
      type: 'warning',
      title: `${summary.policiesExpiringIn30Days} policy(ies) expiring in 30 days`,
      description: 'Consider renewing before expiry to avoid coverage gap',
    });
  }

  // Check expired policies
  if (summary.expiredPolicies > 0) {
    alerts.push({
      id: 'expired',
      type: 'danger',
      title: `${summary.expiredPolicies} policy(ies) have expired`,
      description: 'Your coverage has lapsed. Consider renewing immediately.',
    });
  }

  // Check lapsed policies
  if (summary.lapsedPolicies > 0) {
    alerts.push({
      id: 'lapsed',
      type: 'danger',
      title: `${summary.lapsedPolicies} policy(ies) are lapsed`,
      description: 'Coverage is no longer active. Review and renew if needed.',
    });
  }

  // Check life cover adequacy
  if (annualIncome && annualIncome > 0) {
    const recommendedCover = annualIncome * 10;
    if (summary.totalLifeCover < recommendedCover) {
      alerts.push({
        id: 'low-life-cover',
        type: 'info',
        title: 'Life cover below recommended threshold',
        description: `Your life cover is ₹${summary.totalLifeCover.toLocaleString(
          'en-IN'
        )}, but recommended is ₹${recommendedCover.toLocaleString('en-IN')} (10x annual income)`,
      });
    }
  }

  // Check health cover
  if (summary.totalHealthCover < 500000) {
    alerts.push({
      id: 'low-health-cover',
      type: 'info',
      title: 'Health cover below ₹5,00,000 per person',
      description: 'Consider increasing health coverage for better protection',
    });
  }

  // No life insurance warning
  const hasLifePolicy = policies.some(
    (p) => p.category === InsuranceCategory.LIFE && p.status === InsuranceStatus.ACTIVE
  );
  if (!hasLifePolicy) {
    alerts.push({
      id: 'no-life-insurance',
      type: 'info',
      title: 'No active life insurance',
      description: 'Consider getting life insurance coverage for your family protection',
    });
  }

  return alerts;
}

/**
 * Format insurance category for display
 */
export function formatInsuranceCategory(category: InsuranceCategory): string {
  const labels: Record<InsuranceCategory, string> = {
    [InsuranceCategory.LIFE]: 'Life Insurance',
    [InsuranceCategory.HEALTH]: 'Health Insurance',
    [InsuranceCategory.MOTOR]: 'Motor Insurance',
    [InsuranceCategory.HOME]: 'Home Insurance',
    [InsuranceCategory.TRAVEL]: 'Travel Insurance',
    [InsuranceCategory.PERSONAL_ACCIDENT]: 'Personal Accident',
    [InsuranceCategory.OTHER]: 'Other Insurance',
  };
  return labels[category];
}

/**
 * Get color for insurance status badge
 */
export function getStatusColor(status: InsuranceStatus): string {
  const colors: Record<InsuranceStatus, string> = {
    [InsuranceStatus.ACTIVE]: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    [InsuranceStatus.EXPIRED]: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    [InsuranceStatus.LAPSED]: 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    [InsuranceStatus.INACTIVE]: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  };
  return colors[status];
}

/**
 * Get icon for insurance category
 */
export function getCategoryIcon(category: InsuranceCategory): string {
  const icons: Record<InsuranceCategory, string> = {
    [InsuranceCategory.LIFE]: '🧬',
    [InsuranceCategory.HEALTH]: '🏥',
    [InsuranceCategory.MOTOR]: '🚗',
    [InsuranceCategory.HOME]: '🏠',
    [InsuranceCategory.TRAVEL]: '✈️',
    [InsuranceCategory.PERSONAL_ACCIDENT]: '⚠️',
    [InsuranceCategory.OTHER]: '📋',
  };
  return icons[category];
}
