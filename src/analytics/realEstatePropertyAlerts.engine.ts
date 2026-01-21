/**
 * Real Estate Property Alerts Engine
 * 
 * Pure computation engine for generating property-level alerts.
 * No database access - works with existing analytics data.
 */

import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';
import type { RealEstatePropertyAlert } from '@/types/realEstatePropertyAlerts.types';

/**
 * Get Property Alerts
 * 
 * Evaluates alert rules based on property analytics data.
 * Returns array of alerts (empty if no issues detected).
 * 
 * @param propertyData - Property detail analytics data
 * @returns Array of alerts
 */
export function getPropertyAlerts(
  propertyData: RealEstatePropertyDetailData
): RealEstatePropertyAlert[] {
  const alerts: RealEstatePropertyAlert[] = [];

  // Rule 1: Negative Cash Flow (CRITICAL)
  // Condition: emiRentGap < 0
  if (propertyData.emiRentGap !== null && propertyData.emiRentGap < 0) {
    const shortfall = Math.abs(propertyData.emiRentGap);
    alerts.push({
      id: 'negative-cash-flow',
      title: 'Negative Cash Flow',
      description: `EMI is higher than rental income. Monthly shortfall: ₹${shortfall.toLocaleString('en-IN')}. Consider reviewing rent or loan terms.`,
      severity: 'critical',
      metric: 'emiRentGap',
    });
  }

  // Rule 2: Low Rental Yield (WARNING)
  // Condition: netRentalYield !== null && netRentalYield < 2
  if (
    propertyData.netRentalYield !== null &&
    propertyData.netRentalYield < 2
  ) {
    alerts.push({
      id: 'low-rental-yield',
      title: 'Low Rental Yield',
      description: `Rental yield is ${propertyData.netRentalYield.toFixed(2)}%, which is below the recommended 2%. Consider reviewing rent or your holding strategy.`,
      severity: 'warning',
      metric: 'netRentalYield',
    });
  }

  // Rule 3: High Loan Dependency (WARNING)
  // Condition: outstandingBalance / currentEstimatedValue > 0.6
  if (
    propertyData.outstandingBalance !== null &&
    propertyData.currentEstimatedValue !== null &&
    propertyData.currentEstimatedValue > 0
  ) {
    const loanRatio = propertyData.outstandingBalance / propertyData.currentEstimatedValue;
    if (loanRatio > 0.6) {
      const percentage = (loanRatio * 100).toFixed(1);
      alerts.push({
        id: 'high-loan-dependency',
        title: 'High Loan Dependency',
        description: `More than ${percentage}% of property value is financed. This increases risk exposure.`,
        severity: 'warning',
        metric: 'loanRatio',
      });
    }
  }

  // Rule 4: Stale Valuation (INFO)
  // Condition: valuation_last_updated > 12 months ago OR null
  if (propertyData.valuationLastUpdated) {
    const lastUpdated = new Date(propertyData.valuationLastUpdated);
    const now = new Date();
    const monthsSinceUpdate =
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceUpdate > 12) {
      const months = Math.floor(monthsSinceUpdate);
      alerts.push({
        id: 'stale-valuation',
        title: 'Stale Valuation',
        description: `Property valuation has not been updated in ${months} months. Consider updating the value for accurate analytics.`,
        severity: 'info',
        metric: 'valuationLastUpdated',
      });
    }
  } else {
    // No valuation update ever recorded
    alerts.push({
      id: 'stale-valuation',
      title: 'Stale Valuation',
      description: 'Property valuation has not been updated recently. Consider updating the value for accurate analytics.',
      severity: 'info',
      metric: 'valuationLastUpdated',
    });
  }

  return alerts;
}
