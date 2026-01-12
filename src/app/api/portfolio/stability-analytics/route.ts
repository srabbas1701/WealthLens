/**
 * Stability & Safety Analytics API
 * 
 * GET /api/portfolio/stability-analytics?user_id=xxx
 * 
 * Returns stability and safety analytics including:
 * - Capital-protected vs market-linked breakdown
 * - Credit risk exposure
 * - Retirement contribution analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeHoldings } from '@/lib/portfolio-intelligence/asset-normalization';
import {
  calculateStabilityAnalysis,
  StabilityAnalysis,
} from '@/lib/portfolio-intelligence/stability-analytics';
import { getStockPrices } from '@/lib/stock-prices';
import { getMFNavsByISIN } from '@/lib/mf-navs';

export const revalidate = 300; // Cache for 5 minutes

interface StabilityAnalyticsResponse {
  success: boolean;
  data?: StabilityAnalysis;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json<StabilityAnalyticsResponse>(
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
      return NextResponse.json<StabilityAnalyticsResponse>(
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
      console.error('[Stability Analytics API] Error fetching holdings:', holdingsError);
      return NextResponse.json<StabilityAnalyticsResponse>(
        { success: false, error: 'Failed to fetch holdings' },
        { status: 500 }
      );
    }
    
    if (!rawHoldings || rawHoldings.length === 0) {
      return NextResponse.json<StabilityAnalyticsResponse>({
        success: true,
        data: {
          metrics: {
            capitalProtected: { value: 0, percentage: 0, sources: [] },
            marketLinked: { value: 0, percentage: 0 },
            stabilityScore: 0,
            stabilityGrade: 'Low',
          },
          creditRisk: {
            totalExposure: 0,
            breakdown: [],
            riskLevel: 'Low',
          },
          retirement: {
            totalValue: 0,
            percentage: 0,
            breakdown: [],
            taxBenefits: { eeeAssets: 0, eetAssets: 0 },
          },
          insights: ['Add holdings to analyze stability'],
          metadata: {
            calculatedAt: new Date().toISOString(),
            totalPortfolioValue: 0,
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
    
    // 6. Calculate stability analysis
    const analysis = calculateStabilityAnalysis(normalizedHoldings);
    
    return NextResponse.json<StabilityAnalyticsResponse>({
      success: true,
      data: analysis,
    });
    
  } catch (error) {
    console.error('[Stability Analytics API] Error:', error);
    return NextResponse.json<StabilityAnalyticsResponse>(
      { success: false, error: 'Failed to calculate stability analytics' },
      { status: 500 }
    );
  }
}