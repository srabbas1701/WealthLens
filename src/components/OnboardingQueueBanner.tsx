/**
 * OnboardingQueueBanner
 *
 * Shown at the top of every asset add page when the user arrived via the
 * onboarding "Pick What You Own" queue. Displays:
 *   • Step X of N  (progress dots)
 *   • Asset name
 *   • "Back" button  → /onboarding/select
 *   • "Skip this →"  → advance to next item (or dashboard if last)
 *
 * Rendered only when a queue exists in localStorage for the current user.
 * Asset pages call onAddedOne() after each successful add to reveal the
 * "Done, move to next →" CTA (for multi-add pages like MF, Stocks, ETFs).
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import {
  readQueue,
  advanceQueue,
  alignQueueToAsset,
  clearQueue,
  getQueueAssetIdForRoute,
  QUEUE_ASSET_LABELS,
  getOnboardingLaunchRoute,
  withOnboardingParam,
} from '@/lib/onboarding-queue';

interface Props {
  userId: string;
  /**
   * If true, show the "Done, next: [Asset] →" primary CTA.
   * Asset pages set this after the first successful add.
   */
  hasAddedOne?: boolean;
}

export default function OnboardingQueueBanner({ userId, hasAddedOne = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<ReturnType<typeof readQueue>>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Read queue on mount and whenever userId changes
  useEffect(() => {
    if (!userId) return;
    const q = readQueue(userId);
    // Only show the banner if the current page matches the current queue item
    if (q) {
      const assetIdForThisRoute = getQueueAssetIdForRoute(pathname ?? '', searchParams?.toString() ?? '');
      if (assetIdForThisRoute && q.items.includes(assetIdForThisRoute)) {
        // Sync queue index to current page in case user clicked step 2 cards out of order
        const aligned = alignQueueToAsset(userId, assetIdForThisRoute) ?? q;
        setQueue(aligned);
      }
    }
  }, [userId, pathname, searchParams]);

  if (!queue) return null;

  const currentLabel = QUEUE_ASSET_LABELS[queue.current] ?? queue.current;
  const nextLabel = queue.next ? (QUEUE_ASSET_LABELS[queue.next] ?? queue.next) : null;

  const navigateNext = () => {
    setIsNavigating(true);
    const next = advanceQueue(userId);
    if (next) {
      const nextRoute = getOnboardingLaunchRoute(next.current);
      router.push(withOnboardingParam(nextRoute));
    } else {
      clearQueue(userId);
      router.replace('/dashboard');
    }
  };

  const navigateBack = () => {
    router.push('/onboarding/select');
  };

  return (
    <div className="bg-emerald-950/80 dark:bg-emerald-950/90 border-b border-emerald-800/50 px-4 sm:px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 flex-wrap">

        {/* Left: Back + step info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={navigateBack}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="w-px h-4 bg-emerald-700/60 shrink-0" />

          {/* Progress dots */}
          <div className="flex items-center gap-1 shrink-0">
            {queue.items.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i < queue.currentIndex
                    ? 'w-1.5 h-1.5 bg-emerald-500'          // done
                    : i === queue.currentIndex
                    ? 'w-2.5 h-2.5 bg-emerald-400'           // current
                    : 'w-1.5 h-1.5 bg-emerald-800'           // upcoming
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-emerald-200 truncate hidden sm:block">
            Step {queue.currentIndex + 1} of {queue.total}
            {' · '}
            <span className="font-semibold text-white">{currentLabel}</span>
            {nextLabel && (
              <span className="text-emerald-400"> → {nextLabel}{queue.isLast ? '' : ' …'}</span>
            )}
          </span>
          {/* Mobile condensed */}
          <span className="text-xs text-emerald-200 truncate sm:hidden">
            <span className="font-semibold text-white">{currentLabel}</span>
            {' '}
            <span className="text-emerald-500">{queue.currentIndex + 1}/{queue.total}</span>
          </span>
        </div>

        {/* Right: Done → Next CTA or Skip */}
        <div className="flex items-center gap-2 shrink-0">
          {hasAddedOne && (
            <button
              type="button"
              onClick={navigateNext}
              disabled={isNavigating}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              {isNavigating ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : queue.isLast ? (
                <>Go to Dashboard <ArrowRightIcon className="w-3.5 h-3.5" /></>
              ) : (
                <>Done, next: {nextLabel} <ArrowRightIcon className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
          {!hasAddedOne && (
            <button
              type="button"
              onClick={navigateNext}
              disabled={isNavigating}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-200 transition-colors disabled:opacity-60"
            >
              {isNavigating ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {queue.isLast ? 'Skip, go to Dashboard' : `Skip${nextLabel ? `, next: ${nextLabel}` : ''}`}
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
