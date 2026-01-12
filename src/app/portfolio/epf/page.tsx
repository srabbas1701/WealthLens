/**
 * EPF Holdings Page
 * 
 * Employee Provident Fund holdings for Indian investment portfolio.
 * 
 * DESIGN PRINCIPLES:
 * - Simplified, employer-focused tracking
 * - Monthly balance updates
 * - Government-backed retirement savings
 * - Stable, predictable, trustworthy
 * - Explicitly handle missing data
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  InfoIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';
import EPFAddModal from '@/components/EPFAddModal';

interface EPFHolding {
  id: string;
  uan: string;
  memberId?: string;
  employerName: string;
  employerCode?: string;
  dateOfJoining?: string;
  dateOfLeaving?: string;
  currentBalance: number;
  employeeContributions: number;
  employerContributions: number;
  totalContributions: number;
  interestEarned: number;
  interestRate: number;
  lastUpdated: string;
  notes?: string | null;
}

export default function EPFHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<EPFHolding[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<EPFHolding | null>(null);
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null);
  
  // Calculate summary metrics
  const summary = useMemo(() => {
    if (holdings.length === 0) {
      return {
        totalEmployeeContributions: 0,
        totalEmployerContributions: 0,
        totalInterestEarned: 0,
        averageInterestRate: null,
        totalContributions: 0,
      };
    }

    const totalEmployeeContributions = holdings.reduce((sum, h) => sum + (h.employeeContributions || 0), 0);
    const totalEmployerContributions = holdings.reduce((sum, h) => sum + (h.employerContributions || 0), 0);
    const totalInterestEarned = holdings.reduce((sum, h) => sum + (h.interestEarned || 0), 0);
    
    const interestRates = holdings
      .map(h => h.interestRate)
      .filter((rate): rate is number => rate !== null && rate !== undefined && !isNaN(rate));

    return {
      totalEmployeeContributions,
      totalEmployerContributions,
      totalInterestEarned,
      totalContributions: totalEmployeeContributions + totalEmployerContributions,
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
          
          // Filter EPF holdings (handle various naming conventions)
          const epfHoldings = portfolioData.holdings
            .filter((h: any) => {
              const assetType = (h.assetType || '').toLowerCase();
              return assetType === 'epf' || assetType === 'employee provident fund' || 
                     h.assetType === 'EPF' || h.assetType === 'Employee Provident Fund';
            })
            .map((h: any) => {
              // Extract EPF-specific data from notes
              const notes = h.notes ? JSON.parse(h.notes) : {};
              
              const employeeContributions = notes.employeeContributions || 0;
              const employerContributions = notes.employerContributions || 0;
              const totalContributions = employeeContributions + employerContributions;
              
              return {
                id: h.id,
                uan: notes.uan || '',
                memberId: notes.memberId || null,
                employerName: notes.employerName || '',
                employerCode: notes.employerCode || null,
                dateOfJoining: notes.dateOfJoining || null,
                dateOfLeaving: notes.dateOfLeaving || null,
                currentBalance: notes.currentBalance || h.currentValue || h.investedValue || 0,
                employeeContributions,
                employerContributions,
                totalContributions,
                interestEarned: notes.interestEarned || 0,
                interestRate: notes.interestRate || 8.25,
                lastUpdated: notes.lastUpdated || new Date().toISOString(),
                notes: h.notes,
              };
            });

          // Calculate total balance from EPF holdings directly
          const totalEPFBalance = epfHoldings.reduce((sum, h) => sum + (h.currentBalance || 0), 0);
          
          setHoldings(epfHoldings);
          setTotalBalance(totalEPFBalance);
          setPortfolioPercentage(portfolioData.metrics.netWorth > 0 
            ? (totalEPFBalance / portfolioData.metrics.netWorth) * 100 
            : 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch EPF holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/epf');
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

  const handleEdit = (holding: EPFHolding) => {
    setEditingHolding(holding);
    setShowAddModal(true);
  };

  const handleDelete = async (holdingId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Are you sure you want to delete this EPF account? This action cannot be undone.')) {
      return;
    }

    setDeletingHoldingId(holdingId);
    try {
      const params = new URLSearchParams({
        user_id: user.id,
        holding_id: holdingId,
      });

      const response = await fetch(`/api/epf/holdings?${params}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        fetchData(user.id);
      } else {
        alert(`Failed to delete EPF account: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete EPF account. Please try again.');
    } finally {
      setDeletingHoldingId(null);
    }
  };

  // Mask UAN for display (show first 4 and last 4 digits)
  const maskUAN = (uan: string | null | undefined): string => {
    if (!uan) return '—';
    if (uan.length <= 8) return uan;
    return uan.slice(0, 4) + 'XXXX' + uan.slice(-4);
  };

  // Format date or show placeholder
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  // Format relative time (e.g., "2 months ago")
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
      
      if (diffMonths < 1) return 'Recently updated';
      if (diffMonths === 1) return '1 month ago';
      if (diffMonths < 12) return `${diffMonths} months ago`;
      
      const diffYears = Math.floor(diffMonths / 12);
      if (diffYears === 1) return '1 year ago';
      return `${diffYears} years ago`;
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = holdings.length > 0 && totalBalance > 0;

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">EPF Holdings</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Employee Provident Fund accounts in your portfolio</p>
          </div>
          <button
            onClick={() => {
              setEditingHolding(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Add EPF Account
          </button>
        </div>

        {/* Account Summary */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Current Balance</p>
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

        {/* Additional Summary Row */}
        {hasData && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Employee Contributions</p>
              <p className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(summary.totalEmployeeContributions)}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Employer Contributions</p>
              <p className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(summary.totalEmployerContributions)}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Total Contributions</p>
              <p className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(summary.totalContributions)}
              </p>
            </div>
          </div>
        )}

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
                      UAN / Member ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Employer
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Contributions
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Interest Earned
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Interest Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                      Last Updated
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
                        <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] font-mono">
                          {maskUAN(holding.uan)}
                        </p>
                        {holding.memberId && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                            Member ID: {holding.memberId}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.employerName}</p>
                        {holding.employerCode && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                            Code: {holding.employerCode}
                          </p>
                        )}
                        {holding.dateOfJoining && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                            Joined: {formatDate(holding.dateOfJoining)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                          {formatCurrency(holding.currentBalance)}
                        </p>
                        {holding.totalContributions > 0 && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                            Contributed: {formatCurrency(holding.totalContributions)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          Employee: {formatCurrency(holding.employeeContributions)}
                        </p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                          Employer: {formatCurrency(holding.employerContributions)}
                        </p>
                        <p className="text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] mt-1">
                          Total: {formatCurrency(holding.totalContributions)}
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
                        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatDate(holding.lastUpdated)}
                        </p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                          {formatRelativeTime(holding.lastUpdated)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(holding)}
                            className="p-2 text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] rounded-lg transition-colors"
                            title="Edit EPF Account"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(holding.id)}
                            disabled={deletingHoldingId === holding.id}
                            className="p-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete EPF Account"
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
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {formatCurrency(summary.totalContributions)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#16A34A] dark:text-[#22C55E]">
                      {formatCurrency(summary.totalInterestEarned)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {summary.averageInterestRate ? `${summary.averageInterestRate.toFixed(2)}%` : '—'}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Insights Section */}
        {hasData && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Insights</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                      Monthly Updates
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      EPF balances are updated monthly. Update your balance regularly to track accurate portfolio value.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                      Tax Benefits
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      EPF contributions up to ₹1.5 Lakhs qualify for tax deduction under Section 80C. Withdrawals are tax-free after 5 years.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                      Interest Rate
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      EPF accounts earn interest at an average rate of {summary.averageInterestRate ? `${summary.averageInterestRate.toFixed(2)}%` : '8.25%'}, compounded annually. Interest is credited after the fiscal year ends.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                      Multi-Employer Support
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      One UAN can have multiple Member IDs (one per employer). Track all your EPF accounts in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EPF Add/Edit Modal */}
      <EPFAddModal
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
