/**
 * Stock & ETF Price Update API
 * 
 * POST /api/stocks/prices/update
 * 
 * Updates stock and ETF prices for a list of NSE symbols.
 * This endpoint should be called once per day (via cron job or scheduled task).
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * 1. Only updates prices if today's price is missing
 * 2. Uses previous trading day closing price
 * 3. Does NOT block if some prices fail to update
 * 4. Logs all operations for observability
 * 5. Handles both equity stocks and ETFs (both trade on exchanges with ticker symbols)
 * 
 * USAGE:
 * ======
 * - Can be called manually for testing
 * - Should be scheduled via cron (e.g., daily at 6 PM IST after market close)
 * - Can be triggered by portfolio data API if prices are missing
 * 
 * REQUEST BODY (optional):
 * {
 *   "symbols": ["RELIANCE", "TCS", "NIFTYBEES", "CPSEETF"]  // Optional: if not provided, fetches all unique symbols from holdings
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { updateStockPrices } from '@/lib/stock-prices';

interface UpdatePricesRequest {
  symbols?: string[];
}

interface UpdatePricesResponse {
  success: boolean;
  priceDate: string;
  updated: number;
  failed: number;
  results: Array<{
    symbol: string;
    success: boolean;
    price?: number;
    error?: string;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  let runId: string | null = null;
  let supabase: ReturnType<typeof createAdminClient> | null = null;

  try {
    const startTime = Date.now();
    console.log(
      `[Price Update API] Starting Yahoo Finance stock & ETF price update (price_date derived from Yahoo timestamp → IST)`
    );

    // Create Supabase admin client (used for run tracking + optional DB reads)
    supabase = createAdminClient();

    // Market run tracking: insert run row immediately after admin client creation
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('market_data_runs')
        .insert({
          asset_type: 'stock',
          run_type: 'price_update',
          trigger_source: 'api',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.warn('[Price Update API] market_data_runs insert failed:', insertError);
      } else if (inserted?.id) {
        runId = inserted.id;
      } else {
        console.warn('[Price Update API] market_data_runs insert returned no id');
      }
    } catch (e) {
      console.warn('[Price Update API] market_data_runs insert threw:', e);
    }
    
    // Parse request body (optional)
    let symbolsToUpdate: string[] = [];
    try {
      const body: UpdatePricesRequest = await request.json().catch(() => ({}));
      symbolsToUpdate = body.symbols || [];
    } catch {
      // Body is optional
    }
    
    // If no symbols provided, get all unique stock and ETF symbols from holdings
    if (symbolsToUpdate.length === 0) {
      // Get all equity and ETF holdings with symbols
      // ETFs trade on exchanges with ticker symbols just like stocks
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select(`
          assets!inner (
            symbol,
            asset_type
          )
        `)
        .in('assets.asset_type', ['equity', 'etf'])
        .not('assets.symbol', 'is', null);
      
      if (error) {
        console.error('[Price Update API] Error fetching symbols:', error);
      } else if (holdings) {
        // Extract unique symbols and clean them
        // Symbols might have prefixes like "NSE: HDFCBANK" or just "HDFCBANK"
        const symbolSet = new Set<string>();
        holdings.forEach((h: any) => {
          let symbol = h.assets?.symbol;
          if (symbol && typeof symbol === 'string') {
            // Remove common prefixes: "NSE: ", "BSE: ", etc.
            symbol = symbol.replace(/^(NSE|BSE):\s*/i, '').trim();
            // Remove any whitespace and convert to uppercase
            symbol = symbol.toUpperCase().trim();
            if (symbol.length > 0) {
              symbolSet.add(symbol);
            }
          }
        });
        
        symbolsToUpdate = Array.from(symbolSet);
        console.log(`[Price Update API] Found ${symbolsToUpdate.length} unique stock and ETF symbols from holdings:`, symbolsToUpdate.slice(0, 10));
      }
    }
    
    if (symbolsToUpdate.length === 0) {
      return NextResponse.json<UpdatePricesResponse>({
        success: true,
        // No symbols, so no Yahoo-derived price date to report
        priceDate: 'unknown',
        updated: 0,
        failed: 0,
        results: [],
      });
    }
    
    // Update prices in stock_prices table
    const results = await updateStockPrices(symbolsToUpdate);

    // Derive a single "reported" priceDate for response/monitoring.
    // Most updates should share the same Yahoo-derived IST date.
    const successfulDates = results
      .filter((r) => r.success && r.priceDate)
      .map((r) => r.priceDate as string);

    const dateCounts = new Map<string, number>();
    for (const d of successfulDates) {
      dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
    }
    const priceDate =
      successfulDates.length === 0
        ? 'unknown'
        : Array.from(dateCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`[Price Update API] Stock prices updated: ${successCount} succeeded, ${failureCount} failed`);
    
    // CRITICAL PERFORMANCE OPTIMIZATION:
    // Update holdings.current_value for all equity and ETF holdings with updated prices
    // This pre-computes the values so the read path (dashboard/portfolio pages) is fast
    let holdingsUpdated = 0;
    if (successCount > 0) {
      try {
        const supabase = createAdminClient();
        
        // Get all equity and ETF holdings with their quantities
        const { data: holdingsToUpdate, error: holdingsError } = await supabase
          .from('holdings')
          .select(`
            id,
            quantity,
            assets!inner (
              symbol,
              asset_type
            )
          `)
          .in('assets.asset_type', ['equity', 'etf'])
          .not('assets.symbol', 'is', null);
        
        if (!holdingsError && holdingsToUpdate) {
          // Create a map of successful price updates
          const priceMap = new Map<string, number>();
          results.forEach(r => {
            if (r.success && r.price) {
              priceMap.set(r.symbol.toUpperCase(), r.price);
            }
          });
          
          // Update current_value for each holding
          for (const holding of holdingsToUpdate) {
            const symbol = (holding as any).assets?.symbol;
            if (!symbol) continue;
            
            const cleanSymbol = symbol.replace(/^(NSE|BSE):\s*/i, '').trim().toUpperCase();
            const price = priceMap.get(cleanSymbol);
            
            if (price && holding.quantity) {
              const newCurrentValue = holding.quantity * price;
              
              // Update current_value in holdings table
              await supabase
                .from('holdings')
                .update({ current_value: newCurrentValue })
                .eq('id', holding.id);
              
              holdingsUpdated++;
            }
          }
          
          console.log(`[Price Update API] Updated current_value for ${holdingsUpdated} holdings`);
        }
      } catch (updateError) {
        console.error('[Price Update API] Error updating holdings.current_value:', updateError);
        // Don't fail the entire request if holdings update fails
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Price Update API] Complete in ${duration}ms: ${successCount} prices updated, ${holdingsUpdated} holdings updated`);
    console.log(`[Price Update API] Price date: ${priceDate} (Yahoo-derived IST)`);

    // Market run tracking: update run row just before returning response
    if (runId && supabase) {
      try {
        const { error: updateError } = await supabase
          .from('market_data_runs')
          .update({
            completed_at: new Date().toISOString(),
            success_count: successCount,
            failed_count: failureCount,
          })
          .eq('id', runId);

        if (updateError) {
          console.warn('[Price Update API] market_data_runs update failed:', updateError);
        }
      } catch (e) {
        console.warn('[Price Update API] market_data_runs update threw:', e);
      }
    }
    
    return NextResponse.json<UpdatePricesResponse>({
      success: true,
      priceDate,
      updated: successCount,
      failed: failureCount,
      results: results.map(r => ({
        symbol: r.symbol,
        success: r.success,
        price: r.price,
        error: r.error,
      })),
    });
    
  } catch (error) {
    console.error('[Price Update API] Error:', error);

    // Market run tracking: update run row on fatal error
    if (runId && supabase) {
      try {
        const { error: updateError } = await supabase
          .from('market_data_runs')
          .update({
            completed_at: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', runId);

        if (updateError) {
          console.warn('[Price Update API] market_data_runs error update failed:', updateError);
        }
      } catch (e) {
        console.warn('[Price Update API] market_data_runs error update threw:', e);
      }
    }
    
    return NextResponse.json<UpdatePricesResponse>(
      {
        success: false,
        priceDate: 'unknown',
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
 * GET /api/stocks/prices/update
 * 
 * Returns status of price updates (for monitoring/debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Report the latest Yahoo-derived IST price_date present in stock_prices
    const { data: latestByDate } = await supabase
      .from('stock_prices')
      .select('price_date')
      .order('price_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const priceDate = latestByDate?.price_date || 'unknown';

    // Get count of prices for the latest date (if unknown, count will be 0)
    const { count } = await supabase
      .from('stock_prices')
      .select('*', { count: 'exact', head: true })
      .eq('price_date', priceDate === 'unknown' ? '' : priceDate);
    
    // Get most recent update timestamp
    const { data: latest } = await supabase
      .from('stock_prices')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();
    
    return NextResponse.json({
      success: true,
      priceDate,
      pricesCount: count || 0,
      lastUpdated: latest?.last_updated || null,
    });
    
  } catch (error) {
    console.error('[Price Update API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

