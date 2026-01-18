/**
 * API Route: Update ETF Holding
 * 
 * PUT /api/etf/update
 * 
 * Updates an existing ETF holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchStockPrice } from '@/lib/stock-helpers';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, units, averagePrice, user_id } = body;

    // Validation
    if (!id || !units || !averagePrice) {
      return NextResponse.json(
        { error: 'Missing required fields: id, units, averagePrice' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // First, verify the holding exists and belongs to the user
    const { data: existingHolding, error: fetchError } = await supabase
      .from('holdings')
      .select(`
        *,
        portfolios!inner (
          user_id
        ),
        assets (
          id,
          symbol,
          name,
          asset_type
        )
      `)
      .eq('id', id)
      .eq('portfolios.user_id', user_id)
      .single();

    if (fetchError || !existingHolding) {
      return NextResponse.json(
        { error: 'Holding not found or unauthorized' },
        { status: 404 }
      );
    }

    // Calculate new invested value
    const investedValue = parseFloat(units) * parseFloat(averagePrice);

    // Fetch current price
    const symbol = existingHolding.assets.symbol;
    let currentPrice = parseFloat(averagePrice);
    if (symbol) {
      try {
        const fetchedPrice = await fetchStockPrice(symbol);
        if (fetchedPrice > 0) {
          currentPrice = fetchedPrice;
        }
      } catch (error) {
        // Use averagePrice if fetch fails
        currentPrice = parseFloat(averagePrice);
      }
    }
    
    const currentValue = parseFloat(units) * currentPrice;

    // Update holding
    const updateData: any = {
      quantity: parseFloat(units),
      average_price: parseFloat(averagePrice),
      invested_value: investedValue,
      current_value: currentValue,
      updated_at: new Date().toISOString(),
    };

    const { data: holding, error: updateError } = await supabase
      .from('holdings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assets (
          id,
          symbol,
          name,
          asset_type
        )
      `)
      .single();

    if (updateError || !holding) {
      console.error('[ETF Update API] Error updating holding:', updateError);
      return NextResponse.json(
        { error: 'Failed to update holding' },
        { status: 500 }
      );
    }

    // Format response
    const etf = {
      id: holding.id,
      symbol: holding.assets.symbol,
      name: holding.assets.name,
      units: holding.quantity,
      averagePrice: holding.average_price,
      investedValue: holding.invested_value,
      currentValue: holding.current_value,
      allocation: 0, // Will be recalculated by portfolio aggregation
    };

    return NextResponse.json(etf, { status: 200 });

  } catch (error: any) {
    console.error('[ETF Update API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
