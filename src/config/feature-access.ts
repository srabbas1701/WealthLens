/**
 * Feature Access Configuration
 *
 * Central mapping of features to capability keys and upgrade metadata.
 * Use FEATURE_ACCESS.<FEATURE>.capability instead of hardcoding CAPABILITY_KEYS.
 * LockedFeaturePage reads title, tagline, valueProps, upgradePlan for conversion-focused layout.
 */

export type UpgradePlan = 'Pro' | 'Premium';

export interface FeatureAccessConfig {
  /** Capability key (must match database capabilities table) */
  capability: string;
  /** Plan required to unlock this feature */
  upgradePlan: UpgradePlan;
  /** Outcome-based title for LockedFeaturePage */
  title: string;
  /** Supporting tagline */
  tagline: string;
  /** Value propositions shown in grid */
  valueProps: string[];
}

export const FEATURE_ACCESS = {
  ANALYTICS_HEALTH: {
    capability: 'view_advanced_analytics',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'Unlock your portfolio\'s full potential',
    tagline: 'Get actionable insights on sector exposure, health scores, and scenario analysis.',
    valueProps: [
      '7-pillar Portfolio Health Score',
      'Sector, geography & market cap exposure',
      'Scenario impact & drawdown analysis',
      'Stability & capital-protected breakdown',
    ],
  },
  ANALYTICS_SCENARIOS: {
    capability: 'run_scenarios',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'See how your portfolio handles stress',
    tagline: 'Run drawdown, rate shock, and sector shock scenarios.',
    valueProps: [
      'Market drawdown simulation',
      'Rate shock & sector shock scenarios',
      'Market recovery projections',
      'Risk-adjusted insights',
    ],
  },
  REAL_ESTATE: {
    capability: 'manage_real_assets',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'Track your property wealth in one place',
    tagline: 'See real estate value, rents, loans, and cash flows together.',
    valueProps: [
      'Property valuations & current value',
      'Rental income & expense tracking',
      'Loan and EMI management',
      'Net worth with real assets',
    ],
  },
  INSURANCE: {
    capability: 'manage_insurance',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'Protect your family with clarity',
    tagline: 'Track policies, coverage, and renewal dates in one dashboard.',
    valueProps: [
      'Life, health & other policies',
      'Coverage summaries & renewal alerts',
      'Protection gap analysis',
      'Family security overview',
    ],
  },
  LIABILITIES: {
    capability: 'manage_liabilities',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'Take control of your loans and debt',
    tagline: 'See net worth outlook and prepayment impact at a glance.',
    valueProps: [
      'Loans, EMIs & credit card tracking',
      'Net worth outlook & projections',
      'Prepayment impact calculator',
      'Debt-free timeline planning',
    ],
  },
  DOWNLOAD: {
    capability: 'download_reports',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'Export your portfolio data',
    tagline: 'Download reports when you need them.',
    valueProps: ['Excel & CSV exports', 'Portfolio snapshots', 'Tax-ready summaries'],
  },
  AI_HELP: {
    capability: 'use_ai_help',
    upgradePlan: 'Pro' as UpgradePlan,
    title: 'Get AI-powered portfolio insights',
    tagline: 'Ask questions and get answers about your portfolio.',
    valueProps: ['Natural language queries', 'Portfolio analysis', 'Actionable recommendations'],
  },
  ANALYST_VIEW: {
    capability: 'view_premium_analytics',
    upgradePlan: 'Premium' as UpgradePlan,
    title: 'See what analysts say about your stocks',
    tagline: 'Get Buy/Hold/Sell consensus and target prices from market analysts.',
    valueProps: [
      'Analyst Buy/Hold/Sell consensus',
      'Target price range (high, mean, low)',
      'Number of analyst opinions',
      'Highlighted on loss-making positions',
    ],
  },
} as const;

export type FeatureAccessKey = keyof typeof FEATURE_ACCESS;
