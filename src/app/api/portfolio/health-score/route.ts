// @ts-nocheck
/**
 * Portfolio Health Score API
 *
 * GET /api/portfolio/health-score?user_id=xxx
 *
 * Returns the Portfolio Health Score (0-100) with 7 weighted pillars,
 * deductions, risks, and improvement suggestions.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  normalizeHoldings,
  NormalizedHolding,
} from '@/lib/portfolio-intelligence/asset-normalization';
import {
  calculatePortfolioHealthScore,
  PortfolioHealthScore,
} from '@/lib/portfolio-intelligence/health-score';
import { getStockPrices } from '@/lib/stock-prices';
import { getMFNavsByISIN } from '@/lib/mf-navs';

export const revalidate = 300; // Cache for 5 minutes

interface HealthScoreResponse {
  success: boolean;
  data?: PortfolioHealthScore;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json<HealthScoreResponse>(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // 1. Get user's primary portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();
    
    if (portfolioError || !portfolio) {
      return NextResponse.json<HealthScoreResponse>(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    // 2. Get ALL holdings with asset details
    const { data: rawHoldings, error: holdingsError } = await supabase
      .from('holdings')
      .select(`
        id,
        quantity,
        invested_value,
        current_value,
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
      .eq('portfolio_id', portfolio.id);
    
    if (holdingsError) {
      console.error('[Health Score API] Error fetching holdings:', holdingsError);
      return NextResponse.json<HealthScoreResponse>(
        { success: false, error: 'Failed to fetch holdings' },
        { status: 500 }
      );
    }
    
    if (!rawHoldings || rawHoldings.length === 0) {
      return NextResponse.json<HealthScoreResponse>({
        success: true,
        data: {
          totalScore: 0,
          grade: 'Poor',
          pillarBreakdown: [],
          topRisks: [],
          topImprovements: ['Add holdings to analyze portfolio health'],
          metadata: {
            calculatedAt: new Date().toISOString(),
            totalHoldings: 0,
            totalValue: 0,
          },
        },
      });
    }
    
    // 3. Update current values for equity/ETF (from stock prices)
    const equityHoldings = rawHoldings.filter((h: any) => {
      const asset = h.assets as any;
      return (asset?.asset_type === 'equity' || asset?.asset_type === 'etf') && asset?.symbol;
    });
    
    if (equityHoldings.length > 0) {
      const symbols = equityHoldings.map((h: any) => (h.assets as any).symbol).filter(Boolean);
      const stockPrices = await getStockPrices(symbols);
      
      equityHoldings.forEach((holding: any) => {
        const asset = holding.assets as any;
        const symbol = asset?.symbol;
        if (symbol) {
          const priceData = stockPrices.get(symbol.toUpperCase());
          if (priceData?.price && priceData.price > 0) {
            holding.current_value = (holding.quantity || 0) * priceData.price;
          }
        }
      });
    }
    
    // 4. Update current values for MF (from NAVs)
    const mfHoldings = rawHoldings.filter((h: any) => {
      const asset = h.assets as any;
      return (asset?.asset_type === 'mutual_fund' || asset?.asset_type === 'index_fund') && asset?.isin;
    });
    
    if (mfHoldings.length > 0) {
      const isins = mfHoldings.map((h: any) => (h.assets as any).isin).filter(Boolean);
      const mfNavs = await getMFNavsByISIN(isins);
      
      mfHoldings.forEach((holding: any) => {
        const asset = holding.assets as any;
        const isin = asset?.isin;
        if (isin) {
          const navData = mfNavs.get(isin.toUpperCase());
          if (navData?.nav && navData.nav > 0) {
            holding.current_value = (holding.quantity || 0) * navData.nav;
          }
        }
      });
    }
    
    // 5. Normalize holdings
    const normalizedHoldings = normalizeHoldings(rawHoldings);
    
    // 6. Calculate health score
    const healthScore = calculatePortfolioHealthScore(normalizedHoldings);
    
    return NextResponse.json<HealthScoreResponse>({
      success: true,
      data: healthScore,
    });
    
  } catch (error) {
    console.error('[Health Score API] Error:', error);
    return NextResponse.json<HealthScoreResponse>(
      { success: false, error: 'Failed to calculate health score' },
      { status: 500 }
    );
  }
}