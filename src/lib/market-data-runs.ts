/**
 * Market Data Runs Helper
 * 
 * Helper functions for tracking market data ingestion runs.
 * Uses existing public.market_data_runs table.
 */

import { createAdminClient } from '@/lib/supabase/server';

export interface CompleteRunStats {
  successCount: number;
  skippedCount: number;
  failedCount: number;
  targetDate?: string | null; // YYYY-MM-DD or null
  notes?: string | null;
}

/** Options for starting a market data run (ISIN backfill, etc.) */
export interface StartRunOptions {
  assetType: 'stocks' | 'mutual_fund' | 'isin_backfill';
  runType: 'cron' | 'manual';
  triggerSource: 'supabase_cron' | 'ui_button';
  targetDate?: string | null; // YYYY-MM-DD or null
}

/** Stats for completing a market data run */
export interface CompleteRunOptions {
  successCount: number;
  skippedCount: number;
  failedCount: number;
  notes?: string | null;
}

/**
 * Start a market data run and return the run ID
 * 
 * @param assetType - 'STOCK' or 'MF'
 * @param runType - 'MANUAL' or 'CRON'
 * @param triggerSource - 'api' (always 'api' for API endpoints)
 * @returns Run ID (UUID string)
 */
export async function startRun(
  assetType: 'STOCK' | 'MF',
  runType: 'MANUAL' | 'CRON',
  triggerSource: 'api' = 'api'
): Promise<string> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('market_data_runs')
    .insert({
      asset_type: assetType,
      run_type: runType,
      trigger_source: triggerSource,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('[MarketDataRuns] Error starting run:', error);
    throw new Error(`Failed to start market data run: ${error.message}`);
  }
  
  if (!data || !data.id) {
    throw new Error('Failed to start market data run: no ID returned');
  }
  
  console.log(`[MarketDataRuns] Started run ${data.id} for ${assetType} (${runType})`);
  
  return data.id;
}

/**
 * Complete a market data run with success metrics
 * 
 * @param runId - Run ID from startRun()
 * @param stats - Statistics including counts and target date
 */
export async function completeRun(
  runId: string,
  stats: CompleteRunStats
): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('market_data_runs')
    .update({
      completed_at: new Date().toISOString(),
      success_count: stats.successCount,
      skipped_count: stats.skippedCount,
      failed_count: stats.failedCount,
      target_date: stats.targetDate || null,
      error: null, // Clear any previous error
    })
    .eq('id', runId);
  
  if (error) {
    console.error(`[MarketDataRuns] Error completing run ${runId}:`, error);
    throw new Error(`Failed to complete market data run: ${error.message}`);
  }
  
  console.log(`[MarketDataRuns] Completed run ${runId}: ${stats.successCount} success, ${stats.skippedCount} skipped, ${stats.failedCount} failed`);
}

/**
 * Mark a market data run as failed with error message
 * 
 * @param runId - Run ID from startRun()
 * @param errorMessage - Error message to store
 */
export async function failRun(
  runId: string,
  errorMessage: string
): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('market_data_runs')
    .update({
      completed_at: new Date().toISOString(),
      error: errorMessage,
    })
    .eq('id', runId);
  
  if (error) {
    console.error(`[MarketDataRuns] Error failing run ${runId}:`, error);
    // Don't throw - we're already in an error state
    return;
  }
  
  console.error(`[MarketDataRuns] Failed run ${runId}: ${errorMessage}`);
}

// =============================================================================
// Extended API for ISIN backfill and other run types (migration 012 schema)
// =============================================================================

/**
 * Start a market data run (extended API for isin_backfill, etc.)
 * Uses schema: asset_type in ('stocks', 'mutual_fund', 'isin_backfill')
 */
export async function startMarketDataRun(options: StartRunOptions): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('market_data_runs')
    .insert({
      asset_type: options.assetType,
      run_type: options.runType,
      trigger_source: options.triggerSource,
      target_date: options.targetDate || null,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[MarketDataRuns] Error starting run:', error);
    throw new Error(`Failed to start market data run: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error('Failed to start market data run: no ID returned');
  }

  console.log(`[MarketDataRuns] Started run ${data.id} for ${options.assetType} (${options.runType})`);
  return data.id;
}

/**
 * Complete a market data run with stats (extended API)
 */
export async function completeMarketDataRun(
  runId: string,
  stats: CompleteRunOptions
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('market_data_runs')
    .update({
      completed_at: new Date().toISOString(),
      status: 'completed',
      success_count: stats.successCount,
      skipped_count: stats.skippedCount,
      failed_count: stats.failedCount,
      notes: stats.notes || null,
      error: null,
    })
    .eq('id', runId);

  if (error) {
    console.error(`[MarketDataRuns] Error completing run ${runId}:`, error);
    throw new Error(`Failed to complete market data run: ${error.message}`);
  }

  console.log(`[MarketDataRuns] Completed run ${runId}: ${stats.successCount} success, ${stats.skippedCount} skipped, ${stats.failedCount} failed`);
}

/**
 * Mark a market data run as failed (extended API)
 */
export async function failMarketDataRun(runId: string, errorMessage: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('market_data_runs')
    .update({
      completed_at: new Date().toISOString(),
      status: 'failed',
      error: errorMessage,
    })
    .eq('id', runId);

  if (error) {
    console.error(`[MarketDataRuns] Error failing run ${runId}:`, error);
    return;
  }

  console.error(`[MarketDataRuns] Failed run ${runId}: ${errorMessage}`);
}
