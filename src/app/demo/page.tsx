'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DemoState =
  | 'dashboard'
  | 'asset-buckets'
  | 'real-summary'
  | 'real-estate-detail'
  | 'income-summary'
  | 'epf-detail'
  | 'nps-detail'
  | 'ppf-detail'
  | 'fixeddeposits-detail'
  | 'bonds-detail'
  | 'growth-summary'
  | 'growth-stocks-detail'
  | 'growth-mf-detail'
  | 'growth-etfs-detail'
  | 'commodities-summary'
  | 'gold-detail'
  | 'cash-summary'
  | 'cash-detail'
  | 'allocation'
  | 'liabilities'
  | 'exposure'
  | 'copilot';

// ---------------------------------------------------------------------------
// Image mapping
// ---------------------------------------------------------------------------

const demoImages: Record<DemoState, string> = {
  'dashboard':            '/demo/dashboard_overview.webp',
  'asset-buckets':        '/demo/asset_buckets.webp',
  'real-summary':         '/demo/realassets_summary.webp',
  'real-estate-detail':   '/demo/realestatepage.webp',
  'income-summary':       '/demo/incomeallocation_summary.webp',
  'epf-detail':           '/demo/epf_holding.webp',
  'nps-detail':           '/demo/nps_holding.webp',
  'ppf-detail':           '/demo/ppf_holding.webp',
  'fixeddeposits-detail': '/demo/fixeddeposits_holding.webp',
  'bonds-detail':         '/demo/bonds_holding.webp',
  'growth-summary':       '/demo/growth_summary.webp',
  'growth-stocks-detail': '/demo/growth_stocks.webp',
  'growth-mf-detail':     '/demo/growth_mutualfunds.webp',
  'growth-etfs-detail':   '/demo/growth_etfs.webp',
  'commodities-summary':  '/demo/commodities_summary.webp',
  'gold-detail':          '/demo/gold_holdings.webp',
  'cash-summary':         '/demo/cash_summary.webp',
  'cash-detail':          '/demo/cash_holdings.webp',
  // nav-level placeholders — images wired up section by section
  'allocation':           '/demo/dashboard_overview.webp',
  'liabilities':          '/demo/dashboard_overview.webp',
  'exposure':             '/demo/dashboard_overview.webp',
  'copilot':              '/demo/dashboard_overview.webp',
};

// ---------------------------------------------------------------------------
// Top nav
// ---------------------------------------------------------------------------

const NAV_ITEMS: { id: DemoState; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard Overview',      icon: '📊' },
  { id: 'asset-buckets',label: 'Asset Buckets',           icon: '🪣' },
  { id: 'allocation',   label: 'Allocation & Health',     icon: '⚖️' },
  { id: 'liabilities',  label: 'Liabilities & Protection',icon: '🛡️' },
  { id: 'exposure',     label: 'Exposure Analytics',      icon: '🔍' },
  { id: 'copilot',      label: 'AI Copilot',              icon: '✨' },
];

// All sub-states that live under "Asset Buckets"
const BUCKET_SUBSTATES: DemoState[] = [
  'real-summary',
  'real-estate-detail',
  'income-summary',
  'epf-detail',
  'nps-detail',
  'ppf-detail',
  'fixeddeposits-detail',
  'bonds-detail',
  'growth-summary',
  'growth-stocks-detail',
  'growth-mf-detail',
  'growth-etfs-detail',
  'commodities-summary',
  'gold-detail',
  'cash-detail',
  'cash-summary',
];

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

type BreadcrumbItem = { label: string; state: DemoState };

const BUCKET_LABELS: Partial<Record<DemoState, string>> = {
  'real-summary':        'Real Assets',
  'real-estate-detail':  'Real Estate',
  'income-summary':      'Income & Allocation',
  'epf-detail':          'EPF',
  'nps-detail':          'NPS',
  'ppf-detail':          'PPF',
  'fixeddeposits-detail':'Fixed Deposits',
  'bonds-detail':        'Bonds',
  'growth-summary':       'Growth Assets',
  'growth-stocks-detail': 'Stocks',
  'growth-mf-detail':     'Mutual Funds',
  'growth-etfs-detail':   'ETFs',
  'commodities-summary':  'Commodities',
  'gold-detail':          'Gold',
  'cash-detail':          'Cash',
  'cash-summary':        'Cash & Liquidity',
};

// Income & Allocation detail states
const INCOME_DETAILS: DemoState[] = [
  'epf-detail', 'nps-detail', 'ppf-detail', 'fixeddeposits-detail', 'bonds-detail',
];

