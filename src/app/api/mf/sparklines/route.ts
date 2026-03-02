/**
 * MF NAV Sparkline API
 * GET /api/mf/sparklines?names=SchemeName1|SchemeName2|...
 *
 * Returns ~14 sampled NAV data points over the past 52 weeks for each scheme.
 * Uses the free mfapi.in API (no auth required, covers all AMFI-registered MFs).
 *
 * Flow per scheme:
 *   1. Search mfapi.in by scheme name → get schemeCode
 *   2. Fetch full NAV history for that schemeCode
 *   3. Sample ~14 points evenly over the last 52 weeks (260 trading days)
 *
 * Premium-only feature — access control is enforced on the client.
 * In-process cache (1-hour TTL) to avoid repeated external calls.
 */

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// In-process cache
// ---------------------------------------------------------------------------
const schemeCodeCache = new Map<string, { code: number; cachedAt: number }>();
const sparklineCache  = new Map<string, { data: number[]; cachedAt: number }>();
const CACHE_TTL_MS    = 60 * 60 * 1000; // 1 hour — NAVs update once a day

const MFAPI_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
};

// ---------------------------------------------------------------------------
// Step 1: Resolve scheme name → schemeCode via mfapi.in search
// ---------------------------------------------------------------------------
async function resolveSchemeCode(name: string): Promise<number | null> {
  const cached = schemeCodeCache.get(name);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.code;
  }

  try {
    // Try exact / near-exact name match first
    // mfapi.in search is fuzzy — trim to first ~60 chars for best results
    const query = name.substring(0, 60).trim();
    const res = await fetch(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`,
      { headers: MFAPI_HEADERS, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;

    const results: Array<{ schemeCode: number; schemeName: string }> = await res.json();
    if (!results || results.length === 0) return null;

    // Take the best match: prefer schemes whose name contains key words from the query
    const lower = name.toLowerCase();
    const keywords = lower.split(/\s+/).filter(w => w.length > 4).slice(0, 4);
    let best = results[0];
    for (const r of results) {
      const rName = r.schemeName.toLowerCase();
      const matchCount = keywords.filter(k => rName.includes(k)).length;
      const bestMatchCount = keywords.filter(k => best.schemeName.toLowerCase().includes(k)).length;
      if (matchCount > bestMatchCount) best = r;
    }

    schemeCodeCache.set(name, { code: best.schemeCode, cachedAt: Date.now() });
    return best.schemeCode;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 2: Fetch NAV history and return sampled data points
// ---------------------------------------------------------------------------
async function getSparklineData(name: string): Promise<number[]> {
  // Check sparkline cache first
  const cached = sparklineCache.get(name);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const schemeCode = await resolveSchemeCode(name);
  if (!schemeCode) return [];

  try {
    const res = await fetch(
      `https://api.mfapi.in/mf/${schemeCode}`,
      { headers: MFAPI_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];

    const payload: { data: Array<{ date: string; nav: string }> } = await res.json();
    const allNavs = payload.data ?? [];

    if (allNavs.length < 5) return [];

    // Data is most-recent-first. Take last 52 weeks (~260 trading days).
    const recent = allNavs.slice(0, 260);

    // Sample ~14 points evenly from oldest (end of array) to newest (start)
    const TARGET_POINTS = 14;
    const step = Math.max(1, Math.floor(recent.length / TARGET_POINTS));
    const sampled: number[] = [];

    for (let i = recent.length - 1; i >= 0; i -= step) {
      const nav = parseFloat(recent[i].nav);
      if (!isNaN(nav) && nav > 0) sampled.push(nav);
    }

    // Always include the most recent NAV (index 0)
    const latestNav = parseFloat(recent[0].nav);
    if (!isNaN(latestNav) && latestNav > 0 && sampled[sampled.length - 1] !== latestNav) {
      sampled.push(latestNav);
    }

    if (sampled.length < 2) return [];

    sparklineCache.set(name, { data: sampled, cachedAt: Date.now() });
    return sampled;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const namesParam = searchParams.get('names');

  if (!namesParam) {
    return NextResponse.json({ error: 'names parameter required' }, { status: 400 });
  }

  const names = namesParam
    .split('|')
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 30); // Max 30 schemes per request

  if (names.length === 0) {
    return NextResponse.json({ error: 'No valid scheme names provided' }, { status: 400 });
  }

  // Fetch all sparklines in parallel — failures silently skipped
  const settled = await Promise.allSettled(
    names.map(async (name) => ({ name, data: await getSparklineData(name) }))
  );

  const sparklines: Record<string, number[]> = {};
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.data.length >= 2) {
      sparklines[result.value.name] = result.value.data;
    }
  }

  return NextResponse.json({ sparklines }, {
    headers: {
      // Allow client-side caching for 30 minutes (NAVs don't change intraday)
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
