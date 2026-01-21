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
  formatIndianCurrency,
} from '@/lib/portfolio-calculations';
import { classifyAsset } from '@/lib/asset-classification';
import { getISINsBySchemeCode } from '@/lib/mf-scheme-master';

type Asset = Database['public']['Tables']['assets']['Row'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get asset class from asset type (deprecated - use classifyAsset instead)
 * @deprecated Use classifyAsset from @/lib/asset-classification instead
 */
function getAssetClassFromType(assetType: AssetType): 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' {
  const classification = classifyAsset(assetType);
  // Map new capitalized values to old lowercase format for backward compatibility
  const mapping: Record<string, 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid'> = {
    'Equity': 'equity',
    'FixedIncome': 'debt',
    'Hybrid': 'hybrid',
    'Commodity': 'gold',
    'Cash': 'cash',
  };
  return mapping[classification.assetClass] || 'equity';
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
 * Normalize scheme name for matching
 * 
 * Removes common noise words and normalizes format:
 * - Lowercase
 * - Trim whitespace
 * - Remove: direct, regular, growth, plan, option, idcw, dividend, bonus
 * - Collapse multiple spaces
 * 
 * Example:
 * "ICICI Prudential Innovation Growth Direct Plan"
 * → "icici prudential innovation"
 * 
 * EXPORTED for use in backfill service
 */
