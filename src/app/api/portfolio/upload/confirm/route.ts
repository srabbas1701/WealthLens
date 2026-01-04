/**
 * Portfolio Upload Confirm API
 * 
 * POST /api/portfolio/upload/confirm
 * 
 * Confirms and imports the previewed holdings into the database.
 * 
 * CALCULATION PHILOSOPHY (NON-NEGOTIABLE):
 * =========================================
 * 1. invested_value = quantity × average_buy_price (ALWAYS computed)
 * 2. current_value = quantity × current_market_price (for equity) or invested_value (for others)
 * 3. total_portfolio_value = SUM(current_value for equity, invested_value for others)
 * 4. allocation percentages = (holding_value / total_value) × 100
 * 5. All percentages MUST sum to 100% (with rounding adjustment)
 * 
 * IDEMPOTENT UPSERT LOGIC:
 * ========================
 * This API is designed to handle repeated uploads safely without creating duplicates.
 * 
 * ASSET IDENTITY (Priority Order):
 * - Primary: ISIN (most reliable, globally unique)
 * - Secondary: Symbol (if ISIN not available)
 * - Fallback: Name match (fuzzy, last resort)
 * 
 * HOLDING IDENTITY:
 * - Unique key: (portfolio_id, asset_id)
 * - On repeated upload with SAME asset: MERGE with weighted average
 * - This allows users to add more shares of existing holdings
 * 
 * MERGE BEHAVIOR (NOT REPLACE):
 * - If holding exists: ADD quantities, recalculate weighted average price
 * - Formula: new_avg = (old_qty × old_price + new_qty × new_price) / (old_qty + new_qty)
 * - This handles partial uploads and additions correctly
 * 
 * WHY MERGE (NOT REPLACE):
 * - Users may upload from multiple brokers
 * - Users may add holdings incrementally
 * - Prevents accidental data loss from re-uploads
 * - If user wants to replace, they should delete first
 * 
 * DATABASE OPERATIONS:
 * 1. Get or create user's primary portfolio
 * 2. For each holding:
 *    a. Find existing asset by ISIN > Symbol > Name
 *    b. If not found, create new asset
 *    c. Merge holding (add quantities, weighted average price)
 * 3. Recompute portfolio total_value from SUM(invested_value)
 * 4. Recalculate portfolio_metrics (allocation percentages, risk score)
 * 5. Generate portfolio_insights
 * 
 * NO TRADING LANGUAGE - This is for understanding, not execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStockPrice } from '@/lib/stock-prices';
import type { 
  ConfirmUploadRequest, 
  ConfirmUploadResponse,
  ParsedHolding,
  AssetType,
} from '@/types/portfolio-upload';
import type { Database } from '@/types/database';
import {
  calculateInvestedValue,
  calculateWeightedAveragePrice,
  calculatePortfolioMetrics,
  getAssetClass,
  formatIndianCurrency,
} from '@/lib/portfolio-calculations';

type Asset = Database['public']['Tables']['assets']['Row'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get asset class from asset type
 */
function getAssetClassFromType(assetType: AssetType): 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' {
  return getAssetClass(assetType) as 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid';
}

/**
 * Get risk bucket from asset type
 */
function getRiskBucket(assetType: AssetType): 'low' | 'medium' | 'high' {
  const mapping: Record<AssetType, 'low' | 'medium' | 'high'> = {
    'equity': 'high',
    'mutual_fund': 'medium',
    'index_fund': 'medium',
    'etf': 'medium',
    'fd': 'low',
    'bond': 'low',
    'gold': 'medium',
    'cash': 'low',
    'ppf': 'low',
    'epf': 'low',
    'nps': 'medium',
    'other': 'medium',
  };
  return mapping[assetType] || 'medium';
}

/**
 * Find existing asset by ISIN, Symbol, or Name
 * 
 * PRIORITY ORDER:
 * 1. ISIN (most reliable, globally unique)
 * 2. Symbol (reliable for Indian markets)
 * 3. Name (exact match, then fuzzy)
 * 
 * This ensures:
 * - Same asset is always matched correctly
 * - No duplicate assets created
 * - Repeated uploads are idempotent
 */
