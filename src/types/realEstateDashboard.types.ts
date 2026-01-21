/**
 * Real Estate Dashboard Data Contracts
 * 
 * Type definitions for data flow between analytics engine and UI.
 * All values are ownership-adjusted and in raw numeric format.
 * UI layer handles formatting (currency, percentages, labels).
 */

// ============================================================================
// DASHBOARD SUMMARY (KPI Cards)
// ============================================================================

export interface RealEstateDashboardSummary {
  totalEstimatedValue: number;
  netRealEstateWorth: number;
  averageNetRentalYield: number | null;
  portfolioAllocationPercent: number;
}

// ============================================================================
// PROPERTY-WISE VALUE CHART
// ============================================================================

export interface PropertyValueDataPoint {
  propertyId: string;
  propertyName: string;
  estimatedValue: number;
  city: string;
}

// ============================================================================
// ASSET ALLOCATION (Donut Chart)
// ============================================================================

export type AssetClass =
  | 'real_estate'
  | 'equity'
  | 'mutual_funds'
  | 'fixed_income'
  | 'cash'
  | 'other';

export interface AssetAllocationSlice {
  assetClass: AssetClass;
  value: number;
}

// ============================================================================
// PROPERTIES LIST ROW
// ============================================================================

export type PropertyType = 'residential' | 'commercial' | 'land';

export type RentalStatus = 'rented' | 'self_occupied' | 'vacant';

export interface PropertyListItem {
  propertyId: string;
  propertyName: string;
  city: string;
  propertyType: PropertyType;
  estimatedValue: number;
  netRentalYield: number | null;
  emiRentGap: number | null;
  rentalStatus: RentalStatus;
  hasNegativeCashFlow: boolean;
}

// ============================================================================
// INSIGHTS / ALERTS
// ============================================================================

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface RealEstateInsight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  relatedPropertyId?: string;
}

// ============================================================================
// COMPLETE DASHBOARD CONTRACT
// ============================================================================

export interface RealEstateDashboardData {
  summary: RealEstateDashboardSummary;
  propertyValueSeries: PropertyValueDataPoint[];
  assetAllocationSeries: AssetAllocationSlice[];
  properties: PropertyListItem[];
  insights: RealEstateInsight[];
}
