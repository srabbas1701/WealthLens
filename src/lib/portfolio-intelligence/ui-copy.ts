/**
 * Portfolio Intelligence UI Copy
 * 
 * COMPLIANCE & COPY GUIDELINES
 * 
 * Rules:
 * - ❌ Never say: Buy / Sell / Exit / Invest
 * - ✅ Use: Consider, Review, Monitor, Rebalance, Optimize
 * - Always add "For insight only" where needed
 * - Tone: Informative, neutral, reassuring
 */

export const HEALTH_SCORE_COPY = {
  title: 'Portfolio Health Score',
  description: 'This score reflects how balanced, diversified, stable, and resilient your overall portfolio is — across market and non-market investments.',
  subline: 'Based on current holdings. For portfolio insight only.',
  
  grades: {
    excellent: {
      label: 'Excellent',
      range: '80–100',
      color: 'green',
      insight: 'Your portfolio is well-diversified with healthy stability and manageable risk.',
    },
    good: {
      label: 'Good',
      range: '65–79',
      color: 'blue',
      insight: 'Your portfolio is generally healthy, with a few areas that can be optimized.',
    },
    fair: {
      label: 'Fair',
      range: '50–64',
      color: 'amber',
      insight: 'Your portfolio shows moderate risk concentration and could benefit from better balance.',
    },
    poor: {
      label: 'Needs Attention',
      range: '<50',
      color: 'red',
      insight: 'Your portfolio has elevated risk and structural imbalances that need review.',
    },
  },
  
  pillars: {
    asset_allocation: {
      tooltip: 'Measures how closely your asset mix aligns with a balanced risk profile.',
      insights: {
        excellent: 'Your equity–debt balance is within a healthy range.',
        good: 'Your allocation is slightly tilted but remains manageable.',
        fair: 'Your portfolio is skewed toward higher volatility assets.',
        poor: 'Your allocation is significantly imbalanced, increasing risk.',
      },
    },
    concentration_risk: {
      tooltip: 'Checks over-dependence on a single stock, sector, or asset type.',
      insights: {
        excellent: 'No major concentration risks detected.',
        good: 'Some exposure concentration exists but remains controlled.',
        fair: 'High concentration in specific areas increases downside risk.',
        poor: 'Severe concentration may amplify losses during market stress.',
      },
    },
    diversification_overlap: {
      tooltip: 'Identifies overlap across mutual funds and redundancy in holdings.',
      insights: {
        excellent: 'Your investments are well diversified with minimal overlap.',
        good: 'Some overlap exists but does not significantly reduce diversification.',
        fair: 'Multiple funds invest in similar stocks, limiting diversification.',
        poor: 'High redundancy detected — diversification benefits are reduced.',
      },
    },
    market_cap_balance: {
      tooltip: 'Assesses exposure across large, mid, and small cap stocks.',
      insights: {
        excellent: 'Market cap exposure is well balanced.',
        good: 'Your portfolio slightly favors certain market caps.',
        fair: 'Exposure to higher volatility market caps is elevated.',
        poor: 'Market cap imbalance may lead to unstable returns.',
      },
    },
    sector_balance: {
      tooltip: 'Measures dependence on specific sectors.',
      insights: {
        excellent: 'Sector exposure is evenly spread.',
        good: 'Some sectors have higher weight but remain acceptable.',
        fair: 'Sector concentration may increase cyclical risk.',
        poor: 'Heavy sector dependence increases vulnerability.',
      },
    },
    geography_balance: {
      tooltip: 'Tracks domestic vs international exposure.',
      insights: {
        excellent: 'Your portfolio benefits from geographic diversification.',
        good: 'International exposure exists but is limited.',
        fair: 'Portfolio is heavily dependent on domestic markets.',
        poor: 'Lack of global exposure may increase country-specific risk.',
      },
    },
    investment_quality: {
      tooltip: 'Evaluates consistency, financial strength, and downside behavior.',
      insights: {
        excellent: 'Majority of holdings show strong quality signals.',
        good: 'Most investments show stable long-term characteristics.',
        fair: 'Some holdings show inconsistent performance patterns.',
        poor: 'Multiple investments fall in the low-quality zone.',
      },
    },
  },
};

