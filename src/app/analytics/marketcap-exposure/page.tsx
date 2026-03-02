/**
 * Market Cap Exposure Analysis
 *
 * Shows HOW your equity is distributed across Large, Mid, and Small cap.
 *
 * Data sources:
 * - Direct stocks: classified using Nifty 100 (Large) / Nifty Midcap 150 (Mid) lookup.
 *   Any stock not in either index falls back to Small Cap.
 * - Via MFs: estimated using typical Indian equity fund cap distribution (68/22/10).
 *
 * The key insight: your true market cap risk = direct stocks + what your MFs
 * indirectly hold. A conservative-looking equity fund often holds 68%+ large caps.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { AppHeader, useCurrency } from '@/components/AppHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type CapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap';

interface MarketCapRow {
  category: CapCategory;
  color: string;
  directValue: number;
  mfEstimateValue: number;
  totalValue: number;
  totalPct: number;
  directPct: number;
  directHoldings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAP_META: Record<CapCategory, { color: string; tag: string; description: string }> = {
  'Large Cap': {
    color: '#2563EB',
    tag: 'Nifty 100',
    description: 'Top 100 stocks by market cap',
  },
  'Mid Cap': {
    color: '#7C3AED',
    tag: 'Nifty Midcap 150',
    description: 'Rank 101–250 by market cap',
  },
  'Small Cap': {
    color: '#F97316',
    tag: 'Below Midcap 150',
    description: 'Rank 251+ by market cap',
  },
};

// ─── Nifty 100: Nifty 50 + Nifty Next 50 (approximate, 2024-25) ─────────────
const LARGE_CAP_SYMBOLS = new Set([
  // Nifty 50
  'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK',
  'BAJAJ-AUTO', 'BAJAJFINSV', 'BAJFINANCE', 'BHARTIARTL', 'BPCL',
  'BRITANNIA', 'CIPLA', 'COALINDIA', 'DIVISLAB', 'DRREDDY',
  'EICHERMOT', 'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE',
  'HEROMOTOCO', 'HINDALCO', 'HINDUNILVR', 'ICICIBANK', 'INDUSINDBK',
  'INFY', 'ITC', 'JSWSTEEL', 'KOTAKBANK', 'LT',
  'LTIM', 'M&M', 'MARUTI', 'NESTLEIND', 'NTPC',
  'ONGC', 'POWERGRID', 'RELIANCE', 'SBILIFE', 'SBIN',
  'SHRIRAMFIN', 'SUNPHARMA', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL',
  'TCS', 'TECHM', 'TITAN', 'ULTRACEMCO', 'WIPRO',
  // Nifty Next 50 (approximate)
  'ABB', 'ADANIGREEN', 'ADANIPOWER', 'AMBUJACEM', 'ATGL',
  'AUROPHARMA', 'BAJAJHLDNG', 'BANKBARODA', 'BEL', 'BOSCHLTD',
  'CANBK', 'CGPOWER', 'CHOLAFIN', 'COLPAL', 'DABUR',
  'DMART', 'DLF', 'GODREJCP', 'GODREJPROP', 'HAL',
  'HAVELLS', 'HINDZINC', 'ICICIPRULI', 'INDUSTOWER', 'IRCTC',
  'IRFC', 'JINDALSTEL', 'JSWENERGY', 'LUPIN', 'MARICO',
  'MCDOWELL-N', 'MOTHERSON', 'MRF', 'MUTHOOTFIN', 'NAUKRI',
  'NMDC', 'OFSS', 'PAGEIND', 'PFC', 'PIDILITIND',
  'RECLTD', 'SAIL', 'SIEMENS', 'SRF', 'TATAPOWER',
  'TORNTPHARM', 'TVSMOTOR', 'VBL', 'VEDL', 'ZOMATO',
  'ZYDUSLIFE', 'ALKEM', 'MPHASIS', 'NYKAA', 'PAYTM',
]);

// ─── Nifty Midcap 150 (approximate, 2024-25) ─────────────────────────────────
const MID_CAP_SYMBOLS = new Set([
  'ABCAPITAL', 'ABFRL', 'AIAENG', 'APLAPOLLO', 'ARE&M',
  'ASTRAL', 'ATUL', 'AUBANK', 'BALKRISIND', 'BANDHANBNK',
  'BATAINDIA', 'BERGEPAINT', 'BHARATFORG', 'BSE', 'CAMS',
  'CDSL', 'CESC', 'CONCOR', 'COROMANDEL', 'CROMPTON',
  'DEEPAKNTR', 'DIXON', 'EMAMILTD', 'ESCORTS', 'EXIDEIND',
  'FEDERALBNK', 'GLENMARK', 'GRANULES', 'GUJGASLTD', 'HFCL',
  'ICICIGI', 'IDFCFIRSTB', 'IGL', 'INDHOTEL', 'INDIAMART',
  'JKCEMENT', 'JUBLFOOD', 'KALYANKJIL', 'KANSAINER', 'KAYNES',
  'KPITTECH', 'LAURUSLABS', 'LICHSGFIN', 'LTTS', 'MAXHEALTH',
  'METROPOLIS', 'MFSL', 'MRPL', 'NUVOCO', 'OBEROIRLTY',
  'OLECTRA', 'PERSISTENT', 'PETRONET', 'PHOENIXLTD', 'PIIND',
  'PNB', 'POLYCAB', 'PRESTIGE', 'RAMCOCEM', 'ROUTE',
  'SBICARD', 'SCHAEFFLER', 'SOLARINDS', 'SUNDARMFIN', 'SUPREMEIND',
  'SYNGENE', 'TANLA', 'TATACHEM', 'TATAELXSI', 'TATAINVEST',
  'TATAMETALI', 'THERMAX', 'TIINDIA', 'TRENT', 'TRIDENT',
  'UNIONBANK', 'UNITDSPR', 'VOLTAS', 'WOCKPHARMA', 'WELCORP',
  'WHIRLPOOL', 'JKIL', 'RAINBOW', 'RKFORGE', 'SUNTV',
  'SUZLON', 'TORNTPOWER', 'HONAUT', 'GLAXO', 'TIMKEN',
]);

// MF equity ratio by asset class
const MF_EQUITY_RATIO: Record<string, number> = {
  FixedIncome: 0.10,
  Hybrid: 0.50,
};
const MF_EQUITY_DEFAULT = 0.85;

// Typical Indian equity fund market cap distribution
const MF_CAP_SPLIT: Record<CapCategory, number> = {
  'Large Cap': 0.68,
  'Mid Cap':   0.22,
  'Small Cap': 0.10,
};

// Benchmark: standard balanced multi-cap portfolio (70/20/10)
const BENCHMARK: Record<CapCategory, number> = {
  'Large Cap': 70,
  'Mid Cap':   20,
  'Small Cap': 10,
};

const CAP_ORDER: CapCategory[] = ['Large Cap', 'Mid Cap', 'Small Cap'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifySymbol(symbol: string | null): CapCategory {
  if (!symbol) return 'Small Cap';
  const s = symbol.replace(/^(NSE|BSE):\s*/i, '').trim().toUpperCase();
  if (LARGE_CAP_SYMBOLS.has(s)) return 'Large Cap';
  if (MID_CAP_SYMBOLS.has(s)) return 'Mid Cap';
  return 'Small Cap';
}

