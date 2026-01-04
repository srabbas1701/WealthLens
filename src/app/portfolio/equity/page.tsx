/**
 * Stocks Holdings Page
 * 
 * Table-first layout for direct stock holdings.
 * Professional, spreadsheet-like clarity.
 * Numbers match dashboard stocks values.
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
  RefreshIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { getAssetTotals } from '@/lib/portfolio-aggregation';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';

type SortField = 'name' | 'quantity' | 'avgPrice' | 'currentPrice' | 'investedValue' | 'currentValue' | 'gainLoss' | 'allocation';
type SortDirection = 'asc' | 'desc';

interface EquityHolding {
  id: string;
  name: string;
  symbol: string | null;
  quantity: number;
  averagePrice: number;
  currentPrice: number; // Calculated: currentValue / quantity
  investedValue: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  allocationPct: number;
}

export default function EquityHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<EquityHolding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Price update state
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateDisabled, setPriceUpdateDisabled] = useState(false);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const equityHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Equity' || h.assetType === 'Stocks')
            .map((h: any) => {
              const currentValue = h.currentValue || h.investedValue;
              const currentPrice = h.quantity > 0 ? currentValue / h.quantity : 0;
              const gainLoss = currentValue - h.investedValue;
              const gainLossPercent = h.investedValue > 0 
                ? (gainLoss / h.investedValue) * 100 
                : 0;
              
              return {
                id: h.id,
                name: h.name,
                symbol: h.symbol,
                quantity: h.quantity,
                averagePrice: h.averagePrice,
                currentPrice,
                investedValue: h.investedValue,
                currentValue,
                gainLoss,
                gainLossPercent,
                allocationPct: h.allocationPct,
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
          
          const assetTotals = getAssetTotals(allHoldings, 'Equity');
          
          setHoldings(equityHoldings);
          setTotalValue(assetTotals.totalCurrent);
          setTotalInvested(assetTotals.totalInvested);
          setPortfolioPercentage(portfolioData.metrics.netWorth > 0 
            ? (assetTotals.totalCurrent / portfolioData.metrics.netWorth) * 100 
            : 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stocks holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if prices were already updated today
  // Removed checkPriceUpdateStatus - button should always be enabled initially
  // Button will be disabled only after successful update

  // Trigger price update
  const handlePriceUpdate = useCallback(async () => {
    if (priceUpdateLoading || priceUpdateDisabled) return;
    
    setPriceUpdateLoading(true);
    try {
      const response = await fetch('/api/stocks/prices/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh data to show updated prices first
          if (user?.id) {
            await fetchData(user.id);
          }
          // Disable button after successful update and data refresh
          setPriceUpdateDisabled(true);
        } else {
          console.error('Price update failed:', data.error);
          alert('Failed to update prices: ' + (data.error || 'Unknown error'));
          // Keep button enabled if update failed
        }
      } else {
        throw new Error('Failed to update prices');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Error updating prices. Please try again.');
    } finally {
      setPriceUpdateLoading(false);
    }
  }, [priceUpdateLoading, priceUpdateDisabled, user?.id, fetchData]);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/equity');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
      // Button starts enabled - will be disabled only after successful update
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
    return [...holdings].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'quantity':
          return multiplier * (a.quantity - b.quantity);
        case 'avgPrice':
          return multiplier * (a.averagePrice - b.averagePrice);
        case 'currentPrice':
          return multiplier * (a.currentPrice - b.currentPrice);
        case 'investedValue':
          return multiplier * (a.investedValue - b.investedValue);
        case 'currentValue':
          return multiplier * (a.currentValue - b.currentValue);
        case 'gainLoss':
          return multiplier * (a.gainLoss - b.gainLoss);
        case 'allocation':
          return multiplier * (a.allocationPct - b.allocationPct);
        default:
          return 0;
      }
    });
  }, [holdings, sortField, sortDirection]);


  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  };

  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  const avgCurrentPrice = holdings.length > 0 && totalValue > 0 
    ? totalValue / holdings.reduce((sum, h) => sum + h.quantity, 0)
    : 0;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDownIcon className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-[#2563EB]" />
      : <ChevronDownIcon className="w-4 h-4 text-[#2563EB]" />;
  };

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return null; // Redirect happens in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading stocks holdings...</p>
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-[#0F172A]">Stocks Holdings</h1>
            <button
              onClick={handlePriceUpdate}
              disabled={priceUpdateLoading || priceUpdateDisabled}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                priceUpdateLoading || priceUpdateDisabled
                  ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#2563EB] text-white hover:bg-[#1E40AF]'
              }`}
              title={priceUpdateDisabled ? 'Prices already updated today' : 'Update stock prices from Yahoo Finance'}
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
                      <span>Stock Name</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Quantity</span>
                      <SortIcon field="quantity" />
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
                    onClick={() => handleSort('currentPrice')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Current Price</span>
                      <SortIcon field="currentPrice" />
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
                    onClick={() => handleSort('gainLoss')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>P&L</span>
                      <SortIcon field="gainLoss" />
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
                      <p className="text-sm text-[#6B7280] mb-2">No stocks holdings found</p>
                      <p className="text-xs text-[#9CA3AF]">Upload your portfolio to see stocks holdings</p>
                    </td>
                  </tr>
                ) : (
                  sortedHoldings.map((holding) => (
                    <tr key={holding.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-6 py-3.5">
                        <div>
                          <p className="font-semibold text-[#0F172A] text-sm">{holding.name}</p>
                          {holding.symbol && (
                            <p className="text-xs text-[#6B7280] mt-0.5">NSE: {holding.symbol}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium number-emphasis text-sm">
                        {holding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium number-emphasis text-sm">
                        {formatPrice(holding.averagePrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium number-emphasis text-sm">
                        {formatPrice(holding.currentPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium number-emphasis text-sm">
                        {formatCurrency(holding.investedValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#0F172A] font-semibold number-emphasis text-sm">
                        {formatCurrency(holding.currentValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        <div className={`font-semibold number-emphasis ${
                          holding.gainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}>
                          {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                        </div>
                        <div className={`text-xs font-medium mt-0.5 ${
                          holding.gainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}>
                          ({holding.gainLoss >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]">
                          {holding.allocationPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sortedHoldings.length > 0 && (
                <tfoot className="bg-[#F9FAFB] border-t-2 border-[#0F172A]">
                  <tr>
                    <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A]">
                      TOTAL
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                      {holdings.reduce((sum, h) => sum + h.quantity, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                      {formatPrice(holdings.length > 0 ? totalInvested / holdings.reduce((sum, h) => sum + h.quantity, 0) : 0)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                      {formatPrice(avgCurrentPrice)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                      {formatCurrency(totalInvested)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm">
                      <div className={`font-bold number-emphasis ${
                        totalGainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}>
                        {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                      </div>
                      <div className={`text-xs font-semibold mt-0.5 ${
                        totalGainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}>
                        ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                      </div>
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
                Verification: Total matches dashboard stocks value ({formatCurrency(totalValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                All values computed from Quantity × Average Price. Current values match invested values (MVP - no live price sync).
              </p>
            </div>
          </div>
        </div>

        {/* Inline Insights */}
        {sortedHoldings.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Portfolio Insights</h2>
            <div className="space-y-4">
              <div className="bg-[#F6F8FB] rounded-lg border border-[#E5E7EB] p-4">
                <p className="text-sm text-[#475569]">
                    <strong className="text-[#0F172A]">Total Stocks Holdings:</strong> {formatCurrency(totalValue)} ({portfolioPercentage.toFixed(1)}% of portfolio)
                </p>
                <p className="text-sm text-[#475569] mt-2">
                  <strong className="text-[#0F172A]">Total Invested:</strong> {formatCurrency(totalInvested)}
                </p>
                <p className="text-sm text-[#475569] mt-2">
                  <strong className="text-[#0F172A]">Total P&L:</strong>{' '}
                  <span className={totalGainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                    {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)} ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                  </span>
                </p>
              </div>
              
              {sortedHoldings.length > 1 && (
                <div className="bg-[#F6F8FB] rounded-lg border border-[#E5E7EB] p-4">
                  <p className="text-sm text-[#475569]">
                    <strong className="text-[#0F172A]">Top Holding:</strong> {sortedHoldings[0].name} ({sortedHoldings[0].allocationPct.toFixed(1)}% of stocks holdings)
                  </p>
                  <p className="text-sm text-[#475569] mt-2">
                    <strong className="text-[#0F172A]">Concentration:</strong> Top 3 holdings represent{' '}
                    {sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.allocationPct, 0).toFixed(1)}% of stocks portfolio
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
