/**
 * Scenario Explanation Component
 * 
 * Displays educational explanation for scenarios:
 * - What happens
 * - Why this happens
 * - What this means
 */

'use client';

import { InfoIcon } from '@/components/icons';
import type { ScenarioResult } from '@/lib/portfolio-intelligence/scenario-analytics';
import { SCENARIO_COPY } from '@/constants/analyticsCopy';

interface ScenarioExplanationProps {
  scenario: ScenarioResult;
}

export function ScenarioExplanation({ scenario }: ScenarioExplanationProps) {
  const explanation = scenario.explanation;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
        Understanding This Scenario
      </h3>

      {/* What Happens */}
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
        <div className="flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {SCENARIO_COPY.sections.whatHappens}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {explanation.what}
            </p>
          </div>
        </div>
      </div>

      {/* Why This Happens */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
        <div className="flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
              {SCENARIO_COPY.sections.whyThisHappens}
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {explanation.why}
            </p>
          </div>
        </div>
      </div>

      {/* What This Means */}
      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800/30">
        <div className="flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
              {SCENARIO_COPY.sections.whatThisMeans}
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              {explanation.meaning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
