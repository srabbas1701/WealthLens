/**
 * Shared portfolio data cache
 *
 * Used by Dashboard and Portfolio Summary for instant loads when navigating.
 * Dashboard populates this when it fetches portfolio data.
 * Summary page uses it to skip API call when data is available.
 */

const TTL_MS = 2 * 60 * 1000; // 2 minutes
let cache: { userId: string | null; data: unknown; timestamp: number } = {
  userId: null,
  data: null,
  timestamp: 0,
};

export function getCachedPortfolioData<T = unknown>(userId: string): T | null {
  if (cache.userId !== userId) return null;
  if (Date.now() - cache.timestamp > TTL_MS) return null;
  return cache.data as T;
}

export function setCachedPortfolioData(userId: string, data: unknown) {
  cache = { userId, data, timestamp: Date.now() };
}

export function clearPortfolioCache() {
  cache = { userId: null, data: null, timestamp: 0 };
}
