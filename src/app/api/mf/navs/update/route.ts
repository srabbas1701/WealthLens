/**
 * MF NAV Update API
 * 
 * POST /api/mf/navs/update
 * 
 * Updates Mutual Fund NAVs for schemes.
 * This endpoint should be called once per day (via cron job or scheduled task).
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * 1. Only updates NAVs if today's NAV is missing
 * 2. Uses previous trading day NAV
 * 3. Does NOT block if some NAVs fail to update
 * 4. Logs all operations for observability
 * 
 * USAGE:
 * ======
 * - Can be called manually for testing
 * - Should be scheduled via cron (e.g., daily at 7 PM IST after AMFI publishes NAVs)
 * - Can be triggered by portfolio data API if NAVs are missing
 * 
 * REQUEST BODY (optional):
 * {
 *   "schemeCodes": ["119551", "120467"]  // Optional: if not provided, fetches all schemes from holdings
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { updateMFNavs } from '@/lib/mf-navs';
import { getPreviousTradingDay } from '@/lib/stock-prices';
import { getSchemeCodeByISIN, updateSchemeMaster } from '@/lib/mf-scheme-master';

interface UpdateNavsRequest {
  schemeCodes?: string[];
}

interface UpdateNavsResponse {
  success: boolean;
  navDate: string;
  updated: number;
  failed: number;
  results: Array<{
    schemeCode: string;
    success: boolean;
    nav?: number;
    navDate?: string;
    error?: string;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const navDate = getPreviousTradingDay();
    
    // First, ensure scheme master is up to date (this populates ISIN ↔ scheme_code mappings)
    // Check if scheme master was updated recently (within last 7 days) to avoid unnecessary updates
    try {
      const supabase = createAdminClient();
      const { data: recentUpdate } = await supabase
        .from('mf_scheme_master')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const shouldUpdateSchemeMaster = !recentUpdate || 
        (new Date().getTime() - new Date(recentUpdate.last_updated).getTime()) > 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (shouldUpdateSchemeMaster) {
        await updateSchemeMaster();
      }
      // Skip silently if fresh (no logging)
    } catch (error) {
      console.warn(`[MF NAV Update API] Failed to check/update scheme master:`, error);
      // Continue even if scheme master update fails
    }
    
    // Parse request body (optional)
    let schemeCodesToUpdate: string[] = [];
    try {
      const body: UpdateNavsRequest = await request.json().catch(() => ({}));
      schemeCodesToUpdate = body.schemeCodes || [];
    } catch {
      // Body is optional
    }
    
    // If no scheme codes provided, get all unique scheme codes from MF holdings (via ISIN → scheme_code mapping)
    if (schemeCodesToUpdate.length === 0) {
      const supabase = createAdminClient();
      
      // Get all mutual fund holdings with ISINs
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select(`
          assets!inner (
            isin,
            asset_type
          )
        `)
        .in('assets.asset_type', ['mutual_fund', 'index_fund', 'etf'])
        .not('assets.isin', 'is', null);
      
      if (error) {
        console.error('[MF NAV Update API] Error fetching ISINs:', error);
      } else if (holdings) {
        // Extract unique ISINs and map to scheme codes
        const isinSet = new Set<string>();
        holdings.forEach((h: any) => {
          const isin = h.assets?.isin;
          if (isin && typeof isin === 'string') {
            isinSet.add(isin.toUpperCase().trim());
          }
        });
        
        const isins = Array.from(isinSet);
        
        // Map ISINs to scheme codes using scheme master (cache results in memory per request)
        const schemeCodeSet = new Set<string>();
        const isinToSchemeCodeCache = new Map<string, string | null>();
        
        for (const isin of isins) {
          // Check cache first
          let schemeCode = isinToSchemeCodeCache.get(isin);
          if (schemeCode === undefined) {
            schemeCode = await getSchemeCodeByISIN(isin);
            isinToSchemeCodeCache.set(isin, schemeCode);
          }
          
          if (schemeCode) {
            schemeCodeSet.add(schemeCode);
          } else {
            // Log only missing ISINs (mapping failures)
            console.warn(`[MF NAV Update API] No scheme_code found for ISIN: ${isin}`);
          }
        }
        
        schemeCodesToUpdate = Array.from(schemeCodeSet);
      }
    }
    
    if (schemeCodesToUpdate.length === 0) {
      return NextResponse.json<UpdateNavsResponse>({
        success: true,
        navDate,
        updated: 0,
        failed: 0,
        results: [],
      });
    }
    
    // Update NAVs
    const results = await updateMFNavs(schemeCodesToUpdate);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json<UpdateNavsResponse>({
      success: true,
      navDate,
      updated: successCount,
      failed: failureCount,
      results: results.map(r => ({
        schemeCode: r.schemeCode,
        success: r.success,
        nav: r.nav,
        navDate: r.navDate,
        error: r.error,
      })),
    });
    
  } catch (error) {
    console.error('[MF NAV Update API] Error:', error);
    return NextResponse.json<UpdateNavsResponse>(
      {
        success: false,
        navDate: getPreviousTradingDay(),
        updated: 0,
        failed: 0,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mf/navs/update
 * 
 * Returns status of NAV updates (for monitoring/debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const navDate = getPreviousTradingDay();
    
    // Get count of NAVs for today
    const { count } = await supabase
      .from('mf_navs')
      .select('*', { count: 'exact', head: true })
      .eq('nav_date', navDate);
    
    // Get most recent update timestamp
    const { data: latest } = await supabase
      .from('mf_navs')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return NextResponse.json({
      success: true,
      navDate,
      navsCount: count || 0,
      lastUpdated: latest?.last_updated || null,
    });
    
  } catch (error) {
    console.error('[MF NAV Update API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

