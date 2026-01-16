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
      insight: 'Your portfolio demonstrates strong diversification, balanced allocation, and manageable risk characteristics.',
    },
    good: {
      label: 'Good',
      range: '65–79',
      color: 'blue',
      insight: 'Your portfolio shows healthy structure overall, with specific areas that may benefit from review and optimization.',
    },
    fair: {
      label: 'Fair',
      range: '50–64',
      color: 'amber',
      insight: 'Your portfolio shows moderate risk concentration and structural imbalances that may benefit from review.',
    },
    poor: {
      label: 'Needs Attention',
      range: '<50',
      color: 'red',
      insight: 'Your portfolio shows elevated risk concentration and structural imbalances that warrant review.',
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
      tooltip: 'Measures over-dependence on a single stock, sector, or asset type that may increase portfolio vulnerability.',
      insights: {
        excellent: 'No significant concentration risks detected across holdings.',
        good: 'Some exposure concentration exists but remains within manageable limits.',
        fair: 'High concentration in specific areas may increase portfolio vulnerability to those assets.',
        poor: 'Significant concentration detected, which may amplify portfolio impact from individual asset performance.',
      },
    },
    diversification_overlap: {
      tooltip: 'Identifies overlap across mutual funds and redundancy in holdings that may reduce diversification benefits.',
      insights: {
        excellent: 'Your investments are well diversified with minimal overlap across funds.',
        good: 'Some overlap exists but does not significantly reduce overall diversification benefits.',
        fair: 'Multiple funds invest in similar stocks, which may limit diversification benefits.',
        poor: 'High redundancy detected across holdings, which may reduce diversification benefits.',
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
      tooltip: 'Measures dependence on specific sectors, which may increase exposure to sector-specific risks.',
      insights: {
        excellent: 'Sector exposure is well distributed across multiple sectors.',
        good: 'Some sectors have higher weight but remain within acceptable diversification limits.',
        fair: 'Sector concentration may increase exposure to sector-specific cyclical risks.',
        poor: 'Heavy sector dependence increases vulnerability to sector-specific market movements.',
      },
    },
    geography_balance: {
      tooltip: 'Tracks domestic vs international exposure to assess geographic diversification.',
      insights: {
        excellent: 'Your portfolio benefits from geographic diversification across domestic and international markets.',
        good: 'International exposure exists but is limited, reducing some diversification benefits.',
        fair: 'Portfolio is heavily dependent on domestic markets, which may increase country-specific risk exposure.',
        poor: 'Lack of global exposure may increase vulnerability to country-specific market movements.',
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
    benchmarkNote: 'Compared against NIFTY 500 benchmark.',
    benchmarkLabel: 'NIFTY 500',
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
    sectorClassifications: {
      defensive: {
        label: 'Defensive',
        description: 'Sectors that typically perform relatively stable during market stress (e.g., FMCG, Pharma, Utilities).',
      },
      cyclical: {
        label: 'Cyclical',
        description: 'Sectors sensitive to economic cycles (e.g., Banking, Auto, Real Estate).',
      },
      growth: {
        label: 'Growth',
        description: 'Sectors with high growth potential but higher volatility (e.g., Technology, Consumer Discretionary).',
      },
    },
    impactLevels: {
      low: 'Low impact on portfolio volatility',
      medium: 'Moderate impact on portfolio volatility',
      high: 'High impact on portfolio volatility',
    },
    focusSection: {
      title: 'Sector Focus',
      description: 'Key insights about your sector allocation and its implications.',
    },
  },
  
  marketCapExposure: {
    header: 'Market Capitalization Exposure',
    benchmarkNote: 'Compared against market benchmark allocation.',
    benchmarkLabel: 'Market Average',
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
    volatilityBands: {
      low: 'Lower volatility range',
      medium: 'Moderate volatility range',
      high: 'Higher volatility range',
    },
    timeHorizonNote: 'Market cap allocation considerations vary based on investment time horizon and risk tolerance.',
    focusSection: {
      title: 'Market Cap Focus',
      description: 'Understanding your market cap mix and its implications for portfolio behavior.',
    },
  },
  
  geographyExposure: {
    header: 'Geographic Exposure',
    benchmarkNote: 'Compared against recommended diversification benchmarks.',
    benchmarkLabel: 'Diversification Benchmark',
    insights: {
      excellent: 'Your portfolio benefits from international diversification.',
      good: 'Limited international exposure reduces currency diversification.',
      fair: 'Portfolio is almost entirely dependent on domestic markets.',
    },
    sourceNote: 'International exposure typically comes via mutual funds and ETFs.',
    currencyDiversification: {
      title: 'Currency Diversification',
      description: 'International exposure provides currency diversification, which may reduce country-specific currency risk.',
    },
    correlationReduction: {
      title: 'Correlation Reduction',
      description: 'Geographic diversification helps reduce portfolio correlation, as different markets may respond differently to global events.',
    },
    globalSectorAccess: {
      title: 'Global Sector Access',
      description: 'International exposure provides access to sectors and companies not available in domestic markets.',
    },
    focusSection: {
      title: 'Geographic Focus',
      description: 'Key insights about your geographic allocation and its diversification benefits.',
    },
  },
};

export const STABILITY_COPY = {
  header: 'Stability & Downside Protection',
  insights: {
    excellent: 'A significant portion of your wealth is in stability-oriented assets, which typically reduce portfolio volatility during market stress.',
    good: 'Stability-oriented assets provide downside resilience, though returns may vary based on market conditions.',
    fair: 'Portfolio relies heavily on market-linked assets, which may experience higher volatility.',
  },
  explanation: 'Stability-oriented assets (FDs, PPF, EPF) help reduce portfolio volatility during market stress, though returns may vary. Policy-backed instruments like NPS are long-term retirement savings vehicles subject to policy changes and market conditions.',
  stabilityOrientedTooltip: 'Stability-oriented assets include FDs (bank-guaranteed up to deposit insurance limits), PPF/EPF (government-backed long-term savings), and policy-backed instruments like NPS (long-term retirement savings subject to policy changes). These assets typically reduce portfolio volatility, though returns are not guaranteed and may vary based on market conditions and policy changes.',
  creditRisk: {
    low: 'Credit risk exposure is minimal and well-managed across debt instruments.',
    medium: 'Some credit risk exists in debt holdings but remains within acceptable limits.',
    high: 'Review credit risk exposure in bonds and debt instruments to understand potential impact.',
  },
  retirement: {
    good: 'Your retirement allocation provides tax efficiency and long-term stability through policy-backed instruments.',
    low: 'Review retirement allocation to understand potential tax efficiency benefits from long-term instruments like EPF, PPF, and NPS.',
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
  description: 'Explore how your portfolio structure may respond to different hypothetical market conditions. These scenarios are educational and help you understand risk characteristics.',
  disclaimer: 'All scenarios are hypothetical and for educational purposes only. They illustrate potential portfolio behavior based on current exposure and are not predictions of future performance.',
  
  scenarios: {
    marketDrawdown: {
      title: 'Market Drawdown Scenario',
      description: 'Illustrates portfolio impact if equity markets decline.',
      percent: -20,
      explanation: {
        what: 'In a market decline scenario, market-linked assets (equity, equity mutual funds) typically experience value changes, while stability-oriented assets provide cushioning.',
        why: 'Your portfolio has {marketLinkedPct}% in market-linked assets, which means {marketLinkedPct}% of your portfolio value is exposed to equity market movements.',
        meaning: 'Stability-oriented assets ({stabilityPct}%) provide downside protection during market stress, reducing overall portfolio impact compared to a fully equity portfolio.',
      },
    },
    sectorShock: {
      title: 'Sector Shock Scenario',
      description: 'Shows impact if your largest sector exposure underperforms.',
      explanation: {
        what: 'Sector-specific shocks occur when a particular industry faces challenges, affecting companies within that sector.',
        why: 'Your largest sector exposure is {sector} at {pct}%, meaning a significant portion of your portfolio is linked to this sector\'s performance.',
        meaning: 'High sector concentration increases vulnerability to sector-specific risks, while diversified portfolios are less affected by individual sector movements.',
      },
    },
    rateShock: {
      title: 'Interest Rate Shock Scenario',
      description: 'Explains how interest rate changes may affect different asset types.',
      explanation: {
        what: 'Interest rate changes can affect both market-linked assets (through valuation) and stability-oriented assets (through returns).',
        why: 'Market-linked assets may experience volatility due to changing valuations, while stability-oriented assets like FDs may see return adjustments but maintain principal stability.',
        meaning: 'A balanced portfolio with both market-linked and stability-oriented assets may experience moderate volatility during rate changes compared to a single-asset-type portfolio.',
      },
    },
    marketRecovery: {
      title: 'Market Recovery Scenario',
      description: 'Illustrates participation in long-term market recovery.',
      explanation: {
        what: 'During market recovery, equity markets typically see value appreciation, benefiting market-linked portfolios.',
        why: 'Your {equityPct}% equity exposure means your portfolio would participate in market recovery, while stability-oriented assets provide stability but lower participation.',
        meaning: 'A portfolio with equity exposure participates in long-term market growth, while stability-oriented assets preserve capital but may have lower growth participation.',
      },
    },
  },
  
  sections: {
    whatHappens: 'What Happens',
    whyThisHappens: 'Why This Happens',
    whatThisMeans: 'What This Means',
  },
};

export const TRUST_STATEMENT = 
  'LensOnWealth analytics are designed to help you understand and evaluate your portfolio structure. They do not constitute investment advice.';

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