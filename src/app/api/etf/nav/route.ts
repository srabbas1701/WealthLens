/**
 * ETF NAV (Net Asset Value) API Route
 * Fetches current NAV for ETFs using ISIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isin = searchParams.get('isin');

    if (!isin) {
      return NextResponse.json(
        { success: false, error: 'ISIN is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Try to get latest NAV from etf_prices table
    const { data: priceData, error: priceError } = await adminClient
      .from('etf_prices')
      .select('nav, date')
      .eq('isin', isin)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (priceError) {
      console.error('Error fetching ETF NAV:', priceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ETF NAV' },
        { status: 500 }
      );
    }

    if (!priceData) {
      // No data found for this ISIN
      return NextResponse.json(
        {
          success: false,
          error: 'NAV data not available for this ETF',
          message: 'Price data will be available after the next market data update'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      nav: priceData.nav,
      date: priceData.date,
      isin,
    });
  } catch (error) {
    console.error('Error in ETF NAV API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
