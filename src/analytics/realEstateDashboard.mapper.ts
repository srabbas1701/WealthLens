/**
 * Real Estate Dashboard Data Mapper
 * 
 * Maps analytics outputs to dashboard data contracts.
 * Pure mapping logic - no business calculations.
 */

import type { OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
import {
  calculateRealEstateAnalytics,
  type PerAssetAnalytics,
  type PortfolioAnalytics,
} from '@/services/realEstateAnalytics.service';
import type {
  RealEstateDashboardData,
  RealEstateDashboardSummary,
  PropertyValueDataPoint,
  AssetAllocationSlice,
  PropertyListItem,
  RealEstateInsight,
} from '@/types/realEstateDashboard.types';
import { getRealEstateDashboardInsights } from './realEstateDashboardInsights.engine';

/**
 * Get Real Estate Dashboard Data
 * 
 * Maps analytics outputs to dashboard data contract.
 * All values are ownership-adjusted and in raw numeric format.
 * 
 * @param assetsData - Real estate assets with loans and cashflows (ownership-adjusted)
 * @param totalNetWorth - Overall portfolio net worth (for allocation calculation)
 * @returns Dashboard data conforming to RealEstateDashboardData contract
 */
export async function getRealEstateDashboardData(
  assetsData: OwnershipAdjustedAsset[],
  totalNetWorth: number | null
): Promise<RealEstateDashboardData> {
  // Compute analytics
  const { perAsset, portfolio } = await calculateRealEstateAnalytics(
    assetsData,
    totalNetWorth
  );

  // Map summary
  const summary = mapSummary(portfolio, perAsset);

  // Map property value series
  const propertyValueSeries = mapPropertyValueSeries(perAsset, assetsData);

  // Map asset allocation series
  const assetAllocationSeries = mapAssetAllocationSeries(portfolio);

  // Map properties list
  const properties = mapPropertiesList(perAsset, assetsData);

  // Map insights (aggregated from property-level analytics)
  const insights = getRealEstateDashboardInsights(perAsset, portfolio, assetsData);

  return {
    summary,
    propertyValueSeries,
    assetAllocationSeries,
    properties,
    insights,
  };
}

/**
 * Map portfolio analytics to dashboard summary
 */
function mapSummary(
  portfolio: PortfolioAnalytics,
  perAsset: PerAssetAnalytics[]
): RealEstateDashboardSummary {
  // Calculate average net rental yield
  const netYields = perAsset
    .map((a) => a.metrics.netYield)
    .filter((y): y is number => y !== null);

  const averageNetRentalYield =
    netYields.length > 0
      ? netYields.reduce((sum, y) => sum + y, 0) / netYields.length
      : null;

  // Calculate portfolio allocation percent
  // Use 0 if totalNetWorth is null (portfolio analytics already handles this)
  const portfolioAllocationPercent =
    portfolio.realEstateAllocationPercent ?? 0;

  return {
    totalEstimatedValue: portfolio.totalValue,
    netRealEstateWorth: portfolio.netWorth,
    averageNetRentalYield,
    portfolioAllocationPercent,
  };
}

/**
 * Map per-asset analytics to property value series
 */
function mapPropertyValueSeries(
  perAsset: PerAssetAnalytics[],
  assetsData: OwnershipAdjustedAsset[]
): PropertyValueDataPoint[] {
  return perAsset
    .map((analytics) => {
      const asset = assetsData.find((a) => a.asset.id === analytics.assetId);
      if (!asset || analytics.metrics.currentValue === null) {
        return null;
      }

      return {
        propertyId: analytics.assetId,
        propertyName: asset.asset.property_nickname,
        estimatedValue: analytics.metrics.currentValue,
        city: asset.asset.city,
      };
    })
    .filter(
      (point): point is PropertyValueDataPoint => point !== null
    );
}

/**
 * Map portfolio analytics to asset allocation series
 * Only includes real_estate slice (other asset classes added later)
 */
function mapAssetAllocationSeries(
  portfolio: PortfolioAnalytics
): AssetAllocationSlice[] {
  return [
    {
      assetClass: 'real_estate',
      value: portfolio.netWorth,
    },
  ];
}

/**
 * Map per-asset analytics to properties list
 */
function mapPropertiesList(
  perAsset: PerAssetAnalytics[],
  assetsData: OwnershipAdjustedAsset[]
): PropertyListItem[] {
  return perAsset
    .map((analytics) => {
      const asset = assetsData.find((a) => a.asset.id === analytics.assetId);
      if (!asset || analytics.metrics.currentValue === null) {
        return null;
      }

      // Determine hasNegativeCashFlow
      // Negative cash flow: EMI > Rent (emiRentGap < 0)
      const hasNegativeCashFlow =
        analytics.metrics.emiRentGap !== null &&
        analytics.metrics.emiRentGap < 0;

      // Map rental status
      const rentalStatus = mapRentalStatus(
        analytics.metadata.rentalStatus
      );

      return {
        propertyId: analytics.assetId,
        propertyName: asset.asset.property_nickname,
        city: asset.asset.city,
        propertyType: asset.asset.property_type,
        estimatedValue: analytics.metrics.currentValue,
        netRentalYield: analytics.metrics.netYield,
        emiRentGap: analytics.metrics.emiRentGap,
        rentalStatus,
        hasNegativeCashFlow,
      };
    })
    .filter((item): item is PropertyListItem => item !== null);
}

/**
 * Map rental status enum to dashboard contract type
 */
function mapRentalStatus(
  status: 'self_occupied' | 'rented' | 'vacant' | null
): 'rented' | 'self_occupied' | 'vacant' {
  if (status === 'rented' || status === 'self_occupied' || status === 'vacant') {
    return status;
  }
  return 'self_occupied';
}
