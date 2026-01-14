/**
 * Scenario Impact Analysis Page
 * 
 * V3: Scenario-Linked Analytics
 * 
 * Simulates how portfolio structure behaves under different hypothetical market conditions.
 * Educational and risk-understanding focused.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { AnalyticsPageLayout } from '@/components/analytics/AnalyticsPageLayout';
import { LoadingState } from '@/components/analytics/LoadingState';
import { ErrorState } from '@/components/analytics/ErrorState';
import { EmptyState } from '@/components/analytics/EmptyState';
import { fetchStabilityAnalytics } from '@/services/portfolioAnalytics';
import {
  SCENARIO_COPY,
  PAGE_TITLES,
  EMPTY_STATES,
  COMMON_DISCLAIMERS,
} from '@/constants/analyticsCopy';
import type { StabilityAnalysis } from '@/lib/portfolio-intelligence/stability-analytics';
import {
  calculateMarketDrawdownScenario,
  calculateSectorShockScenario,
  calculateRateShockScenario,
  calculateMarketRecoveryScenario,
  type ScenarioResult,
} from '@/lib/portfolio-intelligence/scenario-analytics';
import { ScenarioSelector } from '@/components/analytics/ScenarioSelector';
import { ScenarioVisualization } from '@/components/analytics/ScenarioVisualization';
import { ScenarioExplanation } from '@/components/analytics/ScenarioExplanation';

type ScenarioType = 'marketDrawdown' | 'sectorShock' | 'rateShock' | 'marketRecovery';

export default function ScenarioAnalyticsPage() {
  const { user, authStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stabilityData, setStabilityData] = useState<StabilityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('marketDrawdown');

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
      <AnalyticsPageLayout title={PAGE_TITLES.scenarioAnalytics}>
        <LoadingState />
      </AnalyticsPageLayout>
    );
  }

  if (error && !stabilityData) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.scenarioAnalytics}>
        <ErrorState error={error} onRetry={() => user?.id && fetchData(user.id)} />
      </AnalyticsPageLayout>
    );
  }

  if (!stabilityData) {
    return (
      <AnalyticsPageLayout title={PAGE_TITLES.scenarioAnalytics}>
        <EmptyState title={EMPTY_STATES.noData} message={EMPTY_STATES.noHoldings} />
      </AnalyticsPageLayout>
    );
  }

  // Calculate scenarios
  const marketDrawdown = calculateMarketDrawdownScenario(stabilityData);
  const rateShock = calculateRateShockScenario(stabilityData);
  const marketRecovery = calculateMarketRecoveryScenario(stabilityData);
  
  // For sector shock, use a default sector (in production, would come from sector analytics)
  const sectorShock = calculateSectorShockScenario(stabilityData, 'Technology', 25);

  const scenarios: Record<ScenarioType, ScenarioResult> = {
    marketDrawdown,
    sectorShock,
    rateShock,
    marketRecovery,
  };

  const currentScenario = scenarios[selectedScenario];

  return (
    <AnalyticsPageLayout
      title={PAGE_TITLES.scenarioAnalytics}
      description={SCENARIO_COPY.description}
      backHref="/analytics/overview"
      backLabel="Back to Analytics"
      disclaimerText={SCENARIO_COPY.disclaimer}
    >
      {/* Scenario Selector */}
      <section className="mb-6">
        <ScenarioSelector
          selectedScenario={selectedScenario}
          onScenarioChange={setSelectedScenario}
        />
      </section>

      {/* Current Scenario Visualization */}
      <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
        <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
          {currentScenario.scenarioType === 'marketDrawdown' && SCENARIO_COPY.scenarios.marketDrawdown.title}
          {currentScenario.scenarioType === 'sectorShock' && SCENARIO_COPY.scenarios.sectorShock.title}
          {currentScenario.scenarioType === 'rateShock' && SCENARIO_COPY.scenarios.rateShock.title}
          {currentScenario.scenarioType === 'marketRecovery' && SCENARIO_COPY.scenarios.marketRecovery.title}
        </h2>

        <ScenarioVisualization scenario={currentScenario} stabilityData={stabilityData} />
      </section>

      {/* Scenario Explanation */}
      <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
        <ScenarioExplanation scenario={currentScenario} />
      </section>
    </AnalyticsPageLayout>
  );
}
