/**
 * Risk Mapper Utilities
 * 
 * Helper functions for risk-related mappings and calculations
 */

import { RiskLevel, RISK_COLORS, scoreToRiskLevel, getRiskColors, getRiskColorsByLevel } from '@/constants/riskColors';

// Re-export from riskColors for convenience
export { scoreToRiskLevel, getRiskColors, getRiskColorsByLevel };

/**
 * Map severity string to risk level
 */
export function severityToRiskLevel(severity: 'info' | 'low' | 'medium' | 'high'): RiskLevel {
  switch (severity) {
    case 'info':
      return 'info';
    case 'low':
      return 'good';
    case 'medium':
      return 'fair';
    case 'high':
      return 'poor';
    default:
      return 'info';
  }
}

/**
 * Get color hex for a risk level
 */
export function getRiskColorHex(level: RiskLevel): string {
  return RISK_COLORS[level].bg;
}

/**
 * Get color hex for a score
 */
export function getScoreColorHex(score: number): string {
  return getRiskColors(score).bg;
}

/**
 * Get CSS classes for risk level (Tailwind)
 */
export function getRiskLevelClasses(level: RiskLevel, variant: 'bg' | 'text' | 'border' = 'bg'): string {
  const colors = RISK_COLORS[level];
  
  switch (variant) {
    case 'bg':
      return `bg-[${colors.bg}]`;
    case 'text':
      return `text-[${colors.text}]`;
    case 'border':
      return `border-[${colors.border}]`;
    default:
      return `bg-[${colors.bg}]`;
  }
}

/**
 * Get readable label for risk level
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'poor':
      return 'Needs Attention';
    case 'info':
      return 'Info';
    default:
      return 'Info';
  }
}