/**
 * Central paywall copy. All locked actions must use ShowPaywall(reason, capability);
 * no inline hardcoded messages.
 */

import type { CapabilityKey } from '@/types/capabilities';

export type PaywallReason =
  | 'feature_locked'
  | 'download_locked'
  | 'limit_reached'
  | 'insights_limit'
  | 'trial_exceeded';

export interface PaywallCopy {
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
}

const CAPABILITY_LABELS: Record<string, string> = {
  use_ai_help: 'AI Portfolio Analyst',
  analyst_queries: 'Analyst Queries',
  unlimited_analyst: 'Unlimited Analyst',
  pdf_reports: 'Download Holdings (PDF)',
  excel_exports: 'Excel Exports',
  advanced_analytics: 'Advanced Analytics',
  scenario_analysis: 'Scenario Analysis',
  portfolio_health_score: 'Portfolio Health Score',
  advanced_insights: 'Advanced Insights',
  unlimited_insights: 'Unlimited Insights',
  weekly_deep_dives: 'Weekly Deep Dives',
  view_holdings: 'View Holdings',
  stability_analysis: 'Stability Analysis',
};

function featureName(capability: CapabilityKey | string): string {
  return CAPABILITY_LABELS[capability] ?? capability;
}

const REASON_COPY: Record<
  PaywallReason,
  (capability: CapabilityKey | string) => PaywallCopy
> = {
  feature_locked: (capability) => ({
    title: featureName(capability),
    description: `Unlock ${featureName(capability)} with Premium.`,
    benefits: [
      'Advanced analytics and insights',
      'Unlimited portfolio analyst queries',
      'PDF reports and exports',
      'Scenario and health analysis',
    ],
    ctaText: 'Unlock in Premium',
  }),

  download_locked: (capability) => ({
    title: featureName(capability),
    description: `${featureName(capability)} is available exclusively for Premium members.`,
    benefits: [
      'Download holdings in PDF format',
      'Advanced analytics and insights',
      'Unlimited portfolio analyst queries',
      'Weekly deep-dive reports',
    ],
    ctaText: 'Upgrade to Premium',
  }),

  limit_reached: (capability) => ({
    title: 'Query limit reached',
    description: 'Upgrade to Premium for unlimited queries and deeper portfolio insights.',
    benefits: [
      'Unlimited AI analyst queries',
      'Full scenario and health analysis',
      'PDF reports and exports',
    ],
    ctaText: 'Upgrade to Premium',
  }),

  insights_limit: (capability) => ({
    title: 'More insights available',
    description:
      'Upgrade to Premium to see all insights, including concentration risk analysis, diversification recommendations, and tax optimization insights.',
    benefits: [
      'All insights unlocked',
      'Concentration and diversification analysis',
      'Tax optimization insights',
    ],
    ctaText: 'View All Insights',
  }),

  trial_exceeded: (capability) => ({
    title: 'Trial limit reached',
    description: 'Your trial limit for this feature has been reached. Upgrade to Premium to continue.',
    benefits: [
      'Unlimited access to this feature',
      'All Premium capabilities',
      'No usage caps',
    ],
    ctaText: 'Upgrade to Premium',
  }),
};

export function getPaywallCopy(
  reason: PaywallReason,
  capability: CapabilityKey | string
): PaywallCopy {
  return REASON_COPY[reason](capability);
}
