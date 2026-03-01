'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionId =
  | 'dashboard'
  | 'buckets'
  | 'allocation'
  | 'liabilities'
  | 'exposure'
  | 'copilot';

interface Asset {
  name: string;
  type: string;
  value: string;
  change: string;
  changePositive: boolean;
}

interface Bucket {
  id: string;
  name: string;
  pct: string;
  color: string;
  darkColor: string;
  types: string[];
  assets: Asset[];
}

// ---------------------------------------------------------------------------
// Static mock data — no API, no Supabase
// ---------------------------------------------------------------------------

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: '📊' },
  { id: 'buckets', label: 'Asset Buckets', icon: '🪣' },
  { id: 'allocation', label: 'Allocation & Health', icon: '⚖️' },
  { id: 'liabilities', label: 'Liabilities & Protection', icon: '🛡️' },
  { id: 'exposure', label: 'Exposure Analytics', icon: '🔍' },
  { id: 'copilot', label: 'AI Copilot', icon: '✨' },
];

const DEMO_BUCKETS: Bucket[] = [
  {
    id: 'growth',
    name: 'Growth Assets',
    pct: '40%',
    color: 'bg-[#2563EB]',
    darkColor: 'dark:bg-[#3B82F6]',
    types: ['Equity', 'Mutual Funds', 'ETFs'],
    assets: [
      { name: 'HDFC Bank', type: 'Equity', value: '₹4,85,000', change: '+12.3%', changePositive: true },
      { name: 'Nifty 50 Index Fund', type: 'Mutual Fund', value: '₹3,20,000', change: '+18.7%', changePositive: true },
      { name: 'Parag Parikh Flexi Cap', type: 'Mutual Fund', value: '₹2,15,000', change: '+9.2%', changePositive: true },
    ],
  },
  {
    id: 'income',
    name: 'Income & Allocation',
    pct: '30%',
    color: 'bg-[#16A34A]',
    darkColor: 'dark:bg-[#22C55E]',
    types: ['Fixed Deposits', 'PPF', 'Bonds'],
    assets: [
      { name: 'SBI Fixed Deposit', type: 'Fixed Deposit', value: '₹5,00,000', change: '+7.1%', changePositive: true },
      { name: 'Public Provident Fund', type: 'PPF', value: '₹2,40,000', change: '+7.1%', changePositive: true },
    ],
  },
  {
    id: 'real',
    name: 'Real Assets',
    pct: '15%',
    color: 'bg-[#D97706]',
    darkColor: 'dark:bg-[#FBBF24]',
    types: ['Real Estate', 'REITs'],
    assets: [
      { name: 'Mindspace REIT', type: 'REIT', value: '₹1,80,000', change: '+5.4%', changePositive: true },
      { name: 'Embassy REIT', type: 'REIT', value: '₹1,00,000', change: '-2.1%', changePositive: false },
    ],
  },
  {
    id: 'commodities',
    name: 'Commodities',
    pct: '8%',
    color: 'bg-[#9333EA]',
    darkColor: 'dark:bg-[#A855F7]',
    types: ['Gold', 'Silver'],
    assets: [
      { name: 'Sovereign Gold Bond 2029', type: 'Gold', value: '₹1,50,000', change: '+22.8%', changePositive: true },
      { name: 'Digital Silver', type: 'Silver', value: '₹45,000', change: '-1.3%', changePositive: false },
    ],
  },
  {
    id: 'cash',
    name: 'Cash & Liquidity',
    pct: '7%',
    color: 'bg-[#6B7280]',
    darkColor: 'dark:bg-[#94A3B8]',
    types: ['Savings', 'Liquid Funds'],
    assets: [
      { name: 'HDFC Savings Account', type: 'Savings', value: '₹1,20,000', change: '+3.5%', changePositive: true },
      { name: 'Parag Parikh Liquid Fund', type: 'Liquid Fund', value: '₹50,000', change: '+6.8%', changePositive: true },
    ],
  },
];

