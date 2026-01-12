/**
 * Score Gauge Component
 * 
 * Circular gauge for displaying scores (0-100).
 * Uses CSS/SVG for simplicity (no Recharts dependency).
 */

'use client';

import { getScoreColorHex, scoreToRiskLevel } from '@/utils/riskMapper';
import { getRiskLevelLabel } from '@/utils/riskMapper';
import { getGradeInfo } from '@/lib/portfolio-intelligence/ui-copy';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
  showGrade?: boolean;
}

export function ScoreGauge({ score, size = 200, showLabel = true, showGrade = true }: ScoreGaugeProps) {
  const color = getScoreColorHex(score);
  const gradeInfo = getGradeInfo(score);
  const circumference = 2 * Math.PI * 90; // radius = 90
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          viewBox="0 0 200 200"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="12"
            className="dark:stroke-[#334155]"
          />
          {/* Score circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold"
            style={{ color }}
          >
            {score}
          </span>
          {showLabel && (
            <span className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
              / 100
            </span>
          )}
        </div>
      </div>
      
      {/* Grade label */}
      {showGrade && (
        <div className="mt-4 text-center">
          <div
            className="text-xl font-semibold mb-1"
            style={{ color }}
          >
            {gradeInfo.label}
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            {gradeInfo.range}
          </div>
        </div>
      )}
    </div>
  );
}