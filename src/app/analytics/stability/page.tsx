/**
 * Stability & Safety Analytics Page
 * 
 * Displays stability and safety analytics including:
 * - Stability-oriented assets vs market-linked breakdown
 * - Credit risk exposure
 * - Retirement contribution analysis
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { AnalyticsPageLayout } from '@/components/analytics/AnalyticsPageLayout';
import { LoadingState } from '@/components/analytics/LoadingState';
import { ErrorState } from '@/components/analytics/ErrorState';
import { EmptyState } from '@/components/analytics/EmptyState';
import { RiskInsightCard } from '@/components/analytics/RiskInsightCard';
import { InfoTooltip } from '@/components/analytics/InfoTooltip';
import { enhanceStabilityInsights } from '@/lib/portfolio-intelligence/stability-insights';
import { ScoreExplanation } from '@/components/analytics/ScoreExplanation';
import { fetchStabilityAnalytics } from '@/services/portfolioAnalytics';
import {
  STABILITY_COPY,
  PAGE_TITLES,
  SECTION_HEADERS,
  EMPTY_STATES,
  COMMON_DISCLAIMERS,
} from '@/constants/analyticsCopy';
import { scoreToRiskLevel } from '@/utils/riskMapper';
import { generateStabilityScoreExplanation } from '@/lib/portfolio-intelligence/score-explanations';
import { useCurrency } from '@/lib/currency/useCurrency';
import { ShieldCheckIcon } from '@/components/icons';
import type { StabilityAnalysis } from '@/lib/portfolio-intelligence/stability-analytics';

export default function StabilityAnalyticsPage() {
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [stabilityData, setStabilityData] = useState<StabilityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchStabilityAnalytics(userId);
      
      if (response.success && response.data) {
        setStabilityData(response.data);
      } else {
        setError(response.error || EMPTY_STATES.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : EMPTY_STATES.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && user?.id) {
      fetchData(user.id);
    }
  }, [authStatus, user, fetchData]);

  // Redirect if not authenticated
  if (authStatus === 'unauthenticated') {
    return null; // Will redirect via middleware
  }

  if (loading) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.stabilityAnalytics}>
        <LoadingState />
      </AnalyticsPageLayout>
    );
  }

  if (error && !stabilityData) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.stabilityAnalytics}>
        <ErrorState error={error} onRetry={() => user?.id && fetchData(user.id)} />
      </AnalyticsPageLayout>
    );
  }

  if (!stabilityData) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.stabilityAnalytics}>
        <EmptyState title={EMPTY_STATES.noData} message={EMPTY_STATES.noHoldings} />
      </AnalyticsPageLayout>
    );
  }

  const { metrics, creditRisk, retirement } = stabilityData;
  const stabilityRiskLevel = scoreToRiskLevel(metrics.stabilityScore);
  const capitalProtectedPct = metrics.capitalProtected.percentage;
  const marketLinkedPct = metrics.marketLinked.percentage;
  const explanation = generateStabilityScoreExplanation(stabilityData);
  // Enhance insights with explanations and sort by impact
  const enhancedInsights = enhanceStabilityInsights(stabilityData)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return (
    <AnalyticsPageLayout
      title={PAGE_TITLES.stabilityAnalytics}
      description={STABILITY_COPY.explanation}
    >
      {/* Stability Overview */}
      <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
        <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
          {SECTION_HEADERS.stabilityOverview}
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Stability-Oriented vs Market-Linked */}
          <div>
            <h3 className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8] mb-4">
              Asset Stability Breakdown
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                      Stability-Oriented Assets
                    </span>
                    <InfoTooltip content={STABILITY_COPY.stabilityOrientedTooltip} />
                  </div>
                  <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {capitalProtectedPct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[#F1F5F9] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 dark:bg-green-500 transition-all duration-500"
                    style={{ width: `${capitalProtectedPct}%` }}
                  />
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  {formatCurrency(metrics.capitalProtected.value)}
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    Market-Linked
                  </span>
                  <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {marketLinkedPct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[#F1F5F9] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                    style={{ width: `${marketLinkedPct}%` }}
                  />
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  {formatCurrency(metrics.marketLinked.value)}
                </p>
              </div>
            </div>
          </div>

          {/* Stability Score */}
          <div>
            <h3 className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8] mb-4">
              Stability Score
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="w-16 h-16 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  {metrics.stabilityScore}
                  <span className="text-xl text-[#6B7280] dark:text-[#94A3B8]">/100</span>
                </div>
                <div className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8]">
                  {metrics.stabilityGrade} Stability
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stability Score Explanation */}
        <div className="mt-6">
          <ScoreExplanation
            summary={explanation.summary}
            contributingFactors={explanation.contributingFactors}
            considerations={explanation.considerations}
          />
        </div>

        {/* Stability-Oriented Sources */}
        {metrics.capitalProtected.sources.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
            <h4 className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8] mb-3">
              Stability-Oriented Assets
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.capitalProtected.sources.map((source, index) => (
                <div
                  key={index}
                  className="bg-[#F9FAFB] dark:bg-[#334155] rounded-lg p-3"
                >
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">
                    {source.name}
                  </div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatCurrency(source.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Credit Risk Exposure */}
      {creditRisk.totalExposure > 0 && (
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
            Credit Risk Exposure
          </h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                Total Exposure
              </span>
              <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {formatCurrency(creditRisk.totalExposure)}
              </span>
            </div>
            <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Risk Level: <span className="font-semibold">{creditRisk.riskLevel}</span>
            </div>
          </div>

          {creditRisk.breakdown.length > 0 && (
            <div className="space-y-2">
              {creditRisk.breakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {item.assetName}
                    </div>
                    {item.creditRating && (
                      <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                        {item.creditRating}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Retirement Contribution */}
      {retirement.totalValue > 0 && (
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
            Retirement Allocation
          </h2>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                Total Retirement Value
              </span>
              <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {formatCurrency(retirement.totalValue)} ({retirement.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>

          {retirement.breakdown.length > 0 && (
            <div className="space-y-3">
              {retirement.breakdown.map((item, index) => (
                <div key={index} className="p-4 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {item.type}
                    </span>
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                    Stability Contribution: {item.stabilityContribution}/100
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tax Benefits */}
          {(retirement.taxBenefits.eeeAssets > 0 || retirement.taxBenefits.eetAssets > 0) && (
            <div className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
              <h4 className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8] mb-3">
                Tax Benefits
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {retirement.taxBenefits.eeeAssets > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30">
                    <div className="text-xs text-green-800 dark:text-green-200 mb-1">
                      EEE Assets (EPF/PPF)
                    </div>
                    <div className="text-sm font-semibold text-green-900 dark:text-green-100">
                      {formatCurrency(retirement.taxBenefits.eeeAssets)}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Exempt-Exempt-Exempt (No tax)
                    </div>
                  </div>
                )}
                {retirement.taxBenefits.eetAssets > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <div className="text-xs text-blue-800 dark:text-blue-200 mb-1">
                      EET Assets (NPS)
                    </div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {formatCurrency(retirement.taxBenefits.eetAssets)}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Exempt-Exempt-Taxable (Tax on withdrawal)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Key Observations */}
      {enhancedInsights.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            {SECTION_HEADERS.keyObservations}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {enhancedInsights.map((insight, index) => (
              <RiskInsightCard
                key={index}
                title={insight.text}
                explanation={insight.explanation}
                riskLevel={stabilityRiskLevel}
                severity={insight.impact >= 80 ? 'high' : insight.impact >= 60 ? 'medium' : 'low'}
              />
            ))}
          </div>
        </section>
      )}
    </AnalyticsPageLayout>
  );
}