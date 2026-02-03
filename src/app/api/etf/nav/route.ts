/**
 * ETF NAV (Net Asset Value) API Route
 * Fetches current NAV for ETFs using scheme_code from existing mf_navs table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schemeCode = searchParams.get('scheme_code');
    const isin = searchParams.get('isin');

    if (!schemeCode && !isin) {
      return NextResponse.json(
        { success: false, error: 'scheme_code or isin is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    let finalSchemeCode = schemeCode;

    // If ISIN is provided but not scheme_code, look it up
    if (!finalSchemeCode && isin) {
      const { data: schemeData } = await adminClient
        .from('mf_scheme_master')
        .select('scheme_code')
        .eq('isin_growth', isin)
        .maybeSingle();

      if (schemeData) {
        finalSchemeCode = schemeData.scheme_code;
      }
    }

    if (!finalSchemeCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'NAV data not available for this ETF',
          message: 'Unable to find scheme code for the provided ISIN'
        },
        { status: 404 }
      );
    }

    // Get latest NAV from mf_navs table using scheme_code
    const { data: navData, error: navError } = await adminClient
      .from('mf_navs')
      .select('nav, nav_date, scheme_name')
      .eq('scheme_code', finalSchemeCode)
      .order('nav_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (navError) {
      console.error('Error fetching ETF NAV:', navError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ETF NAV' },
        { status: 500 }
      );
    }

    if (!navData) {
      // No data found for this scheme_code
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
      nav: parseFloat(navData.nav),
      date: navData.nav_date,
      scheme_code: finalSchemeCode,
      scheme_name: navData.scheme_name,
    });
  } catch (error) {
    console.error('Error in ETF NAV API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
