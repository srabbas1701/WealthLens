/**
 * Onboarding Asset Queue
 *
 * Manages the ordered list of asset types a user chose to add during onboarding.
 * Stored in localStorage so it survives page-to-page navigation between asset
 * add pages. Cleared automatically when the queue is exhausted or the user
 * explicitly skips the rest.
 *
 * Queue structure:
 *   { items: ['mutual_funds', 'stocks', 'etf'], currentIndex: 0 }
 *
 * Usage pattern:
 *   1. writeQueue(userId, ['mutual_funds', 'stocks', 'etf'])   ← onboarding/select
 *   2. readQueue(userId) → { items, currentIndex, current, next, total, remaining }
 *   3. advanceQueue(userId) → moves to next, returns new state or null if done
 *   4. clearQueue(userId) → removes from localStorage
 */

export interface QueueState {
  items: string[];      // ordered asset IDs from ASSET_GROUPS
  currentIndex: number;
}

export interface QueueInfo {
  items: string[];
  currentIndex: number;
  current: string;          // asset ID at currentIndex
  next: string | null;      // asset ID after current, or null if last
  total: number;
  remaining: number;        // items still to go (including current)
  isLast: boolean;
}

/** Label map for human-readable asset names in the banner */
export const QUEUE_ASSET_LABELS: Record<string, string> = {
  mutual_funds:       'Mutual Funds',
  stocks:             'Stocks / Shares',
  etf:                'ETFs',
  fixed_deposits:     'Fixed Deposits / RDs',
  bonds:              'Bonds',
  epf:                'EPF',
  ppf:                'PPF',
  nps:                'NPS',
  real_estate:        'Property / Real Estate',
  gold:               'Gold',
  silver:             'Silver',
  savings_cash:       'Savings / Liquid Funds',
  life_insurance:     'Life Insurance',
  health_insurance:   'Health Insurance',
  loans_liabilities:  'Loans & EMIs',
};

/**
 * Map each asset ID to the portfolio page where it can be added.
 * The onboarding queue banner will use this to navigate on success.
 */
export const QUEUE_ASSET_ROUTES: Record<string, string> = {
  mutual_funds:       '/portfolio/mutualfunds',
  stocks:             '/portfolio/stocks',
  etf:                '/portfolio/etfs',
  fixed_deposits:     '/portfolio/fixeddeposits',
  bonds:              '/portfolio/bonds',
  epf:                '/portfolio/epf',
  ppf:                '/portfolio/ppf',
  nps:                '/portfolio/nps',
  real_estate:        '/portfolio/real-estate',
  gold:               '/portfolio/gold',
  silver:             '/portfolio/silver',
  savings_cash:       '/portfolio/cash',
  life_insurance:     '/portfolio/insurance/add?category=LIFE',
  health_insurance:   '/portfolio/insurance/add?category=HEALTH',
  loans_liabilities:  '/dashboard',
};

/** Route to launch the add-entry experience from onboarding for each asset. */
export function getOnboardingLaunchRoute(assetId: string): string {
  switch (assetId) {
    case 'mutual_funds':
      return '/portfolio/mutualfunds/add';
    case 'stocks':
      return '/portfolio/stocks/add';
    case 'etf':
      return '/portfolio/etfs/add';
    case 'fixed_deposits':
      return '/portfolio/fixeddeposits?add=1';
    case 'bonds':
      return '/portfolio/bonds?add=1';
    case 'epf':
      return '/portfolio/epf?add=1';
    case 'ppf':
      return '/portfolio/ppf?add=1';
    case 'nps':
      return '/portfolio/nps?add=1';
    case 'real_estate':
      return '/portfolio/real-estate?add=1';
    case 'gold':
      return '/portfolio/gold?add=1';
    case 'silver':
      return '/portfolio/silver?add=1';
    case 'savings_cash':
      return '/portfolio/cash?add=1';
    case 'life_insurance':
      return '/portfolio/insurance/add?category=LIFE';
    case 'health_insurance':
      return '/portfolio/insurance/add?category=HEALTH';
    default:
      return QUEUE_ASSET_ROUTES[assetId] ?? '/dashboard';
  }
}

/** Append from=onboarding safely (supports existing query params). */
export function withOnboardingParam(route: string): string {
  const hasQuery = route.includes('?');
  return `${route}${hasQuery ? '&' : '?'}from=onboarding`;
}

function storageKey(userId: string): string {
  return `onboarding_queue_${userId}`;
}

/** Write a fresh queue for the user. */
export function writeQueue(userId: string, assetIds: string[]): void {
  if (typeof window === 'undefined') return;
  const state: QueueState = { items: assetIds, currentIndex: 0 };
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

/** Read current queue state. Returns null if no queue or queue is empty. */
export function readQueue(userId: string): QueueInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const state: QueueState = JSON.parse(raw);
    if (!state.items?.length || state.currentIndex >= state.items.length) {
      clearQueue(userId);
      return null;
    }
    const { items, currentIndex } = state;
    return {
      items,
      currentIndex,
      current: items[currentIndex],
      next: currentIndex + 1 < items.length ? items[currentIndex + 1] : null,
      total: items.length,
      remaining: items.length - currentIndex,
      isLast: currentIndex === items.length - 1,
    };
  } catch {
    return null;
  }
}

/**
 * Advance to the next item. Returns the updated QueueInfo,
 * or null if the queue is now exhausted (call clearQueue after).
 */
export function advanceQueue(userId: string): QueueInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const state: QueueState = JSON.parse(raw);
    state.currentIndex += 1;
    if (state.currentIndex >= state.items.length) {
      clearQueue(userId);
      return null;
    }
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
    return readQueue(userId);
  } catch {
    return null;
  }
}

/** Force queue pointer to a specific asset when user jumps directly to it. */
export function alignQueueToAsset(userId: string, assetId: string): QueueInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const state: QueueState = JSON.parse(raw);
    const idx = state.items.indexOf(assetId);
    if (idx === -1) return readQueue(userId);
    state.currentIndex = idx;
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
    return readQueue(userId);
  } catch {
    return null;
  }
}

/** Remove the queue entirely (onboarding finished or user skipped rest). */
export function clearQueue(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(userId));
}

/**
 * Determine which asset ID is "active" on a given portfolio route.
 * Used by asset pages to check if they're currently part of the queue.
 */
export function getQueueAssetIdForRoute(pathname: string, search = ''): string | null {
  for (const [assetId, route] of Object.entries(QUEUE_ASSET_ROUTES)) {
    const [routePath, routeQuery] = route.split('?');
    if (!pathname.startsWith(routePath)) continue;
    if (!routeQuery) return assetId;
    const requiredParts = routeQuery.split('&').filter(Boolean);
    const matchedAll = requiredParts.every(part => search.includes(part));
    if (matchedAll) return assetId;
  }
  return null;
}