export const EXPOSURE_COPY = {
  ownershipVsExposure: {
    header: 'Ownership vs Exposure',
    description: 'This view shows what you own directly versus what you are exposed to through underlying investments.',
    infoCallout: 'Exposure reflects underlying asset allocation, not ownership value.',
    insightExamples: {
      mfExposure: 'Although you own ₹{mfValue} in mutual funds, your actual equity exposure is ₹{equityExposure}.',
      combinedExposure: 'Your total equity exposure is higher than it appears from direct holdings alone.',
    },
  },
  
  mfExposure: {
    sectionTitle: 'What Your Mutual Funds Are Invested In',
    labels: {
      equity: 'Major portion of your mutual fund value is linked to equity markets.',
      debt: 'A portion of your mutual funds provides income stability.',
      cash: 'Small allocation helps with liquidity and rebalancing.',
    },
    overlap: {
      excellent: 'Minimal overlap across funds.',
      good: 'Some funds invest in similar stocks.',
      fair: 'High overlap detected — diversification benefit is limited.',
    },
    styleDrift: {
      note: "This fund's actual holdings differ from its stated category.",
      example: 'Large-cap labeled funds with significant mid/small exposure increase volatility.',
    },
  },
  
  sectorExposure: {
    header: 'Sector Exposure (Direct + Mutual Funds)',
    benchmarkNote: 'Compared against broad market benchmarks.',
    concentrationAlerts: {
      high: {
        label: 'High Sector Exposure',
        message: 'This sector exceeds recommended diversification limits.',
      },
      near: {
        label: 'Near Threshold',
        message: 'Sector exposure is approaching concentration limits.',
      },
    },
    footer: 'High sector exposure can increase portfolio volatility during sector downturns.',
  },
  
  marketCapExposure: {
    header: 'Market Capitalization Exposure',
    riskProfiles: {
      largeCap: {
        label: 'Large Cap Dominant',
        description: 'Lower volatility, relatively stable returns.',
      },
      midCap: {
        label: 'Mid Cap Tilt',
        description: 'Moderate volatility with higher growth potential.',
      },
      smallCap: {
        label: 'Small Cap Exposure',
        description: 'Higher volatility and return variability.',
      },
    },
    footer: 'Market cap mix influences portfolio volatility more than returns.',
  },
  
  geographyExposure: {
    header: 'Geographic Exposure',
    insights: {
      excellent: 'Your portfolio benefits from international diversification.',
      good: 'Limited international exposure reduces currency diversification.',
      fair: 'Portfolio is almost entirely dependent on domestic markets.',
    },
    sourceNote: 'International exposure typically comes via mutual funds and ETFs.',
  },
};

export const STABILITY_COPY = {
  header: 'Stability & Capital Protection',
  insights: {
    excellent: 'A significant portion of your wealth is in stability-oriented assets.',
    good: 'Stable assets provide downside resilience.',
    fair: 'Portfolio relies heavily on market-linked assets.',
  },
  explanation: 'Stability-oriented assets (FDs, PPF, EPF) help preserve wealth during market stress. Policy-backed instruments like NPS are subject to policy changes and market conditions.',
  stabilityOrientedTooltip: 'Stability-oriented assets include FDs (bank-guaranteed), PPF/EPF (government-backed), and policy-backed instruments like NPS. Note: Policy-backed instruments are not guaranteed and subject to policy changes and market conditions.',
  creditRisk: {
    low: 'Credit risk exposure is minimal and well-managed.',
    medium: 'Some credit risk exists but remains acceptable.',
    high: 'Review credit risk exposure in bonds.',
  },
  retirement: {
    good: 'Your retirement allocation provides tax efficiency and stability.',
    low: 'Review retirement allocation for tax efficiency.',
  },
};

export const LIQUIDITY_COPY = {
  header: 'Liquidity & Accessibility',
  status: {
    excellent: 'You have sufficient liquid assets for short-term needs.',
    good: 'Liquidity is adequate but limited.',
    fair: 'Most of your wealth is locked for the long term.',
  },
  emergencyFund: 'Your liquid assets can cover approximately {months} months of expenses.',
  lockedWealth: {
    note: 'Locked assets provide stability but limit short-term access.',
    recommendation: 'Maintain a balance between locked and liquid assets.',
  },
};

export const OVERLAP_COPY = {
  header: 'Portfolio Simplification Insights',
  messages: {
    excellent: 'Your portfolio is lean and efficient.',
    good: 'Some investments serve similar purposes.',
    fair: 'Multiple holdings duplicate exposure.',
  },
  nudge: 'Portfolio simplicity often improves clarity without reducing diversification.',
  disclaimer: 'Review overlap for insights only — not a recommendation to change holdings.',
};

export const QUALITY_COPY = {
  header: 'Investment Quality Scanner',
  categories: {
    high: {
      label: 'High Quality',
      description: 'Strong fundamentals and consistent behavior.',
    },
    monitor: {
      label: 'Monitor',
      description: 'Shows mixed signals. Worth tracking.',
    },
    warning: {
      label: 'Warning',
      description: 'Displays persistent weakness or inconsistency.',
    },
  },
  footer: 'Quality signals focus on long-term characteristics, not short-term performance.',
};

export const SCENARIO_COPY = {
  header: 'Scenario Impact Analysis',
  description: 'Illustrates how your portfolio may behave under different market conditions.',
  scenarios: {
    marketDecline: 'If markets decline by {percent}%, your portfolio may decline approximately {impact}%.',
    sectorStress: 'Sector-specific stress could impact your portfolio unevenly.',
    rateShock: 'Interest rate changes may affect debt and bond holdings.',
  },
  disclaimer: 'Scenarios are hypothetical and for risk understanding only.',
};

export const TRUST_STATEMENT = 
  'WealthLens analytics are designed to help you understand and evaluate your portfolio structure. They do not constitute investment advice.';

/**
 * Get pillar insight based on score
 */
export function getPillarInsight(pillarName: keyof typeof HEALTH_SCORE_COPY.pillars, score: number): string {
  const pillar = HEALTH_SCORE_COPY.pillars[pillarName];
  if (!pillar) return '';
  
  if (score >= 80) return pillar.insights.excellent;
  if (score >= 65) return pillar.insights.good;
  if (score >= 50) return pillar.insights.fair;
  return pillar.insights.poor;
}

/**
 * Get grade info from score
 */
export function getGradeInfo(score: number): {
  label: string;
  range: string;
  color: string;
  insight: string;
} {
  if (score >= 80) return HEALTH_SCORE_COPY.grades.excellent;
  if (score >= 65) return HEALTH_SCORE_COPY.grades.good;
  if (score >= 50) return HEALTH_SCORE_COPY.grades.fair;
  return HEALTH_SCORE_COPY.grades.poor;
}