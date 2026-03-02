/**
 * Mutual Fund Exposure Analytics Page
 *
 * Shows what your mutual funds are invested in (equity, debt, other).
 * Key insight: your TRUE equity exposure = direct stocks + equity inside MFs.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { AppHeader, useCurrency } from '@/components/AppHeader';

// ─── Types ──────────────────────────────────────────────────────────────────

type FundCategory = 'equity' | 'hybrid' | 'debt';

interface FundBreakdown {
  id: string;
  name: string;
  currentValue: number;
  investedValue: number;
  category: FundCategory;
}

interface ExposureSummary {
  totalMFValue: number;
  equityExposure: number;
  debtExposure: number;
  otherExposure: number;
  equityCount: number;
  hybridCount: number;
  debtCount: number;
}

interface Insight {
  level: 'info' | 'warn' | 'good';
  text: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FUND_RATIOS: Record<FundCategory, { equity: number; debt: number; other: number }> = {
  equity:  { equity: 0.85, debt: 0.12, other: 0.03 },
  hybrid:  { equity: 0.50, debt: 0.45, other: 0.05 },
  debt:    { equity: 0.10, debt: 0.85, other: 0.05 },
};

const CATEGORY_LABELS: Record<FundCategory, string> = {
  equity: 'Equity',
  hybrid: 'Hybrid',
  debt:   'Debt',
};

const CATEGORY_COLORS: Record<FundCategory, { bg: string; text: string }> = {
  equity: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  hybrid: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  debt:   { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyFund(assetClass: string | null): FundCategory {
  if (assetClass === 'FixedIncome') return 'debt';
  if (assetClass === 'Hybrid') return 'hybrid';
  return 'equity';
}

function buildInsights(
  summary: ExposureSummary,
  directEquity: number,
  portfolioTotal: number,
): Insight[] {
  const insights: Insight[] = [];
  const equityPct = summary.totalMFValue > 0 ? (summary.equityExposure / summary.totalMFValue) * 100 : 0;
  const combinedEquity = directEquity + summary.equityExposure;
  const combinedEquityPct = portfolioTotal > 0 ? (combinedEquity / portfolioTotal) * 100 : 0;

  if (equityPct > 80) {
    insights.push({
      level: 'warn',
      text: `Your MF portfolio is ${equityPct.toFixed(0)}% equity-oriented. This gives strong long-term growth but will feel volatile in market downturns. Ensure you won't need this money for at least 5 years.`,
    });
  } else if (equityPct < 30) {
    insights.push({
      level: 'info',
      text: `Your MF portfolio is mostly debt/conservative (${(100 - equityPct).toFixed(0)}% debt). If you have long-term goals (5+ years), adding equity-oriented funds can improve returns significantly.`,
    });
  } else {
    insights.push({
      level: 'good',
      text: `Your MF portfolio is balanced — ${equityPct.toFixed(0)}% equity and ${(100 - equityPct).toFixed(0)}% debt/other. This blends growth potential with some stability. Review annually to stay aligned with your goals.`,
    });
  }

  if (summary.debtCount === 0 && summary.totalMFValue > 0) {
    insights.push({
      level: 'info',
      text: `You have no debt mutual funds. For short-term goals (1–3 years), debt funds can be a tax-efficient alternative to FDs.`,
    });
  }

  if (summary.hybridCount === 0 && summary.equityCount > 2) {
    insights.push({
      level: 'info',
      text: `You have ${summary.equityCount} pure equity funds but no hybrid fund. A hybrid fund automatically rebalances between equity and debt — useful for medium-term goals (3–5 years).`,
    });
  }

  if (combinedEquityPct > 70) {
    insights.push({
      level: 'warn',
      text: `Including your direct stocks, your combined equity exposure is ${combinedEquityPct.toFixed(0)}% of your portfolio. This is a high-growth, high-volatility portfolio. Make sure you have 6–12 months of expenses in safer instruments.`,
    });
  }

  if (summary.equityCount >= 4) {
    insights.push({
      level: 'info',
      text: `You hold ${summary.equityCount} equity mutual funds. Many investors over-diversify within MFs — if two funds track similar indices or large-cap stocks, they likely overlap heavily. Consider consolidating.`,
    });
  }

  return insights.slice(0, 3); // Show at most 3 insights
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function MFExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<FundBreakdown[]>([]);
  const [summary, setSummary] = useState<ExposureSummary | null>(null);
  const [directEquity, setDirectEquity] = useState(0);
  const [portfolioTotal, setPortfolioTotal] = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/data?user_id=${userId}`);
      if (!res.ok) return;
      const result = await res.json();
      if (!result.success || !result.data) return;

      const allHoldings = result.data.holdings as any[];

      const mfHoldings = allHoldings.filter(
        (h) => h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds',
      );
      const equityHoldings = allHoldings.filter(
        (h) => h.assetType === 'Equity' || h.assetType === 'Stocks',
      );

      const totalDirectEquity = equityHoldings.reduce((s, h) => s + (h.currentValue || h.investedValue || 0), 0);
      const totalPortfolio = result.data.metrics.netWorth || 0;

      // Build per-fund breakdown
      const fundList: FundBreakdown[] = mfHoldings.map((h: any) => {
        const val = h.currentValue || h.investedValue || 0;
        return {
          id: h.id,
          name: h.name,
          currentValue: val,
          investedValue: h.investedValue || 0,
          category: classifyFund(h.assetClass),
        };
      }).sort((a, b) => b.currentValue - a.currentValue);

      // Aggregate summary
      let equityExp = 0, debtExp = 0, otherExp = 0;
      let eqCount = 0, hyCount = 0, dtCount = 0;
      let totalMF = 0;

      for (const f of fundList) {
        totalMF += f.currentValue;
        const ratios = FUND_RATIOS[f.category];
        equityExp += f.currentValue * ratios.equity;
        debtExp += f.currentValue * ratios.debt;
        otherExp += f.currentValue * ratios.other;
        if (f.category === 'equity') eqCount++;
        else if (f.category === 'hybrid') hyCount++;
        else dtCount++;
      }

      setFunds(fundList);
      setSummary({
        totalMFValue: totalMF,
        equityExposure: equityExp,
        debtExposure: debtExp,
        otherExposure: otherExp,
        equityCount: eqCount,
        hybridCount: hyCount,
        debtCount: dtCount,
      });
      setDirectEquity(totalDirectEquity);
      setPortfolioTotal(totalPortfolio);
    } catch (err) {
      console.error('MF exposure fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth guards
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/mutualfund-exposure');
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
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Analysing your mutual funds…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') return null;

  // ── Empty state ──
  if (!summary || summary.totalMFValue === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24 text-center">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-12">
            <p className="text-4xl mb-4">📊</p>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">No Mutual Fund Holdings</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Add mutual funds to your portfolio to see what's inside them — equity, debt, and more.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Computed values ──
  const { totalMFValue, equityExposure, debtExposure, otherExposure } = summary;
  const equityPct = (equityExposure / totalMFValue) * 100;
  const debtPct = (debtExposure / totalMFValue) * 100;
  const otherPct = (otherExposure / totalMFValue) * 100;

  const combinedEquity = directEquity + equityExposure;
  const combinedEquityPct = portfolioTotal > 0 ? (combinedEquity / portfolioTotal) * 100 : 0;
  const directEquityPct = portfolioTotal > 0 ? (directEquity / portfolioTotal) * 100 : 0;
  const equityViaMFPct = portfolioTotal > 0 ? (equityExposure / portfolioTotal) * 100 : 0;

  const insights = buildInsights(summary, directEquity, portfolioTotal);

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton backHref="/analytics/overview" backLabel="Back to Analytics" />

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">

        {/* ── Page Title ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Mutual Fund Exposure</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            What&apos;s actually inside your {summary.equityCount + summary.hybridCount + summary.debtCount} mutual fund{summary.equityCount + summary.hybridCount + summary.debtCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Section 1: Exposure Hero ─────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">

          {/* Headline */}
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
              {formatCurrency(totalMFValue)}
            </span>
            <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">invested across your mutual funds</span>
          </div>

          {/* Stacked bar */}
          <div className="mb-4">
            <div className="flex h-5 rounded-full overflow-hidden gap-px">
              <div style={{ width: `${equityPct}%` }} className="bg-[#2563EB] transition-all" />
              <div style={{ width: `${debtPct}%` }} className="bg-[#10B981] transition-all" />
              <div style={{ width: `${otherPct}%` }} className="bg-[#94A3B8] transition-all" />
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                Equity &nbsp;·&nbsp; {equityPct.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                Debt &nbsp;·&nbsp; {debtPct.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#94A3B8]" />
                Cash/Other &nbsp;·&nbsp; {otherPct.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 3 stat chips */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Equity exposure', value: equityExposure, pct: equityPct, color: 'text-[#2563EB] dark:text-[#3B82F6]', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Debt exposure', value: debtExposure, pct: debtPct, color: 'text-[#10B981] dark:text-[#34D399]', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Cash / Other', value: otherExposure, pct: otherPct, color: 'text-[#64748B] dark:text-[#94A3B8]', bg: 'bg-slate-50 dark:bg-slate-900/30' },
            ].map((chip) => (
              <div key={chip.label} className={`${chip.bg} rounded-lg p-3 border border-[#E5E7EB] dark:border-[#334155]`}>
                <p className={`text-base font-bold number-emphasis ${chip.color}`}>~{formatCurrency(chip.value)}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{chip.label}</p>
                <p className={`text-xs font-medium ${chip.color} mt-0.5`}>{chip.pct.toFixed(0)}% of MFs</p>
              </div>
            ))}
          </div>

          {/* Fund type summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-[#6B7280] dark:text-[#94A3B8]">Fund types:</span>
            {summary.equityCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                {summary.equityCount} Equity
              </span>
            )}
            {summary.hybridCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                {summary.hybridCount} Hybrid
              </span>
            )}
            {summary.debtCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                {summary.debtCount} Debt
              </span>
            )}
          </div>
        </div>

        {/* ── Section 2: True Equity Picture ──────────────────────────── */}
        {(directEquity > 0 || equityExposure > 0) && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
            <div className="flex items-start gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Your True Equity Exposure</h2>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                  Direct stocks + what your MFs invest in equity = your actual equity risk
                </p>
              </div>
            </div>

            {/* Combined equity bar */}
            <div className="space-y-3 mb-5">
              {/* Direct stocks row */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#475569] dark:text-[#CBD5E1]">Direct Stocks</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(directEquity)} &nbsp;·&nbsp; {directEquityPct.toFixed(1)}% of portfolio
                  </span>
                </div>
                <div className="h-3 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full"
                    style={{ width: `${Math.min(directEquityPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Equity via MFs row */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#475569] dark:text-[#CBD5E1]">Equity via Mutual Funds <span className="text-[#9CA3AF] dark:text-[#64748B]">(estimated)</span></span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    ~{formatCurrency(equityExposure)} &nbsp;·&nbsp; {equityViaMFPct.toFixed(1)}% of portfolio
                  </span>
                </div>
                <div className="h-3 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#93C5FD] dark:bg-[#1D4ED8] rounded-full"
                    style={{ width: `${Math.min(equityViaMFPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-[#E5E7EB] dark:border-[#334155] pt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Total Equity Exposure</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Direct + via MFs combined</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#2563EB] dark:text-[#3B82F6] number-emphasis">
                      ~{formatCurrency(combinedEquity)}
                    </p>
                    <p className="text-xs font-medium text-[#2563EB] dark:text-[#3B82F6]">
                      {combinedEquityPct.toFixed(1)}% of portfolio
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked combined bar */}
            <div>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                {directEquityPct > 0 && (
                  <div
                    title={`Direct stocks: ${directEquityPct.toFixed(1)}%`}
                    style={{ width: `${directEquityPct}%` }}
                    className="bg-[#2563EB]"
                  />
                )}
                {equityViaMFPct > 0 && (
                  <div
                    title={`Via MFs: ${equityViaMFPct.toFixed(1)}%`}
                    style={{ width: `${equityViaMFPct}%` }}
                    className="bg-[#93C5FD] dark:bg-[#1D4ED8]"
                  />
                )}
                <div className="flex-1 bg-[#E5E7EB] dark:bg-[#334155]" />
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#2563EB] inline-block" />Direct</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#93C5FD] dark:bg-[#1D4ED8] inline-block" />Via MFs</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#E5E7EB] dark:bg-[#334155] inline-block" />Rest of portfolio</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Fund-by-Fund Breakdown ───────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Your Mutual Funds</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Fund type determines how much equity vs debt is likely inside
            </p>
          </div>

          {/* Category legend */}
          <div className="px-6 py-3 bg-[#F9FAFB] dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-[#475569] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Equity fund</strong> — typically ~85% stocks, ~12% debt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED] inline-block" />
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Hybrid fund</strong> — typically ~50% stocks, ~45% debt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Debt fund</strong> — typically ~10% stocks, ~85% debt
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
            {funds.map((fund) => {
              const catColors = CATEGORY_COLORS[fund.category];
              const gainLoss = fund.currentValue - fund.investedValue;
              const gainLossPct = fund.investedValue > 0 ? (gainLoss / fund.investedValue) * 100 : 0;
              const allocationPct = totalMFValue > 0 ? (fund.currentValue / totalMFValue) * 100 : 0;

              return (
                <div key={fund.id} className="px-6 py-4 hover:bg-[#F9FAFB] dark:hover:bg-[#0F172A]/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: name + badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {fund.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${catColors.bg} ${catColors.text}`}>
                          {CATEGORY_LABELS[fund.category]}
                        </span>
                      </div>
                      {/* Share of MF portfolio bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[140px] h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full"
                            style={{ width: `${Math.min(allocationPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{allocationPct.toFixed(1)}% of your MFs</span>
                      </div>
                    </div>

                    {/* Right: value + gain */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                        {formatCurrency(fund.currentValue)}
                      </p>
                      <p className={`text-xs number-emphasis ${gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                        {gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(1)}%
                        <span className="text-[#9CA3AF] dark:text-[#64748B]"> ({gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)})</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 4: Insights ──────────────────────────────────────── */}
        {insights.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-5">
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">What This Means For You</h2>
            <div className="space-y-3">
              {insights.map((ins, i) => {
                const style =
                  ins.level === 'good'
                    ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', icon: '✓', iconColor: 'text-emerald-600 dark:text-emerald-400' }
                    : ins.level === 'warn'
                    ? { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', icon: '!', iconColor: 'text-amber-600 dark:text-amber-400' }
                    : { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', icon: 'i', iconColor: 'text-blue-600 dark:text-blue-400' };
                return (
                  <div key={i} className={`flex gap-3 p-3.5 rounded-lg border ${style.bg} ${style.border}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${style.iconColor}`}>
                      {style.icon}
                    </span>
                    <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">{ins.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer: Disclaimer ───────────────────────────────────────── */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
          <InfoIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Exposure values are <strong>estimated</strong> based on fund category (equity/hybrid/debt). Actual composition varies by fund and changes monthly. For exact breakdown, check each fund&apos;s factsheet on AMFI or your fund house&apos;s website.
          </p>
        </div>

      </main>
    </div>
  );
}
