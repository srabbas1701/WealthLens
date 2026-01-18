/**
 * API Route: Search Stocks
 * 
 * GET /api/stocks/search?q={query}
 * 
 * Searches for stocks by name or symbol for autocomplete functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { results: [] },
        { status: 200 }
      );
    }

    const supabase = createAdminClient();

    // Search by name or symbol (case-insensitive)
    // Use or() with proper Supabase syntax - % wildcards must be in the filter string
    const { data: assets, error } = await supabase
      .from('assets')
      .select('symbol, name, asset_type')
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .eq('asset_type', 'equity')
      .eq('is_active', true)
      .limit(10)
      .order('name', { ascending: true });

    if (error) {
      console.error('[Stock Search API] Error searching stocks:', error);
      return NextResponse.json(
        { error: 'Failed to search stocks' },
        { status: 500 }
      );
    }

    // Format results
    const results = (assets || []).map((asset) => {
      // Extract exchange from symbol if present (e.g., "NSE:HDFCBANK" -> "NSE")
      const symbolParts = asset.symbol.split(':');
      const exchange = symbolParts.length > 1 ? symbolParts[0] : 'NSE';
      const symbol = symbolParts.length > 1 ? symbolParts[1] : asset.symbol;

      return {
        symbol: asset.symbol, // Full symbol with exchange prefix
        name: asset.name,
        exchange: exchange,
        type: 'equity',
      };
    });

    return NextResponse.json(
      { results },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Stock Search API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
