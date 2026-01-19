/**
 * Gold Holdings API
 * 
 * Handles CRUD operations for gold holdings:
 * - POST: Create new gold holding
 * - PUT: Update existing gold holding
 * - DELETE: Delete gold holding
 * - GET: Fetch all gold holdings for user
 * 
 * Supports 4 gold types: SGB, Physical Gold, Gold ETF, Digital Gold
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface GoldHoldingRequest {
  user_id: string;
  holding_id?: string; // For updates/deletes
  gold_type: 'sgb' | 'physical' | 'etf' | 'digital';
  invested_amount: number;
  quantity: number;
  unit_type: 'gram' | 'unit';
  purchase_date: string;
  // SGB fields
  series_name?: string;
  issue_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  // Physical Gold fields
  form?: 'jewellery' | 'coin' | 'bar';
  purity?: string;
  gross_weight?: number;
  net_weight?: number;
  making_charges?: number;
  // Gold ETF fields
  etf_name?: string;
  isin?: string;
  exchange?: string;
  // Digital Gold fields
  platform?: string;
  provider?: string;
  vaulted?: boolean;
}

// Get current gold price (mock for now)
async function getCurrentGoldPrice(purity: string = '22k'): Promise<number> {
  try {
    const adminClient = createAdminClient();
    const { data: priceData } = await adminClient
      .from('gold_price_daily')
      .select('gold_24k, gold_22k')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (priceData) {
      return purity === '24k' ? priceData.gold_24k : priceData.gold_22k;
    }
  } catch (error) {
    console.error('Error fetching gold price:', error);
  }
  
  // Fallback to mock prices
  return purity === '24k' ? 7000 : 6400;
}

// Get or create user's primary portfolio
async function getOrCreatePortfolio(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string> {
  const { data: existing } = await adminClient
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data: portfolio, error } = await adminClient
    .from('portfolios')
    .insert({
      user_id: userId,
      name: 'My Portfolio',
      is_primary: true,
      total_value: 0,
      currency: 'INR',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating portfolio:', error);
    throw new Error('Failed to create portfolio');
  }

  return portfolio.id;
}

// Create asset name from gold type and metadata
function createAssetName(goldType: string, metadata: any): string {
  switch (goldType) {
    case 'sgb':
      return `SGB ${metadata.series_name || 'Series'}`;
    case 'physical':
      return `Physical Gold (${metadata.form || 'Gold'})`;
    case 'etf':
      return metadata.etf_name || 'Gold ETF';
    case 'digital':
      return `Digital Gold (${metadata.platform || 'Platform'})`;
    default:
      return 'Gold Holding';
  }
}

/**
 * Calculate current value based on gold type using IBJA rates
 * 
 * Uses centralized gold pricing service for proper valuation:
 * - SGB: 24K IBJA rate
 * - Physical: Purity-specific IBJA rate, net weight only
 * - Digital: 24K IBJA rate
 * - ETF: NAV from exchange (not IBJA)
 */
async function calculateCurrentValue(
  goldType: string,
  quantity: number,
  unitType: string,
  metadata: any
): Promise<number> {
  // Gold ETF: Skip IBJA calculation (uses NAV from exchange)
  if (goldType === 'etf') {
    // ETF valuation is handled via stock prices API
    // For now, use invested amount as placeholder
    return metadata.invested_amount || 0;
  }
  
  // Fetch latest IBJA rates
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = createAdminClient();
  
  const { data: goldPriceData, error } = await adminClient
    .from('gold_price_daily')
    .select('gold_24k, gold_22k, date, source, session')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !goldPriceData) {
    console.warn('[Gold Holdings API] No IBJA rates found, using invested amount');
    return metadata.invested_amount || 0;
  }
  
  // Import gold pricing service
  const { calculateGoldCurrentValue } = await import('@/services/goldPricingService');
  
  // Create IBJA rates object
  const ibjaRates = {
    date: goldPriceData.date,
    gold_24k: goldPriceData.gold_24k,
    gold_22k: goldPriceData.gold_22k,
    source: 'IBJA' as const,
    session: (goldPriceData.session as 'AM' | 'PM') || 'AM',
    last_updated: new Date().toISOString(),
  };
  
  // Calculate using centralized service
  return calculateGoldCurrentValue(
    {
      goldType: goldType as 'sgb' | 'physical' | 'digital',
      quantity,
      unitType: unitType as 'gram' | 'unit',
      purity: metadata.purity,
      netWeight: metadata.net_weight,
    },
    ibjaRates
  );
}

