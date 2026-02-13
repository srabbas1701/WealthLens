'use client';

/**
 * Add Holding Hub Page
 *
 * Asset type selector - navigate to the appropriate add flow for each asset type.
 * MF, Stocks, ETFs have dedicated add pages. Others link to their list pages.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';

interface AssetOption {
  id: string;
  label: string;
  description: string;
  href: string;
}

const ASSET_OPTIONS: AssetOption[] = [
  { id: 'mutual_fund', label: 'Mutual Funds', description: 'Funds, SIPs, folios', href: '/portfolio/mutualfunds/add' },
  { id: 'stocks', label: 'Stocks / Shares', description: 'Equity, direct stocks', href: '/portfolio/stocks/add' },
  { id: 'etf', label: 'ETFs', description: 'Exchange traded funds', href: '/portfolio/etfs/add' },
  { id: 'fd', label: 'Fixed Deposit', description: 'Bank FD, corporate FD', href: '/portfolio/fixeddeposits' },
  { id: 'bond', label: 'Bond', description: 'Government, corporate bonds', href: '/portfolio/bonds' },
  { id: 'gold', label: 'Gold', description: 'SGB, physical, ETF', href: '/portfolio/gold' },
  { id: 'cash', label: 'Cash', description: 'Savings, current account', href: '/portfolio/cash' },
  { id: 'epf', label: 'EPF', description: 'Employee Provident Fund', href: '/portfolio/epf' },
  { id: 'ppf', label: 'PPF', description: 'Public Provident Fund', href: '/portfolio/ppf' },
  { id: 'nps', label: 'NPS', description: 'National Pension System', href: '/portfolio/nps' },
  { id: 'real_estate', label: 'Real Estate', description: 'Residential, commercial, land', href: '/portfolio/real-estate' },
];

function AddHoldingHubContent() {
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams?.get('from') === 'onboarding';

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader
        showBackButton={true}
        backHref={fromOnboarding ? '/onboarding' : '/dashboard'}
        backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
      />

      <main className="max-w-2xl mx-auto px-6 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Add Holding
          </h1>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Choose the type of investment you want to add
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ASSET_OPTIONS.map((option) => (
            <Link
              key={option.id}
              href={option.href}
              className="block p-4 rounded-lg border-2 border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all text-left"
            >
              <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC] text-sm">
                {option.label}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                {option.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function AddHoldingHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="animate-pulse text-[#6B7280] dark:text-[#94A3B8] text-sm">Loading...</div>
      </div>
    }>
      <AddHoldingHubContent />
    </Suspense>
  );
}