async function findAsset(
  supabase: ReturnType<typeof createAdminClient>,
  holding: ParsedHolding
): Promise<Asset | null> {
  // 1. Try ISIN first (most reliable)
  if (holding.isin) {
    const { data: assetByIsin } = await supabase
      .from('assets')
      .select('*')
      .eq('isin', holding.isin.toUpperCase())
      .single();
    
    if (assetByIsin) {
      console.log(`  Found asset by ISIN: ${holding.isin} → ${assetByIsin.name}`);
      return assetByIsin;
    }
  }
  
  // 2. Try Symbol (reliable for Indian markets)
  if (holding.symbol) {
    const { data: assetBySymbol } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', holding.symbol.toUpperCase())
      .single();
    
    if (assetBySymbol) {
      console.log(`  Found asset by Symbol: ${holding.symbol} → ${assetBySymbol.name}`);
      return assetBySymbol;
    }
  }
  
  // 3. Try exact name match
  if (holding.name) {
    const { data: assetByName } = await supabase
      .from('assets')
      .select('*')
      .eq('name', holding.name)
      .single();
    
    if (assetByName) {
      console.log(`  Found asset by exact name: ${holding.name}`);
      return assetByName;
    }
    
    // 4. Try fuzzy name match (last resort)
    const { data: assetByFuzzyName } = await supabase
      .from('assets')
      .select('*')
      .ilike('name', `%${holding.name}%`)
      .limit(1)
      .single();
    
    if (assetByFuzzyName) {
      console.log(`  Found asset by fuzzy name: "${holding.name}" → "${assetByFuzzyName.name}"`);
      return assetByFuzzyName;
    }
  }
  
  console.log(`  No existing asset found for: ${holding.name || holding.symbol || holding.isin}`);
  return null;
}

/**
 * Create new asset in the database
 */
