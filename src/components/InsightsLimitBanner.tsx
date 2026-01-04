/**
 * Insights Limit Banner
 * 
 * Shows when user has more insights available than free tier limit.
 * Appears below the visible insights, non-blocking.
 */

'use client';

import Link from 'next/link';
import { InfoIcon, ArrowRightIcon } from '@/components/icons';

interface InsightsLimitBannerProps {
  /** Total insights available */
  totalInsights: number;
  /** Number of insights shown (free tier limit) */
  shownInsights: number;
}

export default function InsightsLimitBanner({
  totalInsights,
  shownInsights,
}: InsightsLimitBannerProps) {
  const remaining = totalInsights - shownInsights;

  if (remaining <= 0) {
    return null; // Don't show if no additional insights
  }

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 mt-2">
      <div className="flex items-start gap-3">
        <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#0F172A] mb-1">
            You have {remaining} more insight{remaining !== 1 ? 's' : ''} available
          </p>
          <p className="text-sm text-[#6B7280] mb-3">
            Upgrade to Premium to see all insights, including concentration risk analysis, 
            diversification recommendations, and tax optimization insights.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:text-[#1E40AF] transition-colors"
          >
            View All Insights
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}