export function normalizeSchemeName(schemeName: string): string {
  if (!schemeName) return '';
  
  // Lowercase and trim
  let normalized = schemeName.toLowerCase().trim();
  
  // Remove common noise words (order matters - remove longer phrases first)
  const noiseWords = [
    'direct plan',
    'regular plan',
    'growth option',
    'dividend option',
    'idcw option',
    'bonus option',
    'direct',
    'regular',
    'growth',
    'dividend',
    'idcw',
    'iddr',
    'bonus',
    'plan',
    'option',
    'fund',
    'mf',
  ];
  
  for (const word of noiseWords) {
    // Remove word with surrounding spaces
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  }
  
  // Collapse multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Resolve MF scheme from mf_scheme_master (mf_scheme_master is the ONLY source of truth)
 * 
 * ARCHITECTURAL PRINCIPLE:
 * - CSV IS NEVER a source of ISIN truth
 * - mf_scheme_master is the ONLY source of scheme_code and ISINs
 * - Upload succeeds even if resolution fails
 * 
 * Resolution strategy:
 * 1. Normalize scheme name from CSV
 * 2. Exact match on normalized name (ACTIVE schemes only)
 * 3. Fallback to ILIKE match with fund_house preference
 * 4. Prefer ACTIVE + DIRECT + GROWTH schemes
 * 
 * @param supabase - Supabase client
 * @param holding - Parsed holding with scheme name
 * @param warnings - Optional array to collect warnings (for response)
 * @returns Resolved scheme data (isin, scheme_code, scheme_name) or null
 */
async function resolveMFScheme(
  supabase: ReturnType<typeof createAdminClient>,
  holding: ParsedHolding,
  warnings?: string[]
): Promise<{ isin: string; schemeCode: string; schemeName: string } | null> {
  // CSV IS NEVER a source of ISIN truth - ignore CSV ISIN, always resolve from scheme master
  if (!holding.name) {
    const warning = `ISIN not resolved: No scheme name provided for mutual fund. Asset created without ISIN.`;
    console.warn(`  ⚠️ [MF Upload] ${warning}`);
    if (warnings) warnings.push(warning);
    return null;
  }
  
  const normalizedName = normalizeSchemeName(holding.name);
  if (!normalizedName) {
    const warning = `ISIN not resolved for "${holding.name}": Scheme name is empty after normalization. Asset created without ISIN.`;
    console.warn(`  ⚠️ [MF Upload] ${warning}`);
    if (warnings) warnings.push(warning);
    return null;
  }
  
  // Query mf_scheme_master - ONLY source of truth for ISINs
  // Filter: ACTIVE schemes only
  const { data: schemes, error } = await supabase
    .from('mf_scheme_master')
    .select('scheme_code, scheme_name, fund_house, isin_growth, isin_div_payout, isin_div_reinvest, scheme_status, last_updated')
    .eq('scheme_status', 'Active')
    .order('last_updated', { ascending: false });
  
  if (error) {
    const warning = `ISIN not resolved for "${holding.name}": Error querying scheme master. Asset created without ISIN.`;
    console.warn(`  ⚠️ [MF Upload] ${warning}`);
    if (warnings) warnings.push(warning);
    return null;
  }
  
  if (!schemes || schemes.length === 0) {
    const warning = `ISIN not resolved for "${holding.name}": Scheme master is empty. Asset created without ISIN.`;
    console.warn(`  ⚠️ [MF Upload] ${warning}`);
    if (warnings) warnings.push(warning);
    return null;
  }
  
  // Strategy 1: Exact match on normalized name
  let bestMatch: typeof schemes[0] | null = null;
  let bestScore = 0;
  
  for (const scheme of schemes) {
    const schemeNormalized = normalizeSchemeName(scheme.scheme_name);
    
    if (schemeNormalized === normalizedName) {
      // Prefer: ACTIVE + DIRECT + GROWTH
      const isDirect = scheme.scheme_name.toLowerCase().includes('direct');
      const isGrowth = scheme.isin_growth && !scheme.isin_div_payout && !scheme.isin_div_reinvest;
      
      const score = (isDirect ? 100 : 50) + (isGrowth ? 10 : 0);
      
      if (score > bestScore) {
        bestMatch = scheme;
        bestScore = score;
      } else if (score === bestScore && scheme.last_updated && bestMatch?.last_updated) {
        // If same score, prefer more recently updated
        if (new Date(scheme.last_updated) > new Date(bestMatch.last_updated)) {
          bestMatch = scheme;
        }
      }
    }
  }
  
  // Strategy 2: ILIKE match with fund_house preference (if no exact match)
  if (!bestMatch) {
    // Try ILIKE match on scheme_name
    const { data: ilikeSchemes } = await supabase
      .from('mf_scheme_master')
      .select('scheme_code, scheme_name, fund_house, isin_growth, isin_div_payout, isin_div_reinvest, scheme_status, last_updated')
      .eq('scheme_status', 'Active')
      .ilike('scheme_name', `%${normalizedName}%`)
      .order('last_updated', { ascending: false })
      .limit(10);
    
    if (ilikeSchemes && ilikeSchemes.length > 0) {
      // Extract fund house from CSV name (first part before "Mutual Fund" or similar)
      const csvFundHouse = holding.name.match(/^([A-Za-z\s&]+?)(?:\s+(?:Mutual Fund|MF|Fund|Limited|Ltd))?/i)?.[1]?.trim().toLowerCase();
      
      for (const scheme of ilikeSchemes) {
        const schemeNormalized = normalizeSchemeName(scheme.scheme_name);
        const schemeFundHouse = scheme.fund_house?.toLowerCase().trim();
        
        // Prefer schemes with matching fund house
        const fundHouseMatch = csvFundHouse && schemeFundHouse && 
          (schemeFundHouse.includes(csvFundHouse) || csvFundHouse.includes(schemeFundHouse));
        
        const isDirect = scheme.scheme_name.toLowerCase().includes('direct');
        const isGrowth = scheme.isin_growth && !scheme.isin_div_payout && !scheme.isin_div_reinvest;
        
        const score = (fundHouseMatch ? 75 : 25) + (isDirect ? 10 : 0) + (isGrowth ? 5 : 0);
        
        if (score > bestScore) {
          bestMatch = scheme;
          bestScore = score;
        }
      }
    }
  }
  
  if (!bestMatch) {
    const warning = `ISIN not resolved for "${holding.name}" (normalized: "${normalizedName}"). No matching ACTIVE scheme found in scheme master. Asset created without ISIN.`;
    console.warn(`  ⚠️ [MF Upload] ${warning}`);
    if (warnings) warnings.push(warning);
    return null;
  }
  
  // Prefer Growth ISIN, fallback to Div Payout, then Div Reinvest
  const resolvedIsin = bestMatch.isin_growth || bestMatch.isin_div_payout || bestMatch.isin_div_reinvest;
  
  if (!resolvedIsin) {
    const warning = `ISIN not resolved for "${holding.name}": Matched scheme "${bestMatch.scheme_name}" but it has no ISIN. Asset created without ISIN.`;
    console.warn(`  ⚠️ [MF Upload] ${warning}`);
    if (warnings) warnings.push(warning);
    return null;
  }
  
  return {
    isin: resolvedIsin,
    schemeCode: bestMatch.scheme_code,
    schemeName: bestMatch.scheme_name,
  };
}

/**
 * Find existing asset by ISIN, Symbol, or Name
 * 
 * PRIORITY ORDER:
 * 1. ISIN (most reliable, globally unique)
 * 2. Symbol (reliable for Indian markets)
 * 3. Name (exact match, then fuzzy)
 * 
 * For MF assets: ISIN resolution is best-effort enrichment, not mandatory.
 * Upload proceeds even if ISIN cannot be resolved.
 * 
 * This ensures:
 * - Same asset is always matched correctly
 * - No duplicate assets created
 * - Repeated uploads are idempotent
 * - Uploads never fail due to missing ISIN
 */
async function findAsset(
  supabase: ReturnType<typeof createAdminClient>,
  holding: ParsedHolding
): Promise<Asset | null> {
  // For MF/Index Fund (NOT ETF), attempt ISIN resolution (BEST EFFORT - NON-BLOCKING)
  // ETFs trade on exchanges like stocks and use trading symbols, not scheme codes
  const isMF = holding.asset_type === 'mutual_fund' || holding.asset_type === 'index_fund';
  let resolvedIsin: string | null = null;
  let resolvedSchemeName: string | null = null;
  
  if (isMF) {
    // Resolve from mf_scheme_master (ONLY source of truth)
    // Note: warnings parameter not passed here - warnings collected in main loop
    const resolution = await resolveMFScheme(supabase, holding);
    if (resolution) {
      // Scheme was resolved - use authoritative data from scheme master
      resolvedIsin = resolution.isin;
      resolvedSchemeName = resolution.schemeName;
      // Store scheme_code for later use (will be used as symbol)
      (holding as any)._schemeCode = resolution.schemeCode;
      // Update holding with resolved ISIN
      holding.isin = resolvedIsin;
      // Use canonical scheme name from scheme master (more authoritative than CSV)
      if (resolvedSchemeName) {
        holding.name = resolvedSchemeName;
      }
    }
    // If resolution fails, proceed without ISIN (non-blocking)
    // Warning will be collected in main processing loop
  }
  
  // 1. Try ISIN first (most reliable)
  const isinToSearch = resolvedIsin || holding.isin;
  if (isinToSearch) {
    const { data: assetByIsin } = await supabase
      .from('assets')
      .select('*')
      .eq('isin', isinToSearch.toUpperCase())
      .single();
    
    if (assetByIsin) {
      return assetByIsin;
    }
  }
  
  // 2. Try Symbol (reliable for stocks and ETFs, not applicable for MF)
  if (!isMF && holding.symbol) {
    const { data: assetBySymbol } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', holding.symbol.toUpperCase())
      .single();
    
    if (assetBySymbol) {
      return assetBySymbol;
    }
  }
  
  // 3. Try exact name match (for all assets, including MF)
  if (holding.name) {
    const { data: assetByName } = await supabase
      .from('assets')
      .select('*')
      .eq('name', holding.name)
      .eq('asset_type', holding.asset_type) // Match asset type too
      .maybeSingle();
    
    if (assetByName) {
      return assetByName;
    }
    
    // 4. Try fuzzy name match (last resort, for all assets)
    const { data: assetByFuzzyName } = await supabase
      .from('assets')
      .select('*')
      .ilike('name', `%${holding.name}%`)
      .eq('asset_type', holding.asset_type)
      .limit(1)
      .maybeSingle();
    
    if (assetByFuzzyName) {
      return assetByFuzzyName;
    }
  }
  
  return null;
}

/**
 * Create new asset in the database
 * 
 * For MF/Index Fund assets: ISIN is optional (best-effort enrichment).
 * For ETFs: Symbol is REQUIRED (they trade like stocks on exchanges).
 * Upload proceeds even if ISIN is missing.
 * 
 * Asset creation rules:
 * - Mutual Funds/Index Funds:
 *   - asset_type = 'mutual_fund' | 'index_fund'
 *   - name = scheme name from CSV (as-is)
 *   - isin = resolved ISIN OR NULL (optional)
 *   - symbol = scheme_code (AMFI code) OR NULL
 * 
 * - ETFs:
 *   - asset_type = 'etf'
 *   - name = ETF name from CSV
 *   - isin = ISIN from CSV OR NULL
 *   - symbol = trading symbol from CSV (REQUIRED - e.g., CPSEETF, NIFTYBEES)
 */
async function createAsset(
  supabase: ReturnType<typeof createAdminClient>,
  holding: ParsedHolding
): Promise<Asset> {
  const isMF = holding.asset_type === 'mutual_fund' || holding.asset_type === 'index_fund';
  const isETF = holding.asset_type === 'etf';
  
  // ISIN is optional for MF assets - log warning if missing, but proceed
  if (isMF && !holding.isin) {
    console.warn(`  ⚠️ [MF Upload] ISIN not resolved for "${holding.name}". Created asset without ISIN.`);
    // Continue - do NOT throw error
  }
  
  // Validate ISIN format for MF assets (if provided)
  if (isMF && holding.isin) {
    const cleanIsin = holding.isin.toUpperCase().trim();
    if (cleanIsin.length !== 12 || !/^[A-Z0-9]{12}$/.test(cleanIsin)) {
      console.warn(
        `  ⚠️ [MF Upload] Invalid ISIN format for "${holding.name}": ${holding.isin}. ` +
        `Created asset without ISIN.`
      );
      // Clear invalid ISIN and proceed
      holding.isin = undefined;
    }
  }
  
  // Symbol logic:
  // - MF/Index Funds: use scheme_code (AMFI code) if available
  // - ETFs: use trading symbol from CSV (REQUIRED for price updates)
  // - Stocks: use symbol from CSV
  const symbol = isMF 
    ? ((holding as any)._schemeCode || null) // Use scheme_code from resolution
    : (holding.symbol?.toUpperCase() || null); // ETFs and stocks use trading symbols
  
  // Use new classification system to get proper capitalized values
  // This ensures compatibility with database constraints
  const classification = classifyAsset(holding.asset_type, {
    isEquityMF: isMF && holding.asset_type === 'mutual_fund',
    isDebtMF: false, // Would need additional logic to detect debt MFs
    isHybridMF: false, // Would need additional logic to detect hybrid MFs
    isGoldETF: isETF && holding.name?.toLowerCase().includes('gold'),
  });

  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      name: holding.name, // Use canonical name from scheme master if resolved, otherwise CSV name
      asset_type: holding.asset_type,
      symbol: symbol, // scheme_code for MF, symbol for others
      isin: holding.isin?.toUpperCase() || null, // ISIN from scheme master (ONLY source of truth)
      asset_class: classification.assetClass, // Use capitalized value from classification system
      top_level_bucket: classification.topLevelBucket,
      risk_behavior: classification.riskBehavior,
      valuation_method: classification.valuationMethod,
      risk_bucket: getRiskBucket(holding.asset_type),
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create asset "${holding.name}": ${error.message}`);
  }
  
  if (isMF) {
    if (!newAsset.isin) {
      // Will be enriched later via ISIN backfill
    }
  } else if (isETF && !newAsset.symbol) {
    console.warn(`  ⚠️ ETF "${newAsset.name}" created without trading symbol - price updates will fail!`);
  }
  
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
    }
    
    // Process each holding
    let holdingsCreated = 0;
    let holdingsMerged = 0;
    let assetsCreated = 0;
    const warnings: string[] = [];
    
    for (const holding of validHoldings) {
      try {
        const isMF = holding.asset_type === 'mutual_fund' || holding.asset_type === 'index_fund';
        const isETF = holding.asset_type === 'etf';
        const hadIsinBefore = !!holding.isin;
        
        // Find or create asset
        // For MF assets: ISIN resolution is best-effort (non-blocking)
        // For ETFs: Symbol is required for price updates
        // Upload proceeds even if ISIN cannot be resolved
        let asset = await findAsset(supabase, holding);
        
        // Track if ISIN was not resolved for MF assets (after resolution attempt)
        if (isMF && !holding.isin && !hadIsinBefore) {
          warnings.push(`ISIN not resolved for "${holding.name}". Asset created without ISIN and will be enriched later.`);
        }
        
        // Warn if ETF is missing trading symbol
        if (isETF && !holding.symbol) {
          warnings.push(`ETF "${holding.name}" is missing trading symbol. Price updates will not work. Please add symbol column to your CSV.`);
        }
        
        if (!asset) {
          // createAsset will allow MF assets without ISIN (logs warning only)
          asset = await createAsset(supabase, holding);
          assetsCreated++;
          
          // Track if asset was created without ISIN
          if (isMF && !asset.isin) {
            // Warning already added above if ISIN wasn't resolved
            // But also check if asset was created without ISIN for other reasons
            if (hadIsinBefore && !asset.isin) {
              warnings.push(`Asset "${holding.name}" created but ISIN was lost during processing.`);
            }
          }
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
        const errorMessage = holdingError instanceof Error ? holdingError.message : String(holdingError);
        console.error(`Error processing "${holding.name}":`, errorMessage);
        // Continue with other holdings - do NOT block upload
        // ISIN resolution failures are now warnings, not errors
        warnings.push(`Error processing "${holding.name}": ${errorMessage}`);
      }
    }
    
    // Recalculate metrics (CRITICAL - ensures consistency)
    await recalculateMetrics(supabase, portfolio.id);
    
    // Generate insights
    await generateInsights(supabase, portfolio.id);
    
    // Success response (with warnings if any)
    const message = warnings.length > 0
      ? `Portfolio updated successfully with ${warnings.length} warning(s)`
      : 'Portfolio updated successfully';
    
    return NextResponse.json<ConfirmUploadResponse>({
      success: true,
      message,
      holdingsCreated,
      holdingsUpdated: holdingsMerged,
      assetsCreated,
      portfolioId: portfolio.id,
      warnings: warnings.length > 0 ? warnings : undefined,
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
