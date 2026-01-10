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
const ALLOCATION_COLORS: Record<string, string> = {
  'equity': '#10b981',      // Emerald - Stocks
  'mutual_fund': '#059669', // Emerald darker - Mutual Funds
  'index_fund': '#14b8a6',  // Teal - Index Funds
  'etf': '#06b6d4',         // Cyan - ETFs
  'debt': '#6366f1',        // Indigo - Debt category
  'fd': '#818cf8',          // Indigo lighter - FDs
  'bond': '#8b5cf6',        // Violet - Bonds
  'gold': '#f59e0b',        // Amber - Gold
  'ppf': '#a78bfa',         // Purple lighter - PPF
  'epf': '#a855f7',         // Purple - EPF
  'nps': '#ec4899',         // Pink - NPS
  'cash': '#94a3b8',        // Slate - Cash
  'hybrid': '#f472b6',      // Pink lighter - Hybrid
  'other': '#64748b',       // Gray - Other
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
    const { data: rawHoldings, error: holdingsError } = await supabase
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
    
    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
    }
    
    const holdings = rawHoldings || [];
    
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
    
    // 3.6. Fetch NAVs for mutual fund holdings (batch query for performance)
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
    // For others: Use invested_value
    let totalValue = 0;
    const allocationMap = new Map<string, number>();
    
    holdings.forEach(h => {
      const assetType = (h.assets as any)?.asset_type || 'other';
      const isMF = assetType === 'mutual_fund' || assetType === 'index_fund';
      const isEquity = assetType === 'equity' || assetType === 'etf';
      const investedValue = h.invested_value || 0;
      
      let valueToUse = investedValue;
      
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
      }
      
      // Add to total
      totalValue += valueToUse;
      
      // Add to allocation map (use computed value for equity/MF, invested_value for others)
      allocationMap.set(assetType, (allocationMap.get(assetType) || 0) + valueToUse);
    });
    
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
    const formattedHoldings: HoldingDetail[] = holdings.map(h => {
      const asset = h.assets as any;
      const assetType = asset?.asset_type || 'other';
      const investedValue = h.invested_value || 0;
      
      // CRITICAL: Mutual Funds and ETFs/Equity use real-time computation (like MF NAVs)
      // For MF: current_value = units × latest_nav (computed at read-time)
      // For Stocks & ETFs: current_value = quantity × latest_price (computed at read-time)
      let currentValue = investedValue;
      const isMF = assetType === 'mutual_fund' || assetType === 'index_fund';
      const isEquity = assetType === 'equity' || assetType === 'etf';
      
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
      }
      
      // Calculate allocation based on current_value for equity/MF (if available), invested_value for others
      const valueForAllocation = (isMF || isEquity) && currentValue !== investedValue && currentValue > investedValue
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