// Growth Assets detail states
const GROWTH_DETAILS: DemoState[] = [
  'growth-stocks-detail', 'growth-mf-detail', 'growth-etfs-detail',
];

function getBreadcrumbs(state: DemoState): BreadcrumbItem[] {
  if (state === 'real-estate-detail') {
    return [
      { label: 'Asset Buckets', state: 'asset-buckets' },
      { label: 'Real Assets',   state: 'real-summary'  },
      { label: 'Real Estate',   state: 'real-estate-detail' },
    ];
  }
  if (INCOME_DETAILS.includes(state)) {
    return [
      { label: 'Asset Buckets',       state: 'asset-buckets'  },
      { label: 'Income & Allocation', state: 'income-summary' },
      { label: BUCKET_LABELS[state] ?? state, state },
    ];
  }
  if (GROWTH_DETAILS.includes(state)) {
    return [
      { label: 'Asset Buckets',  state: 'asset-buckets'  },
      { label: 'Growth Assets',  state: 'growth-summary' },
      { label: BUCKET_LABELS[state] ?? state, state },
    ];
  }
  if (state === 'gold-detail') {
    return [
      { label: 'Asset Buckets', state: 'asset-buckets'      },
      { label: 'Commodities',   state: 'commodities-summary' },
      { label: 'Gold',          state: 'gold-detail'         },
    ];
  }
  if (state === 'cash-detail') {
    return [
      { label: 'Asset Buckets',   state: 'asset-buckets' },
      { label: 'Cash & Liquidity', state: 'cash-summary' },
      { label: 'Cash',             state: 'cash-detail'  },
    ];
  }
  if (BUCKET_SUBSTATES.includes(state)) {
    return [
      { label: 'Asset Buckets', state: 'asset-buckets' },
      { label: BUCKET_LABELS[state] ?? state, state },
    ];
  }
  return [];
}

function getNavActiveId(state: DemoState): DemoState {
  if (BUCKET_SUBSTATES.includes(state)) return 'asset-buckets';
  return state;
}

// ---------------------------------------------------------------------------
// Hint text
// ---------------------------------------------------------------------------

