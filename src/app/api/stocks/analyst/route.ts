/**
 * Analyst Consensus API
 * GET /api/stocks/analyst?symbol=HDFCBANK
 *
 * Returns Yahoo Finance analyst consensus data for a single NSE stock.
 *
 * Yahoo Finance v10/quoteSummary now requires a cookie + crumb handshake:
 *   1. GET https://fc.yahoo.com           → collect Set-Cookie headers
 *   2. GET /v1/test/getcrumb (with cookie) → returns crumb string
 *   3. GET /v10/finance/quoteSummary?...&crumb={crumb} (with cookie)
 *
 * The crumb is cached in-process (valid for the lifetime of the server instance).
 * Premium-only feature — access control is enforced on the client.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AnalystData {
  recommendationKey: string; // 'strong_buy' | 'buy' | 'hold' | 'underperform' | 'sell' | 'none'
  recommendationMean: number | null; // 1=Strong Buy … 5=Strong Sell
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  numberOfAnalystOpinions: number;
}

// ---------------------------------------------------------------------------
// In-process crumb cache (avoids the 2-step handshake on every request)
// ---------------------------------------------------------------------------
let cachedCrumb: string | null = null;
let cachedCookies: string | null = null;
let crumbFetchedAt = 0;
const CRUMB_TTL_MS = 30 * 60 * 1000; // 30 minutes

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function getYahooCrumb(): Promise<{ crumb: string; cookies: string }> {
  // Return cached crumb if still fresh
  if (cachedCrumb && cachedCookies && Date.now() - crumbFetchedAt < CRUMB_TTL_MS) {
    return { crumb: cachedCrumb, cookies: cachedCookies };
  }

  // Step 1: Hit fc.yahoo.com to get consent cookies
  const consentRes = await fetch('https://fc.yahoo.com', {
    headers: YAHOO_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  });

  const rawCookies = consentRes.headers.getSetCookie?.() ?? [];
  const cookieStr = rawCookies.map((c) => c.split(';')[0]).join('; ');

  // Step 2: Fetch the crumb using those cookies
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      ...YAHOO_HEADERS,
      Cookie: cookieStr,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!crumbRes.ok) {
    throw new Error(`Crumb fetch failed: ${crumbRes.status}`);
  }

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.length === 0) {
    throw new Error('Received empty crumb from Yahoo Finance');
  }

  // Cache for next requests
  cachedCrumb = crumb;
  cachedCookies = cookieStr;
  crumbFetchedAt = Date.now();

  return { crumb, cookies: cookieStr };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  try {
    const { crumb, cookies } = await getYahooCrumb();

    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol}?modules=financialData&crumb=${encodeURIComponent(crumb)}`;

    const response = await fetch(url, {
      headers: {
        ...YAHOO_HEADERS,
        Cookie: cookies,
      },
      signal: AbortSignal.timeout(10000),
    });

    // If we get 401 again the crumb has expired — clear cache and return a clear error
    if (response.status === 401) {
      cachedCrumb = null;
      cachedCookies = null;
      return NextResponse.json(
        { error: 'Authentication with Yahoo Finance failed — please retry in a moment' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const financialData = data?.quoteSummary?.result?.[0]?.financialData;

    if (!financialData) {
      return NextResponse.json(
        { error: 'No analyst data available for this symbol' },
        { status: 404 }
      );
    }

    const result: AnalystData = {
      recommendationKey: financialData.recommendationKey || 'none',
      recommendationMean: financialData.recommendationMean?.raw ?? null,
      targetMeanPrice: financialData.targetMeanPrice?.raw ?? null,
      targetHighPrice: financialData.targetHighPrice?.raw ?? null,
      targetLowPrice: financialData.targetLowPrice?.raw ?? null,
      numberOfAnalystOpinions: financialData.numberOfAnalystOpinions?.raw ?? 0,
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[Analyst API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analyst data' }, { status: 500 });
  }
}
