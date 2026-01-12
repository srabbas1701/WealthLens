/**
 * Stability Insights Enhancement
 * 
 * Adds impact scoring and explanations to stability insights
 */

import type { StabilityAnalysis } from './stability-analytics';
import { getStabilityObservationExplanation } from './risk-explanations';

export interface EnhancedStabilityInsight {
  text: string;
  explanation: string;
  impact: number; // 0-100, higher = more important
  category: string;
}

/**
 * Enhance stability insights with explanations and impact scores
 */
export function enhanceStabilityInsights(stabilityData: StabilityAnalysis): EnhancedStabilityInsight[] {
  const { metrics, creditRisk, retirement, insights } = stabilityData;
  
  return insights.map(insight => {
    const lowerInsight = insight.toLowerCase();
    let impact = 50; // Default impact
    let category = 'general';
    
    // Calculate impact based on metrics and insight type
    if (lowerInsight.includes('stability-oriented') || lowerInsight.includes('capital')) {
      category = 'stability';
      // Higher impact if percentage is very low or very high
      const pct = metrics.capitalProtected.percentage;
      impact = pct < 10 ? 85 : pct < 20 ? 70 : 50;
    } else if (lowerInsight.includes('market-linked')) {
      category = 'volatility';
      const pct = metrics.marketLinked.percentage;
      impact = pct > 80 ? 80 : pct > 60 ? 60 : 50;
    } else if (lowerInsight.includes('credit risk')) {
      category = 'credit';
      impact = creditRisk.riskLevel === 'High' ? 85 : creditRisk.riskLevel === 'Medium' ? 65 : 50;
    } else if (lowerInsight.includes('retirement') || lowerInsight.includes('tax')) {
      category = 'tax_efficiency';
      const pct = retirement.percentage;
      impact = pct < 5 ? 75 : pct < 10 ? 65 : 50;
    } else if (lowerInsight.includes('stability score')) {
      category = 'overall';
      const score = metrics.stabilityScore;
      impact = score < 30 ? 90 : score < 50 ? 70 : 60;
    }
    
    return {
      text: insight,
      explanation: getStabilityObservationExplanation(insight),
      impact,
      category,
    };
  });
}
