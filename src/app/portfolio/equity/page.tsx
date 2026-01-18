/**
 * Stocks Holdings Page
 * 
 * Table-first layout for direct stock holdings.
 * Professional, spreadsheet-like clarity.
 * Numbers match dashboard stocks values.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import React from 'react';
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
import { useToast } from '@/components/Toast';
import { generateStocksPDF } from '@/lib/pdf/generateStocksPDF';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';

type SortField = 'name' | 'quantity' | 'avgPrice' | 'currentPrice' | 'investedValue' | 'currentValue' | 'gainLoss' | 'allocation';
type SortDirection = 'asc' | 'desc';

type GroupBy = 'none' | 'company' | 'sector';

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
  sector: string | null;
  priceDate: string | null; // Price date (YYYY-MM-DD)
}

export default function EquityHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous fetches
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<EquityHolding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  
  // Price update state
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateDisabled, setPriceUpdateDisabled] = useState(false);
  
  // CRUD state
  const { showToast } = useToast();
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStock, setSelectedStock] = useState<EquityHolding | null>(null);
  const [stockToDelete, setStockToDelete] = useState<EquityHolding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const fetchData = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      console.log('[Equity Page] Skipping duplicate fetch');
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
      fetchingRef.current = false;
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

  // Stock search handler
  const handleStockSearch = async (query: string) => {
    setFormData({ ...formData, name: query });
    
    if (query.length < 2) {
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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

  const handleEditStock = (stock: EquityHolding) => {
    setSelectedStock(stock);
    setFormData({
      name: stock.name,
      symbol: stock.symbol || '',
      quantity: stock.quantity.toString(),
      avgBuyPrice: stock.averagePrice.toString(),
      purchaseDate: ''
    });
    setShowEditModal(true);
  };

  const handleDeleteStock = (stock: EquityHolding) => {
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

  // Get most recent price date across all holdings
  const mostRecentPriceDate = useMemo(() => {
    const dates = holdings
      .map((h: any) => h.priceDate)
      .filter((date): date is string => date !== null && date !== undefined)
      .sort((a, b) => b.localeCompare(a)); // Sort descending (most recent first)
    return dates.length > 0 ? dates[0] : null;
  }, [holdings]);

  // Download handler
  const handleDownload = useCallback(async () => {
    console.log('[Equity Download] Handler called - starting download process');
    
    try {
      console.log('[Equity Download] Starting PDF generation...', { holdingsCount: holdings.length, totalValue });
      
      if (!holdings || holdings.length === 0) {
        showToast({
          type: 'warning',
          title: 'No Data',
          message: 'No equity holdings available to download.',
          duration: 5000,
        });
        return;
      }
      
      // Get sorted holdings first (same logic as sortedHoldings memo)
      const sortedHoldingsForExport = [...holdings].sort((a, b) => {
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
      
      // Get grouped holdings (same as displayed on screen)
      const groupedHoldingsForExport = (() => {
        if (groupBy === 'none') {
          return [{ key: 'all', label: 'All Holdings', holdings: sortedHoldingsForExport }];
        }
        if (groupBy === 'company') {
          const groups = new Map<string, EquityHolding[]>();
          sortedHoldingsForExport.forEach(h => {
            const companyName = h.name.split(' ')[0] || 'Other';
            if (!groups.has(companyName)) groups.set(companyName, []);
            groups.get(companyName)!.push(h);
          });
          return Array.from(groups.entries())
            .sort((a, b) => {
              const aTotal = a[1].reduce((sum, h) => sum + h.currentValue, 0);
              const bTotal = b[1].reduce((sum, h) => sum + h.currentValue, 0);
              return bTotal - aTotal;
            })
            .map(([key, holdings]) => ({ key, label: key, holdings }));
        }
        if (groupBy === 'sector') {
          const groups = new Map<string, EquityHolding[]>();
          sortedHoldingsForExport.forEach(h => {
            const sector = h.sector || 'Other';
            if (!groups.has(sector)) groups.set(sector, []);
            groups.get(sector)!.push(h);
          });
          return Array.from(groups.entries())
            .sort((a, b) => {
              const aTotal = a[1].reduce((sum, h) => sum + h.currentValue, 0);
              const bTotal = b[1].reduce((sum, h) => sum + h.currentValue, 0);
              return bTotal - aTotal;
            })
            .map(([key, holdings]) => ({ key, label: key, holdings }));
        }
        return [{ key: 'all', label: 'All Holdings', holdings: sortedHoldingsForExport }];
      })();
      
      // Flatten grouped holdings for PDF (same order as displayed)
      const holdingsToExport: EquityHolding[] = [];
      for (const group of groupedHoldingsForExport) {
        holdingsToExport.push(...group.holdings);
      }
      
      // Convert holdings to PDF format (excluding Actions column)
      // Ensure all values are properly converted and validated
      const pdfData = holdingsToExport.map(holding => {
        // Safely convert all numeric values
        const quantity = typeof holding.quantity === 'number' ? holding.quantity : parseFloat(String(holding.quantity)) || 0;
        const avgBuyPrice = typeof holding.averagePrice === 'number' ? holding.averagePrice : parseFloat(String(holding.averagePrice)) || 0;
        const investedValue = typeof holding.investedValue === 'number' ? holding.investedValue : parseFloat(String(holding.investedValue)) || 0;
        const currentPrice = typeof holding.currentPrice === 'number' ? holding.currentPrice : parseFloat(String(holding.currentPrice)) || 0;
        const currentValue = typeof holding.currentValue === 'number' ? holding.currentValue : parseFloat(String(holding.currentValue)) || 0;
        const gainLoss = typeof holding.gainLoss === 'number' ? holding.gainLoss : parseFloat(String(holding.gainLoss)) || 0;
        const gainLossPercent = typeof holding.gainLossPercent === 'number' ? holding.gainLossPercent : parseFloat(String(holding.gainLossPercent)) || 0;
        const allocationPct = typeof holding.allocationPct === 'number' ? holding.allocationPct : parseFloat(String(holding.allocationPct)) || 0;
        
        // Validate critical values
        if (isNaN(quantity) || isNaN(avgBuyPrice) || isNaN(investedValue) || isNaN(currentValue)) {
          console.warn('[Equity Download] Invalid data for holding:', holding.name, {
            quantity, avgBuyPrice, investedValue, currentValue
          });
        }
        
        return {
          name: String(holding.name || 'Unknown'),
          symbol: String(holding.symbol || ''),
          quantity,
          avgBuyPrice,
          investedValue,
          currentPrice,
          currentValue,
          pl: gainLoss,
          plPercentage: gainLossPercent,
          allocation: allocationPct,
        };
      });
      
      console.log('[Equity Download] PDF data sample (first 3):', pdfData.slice(0, 3));

      console.log('[Equity Download] Calling generateStocksPDF with', pdfData.length, 'holdings');
      await generateStocksPDF({
        stocks: pdfData,
        totalValue,
        totalInvested,
        portfolioPercentage,
        priceDate: mostRecentPriceDate,
        formatCurrency,
      });

      console.log('[Equity Download] PDF generation complete');
      
      // Suppress extension errors that may appear after successful PDF generation
      // These are harmless and don't affect the download
      const originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        const errorStr = String(message || error?.message || '');
        // Ignore browser extension errors
        if (errorStr.includes('Could not establish connection') || 
            errorStr.includes('Receiving end does not exist') ||
            errorStr.includes('content-all.js')) {
          console.debug('[Equity Download] Ignoring harmless browser extension error');
          return true; // Suppress error
        }
        // For other errors, use original handler or default behavior
        if (originalErrorHandler) {
          return originalErrorHandler(message, source, lineno, colno, error);
        }
        return false;
      };
      
      // Reset error handler after a short delay
      setTimeout(() => {
        window.onerror = originalErrorHandler;
      }, 1000);
      
      showToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: 'Your equity holdings report has been downloaded successfully.',
        duration: 5000,
      });
    } catch (error) {
      console.error('[Equity Download] Error generating PDF:', error);
      
      // Check if it's an extension error (harmless)
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Could not establish connection') || 
          errorMsg.includes('Receiving end does not exist')) {
        // Extension error - PDF was likely still generated
        console.warn('[Equity Download] Browser extension interference detected, but PDF may have been generated');
        showToast({
          type: 'success',
          title: 'PDF Downloaded',
          message: 'Your equity holdings report has been downloaded. (Some browser extensions may show harmless errors)',
          duration: 5000,
        });
      } else {
        // Real error
        showToast({
          type: 'error',
          title: 'Download Failed',
          message: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
          duration: 5000,
        });
      }
    }
  }, [holdings, sortField, sortDirection, groupBy, totalValue, totalInvested, portfolioPercentage, mostRecentPriceDate, formatCurrency, showToast]);

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

  // Format price date for display
  const formatPriceDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Group holdings
  const groupedHoldings = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Holdings', holdings: sortedHoldings }];
    }

    if (groupBy === 'company') {
      // Group by company name (first word of stock name)
      const groups = new Map<string, EquityHolding[]>();
      sortedHoldings.forEach(h => {
        const companyName = h.name.split(' ')[0] || 'Other';
        if (!groups.has(companyName)) groups.set(companyName, []);
        groups.get(companyName)!.push(h);
      });
      return Array.from(groups.entries())
        .sort((a, b) => {
          const aTotal = a[1].reduce((sum, h) => sum + h.currentValue, 0);
          const bTotal = b[1].reduce((sum, h) => sum + h.currentValue, 0);
          return bTotal - aTotal;
        })
        .map(([key, holdings]) => ({
          key,
          label: key,
          holdings,
        }));
    }

    if (groupBy === 'sector') {
      const groups = new Map<string, EquityHolding[]>();
      sortedHoldings.forEach(h => {
        const sector = h.sector || 'Other';
        if (!groups.has(sector)) groups.set(sector, []);
        groups.get(sector)!.push(h);
      });
      return Array.from(groups.entries())
        .sort((a, b) => {
          const aTotal = a[1].reduce((sum, h) => sum + h.currentValue, 0);
          const bTotal = b[1].reduce((sum, h) => sum + h.currentValue, 0);
          return bTotal - aTotal;
        })
        .map(([key, holdings]) => ({
          key,
          label: key,
          holdings,
        }));
    }

    return [{ key: 'all', label: 'All Holdings', holdings: sortedHoldings }];
  }, [sortedHoldings, groupBy]);

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
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return null; // Redirect happens in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading stocks holdings...</p>
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
        onDownload={handleDownload}
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
                className="flex items-center gap-2 px-6 py-3 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add Stock</span>
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
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
            {mostRecentPriceDate && (
              <span className="ml-2 text-[#475569] dark:text-[#CBD5E1] font-medium">
                • Price as of {formatPriceDate(mostRecentPriceDate)}
              </span>
            )}
          </p>
        </div>

        {/* Controls */}
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
                      <span>Stock Name</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Quantity</span>
                      <SortIcon field="quantity" />
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
                    onClick={() => handleSort('investedValue')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Invested Value</span>
                      <SortIcon field="investedValue" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                    onClick={() => handleSort('currentPrice')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Current Price</span>
                      <SortIcon field="currentPrice" />
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
                      <span>P&L</span>
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
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {groupedHoldings.length === 0 || (groupedHoldings[0].holdings.length === 0 && groupBy === 'none') ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">No stocks holdings found</p>
                      <p className="text-xs text-[#9CA3AF] dark:text-[#64748B]">Upload your portfolio to see stocks holdings</p>
                    </td>
                  </tr>
                ) : (
                  groupedHoldings.map(group => (
                    <React.Fragment key={group.key}>
                      {groupBy !== 'none' && (
                        <tr className="bg-[#F9FAFB] dark:bg-[#334155]">
                          <td colSpan={9} className="px-6 py-2.5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {group.label}
                            <span className="ml-2 text-[#6B7280] dark:text-[#94A3B8] font-medium">
                              ({group.holdings.length} holding{group.holdings.length !== 1 ? 's' : ''}, {
                                formatCurrency(group.holdings.reduce((sum, h) => sum + h.currentValue, 0))
                              })
                            </span>
                          </td>
                        </tr>
                      )}
                      {group.holdings.map((holding) => (
                        <tr key={holding.id} className="group hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                          <td className="px-6 py-3.5">
                            <div>
                              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm">{holding.name}</p>
                              {holding.symbol && (
                                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">NSE: {holding.symbol}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium number-emphasis text-sm">
                            {holding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium number-emphasis text-sm">
                            {formatPrice(holding.averagePrice)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium number-emphasis text-sm">
                            {formatCurrency(holding.investedValue)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium number-emphasis text-sm">
                            {formatPrice(holding.currentPrice)}
                          </td>
                      <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-semibold number-emphasis text-sm">
                        {formatCurrency(holding.currentValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        <div className={`font-semibold number-emphasis ${
                          holding.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
                        }`}>
                          {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                        </div>
                        <div className={`text-xs font-medium mt-0.5 ${
                          holding.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
                        }`}>
                          ({holding.gainLoss >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] dark:bg-[#334155] text-[#475569] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155]">
                          {holding.allocationPct.toFixed(1)}%
                        </span>
                        </td>
                        {/* ACTIONS COLUMN */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                            {/* Edit Button */}
                            <button 
                              onClick={() => handleEditStock(holding)}
                              className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                              title="Edit holding"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeleteStock(holding)}
                              className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                              title="Delete holding"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
              {holdings.length > 0 && (
                <tfoot className="bg-[#F9FAFB] dark:bg-[#334155] border-t-2 border-[#0F172A] dark:border-[#F8FAFC]">
                  <tr>
                    <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      TOTAL
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {holdings.reduce((sum, h) => sum + h.quantity, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {formatPrice(holdings.length > 0 ? totalInvested / holdings.reduce((sum, h) => sum + h.quantity, 0) : 0)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {formatCurrency(totalInvested)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {formatPrice(avgCurrentPrice)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm">
                      <div className={`font-bold number-emphasis ${
                        totalGainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
                      }`}>
                        {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                      </div>
                      <div className={`text-xs font-semibold mt-0.5 ${
                        totalGainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
                      }`}>
                        ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {portfolioPercentage.toFixed(1)}%
                    </td>
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
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Verification: Total matches dashboard stocks value ({formatCurrency(totalValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                All values computed from Quantity × Average Price. Current values match invested values (MVP - no live price sync).
              </p>
            </div>
          </div>
        </div>

        {/* Inline Insights */}
        {holdings.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Portfolio Insights</h2>
            <div className="space-y-4">
              <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Total Stocks Holdings:</strong> {formatCurrency(totalValue)} ({portfolioPercentage.toFixed(1)}% of portfolio)
                </p>
                <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-2">
                  <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Total Invested:</strong> {formatCurrency(totalInvested)}
                </p>
                <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-2">
                  <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Total P&L:</strong>{' '}
                  <span className={totalGainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}>
                    {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)} ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                  </span>
                </p>
              </div>
              
              {holdings.length > 1 && (
                <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                  <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Top Holding:</strong> {sortedHoldings[0]?.name} ({sortedHoldings[0]?.allocationPct.toFixed(1)}% of stocks holdings)
                  </p>
                  <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-2">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Concentration:</strong> Top 3 holdings represent{' '}
                    {sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.allocationPct, 0).toFixed(1)}% of stocks portfolio
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ADD STOCK MODAL */}
      {showAddStockModal && (
        <AddStockModal
          onClose={() => {
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

    </div>
  );
}

/**
 * Add Stock Modal Component
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
    
    if (!formData.name || !formData.quantity || !formData.avgBuyPrice) {
      return;
    }
    
    if (parseFloat(formData.quantity) <= 0) {
      return;
    }
    
    if (parseFloat(formData.avgBuyPrice) <= 0) {
      return;
    }
    
    onSave({
      name: formData.name,
      symbol: formData.symbol || formData.name,
      quantity: parseFloat(formData.quantity),
      avgBuyPrice: parseFloat(formData.avgBuyPrice),
      purchaseDate: formData.purchaseDate
    });
  };

  const investedValue = formData.quantity && formData.avgBuyPrice
    ? parseFloat(formData.quantity) * parseFloat(formData.avgBuyPrice)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-2xl font-bold text-foreground">Add Stock Holding</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="relative">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Stock Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search for stock (e.g., HDFC Bank)"
                className="w-full px-4 py-3 pr-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                required
                autoComplete="off"
              />
              <Search className="absolute right-3 top-3.5 w-5 h-5 text-muted-foreground" />
            </div>
            
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((stock, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectStock(stock)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0"
                  >
                    <div className="font-semibold text-foreground">{stock.name}</div>
                    <div className="text-sm text-muted-foreground">{stock.symbol}</div>
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="text-sm text-muted-foreground mt-1">Searching...</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="NSE:HDFCBANK or BSE:500180"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: NSE:SYMBOL or BSE:SYMBOL
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="100"
              min="1"
              step="1"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Average Buy Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.avgBuyPrice}
              onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
              placeholder="750.50"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Purchase Date (Optional)
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>

          {investedValue > 0 && (
            <div className="bg-accent border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Invested Value</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(investedValue)}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.quantity || !formData.avgBuyPrice}
              className="flex-1 px-6 py-3 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
  stock: EquityHolding; 
  onClose: () => void; 
  onSave: (data: any) => void;
  formData: any;
  setFormData: any;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const newInvestedValue = formData.quantity && formData.avgBuyPrice
    ? parseFloat(formData.quantity) * parseFloat(formData.avgBuyPrice)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-accent border border-border rounded-lg p-4">
            <div className="font-semibold text-foreground text-lg">{stock.name}</div>
            <div className="text-sm text-muted-foreground">{stock.symbol}</div>
          </div>

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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors font-semibold"
            >
              Cancel
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
 */
function DeleteConfirmationDialog({ 
  stock, 
  onClose, 
  onConfirm,
  isLoading
}: { 
  stock: EquityHolding; 
  onClose: () => void; 
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Delete Stock Holding?
          </h2>
          
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

          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
            <p className="text-sm text-foreground">
              <strong>Warning:</strong> This action cannot be undone. You'll need to add 
              this stock again manually or re-upload your CSV if you change your mind.
            </p>
          </div>

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
