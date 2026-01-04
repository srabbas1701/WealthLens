/**
 * POST /api/investments/manual
 * 
 * Handles manual investment entry for non-market instruments:
 * - Fixed Deposits (FD)
 * - Bonds / Debentures
 * - Gold (SGB / Physical / ETF)
 * - Cash / Savings
 * 
 * DESIGN PRINCIPLES:
 * ==================
 * - quantity = 1 for all manual instruments (not tradeable)
 * - invested_value = entered amount (user-provided)
 * - current_value = invested_value (MVP - no market sync)
 * - Asset-specific metadata stored in notes (JSON)
 * - Risk buckets assigned automatically
 * - Handles both create (new) and update (edit) operations
 * - Recomputes portfolio metrics after save
 * - Regenerates portfolio insights
 * 
 * CALCULATION RULES (NON-NEGOTIABLE):
 * ===================================
 * 1. invested_value = quantity × average_price (even for qty=1)
 * 2. All metrics recomputed from holdings after save
 * 3. Portfolio total = SUM(invested_value) of all holdings
 * 4. Allocation percentages must sum to 100%
 * 
 * NO TRADING LANGUAGE - This is for understanding, not execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  calculateInvestedValue,
  calculatePortfolioMetrics,
  getAssetClass,
  formatIndianCurrency,
} from '@/lib/portfolio-calculations';

// ============================================================================
// TYPES
// ============================================================================

interface ManualInvestmentRequest {
  user_id: string;
  portfolio_id?: string;
  form_data: {
    assetType: 'fd' | 'bond' | 'gold' | 'cash';
    // FD fields
    fdInstitution?: string;
    fdPrincipal?: number;
    fdRate?: number;
    fdStartDate?: string;
    fdMaturityDate?: string;
    // Bond fields
    bondIssuer?: string;
    bondAmount?: number;
    bondCouponRate?: number;
    bondCouponFrequency?: string;
    bondMaturityDate?: string;
    // Gold fields
    goldType?: 'sgb' | 'physical' | 'etf';
    goldAmount?: number;
    goldPurchaseDate?: string;
    // Cash fields
    cashAccountType?: string;
    cashAmount?: number;
  };
  editing_holding_id?: string;
}

interface ManualInvestmentResponse {
  success: boolean;
  error?: string;
  holding_id?: string;
  asset_id?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get or create user's primary portfolio
 */
