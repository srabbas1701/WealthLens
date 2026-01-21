/**
 * Real Estate Property Alerts Data Contract
 * 
 * Type definitions for property-level alerts and insights.
 */

// ============================================================================
// ALERT TYPES
// ============================================================================

export type PropertyAlertSeverity = 'info' | 'warning' | 'critical';

export interface RealEstatePropertyAlert {
  id: string;
  title: string;
  description: string;
  severity: PropertyAlertSeverity;
  metric?: string;
}
