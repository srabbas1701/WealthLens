/**
 * API Route: Create Stock Holding
 * 
 * POST /api/stocks/create
 * 
 * Creates a new stock holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchStockPrice, fetchStockName } from '@/lib/stock-helpers';
import { classifyAsset } from '@/lib/asset-classification';

// Helper: Get or create user's primary portfolio
async function getPrimaryPortfolio(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (error || !data) {
    // Create primary portfolio if it doesn't exist
    const { data: newPortfolio, error: createError } = await supabase
      .from('portfolios')
      .insert({
        user_id: userId,
        name: 'My Portfolio',
        is_primary: true,
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error('Failed to create portfolio');
    }
    return newPortfolio.id;
  }

  return data.id;
}

// Helper: Create or get stock asset
async function createOrGetStockAsset(symbol: string, supabase: any) {
  // Try to find existing asset
  const { data: existing } = await supabase
    .from('assets')
    .select('id, name')
    .eq('symbol', symbol.toUpperCase())
    .eq('asset_type', 'equity')
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create new asset
  const stockName = await fetchStockName(symbol);
  
  // Use new classification system
  const classification = classifyAsset('equity');
  
  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      symbol: symbol.toUpperCase(),
      name: stockName,
      asset_type: 'equity',
      asset_class: classification.assetClass,
      top_level_bucket: classification.topLevelBucket,
      risk_behavior: classification.riskBehavior,
      valuation_method: classification.valuationMethod,
      risk_bucket: 'high', // Default for stocks
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to create asset');
  }

  return newAsset.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, quantity, avgBuyPrice, purchaseDate, user_id } = body;

    // Validation
    if (!symbol || !quantity || !avgBuyPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, quantity, avgBuyPrice' },
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

    // Get or create portfolio
    const portfolioId = await getPrimaryPortfolio(user_id, supabase);

    // Create or get asset
    const assetId = await createOrGetStockAsset(symbol, supabase);

    // Fetch current stock price
    const currentPrice = await fetchStockPrice(symbol);
    
    // Calculate values
    const investedValue = parseFloat(quantity) * parseFloat(avgBuyPrice);
    const currentValue = parseFloat(quantity) * (currentPrice || parseFloat(avgBuyPrice));

    // Create holding
    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity: parseFloat(quantity),
        average_price: parseFloat(avgBuyPrice),
        invested_value: investedValue,
        current_value: currentValue,
        source: 'manual',
        notes: purchaseDate ? JSON.stringify({ purchase_date: purchaseDate }) : null,
      })
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

    if (holdingError || !holding) {
      console.error('[Stock Create API] Error creating holding:', holdingError);
      return NextResponse.json(
        { error: 'Failed to create holding' },
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
      allocation: 0, // Will be calculated by portfolio aggregation
    };

    return NextResponse.json(stock, { status: 201 });

  } catch (error: any) {
    console.error('[Stock Create API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
