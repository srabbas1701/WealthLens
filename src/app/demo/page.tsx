'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';

function SparkleIcon({ size = '1em', isActive = false }: { size?: string; isActive?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const keyframes: Keyframe[] = [
      { transform: 'scale(1)',   color: '#2563EB' },
      { transform: 'scale(1.6)', color: '#FBBF24' },
      { transform: 'scale(0.8)', color: '#F59E0B' },
      { transform: 'scale(2.0)', color: '#FBBF24' },
      { transform: 'scale(0.9)', color: '#F59E0B' },
      { transform: 'scale(1.3)', color: '#2563EB' },
      { transform: 'scale(1)',   color: '#2563EB' },
    ];
    const options: KeyframeAnimationOptions = {
      duration: 1600,
      iterations: 1,
      fill: 'none',
      easing: 'ease-in-out',
    };

    let current: Animation | null = null;
    const play = () => {
      if (document.hidden) return;
      current?.cancel();
      current = el.animate(keyframes, options);
    };

    const initTimer = setTimeout(play, 500);
    const interval = setInterval(play, 7000);
    const onVisibilityChange = () => { if (!document.hidden) play(); };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      current?.cancel();
    };
  }, []);

  return (
    <span ref={ref} style={{ display: 'inline-block', color: isActive ? '#FCD34D' : '#6366F1', fontSize: size }}>✦</span>
  );
}

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
  'allocation':           '/demo/manageportfolio.webp',
  'liabilities':          '/demo/healthscore.webp',
  'exposure':             '/demo/portfolio_analytics.webp',
  'copilot':              '/demo/ai_analysis_1.webp',
};

// ---------------------------------------------------------------------------
// Top nav
// ---------------------------------------------------------------------------

