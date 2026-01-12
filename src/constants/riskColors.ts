/**
 * Risk Color Constants
 * 
 * CENTRALIZED COLOR SYSTEM
 * No component may define its own colors.
 * All colors must come from risk mapping.
 */

export type RiskLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'info';

export interface RiskColorMapping {
  bg: string; // Background color
  text: string; // Text color
  border: string; // Border color
  light: string; // Light variant (for backgrounds)
  dark: string; // Dark variant (for borders)
}

export const RISK_COLORS: Record<RiskLevel, RiskColorMapping> = {
  excellent: {
    bg: '#10B981', // Green
    text: '#065F46',
    border: '#059669',
    light: '#D1FAE5',
    dark: '#047857',
  },
  good: {
    bg: '#3B82F6', // Blue
    text: '#1E40AF',
    border: '#2563EB',
    light: '#DBEAFE',
    dark: '#1D4ED8',
  },
  fair: {
    bg: '#F59E0B', // Amber
    text: '#92400E',
    border: '#D97706',
    light: '#FEF3C7',
    dark: '#B45309',
  },
  poor: {
    bg: '#EF4444', // Red
    text: '#991B1B',
    border: '#DC2626',
    light: '#FEE2E2',
    dark: '#B91C1C',
  },
  info: {
    bg: '#64748B', // Grey/Slate
    text: '#475569',
    border: '#475569',
    light: '#F1F5F9',
    dark: '#334155',
  },
};

/**
 * Map score (0-100) to risk level
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Get risk color mapping for a score
 */
export function getRiskColors(score: number): RiskColorMapping {
  const level = scoreToRiskLevel(score);
  return RISK_COLORS[level];
}

/**
 * Get risk color mapping for a risk level
 */
export function getRiskColorsByLevel(level: RiskLevel): RiskColorMapping {
  return RISK_COLORS[level];
}