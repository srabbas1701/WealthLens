/**
 * Score Explanation Generator
 * 
 * Generates human-readable explanations for portfolio scores
 * based on API data. Neutral, educational language only.
 */

import type { PortfolioHealthScore } from './health-score';
import type { StabilityAnalysis } from './stability-analytics';

/**
 * Generate explanation for Portfolio Health Score
 */
export function generateHealthScoreExplanation(healthScore: PortfolioHealthScore): {
  summary: string;
  positiveFactors: string[];
  areasForAttention: string[];
} {
  const { totalScore, pillarBreakdown, topRisks } = healthScore;
  
  const positiveFactors: string[] = [];
  const areasForAttention: string[] = [];
  
  // Analyze pillar scores to identify strengths and weaknesses
  pillarBreakdown.forEach(pillar => {
    if (pillar.score >= 75) {
      // Strong pillar - positive factor
      positiveFactors.push(`${pillar.displayName} is strong (${pillar.score}/100)`);
    } else if (pillar.score < 60) {
      // Weak pillar - area for attention
      const mainDeduction = pillar.deductions.find(d => d.impact > 10);
      if (mainDeduction) {
        areasForAttention.push(mainDeduction.reason);
      } else {
        areasForAttention.push(`${pillar.displayName} could be improved (${pillar.score}/100)`);
      }
    }
  });
  
  // Generate summary based on score
  let summary = '';
  if (totalScore >= 80) {
    summary = `Your portfolio health score of ${totalScore} reflects a well-balanced portfolio. `;
    if (positiveFactors.length > 0) {
      summary += `Strong performance across ${positiveFactors.length} key area${positiveFactors.length > 1 ? 's' : ''} contributes to this score.`;
    }
  } else if (totalScore >= 65) {
    summary = `Your portfolio health score of ${totalScore} indicates a generally healthy portfolio structure. `;
    if (positiveFactors.length > 0 && areasForAttention.length > 0) {
      summary += `While ${positiveFactors.length} area${positiveFactors.length > 1 ? 's show' : ' shows'} strength, ${areasForAttention.length} area${areasForAttention.length > 1 ? 's may benefit' : ' may benefit'} from review.`;
    }
  } else if (totalScore >= 50) {
    summary = `Your portfolio health score of ${totalScore} shows moderate risk and balance. `;
    if (areasForAttention.length > 0) {
      summary += `${areasForAttention.length} key area${areasForAttention.length > 1 ? 's have' : ' has'} been identified for review.`;
    }
  } else {
    summary = `Your portfolio health score of ${totalScore} indicates areas that may benefit from review. `;
    if (areasForAttention.length > 0) {
      summary += `${areasForAttention.length} key factor${areasForAttention.length > 1 ? 's contribute' : ' contributes'} to this score.`;
    }
  }
  
  return {
    summary,
    positiveFactors: positiveFactors.slice(0, 3), // Max 3 positive factors
    areasForAttention: areasForAttention.slice(0, 3), // Max 3 areas for attention
  };
}

/**
 * Generate explanation for Stability Score
 */
export function generateStabilityScoreExplanation(stabilityData: StabilityAnalysis): {
  summary: string;
  contributingFactors: string[];
  considerations: string[];
} {
  const { metrics, creditRisk, retirement } = stabilityData;
  const { stabilityScore, capitalProtected, marketLinked } = metrics;
  
  const contributingFactors: string[] = [];
  const considerations: string[] = [];
  
  // Analyze stability metrics
  if (capitalProtected.percentage >= 30) {
    contributingFactors.push(`${capitalProtected.percentage.toFixed(0)}% in stability-oriented assets provides downside resilience`);
  } else if (capitalProtected.percentage < 20) {
    considerations.push(`Portfolio has ${capitalProtected.percentage.toFixed(0)}% in stability-oriented assets (lower stability contribution)`);
  }
  
  if (marketLinked.percentage >= 70) {
    considerations.push(`High market-linked exposure (${marketLinked.percentage.toFixed(0)}%) increases volatility`);
  } else if (marketLinked.percentage < 50) {
    contributingFactors.push(`Moderate market-linked exposure (${marketLinked.percentage.toFixed(0)}%) balances growth and stability`);
  }
  
  // Credit risk analysis
  if (creditRisk.totalExposure > 0) {
    if (creditRisk.riskLevel === 'Low') {
      contributingFactors.push('Credit risk exposure is well-managed');
    } else if (creditRisk.riskLevel === 'High') {
      considerations.push('Elevated credit risk exposure in debt instruments');
    }
  }
  
  // Retirement contribution
  if (retirement.totalValue > 0 && retirement.percentage >= 15) {
    contributingFactors.push(`Significant retirement allocation (${retirement.percentage.toFixed(0)}%) provides tax efficiency and stability`);
  } else if (retirement.percentage < 10 && stabilityData.metadata.totalPortfolioValue > 1000000) {
    considerations.push('Limited retirement allocation may reduce tax efficiency');
  }
  
  // Generate summary
  let summary = '';
  if (stabilityScore >= 60) {
    summary = `Your stability score of ${stabilityScore} reflects a portfolio with strong stability characteristics. `;
    if (contributingFactors.length > 0) {
      summary += `${contributingFactors.length} key factor${contributingFactors.length > 1 ? 's contribute' : ' contributes'} to this score.`;
    }
  } else if (stabilityScore >= 40) {
    summary = `Your stability score of ${stabilityScore} indicates moderate portfolio stability. `;
    if (contributingFactors.length > 0 && considerations.length > 0) {
      summary += `While ${contributingFactors.length} factor${contributingFactors.length > 1 ? 's support' : ' supports'} stability, ${considerations.length} consideration${considerations.length > 1 ? 's' : ''} ${considerations.length > 1 ? 'have' : 'has'} been identified.`;
    }
  } else {
    summary = `Your stability score of ${stabilityScore} reflects a portfolio that is primarily market-linked. `;
    if (considerations.length > 0) {
      summary += `${considerations.length} key factor${considerations.length > 1 ? 's contribute' : ' contributes'} to this assessment.`;
    }
  }
  
  return {
    summary,
    contributingFactors: contributingFactors.slice(0, 3), // Max 3 factors
    considerations: considerations.slice(0, 3), // Max 3 considerations
  };
}