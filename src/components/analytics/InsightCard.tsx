/**
 * Insight Card Component
 * 
 * Displays an insight with icon, title, description, and risk-based styling.
 */

'use client';

import { ReactNode } from 'react';
import { AlertTriangleIcon, InfoIcon, CheckCircleIcon } from '@/components/icons';
import { getRiskColorsByLevel, type RiskLevel } from '@/constants/riskColors';

interface InsightCardProps {
  title: string;
  description: string;
  riskLevel: RiskLevel;
  icon?: ReactNode;
}

export function InsightCard({ title, description, riskLevel, icon }: InsightCardProps) {
  const colors = getRiskColorsByLevel(riskLevel);
  
  // Default icon based on risk level
  let defaultIcon = <InfoIcon className="w-5 h-5" />;
  if (riskLevel === 'poor' || riskLevel === 'fair') {
    defaultIcon = <AlertTriangleIcon className="w-5 h-5" />;
  } else if (riskLevel === 'excellent' || riskLevel === 'good') {
    defaultIcon = <CheckCircleIcon className="w-5 h-5" />;
  }
  
  const displayIcon = icon || defaultIcon;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: colors.light + '40', // 40% opacity
        borderColor: colors.border + '40',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: colors.bg }}
        >
          {displayIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="text-sm font-semibold mb-1"
            style={{ color: colors.text }}
          >
            {title}
          </h4>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}