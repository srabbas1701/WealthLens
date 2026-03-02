/**
 * API Route: Enrich Stock Sectors (Backfill)
 *
 * POST /api/stocks/enrich-sectors
 *
 * One-time (or on-demand) backfill that populates assets.sector and
 * assets.sub_sector for all equity assets that currently have no sector.
 *
 * Data source: Yahoo Finance v1/finance/search (autocomplete API, no auth required).
 *
 * Since assets is a shared reference table (not per-user), enriching a stock
 * once enriches it for ALL users.
 *
 * Rate limiting: 200ms delay between Yahoo calls to avoid throttling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchStockSector } from '@/lib/stock-helpers';

const DELAY_MS = 200; // pause between Yahoo Finance calls

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Fetch all equity assets with no sector
    const { data: assets, error: fetchErr } = await supabase
      .from('assets')
      .select('id, symbol, name')
      .eq('asset_type', 'equity')
      .is('sector', null)
      .not('symbol', 'is', null)
      .order('name');

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No equity assets with missing sector found.',
        enriched: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const results = {
      enriched: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ symbol: string; status: string; sector?: string }>,
    };

    for (const asset of assets) {
      if (!asset.symbol) {
        results.skipped++;
        continue;
      }

      const sectorInfo = await fetchStockSector(asset.symbol);

      if (!sectorInfo || !sectorInfo.sector) {
        results.failed++;
        results.details.push({ symbol: asset.symbol, status: 'no_data' });
        await sleep(DELAY_MS);
        continue;
      }

      const { error: updateErr } = await supabase
        .from('assets')
        .update({
          sector: sectorInfo.sector,
          sub_sector: sectorInfo.subSector,
        })
        .eq('id', asset.id);

      if (updateErr) {
        results.failed++;
        results.details.push({ symbol: asset.symbol, status: 'update_failed' });
      } else {
        results.enriched++;
        results.details.push({
          symbol: asset.symbol,
          status: 'enriched',
          sector: sectorInfo.sector,
        });
      }

      await sleep(DELAY_MS);
    }

    return NextResponse.json({
      success: true,
      total: assets.length,
      enriched: results.enriched,
      failed: results.failed,
      skipped: results.skipped,
      details: results.details,
    });

  } catch (error: any) {
    console.error('[Enrich Sectors] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
