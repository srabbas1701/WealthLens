/**
 * Query Limit Banner
 * 
 * Shows when user reaches free tier query limit.
 * Non-blocking, respectful, offers upgrade option.
 */

'use client';

import Link from 'next/link';
import { InfoIcon, ArrowRightIcon } from '@/components/icons';

interface QueryLimitBannerProps {
  /** Current number of queries used */
  currentQueries: number;
  /** Free tier limit */
  limit: number;
  /** Optional: Reset date */
  resetDate?: string;
}

export default function QueryLimitBanner({
  currentQueries,
  limit,
  resetDate,
}: QueryLimitBannerProps) {
  const remaining = limit - currentQueries;
  const isAtLimit = remaining <= 0;

  if (!isAtLimit) {
    return null; // Don't show if not at limit
  }

  return (
    <div className="bg-[#F6F8FB] rounded-lg border border-[#E5E7EB] p-4 mb-4">
      <div className="flex items-start gap-3">
        <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-[#475569] mb-2">
            You've used all {limit} queries this month.
            {resetDate && (
              <span className="text-[#6B7280]"> Your limit resets on {resetDate}.</span>
            )}
          </p>
          <p className="text-sm text-[#475569] mb-3">
            Upgrade to Premium for unlimited queries and deeper portfolio insights.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:text-[#1E40AF] transition-colors"
          >
            Upgrade to Premium
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}








