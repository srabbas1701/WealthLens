/**
 * Analytics Copy Constants
 * 
 * CENTRALIZED COPY SYSTEM
 * All analytics UI text must come from here.
 * No hardcoded strings in components.
 */

import { HEALTH_SCORE_COPY, EXPOSURE_COPY, STABILITY_COPY, LIQUIDITY_COPY, OVERLAP_COPY, QUALITY_COPY, SCENARIO_COPY, TRUST_STATEMENT } from '@/lib/portfolio-intelligence/ui-copy';

// Re-export from portfolio-intelligence for convenience
export {
  HEALTH_SCORE_COPY,
  EXPOSURE_COPY,
  STABILITY_COPY,
  LIQUIDITY_COPY,
  OVERLAP_COPY,
  QUALITY_COPY,
  SCENARIO_COPY,
  TRUST_STATEMENT,
};

/**
 * Common Analytics Disclaimers
 */
export const COMMON_DISCLAIMERS = {
  insightOnly: 'For portfolio insight only.',
  notAdvice: 'WealthLens analytics are designed to help you understand and evaluate your portfolio structure. They do not constitute investment advice.',
  basedOnHoldings: 'Based on current holdings.',
  referenceOnly: 'For reference only. Dashboard values remain unchanged.',
  hypothetical: 'Scenarios are hypothetical and for risk understanding only.',
};

/**
 * Page Titles
 */
export const PAGE_TITLES = {
  healthScore: 'Portfolio Health Score',
  stabilityAnalytics: 'Stability & Capital Protection',
  liquidityAnalytics: 'Liquidity & Accessibility',
  analyticsOverview: 'Portfolio Analytics',
};

/**
 * Section Headers
 */
export const SECTION_HEADERS = {
  summary: 'Summary',
  focusAreas: 'What to Focus On First',
  pillarBreakdown: 'Health Breakdown',
  topRisks: 'Key Risks',
  improvements: 'Improvement Opportunities',
  stabilityOverview: 'Stability Overview',
  liquidityBreakdown: 'Liquidity Breakdown',
  emergencyFund: 'Emergency Fund Adequacy',
  keyObservations: 'Key Observations',
};

/**
 * Empty State Messages
 */
export const EMPTY_STATES = {
  noData: 'No data available',
  noHoldings: 'Add holdings to analyze portfolio health',
  loading: 'Loading analytics...',
  error: 'Failed to load analytics',
};

/**
 * Button Labels
 */
export const BUTTON_LABELS = {
  backToDashboard: 'Back to Dashboard',
  backToAnalytics: 'Back to Analytics',
  learnMore: 'Learn More',
  viewDetails: 'View Details',
  skip: 'Skip',
  next: 'Next',
  finish: 'Finish',
};