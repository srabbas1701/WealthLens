/**
 * Market Data Status API (read-only, always 200)
 *
 * GET /api/system/market-data/status
 *
 * Source of truth: public.market_data_runs
 * - ONLY rows where completed_at IS NOT NULL and error IS NULL
 * - Latest per asset_type ordered by completed_at DESC
 *
 * Must never throw 500 due to empty data.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type StatusRow = {
  asset_type: string;
  completed_at: string | null;
  target_date: string | null;
  success_count: number | null;
  failed_count: number | null;
  error: string | null;
};

type StatusBlock = {
  completedAt: string;
  targetDate: string | null;
  successCount: number;
  failedCount: number;
};

type StatusResponse = {
  stock: StatusBlock | null;
  mf: StatusBlock | null;
};

function toBlock(row: StatusRow | null | undefined): StatusBlock | null {
  if (!row?.completed_at) return null;
  return {
    completedAt: row.completed_at,
    targetDate: row.target_date ?? null,
    successCount: row.success_count ?? 0,
    failedCount: row.failed_count ?? 0,
  };
}

export async function GET() {
  const supabase = createAdminClient();

  try {
    // Fetch completed + successful runs. We do not assume both asset types exist.
    const { data: runs, error } = await supabase
      .from('market_data_runs')
      .select('asset_type, completed_at, target_date, success_count, failed_count, error')
      .not('completed_at', 'is', null)
      .is('error', null)
      .order('completed_at', { ascending: false });

    if (error || !runs || runs.length === 0) {
      return NextResponse.json<StatusResponse>({ stock: null, mf: null }, { status: 200 });
    }

    // Latest per asset_type (spec: 'STOCK' and 'MF').
    // Defensive: also accept lowercase variants if present in existing data.
    const stockRow = (runs as StatusRow[]).find(
      (r) => r.asset_type === 'STOCK' || r.asset_type === 'stock'
    );
    const mfRow = (runs as StatusRow[]).find((r) => r.asset_type === 'MF' || r.asset_type === 'mf');

    return NextResponse.json<StatusResponse>(
      {
        stock: toBlock(stockRow),
        mf: toBlock(mfRow),
      },
      { status: 200 }
    );
  } catch {
    // Always 200, never throw/log on empty/missing table data.
    return NextResponse.json<StatusResponse>({ stock: null, mf: null }, { status: 200 });
  }
}
