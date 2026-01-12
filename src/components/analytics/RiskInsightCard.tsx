/**
 * Risk Insight Card Component
 * 
 * Enhanced insight card with "Why this matters" explanation.
 * Used for Key Risks and Key Observations sections.
 */

'use client';

import { AlertTriangleIcon, InfoIcon } from '@/components/icons';
import { getRiskColorsByLevel } from '@/utils/riskMapper';
import type { RiskLevel } from '@/constants/riskColors';

interface RiskInsightCardProps {
  title: string;
  explanation: string;
  impact?: number;
  riskLevel: RiskLevel;
  severity?: 'low' | 'medium' | 'high' | 'info';
}

export function RiskInsightCard({
  title,
  explanation,
  impact,
  riskLevel,
  severity = 'medium',
}: RiskInsightCardProps) {
  const colorMapping = getRiskColorsByLevel(riskLevel);
  const color = colorMapping.bg;
  
  // Use severity to determine icon
  const Icon = severity === 'high' ? AlertTriangleIcon : InfoIcon;
  
  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
      <div className="flex items-start gap-3">
        <div 
          className="flex-shrink-0 mt-0.5"
          style={{ color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 
            className="text-sm font-semibold mb-2"
            style={{ color }}
          >
            {title}
          </h4>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] mb-2">
            {explanation}
          </p>
          {impact !== undefined && (
            <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Impact: {impact.toFixed(0)} points
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
