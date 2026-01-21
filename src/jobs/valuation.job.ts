/**
 * Real Estate Valuation Job
 * 
 * Scheduled job for quarterly valuation updates.
 * Updates valuations for all assets that haven't been updated recently.
 * 
 * @module jobs/valuation.job
 */

import { createServerClient } from '@/lib/supabaseClient';
import { valuateAllUserAssets } from '@/services/realEstateValuation.service';

export interface QuarterlyValuationJobOptions {
  skipRecentDays?: number;  // Skip assets updated in last N days (default: 90)
  concurrency?: number;      // Concurrent valuations (default: 3)
  userId?: string | null;    // If provided, only update this user's assets
}

export interface QuarterlyValuationJobResult {
  success: boolean;
  message: string;
  data?: {
    total: number;
    processed: number;
    skipped: number;
    successful: number;
    failed: number;
    errors: Array<{ assetId: string; error: string }>;
  };
  error?: string;
}

/**
 * Run quarterly valuation update job
 * 
 * This job:
 * - Updates valuations for assets older than skipRecentDays (default: 90)
 * - Processes in controlled parallel batches
 * - Logs failures without stopping batch
 * - Returns summary of results
 * 
 * @param options - Job options
 * @returns Job execution result
 */
export async function runQuarterlyValuationJob(
  options: QuarterlyValuationJobOptions = {}
): Promise<QuarterlyValuationJobResult> {
  try {
    const {
      skipRecentDays = 90,  // Default: 90 days (quarterly)
      concurrency = 3,
      userId = null,
    } = options;

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required. System-wide updates are not yet supported.',
      };
    }

    const supabase = await createServerClient();

    const summary = await valuateAllUserAssets(supabase, userId, {
      skipRecentDays,
      concurrency,
      sequential: false,
    });

    return {
      success: true,
      message: `Quarterly valuation update completed for user ${userId}`,
      data: {
        total: summary.total,
        processed: summary.processed,
        skipped: summary.skipped,
        successful: summary.successful,
        failed: summary.failed,
        errors: summary.errors,
      },
    };
  } catch (error) {
    console.error('[Quarterly Valuation Job] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}

/**
 * Run quarterly valuation update for all users
 * 
 * Note: This requires admin access and iterating through all users.
 * For MVP, this is a placeholder for future implementation.
 * 
 * @param options - Job options
 * @returns Job execution result
 */
export async function runQuarterlyValuationJobForAllUsers(
  options: Omit<QuarterlyValuationJobOptions, 'userId'> = {}
): Promise<QuarterlyValuationJobResult> {
  // TODO: Implement system-wide update
  // This would require:
  // 1. Admin client to fetch all users
  // 2. Iterate through users
  // 3. Run job for each user
  // 4. Aggregate results

  return {
    success: false,
    error: 'System-wide updates are not yet implemented. Please specify userId.',
  };
}
