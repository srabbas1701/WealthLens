/**
 * Enhanced Stocks Holdings Page with Add/Edit/Delete
 * 
 * Features:
 * - Add new stocks manually (no CSV needed)
 * - Edit existing stock holdings (quantity, buy price)
 * - Delete stocks with confirmation
 * - Minimal design changes - actions only visible on hover
 * - Centered modals for add/edit
 * - Confirmation dialog for delete
 * - Stock search autocomplete
 * - Toast notifications
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import OnboardingQueueBanner from '@/components/OnboardingQueueBanner';
import { readQueue } from '@/lib/onboarding-queue';
import { RefreshIcon } from '@/components/icons';
import { getAssetTotals } from '@/lib/portfolio-aggregation';
import { useToast } from '@/components/Toast';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import { generateStocksPDF } from '@/lib/pdf/generateStocksPDF';
import PremiumDownloadModal from '@/components/PremiumDownloadModal';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { getCachedPortfolioData, setCachedPortfolioData, isCacheStale } from '@/lib/portfolio-cache';

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
  const searchParams = useSearchParams();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { showToast } = useToast();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const fetchingRef = useRef(false);
  
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [hasAddedOneInQueue, setHasAddedOneInQueue] = useState(false);
  
  // Price update state
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateDisabled, setPriceUpdateDisabled] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    quantity: '',
    avgBuyPrice: '',
    purchaseDate: ''
  });
  
  // Stock search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch stocks data
  const fetchData = useCallback(async (userId: string, silentRefresh = false) => {
    if (fetchingRef.current) {
      console.log('[Stocks Page] Skipping duplicate fetch');
      return;
    }

    fetchingRef.current = true;
    if (!silentRefresh) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;

          // Cache the portfolio data for other pages
          setCachedPortfolioData(userId, portfolioData);
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
          showToast({
            type: 'error',
            title: 'Price Update Failed',
            message: data.error || 'Unknown error',
            duration: 7000,
          });
        }
      } else {
        throw new Error('Failed to update prices');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      showToast({
        type: 'error',
        title: 'Price Update Error',
        message: 'Error updating prices. Please try again.',
        duration: 7000,
      });
    } finally {
      setPriceUpdateLoading(false);
    }
  }, [priceUpdateLoading, priceUpdateDisabled, user?.id, fetchData, showToast]);

  // Auth guard
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/stocks');
    }
  }, [authStatus, router]);

  // Open add modal when navigated with ?add=1 (e.g. from Add Holding or onboarding)
  useEffect(() => {
    if (searchParams?.get('add') === '1' && user?.id) {
      setShowAddStockModal(true);
      const fromOnboarding = searchParams?.get('from') === 'onboarding';
      router.replace(`/portfolio/stocks${fromOnboarding ? '?from=onboarding' : ''}`, { scroll: false });
    }
  }, [searchParams, user?.id, router]);

  useEffect(() => {
    if (user?.id) {
      // Try cache first for instant load
      const cached = getCachedPortfolioData<any>(user.id);

      if (cached) {
        // Process cached data immediately (no loading screen)
        try {
          const portfolioData = cached;
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
          setLoading(false);

          // Refresh in background if stale
          if (isCacheStale(user.id)) {
            fetchData(user.id, true);
          }
        } catch (error) {
          console.error('Failed to process cached data:', error);
          fetchData(user.id);
        }
      } else {
        // No cache, fetch fresh
        fetchData(user.id);
      }
    }
  }, [user?.id, fetchData]);

  // Stock search handler
  const handleStockSearch = async (query: string) => {
    setFormData({ ...formData, name: query });
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    if (query.length < 2) {
      setShowSearchResults(false);
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Select stock from search results
  const selectStock = (stock: any) => {
    setFormData({ 
      ...formData, 
      name: stock.name, 
      symbol: stock.symbol 
    });
    setShowSearchResults(false);
  };

  // Handlers
  const handleAddStock = () => {
    setSelectedStock(null);
    setFormData({ name: '', symbol: '', quantity: '', avgBuyPrice: '', purchaseDate: new Date().toISOString().split('T')[0] });
    setSearchResults([]);
    setShowSearchResults(false);
    setShowAddStockModal(true);
  };

  const handleEditStock = (stock: Stock) => {
    setSelectedStock(stock);
    setFormData({
      name: stock.name,
      symbol: stock.symbol,
      quantity: stock.quantity.toString(),
      avgBuyPrice: stock.avgBuyPrice.toString(),
      purchaseDate: ''
    });
    setShowEditModal(true);
  };

  const handleDeleteStock = (stock: Stock) => {
    setStockToDelete(stock);
    setShowDeleteConfirm(true);
  };

  const handleAddStockSubmit = async (stockData: {
    name: string;
    symbol: string;
    quantity: number;
    avgBuyPrice: number;
    purchaseDate?: string;
  }) => {
    setIsLoading(true);
    
    try {
      if (!user?.id) {
        showToast({
          type: 'error',
          title: 'Authentication Error',
          message: 'User not authenticated',
          duration: 7000,
        });
        return;
      }

      const response = await fetch('/api/stocks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stockData.symbol.toUpperCase(),
          quantity: stockData.quantity,
          avgBuyPrice: stockData.avgBuyPrice,
          purchaseDate: stockData.purchaseDate,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add stock' }));
        throw new Error(error.error || 'Failed to add stock');
      }
      
      // Refresh data
      await fetchData(user.id);
      setShowAddStockModal(false);
      setFormData({ name: '', symbol: '', quantity: '', avgBuyPrice: '', purchaseDate: '' });
      
      showToast({
        type: 'success',
        title: 'Stock Added',
        message: `${stockData.name} has been added successfully.`,
        duration: 5000,
      });

      if (user?.id) {
        const q = readQueue(user.id);
        if (q && q.current === 'stocks') setHasAddedOneInQueue(true);
      }

    } catch (error: any) {
      console.error('Error adding stock:', error);
      showToast({
        type: 'error',
        title: 'Failed to Add Stock',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStockSubmit = async (stockData: {
    quantity: number;
    avgBuyPrice: number;
  }) => {
    if (!selectedStock || !user?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/stocks/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStock.id,
          quantity: stockData.quantity,
          avgBuyPrice: stockData.avgBuyPrice,
          purchaseDate: formData.purchaseDate,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update stock' }));
        throw new Error(error.error || 'Failed to update stock');
      }
      
      // Refresh data
      await fetchData(user.id);
      setShowEditModal(false);
      setSelectedStock(null);
      
      showToast({
        type: 'success',
        title: 'Stock Updated',
        message: `${selectedStock.name} has been updated successfully.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error updating stock:', error);
      showToast({
        type: 'error',
        title: 'Failed to Update Stock',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStockConfirm = async () => {
    if (!stockToDelete || !user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/stocks/delete/${stockToDelete.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete stock' }));
        throw new Error(error.error || 'Failed to delete stock');
      }

      // Refresh data
      await fetchData(user.id);
      setShowDeleteConfirm(false);
      const deletedName = stockToDelete.name;
      setStockToDelete(null);
      
      showToast({
        type: 'success',
        title: 'Stock Deleted',
        message: `${deletedName} has been removed from your portfolio.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error deleting stock:', error);
      showToast({
        type: 'error',
        title: 'Failed to Delete Stock',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
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

  // Download handler: use hasCapability (never check plan === premium)
  const handleDownload = useCallback(async () => {
    if (capabilitiesLoading) {
      showToast({
        type: 'info',
        title: 'Loading...',
        message: 'Please wait while we check your access.',
        duration: 3000,
      });
      return;
    }
    if (!hasCapability(FEATURE_ACCESS.DOWNLOAD.capability)) {
      setShowPremiumModal(true);
      return;
    }

    try {
      if (!stocks || stocks.length === 0) {
        showToast({
          type: 'warning',
          title: 'No Data',
          message: 'No stocks holdings available to download.',
          duration: 5000,
        });
        return;
      }
      
      // Convert stocks to PDF format (excluding Actions column)
      const pdfData = stocks.map(stock => ({
        name: stock.name,
        symbol: stock.symbol,
        quantity: stock.quantity,
        avgBuyPrice: stock.avgBuyPrice,
        investedValue: stock.investedValue,
        currentPrice: stock.currentPrice,
        currentValue: stock.currentValue,
        pl: stock.pl,
        plPercentage: stock.plPercentage,
        allocation: stock.allocation,
      }));

      await generateStocksPDF({
        stocks: pdfData,
        totalValue,
        totalInvested,
        portfolioPercentage,
        priceDate: mostRecentPriceDate,
        formatCurrency,
      });

      showToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: 'Your stocks holdings report has been downloaded successfully.',
        duration: 5000,
      });
    } catch (error) {
      console.error('[Download] Error generating PDF:', error);
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
        duration: 5000,
      });
    }
  }, [stocks, totalValue, totalInvested, portfolioPercentage, mostRecentPriceDate, formatCurrency, showToast, hasCapability, capabilitiesLoading]);

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

  const fromOnboarding = searchParams?.get('from') === 'onboarding';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader 
          showBackButton={true}
          backHref={fromOnboarding ? '/onboarding/select?step=add-details' : '/dashboard'}
          backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
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
        backHref={fromOnboarding ? '/onboarding/select?step=add-details' : '/dashboard'}
          backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
          showDownload={true}
          downloadLabel="Download Stocks"
        onDownload={() => {
          console.log('[Stocks Page] Direct handler called');
          handleDownload();
        }}
      />
      {fromOnboarding && user?.id && (
        <OnboardingQueueBanner userId={user.id} hasAddedOne={hasAddedOneInQueue} />
      )}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
        
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Stocks Holdings</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* ADD STOCK - navigates to add page */}
              <Link
                href="/portfolio/stocks/add"
                className="inline-flex items-center justify-center gap-2 p-2.5 md:px-5 md:py-2.5 md:min-w-[140px] bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm min-w-[44px] min-h-[44px]"
                title="Add Stock"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">Add Stock</span>
              </Link>
              {/* ADD HOLDING - hub for FD, bonds, MF, etc. */}
              <Link
                href="/portfolio/holdings/add"
                className="inline-flex items-center justify-center gap-2 p-2.5 md:px-4 md:py-2.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors font-medium text-sm md:text-base min-w-[44px] min-h-[44px]"
                title="Add Holding"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">Add Holding</span>
              </Link>
              
              {/* Update Prices button */}
              <button
                onClick={handlePriceUpdate}
                disabled={priceUpdateLoading || priceUpdateDisabled}
                className={`inline-flex items-center justify-center gap-2 p-2.5 md:px-5 md:py-2.5 md:min-w-[140px] min-w-[44px] min-h-[44px] rounded-lg font-semibold text-sm transition-colors ${
                  priceUpdateLoading || priceUpdateDisabled
                    ? 'bg-[#E5E7EB] dark:bg-[#334155] text-[#9CA3AF] dark:text-[#64748B] cursor-not-allowed'
                    : 'bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]'
                }`}
                title={priceUpdateDisabled ? 'Prices already updated today' : 'Update stock prices from Yahoo Finance'}
              >
                <RefreshIcon 
                  className={`w-5 h-5 shrink-0 ${priceUpdateLoading ? 'animate-spin' : ''}`} 
                />
                <span className="hidden md:inline">
                  {priceUpdateLoading 
                    ? 'Updating...' 
                    : priceUpdateDisabled 
                      ? 'Updated Today' 
                      : 'Update Prices'}
                </span>
              </button>
            </div>
          </div>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] break-words">
            {stocks.length} holding{stocks.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
            {mostRecentPriceDate && (
              <span className="ml-0 sm:ml-2 block sm:inline text-[#475569] dark:text-[#CBD5E1] font-medium">
                • Price as of {formatPriceDate(mostRecentPriceDate)}
              </span>
            )}
          </p>
        </div>

        {/* Group By Filters */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">Group by:</span>
              <div className="flex flex-wrap gap-2">
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

        {/* Stocks - Mobile Card Layout */}
        {groupedStocks.map((group) => (
          <div key={`mobile-${group.key}`} className="mb-6 md:hidden">
            {groupBy !== 'none' && (
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                {group.label}
              </h2>
            )}
            <div className="space-y-3">
              {group.stocks.map((stock) => (
                <div
                  key={stock.id}
                  className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">{stock.name}</div>
                      <div className="text-sm text-[#6B7280] dark:text-[#94A3B8]">NSE: {stock.symbol}</div>
                    </div>
                    <div className={`font-semibold ${stock.pl >= 0 ? 'text-[#10b981] dark:text-[#10b981]' : 'text-[#DC2626] dark:text-red-400'}`}>
                      {stock.pl >= 0 ? '+' : ''}{formatCurrency(stock.pl)}
                      <span className="text-sm font-medium ml-1">({stock.pl >= 0 ? '+' : ''}{stock.plPercentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Qty</span>
                      <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{stock.quantity.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Invested</span>
                      <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(stock.investedValue)}</div>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Current</span>
                      <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(stock.currentValue)}</div>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Allocation</span>
                      <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{stock.allocation.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#334155]">
                    <button
                      onClick={() => handleEditStock(stock)}
                      className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      title="Edit holding"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStock(stock)}
                      className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete holding"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Stocks Table - Desktop */}
        {groupedStocks.map((group) => (
          <div key={group.key} className="mb-6 hidden md:block">
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
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider w-20">
                        Actions
                      </th>
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
                        
                        {/* ACTIONS COLUMN - visible on mobile, hover-only on desktop */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditStock(stock)}
                              className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center hover:bg-primary/10 text-primary rounded-lg transition-colors"
                              title="Edit holding"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteStock(stock)}
                              className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                              title="Delete holding"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* ADD STOCK MODAL */}
      {showAddStockModal && (
        <AddStockModal
          onClose={() => {
            if (fromOnboarding) {
              router.replace('/onboarding/select?step=add-details');
              return;
            }
            setShowAddStockModal(false);
            setFormData({ name: '', symbol: '', quantity: '', avgBuyPrice: '', purchaseDate: '' });
            setSearchResults([]);
            setShowSearchResults(false);
          }}
          onSave={handleAddStockSubmit}
          formData={formData}
          setFormData={setFormData}
          searchResults={searchResults}
          showSearchResults={showSearchResults}
          isSearching={isSearching}
          onSearch={handleStockSearch}
          onSelectStock={selectStock}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* EDIT STOCK MODAL */}
      {showEditModal && selectedStock && (
        <EditStockModal
          stock={selectedStock}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStock(null);
          }}
          onSave={handleEditStockSubmit}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && stockToDelete && (
        <DeleteConfirmationDialog
          stock={stockToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setStockToDelete(null);
          }}
          onConfirm={handleDeleteStockConfirm}
          isLoading={isLoading}
        />
      )}

      {/* PREMIUM DOWNLOAD MODAL */}
      <PremiumDownloadModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

    </div>
  );
}

/**
 * Add Stock Modal Component
 * Allows user to search for and add a new stock holding
 */
function AddStockModal({ 
  onClose, 
  onSave,
  formData,
  setFormData,
  searchResults,
  showSearchResults,
  isSearching,
  onSearch,
  onSelectStock,
  isLoading,
  formatCurrency
}: { 
  onClose: () => void; 
  onSave: (data: any) => void;
  formData: any;
  setFormData: any;
  searchResults: any[];
  showSearchResults: boolean;
  isSearching: boolean;
  onSearch: (query: string) => void;
  onSelectStock: (stock: any) => void;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.quantity || !formData.avgBuyPrice) {
      return;
    }
    
    if (parseFloat(formData.quantity) <= 0) {
      return;
    }
    
    if (parseFloat(formData.avgBuyPrice) <= 0) {
      return;
    }
    
    // Call parent handler
    onSave({
      name: formData.name,
      symbol: formData.symbol || formData.name,
      quantity: parseFloat(formData.quantity),
      avgBuyPrice: parseFloat(formData.avgBuyPrice),
      purchaseDate: formData.purchaseDate
    });
  };

  // Calculate invested value
  const investedValue = formData.quantity && formData.avgBuyPrice
    ? parseFloat(formData.quantity) * parseFloat(formData.avgBuyPrice)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155] sticky top-0 bg-white dark:bg-[#1E293B]">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Add Stock Holding</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F6F8FB] dark:hover:bg-[#334155] rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Stock Name with Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Stock Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search for stock (e.g., HDFC Bank)"
                className="w-full px-4 py-3 pr-10 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
                required
                autoComplete="off"
              />
              <Search className="absolute right-3 top-3.5 w-5 h-5 text-[#9CA3AF] dark:text-[#64748B]" />
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((stock, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectStock(stock)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors border-b border-[#E5E7EB] dark:border-[#334155] last:border-0"
                  >
                    <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{stock.name}</div>
                    <div className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{stock.symbol}</div>
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">Searching...</div>
            )}
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="NSE:HDFCBANK or BSE:500180"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
            />
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
              Format: NSE:SYMBOL or BSE:SYMBOL
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="100"
              min="1"
              step="1"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
              required
            />
          </div>

          {/* Average Buy Price */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Average Buy Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.avgBuyPrice}
              onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
              placeholder="750.50"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
              required
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Purchase Date (Optional)
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          {/* Calculated Invested Value */}
          {investedValue > 0 && (
            <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 border border-[#BFDBFE] dark:border-[#1E40AF] rounded-lg p-4">
              <div className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-1">Invested Value</div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {formatCurrency(investedValue)}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary-standard"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.quantity || !formData.avgBuyPrice}
              className="flex-1 px-6 py-3 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/**
 * Edit Stock Modal Component
 * Allows user to edit quantity and average buy price of existing holding
 */
function EditStockModal({ 
  stock, 
  onClose, 
  onSave,
  formData,
  setFormData,
  isLoading,
  formatCurrency
}: { 
  stock: Stock; 
  onClose: () => void; 
  onSave: (data: any) => void;
  formData: any;
  setFormData: any;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (parseFloat(formData.quantity) <= 0) {
      return;
    }
    
    if (parseFloat(formData.avgBuyPrice) <= 0) {
      return;
    }
    
    onSave({
      quantity: parseFloat(formData.quantity),
      avgBuyPrice: parseFloat(formData.avgBuyPrice)
    });
  };

  // Calculate new invested value
  const newInvestedValue = formData.quantity && formData.avgBuyPrice
    ? parseFloat(formData.quantity) * parseFloat(formData.avgBuyPrice)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Edit Stock Holding</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Stock Info (Read-only) */}
          <div className="bg-accent border border-border rounded-lg p-4">
            <div className="font-semibold text-foreground text-lg">{stock.name}</div>
            <div className="text-sm text-muted-foreground">{stock.symbol}</div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              min="1"
              step="1"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              autoFocus
            />
          </div>

          {/* Average Buy Price */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Average Buy Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.avgBuyPrice}
              onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          {/* New Invested Value */}
          {newInvestedValue > 0 && (
            <div className="bg-accent border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">New Invested Value</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(newInvestedValue)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Previous: {formatCurrency(stock.investedValue)}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors font-semibold"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/**
 * Delete Confirmation Dialog Component
 * Shows confirmation before deleting a stock holding
 */
function DeleteConfirmationDialog({ 
  stock, 
  onClose, 
  onConfirm,
  isLoading
}: { 
  stock: Stock; 
  onClose: () => void; 
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        
        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Delete Stock Holding?
          </h2>
          
          {/* Description */}
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete{' '}
            <strong className="text-foreground">{stock.name}</strong>?{' '}
            This will remove{' '}
            <strong className="text-foreground">
              {stock.quantity.toLocaleString('en-IN')} shares
            </strong>{' '}
            with invested value of{' '}
            <strong className="text-foreground">
              ₹{stock.investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </strong>.
          </p>

          {/* Warning */}
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
            <p className="text-sm text-foreground">
              <strong>Warning:</strong> This action cannot be undone. You'll need to add 
              this stock again manually or re-upload your CSV if you change your mind.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete Stock'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
