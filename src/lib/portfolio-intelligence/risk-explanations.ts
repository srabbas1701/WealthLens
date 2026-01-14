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
    return 'High concentration means a larger portion of your portfolio depends on fewer assets, increasing vulnerability to their individual performance.';
  }
  
  if (category.includes('diversification') || reason.toLowerCase().includes('overlap')) {
    return 'Overlap means multiple investments hold similar assets, which reduces diversification benefits and may increase correlated risk during market movements.';
  }
  
  if (category.includes('allocation') || reason.toLowerCase().includes('allocation')) {
    return 'Asset allocation balance determines how your portfolio is distributed across different asset types, which directly affects risk and return characteristics.';
  }
  
  if (category.includes('sector') || reason.toLowerCase().includes('sector')) {
    return 'Sector concentration means a larger portion of your portfolio is exposed to specific industries, increasing vulnerability to sector-specific market movements.';
  }
  
  if (category.includes('market_cap') || reason.toLowerCase().includes('market cap')) {
    return 'Market cap mix determines your exposure to large, mid, and small companies, which influences portfolio volatility and return potential.';
  }
  
  if (category.includes('geography') || reason.toLowerCase().includes('geography')) {
    return 'Geographic diversification helps reduce country-specific risks by spreading exposure across different markets and economies.';
  }
  
  if (category.includes('quality') || reason.toLowerCase().includes('quality')) {
    return 'Investment quality reflects the financial strength and consistency of holdings, which affects long-term performance and risk characteristics.';
  }
  
  // Default explanation
  return 'This factor influences how your portfolio responds to market conditions and affects overall risk and return characteristics.';
}

/**
 * Generate "Why this matters" explanation for stability observations
 */
export function getStabilityObservationExplanation(insight: string): string {
  const lowerInsight = insight.toLowerCase();
  
  if (lowerInsight.includes('stability-oriented') || lowerInsight.includes('capital')) {
    return 'Stability-oriented assets typically reduce portfolio volatility during market stress, though returns may vary based on market conditions and policy changes.';
  }
  
  if (lowerInsight.includes('market-linked') || lowerInsight.includes('market linked')) {
    return 'Market-linked assets provide growth potential but their value fluctuates with market conditions, increasing portfolio volatility.';
  }
  
  if (lowerInsight.includes('credit risk') || lowerInsight.includes('credit')) {
    return 'Credit risk reflects the possibility that debt issuers may default, which affects the safety of debt investments and potential returns.';
  }
  
  if (lowerInsight.includes('retirement') || lowerInsight.includes('tax')) {
    return 'Retirement allocation through instruments like EPF, PPF, and NPS provides tax efficiency and long-term stability, though returns are subject to policy changes and market conditions.';
  }
  
  if (lowerInsight.includes('liquidity') || lowerInsight.includes('liquid')) {
    return 'Liquidity determines how quickly you can access funds when needed, which affects financial flexibility and emergency preparedness.';
  }
  
  // Default explanation
  return 'This factor influences portfolio stability and how your portfolio responds to different market conditions.';
}
