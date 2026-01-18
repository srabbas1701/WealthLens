/**
 * Gold Price Update Service
 * 
 * Fetches daily gold prices (mock for now) and stores them in gold_price_daily table.
 * Recalculates current_value for all gold holdings based on latest price.
 * 
 * This should be run daily via a cron job or scheduled task.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Mock gold price fetching (replace with actual API call later)
async function fetchGoldPrices(): Promise<{ gold_24k: number; gold_22k: number }> {
  // TODO: Replace with actual gold price API (e.g., MCX, NSE, or external API)
  // For now, return mock prices with slight variation
  const basePrice24k = 7000;
  const basePrice22k = 6400;
  
  // Add random variation (±2%)
  const variation = (Math.random() - 0.5) * 0.04;
  
  return {
    gold_24k: Math.round(basePrice24k * (1 + variation)),
    gold_22k: Math.round(basePrice22k * (1 + variation)),
  };
}

// Update gold price for today
async function updateGoldPrice(
  adminClient: ReturnType<typeof createAdminClient>,
  date: string = new Date().toISOString().split('T')[0]
): Promise<{ gold_24k: number; gold_22k: number }> {
  const prices = await fetchGoldPrices();

  const { error } = await adminClient
    .from('gold_price_daily')
    .upsert({
      date,
      gold_24k: prices.gold_24k,
      gold_22k: prices.gold_22k,
      source: 'MOCK', // TODO: Update to actual source when integrating real API
    }, {
      onConflict: 'date',
    });

  if (error) {
    console.error('Error updating gold price:', error);
    throw new Error('Failed to update gold price');
  }

  return prices;
}

// Recalculate current_value for all gold holdings
async function recalculateGoldHoldings(
  adminClient: ReturnType<typeof createAdminClient>,
  gold_22k: number,
  gold_24k: number
): Promise<void> {
  // Fetch all gold holdings
  // First get all gold assets, then get holdings for those assets
  const { data: goldAssets, error: assetsError } = await adminClient
    .from('assets')
    .select('id')
    .eq('asset_type', 'gold');

  if (assetsError || !goldAssets || goldAssets.length === 0) {
    console.log('No gold assets found');
    return;
  }

  const goldAssetIds = goldAssets.map(a => a.id);
  const { data: holdings, error: holdingsError } = await adminClient
    .from('holdings')
    .select('id, quantity, notes')
    .in('asset_id', goldAssetIds);

  if (holdingsError || !holdings) {
    console.error('Error fetching gold holdings:', holdingsError);
    return;
  }

  if (holdings.length === 0) {
    console.log('No gold holdings found to update');
    return;
  }

  // Update each holding's current_value
  const updates = holdings.map(async (holding: any) => {
    const notes = holding.notes ? JSON.parse(holding.notes) : {};
    const quantity = holding.quantity || 0;
    const unitType = notes.unit_type || 'gram';
    const purity = notes.purity || '22k';

    // Determine price based on purity
    let pricePerUnit: number;
    if (unitType === 'unit') {
      // For units (SGB), use 22k price as base
      pricePerUnit = gold_22k;
    } else {
      // For grams, use purity-specific price
      pricePerUnit = purity === '24k' ? gold_24k : gold_22k;
    }

    const currentValue = quantity * pricePerUnit;

    // Update holding
    const { error } = await adminClient
      .from('holdings')
      .update({
        current_value: currentValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', holding.id);

    if (error) {
      console.error(`Error updating holding ${holding.id}:`, error);
    }
  });

  await Promise.all(updates);
  console.log(`Updated current_value for ${holdings.length} gold holdings`);
}

// Recalculate portfolio metrics for portfolios with gold holdings
async function recalculatePortfolioMetrics(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<void> {
  // First get all gold assets, then get holdings for those assets
  const { data: goldAssets, error: assetsError } = await adminClient
    .from('assets')
    .select('id')
    .eq('asset_type', 'gold');

  if (assetsError || !goldAssets || goldAssets.length === 0) {
    return;
  }

  const goldAssetIds = goldAssets.map(a => a.id);
  const { data: holdings, error } = await adminClient
    .from('holdings')
    .select('portfolio_id')
    .in('asset_id', goldAssetIds)
    .not('portfolio_id', 'is', null);

  if (error || !holdings) {
    console.error('Error fetching portfolios:', error);
    return;
  }

  const uniquePortfolioIds = [...new Set(holdings.map((h: any) => h.portfolio_id))];

  // Recalculate metrics for each portfolio
  for (const portfolioId of uniquePortfolioIds) {
    const { data: holdings } = await adminClient
      .from('holdings')
      .select('*, asset:assets(*)')
      .eq('portfolio_id', portfolioId);

    if (!holdings || holdings.length === 0) continue;

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
  }

  console.log(`Updated metrics for ${uniquePortfolioIds.length} portfolios`);
}

// POST: Update gold prices and recalculate holdings
export async function POST(req: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    console.log(`Updating gold prices for ${today}...`);

    // Update gold price
    const prices = await updateGoldPrice(adminClient, today);
    console.log(`Gold prices updated: 24k = ₹${prices.gold_24k}/gram, 22k = ₹${prices.gold_22k}/gram`);

    // Recalculate all gold holdings
    await recalculateGoldHoldings(adminClient, prices.gold_22k, prices.gold_24k);

    // Recalculate portfolio metrics
    await recalculatePortfolioMetrics(adminClient);

    return NextResponse.json({
      success: true,
      date: today,
      prices: {
        gold_24k: prices.gold_24k,
        gold_22k: prices.gold_22k,
      },
      message: 'Gold prices updated and holdings recalculated successfully',
    });
  } catch (error) {
    console.error('Error updating gold prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update gold prices',
      },
      { status: 500 }
    );
  }
}

// GET: Fetch latest gold prices
export async function GET(req: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { data: priceData, error } = await adminClient
      .from('gold_price_daily')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch gold prices' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      price: priceData,
    });
  } catch (error) {
    console.error('Error fetching gold prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gold prices',
      },
      { status: 500 }
    );
  }
}
