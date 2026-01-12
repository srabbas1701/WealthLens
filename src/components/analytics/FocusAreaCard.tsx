/**
 * Focus Area Card Component
 * 
 * Displays a focus area with optimization-oriented language.
 * Used for "What to Focus On First" section.
 */

'use client';

import { TargetIcon } from '@/components/icons';
import { getRiskColorsByLevel } from '@/utils/riskMapper';
import type { RiskLevel } from '@/constants/riskColors';

interface FocusAreaCardProps {
  title: string;
  explanation: string;
  impact: number;
  riskLevel: RiskLevel;
  actionHint?: string;
}

export function FocusAreaCard({
  title,
  explanation,
  impact,
  riskLevel,
  actionHint,
}: FocusAreaCardProps) {
  const colorMapping = getRiskColorsByLevel(riskLevel);
  const color = colorMapping.primary;
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800/50 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div 
          className="flex-shrink-0 mt-0.5"
          style={{ color }}
        >
          <TargetIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 
            className="text-base font-semibold mb-2"
            style={{ color }}
          >
            {title}
          </h4>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8] mb-3">
            {explanation}
          </p>
          {actionHint && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/30">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {actionHint}
              </p>
            </div>
          )}
          <div className="mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Impact: {impact.toFixed(0)} points
          </div>
        </div>
      </div>
    </div>
  );
}
