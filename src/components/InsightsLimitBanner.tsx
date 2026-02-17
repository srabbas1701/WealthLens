/**
 * Shows when more insights are available than free tier shows. All locked actions route through ShowPaywall.
 */

'use client';

import ShowPaywall from '@/components/ShowPaywall';
import { FEATURE_ACCESS } from '@/config/feature-access';

interface InsightsLimitBannerProps {
  totalInsights: number;
  shownInsights: number;
}

export default function InsightsLimitBanner({
  totalInsights,
  shownInsights,
}: InsightsLimitBannerProps) {
  const remaining = totalInsights - shownInsights;
  if (remaining <= 0) return null;

  const bannerDetail = `You have ${remaining} more insight${remaining !== 1 ? 's' : ''} available.`;

  return (
    <ShowPaywall
      reason="insights_limit"
      capability={FEATURE_ACCESS.ANALYTICS_HEALTH.capability}
      variant="banner"
      bannerDetail={bannerDetail}
    />
  );
}
