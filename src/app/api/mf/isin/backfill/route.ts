/**
 * MF ISIN Backfill API
 * 
 * POST /api/mf/isin/backfill
 * 
 * Backfills ISINs for MF assets that don't have them.
 * Uses mf_scheme_master as the source of truth.
 * 
 * This endpoint is:
 * - Safe to run multiple times (idempotent)
 * - Can be auto-triggered after upload
 * - Can be scheduled nightly
 * 
 * REQUEST BODY (optional):
 * {
 *   "force": false  // If true, re-resolve even assets that already have ISIN
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { backfillMFISINs } from '@/lib/mf-isin-backfill';
import { startMarketDataRun, completeMarketDataRun, failMarketDataRun } from '@/lib/market-data-runs';

interface BackfillRequest {
  force?: boolean;
}

interface BackfillResponse {
  success: boolean;
  scanned: number;
  resolved: number;
  unresolved: number;
  sample_unresolved: string[];
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  let runId: string | null = null;
  
  try {
    const body: BackfillRequest = await request.json().catch(() => ({}));
    const force = body.force || false;
    
    console.log(`[MF ISIN Backfill API] Starting nightly backfill${force ? ' (force mode)' : ''}...`);
    
    // Detect run type and trigger source
    const userAgent = request.headers.get('user-agent') || '';
    const isCron = userAgent.includes('supabase') || request.headers.get('x-supabase-cron') === 'true';
    const runType = isCron ? 'cron' : 'manual';
    const triggerSource = isCron ? 'supabase_cron' : 'ui_button';
    
    // Start market data run logging
    runId = await startMarketDataRun({
      assetType: 'isin_backfill',
      runType,
      triggerSource,
      targetDate: null, // ISIN backfill doesn't have a target date
    });
    
    const result = await backfillMFISINs();
    
    // Complete market data run logging
    if (runId) {
      await completeMarketDataRun(runId, {
        successCount: result.resolved,
        skippedCount: 0, // ISIN backfill doesn't have skipped concept
        failedCount: result.unresolved,
        notes: 'Nightly ISIN resolution attempt',
      });
    }
    
    const message = `Backfill complete: ${result.resolved} resolved out of ${result.scanned} scanned assets`;
    
    return NextResponse.json<BackfillResponse>({
      success: true,
      scanned: result.scanned,
      resolved: result.resolved,
      unresolved: result.unresolved,
      sample_unresolved: result.sample_unresolved,
      message,
    });
  } catch (error) {
    console.error('[MF ISIN Backfill API] Error:', error);
    
    // Fail market data run logging
    if (runId) {
      await failMarketDataRun(runId, error instanceof Error ? error.message : 'Unknown error');
    }
    
    return NextResponse.json<BackfillResponse>(
      {
        success: false,
        scanned: 0,
        resolved: 0,
        unresolved: 0,
        sample_unresolved: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mf/isin/backfill
 * 
 * Returns status of backfill (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabase = createAdminClient();
    
    // Count active MF assets without ISIN
    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'mutual_fund')
      .eq('is_active', true)
      .is('isin', null);
    
    return NextResponse.json({
      success: true,
      assetsWithoutISIN: count || 0,
      message: `Found ${count || 0} MF assets without ISIN`,
    });
  } catch (error) {
    console.error('[MF ISIN Backfill API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

