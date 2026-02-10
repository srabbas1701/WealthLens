/**
 * Shows when more insights are available than free tier shows. All locked actions route through ShowPaywall.
 */

'use client';

import ShowPaywall from '@/components/ShowPaywall';
import { CAPABILITY_KEYS } from '@/lib/capabilities';

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
      capability={CAPABILITY_KEYS.ADVANCED_INSIGHTS}
      variant="banner"
      bannerDetail={bannerDetail}
    />
  );
}
