/**
 * Risk Explanation Generator
 * 
 * Generates "Why this matters" explanations for risks and observations.
 * Neutral, educational language. Data-backed explanations.
 */

import type { Deduction } from './health-score';

/**
 * Generate "Why this matters" explanation for a risk deduction
 */
export function getRiskExplanation(deduction: Deduction): string {
  const { reason, category, severity } = deduction;
  
  // Generate explanation based on category and reason
  // Keep tone neutral and educational
  
  if (category.includes('concentration') || reason.toLowerCase().includes('concentration')) {
    return 'High concentration increases portfolio vulnerability to individual asset performance.';
  }
  
  if (category.includes('diversification') || reason.toLowerCase().includes('overlap')) {
    return 'Overlap reduces diversification benefits and may increase correlated risk.';
  }
  
  if (category.includes('allocation') || reason.toLowerCase().includes('allocation')) {
    return 'Asset allocation balance affects portfolio risk and return characteristics.';
  }
  
  if (category.includes('sector') || reason.toLowerCase().includes('sector')) {
    return 'Sector concentration increases exposure to sector-specific risks.';
  }
  
  if (category.includes('market_cap') || reason.toLowerCase().includes('market cap')) {
    return 'Market cap mix influences portfolio volatility and return potential.';
  }
  
  if (category.includes('geography') || reason.toLowerCase().includes('geography')) {
    return 'Geographic diversification helps reduce country-specific risks.';
  }
  
  if (category.includes('quality') || reason.toLowerCase().includes('quality')) {
    return 'Investment quality affects long-term performance and risk characteristics.';
  }
  
  // Default explanation
  return 'This factor influences portfolio risk and return characteristics.';
}

/**
 * Generate "Why this matters" explanation for stability observations
 */
export function getStabilityObservationExplanation(insight: string): string {
  const lowerInsight = insight.toLowerCase();
  
  if (lowerInsight.includes('stability-oriented') || lowerInsight.includes('capital')) {
    return 'Stability-oriented assets help preserve wealth during market volatility.';
  }
  
  if (lowerInsight.includes('market-linked') || lowerInsight.includes('market linked')) {
    return 'Market-linked assets provide growth potential but increase volatility.';
  }
  
  if (lowerInsight.includes('credit risk') || lowerInsight.includes('credit')) {
    return 'Credit risk affects the safety of debt investments and potential returns.';
  }
  
  if (lowerInsight.includes('retirement') || lowerInsight.includes('tax')) {
    return 'Retirement allocation provides tax efficiency and long-term stability.';
  }
  
  if (lowerInsight.includes('liquidity') || lowerInsight.includes('liquid')) {
    return 'Liquidity affects your ability to access funds when needed.';
  }
  
  // Default explanation
  return 'This factor influences portfolio stability and risk characteristics.';
}
