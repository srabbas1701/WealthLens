/**
 * Pillar Score Bar Component
 * 
 * Displays a single pillar score with bar visualization and tooltip.
 */

'use client';

import { InfoIcon } from '@/components/icons';
import { getScoreColorHex } from '@/utils/riskMapper';
import { getPillarInsight } from '@/lib/portfolio-intelligence/ui-copy';
import type { PillarName } from '@/lib/portfolio-intelligence/health-score';

interface PillarScoreBarProps {
  name: PillarName;
  displayName: string;
  score: number;
  weight: number;
  tooltip: string;
}

export function PillarScoreBar({ name, displayName, score, weight, tooltip }: PillarScoreBarProps) {
  const color = getScoreColorHex(score);
  const insight = getPillarInsight(name, score);
  
  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {displayName}
          </h4>
          <div className="group relative">
            <InfoIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] cursor-help" />
            <div className="absolute left-0 top-6 z-10 w-64 p-2 bg-[#0F172A] dark:bg-[#1E293B] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg">
              {tooltip}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {score}
          </span>
          <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] ml-1">/100</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="mb-2">
        <div className="w-full h-2 bg-[#F1F5F9] dark:bg-[#334155] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${score}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* Insight */}
      {insight && (
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-2">{insight}</p>
      )}
    </div>
  );
}