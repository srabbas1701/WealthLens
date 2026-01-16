/**
 * API Route: Update Stock Holding
 * 
 * PUT /api/stocks/update
 * 
 * Updates an existing stock holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchStockPrice } from '@/lib/stock-helpers';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, quantity, avgBuyPrice, purchaseDate, user_id } = body;

    // Validation
    if (!id || !quantity || !avgBuyPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: id, quantity, avgBuyPrice' },
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
    const investedValue = parseFloat(quantity) * parseFloat(avgBuyPrice);

    // Fetch current price
    const symbol = existingHolding.assets.symbol;
    const currentPrice = await fetchStockPrice(symbol);
    const currentValue = parseFloat(quantity) * (currentPrice || parseFloat(avgBuyPrice));

    // Update holding
    const updateData: any = {
      quantity: parseFloat(quantity),
      average_price: parseFloat(avgBuyPrice),
      invested_value: investedValue,
      current_value: currentValue,
      updated_at: new Date().toISOString(),
    };

    // Update notes if purchase date provided
    if (purchaseDate) {
      updateData.notes = JSON.stringify({ purchase_date: purchaseDate });
    }

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
      console.error('[Stock Update API] Error updating holding:', updateError);
      return NextResponse.json(
        { error: 'Failed to update holding' },
        { status: 500 }
      );
    }

    // Calculate P&L
    const pl = currentValue - investedValue;
    const plPercentage = investedValue > 0 ? (pl / investedValue) * 100 : 0;

    // Format response
    const stock = {
      id: holding.id,
      symbol: holding.assets.symbol,
      name: holding.assets.name,
      quantity: holding.quantity,
      avgBuyPrice: holding.average_price,
      investedValue: holding.invested_value,
      currentPrice: currentPrice || parseFloat(avgBuyPrice),
      currentValue: holding.current_value,
      pl: pl,
      plPercentage: plPercentage,
      allocation: 0, // Will be recalculated by portfolio aggregation
    };

    return NextResponse.json(stock, { status: 200 });

  } catch (error: any) {
    console.error('[Stock Update API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
