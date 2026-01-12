/**
 * Focus Areas Generator
 * 
 * Generates "What to Focus On First" recommendations.
 * Optimization-oriented language (review, improve, monitor).
 */

import type { Deduction } from './health-score';
import { getRiskExplanation } from './risk-explanations';

export interface FocusArea {
  title: string;
  explanation: string;
  impact: number;
  actionHint: string;
  riskLevel: RiskLevel;
}

/**
 * Generate action hint based on risk category and reason
 */
function getActionHint(deduction: Deduction): string {
  const { reason, category } = deduction;
  const lowerReason = reason.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes('concentration') || lowerReason.includes('concentration')) {
    return 'Review portfolio allocation to improve diversification';
  }
  
  if (lowerCategory.includes('diversification') || lowerCategory.includes('overlap') || lowerReason.includes('overlap')) {
    return 'Review mutual fund holdings to identify and reduce overlap';
  }
  
  if (lowerCategory.includes('allocation') || lowerReason.includes('allocation')) {
    return 'Review asset allocation mix to align with your goals';
  }
  
  if (lowerCategory.includes('sector') || lowerReason.includes('sector')) {
    return 'Review sector exposure to improve diversification';
  }
  
  if (lowerCategory.includes('market_cap') || lowerReason.includes('market cap')) {
    return 'Review market cap distribution to balance risk and return';
  }
  
  if (lowerCategory.includes('geography') || lowerReason.includes('geography')) {
    return 'Review geographic diversification to reduce country risk';
  }
  
  if (lowerCategory.includes('quality') || lowerReason.includes('quality')) {
    return 'Monitor investment quality metrics and performance trends';
  }
  
  // Default action hint
  return 'Review this area to identify optimization opportunities';
}

/**
 * Generate focus areas from top risks
 * Returns maximum 2 highest impact areas
 */
export function generateFocusAreas(topRisks: Deduction[]): FocusArea[] {
  if (topRisks.length === 0) {
    return [];
  }
  
  // Sort by impact (highest first) and take top 2
  const sortedRisks = [...topRisks]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 2);
  
  return sortedRisks.map(risk => {
    // Map severity to risk level for display
    const riskLevel = severityToRiskLevel(risk.severity);
    
    return {
      title: risk.reason,
      explanation: getRiskExplanation(risk),
      impact: risk.impact,
      actionHint: getActionHint(risk),
      riskLevel,
    };
  });
}