async function getOrCreatePortfolio(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string> {
  // Check if portfolio exists
  const { data: existing } = await adminClient
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create primary portfolio
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

/**
 * Get risk bucket for asset type
 */
function getRiskBucket(assetType: string): 'low' | 'medium' | 'high' {
  switch (assetType) {
    case 'fd':
    case 'cash':
      return 'low';
    case 'bond':
    case 'gold':
      return 'medium';
    default:
      return 'medium';
  }
}

/**
 * Create asset for manual investment
 */
async function createAsset(
  adminClient: ReturnType<typeof createAdminClient>,
  assetType: string,
  assetName: string,
  metadata: Record<string, unknown>
): Promise<string> {
  const { data: asset, error } = await adminClient
    .from('assets')
    .insert({
      name: assetName,
      symbol: assetName.slice(0, 10).toUpperCase().replace(/\s+/g, ''),
      asset_type: assetType,
      asset_class: getAssetClass(assetType),
      risk_bucket: getRiskBucket(assetType),
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating asset:', error);
    throw new Error('Failed to create asset');
  }

  return asset.id;
}

/**
 * Create or update holding
 * 
 * CALCULATION: invested_value = quantity × average_price
 * For manual investments: quantity = 1, average_price = investedValue
 */
async function upsertHolding(
  adminClient: ReturnType<typeof createAdminClient>,
  portfolioId: string,
  assetId: string,
  investedValue: number,
  notes: string,
  editingHoldingId?: string
): Promise<string> {
  // For manual investments: qty=1, price=value
  const quantity = 1;
  const averagePrice = investedValue;
  const computedInvestedValue = calculateInvestedValue(quantity, averagePrice);
  
  // For equity holdings, get current price from stored prices
  // Never default to avg_buy_price for equity
  let currentValue: number | null = null;
  const asset = await adminClient
    .from('assets')
    .select('asset_type, symbol')
    .eq('id', assetId)
    .single();
  
  if (asset.data?.asset_type === 'equity' && asset.data?.symbol) {
    const priceData = await getStockPrice(asset.data.symbol);
    if (priceData && priceData.price) {
      currentValue = quantity * priceData.price;
      console.log(`[Manual Investment] Using stored price for ${asset.data.symbol}: ₹${priceData.price} (Yahoo EOD: ${priceData.priceDate})`);
    } else {
      // No price available - set to null, will be updated by price update job
      // Do NOT use avg_buy_price as fallback
      console.warn(`[Manual Investment] No price data for ${asset.data.symbol}, current_value will be null until price update`);
      currentValue = null;
    }
  } else {
    // For non-equity, current_value = invested_value (no market pricing)
    currentValue = computedInvestedValue;
  }

  if (editingHoldingId) {
    // Update existing holding
    const { data: updated, error } = await adminClient
      .from('holdings')
      .update({
        quantity: quantity,
        average_price: averagePrice,
        invested_value: computedInvestedValue,
        current_value: currentValue,
        notes: notes,
        source: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingHoldingId)
      .select('id')
      .single();

    if (error) {
      console.error('Error updating holding:', error);
      throw new Error('Failed to update holding');
    }

    console.log(`Updated holding: ${formatIndianCurrency(computedInvestedValue)}`);
    return updated.id;
  } else {
    // Insert new holding
    const { data: created, error } = await adminClient
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity: quantity,
        average_price: averagePrice,
        invested_value: computedInvestedValue,
        current_value: currentValue,
        notes: notes,
        source: 'manual',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating holding:', error);
      throw new Error('Failed to create holding');
    }

    console.log(`Created holding: ${formatIndianCurrency(computedInvestedValue)}`);
    return created.id;
  }
}

/**
 * Recalculate portfolio metrics
 * 
 * ENSURES:
 * - Total = SUM(invested_value) from all holdings
 * - Allocation percentages sum to 100%
 * - Metrics consistent with holdings table
 */
async function recalculateMetrics(
  adminClient: ReturnType<typeof createAdminClient>,
  portfolioId: string
): Promise<void> {
  console.log('\n=== Recalculating Portfolio Metrics ===');

  // Fetch all holdings for this portfolio
  const { data: holdings, error: holdingsError } = await adminClient
    .from('holdings')
    .select('*, asset:assets(*)')
    .eq('portfolio_id', portfolioId);

  if (holdingsError || !holdings) {
    console.error('Error fetching holdings:', holdingsError);
    return;
  }

  if (holdings.length === 0) {
    console.log('No holdings found, skipping metrics calculation');
    return;
  }

  // Calculate metrics using centralized calculator
  const holdingsForMetrics = holdings.map((h: any) => ({
    invested_value: h.invested_value || 0,
    asset_type: h.asset?.asset_type || 'other',
    name: h.asset?.name || 'Unknown',
  }));

  const metrics = calculatePortfolioMetrics(holdingsForMetrics);

  console.log('Calculated metrics:');
  console.log(`  Total Value: ${formatIndianCurrency(metrics.totalInvestedValue)}`);
  console.log(`  Equity: ${metrics.equityPct.toFixed(1)}%`);
  console.log(`  Debt: ${metrics.debtPct.toFixed(1)}%`);
  console.log(`  Gold: ${metrics.goldPct.toFixed(1)}%`);
  console.log(`  Risk Score: ${metrics.riskScore} (${metrics.riskLabel})`);

  // Upsert metrics
  const { error: metricsError } = await adminClient
    .from('portfolio_metrics')
    .upsert({
      portfolio_id: portfolioId,
      equity_pct: metrics.equityPct,
      debt_pct: metrics.debtPct,
      gold_pct: metrics.goldPct,
      cash_pct: metrics.cashPct,
      hybrid_pct: metrics.hybridPct,
      risk_score: metrics.riskScore,
      risk_label: metrics.riskLabel,
      diversification_score: metrics.diversificationScore,
      concentration_score: Math.round(metrics.topHoldingPct),
      top_holding_pct: metrics.topHoldingPct,
      goal_alignment: 'On Track' as const,
      goal_progress_pct: 75,
      last_calculated: new Date().toISOString(),
    });

  if (metricsError) {
    console.error('Error updating metrics:', metricsError);
  }

  // Update portfolio total value
  const { error: portfolioError } = await adminClient
    .from('portfolios')
    .update({
      total_value: metrics.totalInvestedValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', portfolioId);

  if (portfolioError) {
    console.error('Error updating portfolio total:', portfolioError);
  } else {
    console.log(`Portfolio total updated: ${formatIndianCurrency(metrics.totalInvestedValue)}`);
  }
}

/**
 * Generate portfolio insights
 */
async function generateInsights(
  adminClient: ReturnType<typeof createAdminClient>,
  portfolioId: string
): Promise<void> {
  // Deactivate old insights
  await adminClient
    .from('portfolio_insights')
    .update({ is_active: false })
    .eq('portfolio_id', portfolioId)
    .in('insight_type', ['concentration', 'diversification', 'general']);

  // Fetch metrics
  const { data: metrics } = await adminClient
    .from('portfolio_metrics')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .single();

  if (!metrics) return;

  const insights: Array<{
    portfolio_id: string;
    insight_type: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    summary: string;
  }> = [];

  // Concentration insight
  if (metrics.top_holding_pct && metrics.top_holding_pct > 25) {
    insights.push({
      portfolio_id: portfolioId,
      insight_type: 'concentration',
      severity: metrics.top_holding_pct > 40 ? 'high' : 'medium',
      title: 'Portfolio concentration noted',
      summary: `Your largest holding represents ${Math.round(metrics.top_holding_pct)}% of your portfolio.`,
    });
  }

  // Success insight
  insights.push({
    portfolio_id: portfolioId,
    insight_type: 'general',
    severity: 'low',
    title: 'Investment added successfully',
    summary: 'Your portfolio has been updated with the new investment.',
  });

  if (insights.length > 0) {
    await adminClient.from('portfolio_insights').insert(insights);
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  console.log('\n========================================');
  console.log('Manual Investment Entry');
  console.log('========================================');

  try {
    const body: ManualInvestmentRequest = await req.json();
    const { user_id, portfolio_id, form_data, editing_holding_id } = body;

    if (!user_id || !form_data) {
      return NextResponse.json<ManualInvestmentResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get or create portfolio
    const portfolioId = portfolio_id || (await getOrCreatePortfolio(adminClient, user_id));

    // Determine asset type and values based on form_data.assetType
    let assetType = 'other';
    let assetName = 'Investment';
    let investedValue = 0;
    let metadata: Record<string, unknown> = {};

    switch (form_data.assetType) {
      case 'fd':
        assetType = 'fd';
        assetName = form_data.fdInstitution || 'Fixed Deposit';
        investedValue = form_data.fdPrincipal || 0;
        metadata = {
          institution: form_data.fdInstitution,
          principal: form_data.fdPrincipal,
          interest_rate: form_data.fdRate,
          start_date: form_data.fdStartDate,
          maturity_date: form_data.fdMaturityDate,
        };
        break;

      case 'bond':
        assetType = 'bond';
        assetName = form_data.bondIssuer || 'Bond';
        investedValue = form_data.bondAmount || 0;
        metadata = {
          issuer: form_data.bondIssuer,
          coupon_rate: form_data.bondCouponRate,
          coupon_frequency: form_data.bondCouponFrequency,
          maturity_date: form_data.bondMaturityDate,
        };
        break;

      case 'gold':
        assetType = 'gold';
        assetName = `Gold (${form_data.goldType || 'Other'})`;
        investedValue = form_data.goldAmount || 0;
        metadata = {
          type: form_data.goldType,
          purchase_date: form_data.goldPurchaseDate,
        };
        break;

      case 'cash':
        assetType = 'cash';
        assetName = form_data.cashAccountType || 'Cash';
        investedValue = form_data.cashAmount || 0;
        metadata = {
          account_type: form_data.cashAccountType,
        };
        break;

      default:
        return NextResponse.json<ManualInvestmentResponse>(
          { success: false, error: 'Invalid asset type' },
          { status: 400 }
        );
    }

    console.log(`Processing ${assetType}: ${assetName} - ${formatIndianCurrency(investedValue)}`);

    // Create or find asset
    let assetId: string;

    if (editing_holding_id) {
      // For edits, fetch the existing asset
      const { data: holding } = await adminClient
        .from('holdings')
        .select('asset_id')
        .eq('id', editing_holding_id)
        .single();

      if (!holding) {
        return NextResponse.json<ManualInvestmentResponse>(
          { success: false, error: 'Holding not found' },
          { status: 404 }
        );
      }

      assetId = holding.asset_id;

      // Update asset name if changed
      await adminClient
        .from('assets')
        .update({ name: assetName })
        .eq('id', assetId);
    } else {
      // Create new asset
      assetId = await createAsset(adminClient, assetType, assetName, metadata);
    }

    // Create notes JSON for metadata storage
    const notes = JSON.stringify(metadata);

    // Upsert holding
    const holdingId = await upsertHolding(
      adminClient,
      portfolioId,
      assetId,
      investedValue,
      notes,
      editing_holding_id
    );

    // Recalculate metrics and regenerate insights
    await recalculateMetrics(adminClient, portfolioId);
    await generateInsights(adminClient, portfolioId);

    console.log('Manual investment saved successfully');

    return NextResponse.json<ManualInvestmentResponse>({
      success: true,
      holding_id: holdingId,
      asset_id: assetId,
    });
  } catch (error) {
    console.error('Manual investment error:', error);
    return NextResponse.json<ManualInvestmentResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save investment',
      },
      { status: 500 }
    );
  }
}