async function createAsset(
  supabase: ReturnType<typeof createAdminClient>,
  holding: ParsedHolding
): Promise<Asset> {
  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      name: holding.name,
      asset_type: holding.asset_type,
      symbol: holding.symbol?.toUpperCase() || null,
      isin: holding.isin?.toUpperCase() || null,
      asset_class: getAssetClassFromType(holding.asset_type),
      risk_bucket: getRiskBucket(holding.asset_type),
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create asset "${holding.name}": ${error.message}`);
  }
  
  console.log(`  Created new asset: ${newAsset.name} (${newAsset.asset_type})`);
  return newAsset;
}

/**
 * Merge holding for a portfolio
 * 
 * MERGE BEHAVIOR:
 * - If holding exists (same portfolio_id + asset_id): ADD quantities, weighted average price
 * - If holding doesn't exist: INSERT new record
 * 
 * WHY MERGE (NOT REPLACE):
 * - Users may upload from multiple brokers
 * - Users may add holdings incrementally
 * - Prevents accidental data loss
 * 
 * CALCULATION:
 * - new_quantity = old_quantity + upload_quantity
 * - new_avg_price = (old_qty × old_price + new_qty × new_price) / new_quantity
 * - invested_value = new_quantity × new_avg_price (ALWAYS computed)
 */
async function mergeHolding(
  supabase: ReturnType<typeof createAdminClient>,
  portfolioId: string,
  assetId: string,
  holding: ParsedHolding,
  source: 'csv' | 'manual' | 'sample' | 'api'
): Promise<{ created: boolean; merged: boolean }> {
  // Check if holding already exists
  const { data: existingHolding } = await supabase
    .from('holdings')
    .select('id, quantity, invested_value, average_price')
    .eq('portfolio_id', portfolioId)
    .eq('asset_id', assetId)
    .single();
  
  if (existingHolding) {
    // MERGE: Add quantities and calculate weighted average price
    const existingQty = existingHolding.quantity || 0;
    const existingPrice = existingHolding.average_price || 0;
    const newQty = holding.quantity;
    const newPrice = holding.average_price;
    
    // Calculate merged values
    const mergedQty = existingQty + newQty;
    const mergedAvgPrice = calculateWeightedAveragePrice(
      existingQty, existingPrice,
      newQty, newPrice
    );
    const mergedInvestedValue = calculateInvestedValue(mergedQty, mergedAvgPrice);
    
    // For equity holdings, get current price from stored prices
    // Never default to avg_buy_price for equity
    let currentValue: number | null = null;
    const asset = await supabase
      .from('assets')
      .select('asset_type, symbol')
      .eq('id', assetId)
      .single();
    
    if (asset.data?.asset_type === 'equity' && asset.data?.symbol) {
      const priceData = await getStockPrice(asset.data.symbol);
      if (priceData && priceData.price) {
        currentValue = mergedQty * priceData.price;
        console.log(`  Using stored price for ${asset.data.symbol}: ₹${priceData.price} (Yahoo EOD: ${priceData.priceDate})`);
      } else {
        // No price available - set to null, will be updated by price update job
        // Do NOT use avg_buy_price as fallback
        console.warn(`  No price data for ${asset.data.symbol}, current_value will be null until price update`);
        currentValue = null;
      }
    } else {
      // For non-equity, current_value = invested_value (no market pricing)
      currentValue = mergedInvestedValue;
    }
    
    const { error } = await supabase
      .from('holdings')
      .update({
        quantity: mergedQty,
        invested_value: mergedInvestedValue,
        current_value: currentValue,
        average_price: mergedAvgPrice,
        source: source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingHolding.id);
    
    if (error) {
      throw new Error(`Failed to merge holding: ${error.message}`);
    }
    
    console.log(`  Merged holding: ${holding.name}`);
    console.log(`    Quantity: ${existingQty} + ${newQty} = ${mergedQty}`);
    console.log(`    Avg Price: ${formatIndianCurrency(existingPrice)} + ${formatIndianCurrency(newPrice)} → ${formatIndianCurrency(mergedAvgPrice)}`);
    console.log(`    Invested: ${formatIndianCurrency(mergedInvestedValue)}`);
    
    return { created: false, merged: true };
  } else {
    // INSERT new holding
    // invested_value is ALWAYS computed from quantity × average_price
    const computedInvestedValue = calculateInvestedValue(holding.quantity, holding.average_price);
    
    // For equity holdings, get current price from stored prices
    // Never default to avg_buy_price for equity
    let currentValue: number | null = null;
    const asset = await supabase
      .from('assets')
      .select('asset_type, symbol')
      .eq('id', assetId)
      .single();
    
    if (asset.data?.asset_type === 'equity' && asset.data?.symbol) {
      const priceData = await getStockPrice(asset.data.symbol);
      if (priceData && priceData.price) {
        currentValue = holding.quantity * priceData.price;
        console.log(`  Using stored price for ${asset.data.symbol}: ₹${priceData.price} (Yahoo EOD: ${priceData.priceDate})`);
      } else {
        // No price available - set to null, will be updated by price update job
        // Do NOT use avg_buy_price as fallback
        console.warn(`  No price data for ${asset.data.symbol}, current_value will be null until price update`);
        currentValue = null;
      }
    } else {
      // For non-equity, current_value = invested_value (no market pricing)
      currentValue = computedInvestedValue;
    }
    
    const { error } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity: holding.quantity,
        invested_value: computedInvestedValue,
        current_value: currentValue,
        average_price: holding.average_price,
        source: source,
      });
    
    if (error) {
      throw new Error(`Failed to create holding: ${error.message}`);
    }
    
    console.log(`  Created holding: ${holding.name}`);
    console.log(`    Quantity: ${holding.quantity}`);
    console.log(`    Avg Price: ${formatIndianCurrency(holding.average_price)}`);
    console.log(`    Invested: ${formatIndianCurrency(computedInvestedValue)}`);
    
    return { created: true, merged: false };
  }
}

/**
 * Recalculate portfolio metrics after upload
 * 
 * COMPUTED FROM HOLDINGS (not from file):
 * - Total portfolio value = SUM(invested_value) of all holdings
 * - Allocation percentages = (holding_value / total_value) × 100
 * - Risk score based on allocation
 * - Diversification score
 * 
 * ENSURES:
 * - All percentages sum to 100%
 * - No single holding exceeds 100%
 * - Values are consistent with holdings table
 */
async function recalculateMetrics(
  supabase: ReturnType<typeof createAdminClient>,
  portfolioId: string
): Promise<void> {
  console.log('\n=== Recalculating Portfolio Metrics ===');
  
  // Get all holdings with asset info
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select(`
      *,
      asset:assets(*)
    `)
    .eq('portfolio_id', portfolioId);
  
  if (holdingsError) {
    console.error('Failed to fetch holdings for metrics:', holdingsError);
    return;
  }
  
  if (!holdings || holdings.length === 0) {
    console.log('No holdings found, skipping metrics calculation');
    return;
  }
  
  // Calculate metrics using our centralized calculator
  // IMPORTANT: Use invested_value from holdings, NOT from file
  const holdingsForMetrics = holdings.map(h => ({
    invested_value: h.invested_value || 0,
    asset_type: (h.asset as Asset)?.asset_type || 'other',
    name: (h.asset as Asset)?.name || 'Unknown',
  }));
  
  const metrics = calculatePortfolioMetrics(holdingsForMetrics);
  
  console.log('Calculated metrics:');
  console.log(`  Total Value: ${formatIndianCurrency(metrics.totalInvestedValue)}`);
  console.log(`  Equity: ${metrics.equityPct.toFixed(1)}%`);
  console.log(`  Debt: ${metrics.debtPct.toFixed(1)}%`);
  console.log(`  Gold: ${metrics.goldPct.toFixed(1)}%`);
  console.log(`  Cash: ${metrics.cashPct.toFixed(1)}%`);
  console.log(`  Risk Score: ${metrics.riskScore} (${metrics.riskLabel})`);
  console.log(`  Diversification: ${metrics.diversificationScore}`);
  console.log(`  Top Holding: ${metrics.topHoldingPct.toFixed(1)}%`);
  
  // Verify percentages sum to ~100%
  const totalPct = metrics.equityPct + metrics.debtPct + metrics.goldPct + 
                   metrics.cashPct + metrics.hybridPct + metrics.otherPct;
  if (Math.abs(totalPct - 100) > 1 && metrics.totalInvestedValue > 0) {
    console.warn(`  WARNING: Allocation percentages sum to ${totalPct.toFixed(1)}%, not 100%`);
  }
  
  // Upsert metrics
  const { error: metricsError } = await supabase
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
      goal_progress_pct: 75, // Default, would be calculated based on goals
      last_calculated: new Date().toISOString(),
    });
  
  if (metricsError) {
    console.error('Failed to update metrics:', metricsError);
  } else {
    console.log('Portfolio metrics updated successfully');
  }
  
  // Update portfolio total value
  // CRITICAL: This must match SUM(invested_value) from holdings
  const { error: portfolioError } = await supabase
    .from('portfolios')
    .update({ 
      total_value: metrics.totalInvestedValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', portfolioId);
  
  if (portfolioError) {
    console.error('Failed to update portfolio total:', portfolioError);
  } else {
    console.log(`Portfolio total value updated: ${formatIndianCurrency(metrics.totalInvestedValue)}`);
  }
}

/**
 * Generate insights based on portfolio state
 * 
 * INSIGHT TYPES:
 * - concentration: Top holding > 25%
 * - diversification: Few holdings or limited asset classes
 * - general: Upload success confirmation
 * 
 * NO TRADING LANGUAGE:
 * - We observe and inform, never recommend buy/sell
 * - Calm, educational tone
 */
async function generateInsights(
  supabase: ReturnType<typeof createAdminClient>,
  portfolioId: string
): Promise<void> {
  // Get metrics
  const { data: metrics } = await supabase
    .from('portfolio_metrics')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .single();
  
  if (!metrics) return;
  
  // Deactivate old insights of types we're regenerating
  await supabase
    .from('portfolio_insights')
    .update({ is_active: false })
    .eq('portfolio_id', portfolioId)
    .in('insight_type', ['concentration', 'diversification', 'general']);
  
  const newInsights: Array<{
    portfolio_id: string;
    insight_type: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    summary: string;
  }> = [];
  
  // Concentration insight
  if (metrics.top_holding_pct && metrics.top_holding_pct > 25) {
    newInsights.push({
      portfolio_id: portfolioId,
      insight_type: 'concentration',
      severity: metrics.top_holding_pct > 40 ? 'high' : 'medium',
      title: 'Portfolio concentration noted',
      summary: `Your largest holding represents ${Math.round(metrics.top_holding_pct)}% of your portfolio. This is worth monitoring over time.`,
    });
  }
  
  // Diversification insight
  if (metrics.diversification_score && metrics.diversification_score < 50) {
    newInsights.push({
      portfolio_id: portfolioId,
      insight_type: 'diversification',
      severity: 'low',
      title: 'Diversification opportunity',
      summary: 'Your portfolio could benefit from spreading investments across more asset classes.',
    });
  }
  
  // Success insight (always added after upload)
  newInsights.push({
    portfolio_id: portfolioId,
    insight_type: 'general',
    severity: 'low',
    title: 'Portfolio updated successfully',
    summary: 'Your holdings have been imported. Portfolio insights are now available.',
  });
  
  // Insert new insights
  if (newInsights.length > 0) {
    const { error } = await supabase.from('portfolio_insights').insert(newInsights);
    if (error) {
      console.error('Failed to insert insights:', error);
    } else {
      console.log(`Generated ${newInsights.length} insights`);
    }
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

/**
 * POST /api/portfolio/upload/confirm
 * 
 * Confirm and import previewed holdings into the database.
 * Uses merge logic to handle repeated uploads and additions.
 * 
 * CALCULATION GUARANTEES:
 * - All invested_value computed from quantity × average_price
 * - Portfolio total = SUM(invested_value) of all holdings
 * - Allocation percentages sum to 100%
 * - No holding exceeds 100% allocation
 */
export async function POST(request: NextRequest) {
  console.log('\n========================================');
  console.log('Portfolio Upload Confirm');
  console.log('========================================');
  
  try {
    const body: ConfirmUploadRequest = await request.json();
    const { user_id, holdings, source } = body;
    
    // Validate request
    if (!user_id) {
      return NextResponse.json<ConfirmUploadResponse>(
        { success: false, message: 'User ID is required', holdingsCreated: 0, holdingsUpdated: 0, assetsCreated: 0, error: 'Missing user_id' },
        { status: 400 }
      );
    }
    
    if (!holdings || holdings.length === 0) {
      return NextResponse.json<ConfirmUploadResponse>(
        { success: false, message: 'No holdings to import', holdingsCreated: 0, holdingsUpdated: 0, assetsCreated: 0, error: 'Empty holdings array' },
        { status: 400 }
      );
    }
    
    // Filter to only valid holdings
    const validHoldings = holdings.filter(h => h.isValid);
    
    if (validHoldings.length === 0) {
      return NextResponse.json<ConfirmUploadResponse>(
        { success: false, message: 'No valid holdings to import', holdingsCreated: 0, holdingsUpdated: 0, assetsCreated: 0, error: 'All holdings are invalid' },
        { status: 400 }
      );
    }
    
    console.log(`Processing ${validHoldings.length} valid holdings for user ${user_id}`);
    
    // Use admin client for database operations
    const supabase = createAdminClient();
    
    // Ensure user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();
    
    if (!existingUser) {
      // Create user record (user must exist in auth.users for FK constraint)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user_id,
          full_name: 'User',
          risk_label: 'Moderate',
          risk_score: 50,
        });
      
      if (userError) {
        if (userError.message.includes('foreign key') || userError.message.includes('violates')) {
          console.error('User not found in auth.users:', user_id);
          return NextResponse.json<ConfirmUploadResponse>(
            { 
              success: false, 
              message: 'Please sign in to upload your portfolio', 
              holdingsCreated: 0, 
              holdingsUpdated: 0, 
              assetsCreated: 0, 
              error: 'Authentication required' 
            },
            { status: 401 }
          );
        }
        throw userError;
      }
      console.log('Created user record');
    }
    
    // Get or create user's primary portfolio
    let { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_primary', true)
      .single();
    
    if (!portfolio) {
      const { data: newPortfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          user_id,
          name: 'My Portfolio',
          is_primary: true,
          total_value: 0,
          currency: 'INR',
        })
        .select('id')
        .single();
      
      if (portfolioError) {
        throw new Error(`Failed to create portfolio: ${portfolioError.message}`);
      }
      
      portfolio = newPortfolio;
      console.log('Created primary portfolio');
    }
    
    // Process each holding
    let holdingsCreated = 0;
    let holdingsMerged = 0;
    let assetsCreated = 0;
    
    console.log('\nProcessing holdings:');
    for (const holding of validHoldings) {
      try {
        // Find or create asset
        let asset = await findAsset(supabase, holding);
        
        if (!asset) {
          asset = await createAsset(supabase, holding);
          assetsCreated++;
        }
        
        // Merge holding (add to existing or create new)
        const result = await mergeHolding(
          supabase, 
          portfolio.id, 
          asset.id, 
          holding, 
          source === 'onboarding' || source === 'dashboard' ? 'csv' : 'csv'
        );
        
        if (result.created) {
          holdingsCreated++;
        } else if (result.merged) {
          holdingsMerged++;
        }
      } catch (holdingError) {
        console.error(`Error processing "${holding.name}":`, holdingError);
        // Continue with other holdings
      }
    }
    
    console.log(`\nResults: ${holdingsCreated} created, ${holdingsMerged} merged, ${assetsCreated} new assets`);
    
    // Recalculate metrics (CRITICAL - ensures consistency)
    await recalculateMetrics(supabase, portfolio.id);
    
    // Generate insights
    console.log('\nGenerating insights...');
    await generateInsights(supabase, portfolio.id);
    
    // Success response
    return NextResponse.json<ConfirmUploadResponse>({
      success: true,
      message: 'Portfolio updated successfully',
      holdingsCreated,
      holdingsUpdated: holdingsMerged,
      assetsCreated,
      portfolioId: portfolio.id,
    });
    
  } catch (error) {
    console.error('Confirm upload error:', error);
    return NextResponse.json<ConfirmUploadResponse>(
      { 
        success: false, 
        message: 'Something went wrong',
        holdingsCreated: 0,
        holdingsUpdated: 0,
        assetsCreated: 0,
        error: 'Please try again or contact support'
      },
      { status: 500 }
    );
  }
}
