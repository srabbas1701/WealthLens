/**
 * Enhanced Stocks Holdings Page with Add/Edit/Delete
 * 
 * Features:
 * - Add new stocks manually (no CSV needed)
 * - Edit existing stock holdings (quantity, buy price)
 * - Delete stocks with confirmation
 * - Minimal design changes - actions only visible on hover
 * - Clean slide-over modal for add/edit
 * - Confirmation dialog for delete
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { RefreshIcon } from '@/components/icons';
import { getAssetTotals } from '@/lib/portfolio-aggregation';

// Types
interface Stock {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  investedValue: number;
  currentPrice: number;
  currentValue: number;
  pl: number;
  plPercentage: number;
  allocation: number;
  sector?: string | null;
  priceDate?: string | null;
}

type GroupBy = 'none' | 'company' | 'sector';

export default function StocksHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const fetchingRef = useRef(false);
  
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  
  // Price update state
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateDisabled, setPriceUpdateDisabled] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    avgBuyPrice: '',
    purchaseDate: ''
  });

  // Fetch stocks data
  const fetchData = useCallback(async (userId: string) => {
    if (fetchingRef.current) {
      console.log('[Stocks Page] Skipping duplicate fetch');
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
          const equityHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Equity' || h.assetType === 'Stocks')
            .map((h: any) => {
              const currentValue = h.currentValue || h.investedValue;
              const currentPrice = h.quantity > 0 ? currentValue / h.quantity : 0;
              const pl = currentValue - h.investedValue;
              const plPercentage = h.investedValue > 0 
                ? (pl / h.investedValue) * 100 
                : 0;
              
              return {
                id: h.id,
                symbol: h.symbol || '',
                name: h.name,
                quantity: h.quantity,
                avgBuyPrice: h.averagePrice,
                investedValue: h.investedValue,
                currentPrice,
                currentValue,
                pl,
                plPercentage,
                allocation: h.allocationPct || 0,
                sector: h.sector || null,
                priceDate: h.priceDate || null,
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
          
          setStocks(equityHoldings);
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
      fetchingRef.current = false;
    }
  }, []);

  // Price update handler
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
          if (user?.id) {
            await fetchData(user.id);
          }
          setPriceUpdateDisabled(true);
        } else {
          console.error('Price update failed:', data.error);
          alert('Failed to update prices: ' + (data.error || 'Unknown error'));
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

  // Auth guard
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/stocks');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  // Handlers
  const handleAddStock = () => {
    setEditingStock(null);
    setFormData({ symbol: '', quantity: '', avgBuyPrice: '', purchaseDate: '' });
    setShowAddStockModal(true);
  };

  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock);
    setFormData({
      symbol: stock.symbol,
      quantity: stock.quantity.toString(),
      avgBuyPrice: stock.avgBuyPrice.toString(),
      purchaseDate: '' // Load from DB if stored
    });
    setShowAddStockModal(true);
  };

  const handleDeleteStock = (stock: Stock) => {
    setStockToDelete(stock);
    setShowDeleteConfirm(true);
  };

  const handleSaveStock = async () => {
    // Validation
    if (!formData.symbol || !formData.quantity || !formData.avgBuyPrice) {
      alert('Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      if (editingStock) {
        // UPDATE existing stock
        const response = await fetch('/api/stocks/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingStock.id,
            quantity: parseFloat(formData.quantity),
            avgBuyPrice: parseFloat(formData.avgBuyPrice),
            purchaseDate: formData.purchaseDate,
            user_id: user.id
          })
        });

        if (response.ok) {
          // Refresh data
          await fetchData(user.id);
          setShowAddStockModal(false);
        } else {
          const error = await response.json().catch(() => ({ error: 'Failed to update stock' }));
          alert(error.error || 'Failed to update stock');
        }
      } else {
        // CREATE new stock
        const response = await fetch('/api/stocks/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: formData.symbol.toUpperCase(),
            quantity: parseFloat(formData.quantity),
            avgBuyPrice: parseFloat(formData.avgBuyPrice),
            purchaseDate: formData.purchaseDate,
            user_id: user.id
          })
        });

        if (response.ok) {
          // Refresh data
          await fetchData(user.id);
          setShowAddStockModal(false);
        } else {
          const error = await response.json().catch(() => ({ error: 'Failed to create stock' }));
          alert(error.error || 'Failed to create stock');
        }
      }
    } catch (error) {
      console.error('Error saving stock:', error);
      alert('Failed to save stock. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (!stockToDelete || !user?.id) return;

    try {
      const response = await fetch(`/api/stocks/delete/${stockToDelete.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh data
        if (user?.id) {
          await fetchData(user.id);
        }
        setShowDeleteConfirm(false);
        setStockToDelete(null);
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to delete stock' }));
        alert(error.error || 'Failed to delete stock');
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      alert('Failed to delete stock. Please try again.');
    }
  };

  // Format price date
  const formatPriceDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Get most recent price date
  const mostRecentPriceDate = stocks
    .map(s => s.priceDate)
    .filter((date): date is string => date !== null && date !== undefined)
    .sort((a, b) => b.localeCompare(a))[0] || null;

  // Group holdings
  const groupedStocks = (() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Holdings', stocks }];
    }

    if (groupBy === 'company') {
      const groups = new Map<string, Stock[]>();
      stocks.forEach(s => {
        const companyName = s.name.split(' ')[0] || 'Other';
        if (!groups.has(companyName)) groups.set(companyName, []);
        groups.get(companyName)!.push(s);
      });
      return Array.from(groups.entries())
        .sort((a, b) => {
          const aTotal = a[1].reduce((sum, s) => sum + s.currentValue, 0);
          const bTotal = b[1].reduce((sum, s) => sum + s.currentValue, 0);
          return bTotal - aTotal;
        })
        .map(([key, stocks]) => ({
          key,
          label: key,
          stocks,
        }));
    }

    if (groupBy === 'sector') {
      const groups = new Map<string, Stock[]>();
      stocks.forEach(s => {
        const sector = s.sector || 'Other';
        if (!groups.has(sector)) groups.set(sector, []);
        groups.get(sector)!.push(s);
      });
      return Array.from(groups.entries())
        .sort((a, b) => {
          const aTotal = a[1].reduce((sum, s) => sum + s.currentValue, 0);
          const bTotal = b[1].reduce((sum, s) => sum + s.currentValue, 0);
          return bTotal - aTotal;
        })
        .map(([key, stocks]) => ({
          key,
          label: key,
          stocks,
        }));
    }

    return [{ key: 'all', label: 'All Holdings', stocks }];
  })();

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  // GUARD: Redirect if not authenticated
  if (authStatus === 'unauthenticated') {
    return null; // Redirect happens in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader 
          showBackButton={true}
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading stocks holdings...</p>
          </div>
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
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Stocks Holdings</h1>
            <div className="flex items-center gap-3">
              {/* ADD STOCK BUTTON */}
              <button 
                onClick={handleAddStock}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#10b981] dark:bg-[#10b981] text-white rounded-lg font-semibold hover:bg-[#059669] dark:hover:bg-[#059669] transition-colors"
              >
                <span className="text-lg">+</span>
                Add Stock
              </button>
              
              {/* Update Prices button */}
              <button
                onClick={handlePriceUpdate}
                disabled={priceUpdateLoading || priceUpdateDisabled}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  priceUpdateLoading || priceUpdateDisabled
                    ? 'bg-[#E5E7EB] dark:bg-[#334155] text-[#9CA3AF] dark:text-[#64748B] cursor-not-allowed'
                    : 'bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]'
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
          </div>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            {stocks.length} holding{stocks.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
            {mostRecentPriceDate && (
              <span className="ml-2 text-[#475569] dark:text-[#CBD5E1] font-medium">
                • Price as of {formatPriceDate(mostRecentPriceDate)}
              </span>
            )}
          </p>
        </div>

        {/* Group By Filters */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">Group by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'company', label: 'Company' },
                  { value: 'sector', label: 'Sector' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setGroupBy(option.value as GroupBy)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                      groupBy === option.value
                        ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white'
                        : 'bg-white dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F6F8FB] dark:hover:bg-[#334155]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stocks Table */}
        {groupedStocks.map((group) => (
          <div key={group.key} className="mb-6">
            {groupBy !== 'none' && (
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                {group.label}
              </h2>
            )}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9FAFB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Stock Name
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Avg Buy Price
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Invested Value
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Current Price
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Current Value
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        P&L
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                        Allocation %
                      </th>
                      <th className="w-24"></th> {/* Actions column */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                    {group.stocks.map((stock) => (
                      <tr 
                        key={stock.id} 
                        className="group hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{stock.name}</div>
                            <div className="text-sm text-[#6B7280] dark:text-[#94A3B8]">NSE: {stock.symbol}</div>
                          </div>
                        </td>
                        <td className="text-right px-6 py-4 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {stock.quantity.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right px-6 py-4 text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(stock.avgBuyPrice)}
                        </td>
                        <td className="text-right px-6 py-4 text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(stock.investedValue)}
                        </td>
                        <td className="text-right px-6 py-4 text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(stock.currentPrice)}
                        </td>
                        <td className="text-right px-6 py-4 text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(stock.currentValue)}
                        </td>
                        <td className="text-right px-6 py-4">
                          <div className={stock.pl >= 0 ? 'text-[#10b981] dark:text-[#10b981]' : 'text-[#DC2626] dark:text-red-400'}>
                            <div className="font-semibold">
                              {stock.pl >= 0 ? '+' : ''}{formatCurrency(stock.pl)}
                            </div>
                            <div className="text-sm">
                              ({stock.pl >= 0 ? '+' : ''}{stock.plPercentage.toFixed(2)}%)
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-6 py-4 text-[#6B7280] dark:text-[#94A3B8]">
                          {stock.allocation.toFixed(1)}%
                        </td>
                        
                        {/* ACTIONS COLUMN - only visible on hover */}
                        <td className="text-right px-6 py-4">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2">
                            {/* Edit Button */}
                            <button 
                              onClick={() => handleEditStock(stock)}
                              className="p-2 hover:bg-[#2563EB]/10 dark:hover:bg-[#3B82F6]/10 rounded-lg transition-colors"
                              title="Edit stock"
                            >
                              <svg className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeleteStock(stock)}
                              className="p-2 hover:bg-[#DC2626]/10 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete stock"
                            >
                              <svg className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#DC2626] dark:hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

      </main>

      {/* ADD/EDIT STOCK MODAL */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddStockModal(false)}
          />
          
          {/* Slide-over panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#1E293B] border-l border-[#E5E7EB] dark:border-[#334155] shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155]">
              <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {editingStock ? 'Edit Stock' : 'Add Stock'}
              </h2>
              <button 
                onClick={() => setShowAddStockModal(false)}
                className="p-2 hover:bg-[#F6F8FB] dark:hover:bg-[#334155] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-140px)]">
              
              {/* Stock Symbol */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Stock Symbol <span className="text-[#DC2626] dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., HDFCBANK"
                  disabled={!!editingStock}
                  className="w-full px-4 py-3 bg-[#F6F8FB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#6B7280] dark:placeholder:text-[#94A3B8] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.symbol}
                  onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                />
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  NSE symbol {editingStock && '(cannot be changed)'}
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Quantity <span className="text-[#DC2626] dark:text-red-400">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 100"
                  className="w-full px-4 py-3 bg-[#F6F8FB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>

              {/* Average Buy Price */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Average Buy Price (₹) <span className="text-[#DC2626] dark:text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 1500.50"
                  className="w-full px-4 py-3 bg-[#F6F8FB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                  value={formData.avgBuyPrice}
                  onChange={(e) => setFormData({...formData, avgBuyPrice: e.target.value})}
                />
              </div>

              {/* Auto-calculated preview */}
              {formData.quantity && formData.avgBuyPrice && (
                <div className="bg-[#F6F8FB] dark:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Invested Value:</span>
                    <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {formatCurrency(parseFloat(formData.quantity) * parseFloat(formData.avgBuyPrice))}
                    </span>
                  </div>
                </div>
              )}

              {/* Purchase Date (optional) */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Purchase Date (Optional)
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-[#F6F8FB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                />
              </div>

            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex gap-3">
              <button
                onClick={() => setShowAddStockModal(false)}
                className="flex-1 px-6 py-3 bg-[#F6F8FB] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg font-semibold hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStock}
                disabled={!formData.symbol || !formData.quantity || !formData.avgBuyPrice}
                className="flex-1 px-6 py-3 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg font-semibold hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingStock ? 'Update Stock' : 'Add Stock'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && stockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          
          {/* Dialog */}
          <div className="relative bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 dark:bg-red-400/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-[#DC2626] dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Content */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Delete {stockToDelete.name}?
              </h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                This will permanently remove <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{stockToDelete.quantity} shares</strong> of {stockToDelete.name} from your portfolio. 
                This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-[#F6F8FB] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg font-semibold hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-[#DC2626] dark:bg-red-500 text-white rounded-lg font-semibold hover:bg-[#B91C1C] dark:hover:bg-red-600 transition-colors"
              >
                Delete Stock
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