function getHint(state: DemoState): string {
  if (state === 'asset-buckets')        return '👆 Click any bucket tile to explore its holdings';
  if (state === 'real-summary')         return '👆 Click the Real Estate row to see the detail page';
  if (state === 'income-summary')       return '👆 Click any row to view its holdings detail';
  if (state === 'growth-summary')       return '👆 Click any row to view its holdings detail';
  if (GROWTH_DETAILS.includes(state))   return 'Use the breadcrumb above to navigate back';
  if (state === 'commodities-summary')  return '👆 Click the Gold row to view its holdings';
  if (state === 'gold-detail')          return 'Use the breadcrumb above to navigate back';
  if (state === 'cash-summary')         return '👆 Click the Cash row to view its holdings';
  if (state === 'cash-detail')          return 'Use the breadcrumb above to navigate back';
  if (INCOME_DETAILS.includes(state))   return 'Use the breadcrumb above to navigate back';
  if (state === 'real-estate-detail')   return 'Use the breadcrumb above to navigate back';
  if (BUCKET_SUBSTATES.includes(state)) return 'Use the breadcrumb above to go back to Asset Buckets';
  if (state === 'dashboard')            return 'Select a section above to explore';
  return 'Use the nav above to switch sections';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DemoPage() {
  const [demoState, setDemoState] = useState<DemoState>('dashboard');
  const [visible, setVisible] = useState(true);

  const transition = (next: DemoState) => {
    if (next === demoState) return;
    setVisible(false);
    setTimeout(() => {
      setDemoState(next);
      setVisible(true);
    }, 150);
  };

  const breadcrumbs = getBreadcrumbs(demoState);
  const navActive   = getNavActiveId(demoState);

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader isDemoMode />

      <div className="max-w-[1280px] mx-auto px-6 pt-24 pb-8">

        {/* ── Top horizontal nav ── */}
        <nav className="mb-4">
          <ul className="hidden md:flex items-center gap-1 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xl px-2 py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = navActive === item.id;
              return (
                <li key={item.id} className="flex-1">
                  <button
                    onClick={() => transition(item.id)}
                    className={`w-full text-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white'
                        : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <select
            value={navActive}
            onChange={(e) => transition(e.target.value as DemoState)}
            className="md:hidden w-full px-4 py-3 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icon} {item.label}
              </option>
            ))}
          </select>
        </nav>

        {/* ── Breadcrumb ── */}
        {breadcrumbs.length > 0 && (
          <nav
            className="flex items-center gap-1.5 text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={crumb.state} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <svg
                      className="w-3.5 h-3.5 text-[#94A3B8]"
                      fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {isLast ? (
                    <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => transition(crumb.state)}
                      className="hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* ── Image panel ── */}
        <div
          className="relative w-full"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.15s ease-in-out',
          }}
        >
          <Image
            src={demoImages[demoState]}
            alt="Demo Screen"
            width={1600}
            height={1000}
            className="w-full h-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm"
            priority
            unoptimized
          />

          {/* ── Real Summary: click Real Estate row → detail ── */}
          {demoState === 'real-summary' && (
            <div
              className="absolute cursor-pointer hover:bg-white/5 transition-colors"
              style={{ top: '63%', left: '3.5%', width: '93%', height: '14%' }}
              title="View Real Estate detail"
              onClick={() => transition('real-estate-detail')}
            />
          )}

          {/* ── Income Summary: 5 clickable rows ── */}
          {demoState === 'income-summary' && (
            <>
              {/* Row 1 — EPF */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '37%', left: '3.5%', width: '93%', height: '8%' }}
                title="EPF Holdings"
                onClick={() => transition('epf-detail')}
              />
              {/* Row 2 — NPS */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '47%', left: '3.5%', width: '93%', height: '8%' }}
                title="NPS Holdings"
                onClick={() => transition('nps-detail')}
              />
              {/* Row 3 — PPF */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '57%', left: '3.5%', width: '93%', height: '8%' }}
                title="PPF Holdings"
                onClick={() => transition('ppf-detail')}
              />
              {/* Row 4 — Fixed Deposits */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '67%', left: '3.5%', width: '93%', height: '8%' }}
                title="Fixed Deposits"
                onClick={() => transition('fixeddeposits-detail')}
              />
              {/* Row 5 — Bonds */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '77%', left: '3.5%', width: '93%', height: '8%' }}
                title="Bonds Holdings"
                onClick={() => transition('bonds-detail')}
              />
            </>
          )}

          {/* ── Cash Summary: Cash row ── */}
          {demoState === 'cash-summary' && (
            <div
              className="absolute cursor-pointer hover:bg-white/5 transition-colors"
              style={{ top: '64%', left: '3.5%', width: '93%', height: '10%' }}
              title="Cash Holdings"
              onClick={() => transition('cash-detail')}
            />
          )}

          {/* ── Commodities Summary: Gold row ── */}
          {demoState === 'commodities-summary' && (
            <div
              className="absolute cursor-pointer hover:bg-white/5 transition-colors"
              style={{ top: '63%', left: '3.5%', width: '93%', height: '10%' }}
              title="Gold Holdings"
              onClick={() => transition('gold-detail')}
            />
          )}

          {/* ── Growth Summary: 3 clickable rows ── */}
          {demoState === 'growth-summary' && (
            <>
              {/* Row 1 — Stocks */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '48%', left: '3.5%', width: '93%', height: '8%' }}
                title="Stocks Holdings"
                onClick={() => transition('growth-stocks-detail')}
              />
              {/* Row 2 — Mutual Funds */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '60%', left: '3.5%', width: '93%', height: '8%' }}
                title="Mutual Funds Holdings"
                onClick={() => transition('growth-mf-detail')}
              />
              {/* Row 3 — ETFs */}
              <div
                className="absolute cursor-pointer hover:bg-white/5 transition-colors"
                style={{ top: '72%', left: '3.5%', width: '93%', height: '8%' }}
                title="ETF Holdings"
                onClick={() => transition('growth-etfs-detail')}
              />
            </>
          )}

          {/* ── Asset Buckets: 5-column tile overlay ── */}
          {demoState === 'asset-buckets' && (
            <div
              className="absolute inset-x-0 grid grid-cols-5 gap-6 px-10"
              style={{ top: '15%', height: '30%' }}
            >
              <div
                className="cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
                title="Real Assets"
                onClick={() => transition('real-summary')}
              />
              <div
                className="cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
                title="Income & Allocation"
                onClick={() => transition('income-summary')}
              />
              <div
                className="cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
                title="Growth Assets"
                onClick={() => transition('growth-summary')}
              />
              <div
                className="cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
                title="Commodities"
                onClick={() => transition('commodities-summary')}
              />
              <div
                className="cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
                title="Cash & Liquidity"
                onClick={() => transition('cash-summary')}
              />
            </div>
          )}
        </div>

        {/* ── Hint ── */}
        <p className="text-xs text-[#94A3B8] dark:text-[#64748B] text-center mt-3">
          {getHint(demoState)}
        </p>
      </div>
    </div>
  );
}
