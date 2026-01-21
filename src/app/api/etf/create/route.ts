/**
 * API Route: Create ETF Holding
 * 
 * POST /api/etf/create
 * 
 * Creates a new ETF holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchStockPrice } from '@/lib/stock-helpers';
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

// Helper: Create or get ETF asset
async function createOrGetETFAsset(symbol: string, name: string, category: string, supabase: any) {
  // Try to find existing asset
  const { data: existing } = await supabase
    .from('assets')
    .select('id, name')
    .eq('symbol', symbol.toUpperCase())
    .eq('asset_type', 'etf')
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Use new classification system
  // Determine if it's a gold ETF based on name or category
  const isGoldETF = category === 'Gold' || name.toLowerCase().includes('gold');
  const classification = classifyAsset('etf', { isGoldETF });

  // Create new asset
  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      symbol: symbol.toUpperCase(),
      name,
      asset_type: 'etf',
      asset_class: classification.assetClass,
      top_level_bucket: classification.topLevelBucket,
      risk_behavior: classification.riskBehavior,
      valuation_method: classification.valuationMethod,
      risk_bucket: category === 'Debt' ? 'low' : category === 'Gold' ? 'medium' : 'high',
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
    const { name, symbol, category, units, averagePrice, user_id } = body;

    // Validation
    if (!name || !units || !averagePrice) {
      return NextResponse.json(
        { error: 'Missing required fields: name, units, averagePrice' },
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
    const assetSymbol = symbol || name;
    const assetId = await createOrGetETFAsset(assetSymbol, name, category || 'Equity', supabase);

    // Try to fetch current price (ETFs can use stock price API if symbol is available)
    let currentPrice = parseFloat(averagePrice);
    if (symbol) {
      try {
        const fetchedPrice = await fetchStockPrice(symbol);
        if (fetchedPrice > 0) {
          currentPrice = fetchedPrice;
        }
      } catch (error) {
        console.warn('[ETF Create API] Could not fetch price, using averagePrice');
      }
    }
    
    // Calculate values
    const investedValue = parseFloat(units) * parseFloat(averagePrice);
    const currentValue = parseFloat(units) * currentPrice;

    // Create holding
    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity: parseFloat(units),
        average_price: parseFloat(averagePrice),
        invested_value: investedValue,
        current_value: currentValue,
        source: 'manual',
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
      console.error('[ETF Create API] Error creating holding:', holdingError);
      return NextResponse.json(
        { error: 'Failed to create holding' },
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
      allocation: 0, // Will be calculated by portfolio aggregation
    };

    return NextResponse.json(etf, { status: 201 });

  } catch (error: any) {
    console.error('[ETF Create API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
