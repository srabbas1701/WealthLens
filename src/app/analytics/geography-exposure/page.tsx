/**
 * Geography Exposure Analysis
 *
 * Answers: "How much of your equity is India vs International?"
 *
 * WHY THIS IS CRITICAL (and confusing for most users):
 * - India = ~3% of global market cap. 100% India = missing 97% of the world.
 * - Most Indian investors unknowingly have ZERO international diversification.
 * - International MFs add hidden USD/EUR exposure through fund names like
 *   "Global", "Parag Parikh", "Mirae Global Innovation" — users rarely realize this.
 * - Currency moves (INR vs USD) silently amplify or erode international returns.
 *
 * Detection:
 * - Direct NSE stocks → always India
 * - MFs → classified by fund name pattern (high / medium confidence)
 * - Debt / gold / real estate / PPF → excluded from this equity-focused view
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { AppHeader, useCurrency } from '@/components/AppHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoSource {
  name: string;
  type: 'direct_equity' | 'mf_india' | 'mf_international';
  value: number;
  confidence?: 'high' | 'medium';
  count?: number; // number of holdings (for direct_equity group)
}

// ─── Detection ───────────────────────────────────────────────────────────────

const HIGH_INTL_PATTERNS = [
  /\b(global|international|overseas|foreign)\b/i,
  /\b(nyse|nasdaq|s&p|dow|sp500|s&p 500|s&p500)\b/i,
  /\b(us equity|usa|america|american|united states)\b/i,
  /\b(fang|faang)\b/i,
  /\b(world|worldwide)\b/i,
  /\b(emerging markets|developed markets)\b/i,
  /\b(europe|european|uk|united kingdom|japan|china|asia pacific)\b/i,
  /\b(parag parikh)\b/i, // Known international fund house in India
];

const MEDIUM_INTL_PATTERNS = [
  /\b(fund of fund|fof)\b/i,
  /\b(artificial intelligence|ai fund)\b/i,
  /\b(technology etf|tech etf)\b/i,
];

function detectInternational(name: string): 'high' | 'medium' | null {
  if (!name) return null;
  for (const p of HIGH_INTL_PATTERNS)   if (p.test(name)) return 'high';
  for (const p of MEDIUM_INTL_PATTERNS) if (p.test(name)) return 'medium';
  return null;
}

// Fraction of an MF's equity portion that is international
const INTL_RATIO: Record<'high' | 'medium', number> = {
  high:   1.0,  // 100% international
  medium: 0.80, // 80% international (FoF / AI funds often have India component)
};

const MF_EQUITY_RATIO: Record<string, number> = { FixedIncome: 0.10, Hybrid: 0.50 };
const MF_EQUITY_DEFAULT = 0.85;

// ─── Insights ────────────────────────────────────────────────────────────────

function buildInsights(indiaPct: number, intlPct: number): string[] {
  const insights: string[] = [];

  if (intlPct === 0) {
    insights.push(
      'Your entire equity portfolio is India-focused. This is very common — but it means your wealth is 100% tied to India\'s economic cycles, policy decisions, and rupee movements. A correction in Indian markets has nowhere to hide.',
    );
    insights.push(
      'India represents only ~3% of global equity market capitalisation. The remaining 97% — US tech giants, European pharma, Japanese manufacturing, South Korean semiconductors — is entirely missing from your portfolio.',
    );
  } else if (intlPct < 10) {
    insights.push(
      `Your international exposure is minimal (${intlPct.toFixed(1)}%). While you have some global diversification, India-specific risks still dominate. Even a 15–20% international allocation meaningfully reduces the correlation of your portfolio with Indian market cycles.`,
    );
  } else if (intlPct <= 30) {
    insights.push(
      `You have healthy international diversification at ${intlPct.toFixed(1)}%. This reduces over-dependence on India's economic cycles while keeping most of your wealth anchored to Indian growth.`,
    );
  } else {
    insights.push(
      `${intlPct.toFixed(1)}% of your equity is internationally invested — this is a high allocation by Indian retail standards. Currency volatility (INR vs USD/EUR) will meaningfully impact your returns in either direction.`,
    );
  }

  if (intlPct > 0) {
    insights.push(
      `International holdings carry currency risk. The INR has historically depreciated ~3–4% annually against the USD. This silently boosts returns when INR weakens — but can cut into gains when INR strengthens. Your international returns in INR terms ≠ returns in USD terms.`,
    );
  }

  if (indiaPct > 85) {
    insights.push(
      'A globally diversified Indian investor typically holds 10–25% in international assets. This isn\'t about chasing returns — it\'s about ensuring India-specific shocks (regulatory changes, currency crises, sector blow-ups) don\'t affect your entire equity base simultaneously.',
    );
  }

  return insights.slice(0, 3);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function GeographyExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading]   = useState(true);
  const [indiaValue, setIndia]  = useState(0);
  const [intlValue, setIntl]    = useState(0);
  const [sources, setSources]   = useState<GeoSource[]>([]);
  const [totalEquity, setTotal] = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/data?user_id=${userId}`);
      if (!res.ok) return;
      const result = await res.json();
      if (!result.success || !result.data) return;

      const holdings: any[] = result.data.holdings;
      const geoSources: GeoSource[] = [];
      let india = 0, intl = 0;

      // ── Direct equity → always India ──────────────────────────────────────
      const equityHoldings = holdings.filter(
        h => h.assetType === 'Equity' || h.assetType === 'Stocks',
      );
      const directVal = equityHoldings.reduce(
        (s, h) => s + (h.currentValue || h.investedValue || 0), 0,
      );
      if (directVal > 0) {
        india += directVal;
        geoSources.push({ name: 'Direct Stocks', type: 'direct_equity', value: directVal, count: equityHoldings.length });
      }

      // ── MFs → detect India vs International ───────────────────────────────
      const mfHoldings = holdings.filter(
        h => h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds',
      );

      for (const h of mfHoldings) {
        const val = h.currentValue || h.investedValue || 0;
        const eqRatio = h.assetClass === 'FixedIncome' ? MF_EQUITY_RATIO.FixedIncome
          : h.assetClass === 'Hybrid' ? MF_EQUITY_RATIO.Hybrid
          : MF_EQUITY_DEFAULT;
        const eqVal = val * eqRatio;
        const confidence = detectInternational(h.name || '');

        if (confidence) {
          const intlRatio  = INTL_RATIO[confidence];
          const intlPortion  = eqVal * intlRatio;
          const indiaPortion = eqVal * (1 - intlRatio);
          intl  += intlPortion;
          india += indiaPortion;
          geoSources.push({ name: h.name, type: 'mf_international', value: intlPortion, confidence });
        } else {
          india += eqVal;
          geoSources.push({ name: h.name, type: 'mf_india', value: eqVal });
        }
      }

      const total = india + intl;
      setIndia(india);
      setIntl(intl);
      setTotal(total);
      setSources(geoSources.sort((a, b) => b.value - a.value));
    } catch (err) {
      console.error('[Geography] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') router.replace('/login?redirect=/analytics/geography-exposure');
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id && hasCapability('view_basic_analytics')) {
      fetchData(user.id);
    } else if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability('view_basic_analytics')) {
      router.replace('/analytics/overview');
    }
  }, [user?.id, fetchData, hasCapability, authStatus, capabilitiesLoading, router]);

  if (authStatus === 'loading' || (loading && authStatus === 'authenticated')) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Mapping your geography exposure…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') return null;

  if (!loading && totalEquity === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24 text-center">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-12">
            <p className="text-4xl mb-4">🌏</p>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">No Holdings Found</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Add stocks or mutual funds to see your geography exposure.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const indiaPct   = totalEquity > 0 ? (indiaValue / totalEquity) * 100 : 100;
  const intlPct    = totalEquity > 0 ? (intlValue  / totalEquity) * 100 : 0;
  const hasIntl    = intlValue > 0;
  const intlSrcs   = sources.filter(s => s.type === 'mf_international');
  const insights   = buildInsights(indiaPct, intlPct);

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Geography Exposure</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            How much of your equity is in India vs the rest of the world — and why it matters
          </p>
        </div>

        {/* ── Section 1: Why This Matters ───────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            Why Geography Exposure Is Often Misunderstood
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: '🌍',
                title: 'India = 3% of global markets',
                body: 'India\'s share of global equity market cap is ~3%. A 100% India portfolio means you\'re missing 97% of the world\'s investable companies — including the largest companies on earth.',
                color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20',
                titleColor: 'text-blue-800 dark:text-blue-300',
                bodyColor: 'text-blue-700 dark:text-blue-400',
              },
              {
                icon: '💱',
                title: 'Your returns are in two currencies',
                body: 'International investments earn returns in USD/EUR, then converted to INR. The INR has depreciated ~3–4%/year vs USD over the last decade — this silently boosts international returns for Indian investors.',
                color: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20',
                titleColor: 'text-emerald-800 dark:text-emerald-300',
                bodyColor: 'text-emerald-700 dark:text-emerald-400',
              },
              {
                icon: '⚡',
                title: 'India-only = India-only risk',
                body: 'Regulatory changes, monsoon failures, RBI policy shifts, banking crises — these affect every rupee in an India-only portfolio simultaneously. International exposure provides a genuine shock absorber.',
                color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20',
                titleColor: 'text-amber-800 dark:text-amber-300',
                bodyColor: 'text-amber-700 dark:text-amber-400',
              },
            ].map(card => (
              <div key={card.title} className={`rounded-lg border p-4 ${card.color}`}>
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className={`text-xs font-semibold mb-1.5 ${card.titleColor}`}>{card.title}</p>
                <p className={`text-xs leading-relaxed ${card.bodyColor}`}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 2: Your Geography Snapshot ───────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-5">
            Your equity geography split
          </p>

          {/* Two metric cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* India */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-2xl">🇮🇳</span>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mt-1">India</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Domestic equity</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#2563EB] dark:text-[#3B82F6] number-emphasis">
                    {indiaPct.toFixed(1)}%
                  </p>
                  {indiaPct === 100 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#6B7280] dark:text-[#94A3B8]">
                      Only market
                    </span>
                  )}
                </div>
              </div>
              <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(indiaValue)}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Direct stocks + India-focused MFs
              </p>
            </div>

            {/* International */}
            <div className={`rounded-xl p-4 border ${
              hasIntl
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50'
                : 'bg-[#F9FAFB] dark:bg-[#0F172A]/50 border-[#E5E7EB] dark:border-[#334155]'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-2xl">🌐</span>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mt-1">International</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                    {hasIntl ? 'Via global/intl MFs' : 'No exposure detected'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold number-emphasis ${
                    hasIntl ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#9CA3AF] dark:text-[#64748B]'
                  }`}>
                    {intlPct.toFixed(1)}%
                  </p>
                  {!hasIntl && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#6B7280] dark:text-[#94A3B8]">
                      None
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-lg font-bold number-emphasis ${
                hasIntl ? 'text-[#0F172A] dark:text-[#F8FAFC]' : 'text-[#9CA3AF] dark:text-[#64748B]'
              }`}>
                {hasIntl ? formatCurrency(intlValue) : '₹0'}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                {hasIntl ? `Detected in ${intlSrcs.length} fund${intlSrcs.length > 1 ? 's' : ''}` : 'Add a global fund to diversify'}
              </p>
            </div>
          </div>

          {/* Combined bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
              <span>India {indiaPct.toFixed(1)}%</span>
              {hasIntl && <span>International {intlPct.toFixed(1)}%</span>}
            </div>
            <div className="h-6 rounded-full overflow-hidden bg-[#E5E7EB] dark:bg-[#334155] flex">
              <div
                style={{ width: `${indiaPct}%`, background: '#2563EB' }}
                className="h-full transition-all"
                title={`India: ${formatCurrency(indiaValue)}`}
              />
              {hasIntl && (
                <div
                  style={{ width: `${intlPct}%`, background: '#059669' }}
                  className="h-full transition-all"
                  title={`International: ${formatCurrency(intlValue)}`}
                />
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#2563EB]" />
              India (domestic equity)
            </span>
            {hasIntl && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-[#059669]" />
                International (via global MFs)
              </span>
            )}
            <span className="text-[#9CA3AF] dark:text-[#64748B]">
              Total equity: {formatCurrency(totalEquity)}
            </span>
          </div>
        </div>

        {/* ── Section 3: Source Breakdown ───────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Where Each Rupee Comes From</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Every holding classified by its true geographic destination
            </p>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
            {sources.map((src, i) => {
              const isIntl  = src.type === 'mf_international';
              const isDirect = src.type === 'direct_equity';
              const pct = totalEquity > 0 ? (src.value / totalEquity) * 100 : 0;
              const barW = Math.min(pct * 1.5, 100); // scale: 67% = full bar

              return (
                <div
                  key={i}
                  className="px-6 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#0F172A]/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Geography flag / icon */}
                      <span className="text-base flex-shrink-0">
                        {isIntl ? '🌐' : '🇮🇳'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {src.name}
                            {isDirect && src.count && src.count > 0 && (
                              <span className="text-[#6B7280] dark:text-[#94A3B8] font-normal ml-1">
                                ({src.count} stocks)
                              </span>
                            )}
                          </span>
                          {/* Type badge */}
                          {isDirect && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex-shrink-0">
                              India
                            </span>
                          )}
                          {isIntl && src.confidence === 'high' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                              International
                            </span>
                          )}
                          {isIntl && src.confidence === 'medium' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex-shrink-0">
                              ~80% Intl
                            </span>
                          )}
                          {src.type === 'mf_india' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0">
                              India MF
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] w-10 text-right">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis w-28 text-right">
                        {formatCurrency(src.value)}
                      </span>
                    </div>
                  </div>

                  {/* Mini bar */}
                  <div className="h-1.5 bg-[#F3F4F6] dark:bg-[#334155] rounded-full overflow-hidden ml-7">
                    <div
                      style={{
                        width: `${barW}%`,
                        background: isIntl ? '#059669' : '#2563EB',
                        opacity: src.type === 'mf_india' ? 0.5 : 1,
                      }}
                      className="h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 4: International Fund Details ─────────────────────── */}
        {hasIntl && intlSrcs.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Your International Exposure Sources
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  {intlSrcs.length} fund{intlSrcs.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Funds detected as international via fund name patterns
              </p>
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
              {intlSrcs.map((src, i) => {
                const pctOfIntl = intlValue > 0 ? (src.value / intlValue) * 100 : 0;
                return (
                  <div key={i} className="px-6 py-4 hover:bg-[#F9FAFB] dark:hover:bg-[#0F172A]/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">🌐</span>
                          <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {src.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-6">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            src.confidence === 'high'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                          }`}>
                            {src.confidence === 'high' ? '100% international' : '~80% international'}
                          </span>
                          <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">
                            Detected by fund name
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 number-emphasis">
                          {formatCurrency(src.value)}
                        </p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                          {pctOfIntl.toFixed(0)}% of intl exposure
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detection note */}
            <div className="px-6 py-3 bg-[#F9FAFB] dark:bg-[#0F172A]/50 border-t border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <strong>How detection works:</strong> Funds containing words like "Global", "International", "Overseas", "US", "FANG", "Parag Parikh" are classified as international. Medium-confidence funds (FoF, AI funds) are assumed 80% international.
              </p>
            </div>
          </div>
        )}

        {/* ── Section 5: Currency Risk (only if has international) ──────── */}
        {hasIntl && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Currency Risk — The Hidden Factor in Your Returns
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* INR depreciation */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  📉 INR has historically weakened
                </p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 number-emphasis mb-1">
                  ~3–4%/yr
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Average INR depreciation vs USD over the last decade. This acts as a silent return booster for your international holdings.
                </p>
              </div>

              {/* Return boost example */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-4">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                  📈 What this means for you
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 number-emphasis mb-1">
                  +3–4% extra
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  A 10% USD return on international stocks = ~13–14% in INR terms when INR weakens by 3–4%. But if INR strengthens, returns shrink by the same amount.
                </p>
              </div>
            </div>

            {/* Real-world example */}
            <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
              <p className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] mb-3">
                Example: S&P 500 returns for an Indian investor (illustrative)
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'S&P 500 return (USD)', value: '10%', sub: 'What the index returned' },
                  { label: 'INR depreciation', value: '+ 4%', sub: 'Rupee weakened vs dollar' },
                  { label: 'Your return (INR)', value: '~14%', sub: 'What you actually earned' },
                ].map(item => (
                  <div key={item.label} className="bg-white dark:bg-[#1E293B] rounded-lg p-3 border border-[#E5E7EB] dark:border-[#334155]">
                    <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">{item.value}</p>
                    <p className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] mt-1">{item.label}</p>
                    <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-3">
                ⚠ This works in reverse too — if INR strengthens by 4%, a 10% USD gain becomes only ~6% in INR. Currency adds a layer of volatility to international returns.
              </p>
            </div>
          </div>
        )}

        {/* ── Section 6: Insights ───────────────────────────────────────── */}
        {insights.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              What This Means For You
            </h2>
            <div className="space-y-3">
              {insights.map((text, idx) => {
                const isWarn = /missing|tied|simultaneously|100%|entire|cut into|volatility/i.test(text);
                const isGood = /healthy|meaningfully reduces|genuine shock/i.test(text) && !isWarn;
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

        {/* ── Section 7: Benchmark Comparison ──────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            How Does Your Mix Compare?
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-5">
            Reference benchmarks for an India-based equity investor
          </p>

          {/* Three benchmarks */}
          <div className="space-y-5">
            {[
              {
                label: 'You',
                india: indiaPct,
                intl: intlPct,
                isBold: true,
                desc: 'Your current portfolio',
              },
              {
                label: 'Globally diversified',
                india: 85,
                intl: 15,
                isBold: false,
                desc: '15% intl — recommended starting point for Indian investors',
              },
              {
                label: 'Global market weight',
                india: 3,
                intl: 97,
                isBold: false,
                desc: 'If you matched world market cap — very aggressive',
              },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm ${row.isBold ? 'font-bold text-[#0F172A] dark:text-[#F8FAFC]' : 'text-[#6B7280] dark:text-[#94A3B8]'}`}>
                    {row.label}
                  </span>
                  <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] hidden sm:block">{row.desc}</span>
                </div>
                <div className="h-5 rounded-full overflow-hidden bg-[#E5E7EB] dark:bg-[#334155] flex">
                  <div
                    style={{ width: `${row.india}%`, background: '#2563EB', opacity: row.isBold ? 1 : 0.45 }}
                    className="h-full transition-all"
                    title={`India: ${row.india.toFixed(1)}%`}
                  />
                  {row.intl > 0 && (
                    <div
                      style={{ width: `${row.intl}%`, background: '#059669', opacity: row.isBold ? 1 : 0.45 }}
                      className="h-full transition-all"
                      title={`International: ${row.intl.toFixed(1)}%`}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[#9CA3AF] dark:text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm bg-[#2563EB]" />
                    India {row.india.toFixed(0)}%
                  </span>
                  {row.intl > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm bg-[#059669]" />
                      International {row.intl.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
            <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] leading-relaxed">
              There is no universally "correct" international allocation. Most advisors suggest 10–25% for Indian investors as a starting point. SEBI restricts Indian MFs from investing more than $7B overseas (industry-wide cap), so very high international allocation via domestic MFs may hit limits periodically.
            </p>
          </div>
        </div>

        {/* ── Footer Disclaimer ─────────────────────────────────────────── */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
          <InfoIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            <strong>Direct stocks</strong> on NSE are classified as India.{' '}
            <strong>MF classification</strong> uses fund name pattern matching — funds with keywords like "Global", "International", "Overseas", "US", "Parag Parikh" are classified as international. Funds with medium-confidence indicators (FoF, AI funds) are assumed 80% international.{' '}
            <strong>Debt funds, gold, PPF, and real estate</strong> are excluded — this is an equity-focused view. For actual fund portfolio data, refer to individual fund factsheets.
          </p>
        </div>

      </main>
    </div>
  );
}