function buildInsights(rows: MarketCapRow[], directTotal: number): string[] {
  const insights: string[] = [];
  if (rows.length === 0) return insights;

  const large = rows.find(r => r.category === 'Large Cap');
  const mid   = rows.find(r => r.category === 'Mid Cap');
  const small = rows.find(r => r.category === 'Small Cap');

  const largePct = large?.totalPct ?? 0;
  const midPct   = mid?.totalPct   ?? 0;
  const smallPct = small?.totalPct ?? 0;

  if (largePct > 80) {
    insights.push(
      `${largePct.toFixed(0)}% of your equity is in large caps — a conservative, low-volatility tilt. This is generally stable during downturns but may lag during small/mid cap bull runs.`,
    );
  } else if (largePct < 50) {
    insights.push(
      `Only ${largePct.toFixed(0)}% of your equity is in large caps. Less than half in blue-chips means your portfolio is more volatile than the broad market index — suitable only if your horizon is 7+ years.`,
    );
  }

  if (smallPct > 20) {
    insights.push(
      `Small caps make up ${smallPct.toFixed(0)}% of your equity. Small caps can deliver outsized returns but are 2–3× more volatile than large caps and tend to fall harder during broad market corrections.`,
    );
  }

  if (midPct > 30) {
    insights.push(
      `You have a significant mid-cap tilt at ${midPct.toFixed(0)}%. Mid caps historically outperform in long bull markets but can correct 40–50% during bear phases. Make sure this aligns with your risk tolerance.`,
    );
  }

  const smallDirectNames = small?.directHoldings ?? [];
  if (directTotal > 0 && (small?.directValue ?? 0) / directTotal > 0.15 && smallDirectNames.length > 0) {
    const preview = smallDirectNames.slice(0, 3).join(', ');
    const more = smallDirectNames.length > 3 ? ` +${smallDirectNames.length - 3} more` : '';
    insights.push(
      `Your direct small-cap exposure (${preview}${more}) is meaningful. Small cap stocks require closer monitoring — liquidity can dry up quickly in volatile markets.`,
    );
  }

  const diffLarge = largePct - BENCHMARK['Large Cap'];
  if (Math.abs(diffLarge) > 15) {
    if (diffLarge > 0) {
      insights.push(
        `You are overweight in large caps vs a balanced portfolio (${largePct.toFixed(0)}% vs 70% benchmark). Your portfolio may be overly conservative for a long investment horizon.`,
      );
    } else {
      insights.push(
        `You are underweight in large caps vs a balanced portfolio (${largePct.toFixed(0)}% vs 70% benchmark). The tilt toward mid and small cap boosts return potential but also risk.`,
      );
    }
  }

  return insights.slice(0, 3);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function MarketCapExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading]           = useState(true);
  const [rows, setRows]                 = useState<MarketCapRow[]>([]);
  const [directTotal, setDirectTotal]   = useState(0);
  const [mfEquityTotal, setMfEquityTotal] = useState(0);
  const [totalEquity, setTotalEquity]   = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/data?user_id=${userId}`);
      if (!res.ok) return;
      const result = await res.json();
      if (!result.success || !result.data) return;

      const holdings: any[] = result.data.holdings;

      // ── Direct equity: classify each stock by symbol ──────────────
      const equityHoldings = holdings.filter(
        h => h.assetType === 'Equity' || h.assetType === 'Stocks',
      );

      const directMap = new Map<CapCategory, { value: number; names: string[] }>(
        CAP_ORDER.map(cat => [cat, { value: 0, names: [] }]),
      );

      for (const h of equityHoldings) {
        const val = h.currentValue || h.investedValue || 0;
        const cat = classifySymbol(h.symbol);
        const bucket = directMap.get(cat)!;
        bucket.value += val;
        const label = h.name || h.symbol || '';
        if (label && !bucket.names.includes(label)) bucket.names.push(label);
      }

      const directSum = equityHoldings.reduce(
        (s, h) => s + (h.currentValue || h.investedValue || 0), 0,
      );

      // ── MF equity: estimate by asset class then split by cap ───────
      const mfHoldings = holdings.filter(
        h => h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds',
      );

      let mfEquitySum = 0;
      for (const h of mfHoldings) {
        const val = h.currentValue || h.investedValue || 0;
        const ratio = h.assetClass === 'FixedIncome' ? MF_EQUITY_RATIO.FixedIncome
          : h.assetClass === 'Hybrid' ? MF_EQUITY_RATIO.Hybrid
          : MF_EQUITY_DEFAULT;
        mfEquitySum += val * ratio;
      }

      // ── Combine ────────────────────────────────────────────────────
      const combined = directSum + mfEquitySum;

      const computed: MarketCapRow[] = CAP_ORDER.map(cat => {
        const d = directMap.get(cat)!;
        const m = mfEquitySum * MF_CAP_SPLIT[cat];
        const total = d.value + m;
        return {
          category: cat,
          color: CAP_META[cat].color,
          directValue: d.value,
          mfEstimateValue: m,
          totalValue: total,
          totalPct: combined > 0 ? (total / combined) * 100 : 0,
          directPct: directSum > 0 ? (d.value / directSum) * 100 : 0,
          directHoldings: d.names,
        };
      });

      setRows(computed);
      setDirectTotal(directSum);
      setMfEquityTotal(mfEquitySum);
      setTotalEquity(combined);
    } catch (err) {
      console.error('[MarketCap] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth guards
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/marketcap-exposure');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id && hasCapability('view_basic_analytics')) {
      fetchData(user.id);
    } else if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability('view_basic_analytics')) {
      router.replace('/analytics/overview');
    }
  }, [user?.id, fetchData, hasCapability, authStatus, capabilitiesLoading, router]);

  // ── Loading ──
  if (authStatus === 'loading' || (loading && authStatus === 'authenticated')) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Mapping your market cap exposure…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') return null;

  // ── Empty state ──
  if (!loading && directTotal === 0 && mfEquityTotal === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24 text-center">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-12">
            <p className="text-4xl mb-4">📊</p>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">No Equity Holdings Found</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Add direct stocks or equity mutual funds to see your market cap exposure.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const insights = buildInsights(rows, directTotal);

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">

        {/* ── Page Title ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Market Cap Exposure</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Large, mid, or small cap? — stocks classified by Nifty 100 / Midcap 150 membership, plus MF equity estimates
          </p>
        </div>

        {/* ── Section 1: Equity Source Hero ───────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-4">
            Your total equity exposure
          </p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                label: 'Direct Stocks',
                value: directTotal,
                pct: totalEquity > 0 ? (directTotal / totalEquity) * 100 : 0,
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                textColor: 'text-[#2563EB] dark:text-[#3B82F6]',
                tag: 'Real data',
              },
              {
                label: 'Equity via MFs',
                value: mfEquityTotal,
                pct: totalEquity > 0 ? (mfEquityTotal / totalEquity) * 100 : 0,
                bg: 'bg-slate-50 dark:bg-slate-900/30',
                textColor: 'text-[#64748B] dark:text-[#94A3B8]',
                tag: 'Estimated',
              },
              {
                label: 'Combined Equity',
                value: totalEquity,
                pct: 100,
                bg: 'bg-[#F9FAFB] dark:bg-[#0F172A]',
                textColor: 'text-[#0F172A] dark:text-[#F8FAFC]',
                tag: '',
              },
            ].map(chip => (
              <div key={chip.label} className={`${chip.bg} rounded-lg p-3 border border-[#E5E7EB] dark:border-[#334155]`}>
                <p className={`text-base font-bold number-emphasis ${chip.textColor}`}>
                  {formatCurrency(chip.value)}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{chip.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className={`text-xs font-medium ${chip.textColor}`}>{chip.pct.toFixed(0)}%</p>
                  {chip.tag && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      chip.tag === 'Real data'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    }`}>
                      {chip.tag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#2563EB]" />
              Direct stocks — classified using Nifty 100 / Midcap 150 index membership
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#93C5FD] dark:bg-[#1D4ED8]" />
              Via MFs — estimated using typical equity fund cap split (68 / 22 / 10)
            </span>
          </div>
        </div>

        {/* ── Section 2: Market Cap Breakdown ─────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Market Cap Breakdown</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Direct stocks by index classification + estimated equity in your MFs — sorted large to small
            </p>
          </div>

          <div className="p-6 space-y-5">
            {rows.map(row => {
              const directBarPct = totalEquity > 0 ? (row.directValue / totalEquity) * 100 : 0;
              const mfBarPct     = totalEquity > 0 ? (row.mfEstimateValue / totalEquity) * 100 : 0;
              const isHighRisk   = row.category === 'Small Cap' && row.totalPct > 20;
              const isGrowthBet  = row.category === 'Mid Cap' && row.totalPct > 30;

              return (
                <div key={row.category}>
                  {/* Label row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: row.color }}
                      />
                      <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {row.category}
                      </span>
                      <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] hidden sm:inline">
                        {CAP_META[row.category].tag}
                      </span>
                      {isHighRisk && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium flex-shrink-0">
                          High Risk
                        </span>
                      )}
                      {isGrowthBet && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium flex-shrink-0">
                          Growth
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-right">
                      <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                        {formatCurrency(row.totalValue)}
                      </span>
                      <span className={`text-xs font-bold w-10 text-right ${
                        isHighRisk ? 'text-orange-600 dark:text-orange-400' : 'text-[#6B7280] dark:text-[#94A3B8]'
                      }`}>
                        {row.totalPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className="h-5 rounded-full overflow-hidden bg-[#E5E7EB] dark:bg-[#334155] flex">
                    {directBarPct > 0 && (
                      <div
                        title={`Direct: ${formatCurrency(row.directValue)}`}
                        style={{ width: `${directBarPct}%`, background: row.color }}
                        className="h-full transition-all"
                      />
                    )}
                    {mfBarPct > 0 && (
                      <div
                        title={`Via MFs (est.): ${formatCurrency(row.mfEstimateValue)}`}
                        style={{ width: `${mfBarPct}%`, background: row.color, opacity: 0.35 }}
                        className="h-full transition-all"
                      />
                    )}
                  </div>

                  {/* Sub-labels */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-[#9CA3AF] dark:text-[#64748B]">
                    {row.directValue > 0 && (
                      <span>
                        Direct: {formatCurrency(row.directValue)}
                        {row.directHoldings.length > 0 && (
                          <span className="ml-1 text-[#CBD5E1] dark:text-[#475569]">
                            ({row.directHoldings.slice(0, 2).join(', ')}
                            {row.directHoldings.length > 2 ? ` +${row.directHoldings.length - 2}` : ''})
                          </span>
                        )}
                      </span>
                    )}
                    {row.mfEstimateValue > 0 && (
                      <span>~{formatCurrency(row.mfEstimateValue)} est. via MFs</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 3: Direct Holdings — Market Cap Map ─────────────── */}
        {directTotal > 0 && rows.some(r => r.directValue > 0) && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Direct Holdings — Market Cap Map
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  Real data
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Exactly which of your stocks are in each market cap band
              </p>
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
              {rows
                .filter(r => r.directValue > 0 && r.directHoldings.length > 0)
                .map(row => (
                  <div
                    key={row.category}
                    className="px-6 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#0F172A]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ background: row.color }}
                        />
                        <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] flex-shrink-0">
                          {row.category}
                        </span>
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] truncate">
                          {row.directHoldings.join(' · ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          {row.directPct.toFixed(1)}% of direct
                        </span>
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                          {formatCurrency(row.directValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Section 4: Insights ──────────────────────────────────────── */}
        {insights.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              What This Means For You
            </h2>
            <div className="space-y-3">
              {insights.map((text, idx) => {
                const isWarn = /volatile|harder|outsized|overly|underweight/i.test(text);
                const isGood = /stable|low.volat|conservative/i.test(text) && !isWarn;
                const style = isGood
                  ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', icon: '✓', ic: 'text-emerald-600 dark:text-emerald-400' }
                  : isWarn
                  ? { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', icon: '!', ic: 'text-amber-600 dark:text-amber-400' }
                  : { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', icon: 'i', ic: 'text-blue-600 dark:text-blue-400' };
                return (
                  <div key={idx} className={`flex gap-3 p-3.5 rounded-lg border ${style.bg} ${style.border}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${style.ic}`}>
                      {style.icon}
                    </span>
                    <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">{text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section 5: Benchmark Comparison ─────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            How Do You Compare to a Balanced Portfolio?
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-5">
            Your market cap mix vs the standard 70 / 20 / 10 balanced portfolio. Deviations above ±10% are your active tilts.
          </p>

          <div className="space-y-4">
            {rows.map(row => {
              const benchmarkPct = BENCHMARK[row.category];
              const userPct      = row.totalPct;
              const diff         = userPct - benchmarkPct;
              const isOver       = diff > 10;
              const isUnder      = diff < -10;
              // Scale: 80% = full bar width (handles 70% large cap + a bit of buffer)
              const SCALE  = 1.2;
              const benchW = Math.min(benchmarkPct * SCALE, 100);
              const youW   = Math.min(userPct * SCALE, 100);

              return (
                <div key={row.category}>
                  {/* Name + deviation badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ background: row.color }}
                      />
                      <span className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                        {row.category}
                      </span>
                    </div>
                    {(isOver || isUnder) && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOver
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%&nbsp;{isOver ? 'Overweight' : 'Underweight'}
                      </span>
                    )}
                  </div>

                  {/* Two bars — same scale */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] w-20 flex-shrink-0 text-right">
                        Benchmark
                      </span>
                      <div className="flex-1 h-2.5 bg-[#F3F4F6] dark:bg-[#334155] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${benchW}%`, background: row.color, opacity: 0.35 }}
                        />
                      </div>
                      <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] w-9 flex-shrink-0 text-right">
                        {benchmarkPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] w-20 flex-shrink-0 text-right">
                        You
                      </span>
                      <div className="flex-1 h-2.5 bg-[#F3F4F6] dark:bg-[#334155] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${youW}%`, background: row.color }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] w-9 flex-shrink-0 text-right number-emphasis">
                        {userPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-5 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
            <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF] dark:text-[#64748B]">
              <span className="inline-block w-5 h-2 rounded-full bg-[#94A3B8] opacity-35" />
              Balanced portfolio benchmark (70 / 20 / 10)
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF] dark:text-[#64748B]">
              <span className="inline-block w-5 h-2 rounded-full bg-[#94A3B8]" />
              Your combined exposure
            </span>
            <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">
              Overweight / Underweight shown for deviations &gt;10%
            </span>
          </div>
        </div>

        {/* ── Footer Disclaimer ────────────────────────────────────────── */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
          <InfoIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            <strong>Direct stock classification</strong> uses Nifty 100 (Large Cap) and Nifty Midcap 150 (Mid Cap) index membership — stocks outside both are classified as Small Cap.{' '}
            <strong>MF equity cap split</strong> is estimated using typical Indian equity fund averages (68% large / 22% mid / 10% small) — actual fund compositions vary and change monthly.{' '}
            <strong>Benchmark</strong> is a standard balanced multi-cap allocation (70 / 20 / 10) used as a reference for diversified Indian equity portfolios.
          </p>
        </div>

      </main>
    </div>
  );
}
