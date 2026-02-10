/**
 * Shows when user reaches query limit. All locked actions route through ShowPaywall.
 */

'use client';

import ShowPaywall from '@/components/ShowPaywall';
import { CAPABILITY_KEYS } from '@/lib/capabilities';

interface QueryLimitBannerProps {
  currentQueries: number;
  limit: number;
  resetDate?: string;
}

export default function QueryLimitBanner({
  currentQueries,
  limit,
  resetDate,
}: QueryLimitBannerProps) {
  const remaining = limit - currentQueries;
  if (remaining > 0) return null;

  const bannerDetail = resetDate
    ? `You've used all ${limit} queries this month. Your limit resets on ${resetDate}.`
    : `You've used all ${limit} queries this month.`;

  return (
    <ShowPaywall
      reason="limit_reached"
      capability={CAPABILITY_KEYS.USE_AI_HELP}
      variant="banner"
      bannerDetail={bannerDetail}
    />
  );
}