const HEALTH_PILLARS = [
  'Diversification across asset classes',
  'Liquidity coverage for emergencies',
  'Risk-adjusted return alignment',
  'Insurance adequacy for dependents',
  'Tax efficiency of holdings',
  'Goal-based allocation mapping',
  'Rebalancing discipline over time',
];

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function DemoImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-[#334155]">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={700}
        loading="lazy"
        className="w-full h-auto"
      />
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 md:p-8">
      {children}
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#2563EB] transition-colors mb-4 cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section: Dashboard Overview
// ---------------------------------------------------------------------------

function DashboardSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Dashboard Overview
        </h2>
        <p className="text-[#6B7280] dark:text-[#94A3B8]">
          Your financial command center — everything at a glance.
        </p>
      </div>

      <DemoImage src="/demo/dashboard.webp" alt="Dashboard overview screenshot" />

      <SectionCard>
        <ul className="space-y-3">
          {[
            'Consolidated net worth across all asset classes in one view.',
            'Real-time portfolio valuation with daily change tracking.',
            'AI-generated daily and weekly summaries of your portfolio.',
            'Quick access tiles for your largest holdings.',
            'Insights and alerts surfaced automatically based on your data.',
          ].map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]" />
              <span className="text-[#475569] dark:text-[#CBD5E1] text-sm leading-relaxed">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Asset Buckets  (3-level drill-down)
// ---------------------------------------------------------------------------

function BucketsSection({
  activeBucket,
  setActiveBucket,
  activeAsset,
  setActiveAsset,
}: {
  activeBucket: string | null;
  setActiveBucket: (id: string | null) => void;
  activeAsset: string | null;
  setActiveAsset: (name: string | null) => void;
}) {
  const bucket = activeBucket ? DEMO_BUCKETS.find((b) => b.id === activeBucket) : null;
  const asset = bucket && activeAsset ? bucket.assets.find((a) => a.name === activeAsset) : null;

  // Level 3: Asset detail
  if (bucket && asset) {
    return (
      <div className="space-y-6">
        <BackButton onClick={() => setActiveAsset(null)} label={`Back to ${bucket.name}`} />
        <SectionCard>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {asset.name}
                </h2>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">{asset.type}</p>
              </div>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                asset.changePositive
                  ? 'bg-[#F0FDF4] text-[#16A34A] dark:bg-[#14532D] dark:text-[#22C55E]'
                  : 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D] dark:text-[#EF4444]'
              }`}>
                {asset.change}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#F9FAFB] dark:bg-[#334155]">
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Current Value</p>
                <p className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{asset.value}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#F9FAFB] dark:bg-[#334155]">
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Returns</p>
                <p className={`text-xl font-semibold ${
                  asset.changePositive
                    ? 'text-[#16A34A] dark:text-[#22C55E]'
                    : 'text-[#DC2626] dark:text-[#EF4444]'
                }`}>
                  {asset.change}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                This is sample data for demonstration purposes. Sign up to track your real holdings.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  // Level 2: Assets inside a bucket
  if (bucket) {
    return (
      <div className="space-y-6">
        <BackButton onClick={() => setActiveBucket(null)} label="Back to Buckets" />
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${bucket.color} ${bucket.darkColor}`} />
            <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {bucket.name}
            </h2>
            <span className="text-sm font-semibold text-[#2563EB] dark:text-[#3B82F6]">
              {bucket.pct}
            </span>
          </div>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            {bucket.assets.length} holdings in this bucket
          </p>
        </div>

        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#334155]">
                  <th className="pb-3 text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Name</th>
                  <th className="pb-3 text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Type</th>
                  <th className="pb-3 text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider text-right">Value</th>
                  <th className="pb-3 text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {bucket.assets.map((a) => (
                  <tr
                    key={a.name}
                    onClick={() => setActiveAsset(a.name)}
                    className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] cursor-pointer transition-colors"
                  >
                    <td className="py-4 text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{a.name}</td>
                    <td className="py-4 text-sm text-[#6B7280] dark:text-[#94A3B8]">{a.type}</td>
                    <td className="py-4 text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] text-right">{a.value}</td>
                    <td className={`py-4 text-sm font-medium text-right ${
                      a.changePositive
                        ? 'text-[#16A34A] dark:text-[#22C55E]'
                        : 'text-[#DC2626] dark:text-[#EF4444]'
                    }`}>
                      {a.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    );
  }

  // Level 1: Bucket grid
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Asset Buckets
        </h2>
        <p className="text-[#6B7280] dark:text-[#94A3B8]">
          How your wealth is structured across strategic buckets.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_BUCKETS.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBucket(b.id)}
            className="text-left p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${b.color} ${b.darkColor}`} />
              <span className="text-lg font-semibold text-[#2563EB] dark:text-[#3B82F6]">
                {b.pct}
              </span>
            </div>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              {b.name}
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              {b.types.join(' · ')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Allocation & Health
// ---------------------------------------------------------------------------

function AllocationSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Allocation & Health
        </h2>
        <p className="text-[#6B7280] dark:text-[#94A3B8]">
          Understand how balanced and healthy your portfolio really is.
        </p>
      </div>

      <DemoImage src="/demo/allocation.webp" alt="Portfolio allocation chart" />
      <DemoImage src="/demo/health-score.webp" alt="Portfolio health score" />

      <SectionCard>
        <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
          7 Health Pillars
        </h3>
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-5">
          Your portfolio health score is computed across these seven dimensions:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HEALTH_PILLARS.map((pillar, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB] dark:bg-[#334155]"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">{pillar}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Liabilities & Protection
// ---------------------------------------------------------------------------

function LiabilitiesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Liabilities & Protection
        </h2>
        <p className="text-[#6B7280] dark:text-[#94A3B8]">
          Track what you owe and how well you&apos;re protected.
        </p>
      </div>

      <DemoImage src="/demo/insurance.webp" alt="Insurance and liabilities overview" />

      <SectionCard>
        <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
          Why this matters
        </h3>
        <div className="space-y-3 text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            Your net worth isn&apos;t just what you own — it&apos;s what you own minus what you owe.
            LensOnWealth tracks liabilities like loans and EMIs alongside your assets to give you a
            true picture of financial health.
          </p>
          <p>
            The protection layer evaluates whether your insurance coverage (life, health, and
            general) is adequate relative to your dependents, income, and lifestyle. Gaps are
            flagged so you can act before they become risks.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Exposure Analytics
// ---------------------------------------------------------------------------

function ExposureSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Exposure Analytics
        </h2>
        <p className="text-[#6B7280] dark:text-[#94A3B8]">
          Go beyond holdings — understand what you&apos;re truly exposed to.
        </p>
      </div>

      <DemoImage src="/demo/analytics.webp" alt="Exposure analytics dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 bg-[#EFF6FF] dark:bg-[#1E3A8A]">
          <p className="text-sm font-semibold text-[#2563EB] dark:text-[#93C5FD] mb-1 uppercase tracking-wide">
            Dashboard
          </p>
          <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            What you{' '}
            <span className="underline decoration-[#2563EB] dark:decoration-[#3B82F6] decoration-2 underline-offset-4">
              OWN
            </span>
          </p>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-2">
            Direct holdings, NAVs, and balances across accounts.
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 bg-[#F0FDF4] dark:bg-[#14532D]">
          <p className="text-sm font-semibold text-[#16A34A] dark:text-[#86EFAC] mb-1 uppercase tracking-wide">
            Analytics
          </p>
          <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            What you&apos;re{' '}
            <span className="underline decoration-[#16A34A] dark:decoration-[#22C55E] decoration-2 underline-offset-4">
              EXPOSED TO
            </span>
          </p>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-2">
            Sector, geography, and market-cap breakdowns across all instruments.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: AI Copilot
// ---------------------------------------------------------------------------

function CopilotSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          AI Copilot
        </h2>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white">
          Premium
        </span>
      </div>
      <p className="text-[#6B7280] dark:text-[#94A3B8]">
        Ask questions about your portfolio in plain English. Get answers backed by your data.
      </p>

      <DemoImage src="/demo/copilot.webp" alt="AI Copilot interface" />

      <SectionCard>
        <ul className="space-y-3">
          {[
            'Daily and weekly AI-generated portfolio summaries.',
            'Natural-language Q&A — "Am I over-exposed to IT?"',
            'Actionable recommendations based on your real holdings.',
            'Context-aware insights that evolve as your portfolio changes.',
          ].map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#7C3AED] dark:bg-[#A855F7]" />
              <span className="text-[#475569] dark:text-[#CBD5E1] text-sm leading-relaxed">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DemoPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<string | null>(null);

  const handleSectionChange = (id: SectionId) => {
    setActiveSection(id);
    setActiveBucket(null);
    setActiveAsset(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'buckets':
        return (
          <BucketsSection
            activeBucket={activeBucket}
            setActiveBucket={(id) => { setActiveBucket(id); setActiveAsset(null); }}
            activeAsset={activeAsset}
            setActiveAsset={setActiveAsset}
          />
        );
      case 'allocation':
        return <AllocationSection />;
      case 'liabilities':
        return <LiabilitiesSection />;
      case 'exposure':
        return <ExposureSection />;
      case 'copilot':
        return <CopilotSection />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader isDemoMode />

      <div className="max-w-[1280px] mx-auto px-6 py-8 pt-24">
        <div className="flex gap-8">
          {/* Sidebar — desktop */}
          <nav className="hidden md:block w-[260px] flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-4 px-3">
                Explore
              </p>

              <ul className="space-y-1">
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => handleSectionChange(section.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white'
                            : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F9FAFB] dark:hover:bg-[#334155]'
                        }`}
                      >
                        <span className="mr-2">{section.icon}</span>
                        {section.label}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* CTA box */}
              <div className="mt-8 p-4 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#BFDBFE] dark:border-[#1E40AF]">
                <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Ready to track your own portfolio?
                </p>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mb-3">
                  Upload your real holdings and get personalized insights.
                </p>
                <div className="space-y-2">
                  <Link
                    href="/signup"
                    className="block w-full text-center px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                  >
                    Create Free Account
                  </Link>
                  <Link
                    href="/upgrade"
                    className="block w-full text-center px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1] text-sm font-medium rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile section selector */}
          <div className="md:hidden w-full mb-6">
            <select
              value={activeSection}
              onChange={(e) => handleSectionChange(e.target.value as SectionId)}
              className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm font-medium"
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.icon} {section.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content panel */}
          <main className="flex-1 min-w-0">
            <div
              key={`${activeSection}-${activeBucket}-${activeAsset}`}
              className="animate-[fadeIn_0.2s_ease-in-out]"
            >
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