// POST: Create new gold holding
export async function POST(req: NextRequest) {
  try {
    const body: GoldHoldingRequest = await req.json();
    const {
      user_id,
      gold_type,
      invested_amount,
      quantity,
      unit_type,
      purchase_date,
      series_name,
      issue_date,
      maturity_date,
      interest_rate,
      form,
      purity,
      gross_weight,
      net_weight,
      making_charges,
      etf_name,
      isin,
      exchange,
      platform,
      provider,
      vaulted,
    } = body;

    if (!user_id || !gold_type || !invested_amount || !quantity || !purchase_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get or create portfolio
    const portfolioId = await getOrCreatePortfolio(adminClient, user_id);

    // Prepare metadata
    const metadata: any = {
      gold_type,
      unit_type,
      purchase_date,
      purity: purity || '22k',
    };

    // Add type-specific metadata
    if (gold_type === 'sgb') {
      metadata.series_name = series_name;
      metadata.issue_date = issue_date;
      metadata.maturity_date = maturity_date;
      metadata.interest_rate = interest_rate || 2.5;
    } else if (gold_type === 'physical') {
      metadata.form = form || 'jewellery';
      metadata.purity = purity || '22k';
      metadata.gross_weight = gross_weight;
      metadata.net_weight = net_weight;
      metadata.making_charges = making_charges;
    } else if (gold_type === 'etf') {
      metadata.etf_name = etf_name;
      metadata.isin = isin;
      metadata.exchange = exchange || 'NSE';
    } else if (gold_type === 'digital') {
      metadata.platform = platform;
      metadata.provider = provider;
      metadata.vaulted = vaulted || false;
    }

    // Create asset
    const assetName = createAssetName(gold_type, metadata);
    const { data: asset, error: assetError } = await adminClient
      .from('assets')
      .insert({
        name: assetName,
        symbol: assetName.slice(0, 10).toUpperCase().replace(/\s+/g, ''),
        asset_type: 'gold',
        asset_class: 'gold',
        risk_bucket: 'medium',
        is_active: true,
      })
      .select('id')
      .single();

    if (assetError) {
      console.error('Error creating asset:', assetError);
      return NextResponse.json(
        { success: false, error: 'Failed to create asset' },
        { status: 500 }
      );
    }

    // Calculate current value
    const currentValue = await calculateCurrentValue(gold_type, quantity, unit_type, metadata);

    // Create holding
    const { data: holding, error: holdingError } = await adminClient
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: asset.id,
        quantity: quantity,
        average_price: invested_amount / quantity,
        invested_value: invested_amount,
        current_value: currentValue,
        notes: JSON.stringify(metadata),
        source: 'manual',
      })
      .select('id')
      .single();

    if (holdingError) {
      console.error('Error creating holding:', holdingError);
      return NextResponse.json(
        { success: false, error: 'Failed to create holding' },
        { status: 500 }
      );
    }

    // Recalculate portfolio metrics (async - don't wait)
    recalculateMetrics(adminClient, portfolioId).catch(err => {
      console.error('Error recalculating metrics:', err);
    });

    return NextResponse.json({
      success: true,
      holding_id: holding.id,
      asset_id: asset.id,
    });
  } catch (error) {
    console.error('Error creating gold holding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create gold holding',
      },
      { status: 500 }
    );
  }
}

