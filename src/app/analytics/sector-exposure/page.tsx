/**
 * Sector Exposure Analysis
 *
 * Shows WHERE your equity is actually concentrated across sectors.
 *
 * Data sources:
 * - Direct stocks: REAL sector data from holdings (sector field per stock)
 * - Via MFs: ESTIMATED using Nifty 50 index weights × equity portion of each fund
 *
 * The key insight: your true sector risk = direct stocks + what MFs indirectly hold.
 * This is impossible to compute manually across dozens of holdings.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { AppHeader, useCurrency } from '@/components/AppHeader';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SectorRow {
  name: string;
  color: string;
  directValue: number;
  mfEstimateValue: number;
  totalValue: number;
  totalPct: number;           // % of combined equity exposure
  directPct: number;          // % of direct equity only
  directHoldings: string[];   // stock names contributing to this sector
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Canonical sector names and colors
const SECTOR_META: Record<string, { color: string; shortName: string }> = {
  'Financial Services':     { color: '#2563EB', shortName: 'BFSI' },
  'Information Technology': { color: '#7C3AED', shortName: 'IT' },
  'Oil & Gas':              { color: '#F97316', shortName: 'Oil & Gas' },
  'Consumer & FMCG':        { color: '#10B981', shortName: 'FMCG' },
  'Auto & Mobility':        { color: '#06B6D4', shortName: 'Auto' },
  'Healthcare & Pharma':    { color: '#EC4899', shortName: 'Pharma' },
  'Metals & Mining':        { color: '#6366F1', shortName: 'Metals' },
  'Telecom':                { color: '#F59E0B', shortName: 'Telecom' },
  'Infrastructure':         { color: '#84CC16', shortName: 'Infra' },
  'Real Estate':            { color: '#EF4444', shortName: 'Realty' },
  'Others':                 { color: '#94A3B8', shortName: 'Others' },
};

// Nifty 50 approximate sector weights — applied to equity-portion of MFs
// Source: NSE Nifty 50 factsheet (approximate, updated periodically)
const NIFTY50_WEIGHTS: Record<string, number> = {
  'Financial Services':     0.33,
  'Information Technology': 0.16,
  'Oil & Gas':              0.12,
  'Consumer & FMCG':        0.09,
  'Auto & Mobility':        0.06,
  'Healthcare & Pharma':    0.05,
  'Metals & Mining':        0.04,
  'Telecom':                0.03,
  'Infrastructure':         0.03,
  'Others':                 0.09,
};

// MF fund-type equity ratios (same as mutualfund-exposure page)
const MF_EQUITY_RATIO: Record<string, number> = {
  FixedIncome: 0.10,
  Hybrid: 0.50,
};
const MF_EQUITY_DEFAULT = 0.85;

// Normalize free-text sector names from holdings to canonical names
function normalizeSector(raw: string | null): string {
  if (!raw) return '';
  const s = raw.toLowerCase().trim();
  if (/bank|financ|nbfc|insur|bfsi|financial/.test(s))           return 'Financial Services';
  if (/tech|information tech|software|computer|it\b|digital/.test(s)) return 'Information Technology';
  if (/oil|gas|energy|petro|fuel|refin/.test(s))                 return 'Oil & Gas';
  if (/fmcg|consumer|retail|food|beverage|staple|household/.test(s)) return 'Consumer & FMCG';
  if (/auto|automobile|vehicl|transport|mobility/.test(s))       return 'Auto & Mobility';
  if (/health|pharma|medical|hospital|drug|biotech/.test(s))     return 'Healthcare & Pharma';
  if (/metal|steel|mining|mineral|alumin|iron/.test(s))          return 'Metals & Mining';
  if (/telecom|telecomm|mobile|wireless|communication/.test(s))  return 'Telecom';
  if (/infra|power|utility|electric|cement/.test(s))             return 'Infrastructure';
  if (/real estate|realty|property|construct/.test(s))           return 'Real Estate';
  // Unknown but non-empty → keep as-is, will be grouped under canonical if matching
  return raw.trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInsights(sectors: SectorRow[], totalEquity: number, unclassifiedDirect: number): string[] {
  const insights: string[] = [];
  if (sectors.length === 0) return insights;

  const top = sectors[0];
  const second = sectors[1];

  // Top sector concentration
  if (top.totalPct > 35) {
    insights.push(
      `${top.name} alone accounts for ${top.totalPct.toFixed(0)}% of your equity exposure. This is high — a sharp downturn in banking/finance (like 2018 NBFC crisis or COVID) could disproportionately hurt your portfolio.`,
    );
  } else if (top.totalPct > 25) {
    insights.push(
      `${top.name} is your biggest sector bet at ${top.totalPct.toFixed(0)}% of equity exposure. Keep an eye on sector-specific risks.`,
    );
  }

  // Top 2 combined
  if (second && top.totalPct + second.totalPct > 55) {
    insights.push(
      `Your top 2 sectors — ${top.name} and ${second.name} — together account for ${(top.totalPct + second.totalPct).toFixed(0)}% of your total equity exposure. More than half in just two sectors is a high-concentration portfolio.`,
    );
  }

  // BFSI-specific insight (common India portfolio issue)
  const bfsi = sectors.find(s => s.name === 'Financial Services');
  if (bfsi && bfsi.totalPct > 30 && bfsi.directValue > 0 && bfsi.mfEstimateValue > 0) {
    insights.push(
      `You have ₹ exposure in Financial Services both directly (${bfsi.directHoldings.slice(0, 2).join(', ')}) AND via your mutual funds. When banking sector falls, both your stocks and MFs get hit simultaneously.`,
    );
  }

  // Sectors missing that are significant in Nifty
  const missing: string[] = [];
  const canonicals = Object.keys(SECTOR_META).slice(0, 8);
  for (const s of canonicals) {
    if (!sectors.find(r => r.name === s) || sectors.find(r => r.name === s)!.totalPct < 1) {
      missing.push(s);
    }
  }
  if (missing.length >= 3) {
    insights.push(
      `You have minimal/zero exposure in ${missing.slice(0, 3).join(', ')}. These sectors represent a significant portion of India's market. Zero exposure means you're missing diversification opportunities — not necessarily bad, but worth a deliberate choice.`,
    );
  }

  // Unclassified holdings nudge
  if (unclassifiedDirect > 0 && totalEquity > 0) {
    const unclPct = (unclassifiedDirect / totalEquity) * 100;
    if (unclPct > 10) {
      insights.push(
        `${unclPct.toFixed(0)}% of your direct equity (₹${(unclassifiedDirect / 100000).toFixed(1)}L) has no sector tag. This analysis may under-count your exposure in some sectors. Upload an updated portfolio CSV with sector data for a more complete picture.`,
      );
    }
  }

  // Well diversified
  const sectorsAbove5Pct = sectors.filter(s => s.totalPct > 5).length;
  if (top.totalPct < 25 && sectorsAbove5Pct >= 4) {
    insights.push(
      `Your equity is spread across ${sectorsAbove5Pct} sectors, each under 25%. That is good diversification — sector-specific shocks are less likely to devastate your overall portfolio.`,
    );
  }

  return insights.slice(0, 3);
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function SectorExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [directTotal, setDirectTotal] = useState(0);
  const [mfEquityTotal, setMfEquityTotal] = useState(0);
  const [unclassifiedDirect, setUnclassifiedDirect] = useState(0);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/data?user_id=${userId}`);
      if (!res.ok) return;
      const result = await res.json();
      if (!result.success || !result.data) return;

      const holdings: any[] = result.data.holdings;

      // ── Direct equity holdings ──────────────────────────────────────
      const equityHoldings = holdings.filter(
        (h) => h.assetType === 'Equity' || h.assetType === 'Stocks',
      );

      // Group by normalized sector
      const directMap = new Map<string, { value: number; names: string[] }>();
      let unclassifiedValue = 0;
      let unclassifiedCnt = 0;

      for (const h of equityHoldings) {
        const val = h.currentValue || h.investedValue || 0;
        const canonical = normalizeSector(h.sector);
        if (!canonical) {
          unclassifiedValue += val;
          unclassifiedCnt++;
          continue;
        }
        const known = SECTOR_META[canonical];
        const key = known ? canonical : 'Others';
        const existing = directMap.get(key) || { value: 0, names: [] };
        existing.value += val;
        if (!existing.names.includes(h.name)) existing.names.push(h.name);
        directMap.set(key, existing);
      }

      const directSum = equityHoldings.reduce((s, h) => s + (h.currentValue || h.investedValue || 0), 0);

      // ── MF equity exposure ──────────────────────────────────────────
      const mfHoldings = holdings.filter(
        (h) => h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds',
      );

      let mfEquitySum = 0;
      for (const h of mfHoldings) {
        const val = h.currentValue || h.investedValue || 0;
        const ratio = h.assetClass === 'FixedIncome'
          ? MF_EQUITY_RATIO.FixedIncome
          : h.assetClass === 'Hybrid'
          ? MF_EQUITY_RATIO.Hybrid
          : MF_EQUITY_DEFAULT;
        mfEquitySum += val * ratio;
      }

      // Apply Nifty 50 weights to mfEquitySum → per-sector MF estimate
      const mfSectorMap = new Map<string, number>();
      for (const [sector, weight] of Object.entries(NIFTY50_WEIGHTS)) {
        mfSectorMap.set(sector, mfEquitySum * weight);
      }

      // ── Combine ─────────────────────────────────────────────────────
      const combinedTotal = directSum + mfEquitySum;
      const allKeys = new Set([...directMap.keys(), ...mfSectorMap.keys()]);

      const rows: SectorRow[] = [];
      for (const key of allKeys) {
        const d = directMap.get(key) || { value: 0, names: [] };
        const m = mfSectorMap.get(key) || 0;
        const total = d.value + m;
        if (total < 1) continue;
        rows.push({
          name: key,
          color: SECTOR_META[key]?.color ?? '#94A3B8',
          directValue: d.value,
          mfEstimateValue: m,
          totalValue: total,
          totalPct: combinedTotal > 0 ? (total / combinedTotal) * 100 : 0,
          directPct: directSum > 0 ? (d.value / directSum) * 100 : 0,
          directHoldings: d.names,
        });
      }

      rows.sort((a, b) => b.totalValue - a.totalValue);

      setSectors(rows);
      setDirectTotal(directSum);
      setMfEquityTotal(mfEquitySum);
      setUnclassifiedDirect(unclassifiedValue);
      setUnclassifiedCount(unclassifiedCnt);
      setTotalEquity(combinedTotal);
    } catch (err) {
      console.error('Sector exposure fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth guards
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/sector-exposure');
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
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Mapping your sector exposure…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') return null;

  // ── Empty state ──
  if (!loading && sectors.length === 0 && directTotal === 0 && mfEquityTotal === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24 text-center">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-12">
            <p className="text-4xl mb-4">📊</p>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">No Equity Holdings Found</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Add direct stocks or equity mutual funds to your portfolio to see sector exposure.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Computed ──
  const insights = buildInsights(sectors, totalEquity, unclassifiedDirect);
  const hasDirectData = directTotal > 0;

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">

        {/* ── Page Title ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Sector Exposure</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Where your equity is actually concentrated — direct stocks + what your MFs hold
          </p>
        </div>

        {/* ── Section 1: Equity Source Hero ───────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-4">Your total equity exposure</p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                label: 'Direct Stocks',
                value: directTotal,
                pct: totalEquity > 0 ? (directTotal / totalEquity) * 100 : 0,
                color: '#2563EB',
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                textColor: 'text-[#2563EB] dark:text-[#3B82F6]',
                tag: 'Real data',
              },
              {
                label: 'Equity via MFs',
                value: mfEquityTotal,
                pct: totalEquity > 0 ? (mfEquityTotal / totalEquity) * 100 : 0,
                color: '#93C5FD',
                bg: 'bg-slate-50 dark:bg-slate-900/30',
                textColor: 'text-[#64748B] dark:text-[#94A3B8]',
                tag: 'Estimated',
              },
              {
                label: 'Combined Equity',
                value: totalEquity,
                pct: 100,
                color: '#0F172A',
                bg: 'bg-[#F9FAFB] dark:bg-[#0F172A]',
                textColor: 'text-[#0F172A] dark:text-[#F8FAFC]',
                tag: '',
              },
            ].map((chip) => (
              <div key={chip.label} className={`${chip.bg} rounded-lg p-3 border border-[#E5E7EB] dark:border-[#334155]`}>
                <p className={`text-base font-bold number-emphasis ${chip.textColor}`}>
                  {formatCurrency(chip.value)}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{chip.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className={`text-xs font-medium ${chip.textColor}`}>{chip.pct.toFixed(0)}%</p>
                  {chip.tag && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${chip.tag === 'Real data' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
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
              Direct stocks — real sector tags from your holdings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#93C5FD] dark:bg-[#1D4ED8]" />
              Via MFs — estimated using Nifty 50 index weights
            </span>
          </div>
        </div>

        {/* ── Section 2: Sector Breakdown ─────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Sector Breakdown</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Combined direct + estimated MF equity exposure — sorted by total exposure
            </p>
          </div>

          <div className="p-6 space-y-4">
            {sectors.map((sector, i) => {
              const directBarPct = totalEquity > 0 ? (sector.directValue / totalEquity) * 100 : 0;
              const mfBarPct = totalEquity > 0 ? (sector.mfEstimateValue / totalEquity) * 100 : 0;
              const isHigh = sector.totalPct > 30;
              const isMod = sector.totalPct > 20 && !isHigh;

              return (
                <div key={sector.name}>
                  {/* Label row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: sector.color }} />
                      <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{sector.name}</span>
                      {isHigh && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                          High
                        </span>
                      )}
                      {isMod && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                          Moderate
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                        {formatCurrency(sector.totalValue)}
                      </span>
                      <span className={`text-xs font-bold w-10 text-right ${isHigh ? 'text-red-600 dark:text-red-400' : 'text-[#6B7280] dark:text-[#94A3B8]'}`}>
                        {sector.totalPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className="h-5 rounded-full overflow-hidden bg-[#E5E7EB] dark:bg-[#334155] flex">
                    {directBarPct > 0 && (
                      <div
                        title={`Direct: ${formatCurrency(sector.directValue)}`}
                        style={{ width: `${directBarPct}%`, background: sector.color }}
                        className="h-full transition-all"
                      />
                    )}
                    {mfBarPct > 0 && (
                      <div
                        title={`Via MFs (est.): ${formatCurrency(sector.mfEstimateValue)}`}
                        style={{ width: `${mfBarPct}%`, background: sector.color, opacity: 0.35 }}
                        className="h-full transition-all"
                      />
                    )}
                  </div>

                  {/* Sub-labels */}
                  <div className="flex items-center gap-4 mt-1 text-xs text-[#9CA3AF] dark:text-[#64748B]">
                    {sector.directValue > 0 && (
                      <span>
                        Direct: {formatCurrency(sector.directValue)}
                        {sector.directHoldings.length > 0 && (
                          <span className="ml-1 text-[#CBD5E1] dark:text-[#475569]">
                            ({sector.directHoldings.slice(0, 2).join(', ')}{sector.directHoldings.length > 2 ? ` +${sector.directHoldings.length - 2}` : ''})
                          </span>
                        )}
                      </span>
                    )}
                    {sector.mfEstimateValue > 0 && (
                      <span>~{formatCurrency(sector.mfEstimateValue)} est. via MFs</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Unclassified row */}
            {unclassifiedDirect > 0 && (
              <div className="mt-2 pt-4 border-t border-dashed border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E5E7EB] dark:bg-[#475569]" />
                    <span className="text-sm text-[#9CA3AF] dark:text-[#64748B]">Unclassified stocks ({unclassifiedCount})</span>
                  </div>
                  <span className="text-sm text-[#9CA3AF] dark:text-[#64748B] number-emphasis">
                    {formatCurrency(unclassifiedDirect)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#E5E7EB] dark:bg-[#334155]">
                  <div
                    style={{ width: `${totalEquity > 0 ? (unclassifiedDirect / totalEquity) * 100 : 0}%` }}
                    className="h-full rounded-full bg-[#CBD5E1] dark:bg-[#475569]"
                  />
                </div>
                <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-1">
                  These holdings have no sector tag. Upload a portfolio CSV with a &quot;Sector&quot; column to see them here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Direct Holdings Sector Map ───────────────────── */}
        {hasDirectData && sectors.some(s => s.directValue > 0) && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Direct Holdings — Sector Map</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  Real data
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Exactly which of your stocks are driving each sector concentration
              </p>
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
              {sectors
                .filter(s => s.directValue > 0 && s.directHoldings.length > 0)
                .map((sector) => (
                  <div key={sector.name} className="px-6 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#0F172A]/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: sector.color }} />
                        <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] flex-shrink-0">{sector.name}</span>
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] truncate">
                          {sector.directHoldings.join(' · ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          {sector.directPct.toFixed(1)}% of direct
                        </span>
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                          {formatCurrency(sector.directValue)}
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
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">What This Means For You</h2>
            <div className="space-y-3">
              {insights.map((text, idx) => {
                const isWarn = text.includes('high') || text.includes('crisis') || text.includes('concentrated') || text.includes('over');
                const isGood = text.includes('good diversification') || text.includes('nicely spread');
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

        {/* ── Section 5: Nifty 50 Benchmark Comparison ────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">How Do You Compare to Nifty 50?</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-5">
            Your sector tilts vs the Nifty 50 index. Deviations above ±5% indicate your active bets.
          </p>

          {/* Column headers */}
          <div className="flex items-center gap-2 mb-3 pr-1">
            <div className="w-16 flex-shrink-0" />
            <div className="flex-1" />
            <div className="w-8 flex-shrink-0 text-right">
              <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">%</span>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(NIFTY50_WEIGHTS)
              .sort((a, b) => b[1] - a[1])
              .map(([sectorName, benchmarkWeight]) => {
                const userSector = sectors.find(s => s.name === sectorName);
                const userPct = userSector ? userSector.totalPct : 0;
                const benchmarkPct = benchmarkWeight * 100;
                const diff = userPct - benchmarkPct;
                const isOver = diff > 5;
                const isUnder = diff < -5;
                const color = SECTOR_META[sectorName]?.color ?? '#94A3B8';
                // Scale: 40% = full bar width (covers BFSI at 33% comfortably)
                const SCALE = 2.5;
                const niftyBarW = Math.min(benchmarkPct * SCALE, 100);
                const youBarW = Math.min(userPct * SCALE, 100);

                return (
                  <div key={sectorName}>
                    {/* Sector name + deviation badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                          {SECTOR_META[sectorName]?.shortName ?? sectorName}
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
                      {/* Nifty 50 row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] w-14 flex-shrink-0 text-right">Nifty 50</span>
                        <div className="flex-1 h-2.5 bg-[#F3F4F6] dark:bg-[#334155] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${niftyBarW}%`, background: color, opacity: 0.35 }}
                          />
                        </div>
                        <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] w-9 flex-shrink-0 text-right">
                          {benchmarkPct.toFixed(0)}%
                        </span>
                      </div>

                      {/* You row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] w-14 flex-shrink-0 text-right">You</span>
                        <div className="flex-1 h-2.5 bg-[#F3F4F6] dark:bg-[#334155] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${youBarW}%`, background: color }}
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
              Nifty 50 benchmark weight
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF] dark:text-[#64748B]">
              <span className="inline-block w-5 h-2 rounded-full bg-[#94A3B8]" />
              Your combined exposure
            </span>
            <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">
              Overweight / Underweight shown for deviations &gt;5%
            </span>
          </div>
        </div>

        {/* ── Footer Disclaimer ────────────────────────────────────────── */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
          <InfoIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            <strong>Direct sector data</strong> comes from the sector tags on your uploaded holdings — this is real per-stock data.{' '}
            <strong>MF sector estimates</strong> use Nifty 50 index weights applied to the equity portion of each fund — this is an approximation. Actual fund compositions vary by fund type and change monthly.
          </p>
        </div>

      </main>
    </div>
  );
}
