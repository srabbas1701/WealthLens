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
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { getAssetTotals } from '@/lib/portfolio-aggregation';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';
import PPFAddModal from '@/components/PPFAddModal';

interface PPFHolding {
  id: string;
  name: string;
  accountNumber: string;
  accountHolderName: string;
  openingDate: string;
  maturityDate: string;
  currentBalance: number;
  totalContributions: number;
  interestEarned: number;
  interestRate: number;
  bankOrPostOffice: string;
  branch?: string;
  status: 'active' | 'matured' | 'extended';
  extensionDetails?: {
    extensionStartDate: string;
    extensionEndDate: string;
    extensionNumber: number;
  } | null;
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PPFHolding | null>(null);
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null);
  
  // Calculate summary metrics
  const summary = useMemo(() => {
    if (holdings.length === 0) {
      return {
        earliestOpeningYear: null,
        latestMaturityYear: null,
        totalInterestEarned: 0,
        averageInterestRate: null,
      };
    }

    const openingYears = holdings
      .map(h => new Date(h.openingDate).getFullYear())
      .filter((year): year is number => year !== null && year !== undefined && !isNaN(year));
    
    const maturityYears = holdings
      .map(h => new Date(h.maturityDate).getFullYear())
      .filter((year): year is number => year !== null && year !== undefined && !isNaN(year));
    
    const totalInterestEarned = holdings.reduce((sum, h) => sum + (h.interestEarned || 0), 0);
    
    const interestRates = holdings
      .map(h => h.interestRate)
      .filter((rate): rate is number => rate !== null && rate !== undefined);

    return {
      earliestOpeningYear: openingYears.length > 0 ? Math.min(...openingYears) : null,
      latestMaturityYear: maturityYears.length > 0 ? Math.max(...maturityYears) : null,
      totalInterestEarned,
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
                accountNumber: notes.accountNumber || '',
                accountHolderName: notes.accountHolderName || '',
                openingDate: notes.openingDate || '',
                maturityDate: notes.maturityDate || '',
                currentBalance: notes.currentBalance || h.currentValue || h.investedValue || 0,
                totalContributions: notes.totalContributions || 0,
                interestEarned: notes.interestEarned || 0,
                interestRate: notes.interestRate || 7.1,
                bankOrPostOffice: notes.bankOrPostOffice || '',
                branch: notes.branch || '',
                status: notes.status || 'active',
                extensionDetails: notes.extensionDetails || null,
                notes: h.notes,
              };
            });

          // Calculate total balance from PPF holdings directly (not from generic asset totals)
          // This ensures we use the accurate currentBalance from notes, not h.currentValue
          const totalPPFBalance = ppfHoldings.reduce((sum, h) => sum + (h.currentBalance || 0), 0);
          
          setHoldings(ppfHoldings);
          setTotalBalance(totalPPFBalance);
          setPortfolioPercentage(portfolioData.metrics.netWorth > 0 
            ? (totalPPFBalance / portfolioData.metrics.netWorth) * 100 
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

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setEditingHolding(null);
    if (user?.id) {
      fetchData(user.id);
    }
  };

  const handleEdit = (holding: PPFHolding) => {
    setEditingHolding(holding);
    setShowAddModal(true);
  };

  const handleDelete = async (holdingId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Are you sure you want to delete this PPF account? This action cannot be undone.')) {
      return;
    }

    setDeletingHoldingId(holdingId);
    try {
      const params = new URLSearchParams({
        user_id: user.id,
        holding_id: holdingId,
      });

      const response = await fetch(`/api/ppf/holdings?${params}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        fetchData(user.id);
      } else {
        alert(`Failed to delete PPF account: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete PPF account. Please try again.');
    } finally {
      setDeletingHoldingId(null);
    }
  };

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">PPF Holdings</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Public Provident Fund accounts in your portfolio</p>
          </div>
          <button
            onClick={() => {
              setEditingHolding(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Add PPF Account
          </button>
        </div>

        {/* Account Summary */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Total Balance</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(totalBalance)}
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Interest Earned</p>
            {summary.totalInterestEarned > 0 ? (
              <p className="text-2xl font-semibold text-[#16A34A] dark:text-[#22C55E] number-emphasis">
                {formatCurrency(summary.totalInterestEarned)}
              </p>
            ) : (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Avg. Interest Rate</p>
            {summary.averageInterestRate ? (
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {summary.averageInterestRate.toFixed(2)}%
              </p>
            ) : (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Portfolio Allocation</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
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
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F8FB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Account Holder
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Bank/Post Office
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Interest Earned
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Interest Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                  {holdings.map((holding) => (
                    <tr key={holding.id} className="hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.accountHolderName}</p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono mt-1">
                          {maskAccountNumber(holding.accountNumber)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">{holding.bankOrPostOffice}</p>
                        {holding.branch && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">{holding.branch}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                          {formatCurrency(holding.currentBalance)}
                        </p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                          Contributed: {formatCurrency(holding.totalContributions)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-medium text-[#16A34A] dark:text-[#22C55E]">
                          {formatCurrency(holding.interestEarned)}
                        </p>
                        {holding.totalContributions > 0 && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                            {((holding.interestEarned / holding.totalContributions) * 100).toFixed(1)}% return
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {holding.interestRate.toFixed(2)}%
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          holding.status === 'active'
                            ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#14532D] dark:text-[#86EFAC]'
                            : holding.status === 'matured'
                            ? 'bg-[#E0E7FF] text-[#3730A3] dark:bg-[#1E3A8A] dark:text-[#93C5FD]'
                            : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#78350F] dark:text-[#FCD34D]'
                        }`}>
                          {holding.status.charAt(0).toUpperCase() + holding.status.slice(1)}
                        </span>
                        {holding.maturityDate && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                            Maturity: {new Date(holding.maturityDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(holding)}
                            className="p-2 text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] rounded-lg transition-colors"
                            title="Edit PPF Account"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(holding.id)}
                            disabled={deletingHoldingId === holding.id}
                            className="p-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete PPF Account"
                          >
                            {deletingHoldingId === holding.id ? (
                              <div className="w-4 h-4 border-2 border-[#DC2626] dark:border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F6F8FB] dark:bg-[#334155] border-t-2 border-[#E5E7EB] dark:border-[#334155]">
                  <tr>
                    <td className="px-6 py-4 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]" colSpan={2}>
                      Total ({holdings.length} account{holdings.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {formatCurrency(totalBalance)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#16A34A] dark:text-[#22C55E]">
                      {formatCurrency(summary.totalInterestEarned)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
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

      {/* PPF Add/Edit Modal */}
      <PPFAddModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingHolding(null);
        }}
        userId={user?.id || ''}
        onSuccess={handleAddSuccess}
        existingHolding={editingHolding}
      />
    </div>
  );
}

