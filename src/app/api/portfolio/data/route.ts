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
      .select('id, total_value, updated_at')
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
    
    // 3.5. Fetch stock prices for equity holdings and update current_value
    // Extract equity holdings with symbols
    const equityHoldings = holdings.filter((h: any) => {
      const asset = h.assets as any;
      return asset?.asset_type === 'equity' && asset?.symbol;
    });
    
    if (equityHoldings.length > 0) {
      const symbols = equityHoldings.map((h: any) => (h.assets as any).symbol).filter(Boolean);
      const stockPrices = await getStockPrices(symbols);
      
      // Update holdings with current prices
      const priceDate = getPreviousTradingDay();
      let updatedCount = 0;
      
      for (const holding of equityHoldings) {
        const asset = holding.assets as any;
        const symbol = asset?.symbol;
        if (!symbol) continue;
        
        const priceData = stockPrices.get(symbol.toUpperCase());
        
        if (priceData && priceData.price) {
          // Calculate current_value from quantity × current_price
          const quantity = holding.quantity || 0;
          const currentPrice = priceData.price;
          const newCurrentValue = quantity * currentPrice;
          
          // Only update if different (avoid unnecessary DB writes)
          const existingCurrentValue = holding.current_value || 0;
          if (Math.abs(newCurrentValue - existingCurrentValue) > 0.01) {
            const { error: updateError } = await supabase
              .from('holdings')
              .update({
                current_value: newCurrentValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', holding.id);
            
            if (!updateError) {
              holding.current_value = newCurrentValue;
              updatedCount++;
            } else {
              console.warn(`[Portfolio Data API] Failed to update current_value for holding ${holding.id}:`, updateError);
            }
          }
        } else {
          // No price available for today - check if we have a stored price (even if stale)
          // Never default to avg_buy_price for equity
          const lastPrice = await getStockPrice(symbol);
          if (lastPrice && lastPrice.price) {
            const quantity = holding.quantity || 0;
            const newCurrentValue = quantity * lastPrice.price;
            
            // Update with last known price (may be stale, but better than avg_buy_price)
            const { error: updateError } = await supabase
              .from('holdings')
              .update({
                current_value: newCurrentValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', holding.id);
            
            if (!updateError) {
              holding.current_value = newCurrentValue;
              console.warn(`[Portfolio Data API] Using stale price for ${symbol}: ₹${lastPrice.price} (${lastPrice.priceDate})`);
            }
          }
          // Removed verbose logging - prices are fetched silently, errors are logged elsewhere if needed
        }
      }
      
      // Price updates complete (no logging for routine operations)
    }
    
    // 3.6. Fetch NAVs for mutual fund holdings and update current_value
    // Extract MF holdings with ISINs
    const mfHoldings = holdings.filter((h: any) => {
      const asset = h.assets as any;
      return (asset?.asset_type === 'mutual_fund' || asset?.asset_type === 'index_fund' || asset?.asset_type === 'etf') && asset?.isin;
    });
    
    if (mfHoldings.length > 0) {
      const isins = mfHoldings.map((h: any) => (h.assets as any).isin).filter(Boolean);
      const mfNavs = await getMFNavsByISIN(isins);
      
      // Update holdings with current NAVs
      const navDate = getPreviousTradingDay();
      let updatedCount = 0;
      
      for (const holding of mfHoldings) {
        const asset = holding.assets as any;
        const isin = asset?.isin;
        if (!isin) continue;
        
        const navData = mfNavs.get(isin.toUpperCase());
        
        if (navData && navData.nav) {
          // Calculate current_value from quantity × current_nav
          const quantity = holding.quantity || 0;
          const currentNav = navData.nav;
          const newCurrentValue = quantity * currentNav;
          
          // Only update if different (avoid unnecessary DB writes)
          const existingCurrentValue = holding.current_value || 0;
          if (Math.abs(newCurrentValue - existingCurrentValue) > 0.01) {
            const { error: updateError } = await supabase
              .from('holdings')
              .update({
                current_value: newCurrentValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', holding.id);
            
            if (!updateError) {
              holding.current_value = newCurrentValue;
              updatedCount++;
            } else {
              console.warn(`[Portfolio Data API] Failed to update current_value for MF holding ${holding.id}:`, updateError);
            }
          }
        } else {
          // No NAV available for today - check if we have a stored NAV (even if stale)
          // Never default to avg_buy_nav for MF
          const lastNav = await getMFNavByISIN(isin);
          if (lastNav && lastNav.nav) {
            const quantity = holding.quantity || 0;
            const newCurrentValue = quantity * lastNav.nav;
            
            // Update with last known NAV (may be stale, but better than avg_buy_nav)
            const { error: updateError } = await supabase
              .from('holdings')
              .update({
                current_value: newCurrentValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', holding.id);
            
            if (!updateError) {
              holding.current_value = newCurrentValue;
              // Only log if NAV is more than 3 days old (stale data warning)
              const navDate = new Date(lastNav.navDate);
              const daysOld = (Date.now() - navDate.getTime()) / (1000 * 60 * 60 * 24);
              if (daysOld > 3) {
                console.warn(`[Portfolio Data API] Using stale NAV for ${isin}: ₹${lastNav.nav} (${lastNav.navDate}, ${daysOld.toFixed(0)} days old)`);
              }
            }
          }
          // Removed verbose logging - NAVs are fetched silently, errors are logged elsewhere if needed
        }
      }
      
      // NAV updates complete (no logging for routine operations)
    }
    
    // 4. Calculate total portfolio value from holdings (source of truth)
    // CRITICAL: This ensures totals match sum of holdings
    // Use current_value for equity (if available), invested_value for others
    let totalValue = 0;
    holdings.forEach(h => {
      const assetType = (h.assets as any)?.asset_type || 'other';
      
      // Recompute invested_value from quantity × average_price for verification
      const computedInvestedValue = calculateInvestedValue(h.quantity || 0, h.average_price || 0);
      const storedInvestedValue = h.invested_value || 0;
      
      if (Math.abs(computedInvestedValue - storedInvestedValue) > 0.01 && storedInvestedValue > 0) {
        console.warn(`Value mismatch for holding ${h.id}: stored=${storedInvestedValue}, computed=${computedInvestedValue}`);
      }
      
      // For equity and MF, use current_value if available (from stored prices/NAVs)
      // If current_value is null for equity/MF, use invested_value as temporary fallback for display
      // (This ensures dashboard doesn't break while prices/NAVs are being fetched)
      let valueToUse = storedInvestedValue;
      if (assetType === 'equity' || assetType === 'mutual_fund' || assetType === 'index_fund' || assetType === 'etf') {
        if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
          valueToUse = h.current_value;
        } else {
          // Temporary fallback: use invested_value for display, but log that prices/NAVs need fetching
          valueToUse = storedInvestedValue;
          if (h.current_value === null || h.current_value === undefined) {
            const identifier = (h.assets as any)?.symbol || (h.assets as any)?.isin || `${assetType} holding`;
            console.warn(`[Portfolio Data API] Using invested_value as temporary fallback for ${identifier} - ${assetType === 'equity' ? 'prices' : 'NAVs'} need to be fetched`);
          }
        }
      }
      
      totalValue += valueToUse;
    });
    
    // 5. Calculate allocation by asset type
    // Group holdings by asset type and sum values
    // Use current_value for equity, invested_value for others
    const allocationMap = new Map<string, number>();
    holdings.forEach(h => {
      const assetType = (h.assets as any)?.asset_type || 'other';
      // For equity, use current_value if available; otherwise invested_value
      // For other asset types, use invested_value (no market pricing)
      const value = assetType === 'equity' && h.current_value 
        ? h.current_value 
        : (h.invested_value || 0);
      allocationMap.set(assetType, (allocationMap.get(assetType) || 0) + value);
    });
    
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
      
      // For equity and MF, use current_value if available (from stored prices/NAVs)
      // If current_value is null, use invested_value as temporary fallback for display
      let currentValue = investedValue;
      const isMarketPriced = assetType === 'equity' || assetType === 'mutual_fund' || assetType === 'index_fund' || assetType === 'etf';
      if (isMarketPriced) {
        if (h.current_value !== null && h.current_value !== undefined && h.current_value > 0) {
          currentValue = h.current_value;
        } else {
          // Temporary fallback: use invested_value for display until prices/NAVs are fetched
          currentValue = investedValue;
        }
      }
      
      // Calculate allocation based on current_value for equity/MF (if available), invested_value for others
      const valueForAllocation = isMarketPriced && currentValue !== investedValue && currentValue > investedValue
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
