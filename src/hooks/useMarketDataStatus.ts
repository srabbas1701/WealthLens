/**
 * useMarketDataStatus
 *
 * Fetches GET /api/system/market-data/status and exposes { data, loading }.
 * Never throws; on any failure returns null blocks.
 */

'use client';

import { useEffect, useState } from 'react';

export type MarketDataStatusBlock = {
  completedAt: string;
  targetDate: string | null;
  successCount: number;
  failedCount: number;
};

export type MarketDataStatusResponse = {
  stock: MarketDataStatusBlock | null;
  mf: MarketDataStatusBlock | null;
};

const EMPTY: MarketDataStatusResponse = { stock: null, mf: null };

export function useMarketDataStatus(): { data: MarketDataStatusResponse; loading: boolean } {
  const [data, setData] = useState<MarketDataStatusResponse>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch('/api/system/market-data/status', { method: 'GET' });
        if (!res.ok) {
          if (!cancelled) setData(EMPTY);
          return;
        }
        const json = (await res.json()) as Partial<MarketDataStatusResponse> | null;
        if (!cancelled) {
          setData({
            stock: json?.stock ?? null,
            mf: json?.mf ?? null,
          });
        }
      } catch {
        if (!cancelled) setData(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