// PUT: Update existing gold holding
export async function PUT(req: NextRequest) {
  try {
    const body: GoldHoldingRequest = await req.json();
    const { holding_id, user_id, gold_type, invested_amount, quantity, unit_type, purchase_date, ...metadata } = body;

    if (!holding_id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify holding belongs to user
    const { data: holding } = await adminClient
      .from('holdings')
      .select(`
        id,
        portfolio_id,
        asset_id,
        portfolio:portfolios!inner(user_id)
      `)
      .eq('id', holding_id)
      .single();

    if (!holding || (holding.portfolio as any).user_id !== user_id) {
      return NextResponse.json(
        { success: false, error: 'Holding not found' },
        { status: 404 }
      );
    }

    // Update metadata
    const fullMetadata: any = {
      gold_type,
      unit_type,
      purchase_date,
      ...metadata,
    };

    // Update asset name if changed
    const assetName = createAssetName(gold_type || 'gold', metadata);
    await adminClient
      .from('assets')
      .update({ name: assetName })
      .eq('id', holding.asset_id);

    // Calculate current value
    const currentValue = await calculateCurrentValue(
      gold_type || 'gold',
      quantity || 0,
      unit_type || 'gram',
      fullMetadata
    );

    // Update holding
    const { error: updateError } = await adminClient
      .from('holdings')
      .update({
        quantity: quantity,
        average_price: invested_amount && quantity ? invested_amount / quantity : undefined,
        invested_value: invested_amount,
        current_value: currentValue,
        notes: JSON.stringify(fullMetadata),
        updated_at: new Date().toISOString(),
      })
      .eq('id', holding_id);

    if (updateError) {
      console.error('Error updating holding:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update holding' },
        { status: 500 }
      );
    }

    // Recalculate portfolio metrics
    recalculateMetrics(adminClient, holding.portfolio_id as string).catch(err => {
      console.error('Error recalculating metrics:', err);
    });

    return NextResponse.json({
      success: true,
      holding_id: holding_id,
    });
  } catch (error) {
    console.error('Error updating gold holding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update gold holding',
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete gold holding
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const holding_id = searchParams.get('holding_id');
    const user_id = searchParams.get('user_id');

    if (!holding_id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify holding belongs to user
    const { data: holding } = await adminClient
      .from('holdings')
      .select(`
        id,
        portfolio_id,
        portfolio:portfolios!inner(user_id)
      `)
      .eq('id', holding_id)
      .single();

    if (!holding || (holding.portfolio as any).user_id !== user_id) {
      return NextResponse.json(
        { success: false, error: 'Holding not found' },
        { status: 404 }
      );
    }

    // Delete holding
    const { error: deleteError } = await adminClient
      .from('holdings')
      .delete()
      .eq('id', holding_id);

    if (deleteError) {
      console.error('Error deleting holding:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete holding' },
        { status: 500 }
      );
    }

    // Recalculate portfolio metrics
    recalculateMetrics(adminClient, holding.portfolio_id as string).catch(err => {
      console.error('Error recalculating metrics:', err);
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting gold holding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete gold holding',
      },
      { status: 500 }
    );
  }
}

// Recalculate portfolio metrics
async function recalculateMetrics(
  adminClient: ReturnType<typeof createAdminClient>,
  portfolioId: string
): Promise<void> {
  try {
    const { data: holdings } = await adminClient
      .from('holdings')
      .select('*, asset:assets(*)')
      .eq('portfolio_id', portfolioId);

    if (!holdings || holdings.length === 0) {
      return;
    }

    // Calculate totals by asset class
    let totalValue = 0;
    let goldValue = 0;

    holdings.forEach((h: any) => {
      const currentValue = h.current_value || 0;
      totalValue += currentValue;

      if (h.asset?.asset_class === 'gold') {
        goldValue += currentValue;
      }
    });

    const goldPct = totalValue > 0 ? (goldValue / totalValue) * 100 : 0;

    // Update portfolio metrics
    await adminClient
      .from('portfolio_metrics')
      .upsert({
        portfolio_id: portfolioId,
        gold_pct: goldPct,
        last_calculated: new Date().toISOString(),
      });

    // Update portfolio total
    await adminClient
      .from('portfolios')
      .update({
        total_value: totalValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId);
  } catch (error) {
    console.error('Error recalculating metrics:', error);
  }
}
