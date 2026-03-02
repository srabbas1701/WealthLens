/**
 * API Route: Update NPS NAVs
 * 
 * Fetches latest NAVs for all NPS schemes and updates holdings.
 * Currently uses mock data; can be extended to fetch from external APIs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Helper: Get or create user's primary portfolio
async function getPrimaryPortfolio(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (error || !data) {
    throw new Error('Portfolio not found');
  }

  return data.id;
}

// Helper: Parse NPS metadata from notes field
function parseNPSMetadata(notes: string | null): any {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch (e) {
    return null;
  }
}

// ============================================================================
// NPS SCHEME CODE MAPPING
// Source: https://www.npstrust.org.in/content/scheme-wise-nav
// Scheme code format: SM{manager}{tier}{assetClass}
// Manager codes: HDFC=01, ICICI=02, KOTAK=03, LIC=04, SBI=05, UTI=06, BIRLA=07, MAX=08
// Asset class suffix: E=E, C=C, G=G, A=A
// ============================================================================

const SCHEME_CODE_MAP: Record<string, Record<string, Record<string, string>>> = {
  HDFC:  { tier1: { E: 'SM011001', C: 'SM011002', G: 'SM011003', A: 'SM011004' }, tier2: { E: 'SM012001', C: 'SM012002', G: 'SM012003', A: 'SM012004' } },
  ICICI: { tier1: { E: 'SM021001', C: 'SM021002', G: 'SM021003', A: 'SM021004' }, tier2: { E: 'SM022001', C: 'SM022002', G: 'SM022003', A: 'SM022004' } },
  KOTAK: { tier1: { E: 'SM031001', C: 'SM031002', G: 'SM031003', A: 'SM031004' }, tier2: { E: 'SM032001', C: 'SM032002', G: 'SM032003', A: 'SM032004' } },
  LIC:   { tier1: { E: 'SM041001', C: 'SM041002', G: 'SM041003', A: 'SM041004' }, tier2: { E: 'SM042001', C: 'SM042002', G: 'SM042003', A: 'SM042004' } },
  SBI:   { tier1: { E: 'SM051001', C: 'SM051002', G: 'SM051003', A: 'SM051004' }, tier2: { E: 'SM052001', C: 'SM052002', G: 'SM052003', A: 'SM052004' } },
  UTI:   { tier1: { E: 'SM061001', C: 'SM061002', G: 'SM061003', A: 'SM061004' }, tier2: { E: 'SM062001', C: 'SM062002', G: 'SM062003', A: 'SM062004' } },
  BIRLA: { tier1: { E: 'SM071001', C: 'SM071002', G: 'SM071003', A: 'SM071004' }, tier2: { E: 'SM072001', C: 'SM072002', G: 'SM072003', A: 'SM072004' } },
  MAX:   { tier1: { E: 'SM081001', C: 'SM081002', G: 'SM081003', A: 'SM081004' }, tier2: { E: 'SM082001', C: 'SM082002', G: 'SM082003', A: 'SM082004' } },
};

// Fetch latest NAVs from NPS Trust website
// Returns a map of schemeCode → { nav: number, date: string } or null on failure
async function fetchNPSTrustNAVs(): Promise<Map<string, { nav: number; date: string }> | null> {
  try {
    // NPS Trust publishes daily scheme-wise NAV data
    // The scheme-wise NAV page returns HTML with a data table
    const response = await fetch('https://www.npstrust.org.in/content/scheme-wise-nav', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NPS-NAV-Fetcher/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10-second timeout
    });

    if (!response.ok) {
      console.warn('[NPS NAV] NPS Trust fetch returned', response.status);
      return null;
    }

    const html = await response.text();
    const navMap = new Map<string, { nav: number; date: string }>();

    // Extract NAV rows: each row contains scheme code, NAV, and date
    // Pattern: scheme code like SM011001, followed by NAV value and date
    const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(rowPattern) || [];

    // Also try extracting via a simpler td-based approach
    // NPS Trust table typically has columns: Scheme Name | Scheme Code | NAV | Date
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;

    for (const row of rows) {
      const cells: string[] = [];
      let match;
      const localTdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      while ((match = localTdPattern.exec(row)) !== null) {
        cells.push(match[1].replace(/<[^>]*>/g, '').trim());
      }

      if (cells.length >= 3) {
        // Look for scheme code pattern (SM followed by digits)
        const schemeCodeCell = cells.find(c => /^SM\d{6,8}$/i.test(c.trim()));
        if (schemeCodeCell) {
          const schemeCode = schemeCodeCell.trim().toUpperCase();
          // NAV is typically a decimal number like 75.3411
          const navCell = cells.find(c => /^\d+\.\d{2,4}$/.test(c.trim()));
          // Date is typically DD/MM/YYYY or YYYY-MM-DD
          const dateCell = cells.find(c => /\d{1,4}[/-]\d{1,2}[/-]\d{2,4}/.test(c.trim()));

          if (navCell) {
            const nav = parseFloat(navCell);
            if (!isNaN(nav) && nav > 0) {
              navMap.set(schemeCode, {
                nav,
                date: dateCell || new Date().toISOString().split('T')[0],
              });
            }
          }
        }
      }
    }

    if (navMap.size > 0) {
      console.log(`[NPS NAV] Successfully fetched ${navMap.size} NAVs from NPS Trust`);
      return navMap;
    }

    console.warn('[NPS NAV] NPS Trust HTML parsed but no scheme NAVs found — falling back to mock');
    return null;
  } catch (error: any) {
    console.warn('[NPS NAV] Failed to fetch from NPS Trust:', error.message || error);
    return null;
  }
}

// Fallback: deterministic date-based mock NAV (keeps same value for same date)
function getMockNAVUpdate(currentNAV: number, assetClass: string): number {
  const today = new Date().toISOString().split('T')[0];
  const seed = parseInt(today.replace(/-/g, ''), 10);
  const seededRandom = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };

  let maxVariation = 0.015;
  if (assetClass === 'G') maxVariation = 0.005;
  else if (assetClass === 'C') maxVariation = 0.008;
  else if (assetClass === 'A') maxVariation = 0.012;

  const randomValue = seededRandom(seed + assetClass.charCodeAt(0));
  const variation = currentNAV * ((randomValue * maxVariation * 2) - maxVariation);
  return Math.max(parseFloat((currentNAV + variation).toFixed(4)), 1.0);
}

// Update scheme with latest NAV (real from NPS Trust when available, mock otherwise)
function updateSchemeNAV(
  scheme: any,
  tierId: 'tier1' | 'tier2',
  liveNavMap: Map<string, { nav: number; date: string }> | null,
): any {
  const today = new Date().toISOString().split('T')[0];
  const schemeNavDate = scheme.navDate ? new Date(scheme.navDate).toISOString().split('T')[0] : null;

  let latestNAV = scheme.currentNAV;
  let navDate = today;

  // Try real NAV from NPS Trust first
  if (liveNavMap) {
    const schemeCode = SCHEME_CODE_MAP[scheme.fundManager]?.[tierId]?.[scheme.assetClass];
    if (schemeCode) {
      const liveEntry = liveNavMap.get(schemeCode);
      if (liveEntry && liveEntry.nav > 0) {
        latestNAV = liveEntry.nav;
        navDate = liveEntry.date || today;
        console.log(`[NPS NAV] Using real NAV for ${schemeCode}: ${latestNAV}`);
      }
    }
  }

  // Fall back to deterministic mock if real NAV not available and not yet updated today
  if (latestNAV === scheme.currentNAV && schemeNavDate !== today) {
    latestNAV = getMockNAVUpdate(scheme.currentNAV, scheme.assetClass);
  }

  const currentValue = scheme.currentUnits * latestNAV;
  const returns = currentValue - scheme.investedAmount;
  const returnsPercentage = scheme.investedAmount > 0 ? (returns / scheme.investedAmount) * 100 : 0;

  return {
    ...scheme,
    currentNAV: latestNAV,
    currentValue,
    returns,
    returnsPercentage,
    navDate,
  };
}

// Calculate tier totals
function calculateTierTotals(schemes: any[]) {
  const totalInvested = schemes.reduce((sum, s) => sum + (s.investedAmount || 0), 0);
  const currentValue = schemes.reduce((sum, s) => sum + (s.currentValue || 0), 0);
  const returns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (returns / totalInvested) * 100 : 0;

  return { totalInvested, currentValue, returns, returnsPercentage };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user's portfolio
    const portfolioId = await getPrimaryPortfolio(user_id, supabase);

    // Get all NPS holdings
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select(`
        id,
        notes,
        assets (
          id,
          asset_type
        )
      `)
      .eq('portfolio_id', portfolioId);

    if (error) {
      console.error('[NPS NAV Update] Error fetching holdings:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Filter NPS holdings and update NAVs
    const npsHoldings = holdings.filter((h: any) => h.assets?.asset_type === 'nps');
    let updatedCount = 0;

    // Attempt to fetch real NAVs from NPS Trust once for all holdings
    const liveNavMap = await fetchNPSTrustNAVs();
    if (liveNavMap) {
      console.log(`[NPS NAV Update] Using real NAVs from NPS Trust (${liveNavMap.size} schemes)`);
    } else {
      console.log('[NPS NAV Update] Using deterministic mock NAVs (NPS Trust unavailable)');
    }

    for (const holding of npsHoldings) {
      const metadata = parseNPSMetadata(holding.notes);
      if (!metadata) continue;

      // Update Tier I schemes
      if (metadata.tier1?.schemes) {
        metadata.tier1.schemes = metadata.tier1.schemes.map((s: any) => updateSchemeNAV(s, 'tier1', liveNavMap));
        const tier1Totals = calculateTierTotals(metadata.tier1.schemes);
        metadata.tier1 = {
          ...metadata.tier1,
          totalInvested: tier1Totals.totalInvested,
          currentValue: tier1Totals.currentValue,
          totalReturns: tier1Totals.returns,
          returnsPercentage: tier1Totals.returnsPercentage,
        };
      }

      // Update Tier II schemes
      if (metadata.tier2?.schemes) {
        metadata.tier2.schemes = metadata.tier2.schemes.map((s: any) => updateSchemeNAV(s, 'tier2', liveNavMap));
        const tier2Totals = calculateTierTotals(metadata.tier2.schemes);
        metadata.tier2 = {
          ...metadata.tier2,
          totalInvested: tier2Totals.totalInvested,
          currentValue: tier2Totals.currentValue,
          totalReturns: tier2Totals.returns,
          returnsPercentage: tier2Totals.returnsPercentage,
        };
      }

      // Calculate overall totals
      const tier1Totals = calculateTierTotals(metadata.tier1?.schemes || []);
      const tier2Totals = metadata.tier2 ? calculateTierTotals(metadata.tier2.schemes || []) : { totalInvested: 0, currentValue: 0 };
      
      const totalInvested = tier1Totals.totalInvested + tier2Totals.totalInvested;
      const totalCurrentValue = tier1Totals.currentValue + tier2Totals.currentValue;

      metadata.navUpdatedDate = new Date().toISOString();

      // Update holding in database
      const { error: updateError } = await supabase
        .from('holdings')
        .update({
          invested_value: totalInvested,
          current_value: totalCurrentValue,
          notes: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', holding.id);

      if (updateError) {
        console.error(`[NPS NAV Update] Error updating holding ${holding.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      navSource: liveNavMap ? 'npstrust' : 'mock',
      message: `Successfully updated ${updatedCount} NPS account(s)${liveNavMap ? ' with real NAVs from NPS Trust' : ' with estimated NAVs'}`,
    });
  } catch (error: any) {
    console.error('[NPS NAV Update] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
