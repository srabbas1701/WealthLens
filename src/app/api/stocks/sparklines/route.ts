/**
 * Batch Sparkline API
 * GET /api/stocks/sparklines?symbols=HDFCBANK,VEDL,TATAMOTORS
 *
 * Returns ~5 weekly close prices per symbol for the past 1 month.
 * Used to render inline sparklines in the equity holdings table.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0 || symbols.length > 60) {
    return NextResponse.json({ error: 'Invalid symbols count' }, { status: 400 });
  }

  const results: Record<string, number[]> = {};

  await Promise.allSettled(
    symbols.map(async (symbol) => {
      try {
        const yahooSymbol = `${symbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1wk&range=1mo`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) return;

        const data = await response.json();
        const closes: (number | null)[] | undefined =
          data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;

        if (Array.isArray(closes)) {
          const valid = closes.filter((c): c is number => c !== null && !isNaN(c));
          if (valid.length >= 2) {
            results[symbol] = valid;
          }
        }
      } catch {
        // Silently skip — sparklines are decorative
      }
    })
  );

  return NextResponse.json({ sparklines: results });
}
