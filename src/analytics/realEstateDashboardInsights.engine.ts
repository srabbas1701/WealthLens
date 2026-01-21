/**
 * Real Estate Dashboard Insights Engine
 * 
 * Aggregates property-level analytics and alerts into portfolio-level insights.
 * Pure computation - no database access.
 */

import type { PerAssetAnalytics, PortfolioAnalytics } from '@/services/realEstateAnalytics.service';
import type { OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
import type { RealEstateInsight } from '@/types/realEstateDashboard.types';

/**
 * Get Real Estate Dashboard Insights
 * 
 * Aggregates property-level analytics into portfolio-level insights.
 * 
 * @param perAsset - Per-asset analytics results
 * @param portfolio - Portfolio-level analytics
 * @param assetsData - Raw asset data (for valuation dates)
 * @returns Array of portfolio-level insights
 */
export function getRealEstateDashboardInsights(
  perAsset: PerAssetAnalytics[],
  portfolio: PortfolioAnalytics,
  assetsData: OwnershipAdjustedAsset[]
): RealEstateInsight[] {
  const insights: RealEstateInsight[] = [];

  // ========================================================================
  // Rule 1: Negative Cash Flow Summary
  // ========================================================================
  const negativeCashFlowProperties = perAsset.filter(
    (analytics) =>
      analytics.metrics.emiRentGap !== null && analytics.metrics.emiRentGap < 0
  );

  if (negativeCashFlowProperties.length >= 1) {
    insights.push({
      id: 'negative-cash-flow-summary',
      title: 'Negative cash flow detected',
      description: `${negativeCashFlowProperties.length} ${
        negativeCashFlowProperties.length === 1 ? 'property has' : 'properties have'
      } EMI higher than rental income`,
      severity: 'warning',
    });
  }

  // ========================================================================
  // Rule 2: Low Yield Summary
  // ========================================================================
  const lowYieldProperties = perAsset.filter(
    (analytics) =>
      analytics.metrics.netYield !== null && analytics.metrics.netYield < 2
  );

  if (lowYieldProperties.length >= 1) {
    insights.push({
      id: 'low-yield-summary',
      title: 'Low rental yield properties',
      description: `${lowYieldProperties.length} ${
        lowYieldProperties.length === 1 ? 'property is' : 'properties are'
      } yielding below 2%`,
      severity: 'info',
    });
  }

  // ========================================================================
  // Rule 3: High Concentration Risk
  // ========================================================================
  if (portfolio.concentrationMap.length > 0) {
    const topProperty = portfolio.concentrationMap[0];
    if (topProperty.concentrationPercent > 40) {
      insights.push({
        id: 'high-concentration-risk',
        title: 'High concentration risk',
        description: `One property makes up ${topProperty.concentrationPercent.toFixed(1)}% of your real estate portfolio`,
        severity: 'warning',
      });
    }
  }

  // ========================================================================
  // Rule 4: Stale Valuation Summary
  // ========================================================================
  const now = new Date();
  const staleValuationProperties = assetsData.filter((assetData) => {
    const lastUpdated = assetData.asset.valuation_last_updated;
    if (!lastUpdated) {
      return true; // No valuation update ever recorded
    }

    const lastUpdatedDate = new Date(lastUpdated);
    const monthsSinceUpdate =
      (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsSinceUpdate > 12;
  });

  if (staleValuationProperties.length >= 1) {
    insights.push({
      id: 'stale-valuation-summary',
      title: 'Valuation needs review',
      description: `${staleValuationProperties.length} ${
        staleValuationProperties.length === 1 ? 'property has' : 'properties have'
      } not been updated recently`,
      severity: 'info',
    });
  }

  return insights;
}
