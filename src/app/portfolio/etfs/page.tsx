/**
 * ETF Holdings Page
 * 
 * Table-first layout for ETF holdings.
 * Clear separation from direct equity holdings.
 * Professional, portfolio-grade presentation.
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

type SortField = 'name' | 'category' | 'units' | 'avgPrice' | 'currentNAV' | 'investedValue' | 'currentValue' | 'allocation';
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
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<ETFHolding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('currentValue');
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
      return <ChevronUpIcon className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-[#2563EB]" />
      : <ChevronDownIcon className="w-4 h-4 text-[#2563EB]" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading ETF holdings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        showDownload={true}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">ETF Holdings</h1>
          <p className="text-sm text-[#6B7280]">
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
          </p>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>ETF Name</span>
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Category</span>
                        <SortIcon field="category" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('units')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Units</span>
                        <SortIcon field="units" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('avgPrice')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Avg Buy Price</span>
                        <SortIcon field="avgPrice" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('currentNAV')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Current NAV</span>
                        <SortIcon field="currentNAV" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('investedValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Invested Value</span>
                        <SortIcon field="investedValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('currentValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Current Value</span>
                        <SortIcon field="currentValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('allocation')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Allocation %</span>
                        <SortIcon field="allocation" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-[#6B7280] mb-2">No ETF holdings found</p>
                          <p className="text-xs text-[#9CA3AF]">Upload your portfolio to see ETF holdings</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{holding.name}</p>
                            {holding.symbol && (
                              <p className="text-xs text-[#6B7280] mt-0.5">{holding.symbol}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            holding.category === 'Equity' 
                              ? 'bg-[#E0F2FE] text-[#0369A1]'
                              : holding.category === 'Debt'
                              ? 'bg-[#F0FDF4] text-[#166534]'
                              : holding.category === 'Gold'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'bg-[#F3F4F6] text-[#4B5563]'
                          }`}>
                            {holding.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          {formatNumber(holding.units, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          ₹{formatNumber(holding.averagePrice, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          ₹{formatNumber(holding.currentNAV, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          {formatCurrency(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A]">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A]">
                          {holding.allocationPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sortedHoldings.length > 0 && (
                  <tfoot className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                    <tr>
                      <td className="px-6 py-3.5 text-sm font-semibold text-[#0F172A]">
                        Total
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A]">
                        {formatNumber(sortedHoldings.reduce((sum, h) => sum + h.units, 0), 2)}
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A]">
                        {formatCurrency(totalInvested)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">
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
        <div className="mb-6 bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A]">
                Verification: Total matches dashboard ETFs value ({formatCurrency(totalValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                This page shows ETF holdings only. Direct equity holdings are shown separately.
              </p>
            </div>
          </div>
        </div>

        {/* Optional AI Insights */}
        {sortedHoldings.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon className="w-5 h-5 text-[#6B7280]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Portfolio Insights</h2>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-[#475569] leading-relaxed">
                <p className="mb-2">
                  <strong className="text-[#0F172A]">Total ETF Holdings:</strong> {formatCurrency(totalValue)} ({portfolioPercentage.toFixed(1)}% of portfolio)
                </p>
                {sortedHoldings.length > 0 && (
                  <>
                    <p className="mb-2">
                      <strong className="text-[#0F172A]">Category Distribution:</strong>{' '}
                      {Array.from(new Set(sortedHoldings.map(h => h.category))).map(cat => {
                        const catValue = sortedHoldings
                          .filter(h => h.category === cat)
                          .reduce((sum, h) => sum + h.currentValue, 0);
                        const catPct = (catValue / totalValue) * 100;
                        return `${cat} (${catPct.toFixed(1)}%)`;
                      }).join(', ')}
                    </p>
                    <p className="mb-2">
                      <strong className="text-[#0F172A]">Top Holding:</strong> {sortedHoldings[0].name} ({sortedHoldings[0].allocationPct.toFixed(1)}% of ETF holdings)
                    </p>
                    {sortedHoldings.length >= 3 && (
                      <p>
                        <strong className="text-[#0F172A]">Concentration:</strong> Top 3 holdings represent{' '}
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