const NAV_ITEMS: { id: DemoState; label: string; icon: string | null }[] = [
  { id: 'dashboard',    label: 'Dashboard Overview',      icon: '📊' },
  { id: 'asset-buckets',label: 'Asset Buckets',           icon: '🪣' },
  { id: 'allocation',   label: 'Build Portfolio',          icon: '⚖️' },
  { id: 'liabilities',  label: 'Liabilities & Protection',icon: '🛡️' },
  { id: 'exposure',     label: 'Exposure Analytics',      icon: '🔍' },
  { id: 'copilot',      label: 'AI Naira',                icon: null },
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
// Page info cards
// ---------------------------------------------------------------------------

interface PageInfo {
  title: string;
  description: string;
  clickHint?: string;
}

function getPageInfo(state: DemoState): PageInfo {
  switch (state) {
    case 'dashboard':
      return {
        title: 'Dashboard Overview',
        description: 'Your complete financial command centre. See your consolidated net worth across every asset class — stocks, mutual funds, EPF, PPF, NPS, fixed deposits, real estate, gold, and more — all in one place. AI-generated summaries surface key insights and alerts automatically so you never miss what matters.',
        clickHint: 'Click "Asset Buckets" in the nav above to explore how your wealth is structured.',
      };
    case 'asset-buckets':
      return {
        title: 'Asset Buckets',
        description: 'LensOnWealth organises your entire portfolio into five strategic buckets — Real Assets, Income & Allocation, Growth Assets, Commodities, and Cash & Liquidity. Each bucket shows its share of your total wealth and the holdings inside it, giving you an instant picture of balance and concentration.',
        clickHint: '👆 Each tile is clickable — try: Real Assets (property & REITs) · Income & Allocation (EPF, NPS, PPF, FDs, Bonds) · Growth Assets (Stocks, Mutual Funds, ETFs) · Commodities (Gold) · Cash & Liquidity (savings & liquid funds).',
      };
    case 'real-summary':
      return {
        title: 'Real Assets Portfolio Summary',
        description: 'Track all your real-world assets — property, REITs, and land — in one view. See total invested value, unrealised gains, and each property\'s contribution to your portfolio. Prices are updated from transaction history so your net worth always reflects current valuations.',
        clickHint: '👆 Click the Real Estate row above to view individual property details.',
      };
    case 'real-estate-detail':
      return {
        title: 'Real Estate Holdings',
        description: 'A granular view of every property in your portfolio — purchase price, current estimated value, unrealised gain/loss, and percentage allocation. Add new properties, update valuations, and track appreciation over time all from one screen.',
      };
    case 'income-summary':
      return {
        title: 'Income & Allocation Portfolio Summary',
        description: 'All your fixed-income and retirement instruments — EPF, NPS, PPF, Fixed Deposits, and Bonds — consolidated into a single summary. Monitor total invested value, interest earned, and how each instrument contributes to your overall income layer.',
        clickHint: '👆 Click any row above (EPF, NPS, PPF, Fixed Deposits, Bonds) to see its detailed holdings.',
      };
    case 'epf-detail':
      return {
        title: 'EPF Holdings',
        description: 'View your Employee Provident Fund balance, contribution history, and projected maturity value. LensOnWealth tracks both employee and employer contributions and factors EPF into your overall retirement readiness score.',
      };
    case 'nps-detail':
      return {
        title: 'NPS Holdings',
        description: 'Your National Pension System account summary — current corpus value, asset allocation across equity, corporate bonds, and government securities, and projected pension at retirement. Stay on top of your NPS Tier I and Tier II balances effortlessly.',
      };
    case 'ppf-detail':
      return {
        title: 'PPF Holdings',
        description: 'Track your Public Provident Fund across multiple accounts. See current balance, annual contribution limits, lock-in period, and projected maturity amount — helping you plan partial withdrawals and loan eligibility well in advance.',
      };
    case 'fixeddeposits-detail':
      return {
        title: 'Fixed Deposit Holdings',
        description: 'All your fixed deposits in one place — principal, interest rate, maturity date, and accrued interest. Get alerts before maturity so you can reinvest on time and never let a deposit auto-renew at an unfavourable rate.',
      };
    case 'bonds-detail':
      return {
        title: 'Bonds Holdings',
        description: 'Corporate bonds, sovereign gold bonds, and government securities tracked with face value, coupon rate, and current market price. Monitor yield-to-maturity and upcoming interest payment dates without switching between multiple platforms.',
      };
    case 'growth-summary':
      return {
        title: 'Growth Assets Portfolio Summary',
        description: 'Your equity layer — stocks, mutual funds, and ETFs — summarised with total invested value, current market value, and overall P&L. Benchmark your growth portfolio against indices and spot concentration risks at a glance.',
        clickHint: '👆 Click any row above (Stocks, Mutual Funds, ETFs) to explore individual holdings.',
      };
    case 'growth-stocks-detail':
      return {
        title: 'Stocks Holdings',
        description: 'Every equity holding with average buy price, current market price, unrealised P&L, and portfolio allocation. Group by company or sector to understand where your equity exposure is concentrated and identify rebalancing opportunities.',
      };
    case 'growth-mf-detail':
      return {
        title: 'Mutual Fund Holdings',
        description: 'All mutual fund investments across direct and regular plans, with NAV, units held, invested amount, and current value. Upload your CAS statement and LensOnWealth automatically maps every scheme — no manual entry needed.',
      };
    case 'growth-etfs-detail':
      return {
        title: 'ETF Holdings',
        description: 'Exchange-traded funds tracked with live market prices, expense ratios, and total return since purchase. Compare your ETF allocation across index, sector, and thematic funds to ensure your passive strategy stays on track.',
      };
    case 'commodities-summary':
      return {
        title: 'Commodities Portfolio Summary',
        description: 'Your commodities layer — primarily gold — tracked by weight, purchase price, current market value, and long-term appreciation. Sovereign gold bonds, digital gold, and physical gold are all aggregated into one unified view.',
        clickHint: '👆 Click the Gold row above to see individual holdings and lot-wise details.',
      };
    case 'gold-detail':
      return {
        title: 'Gold Holdings',
        description: 'Lot-wise gold holdings — sovereign gold bond series, digital gold units, and physical gold — each with purchase date, quantity, buy price, and current value. Track interest income from SGBs alongside price appreciation for a complete total-return picture.',
      };
    case 'cash-summary':
      return {
        title: 'Cash & Liquidity Portfolio Summary',
        description: 'Savings accounts, liquid funds, and other near-cash instruments consolidated in one view. Monitor your liquidity buffer, ensure you hold adequate emergency reserves, and identify idle cash that could be put to work.',
        clickHint: '👆 Click the Cash row above to see individual account and liquid fund balances.',
      };
    case 'cash-detail':
      return {
        title: 'Cash Holdings',
        description: 'Account-level breakdown of your cash and liquid assets — bank savings accounts, liquid mutual funds, and short-term FDs maturing within 90 days. Know exactly how much you can access within 24 hours at any point in time.',
      };
    case 'allocation':
      return {
        title: 'Build Your Portfolio',
        description: 'Getting started with LensOnWealth takes minutes. Upload your CAS statement or broker export to auto-import all holdings, or add investments manually. Record liabilities like home loans to get your true net worth. Everything is encrypted — your data never leaves your control.',
        clickHint: 'Scroll down to see each step — Manage Portfolio, Upload Documents, Add Holdings, and Add Liability.',
      };
    case 'liabilities':
      return {
        title: 'Liabilities & Protection',
        description: 'True net worth is assets minus liabilities. LensOnWealth tracks all your outstanding loans — home, car, personal, and credit cards — alongside insurance coverage. Your portfolio health score factors in debt levels and insurance adequacy to give you a genuinely complete financial picture.',
        clickHint: 'Scroll down to see your full Liabilities & Protection summary below.',
      };
    case 'exposure':
      return {
        title: 'Exposure Analytics',
        description: 'Go beyond holdings to understand what you are truly exposed to. Analyse your portfolio by sector (IT, banking, pharma), market cap (large, mid, small), and geography (India, US, global). Mutual fund look-through breaks every scheme into its underlying stocks so you see real concentration — not just fund names.',
      };
    case 'copilot':
      return {
        title: 'AI Naira',
        description: 'Ask plain-English questions about your portfolio and get answers grounded in your actual data. "Am I over-exposed to IT?", "Which holdings are dragging returns?", "How should I rebalance?" — Naira, your AI Portfolio Analyst, analyses your real holdings and gives actionable, personalised guidance. Available on Premium and Pro plans.',
        clickHint: 'Scroll down to see AI analysis examples powered by your real portfolio data.',
      };
  }
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
          {/* gradient band wrapping the pill row */}
          <div className="hidden md:block rounded-2xl p-[3px] bg-gradient-to-r from-[#6366F1] via-[#2563EB] to-[#0EA5E9] shadow-lg shadow-blue-500/20">
            <ul className="flex items-center gap-1 bg-white dark:bg-[#0F172A] rounded-[13px] px-2 py-2">
              {NAV_ITEMS.map((item) => {
                const isActive = navActive === item.id;
                return (
                  <li key={item.id} className="flex-1">
                    <button
                      onClick={() => transition(item.id)}
                      className={`w-full text-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-r from-[#6366F1] via-[#2563EB] to-[#0EA5E9] text-white shadow-md shadow-blue-500/30'
                          : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
                      }`}
                    >
                      {item.id === 'copilot' ? (
                        <span className="inline-flex items-center gap-2">
                          <SparkleIcon size="1.1em" isActive={isActive} />
                          <span>AI N<span style={{ color: isActive ? '#FCD34D' : '#6366F1' }}>ai</span>ra</span>
                        </span>
                      ) : (
                        <><span className="mr-1.5">{item.icon}</span>{item.label}</>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

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
          {/* AI Naira: two images stacked */}
          {demoState === 'copilot' ? (
            <div className="flex flex-col gap-4">
              {['ai_analysis_1.webp', 'ai_analysis_2.webp'].map((img) => (
                <Image
                  key={img}
                  src={`/demo/${img}`}
                  alt={img}
                  width={1600}
                  height={1000}
                  className="w-full h-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm"
                  unoptimized
                />
              ))}
            </div>
          ) : /* Build Portfolio: four images stacked */
          demoState === 'allocation' ? (
            <div className="flex flex-col gap-4">
              {['manageportfolio.webp', 'uploadportfolio.webp', 'add_holdings.webp', 'add_liability.webp'].map((img) => (
                <Image
                  key={img}
                  src={`/demo/${img}`}
                  alt={img}
                  width={1600}
                  height={1000}
                  className="w-full h-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm"
                  unoptimized
                />
              ))}
            </div>
          ) : /* Liabilities & Protection: two images stacked */
          demoState === 'liabilities' ? (
            <div className="flex flex-col gap-4">
              <Image
                src="/demo/healthscore.webp"
                alt="Portfolio Health Score"
                width={1600}
                height={1000}
                className="w-full h-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm"
                priority
                unoptimized
              />
              <Image
                src="/demo/liabilitiesprotection.webp"
                alt="Liabilities & Protection"
                width={1600}
                height={1000}
                className="w-full h-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm"
                unoptimized
              />
            </div>
          ) : (
          <Image
            src={demoImages[demoState]}
            alt="Demo Screen"
            width={1600}
            height={1000}
            className="w-full h-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm"
            priority
            unoptimized
          />
          )}

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

        {/* ── Page Info Card ── (hidden on dashboard — self-explanatory) */}
        {demoState !== 'dashboard' && (() => {
          const info = getPageInfo(demoState);
          return (
            <div className="mt-6 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A]/60 px-5 py-4 space-y-2">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                {info.title}
              </h3>
              <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                {info.description}
              </p>
              {info.clickHint && (
                <p className="text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1.5 pt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#60A5FA] flex-shrink-0" />
                  {info.clickHint}
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
