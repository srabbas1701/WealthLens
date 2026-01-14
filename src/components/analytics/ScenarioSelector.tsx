/**
 * Scenario Selector Component
 * 
 * Tab-based selector for choosing scenario type.
 */

'use client';

import type { ScenarioType } from '@/lib/portfolio-intelligence/scenario-analytics';
import { SCENARIO_COPY } from '@/constants/analyticsCopy';

interface ScenarioSelectorProps {
  selectedScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
}

export function ScenarioSelector({ selectedScenario, onScenarioChange }: ScenarioSelectorProps) {
  const scenarios: Array<{ type: ScenarioType; label: string }> = [
    { type: 'marketDrawdown', label: SCENARIO_COPY.scenarios.marketDrawdown.title },
    { type: 'sectorShock', label: SCENARIO_COPY.scenarios.sectorShock.title },
    { type: 'rateShock', label: SCENARIO_COPY.scenarios.rateShock.title },
    { type: 'marketRecovery', label: SCENARIO_COPY.scenarios.marketRecovery.title },
  ];

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-2">
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => {
          const isSelected = selectedScenario === scenario.type;
          return (
            <button
              key={scenario.type}
              type="button"
              onClick={() => onScenarioChange(scenario.type)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-transparent text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
                }
              `}
            >
              {scenario.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
