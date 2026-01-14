/**
 * Scenario Visualization Component
 * 
 * Displays impact visualization for scenarios.
 */

'use client';

import type { ScenarioResult } from '@/lib/portfolio-intelligence/scenario-analytics';
import type { StabilityAnalysis } from '@/lib/portfolio-intelligence/stability-analytics';
import { useCurrency } from '@/lib/currency/useCurrency';

interface ScenarioVisualizationProps {
  scenario: ScenarioResult;
  stabilityData: StabilityAnalysis;
}

export function ScenarioVisualization({ scenario, stabilityData }: ScenarioVisualizationProps) {
  const { formatCurrency } = useCurrency();
  const totalValue = stabilityData.metadata.totalPortfolioValue;
  const impactPercent = Math.abs(scenario.portfolioImpactPercent);
  
  // Calculate impact value
  const impactValue = (totalValue * impactPercent) / 100;
  const remainingValue = totalValue - impactValue;

  // Determine color based on impact
  const getImpactColor = () => {
    if (scenario.scenarioType === 'marketRecovery') {
      return '#10B981'; // Green for recovery
    }
    if (impactPercent < 10) {
      return '#3B82F6'; // Blue for low impact
    }
    if (impactPercent < 20) {
      return '#F59E0B'; // Amber for moderate impact
    }
    return '#EF4444'; // Red for high impact
  };

  const impactColor = getImpactColor();

  return (
    <div className="space-y-6">
      {/* Impact Bar Visualization */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#475569] dark:text-[#94A3B8]">
            Portfolio Impact
          </span>
          <span 
            className="text-lg font-bold"
            style={{ color: impactColor }}
          >
            {impactPercent.toFixed(1)}%
          </span>
        </div>
        
        <div className="relative h-8 bg-[#F1F5F9] dark:bg-[#334155] rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full transition-all duration-500"
            style={{
              width: `${Math.min(impactPercent, 100)}%`,
              backgroundColor: impactColor,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {scenario.scenarioType === 'marketRecovery' ? 'Recovery Participation' : 'Estimated Impact'}
            </span>
          </div>
        </div>
      </div>

      {/* Impact Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-lg p-4 border border-[#E5E7EB] dark:border-[#334155]">
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">
            Current Portfolio Value
          </div>
          <div className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {formatCurrency(totalValue)}
          </div>
        </div>

        <div 
          className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-lg p-4 border border-[#E5E7EB] dark:border-[#334155]"
          style={{ borderColor: impactColor }}
        >
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">
            {scenario.scenarioType === 'marketRecovery' ? 'Estimated Recovery' : 'Estimated Impact'}
          </div>
          <div 
            className="text-lg font-semibold"
            style={{ color: impactColor }}
          >
            {scenario.scenarioType === 'marketRecovery' 
              ? `+${formatCurrency(impactValue)}`
              : `-${formatCurrency(impactValue)}`
            }
          </div>
        </div>

        <div className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-lg p-4 border border-[#E5E7EB] dark:border-[#334155]">
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">
            {scenario.scenarioType === 'marketRecovery' ? 'Recovery Value' : 'Remaining Value'}
          </div>
          <div className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {formatCurrency(remainingValue)}
          </div>
        </div>
      </div>

      {/* Scenario-specific details */}
      {scenario.scenarioType === 'marketDrawdown' && (
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Market Decline:</strong> {Math.abs(scenario.marketDeclinePercent)}%
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-200 mt-1">
            Stability-oriented assets ({scenario.stabilityCushion.toFixed(0)}%) provide cushioning
          </div>
        </div>
      )}

      {scenario.scenarioType === 'sectorShock' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <strong>Affected Sector:</strong> {scenario.sector} ({scenario.sectorExposurePercent.toFixed(0)}% exposure)
          </div>
          <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            Sector shock estimate: {Math.abs(scenario.estimatedSectorImpact).toFixed(1)}% portfolio impact
          </div>
        </div>
      )}

      {scenario.scenarioType === 'rateShock' && (
        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800/30">
          <div className="text-sm text-purple-900 dark:text-purple-100">
            <strong>Volatility Impact:</strong> Market-linked assets may experience {scenario.marketLinkedVolatility}% volatility
          </div>
          <div className="text-xs text-purple-800 dark:text-purple-200 mt-1">
            Stability-oriented assets ({scenario.stabilityCushion.toFixed(0)}%) have minimal impact ({scenario.stabilityAssetImpact}%)
          </div>
        </div>
      )}

      {scenario.scenarioType === 'marketRecovery' && (
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800/30">
          <div className="text-sm text-green-900 dark:text-green-100">
            <strong>Recovery Participation:</strong> {scenario.equityExposurePercent.toFixed(0)}% equity exposure
          </div>
          <div className="text-xs text-green-800 dark:text-green-200 mt-1">
            Portfolio would participate in market recovery proportional to equity exposure
          </div>
        </div>
      )}
    </div>
  );
}
