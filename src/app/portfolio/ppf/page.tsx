/**
 * PPF Holdings Page
 * 
 * Public Provident Fund holdings for Indian investment portfolio.
 * 
 * DESIGN PRINCIPLES:
 * - Conservative, long-term, trust-first
 * - Government-backed savings instrument
 * - No market-style analytics
 * - Stable, predictable, trustworthy
 * - Explicitly handle missing data
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
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

interface PPFHolding {
  id: string;
  name: string;
  accountNumber?: string | null;
  openingYear?: number | null;
  currentBalance: number;
  annualContribution?: number | null;
  interestRate?: number | null;
  maturityYear?: number | null;
  status?: 'active' | 'matured' | null;
  notes?: string | null;
}

export default function PPFHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<PPFHolding[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  const [showContributionHistory, setShowContributionHistory] = useState(false);
  
  // Calculate summary metrics
  const summary = useMemo(() => {
    if (holdings.length === 0) {
      return {
        earliestOpeningYear: null,
        latestMaturityYear: null,
        totalAnnualContribution: 0,
        averageInterestRate: null,
      };
    }

    const openingYears = holdings
      .map(h => h.openingYear)
      .filter((year): year is number => year !== null && year !== undefined);
    
    const maturityYears = holdings
      .map(h => h.maturityYear)
      .filter((year): year is number => year !== null && year !== undefined);
    
    const annualContributions = holdings
      .map(h => h.annualContribution || 0)
      .filter(val => val > 0);
    
    const interestRates = holdings
      .map(h => h.interestRate)
      .filter((rate): rate is number => rate !== null && rate !== undefined);

    return {
      earliestOpeningYear: openingYears.length > 0 ? Math.min(...openingYears) : null,
      latestMaturityYear: maturityYears.length > 0 ? Math.max(...maturityYears) : null,
      totalAnnualContribution: annualContributions.reduce((sum, val) => sum + val, 0),
      averageInterestRate: interestRates.length > 0 
        ? interestRates.reduce((sum, rate) => sum + rate, 0) / interestRates.length 
        : null,
    };
  }, [holdings]);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          
          // Filter PPF holdings (handle various naming conventions)
          const ppfHoldings = portfolioData.holdings
            .filter((h: any) => {
              const assetType = (h.assetType || '').toLowerCase();
              return assetType === 'ppf' || assetType === 'public provident fund' || 
                     h.assetType === 'PPF' || h.assetType === 'Public Provident Fund';
            })
            .map((h: any) => {
              // Extract PPF-specific data from notes or asset details
              const notes = h.notes ? JSON.parse(h.notes) : {};
              
              return {
                id: h.id,
                name: h.name || 'PPF Account',
                accountNumber: notes.accountNumber || null,
                openingYear: notes.openingYear || null,
                currentBalance: h.currentValue || h.investedValue || 0,
                annualContribution: notes.annualContribution || null,
                interestRate: notes.interestRate || null,
                maturityYear: notes.maturityYear || null,
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
          
          const assetTotals = getAssetTotals(allHoldings, 'PPF');
          
          setHoldings(ppfHoldings);
          setTotalBalance(assetTotals.totalCurrent);
          setPortfolioPercentage(portfolioData.metrics.netWorth > 0 
            ? (assetTotals.totalCurrent / portfolioData.metrics.netWorth) * 100 
            : 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch PPF holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/ppf');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  // Mask account number for display
  const maskAccountNumber = (accountNumber: string | null | undefined): string => {
    if (!accountNumber) return '—';
    if (accountNumber.length <= 4) return accountNumber;
    return 'XXXX' + accountNumber.slice(-4);
  };

  // Format year or show placeholder
  const formatYear = (year: number | null | undefined): string => {
    if (!year) return '—';
    return year.toString();
  };

  // Calculate years to maturity
  const yearsToMaturity = (maturityYear: number | null | undefined): string => {
    if (!maturityYear) return '—';
    const currentYear = new Date().getFullYear();
    const years = maturityYear - currentYear;
    if (years < 0) return 'Matured';
    if (years === 0) return 'This year';
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = holdings.length > 0 && totalBalance > 0;

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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">PPF Holdings</h1>
          <p className="text-sm text-[#6B7280]">Public Provident Fund accounts in your portfolio</p>
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
            <p className="text-sm text-[#6B7280] mb-2">Opening Year</p>
            {summary.earliestOpeningYear ? (
              <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
                {summary.earliestOpeningYear}
              </p>
            ) : (
              <p className="text-lg text-[#6B7280]">—</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Maturity Year</p>
            {summary.latestMaturityYear ? (
              <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
                {summary.latestMaturityYear}
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

        {/* Holdings Table */}
        {hasData && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F8FB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Account Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Account Number
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Opening Year
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Annual Contribution
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Interest Rate
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Maturity Year
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {holdings.map((holding) => (
                    <tr key={holding.id} className="hover:bg-[#F6F8FB] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#0F172A]">{holding.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#6B7280] font-mono">
                          {maskAccountNumber(holding.accountNumber)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                        {formatYear(holding.openingYear)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        {formatCurrency(holding.currentBalance)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                        {holding.annualContribution 
                          ? formatCurrency(holding.annualContribution)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                        {holding.interestRate 
                          ? `${holding.interestRate.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                        <div className="flex flex-col items-end">
                          <span>{formatYear(holding.maturityYear)}</span>
                          {holding.maturityYear && (
                            <span className="text-xs text-[#6B7280] mt-1">
                              {yearsToMaturity(holding.maturityYear)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          holding.status === 'matured'
                            ? 'bg-[#F6F8FB] text-[#6B7280]'
                            : 'bg-[#F0FDF4] text-[#166534]'
                        }`}>
                          {holding.status === 'matured' ? 'Matured' : 'Active'}
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
                      {summary.totalAnnualContribution > 0
                        ? formatCurrency(summary.totalAnnualContribution)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                      {summary.averageInterestRate 
                        ? `${summary.averageInterestRate.toFixed(2)}%`
                        : '—'}
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
                  Contribution history details will be available here. This feature tracks your annual PPF contributions over time.
                </p>
                <div className="bg-[#F6F8FB] rounded-lg p-4 border border-[#E5E7EB]">
                  <div className="flex items-start gap-3">
                    <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-[#475569]">
                      <p className="font-medium text-[#0F172A] mb-1">PPF Contribution Limits</p>
                      <p className="mb-2">
                        Minimum annual contribution: ₹500. Maximum annual contribution: ₹1.5 Lakhs.
                      </p>
                      <p>
                        Contributions are eligible for tax deduction under Section 80C of the Income Tax Act.
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
              {summary.latestMaturityYear && (
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#475569]">
                    <p className="font-medium text-[#0F172A] mb-1">Maturity Awareness</p>
                    <p>
                      Your PPF accounts mature in {summary.latestMaturityYear}. 
                      {summary.latestMaturityYear > new Date().getFullYear() 
                        ? ` You have ${summary.latestMaturityYear - new Date().getFullYear()} year${summary.latestMaturityYear - new Date().getFullYear() !== 1 ? 's' : ''} remaining.`
                        : ' Your account has matured.'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#475569]">
                  <p className="font-medium text-[#0F172A] mb-1">Tax Benefits</p>
                  <p>
                    PPF contributions qualify for tax deduction under Section 80C up to ₹1.5 Lakhs per financial year. 
                    Interest earned is tax-free, and withdrawals are also tax-exempt.
                  </p>
                </div>
              </div>

              {summary.averageInterestRate && (
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#475569]">
                    <p className="font-medium text-[#0F172A] mb-1">Interest Rate</p>
                    <p>
                      Your PPF accounts earn interest at an average rate of {summary.averageInterestRate.toFixed(2)}%. 
                      Interest is compounded annually and credited at the end of each financial year.
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

