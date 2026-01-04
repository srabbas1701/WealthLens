/**
 * Stock Price Update API
 * 
 * POST /api/stocks/prices/update
 * 
 * Updates stock prices for a list of NSE symbols.
 * This endpoint should be called once per day (via cron job or scheduled task).
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * 1. Only updates prices if today's price is missing
 * 2. Uses previous trading day closing price
 * 3. Does NOT block if some prices fail to update
 * 4. Logs all operations for observability
 * 
 * USAGE:
 * ======
 * - Can be called manually for testing
 * - Should be scheduled via cron (e.g., daily at 6 PM IST after market close)
 * - Can be triggered by portfolio data API if prices are missing
 * 
 * REQUEST BODY (optional):
 * {
 *   "symbols": ["RELIANCE", "TCS", "INFY"]  // Optional: if not provided, fetches all unique symbols from holdings
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { updateStockPrices, getPreviousTradingDay } from '@/lib/stock-prices';

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
  try {
    const startTime = Date.now();
    const priceDate = getPreviousTradingDay();
    
    console.log(`[Price Update API] Starting Yahoo Finance EOD price update for date: ${priceDate}`);
    
    // Parse request body (optional)
    let symbolsToUpdate: string[] = [];
    try {
      const body: UpdatePricesRequest = await request.json().catch(() => ({}));
      symbolsToUpdate = body.symbols || [];
    } catch {
      // Body is optional
    }
    
    // If no symbols provided, get all unique stock symbols from holdings
    if (symbolsToUpdate.length === 0) {
      const supabase = createAdminClient();
      
      // Get all equity holdings with symbols
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select(`
          assets!inner (
            symbol,
            asset_type
          )
        `)
        .eq('assets.asset_type', 'equity')
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
        console.log(`[Price Update API] Found ${symbolsToUpdate.length} unique stock symbols from holdings:`, symbolsToUpdate.slice(0, 10));
      }
    }
    
    if (symbolsToUpdate.length === 0) {
      return NextResponse.json<UpdatePricesResponse>({
        success: true,
        priceDate,
        updated: 0,
        failed: 0,
        results: [],
      });
    }
    
    // Update prices
    const results = await updateStockPrices(symbolsToUpdate);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const duration = Date.now() - startTime;
    
    console.log(`[Price Update API] Yahoo Finance EOD update complete in ${duration}ms: ${successCount} succeeded, ${failureCount} failed`);
    console.log(`[Price Update API] Price date used: ${priceDate} (Yahoo EOD)`);
    
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
    return NextResponse.json<UpdatePricesResponse>(
      {
        success: false,
        priceDate: getPreviousTradingDay(),
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
    const priceDate = getPreviousTradingDay();
    
    // Get count of prices for today
    const { count } = await supabase
      .from('stock_prices')
      .select('*', { count: 'exact', head: true })
      .eq('price_date', priceDate);
    
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

