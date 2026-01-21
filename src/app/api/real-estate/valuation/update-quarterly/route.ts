/**
 * Real Estate Quarterly Valuation Update API
 * 
 * POST /api/real-estate/valuation/update-quarterly
 * 
 * Scheduled job endpoint for quarterly valuation updates.
 * Updates valuations for all assets that haven't been updated in the last 90 days.
 * 
 * DESIGN:
 * =======
 * - Runs quarterly (every 3 months)
 * - Updates all assets that need valuation
 * - Processes in controlled parallel batches
 * - Logs failures without stopping batch
 * - Non-blocking, async processing
 * 
 * USAGE:
 * ======
 * - Scheduled via cron job (quarterly)
 * - Can be called manually for testing
 * - Requires authentication (admin or system key)
 * 
 * AUTHENTICATION:
 * ===============
 * Option 1: Admin API key (recommended for cron)
 * - Header: X-API-Key: <admin-api-key>
 * 
 * Option 2: Authenticated user (for manual testing)
 * - Standard Supabase auth
 * 
 * REQUEST BODY (optional):
 * {
 *   "skipRecentDays": 90,  // Skip assets updated in last N days (default: 90)
 *   "concurrency": 3,      // Concurrent valuations (default: 3)
 *   "userId": null         // If provided, only update this user's assets
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runQuarterlyValuationJob } from '@/jobs/valuation.job';

interface QuarterlyUpdateRequest {
  skipRecentDays?: number;
  concurrency?: number;
  userId?: string | null;
}

/**
 * Verify authentication for scheduled job
 * 
 * Accepts:
 * - Admin API key (X-API-Key header)
 * - Authenticated user session
 */
async function verifyAuth(request: NextRequest): Promise<{ authorized: boolean; userId?: string | null }> {
  // Check for admin API key (for cron jobs)
  const apiKey = request.headers.get('X-API-Key');
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  if (apiKey && adminApiKey && apiKey === adminApiKey) {
    return { authorized: true, userId: null }; // System-wide update
  }
  
  // Check for authenticated user (for manual testing)
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!error && user) {
    return { authorized: true, userId: user.id }; // User-specific update
  }
  
  return { authorized: false };
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Provide X-API-Key header or authenticate as user.' },
        { status: 401 }
      );
    }
    
    const body: QuarterlyUpdateRequest = await request.json().catch(() => ({}));
    const targetUserId = body.userId ?? auth.userId ?? null;
    
    // Run the job
    const result = await runQuarterlyValuationJob({
      skipRecentDays: body.skipRecentDays ?? 90,
      concurrency: body.concurrency ?? 3,
      userId: targetUserId,
    });
    
    if (!result.success) {
      return NextResponse.json(
        result,
        { status: result.error?.includes('required') ? 400 : 500 }
      );
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[Quarterly Valuation Update API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Health check and status
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Real Estate Quarterly Valuation Update API',
    usage: {
      method: 'POST',
      endpoint: '/api/real-estate/valuation/update-quarterly',
      description: 'Updates valuations for all assets (quarterly schedule)',
      authentication: 'X-API-Key header or authenticated user',
      body: {
        skipRecentDays: 'number (default: 90)',
        concurrency: 'number (default: 3)',
        userId: 'string | null (optional)',
      },
    },
    schedule: 'Quarterly (every 3 months)',
  });
}
