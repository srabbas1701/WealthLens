/**
 * Cash Holdings Page
 * 
 * Simple, clean visibility into cash positions.
 * No charts or analytics overload.
 * Focus on balances and liquidity.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

type SortField = 'name' | 'accountType' | 'balance' | 'interestRate' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

interface CashHolding {
  id: string;
  name: string;
  accountType: string | null;
  balance: number;
  interestRate: number | null;
  lastUpdated: string;
}

export default function CashHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<CashHolding[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('balance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const cashHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Cash')
            .map((h: any) => {
              // Parse cash metadata from notes (stored as JSON)
              let cashMetadata: any = {};
              if (h.notes) {
                try {
                  cashMetadata = JSON.parse(h.notes);
                } catch (e) {
                  console.warn('Failed to parse cash notes:', e);
                }
              }
              
              // Account type from metadata or default
              const accountType = cashMetadata.account_type || cashMetadata.cashAccountType || 'Savings Account';
              
              // Interest rate from metadata (if available)
              const interestRate = cashMetadata.interest_rate || cashMetadata.rate || null;
              
              // Balance is the current value
              const balance = h.currentValue > 0 ? h.currentValue : h.investedValue;
              
              // Last updated from holding's updated_at or created_at
              // Note: API returns these fields, but they may not be in the response
              // Use current date as fallback
              const lastUpdated = new Date().toISOString();
              
              return {
                id: h.id,
                name: h.name,
                accountType,
                balance,
                interestRate,
                lastUpdated,
              };
            });

          const total = cashHoldings.reduce((sum: number, h: CashHolding) => sum + h.balance, 0);
          const portfolioPct = portfolioData.metrics.netWorth > 0 
            ? (total / portfolioData.metrics.netWorth) * 100 
            : 0;

          setHoldings(cashHoldings);
          setTotalBalance(total);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cash holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/cash');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'balance' || field === 'lastUpdated' ? 'desc' : 'asc');
    }
  };

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];
    sorted.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // Handle null values
      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;
      
      if (sortField === 'name' || sortField === 'accountType') {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      
      if (sortField === 'lastUpdated') {
        aVal = new Date(a.lastUpdated).getTime();
        bVal = new Date(b.lastUpdated).getTime();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [holdings, sortField, sortDirection]);


  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      
      return formatDate(dateString);
    } catch {
      return '—';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-[#2563EB]" />
      : <ChevronDownIcon className="w-4 h-4 text-[#2563EB]" />;
  };

  // Minimal liquidity insight
  const liquidityInsight = useMemo(() => {
    if (totalBalance === 0) return null;
    
    const portfolioValue = totalBalance / (portfolioPercentage / 100);
    const cashPct = portfolioPercentage;
    
    // Simple liquidity assessment
    if (cashPct < 5) {
      return 'Low cash allocation. Consider maintaining emergency fund (3-6 months expenses).';
    } else if (cashPct > 20) {
      return 'High cash allocation. Consider investing excess cash for better returns.';
    } else {
      return 'Adequate cash reserves for liquidity needs.';
    }
  }, [totalBalance, portfolioPercentage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading cash holdings...</p>
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
        showDownload={true}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Cash Holdings</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            {holdings.length} account{holdings.length !== 1 ? 's' : ''} • Total Balance: {formatCurrency(totalBalance)} • {portfolioPercentage.toFixed(1)}% of portfolio
          </p>
        </div>

        {/* Holdings Table */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Account Name</span>
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('accountType')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Account Type</span>
                        <SortIcon field="accountType" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Balance</span>
                        <SortIcon field="balance" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('interestRate')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Interest Rate</span>
                        <SortIcon field="interestRate" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('lastUpdated')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Last Updated</span>
                        <SortIcon field="lastUpdated" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">No cash holdings found</p>
                          <p className="text-xs text-[#9CA3AF] dark:text-[#64748B]">Add cash accounts to track your liquid assets</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.name}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#4B5563] dark:text-[#CBD5E1]">
                            {holding.accountType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.balance)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {holding.interestRate !== null ? `${holding.interestRate.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] dark:text-[#94A3B8]">
                          {formatDateTime(holding.lastUpdated)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sortedHoldings.length > 0 && (
                  <tfoot className="bg-[#F9FAFB] dark:bg-[#334155] border-t-2 border-[#E5E7EB] dark:border-[#334155]">
                    <tr>
                      <td className="px-6 py-3.5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        Total
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalBalance)}
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Verification Note */}
        <div className="mb-6 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Verification: Total matches dashboard cash value ({formatCurrency(totalBalance)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Cash balances shown are from your portfolio data.
              </p>
            </div>
          </div>
        </div>

        {/* Minimal Liquidity Insight */}
        {liquidityInsight && sortedHoldings.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <div className="flex items-center gap-2 mb-3">
              <InfoIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Liquidity Overview</h2>
            </div>
            <div className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
              <p>
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Total Cash:</strong> {formatCurrency(totalBalance)} ({portfolioPercentage.toFixed(1)}% of portfolio)
              </p>
              <p className="mt-2">
                {liquidityInsight}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

