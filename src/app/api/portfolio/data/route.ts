// @ts-nocheck
/**
 * Portfolio Data API
 *
 * GET /api/portfolio/data
 *
 * Fetches the user's portfolio data including:
 * - Portfolio metrics (net worth, risk score, goal alignment)
 * - Asset allocation breakdown (computed from holdings)
 * - All holdings with full details
 * - Key insights
 *
 * CALCULATION PHILOSOPHY (NON-NEGOTIABLE):
 * =========================================
 * 1. Net Worth = SUM(invested_value) from holdings table
 * 2. Asset Allocation = (asset_class_value / total_value) × 100
 * 3. All percentages MUST sum to 100% (normalized)
 * 4. Holdings sorted by invested_value descending
 * 5. NO "Other 100%" fallback - show actual breakdown
 *
 * DATA FLOW:
 * ==========
 * - Portfolio value from portfolios.total_value (set by upload confirm)
 * - Allocation from portfolio_metrics (computed from holdings)
 * - Holdings directly from holdings table with asset details
 * - ALL values computed from quantity × average_price
 *
 * TRANSPARENCY:
 * =============
 * - Returns ALL holdings, not just top 5
 * - Includes quantity, avg price, invested value for each holding
 * - Allocation percentages verifiable by user
 *
 * This is the source of truth for the dashboard.
 * Data comes from the database, not hardcoded values.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  calculateInvestedValue,
  calculateAllocationPercentage,
  normalizeAllocations,
  formatIndianCurrency,
} from '@/lib/portfolio-calculations';
import { getStockPrices, getPreviousTradingDay, getStockPrice } from '@/lib/stock-prices';
import { getMFNavsByISIN, getMFNavByISIN } from '@/lib/mf-navs';

// ============================================================================
// CACHING CONFIGURATION
// ============================================================================
// Cache portfolio data for 5 minutes to improve performance
// This prevents redundant database queries and price calculations on every page load
// The cache is user-specific (based on user_id query param)
export const revalidate = 300; // 5 minutes in seconds

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface HoldingDetail {
  id: string;
  name: string;
  symbol: string | null;
  isin: string | null;
  assetType: string;
  quantity: number;
  averagePrice: number;
  investedValue: number;
  currentValue: number;
  allocationPct: number;
  sector: string | null;
  assetClass: string | null;
  notes: string | null;
  navDate?: string | null; // NAV date for mutual funds (YYYY-MM-DD)
  priceDate?: string | null; // Price date for equity/stocks (YYYY-MM-DD)
}

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
  value: number;
}

interface InsightItem {
  id: number;
  type: 'info' | 'opportunity' | 'warning';
  title: string;
  description: string;
}

interface PortfolioDataResponse {
  success: boolean;
  data?: {
    metrics: {
      netWorth: number;
      netWorthChange: number;
      riskScore: number;
      riskLabel: string;
      goalAlignment: number;
    };
    allocation: AllocationItem[];
    holdings: HoldingDetail[];
    topHoldings: HoldingDetail[];
    insights: InsightItem[];
    hasData: boolean;
    // Summary stats for transparency
    summary: {
      totalHoldings: number;
      totalAssetTypes: number;
      largestHoldingPct: number;
      lastUpdated: string | null;
      createdAt: string | null;
    };
  };
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Colors for allocation chart - distinct, accessible colors
// Using distinct colors to avoid similar shades (especially greens)
const ALLOCATION_COLORS: Record<string, string> = {
  'equity': '#2563EB',      // Blue - Stocks (changed from green)
  'mutual_fund': '#7C3AED', // Purple - Mutual Funds (changed from green)
  'index_fund': '#7C3AED',  // Purple - Index Funds (changed from teal)
  'etf': '#10B981',         // Emerald - ETFs (only green, kept distinct)
  'debt': '#6366F1',        // Indigo - Debt category
  'fd': '#F59E0B',          // Amber - FDs (changed from indigo)
  'bond': '#6366F1',        // Indigo - Bonds
  'gold': '#DC2626',        // Red - Gold (changed from amber)
  'ppf': '#8B5CF6',         // Violet - PPF
  'epf': '#8B5CF6',         // Violet - EPF (changed from purple)
  'nps': '#EC4899',         // Pink - NPS
  'cash': '#64748B',        // Slate - Cash
  'hybrid': '#F472B6',      // Pink lighter - Hybrid
  'other': '#64748B',       // Gray - Other
};

// Human-readable asset type names
const ASSET_TYPE_LABELS: Record<string, string> = {
  'equity': 'Stocks',
  'mutual_fund': 'Mutual Funds',
  'index_fund': 'Index Funds',
  'etf': 'ETFs',
  'fd': 'Fixed Deposits',
  'bond': 'Bonds',
  'gold': 'Gold',
  'ppf': 'PPF',
  'epf': 'EPF',
  'nps': 'NPS',
  'cash': 'Cash',
  'hybrid': 'Hybrid',
  'other': 'Other',
};

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json<PortfolioDataResponse>(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // 1. Get user's primary portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, total_value, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();
    
    if (portfolioError || !portfolio) {
      // No portfolio yet - return empty state
      return NextResponse.json<PortfolioDataResponse>({
        success: true,
        data: {
          metrics: {
            netWorth: 0,
            netWorthChange: 0,
            riskScore: 0,
            riskLabel: 'Not Set',
            goalAlignment: 0,
          },
          allocation: [],
          holdings: [],
          topHoldings: [],
          insights: [{
            id: 1,
            type: 'info' as const,
            title: 'Upload your portfolio to get started',
            description: 'Import your holdings from a CSV or Excel file to see personalized insights.',
          }],
          hasData: false,
          summary: {
            totalHoldings: 0,
            totalAssetTypes: 0,
            largestHoldingPct: 0,
            lastUpdated: null,
            createdAt: null,
          },
        },
      });
    }
    
    // 2. Get portfolio metrics
    const { data: metrics } = await supabase
      .from('portfolio_metrics')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .single();
    
    // 3. Get ALL holdings with asset details
    // Try nested query first (more efficient), fallback to separate queries if 406 error
    let rawHoldings: any[] = [];
    let holdingsError: any = null;
    
    const { data: nestedHoldings, error: nestedError } = await supabase
      .from('holdings')
      .select(`
        id,
        quantity,
        invested_value,
        current_value,
        average_price,
        notes,
        assets (
          id,
          name,
          asset_type,
          symbol,
          isin,
          sector,
          asset_class
        )
      `)
      .eq('portfolio_id', portfolio.id)
      .order('invested_value', { ascending: false });
    
    if (nestedError) {
      console.warn('[Portfolio Data API] Nested query failed, trying separate queries:', {
        error: nestedError,
        code: nestedError.code,
        message: nestedError.message
      });
      
      // Fallback: Query holdings and assets separately (handles 406 errors)
      const { data: holdingsOnly, error: holdingsOnlyError } = await supabase
        .from('holdings')
        .select('id, asset_id, quantity, invested_value, current_value, average_price, notes')
        .eq('portfolio_id', portfolio.id)
        .order('invested_value', { ascending: false });
      
      if (holdingsOnlyError) {
        console.error('[Portfolio Data API] Error fetching holdings (fallback):', holdingsOnlyError);
        return NextResponse.json<PortfolioDataResponse>(
          { success: false, error: `Failed to fetch holdings: ${holdingsOnlyError.message}` },
          { status: 500 }
        );
      }
      
      if (holdingsOnly && holdingsOnly.length > 0) {
        // Fetch assets separately
        const assetIds = [...new Set(holdingsOnly.map((h: any) => h.asset_id).filter(Boolean))];
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, asset_type, symbol, isin, sector, asset_class')
          .in('id', assetIds);
        
        if (assetsError) {
          console.error('[Portfolio Data API] Error fetching assets:', assetsError);
          return NextResponse.json<PortfolioDataResponse>(
            { success: false, error: `Failed to fetch assets: ${assetsError.message}` },
            { status: 500 }
          );
        }
        
        // Combine holdings with assets
        const assetsMap = new Map((assets || []).map((a: any) => [a.id, a]));
        rawHoldings = (holdingsOnly || []).map((h: any) => ({
          ...h,
          assets: assetsMap.get(h.asset_id) || null
        }));
      }
      
      holdingsError = null; // Reset error since fallback succeeded
    } else {
      rawHoldings = nestedHoldings || [];
    }
    
    const holdings = rawHoldings || [];
    
    // Check if there are holdings with null assets (might indicate linking issue)
    const holdingsWithNullAssets = holdings.filter((h: any) => !h.assets);
    if (holdingsWithNullAssets.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(`[Portfolio Data API] Found ${holdingsWithNullAssets.length} holdings with null assets:`, 
        holdingsWithNullAssets.map((h: any) => ({ holding_id: h.id, asset_id: h.asset_id }))
      );
    }
    
    // 3.5. Fetch stock prices for equity and ETF holdings (batch query for performance)
    // ETFs trade on exchanges like stocks, so they need real-time prices (like MF NAVs)
    const equityAndETFHoldings = holdings.filter((h: any) => {
      const asset = h.assets as any;
      return (asset?.asset_type === 'equity' || asset?.asset_type === 'etf') && asset?.symbol;
    });
    
    if (equityAndETFHoldings.length > 0) {
      const symbols = equityAndETFHoldings.map((h: any) => (h.assets as any).symbol).filter(Boolean);
      const stockPrices = await getStockPrices(symbols);
      
      // Store price data in memory for read-time computation (like MF NAVs)
      for (const holding of equityAndETFHoldings) {
        const asset = holding.assets as any;
        const symbol = asset?.symbol;
        if (!symbol) continue;
        
        const priceData = stockPrices.get(symbol.toUpperCase());
        
        if (!priceData) {
          // Price not found - use current_value from database if available, else invested_value
          // Don't make individual queries here (performance optimization)
          console.warn(`[Portfolio Data API] No price data found for symbol: ${symbol}`);
        } else if (priceData.price && priceData.price > 0) {
          // Store price in memory for computation
          (holding as any)._computedPrice = priceData.price;
          (holding as any)._priceDate = priceData.priceDate;
        } else {
          console.warn(`[Portfolio Data API] Price data exists but price is null/zero for symbol: ${symbol}`);
        }
      }
    }
    
    // 3.6. Fetch gold prices for gold holdings (batch query for performance)
    const goldHoldings = holdings.filter((h: any) => {
      const asset = h.assets as any;
      return asset?.asset_type === 'gold';
    });
    
    if (goldHoldings.length > 0) {
      // Fetch latest gold prices
      const { data: goldPriceData, error: goldPriceError } = await supabase
        .from('gold_price_daily')
        .select('gold_24k, gold_22k')
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (!goldPriceError && goldPriceData) {
        // Store gold prices in memory for read-time computation
        for (const holding of goldHoldings) {
          try {
            const notes = holding.notes ? JSON.parse(holding.notes) : {};
            const quantity = holding.quantity || 0;
            const unitType = notes.unit_type || 'gram';
            const purity = notes.purity || '22k';
            
            // Determine price based on purity
            let pricePerUnit: number;
            if (unitType === 'unit') {
              // For units (SGB), use 22k price as base
              pricePerUnit = goldPriceData.gold_22k;
            } else {
              // For grams, use purity-specific price
              pricePerUnit = purity === '24k' ? goldPriceData.gold_24k : goldPriceData.gold_22k;
            }
            
            if (pricePerUnit && pricePerUnit > 0) {
              // Store gold price in memory for computation
              (holding as any)._computedGoldPrice = pricePerUnit;
            }
          } catch (e) {
            console.warn(`[Portfolio Data API] Failed to parse notes for gold holding ${holding.id}:`, e);
          }
        }
      } else {
        console.warn('[Portfolio Data API] No gold price data found, using current_value from database');
      }
    }
    
    // 3.7. Fetch NAVs for mutual fund holdings (batch query for performance)
    // Separate MF holdings into those with ISINs and those without
    // NOTE: ETFs are handled above in section 3.5 - they trade on exchanges and get prices from stock_prices table
    const allMFHoldings = holdings.filter((h: any) => {
      const asset = h.assets as any;
      return asset?.asset_type === 'mutual_fund' || asset?.asset_type === 'index_fund';
    });
    
    const mfHoldingsWithISIN = allMFHoldings.filter((h: any) => {
      const asset = h.assets as any;
      return asset?.isin;
    });
    
    const mfHoldingsWithoutISIN = allMFHoldings.filter((h: any) => {
      const asset = h.assets as any;
      return !asset?.isin;
    });
    
    // Note: MF holdings without ISINs need backfill (run POST /api/mf/isin/backfill)
    // Log warning only in development for missing ISINs
    if (mfHoldingsWithoutISIN.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(`[Portfolio Data API] Found ${mfHoldingsWithoutISIN.length} MF holdings without ISINs (will use invested_value as fallback)`);
    }
    
    // Fetch NAVs for MF holdings WITH ISINs
    if (mfHoldingsWithISIN.length > 0) {
      const isins = mfHoldingsWithISIN.map((h: any) => (h.assets as any).isin).filter(Boolean);
      const mfNavs = await getMFNavsByISIN(isins);
      
      // For MF holdings: Store NAV data in memory for read-time computation
      // DO NOT persist current_value for MF - it's computed from units × latest_nav
      // DO NOT use diff logic for MF - NAV is the single source of truth
      
      // Store NAV data in holding object for later use (don't persist current_value)
      for (const holding of mfHoldingsWithISIN) {
        const asset = holding.assets as any;
        const isin = asset?.isin;
        if (!isin) continue;
        
        const navData = mfNavs.get(isin.toUpperCase());
        
        if (!navData) {
          // NAV not found in batch query - use invested_value as fallback
          // Don't make individual queries here (performance optimization)
          console.warn(`[Portfolio Data API] No NAV data found for ISIN: ${isin}`);
        } else if (navData.nav) {
          // Store NAV in memory for computation (don't persist)
          (holding as any)._computedNav = navData.nav;
          (holding as any)._navDate = navData.navDate;
        } else {
          console.warn(`[Portfolio Data API] NAV data exists but nav is null/undefined for ISIN: ${isin}, navDate: ${navData.navDate}`);
        }
      }
    }
    
    // 4. Calculate total portfolio value from holdings (source of truth)
    // CRITICAL: This ensures totals match sum of holdings
    // For MF: Compute current_value from units × NAV (computed at read-time)
    // For equity: Use current_value if available (from stored prices)
    // For Gold: Compute current_value from quantity × gold_price (computed at read-time)
    // For PPF/EPF: Use currentBalance from notes
    // For others: Use invested_value
    let totalValue = 0;
    const allocationMap = new Map<string, number>();
    
    holdings.forEach(h => {
      const assetType = (h.assets as any)?.asset_type || 'other';
      const isMF = assetType === 'mutual_fund' || assetType === 'index_fund';
      const isEquity = assetType === 'equity' || assetType === 'etf';
      const investedValue = h.invested_value || 0;
      
      let valueToUse = investedValue;
      const isPPF = assetType === 'ppf';
      const isEPF = assetType === 'epf';
      const isGold = assetType === 'gold';
      
      if (isMF) {
        // MF: Compute current_value from units × latest_nav (NAV-driven)
        const computedNav = (h as any)._computedNav;
        const quantity = h.quantity || 0;
        
        if (computedNav && computedNav > 0 && quantity > 0) {
          // Compute current_value from units × latest_nav
          valueToUse = quantity * computedNav;
        } else {
          // No NAV available - use invested_value as fallback
          valueToUse = investedValue;
        }
      } else if (isEquity) {
        // Stocks & ETFs: Compute from price (like MF NAVs) - real-time pricing
        const computedPrice = (h as any)._computedPrice;
        const quantity = h.quantity || 0;
        
        if (computedPrice && computedPrice > 0 && quantity > 0) {
          // Compute current_value from quantity × latest_price (price-driven, like MF NAVs)
          valueToUse = quantity * computedPrice;
        } else {
          // No price available - use current_value from database if available, else invested_value
          if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
            valueToUse = h.current_value;
          } else {
            valueToUse = investedValue;
          }
        }
      } else if (isGold) {
        // Gold: Compute from gold prices (like stock prices)
        const computedGoldPrice = (h as any)._computedGoldPrice;
        const quantity = h.quantity || 0;
        
        if (computedGoldPrice && computedGoldPrice > 0 && quantity > 0) {
          // Compute current_value from quantity × latest_gold_price
          valueToUse = quantity * computedGoldPrice;
        } else {
          // No gold price available - use current_value from database if available, else invested_value
          if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
            valueToUse = h.current_value;
          } else {
            valueToUse = investedValue;
          }
        }
      } else if (isPPF || isEPF) {
        // PPF/EPF: Use currentBalance from notes (user-entered current balance)
        // This is the actual current value, not invested value
        try {
          const notes = h.notes ? JSON.parse(h.notes) : {};
          const currentBalance = notes.currentBalance;
          
          if (currentBalance !== null && currentBalance !== undefined && currentBalance > 0) {
            valueToUse = currentBalance;
          } else {
            // Fallback to current_value from database, then invested_value
            if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
              valueToUse = h.current_value;
            } else {
              valueToUse = investedValue;
            }
          }
        } catch (e) {
          // If notes parsing fails, use current_value from database, then invested_value
          if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
            valueToUse = h.current_value;
          } else {
            valueToUse = investedValue;
          }
        }
      }
      
      // Add to total
      totalValue += valueToUse;
      
      // Add to allocation map
      // IMPORTANT: Use computed current value (valueToUse) for ALL asset types
      // This ensures allocation percentages are based on current values, not invested values
      allocationMap.set(assetType, (allocationMap.get(assetType) || 0) + valueToUse);
    });
    
    // CRITICAL VALIDATION: Verify all asset types are included
    // This prevents missing asset types (like Gold) from being excluded from totals
    const assetTypesInHoldings = new Set(holdings.map(h => (h.assets as any)?.asset_type).filter(Boolean));
    const assetTypesInAllocation = new Set(allocationMap.keys());
    const missingTypes = Array.from(assetTypesInHoldings).filter(t => !assetTypesInAllocation.has(t));
    if (missingTypes.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(`[Portfolio Data API] Asset types in holdings but not in allocation: ${missingTypes.join(', ')}`);
    }
    
    // 5. Calculate allocation by asset type (already computed above)
    
    // Convert to allocation array with percentages
    let allocation: AllocationItem[] = Array.from(allocationMap.entries())
      .map(([type, value]) => ({
        name: ASSET_TYPE_LABELS[type] || type,
        percentage: calculateAllocationPercentage(value, totalValue),
        color: ALLOCATION_COLORS[type] || '#64748b',
        value: value,
      }))
      .filter(a => a.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
    
    // Normalize allocations to sum to 100%
    if (allocation.length > 0 && totalValue > 0) {
      allocation = normalizeAllocations(allocation);
    }
    
    // 6. Format all holdings with full details
    // IMPORTANT: Include ALL holdings, even if assets are null (they should be linked, but handle gracefully)
    const formattedHoldings: HoldingDetail[] = holdings.map(h => {
      const asset = h.assets as any;
      const assetType = asset?.asset_type || 'other';
      const investedValue = h.invested_value || 0;
      
      // Log if asset is null (indicates linking issue)
      if (!asset && process.env.NODE_ENV === 'development') {
        console.warn(`[Portfolio Data API] Holding ${h.id} has null asset (asset_id: ${(h as any).asset_id})`);
      }
      
      // CRITICAL: Mutual Funds and ETFs/Equity use real-time computation (like MF NAVs)
      // For MF: current_value = units × latest_nav (computed at read-time)
      // For Stocks & ETFs: current_value = quantity × latest_price (computed at read-time)
      // For PPF/EPF: current_value = currentBalance from notes (user-entered current balance)
      let currentValue = investedValue;
      const isMF = assetType === 'mutual_fund' || assetType === 'index_fund';
      const isEquity = assetType === 'equity' || assetType === 'etf';
      const isGold = assetType === 'gold';
      const isPPF = assetType === 'ppf';
      const isEPF = assetType === 'epf';
      
      if (isMF) {
        // MF: Compute from NAV (single source of truth)
        const computedNav = (h as any)._computedNav;
        const quantity = h.quantity || 0;
        
        if (computedNav && computedNav > 0 && quantity > 0) {
          // Compute current_value from units × latest_nav (NAV-driven)
          currentValue = quantity * computedNav;
        } else {
          // No NAV available - use invested_value as fallback
          currentValue = investedValue;
        }
      } else if (isGold) {
        // Gold: Compute from gold prices (like stock prices)
        const computedGoldPrice = (h as any)._computedGoldPrice;
        const quantity = h.quantity || 0;
        
        if (computedGoldPrice && computedGoldPrice > 0 && quantity > 0) {
          // Compute current_value from quantity × latest_gold_price
          currentValue = quantity * computedGoldPrice;
        } else {
          // No gold price available - use current_value from database if available, else invested_value
          if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
            currentValue = h.current_value;
          } else {
            // Fallback: use invested_value if no current_value available
            currentValue = investedValue;
          }
        }
      } else if (isEquity) {
        // Stocks & ETFs: Compute from price (like MF NAVs) - real-time pricing
        const computedPrice = (h as any)._computedPrice;
        const quantity = h.quantity || 0;
        
        if (computedPrice && computedPrice > 0 && quantity > 0) {
          // Compute current_value from quantity × latest_price (price-driven, like MF NAVs)
          currentValue = quantity * computedPrice;
        } else {
          // No price available - use current_value from database if available, else invested_value
          if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
            currentValue = h.current_value;
          } else {
            currentValue = investedValue;
          }
        }
      } else if (isPPF || isEPF) {
        // PPF/EPF: Use currentBalance from notes (user-entered current balance)
        // This is the actual current value, not invested value
        try {
          const notes = h.notes ? JSON.parse(h.notes) : {};
          const currentBalance = notes.currentBalance;
          
          if (currentBalance !== null && currentBalance !== undefined && currentBalance > 0) {
            currentValue = currentBalance;
          } else {
            // Fallback to current_value from database, then invested_value
            if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
              currentValue = h.current_value;
            } else {
              currentValue = investedValue;
            }
          }
        } catch (e) {
          // If notes parsing fails, use current_value from database, then invested_value
          if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
            currentValue = h.current_value;
          } else {
            currentValue = investedValue;
          }
        }
      }
      
      // Calculate allocation based on current_value for equity/MF/PPF/EPF (if available), invested_value for others
      const valueForAllocation = (isMF || isEquity || isPPF || isEPF) && currentValue !== investedValue && currentValue > investedValue
        ? currentValue
        : investedValue;
      
      return {
        id: h.id,
        name: asset?.name || 'Unknown',
        symbol: asset?.symbol || null,
        isin: asset?.isin || null,
        assetType: ASSET_TYPE_LABELS[assetType] || assetType || 'Other',
        quantity: h.quantity || 0,
        averagePrice: h.average_price || 0,
        investedValue: investedValue,
        currentValue: currentValue,
        allocationPct: calculateAllocationPercentage(valueForAllocation, totalValue),
        sector: asset?.sector || null,
        assetClass: asset?.asset_class || null,
        notes: h.notes || null,
        navDate: isMF ? ((h as any)._navDate || null) : null, // Include NAV date for MF holdings
        priceDate: isEquity ? ((h as any)._priceDate || null) : null, // Include price date for equity/ETF holdings
      };
    });
    
    // 7. Get top 5 holdings for quick view
    const topHoldings = formattedHoldings.slice(0, 5);
    
    // 8. Calculate summary stats
    const assetTypes = new Set(holdings.map(h => (h.assets as any)?.asset_type).filter(Boolean));
    const largestHoldingPct = formattedHoldings.length > 0 ? formattedHoldings[0].allocationPct : 0;
    
    // 9. Generate insights based on portfolio
    const insights: InsightItem[] = [];
    
    // Concentration insight
    if (topHoldings.length > 0 && topHoldings[0].allocationPct > 25) {
      insights.push({
        id: 1,
        type: 'info' as const,
        title: `${topHoldings[0].name} is ${topHoldings[0].allocationPct.toFixed(1)}% of your portfolio`,
        description: 'Consider if this concentration aligns with your risk tolerance.',
      });
    }
    
    // Equity allocation insight
    const equityAllocation = allocation.find(a => 
      a.name === 'Stocks' || a.name === 'Mutual Funds' || a.name === 'Index Funds' || a.name === 'ETFs'
    );
    const equityPct = equityAllocation?.percentage || metrics?.equity_pct || 0;
    
    if (equityPct > 80) {
      insights.push({
        id: 2,
        type: 'info' as const,
        title: 'High equity allocation',
        description: `${equityPct.toFixed(0)}% in equity. Good for growth, but ensure this matches your risk profile.`,
      });
    } else if (equityPct < 30 && totalValue > 100000) {
      insights.push({
        id: 2,
        type: 'opportunity' as const,
        title: 'Consider more equity exposure',
        description: 'For long-term goals, equity historically provides better inflation-adjusted returns.',
      });
    }
    
    // Diversification insight
    if (holdings.length < 5 && holdings.length > 0) {
      insights.push({
        id: 3,
        type: 'info' as const,
        title: 'Portfolio diversification',
        description: `You have ${holdings.length} holding${holdings.length === 1 ? '' : 's'}. Consider spreading across more assets for better risk management.`,
      });
    }
    
    // Default insight if none generated
    if (insights.length === 0 && holdings.length > 0) {
      insights.push({
        id: 1,
        type: 'info' as const,
        title: 'Your portfolio is well-structured',
        description: 'Continue your regular investments and review periodically.',
      });
    }
    
    // 10. Verify data integrity
    // Ensure no holding exceeds 100%
    const invalidHoldings = formattedHoldings.filter(h => h.allocationPct > 100);
    if (invalidHoldings.length > 0) {
      console.error('DATA INTEGRITY ERROR: Holdings with >100% allocation:', invalidHoldings);
    }
    
    // Ensure allocation sums to ~100%
    const allocationSum = allocation.reduce((sum, a) => sum + a.percentage, 0);
    if (holdings.length > 0 && Math.abs(allocationSum - 100) > 1) {
      console.warn(`Allocation sum is ${allocationSum.toFixed(1)}%, expected 100%`);
    }
    
    // 11. Build response
    const response: PortfolioDataResponse = {
      success: true,
      data: {
        metrics: {
          netWorth: totalValue,
          netWorthChange: 0, // Would need historical data to calculate
          riskScore: metrics?.risk_score || 50,
          riskLabel: metrics?.risk_label || 'Moderate',
          goalAlignment: metrics?.goal_progress_pct || 0,
        },
        allocation,
        holdings: formattedHoldings,
        topHoldings,
        insights,
        hasData: holdings.length > 0,
        summary: {
          totalHoldings: holdings.length,
          totalAssetTypes: assetTypes.size,
          largestHoldingPct,
          lastUpdated: portfolio.updated_at,
          createdAt: portfolio.created_at,
        },
      },
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Portfolio data error:', error);
    return NextResponse.json<PortfolioDataResponse>(
      { success: false, error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
