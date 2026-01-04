/**
 * NPS Holdings Page
 * 
 * National Pension System holdings for Indian investment portfolio.
 * 
 * DESIGN PRINCIPLES:
 * - Long-term, retirement-focused
 * - Regulated, conservative presentation
 * - Allocation-based insights, not price-based
 * - Serious, regulated, appropriate for retirement tracking
 * - Explicitly handle missing data
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  LockIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { getAssetTotals } from '@/lib/portfolio-aggregation';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';

interface NPSAccount {
  id: string;
  accountType: 'Tier I' | 'Tier II';
  pran?: string | null;
  contributionType?: 'Employee' | 'Individual' | null;
  currentBalance: number;
  equityAllocation?: number | null;
  debtAllocation?: number | null;
  schemeType?: 'Auto' | 'Active' | null;
  status?: 'active' | 'frozen' | null;
  notes?: string | null;
}

export default function NPSHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<NPSAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  const [showContributionHistory, setShowContributionHistory] = useState(false);
  
  // Calculate summary metrics
  const summary = useMemo(() => {
    if (accounts.length === 0) {
      return {
        tier1Balance: 0,
        tier2Balance: 0,
        totalEquityAllocation: 0,
        totalDebtAllocation: 0,
        averageEquityAllocation: null as number | null,
        averageDebtAllocation: null as number | null,
      };
    }

    const tier1Accounts = accounts.filter(a => a.accountType === 'Tier I');
    const tier2Accounts = accounts.filter(a => a.accountType === 'Tier II');
    
    const tier1Balance = tier1Accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const tier2Balance = tier2Accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    
    const equityAllocations = accounts
      .map(a => a.equityAllocation)
      .filter((val): val is number => val !== null && val !== undefined);
    
    const debtAllocations = accounts
      .map(a => a.debtAllocation)
      .filter((val): val is number => val !== null && val !== undefined);
    
    const totalEquityAllocation = equityAllocations.length > 0
      ? equityAllocations.reduce((sum, val) => sum + val, 0) / equityAllocations.length
      : 0;
    
    const totalDebtAllocation = debtAllocations.length > 0
      ? debtAllocations.reduce((sum, val) => sum + val, 0) / debtAllocations.length
      : 0;

    return {
      tier1Balance,
      tier2Balance,
      totalEquityAllocation,
      totalDebtAllocation,
      averageEquityAllocation: equityAllocations.length > 0 ? totalEquityAllocation : null,
      averageDebtAllocation: debtAllocations.length > 0 ? totalDebtAllocation : null,
    };
  }, [accounts]);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          
          // Filter NPS holdings (handle various naming conventions)
          const npsAccounts = portfolioData.holdings
            .filter((h: any) => {
              const assetType = (h.assetType || '').toLowerCase();
              return assetType === 'nps' || assetType === 'national pension system' || 
                     h.assetType === 'NPS' || h.assetType === 'National Pension System';
            })
            .map((h: any) => {
              // Extract NPS-specific data from notes or asset details
              const notes = h.notes ? (typeof h.notes === 'string' ? JSON.parse(h.notes) : h.notes) : {};
              
              return {
                id: h.id,
                accountType: notes.accountType || notes.tier || 'Tier I',
                pran: notes.pran || notes.accountNumber || null,
                contributionType: notes.contributionType || notes.type || null,
                currentBalance: h.currentValue || h.investedValue || 0,
                equityAllocation: notes.equityAllocation || notes.equity || null,
                debtAllocation: notes.debtAllocation || notes.debt || null,
                schemeType: notes.schemeType || notes.scheme || null,
                status: notes.status || 'active',
                notes: h.notes,
              };
            });

          // Use shared aggregation utility for consistency
          const allHoldings = portfolioData.holdings.map((h: any) => ({
            id: h.id,
            name: h.name,
            assetType: h.assetType,
            investedValue: h.investedValue,
            currentValue: h.currentValue || h.investedValue,
          }));
          
          const assetTotals = getAssetTotals(allHoldings, 'NPS');
          
          setAccounts(npsAccounts);
          setTotalBalance(assetTotals.totalCurrent);
          setPortfolioPercentage(portfolioData.metrics.netWorth > 0 
            ? (assetTotals.totalCurrent / portfolioData.metrics.netWorth) * 100 
            : 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch NPS holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/nps');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  // Mask PRAN for display (PRAN format: XXXXXXXXXX)
  const maskPRAN = (pran: string | null | undefined): string => {
    if (!pran) return '—';
    if (pran.length <= 4) return pran;
    return 'XXXXXX' + pran.slice(-4);
  };

  // Format percentage or show placeholder
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = accounts.length > 0 && totalBalance > 0;

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[1200px] mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">NPS Holdings</h1>
          <p className="text-sm text-[#6B7280]">National Pension System accounts in your portfolio</p>
        </div>

        {/* Account Summary */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Total Balance</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
                {formatCurrency(totalBalance)}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Tier I Balance</p>
            {summary.tier1Balance > 0 ? (
              <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
                {formatCurrency(summary.tier1Balance)}
              </p>
            ) : (
              <p className="text-lg text-[#6B7280]">—</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Tier II Balance</p>
            {summary.tier2Balance > 0 ? (
              <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
                {formatCurrency(summary.tier2Balance)}
              </p>
            ) : (
              <p className="text-lg text-[#6B7280]">—</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Portfolio Allocation</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
                {portfolioPercentage.toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        {/* Data Consolidation Message if needed */}
        {!hasData && !loading && (
          <DataConsolidationMessage className="mb-6" />
        )}

        {/* Accounts Table */}
        {hasData && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F8FB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Account Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      PRAN
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Contribution Type
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Equity Allocation
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Debt Allocation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Scheme Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-[#F6F8FB] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          account.accountType === 'Tier I'
                            ? 'bg-[#EEF2FF] text-[#4338CA]'
                            : 'bg-[#F0FDF4] text-[#166534]'
                        }`}>
                          {account.accountType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#6B7280] font-mono">
                          {maskPRAN(account.pran)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#0F172A]">
                        {account.contributionType || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        {formatCurrency(account.currentBalance)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                        {formatPercentage(account.equityAllocation)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                        {formatPercentage(account.debtAllocation)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#0F172A]">
                        {account.schemeType || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          account.status === 'frozen'
                            ? 'bg-[#F6F8FB] text-[#6B7280]'
                            : 'bg-[#F0FDF4] text-[#166534]'
                        }`}>
                          {account.status === 'frozen' ? 'Frozen' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F6F8FB] border-t-2 border-[#E5E7EB]">
                  <tr>
                    <td className="px-6 py-4 text-sm font-semibold text-[#0F172A]">
                      Total
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                      {formatCurrency(totalBalance)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                      {formatPercentage(summary.averageEquityAllocation)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                      {formatPercentage(summary.averageDebtAllocation)}
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Contribution History (Collapsed by default) */}
        {hasData && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] mb-6">
            <button
              onClick={() => setShowContributionHistory(!showContributionHistory)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F6F8FB] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-[#6B7280]" />
                <span className="text-sm font-medium text-[#0F172A]">Contribution History</span>
              </div>
              {showContributionHistory ? (
                <ChevronUpIcon className="w-5 h-5 text-[#6B7280]" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-[#6B7280]" />
              )}
            </button>
            
            {showContributionHistory && (
              <div className="px-6 py-4 border-t border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-4">
                  Contribution history details will be available here. This feature tracks your NPS contributions over time.
                </p>
                <div className="bg-[#F6F8FB] rounded-lg p-4 border border-[#E5E7EB]">
                  <div className="flex items-start gap-3">
                    <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-[#475569]">
                      <p className="font-medium text-[#0F172A] mb-1">NPS Contribution Limits</p>
                      <p className="mb-2">
                        Tier I: Minimum ₹500 per year, maximum ₹2 Lakhs per year (including employer contribution).
                      </p>
                      <p>
                        Tier II: No minimum contribution requirement. Contributions are eligible for tax deduction under Section 80C (Tier I) and Section 80CCD(1B) for additional deduction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Light AI Insights */}
        {hasData && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Insights</h2>
            <div className="space-y-4">
              {summary.averageEquityAllocation !== null && (
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#475569]">
                    <p className="font-medium text-[#0F172A] mb-1">Retirement Allocation</p>
                    <p>
                      Your NPS accounts have an average equity allocation of {summary.averageEquityAllocation.toFixed(1)}% and debt allocation of {summary.averageDebtAllocation?.toFixed(1) || '—'}%. 
                      This allocation is designed to balance growth potential with stability for long-term retirement planning.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#475569]">
                  <p className="font-medium text-[#0F172A] mb-1">Tier I vs Tier II</p>
                  <p>
                    Tier I accounts are mandatory for retirement savings with withdrawal restrictions until age 60. 
                    Tier II accounts offer more flexibility with no withdrawal restrictions, making them suitable for medium-term goals.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#475569]">
                  <p className="font-medium text-[#0F172A] mb-1">Tax Benefits</p>
                  <p>
                    NPS Tier I contributions qualify for tax deduction under Section 80C (up to ₹1.5 Lakhs) and Section 80CCD(1B) 
                    (additional ₹50,000). Tier II contributions are not eligible for tax deductions. 
                    Withdrawals are partially tax-exempt at retirement.
                  </p>
                </div>
              </div>

              {summary.tier1Balance > 0 && summary.tier2Balance > 0 && (
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#475569]">
                    <p className="font-medium text-[#0F172A] mb-1">Account Balance</p>
                    <p>
                      Your Tier I balance is {formatCurrency(summary.tier1Balance)} ({((summary.tier1Balance / totalBalance) * 100).toFixed(0)}% of total NPS balance), 
                      while Tier II balance is {formatCurrency(summary.tier2Balance)} ({((summary.tier2Balance / totalBalance) * 100).toFixed(0)}% of total).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

