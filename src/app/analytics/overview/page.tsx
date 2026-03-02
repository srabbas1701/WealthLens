/**
 * Analytics Overview Page
 *
 * Free-tier analytics hub. Shows real computed signals from the user's
 * portfolio — allocation bars, portfolio signals, MF x-ray teaser — and
 * presents advanced analytics as clear value propositions to drive upgrades.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCapabilities } from '@/lib/capabilities';
import { UpgradeModal } from '@/components/UpgradeModal';
import {
  ArrowRightIcon,
  TargetIcon,
  ShieldCheckIcon,
  ChartIcon,
  LayersIcon,
  BuildingIcon,
  TrendingUpIcon,
  GlobeIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

// ── INTERFACES ────────────────────────────────────────────────────────────────

interface PortfolioOwnership {
  equity: number;
  mutualFunds: number;
  fixedDeposits: number;
  others: number;
  total: number;
}

interface AllocationBucket {
  name: string;
  percentage: number;
  value: number;
  color: string;
}

interface HoldingItem {
  name: string;
  assetType: string;
  currentValue: number;
  investedValue: number;
  allocationPct: number;
  sector: string | null;
  symbol: string | null;
}

interface PortfolioSnapshot {
  allocation: AllocationBucket[];
  holdings: HoldingItem[];
  riskLabel: string;
  totalHoldings: number;
}

// ── ANALYTICS CARD COMPONENT ─────────────────────────────────────────────────

interface AnalyticsCardProps {
  href: string;
  locked: boolean;
  plan: 'Pro' | 'Premium';
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  teaser: string;
  description: string;
  onLock: (e: React.MouseEvent) => void;
}

function AnalyticsCard({ href, locked, plan, icon, iconBg, title, teaser, description, onLock }: AnalyticsCardProps) {
  const planColors = {
    Premium: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    Pro: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  };
  return (
    <Link
      href={href}
      onClick={locked ? onLock : undefined}
      className="relative flex flex-col bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all group"
    >
      {locked && (
        <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${planColors[plan]}`}>
          {plan}
        </span>
      )}
      <div className={`inline-flex p-2 rounded-lg ${iconBg} mb-3 w-fit`}>{icon}</div>
      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1 italic">"{teaser}"</p>
      <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">{title}</h3>
      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] flex-1 leading-relaxed">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-xs font-medium text-[#2563EB] dark:text-[#3B82F6] group-hover:gap-2 transition-all">
        {locked ? 'Unlock' : 'View'} <ArrowRightIcon className="w-3 h-3" />
      </div>
    </Link>
  );
}

// ── SIGNAL COLOR PALETTE ──────────────────────────────────────────────────────

const SIGNAL_COLORS = {
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    label: 'text-emerald-700 dark:text-emerald-400',
    labelBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'text-amber-700 dark:text-amber-400',
    labelBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    label: 'text-red-700 dark:text-red-400',
    labelBg: 'bg-red-100 dark:bg-red-900/40',
  },
} as const;

type SignalLevel = keyof typeof SIGNAL_COLORS;

interface Signal {
  label: string;
  level: SignalLevel;
  message: string;
}

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function AnalyticsOverviewPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasCapability } = useCapabilities();

  const [loading, setLoading] = useState(true);
  const [ownership, setOwnership] = useState<PortfolioOwnership | null>(null);
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [xrayTab, setXrayTab] = useState<'mf' | 'stocks' | 'etf'>('mf');
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    plan: 'Pro' | 'Premium';
    title: string;
    description: string;
    benefits: string[];
  }>({ open: false, plan: 'Pro', title: '', description: '', benefits: [] });

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/portfolio/data?user_id=${encodeURIComponent(userId)}`);
      if (!response.ok) return;
      const result = await response.json();
      if (!result.success || !result.data) return;

      const d = result.data;

      // ── OWNERSHIP BREAKDOWN ─────────────────────────────────────────────────
      const sumHoldings = (filter: (h: any) => boolean) =>
        d.holdings.filter(filter).reduce((s: number, h: any) => s + (h.currentValue || h.investedValue || 0), 0);

      const directEquity = sumHoldings((h: any) => h.assetType === 'Stocks' || h.assetType === 'Equity');
      const mfValue = sumHoldings((h: any) =>
        h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds' || h.assetType === 'ETFs'
      );
      const fdValue = sumHoldings((h: any) =>
        h.assetType === 'Fixed Deposits' || h.assetType === 'Fixed Deposit' ||
        h.assetType === 'PPF' || h.assetType === 'EPF'
      );
      const total = Number(d.metrics.netWorth) || 0;
      const othersValue = Math.max(0, total - directEquity - mfValue - fdValue);

      setOwnership({ equity: directEquity, mutualFunds: mfValue, fixedDeposits: fdValue, others: othersValue, total });

      // ── SNAPSHOT ────────────────────────────────────────────────────────────
      const allocation: AllocationBucket[] = (d.allocation || [])
        .filter((a: any) => a.name !== 'Insurance' && a.percentage > 0)
        .sort((a: any, b: any) => b.percentage - a.percentage);

      const holdings: HoldingItem[] = (d.holdings || []).map((h: any) => ({
        name: h.name,
        assetType: h.assetType,
        currentValue: h.currentValue || h.investedValue || 0,
        investedValue: h.investedValue || 0,
        allocationPct: h.allocationPct || 0,
        sector: h.sector || null,
        symbol: h.symbol || null,
      }));

      setSnapshot({
        allocation,
        holdings,
        riskLabel: d.metrics.riskLabel || 'Moderate',
        totalHoldings: d.summary?.totalHoldings || holdings.length,
      });
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') router.replace('/login?redirect=/analytics/overview');
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) fetchData(user.id);
  }, [user?.id, fetchData]);

  // ── AUTH GUARDS ───────────────────────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }
  if (authStatus === 'unauthenticated') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Analysing your portfolio…</p>
        </div>
      </div>
    );
  }

  // ── EMPTY STATE ───────────────────────────────────────────────────────────
  if (!ownership || !snapshot || ownership.total === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton backHref="/dashboard" backLabel="Back to Dashboard" />
        <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-24 pb-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ChartIcon className="w-8 h-8 text-[#2563EB] dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">No portfolio data yet</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-6">Add your holdings to start seeing portfolio analytics and insights.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF] transition-colors">
              Go to Dashboard <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── SIGNAL COMPUTATIONS ───────────────────────────────────────────────────

  const { total, equity, mutualFunds } = ownership;

  // Signal 1: Growth orientation
  const growthPct = total > 0 ? ((equity + mutualFunds) / total * 100) : 0;
  const growthSignal: Signal = growthPct > 75
    ? { label: 'High Growth', level: 'yellow', message: `${growthPct.toFixed(0)}% of your portfolio is in equities & mutual funds. Strong upside potential, but expect significant volatility during market downturns.` }
    : growthPct > 40
    ? { label: 'Balanced', level: 'green', message: `${growthPct.toFixed(0)}% in growth assets — a healthy balance between long-term growth and short-term stability.` }
    : growthPct > 0
    ? { label: 'Conservative', level: 'yellow', message: `Only ${growthPct.toFixed(0)}% in growth assets. This protects capital but may underperform inflation over the long run.` }
    : { label: 'No Growth Assets', level: 'red', message: 'No equity or mutual fund holdings detected. Consider adding growth assets to build long-term wealth.' };

  // Signal 2: Diversification breadth
  const assetClassCount = snapshot.allocation.length;
  const diverseSignal: Signal = assetClassCount >= 4
    ? { label: 'Well Diversified', level: 'green', message: `Your portfolio spans ${assetClassCount} asset classes. Diversification cushions returns against any single market downturn.` }
    : assetClassCount >= 2
    ? { label: 'Moderately Diversified', level: 'yellow', message: `You're invested in ${assetClassCount} asset class${assetClassCount > 1 ? 'es' : ''}. Adding more classes (e.g., gold, debt, real estate) can reduce risk further.` }
    : { label: 'Concentrated', level: 'red', message: 'All your investments are in a single asset class. This concentrates risk significantly — one bad market move impacts everything.' };

  // Signal 3: Top holding concentration
  const sortedHoldings = [...snapshot.holdings].sort((a, b) => b.currentValue - a.currentValue);
  const topHolding = sortedHoldings[0];
  const topPct = topHolding?.allocationPct || 0;
  const concSignal: Signal = !topHolding
    ? { label: 'No Holdings', level: 'yellow', message: 'Add holdings to see concentration analysis.' }
    : topPct > 30
    ? { label: 'High Concentration', level: 'red', message: `"${topHolding.name}" makes up ${topPct.toFixed(1)}% of your portfolio. A single negative event in this holding could significantly impact your wealth.` }
    : topPct > 15
    ? { label: 'Notable Concentration', level: 'yellow', message: `"${topHolding.name}" is your largest holding at ${topPct.toFixed(1)}%. Monitor it and ensure you're comfortable with this exposure.` }
    : { label: 'Well Distributed', level: 'green', message: `Your largest holding is ${topPct.toFixed(1)}% of your portfolio. No single bet dominates your wealth — great risk discipline.` };

  const handleLockedClick = (
    e: React.MouseEvent,
    plan: 'Pro' | 'Premium',
    title: string,
    description: string,
    benefits: string[]
  ) => {
    e.preventDefault();
    setUpgradeModal({ open: true, plan, title, description, benefits });
  };

  const riskLabelColors: Record<string, string> = {
    'Very Low': 'text-blue-600 dark:text-blue-400',
    'Low': 'text-emerald-600 dark:text-emerald-400',
    'Moderate': 'text-amber-600 dark:text-amber-400',
    'High': 'text-orange-600 dark:text-orange-400',
    'Very High': 'text-red-600 dark:text-red-400',
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton backHref="/dashboard" backLabel="Back to Dashboard" />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">

        {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Portfolio Analytics</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            Understand how your money is really working for you
          </p>
        </div>

        {/* ── SECTION 1: AT A GLANCE ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Total Portfolio',
              value: formatCurrency(total),
              sub: 'Current value',
              valueClass: 'text-[#0F172A] dark:text-[#F8FAFC]',
            },
            {
              label: 'Holdings',
              value: String(snapshot.totalHoldings),
              sub: 'Across all assets',
              valueClass: 'text-[#0F172A] dark:text-[#F8FAFC]',
            },
            {
              label: 'Asset Classes',
              value: String(assetClassCount),
              sub: 'Types invested in',
              valueClass: 'text-[#0F172A] dark:text-[#F8FAFC]',
            },
            {
              label: 'Risk Level',
              value: snapshot.riskLabel,
              sub: 'Portfolio risk profile',
              valueClass: riskLabelColors[snapshot.riskLabel] || 'text-amber-600 dark:text-amber-400',
            },
          ].map(item => (
            <div key={item.label} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4">
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">{item.label}</p>
              <p className={`text-xl font-bold number-emphasis truncate ${item.valueClass}`}>{item.value}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* ── SECTION 2: ALLOCATION BREAKDOWN ─────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-6">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-0.5">Allocation Breakdown</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-5">How your money is distributed across asset classes (current market values)</p>

          <div className="space-y-4">
            {snapshot.allocation.map(bucket => (
              <div key={bucket.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: bucket.color }} />
                    <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{bucket.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] number-emphasis">{formatCurrency(bucket.value)}</span>
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] w-12 text-right number-emphasis">
                      {bucket.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[#F3F4F6] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(bucket.percentage, 100)}%`, background: bucket.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: PORTFOLIO SIGNALS ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-6">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-0.5">Portfolio Signals</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-5">Key insights derived from your current allocation</p>

          <div className="space-y-3">
            {(
              [
                { Icon: TrendingUpIcon, title: 'Growth Orientation', signal: growthSignal },
                { Icon: LayersIcon, title: 'Diversification', signal: diverseSignal },
                { Icon: TargetIcon, title: 'Concentration Risk', signal: concSignal },
              ] as { Icon: React.ComponentType<{ className: string }>; title: string; signal: Signal }[]
            ).map(({ Icon, title, signal }) => {
              const c = SIGNAL_COLORS[signal.level];
              return (
                <div key={title} className={`rounded-xl border p-4 flex items-start gap-4 ${c.bg} ${c.border}`}>
                  <div className={`p-2 rounded-lg ${c.labelBg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${c.label}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{title}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.labelBg} ${c.label}`}>
                        {signal.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">{signal.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 4: INVESTMENT X-RAY (tabbed) ─────────────────────────────── */}
        {(() => {
          const stockHoldings = snapshot.holdings
            .filter(h => h.assetType === 'Stocks' || h.assetType === 'Equity')
            .sort((a, b) => b.currentValue - a.currentValue);
          const etfHoldings = snapshot.holdings
            .filter(h => h.assetType === 'ETFs')
            .sort((a, b) => b.currentValue - a.currentValue);
          const mfHoldings = snapshot.holdings
            .filter(h => h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds')
            .sort((a, b) => b.currentValue - a.currentValue);

          // Sector grouping for stocks tab
          const sectorMap = new Map<string, number>();
          stockHoldings.forEach(h => {
            const s = h.sector || 'Unknown';
            sectorMap.set(s, (sectorMap.get(s) || 0) + h.currentValue);
          });
          const stockTotal = stockHoldings.reduce((s, h) => s + h.currentValue, 0);
          const sectorBars = [...sectorMap.entries()]
            .map(([name, value]) => ({ name, value, pct: stockTotal > 0 ? (value / stockTotal) * 100 : 0 }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 5);
          const hasSectorData = sectorBars.some(s => s.name !== 'Unknown');

          // ETF value
          const etfTotal = etfHoldings.reduce((s, h) => s + h.currentValue, 0);

          // Available tabs
          type XrayTabId = 'mf' | 'stocks' | 'etf';
          const tabs: { id: XrayTabId; label: string; count: number; value: number }[] = [];
          if (mutualFunds > 0) tabs.push({ id: 'mf', label: 'Mutual Funds', count: mfHoldings.length, value: mutualFunds });
          if (stockHoldings.length > 0) tabs.push({ id: 'stocks', label: 'Direct Stocks', count: stockHoldings.length, value: stockTotal });
          if (etfHoldings.length > 0) tabs.push({ id: 'etf', label: 'ETFs', count: etfHoldings.length, value: etfTotal });

          if (tabs.length === 0) return null;

          // If active tab has no data, default to first available
          const activeTab = tabs.find(t => t.id === xrayTab) ? xrayTab : tabs[0].id;

          const SECTOR_COLORS = ['#2563EB', '#10B981', '#F97316', '#7C3AED', '#06B6D4'];

          return (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] mb-6 overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-5 pb-0">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-0.5">Investment X-Ray</h2>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-4">Look beyond ownership — see what's really inside each asset type</p>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-[#E5E7EB] dark:border-[#334155]">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setXrayTab(tab.id)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-[#2563EB] text-[#2563EB] dark:text-[#3B82F6]'
                          : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">

                {/* ── MF TAB ── */}
                {activeTab === 'mf' && (
                  <div>
                    <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mb-4">
                      You own <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(mutualFunds)}</span> across <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{mfHoldings.length} fund{mfHoldings.length !== 1 ? 's' : ''}</span>.
                      Mutual funds are <strong>wrappers</strong> — inside, they hold stocks, bonds, gold, and more. Your actual equity exposure is likely different from what the dashboard shows.
                    </p>
                    <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-[#E5E7EB] dark:border-[#334155]">
                      <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Estimated average exposure inside your MFs</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Equity (stocks)', approxPct: 85, value: mutualFunds * 0.85, color: '#2563EB' },
                          { label: 'Debt / Bonds', approxPct: 12, value: mutualFunds * 0.12, color: '#10B981' },
                          { label: 'Other (gold, cash)', approxPct: 3, value: mutualFunds * 0.03, color: '#F97316' },
                        ].map(row => (
                          <div key={row.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#475569] dark:text-[#CBD5E1]">{row.label}</span>
                              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">~{row.approxPct}%&nbsp;·&nbsp;{formatCurrency(row.value)}</span>
                            </div>
                            <div className="h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${row.approxPct}%`, background: row.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-3">* Estimated averages. Actual splits vary by fund category.{!hasCapability('view_basic_analytics') && ' Upgrade to Pro to see exact per-fund breakdown.'}</p>
                    </div>
                    <button
                      onClick={() => hasCapability('view_basic_analytics')
                        ? router.push('/analytics/mutualfund-exposure')
                        : setUpgradeModal({ open: true, plan: 'Pro', title: 'Mutual Fund Exposure Analytics', description: 'See the exact equity, debt, sector, and geography breakdown of every mutual fund you hold.', benefits: ['Exact equity vs debt ratio per fund', 'Fund overlap & duplication detection', 'Hidden sector concentration risks', 'Fund-wise performance & XIRR'] })}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] transition-colors"
                    >
                      See exact fund breakdown <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── STOCKS TAB ── */}
                {activeTab === 'stocks' && (
                  <div>
                    <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mb-4">
                      You directly own <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{stockHoldings.length} stock{stockHoldings.length !== 1 ? 's' : ''}</span> worth <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(stockTotal)}</span>.
                      Direct stocks are the most transparent investment — but are your picks well-diversified across sectors?
                    </p>

                    {/* Top holdings */}
                    <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-[#E5E7EB] dark:border-[#334155]">
                      <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Your top stock positions</p>
                      <div className="space-y-2.5">
                        {stockHoldings.slice(0, 3).map((h, i) => (
                          <div key={h.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#475569] dark:text-[#CBD5E1] truncate mr-2">{h.name}{h.symbol ? ` (${h.symbol})` : ''}</span>
                              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis flex-shrink-0">{h.allocationPct.toFixed(1)}%&nbsp;·&nbsp;{formatCurrency(h.currentValue)}</span>
                            </div>
                            <div className="h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(h.allocationPct, 100)}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                            </div>
                          </div>
                        ))}
                        {stockHoldings.length > 3 && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] pt-1">
                            + {stockHoldings.length - 3} more holding{stockHoldings.length - 3 !== 1 ? 's' : ''} — upgrade to see full breakdown
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sector distribution */}
                    {hasSectorData ? (
                      <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-[#E5E7EB] dark:border-[#334155]">
                        <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Sector distribution (direct stocks only)</p>
                        <div className="space-y-2.5">
                          {sectorBars.map((s, i) => (
                            <div key={s.name}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-[#475569] dark:text-[#CBD5E1]">{s.name}</span>
                                <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">{s.pct.toFixed(1)}%&nbsp;·&nbsp;{formatCurrency(s.value)}</span>
                              </div>
                              <div className="h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-3">* Direct stocks only. Upgrade to Pro to see combined sector exposure including what your MFs hold.</p>
                      </div>
                    ) : (
                      <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-[#E5E7EB] dark:border-[#334155]">
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Sector data not yet available for your direct holdings. Upgrade to Pro to unlock full sector analysis across stocks and MFs.</p>
                      </div>
                    )}

                    <button
                      onClick={() => hasCapability('view_basic_analytics')
                        ? router.push('/analytics/sector-exposure')
                        : setUpgradeModal({ open: true, plan: 'Pro', title: 'Sector Exposure Analysis', description: 'See your combined sector exposure — from direct stocks AND what your mutual funds hold in each sector.', benefits: ['Technology, Banking, FMCG breakdown', 'Direct + MF combined sector exposure', 'Concentration risk flags by sector', 'Rebalancing suggestions'] })}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] transition-colors"
                    >
                      See full sector exposure <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── ETF TAB ── */}
                {activeTab === 'etf' && (
                  <div>
                    <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mb-4">
                      You own <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{etfHoldings.length} ETF{etfHoldings.length !== 1 ? 's' : ''}</span> worth <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(etfTotal)}</span>.
                      ETFs track market indices — inside each one are dozens of stocks following benchmarks like Nifty 50, Sensex, or Nifty Next 50.
                    </p>

                    {/* ETF holdings list */}
                    <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-[#E5E7EB] dark:border-[#334155]">
                      <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Your ETF holdings</p>
                      <div className="space-y-2.5">
                        {etfHoldings.slice(0, 4).map((h, i) => (
                          <div key={h.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#475569] dark:text-[#CBD5E1] truncate mr-2">{h.name}</span>
                              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis flex-shrink-0">{h.allocationPct.toFixed(1)}%&nbsp;·&nbsp;{formatCurrency(h.currentValue)}</span>
                            </div>
                            <div className="h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(h.allocationPct, 100)}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                            </div>
                          </div>
                        ))}
                        {etfHoldings.length > 4 && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] pt-1">+ {etfHoldings.length - 4} more ETF{etfHoldings.length - 4 !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>

                    {/* Estimated index composition */}
                    <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-[#E5E7EB] dark:border-[#334155]">
                      <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Estimated sector mix inside equity ETFs</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Financial Services (BFSI)', approxPct: 33, color: '#2563EB' },
                          { label: 'Information Technology', approxPct: 16, color: '#7C3AED' },
                          { label: 'Oil, Gas & Consumables', approxPct: 12, color: '#F97316' },
                          { label: 'FMCG', approxPct: 9, color: '#10B981' },
                          { label: 'Others', approxPct: 30, color: '#94A3B8' },
                        ].map(row => (
                          <div key={row.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#475569] dark:text-[#CBD5E1]">{row.label}</span>
                              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">~{row.approxPct}%</span>
                            </div>
                            <div className="h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${row.approxPct}%`, background: row.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-3">* Based on Nifty 50 approximate weights. Actual composition depends on which index your ETFs track. Upgrade to Pro for exact breakdown per ETF.</p>
                    </div>

                    <button
                      onClick={() => hasCapability('view_basic_analytics')
                        ? router.push('/analytics/mutualfund-exposure')
                        : setUpgradeModal({ open: true, plan: 'Pro', title: 'ETF & Mutual Fund Exposure Analytics', description: 'See the exact sector, market cap, and geography breakdown of every ETF and mutual fund you hold.', benefits: ['Exact sector composition per ETF', 'Index tracking & overlap detection', 'Market cap breakdown (Large/Mid/Small)', 'Combined ETF + direct stock sector view'] })}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] transition-colors"
                    >
                      See exact ETF composition <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          );
        })()}

        {/* ── SECTION 5: ADVANCED ANALYTICS HUB ───────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-0.5">Advanced Analytics</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-6">Unlock deeper intelligence to make smarter investment decisions</p>

          {/* Premium tier */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Premium</span>
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">— Portfolio Intelligence</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AnalyticsCard
                href="/analytics/health"
                locked={!hasCapability('view_premium_analytics')}
                plan="Premium"
                icon={<TargetIcon className="w-5 h-5 text-[#2563EB]" />}
                iconBg="bg-blue-50 dark:bg-blue-950/20"
                title="Portfolio Health Score"
                teaser="Is your portfolio truly healthy?"
                description="7-pillar assessment covering diversification, concentration, market cap balance, risk structure, and more — with actionable improvements."
                onLock={(e) => handleLockedClick(e, 'Premium', 'Portfolio Health Score',
                  'Get a comprehensive 7-pillar analysis of your portfolio structure, risk balance, and improvement opportunities.',
                  ['7-pillar health assessment', 'Concentration & diversification check', 'Market cap & sector balance', 'Actionable improvement suggestions']
                )}
              />
              <AnalyticsCard
                href="/analytics/stability"
                locked={!hasCapability('view_premium_analytics')}
                plan="Premium"
                icon={<ShieldCheckIcon className="w-5 h-5 text-[#10B981]" />}
                iconBg="bg-emerald-50 dark:bg-emerald-950/20"
                title="Stability & Downside Protection"
                teaser="What happens in a market crash?"
                description="Portfolio resilience score, credit risk, and liquidity analysis to understand how your portfolio holds up during market stress."
                onLock={(e) => handleLockedClick(e, 'Premium', 'Stability & Downside Protection',
                  'Understand how resilient your portfolio is during market stress, rate hikes, and economic downturns.',
                  ['Portfolio stability score', 'Credit risk assessment', 'Liquidity analysis', 'Downside protection rating']
                )}
              />
              <AnalyticsCard
                href="/analytics/scenarios"
                locked={!hasCapability('view_premium_analytics')}
                plan="Premium"
                icon={<ChartIcon className="w-5 h-5 text-[#7C3AED]" />}
                iconBg="bg-purple-50 dark:bg-purple-950/20"
                title="Scenario Impact Analysis"
                teaser="If Nifty drops 30%, you lose ₹___?"
                description="Simulate your portfolio under real scenarios — 2008 crash, COVID sell-off, rate hikes, sector shocks. Know your downside before the market shows you."
                onLock={(e) => handleLockedClick(e, 'Premium', 'Scenario Impact Analysis',
                  'See how your portfolio would perform under market drawdowns, rate shocks, sector crashes, and recovery scenarios.',
                  ['Market drawdown simulation', 'Rate shock & sector shock', 'Recovery projections', 'Portfolio stress testing']
                )}
              />
            </div>
          </div>

          {/* Pro tier */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pro</span>
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">— Exposure Analytics</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnalyticsCard
                href="/analytics/mutualfund-exposure"
                locked={!hasCapability('view_basic_analytics')}
                plan="Pro"
                icon={<LayersIcon className="w-5 h-5 text-[#F97316]" />}
                iconBg="bg-orange-50 dark:bg-orange-950/20"
                title="Mutual Fund Exposure"
                teaser="What's really inside your funds?"
                description="Exact equity, debt, sector & geography breakdown across all your mutual fund holdings — fund by fund."
                onLock={(e) => handleLockedClick(e, 'Pro', 'Mutual Fund Exposure Analytics',
                  'See exactly what your mutual funds are invested in — equity, debt, sector, and geography breakdown.',
                  ['Exact equity vs debt per fund', 'Fund overlap detection', 'Hidden concentration risks', 'Fund-wise detailed breakdown']
                )}
              />
              <AnalyticsCard
                href="/analytics/sector-exposure"
                locked={!hasCapability('view_basic_analytics')}
                plan="Pro"
                icon={<BuildingIcon className="w-5 h-5 text-[#06B6D4]" />}
                iconBg="bg-cyan-50 dark:bg-cyan-950/20"
                title="Sector Exposure"
                teaser="Are you overweight in Banking or IT?"
                description="Combined direct + MF sector exposure with concentration risk flags and rebalancing signals across BFSI, Technology, FMCG, Pharma, and more."
                onLock={(e) => handleLockedClick(e, 'Pro', 'Sector Exposure Analysis',
                  'Discover which sectors your portfolio is concentrated in — directly and via mutual funds.',
                  ['Technology, Banking, FMCG breakdown', 'Direct + MF combined exposure', 'Concentration risk by sector', 'Rebalancing suggestions']
                )}
              />
              <AnalyticsCard
                href="/analytics/marketcap-exposure"
                locked={!hasCapability('view_basic_analytics')}
                plan="Pro"
                icon={<TrendingUpIcon className="w-5 h-5 text-[#10B981]" />}
                iconBg="bg-emerald-50 dark:bg-emerald-950/20"
                title="Market Cap Exposure"
                teaser="Large cap safety vs small cap growth?"
                description="Your large, mid, and small cap balance — direct and via funds — matched against your stated risk profile."
                onLock={(e) => handleLockedClick(e, 'Pro', 'Market Cap Exposure',
                  'Know your large cap vs mid cap vs small cap balance and whether it matches your risk profile.',
                  ['Large, Mid, Small cap breakdown', 'Combined direct + MF exposure', 'Risk level by market cap', 'Balance recommendations']
                )}
              />
              <AnalyticsCard
                href="/analytics/geography-exposure"
                locked={!hasCapability('view_basic_analytics')}
                plan="Pro"
                icon={<GlobeIcon className="w-5 h-5 text-[#6366F1]" />}
                iconBg="bg-indigo-50 dark:bg-indigo-950/20"
                title="Geography Exposure"
                teaser="How much of your portfolio is India vs world?"
                description="Domestic vs international split, currency risk assessment, and global diversification score across your entire portfolio."
                onLock={(e) => handleLockedClick(e, 'Pro', 'Geography Exposure Analysis',
                  'See how much of your portfolio is in India vs international markets.',
                  ['India vs international split', 'Currency risk exposure', 'Domestic concentration check', 'Global diversification score']
                )}
              />
            </div>
          </div>
        </div>

      </main>

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        requiredPlan={upgradeModal.plan}
        featureTitle={upgradeModal.title}
        featureDescription={upgradeModal.description}
        benefits={upgradeModal.benefits}
      />
    </div>
  );
}
