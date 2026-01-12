/**
 * Portfolio Health Score Page
 * 
 * Displays comprehensive Portfolio Health Score with:
 * - Overall score and grade
 * - Pillar breakdown
 * - Top risks
 * - Improvement opportunities
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { AnalyticsPageLayout } from '@/components/analytics/AnalyticsPageLayout';
import { LoadingState } from '@/components/analytics/LoadingState';
import { ErrorState } from '@/components/analytics/ErrorState';
import { EmptyState } from '@/components/analytics/EmptyState';
import { ScoreGauge } from '@/components/analytics/ScoreGauge';
import { PillarScoreBar } from '@/components/analytics/PillarScoreBar';
import { RiskInsightCard } from '@/components/analytics/RiskInsightCard';
import { FocusAreaCard } from '@/components/analytics/FocusAreaCard';
import { getRiskExplanation } from '@/lib/portfolio-intelligence/risk-explanations';
import { generateFocusAreas } from '@/lib/portfolio-intelligence/focus-areas';
import { fetchPortfolioHealthScore } from '@/services/portfolioAnalytics';
import {
  HEALTH_SCORE_COPY,
  PAGE_TITLES,
  SECTION_HEADERS,
  EMPTY_STATES,
} from '@/constants/analyticsCopy';
import { getGradeInfo } from '@/lib/portfolio-intelligence/ui-copy';
import { severityToRiskLevel } from '@/utils/riskMapper';
import { generateHealthScoreExplanation } from '@/lib/portfolio-intelligence/score-explanations';
import { ScoreExplanation } from '@/components/analytics/ScoreExplanation';
import type { PortfolioHealthScore } from '@/lib/portfolio-intelligence/health-score';

export default function HealthScorePage() {
  const { user, authStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState<PortfolioHealthScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchPortfolioHealthScore(userId);
      
      if (response.success && response.data) {
        setHealthScore(response.data);
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
      <AnalyticsPageLayout title={PAGE_TITLES.healthScore}>
        <LoadingState />
      </AnalyticsPageLayout>
    );
  }

  if (error && !healthScore) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.healthScore}>
        <ErrorState error={error} onRetry={() => user?.id && fetchData(user.id)} />
      </AnalyticsPageLayout>
    );
  }

  if (!healthScore) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.healthScore}>
        <EmptyState title={EMPTY_STATES.noData} message={EMPTY_STATES.noHoldings} />
      </AnalyticsPageLayout>
    );
  }

  const gradeInfo = getGradeInfo(healthScore.totalScore);
  // Sort risks by impact (highest first) and take top 3 for Key Risks section
  const topRisks = [...healthScore.topRisks]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
  const explanation = generateHealthScoreExplanation(healthScore);
  // Generate focus areas (top 2 highest impact)
  const focusAreas = generateFocusAreas(healthScore.topRisks);

  return (
    <AnalyticsPageLayout
      title={PAGE_TITLES.healthScore}
      description={HEALTH_SCORE_COPY.description}
    >
      {/* Portfolio Health Score Summary */}
      <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
          {/* Score Gauge */}
          <div className="flex-shrink-0">
            <ScoreGauge score={healthScore.totalScore} size={200} />
          </div>
          
          {/* Summary Info */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              {PAGE_TITLES.healthScore}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">
              {HEALTH_SCORE_COPY.subline}
            </p>
            <div
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold mb-4"
              style={{
                backgroundColor: gradeInfo.color === 'green' ? '#D1FAE5' : 
                                 gradeInfo.color === 'blue' ? '#DBEAFE' :
                                 gradeInfo.color === 'amber' ? '#FEF3C7' : '#FEE2E2',
                color: gradeInfo.color === 'green' ? '#065F46' :
                       gradeInfo.color === 'blue' ? '#1E40AF' :
                       gradeInfo.color === 'amber' ? '#92400E' : '#991B1B',
              }}
            >
              {gradeInfo.insight}
            </div>
          </div>
        </div>
        
        {/* Score Explanation */}
        <div className="mt-6">
          <ScoreExplanation
            summary={explanation.summary}
            positiveFactors={explanation.positiveFactors}
            areasForAttention={explanation.areasForAttention}
          />
        </div>
      </section>

      {/* What to Focus On First */}
      {focusAreas.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            {SECTION_HEADERS.focusAreas}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {focusAreas.map((area, index) => (
              <FocusAreaCard
                key={index}
                title={area.title}
                explanation={area.explanation}
                impact={area.impact}
                riskLevel={area.riskLevel}
                actionHint={area.actionHint}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pillar Breakdown */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
          {SECTION_HEADERS.pillarBreakdown}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {healthScore.pillarBreakdown.map((pillar) => (
            <PillarScoreBar
              key={pillar.name}
              name={pillar.name}
              displayName={pillar.displayName}
              score={pillar.score}
              weight={pillar.weight}
              tooltip={pillar.metadata.tooltip}
            />
          ))}
        </div>
      </section>

      {/* Top Risks */}
      {topRisks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            {SECTION_HEADERS.topRisks}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {topRisks.map((risk, index) => (
              <RiskInsightCard
                key={index}
                title={risk.reason}
                explanation={getRiskExplanation(risk)}
                impact={risk.impact}
                riskLevel={severityToRiskLevel(risk.severity)}
                severity={risk.severity}
              />
            ))}
          </div>
        </section>
      )}

      {/* Improvement Opportunities */}
      {healthScore.topImprovements.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            {SECTION_HEADERS.improvements}
          </h2>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <ul className="space-y-3">
              {healthScore.topImprovements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">
                    {improvement}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </AnalyticsPageLayout>
  );
}