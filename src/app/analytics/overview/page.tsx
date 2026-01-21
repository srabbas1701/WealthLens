/**
 * Analytics Overview Page
 * 
 * Entry point for advanced exposure analytics.
 * Explains the difference between ownership and exposure.
 * Provides quick links to all analytics screens.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
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

interface PortfolioOwnership {
  equity: number;
  mutualFunds: number;
  fixedDeposits: number;
  others: number;
  total: number;
}

interface ExposureData {
  equityViaMF: number;
  debtViaMF: number;
  otherViaMF: number;
  totalEquityExposure: number;
}

export default function AnalyticsOverviewPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [ownership, setOwnership] = useState<PortfolioOwnership | null>(null);
  const [exposure, setExposure] = useState<ExposureData | null>(null);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Fetch portfolio data
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          
          // Calculate ownership from allocation
          // Use new classification system: allocation is by top-level buckets
          // Growth Assets = Equity, Income & Allocation = Fixed Income + Hybrid
          const growthAllocation = portfolioData.allocation.find((a: any) => a.name === 'Growth Assets');
          const incomeAllocation = portfolioData.allocation.find((a: any) => a.name === 'Income & Allocation');
          
          // For analytics, we need to separate direct equity from MF equity exposure
          // Direct equity holdings
          const directEquityHoldings = portfolioData.holdings.filter((h: any) => 
            h.assetType === 'Stocks' || h.assetType === 'Equity'
          );
          const equityOwnership = directEquityHoldings.reduce((sum: number, h: any) => 
            sum + (h.currentValue || h.investedValue), 0
          );
          
          // MF holdings (from Growth bucket or IncomeAllocation bucket)
          const mfHoldings = portfolioData.holdings.filter((h: any) => 
            h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds'
          );
          const mfOwnership = mfHoldings.reduce((sum: number, h: any) => 
            sum + (h.currentValue || h.investedValue), 0
          );
          
          // Fixed Deposits and other debt instruments
          const fdHoldings = portfolioData.holdings.filter((h: any) => 
            h.assetType === 'Fixed Deposits' || h.assetType === 'Fixed Deposit'
          );
          const fdOwnership = fdHoldings.reduce((sum: number, h: any) => 
            sum + (h.currentValue || h.investedValue), 0
          );
          
          // Others (Commodities, Real Assets, Cash, etc.)
          const othersOwnership = portfolioData.allocation
            .filter((a: any) => !['Growth Assets', 'Income & Allocation'].includes(a.name))
            .reduce((sum: number, a: any) => sum + a.value, 0);
          
          setOwnership({
            equity: equityOwnership,
            mutualFunds: mfOwnership,
            fixedDeposits: fdOwnership,
            others: othersOwnership,
            total: portfolioData.metrics.netWorth,
          });

          // Calculate exposure (mock data for now)
          // In production, this would come from factsheet data
          const equityViaMF = mfOwnership * 0.85; // Assume 85% equity exposure
          const debtViaMF = mfOwnership * 0.12; // Assume 12% debt exposure
          const otherViaMF = mfOwnership * 0.03; // Assume 3% other
          const totalEquityExposure = equityOwnership + equityViaMF;

          setExposure({
            equityViaMF,
            debtViaMF,
            otherViaMF,
            totalEquityExposure,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/overview');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);


  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return null; // Redirect happens in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!ownership || !exposure) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#475569] dark:text-[#CBD5E1] mb-4">Failed to load analytics data</p>
          <button
            onClick={() => user?.id && fetchData(user.id)}
            className="px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[1280px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Portfolio Analytics</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            Advanced exposure insights for your portfolio
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#FEF3C7] dark:bg-[#78350F] border border-[#F59E0B]/20 dark:border-[#D97706]/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] dark:text-[#FBBF24] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#92400E] dark:text-[#FCD34D] mb-1">
                Analytics View - Exposure Analysis
              </p>
              <p className="text-xs text-[#92400E] dark:text-[#FDE68A]">
                This screen shows exposure analysis, not asset ownership. Values here may differ from 
                dashboard and holdings screens. Dashboard values remain authoritative for portfolio value, 
                asset allocation, and P&L calculations.
              </p>
            </div>
          </div>
        </div>

        {/* Ownership vs Exposure Explanation */}
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Ownership vs Exposure</h2>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mb-6">
            This view helps you understand what you're <strong>EXPOSED TO</strong>, not just what you <strong>OWN</strong>.
          </p>
          
          <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg border border-[#2563EB]/20 dark:border-[#3B82F6]/30 p-4 mb-6">
            <p className="text-sm text-[#1E40AF] dark:text-[#93C5FD] mb-3">
              <strong>Example:</strong> You own {formatCurrency(ownership.mutualFunds)} in Mutual Funds.
            </p>
            <p className="text-sm text-[#1E40AF] dark:text-[#93C5FD]">
              But 85% of that is invested in equity by the fund. So your equity <strong>EXPOSURE</strong> is {formatCurrency(exposure.equityViaMF)}.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                    Asset Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                    What You Own
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                    Exposure (via MF)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                    Combined Exposure
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                <tr>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Stocks</p>
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Direct stock holdings</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(ownership.equity)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] dark:text-[#94A3B8] number-emphasis">
                    {formatCurrency(exposure.equityViaMF)}
                    <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mt-0.5">(via MF)</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(exposure.totalEquityExposure)}
                    <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mt-0.5">(total exposure)</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Debt</p>
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Fixed income</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] dark:text-[#94A3B8] number-emphasis">
                    —
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] dark:text-[#94A3B8] number-emphasis">
                    {formatCurrency(exposure.debtViaMF)}
                    <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mt-0.5">(via MF)</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(exposure.debtViaMF)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Mutual Funds</p>
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">As asset class</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(ownership.mutualFunds)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    —
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Important: Analytics are for insights only
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  Your dashboard shows: Stocks {formatCurrency(ownership.equity)} (direct holdings), 
                  Mutual Funds {formatCurrency(ownership.mutualFunds)} (total MF value). 
                  Analytics adds exposure data: Equity Exposure (via MF) {formatCurrency(exposure.equityViaMF)}, 
                  Debt Exposure (via MF) {formatCurrency(exposure.debtViaMF)}. 
                  Dashboard values remain unchanged.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">Analytics Screens</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Portfolio Health Score */}
            <Link
              href="/analytics/health"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <TargetIcon className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Portfolio Health Score
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      Overall portfolio balance, diversification, and risk structure
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>7-pillar health assessment with actionable insights</span>
              </div>
            </Link>

            {/* Stability & Downside Protection */}
            <Link
              href="/analytics/stability"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <ShieldCheckIcon className="w-5 h-5 text-[#10B981] dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Stability & Downside Protection
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      Portfolio resilience during market stress
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Stability score, credit risk, and liquidity analysis</span>
              </div>
            </Link>

            {/* Scenario Impact Analysis */}
            <Link
              href="/analytics/scenarios"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <ChartIcon className="w-5 h-5 text-[#7C3AED] dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Scenario Impact Analysis
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      Explore how your portfolio may respond to different market conditions
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Market drawdown, sector shock, rate shock, and recovery scenarios</span>
              </div>
            </Link>

            {/* MF Exposure Analytics */}
            <Link
              href="/analytics/mutualfund-exposure"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <LayersIcon className="w-5 h-5 text-[#F97316] dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Mutual Fund Exposure Analytics
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      Understanding what your mutual funds are invested in
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Equity, Debt, Other exposure breakdown</span>
              </div>
            </Link>

            {/* Sector Exposure */}
            <Link
              href="/analytics/sector-exposure"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
                    <BuildingIcon className="w-5 h-5 text-[#06B6D4] dark:text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Sector Exposure Analysis
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      Which sectors are you exposed to?
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Technology, Banking, FMCG, Pharma, etc.</span>
              </div>
            </Link>

            {/* Market Cap Exposure */}
            <Link
              href="/analytics/marketcap-exposure"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <TrendingUpIcon className="w-5 h-5 text-[#10B981] dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Market Cap Exposure
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      Large cap, mid cap, or small cap exposure?
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Large, Mid, Small cap breakdown</span>
              </div>
            </Link>

            {/* Geography Exposure */}
            <Link
              href="/analytics/geography-exposure"
              className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                    <GlobeIcon className="w-5 h-5 text-[#6366F1] dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Geography Exposure Analysis
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      India vs International exposure
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Domestic and international breakdown</span>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

