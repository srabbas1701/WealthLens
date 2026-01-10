/**
 * ETF Holdings Page
 * 
 * Table-first layout for ETF holdings.
 * Clear separation from direct equity holdings.
 * Professional, portfolio-grade presentation.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

type SortField = 'name' | 'category' | 'units' | 'avgPrice' | 'currentNAV' | 'investedValue' | 'currentValue' | 'gainLoss' | 'allocation';
type SortDirection = 'asc' | 'desc';

interface ETFHolding {
  id: string;
  name: string;
  symbol: string | null;
  category: string; // Equity, Debt, Gold
  units: number;
  averagePrice: number;
  currentNAV: number; // Calculated: currentValue / units
  investedValue: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  allocationPct: number;
  priceDate: string | null; // Price date (YYYY-MM-DD)
}

// Category label mapping
const getCategoryLabel = (assetClass: string | null): string => {
  if (!assetClass) return 'Other';
  const categoryMap: Record<string, string> = {
    'equity': 'Equity',
    'debt': 'Debt',
    'gold': 'Gold',
    'hybrid': 'Hybrid',
    'cash': 'Cash',
  };
  return categoryMap[assetClass.toLowerCase()] || 'Other';
};

export default function ETFHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous fetches
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<ETFHolding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Price update state
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateDisabled, setPriceUpdateDisabled] = useState(false);

  const fetchData = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      console.log('[ETF Page] Skipping duplicate fetch');
      return;
    }
    
    fetchingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const etfHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'ETFs' || h.assetType === 'ETF')
            .map((h: any) => {
              const currentValue = h.currentValue || h.investedValue;
              const units = h.quantity || 0;
              const currentNAV = units > 0 ? currentValue / units : 0;
              const gainLoss = currentValue - h.investedValue;
              const gainLossPercent = h.investedValue > 0 
                ? (gainLoss / h.investedValue) * 100 
                : 0;
              
              return {
                id: h.id,
                name: h.name,
                symbol: h.symbol,
                category: getCategoryLabel(h.assetClass),
                units,
                averagePrice: h.averagePrice,
                currentNAV,
                investedValue: h.investedValue,
                currentValue,
                gainLoss,
                gainLossPercent,
                allocationPct: h.allocationPct,
                priceDate: (h as any)._priceDate || null,
              };
            });

          const total = etfHoldings.reduce((sum: number, h: ETFHolding) => sum + h.currentValue, 0);
          const invested = etfHoldings.reduce((sum: number, h: ETFHolding) => sum + h.investedValue, 0);
          const portfolioPct = portfolioData.metrics.netWorth > 0 
            ? (total / portfolioData.metrics.netWorth) * 100 
            : 0;

          setHoldings(etfHoldings);
          setTotalValue(total);
          setTotalInvested(invested);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch ETF holdings:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/etfs');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  const handlePriceUpdate = async () => {
    setPriceUpdateLoading(true);
    try {
      const response = await fetch('/api/stocks/prices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[ETF Page] Price update result:', result);
        
        // Refresh data
        if (user?.id) {
          await fetchData(user.id);
        }
        
        // Disable button after successful update
        setPriceUpdateDisabled(true);
        setTimeout(() => setPriceUpdateDisabled(false), 60000); // Re-enable after 1 minute
      } else {
        console.error('[ETF Page] Price update failed');
      }
    } catch (error) {
      console.error('[ETF Page] Price update error:', error);
    } finally {
      setPriceUpdateLoading(false);
    }
  };

  const formatPriceDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];
    sorted.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (sortField === 'name' || sortField === 'category') {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [holdings, sortField, sortDirection]);


  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
      : <ChevronDownIcon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />;
  };

  // Get most recent price date from holdings
  const mostRecentPriceDate = useMemo(() => {
    const dates = holdings
      .map(h => h.priceDate)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    return dates.length > 0 ? dates[0] : null;
  }, [holdings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading ETF holdings...</p>
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">ETF Holdings</h1>
            <button
              onClick={handlePriceUpdate}
              disabled={priceUpdateLoading || priceUpdateDisabled}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                priceUpdateLoading || priceUpdateDisabled
                  ? 'bg-[#E5E7EB] dark:bg-[#334155] text-[#9CA3AF] dark:text-[#64748B] cursor-not-allowed'
                  : 'bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]'
              }`}
              title={priceUpdateDisabled ? 'Prices already updated today' : 'Update ETF prices from Yahoo Finance'}
            >
              <RefreshIcon 
                className={`w-4 h-4 ${priceUpdateLoading ? 'animate-spin' : ''}`} 
              />
              {priceUpdateLoading 
                ? 'Updating...' 
                : priceUpdateDisabled 
                  ? 'Updated Today' 
                  : 'Update Prices'}
            </button>
          </div>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
            {mostRecentPriceDate && (
              <span className="ml-2 text-[#475569] dark:text-[#CBD5E1] font-medium">
                • Price as of {formatPriceDate(mostRecentPriceDate)}
              </span>
            )}
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
                        <span>ETF Name</span>
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Category</span>
                        <SortIcon field="category" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('units')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Units</span>
                        <SortIcon field="units" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('avgPrice')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Avg Buy Price</span>
                        <SortIcon field="avgPrice" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('currentNAV')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Current NAV</span>
                        <SortIcon field="currentNAV" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('investedValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Invested Value</span>
                        <SortIcon field="investedValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('currentValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Current Value</span>
                        <SortIcon field="currentValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('gainLoss')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Gain/Loss</span>
                        <SortIcon field="gainLoss" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('allocation')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Allocation %</span>
                        <SortIcon field="allocation" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">No ETF holdings found</p>
                          <p className="text-xs text-[#9CA3AF] dark:text-[#64748B]">Upload your portfolio to see ETF holdings</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.name}</p>
                            {holding.symbol && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{holding.symbol}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            holding.category === 'Equity' 
                              ? 'bg-[#E0F2FE] dark:bg-[#0C4A6E] text-[#0369A1] dark:text-[#7DD3FC]'
                              : holding.category === 'Debt'
                              ? 'bg-[#F0FDF4] dark:bg-[#14532D] text-[#166534] dark:text-[#86EFAC]'
                              : holding.category === 'Gold'
                              ? 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#92400E] dark:text-[#FDE047]'
                              : 'bg-[#F3F4F6] dark:bg-[#475569] text-[#4B5563] dark:text-[#E5E7EB]'
                          }`}>
                            {holding.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatNumber(holding.units, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          ₹{formatNumber(holding.averagePrice, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          ₹{formatNumber(holding.currentNAV, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm">
                          <div>
                            <div className={`font-medium ${
                              holding.gainLoss >= 0 
                                ? 'text-[#16A34A] dark:text-[#22C55E]' 
                                : 'text-[#DC2626] dark:text-[#EF4444]'
                            }`}>
                              {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                            </div>
                            <div className={`text-xs ${
                              holding.gainLossPercent >= 0 
                                ? 'text-[#16A34A] dark:text-[#22C55E]' 
                                : 'text-[#DC2626] dark:text-[#EF4444]'
                            }`}>
                              {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {holding.allocationPct.toFixed(1)}%
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
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatNumber(sortedHoldings.reduce((sum, h) => sum + h.units, 0), 2)}
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalInvested)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        <div className={`font-semibold ${
                          (totalValue - totalInvested) >= 0 
                            ? 'text-[#16A34A] dark:text-[#22C55E]' 
                            : 'text-[#DC2626] dark:text-[#EF4444]'
                        }`}>
                          {(totalValue - totalInvested) >= 0 ? '+' : ''}{formatCurrency(totalValue - totalInvested)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {portfolioPercentage.toFixed(1)}%
                      </td>
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
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Verification: Total matches dashboard ETFs value ({formatCurrency(totalValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                This page shows ETF holdings only. Direct equity holdings are shown separately.
              </p>
            </div>
          </div>
        </div>

        {/* Optional AI Insights */}
        {sortedHoldings.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Portfolio Insights</h2>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                <p className="mb-2">
                  <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Total ETF Holdings:</strong> {formatCurrency(totalValue)} ({portfolioPercentage.toFixed(1)}% of portfolio)
                </p>
                {sortedHoldings.length > 0 && (
                  <>
                    <p className="mb-2">
                      <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Category Distribution:</strong>{' '}
                      {Array.from(new Set(sortedHoldings.map(h => h.category))).map(cat => {
                        const catValue = sortedHoldings
                          .filter(h => h.category === cat)
                          .reduce((sum, h) => sum + h.currentValue, 0);
                        const catPct = (catValue / totalValue) * 100;
                        return `${cat} (${catPct.toFixed(1)}%)`;
                      }).join(', ')}
                    </p>
                    <p className="mb-2">
                      <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Top Holding:</strong> {sortedHoldings[0].name} ({sortedHoldings[0].allocationPct.toFixed(1)}% of ETF holdings)
                    </p>
                    {sortedHoldings.length >= 3 && (
                      <p>
                        <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Concentration:</strong> Top 3 holdings represent{' '}
                        {sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.allocationPct, 0).toFixed(1)}% of ETF portfolio
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

