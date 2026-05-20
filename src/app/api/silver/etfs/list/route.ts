import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SilverEtfItem {
  name: string;
  schemeCode: string;
  isin: string;
  exchange: 'NSE' | 'BSE';
  amc: string;
}

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('mf_scheme_master')
      .select('scheme_code, scheme_name, isin_growth, amc_name')
      .ilike('scheme_name', '%silver%')
      .ilike('scheme_name', '%etf%')
      .limit(200);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch silver ETF schemes' }, { status: 500 });
    }

    const rows = (data || []) as Array<{
      scheme_code: string | null;
      scheme_name: string | null;
      isin_growth: string | null;
      amc_name: string | null;
    }>;

    const items: SilverEtfItem[] = rows
      .filter((row) => !!row.scheme_name && !!row.scheme_code)
      .map((row) => ({
        name: row.scheme_name as string,
        schemeCode: row.scheme_code as string,
        isin: row.isin_growth || '',
        exchange: 'NSE',
        amc: row.amc_name || 'Unknown AMC',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { success: true, items },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
