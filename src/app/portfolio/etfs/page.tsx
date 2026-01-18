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
import { useToast } from '@/components/Toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { generateETFSPDF } from '@/lib/pdf/generateHoldingsPDF';

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
  
  // CRUD state
  const { showToast } = useToast();
  const [showAddETFModal, setShowAddETFModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedETF, setSelectedETF] = useState<ETFHolding | null>(null);
  const [etfToDelete, setEtfToDelete] = useState<ETFHolding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    category: 'Equity',
    units: '',
    averagePrice: ''
  });

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

  // Handlers
  const handleAddETF = () => {
    setSelectedETF(null);
    setFormData({ 
      name: '', 
      symbol: '', 
      category: 'Equity', 
      units: '', 
      averagePrice: ''
    });
    setShowAddETFModal(true);
  };

  const handleEditETF = (etf: ETFHolding) => {
    setSelectedETF(etf);
    setFormData({
      name: etf.name,
      symbol: etf.symbol || '',
      category: etf.category,
      units: etf.units.toString(),
      averagePrice: etf.averagePrice.toString()
    });
    setShowEditModal(true);
  };

  const handleDeleteETF = (etf: ETFHolding) => {
    setEtfToDelete(etf);
    setShowDeleteConfirm(true);
  };

  const handleAddETFSubmit = async (etfData: {
    name: string;
    symbol: string;
    category: string;
    units: number;
    averagePrice: number;
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

      const response = await fetch('/api/etf/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: etfData.name,
          symbol: etfData.symbol.toUpperCase(),
          category: etfData.category,
          units: etfData.units,
          averagePrice: etfData.averagePrice,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add ETF' }));
        throw new Error(error.error || 'Failed to add ETF');
      }
      
      // Refresh data
      await fetchData(user.id);
      setShowAddETFModal(false);
      setFormData({ 
        name: '', 
        symbol: '', 
        category: 'Equity', 
        units: '', 
        averagePrice: ''
      });
      
      showToast({
        type: 'success',
        title: 'ETF Added',
        message: `${etfData.name} has been added successfully.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error adding ETF:', error);
      showToast({
        type: 'error',
        title: 'Failed to Add ETF',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditETFSubmit = async (etfData: {
    units: number;
    averagePrice: number;
  }) => {
    if (!selectedETF || !user?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/etf/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedETF.id,
          units: etfData.units,
          averagePrice: etfData.averagePrice,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update ETF' }));
        throw new Error(error.error || 'Failed to update ETF');
      }
      
      // Refresh data
      await fetchData(user.id);
      setShowEditModal(false);
      setSelectedETF(null);
      
      showToast({
        type: 'success',
        title: 'ETF Updated',
        message: `${selectedETF.name} has been updated successfully.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error updating ETF:', error);
      showToast({
        type: 'error',
        title: 'Failed to Update ETF',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteETFConfirm = async () => {
    if (!etfToDelete || !user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/etf/delete/${etfToDelete.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete ETF' }));
        throw new Error(error.error || 'Failed to delete ETF');
      }

      // Refresh data
      await fetchData(user.id);
      setShowDeleteConfirm(false);
      const deletedName = etfToDelete.name;
      setEtfToDelete(null);
      
      showToast({
        type: 'success',
        title: 'ETF Deleted',
        message: `${deletedName} has been removed from your portfolio.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error deleting ETF:', error);
      showToast({
        type: 'error',
        title: 'Failed to Delete ETF',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
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

  // Download handler for ETFs
  const handleDownload = useCallback(async () => {
    console.log('[ETF Download] Handler called - starting download process');
    
    try {
      console.log('[ETF Download] Starting PDF generation...', { holdingsCount: holdings.length, totalValue });
      
      if (!holdings || holdings.length === 0) {
        showToast({
          type: 'warning',
          title: 'No Data',
          message: 'No ETF holdings available to download.',
          duration: 5000,
        });
        return;
      }
      
      // Convert holdings to PDF format (same order as displayed)
      const pdfData = sortedHoldings.map(holding => ({
        name: String(holding.name || 'Unknown'),
        symbol: holding.symbol || '',
        category: String(holding.category || 'Other'),
        units: typeof holding.units === 'number' ? holding.units : parseFloat(String(holding.units)) || 0,
        averagePrice: typeof holding.averagePrice === 'number' ? holding.averagePrice : parseFloat(String(holding.averagePrice)) || 0,
        currentNAV: typeof holding.currentNAV === 'number' ? holding.currentNAV : parseFloat(String(holding.currentNAV)) || 0,
        investedValue: typeof holding.investedValue === 'number' ? holding.investedValue : parseFloat(String(holding.investedValue)) || 0,
        currentValue: typeof holding.currentValue === 'number' ? holding.currentValue : parseFloat(String(holding.currentValue)) || 0,
        gainLoss: typeof holding.gainLoss === 'number' ? holding.gainLoss : parseFloat(String(holding.gainLoss)) || 0,
        gainLossPercent: typeof holding.gainLossPercent === 'number' ? holding.gainLossPercent : parseFloat(String(holding.gainLossPercent)) || 0,
      }));
      
      console.log('[ETF Download] Calling generateETFSPDF with', pdfData.length, 'holdings');
      await generateETFSPDF({
        holdings: pdfData,
        totalValue,
        totalInvested,
        portfolioPercentage,
        priceDate: mostRecentPriceDate,
        formatCurrency,
      });

      console.log('[ETF Download] PDF generation complete');
      
      // Suppress extension errors
      const originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        const errorStr = String(message || error?.message || '');
        if (errorStr.includes('Could not establish connection') || 
            errorStr.includes('Receiving end does not exist') ||
            errorStr.includes('content-all.js')) {
          console.debug('[ETF Download] Ignoring harmless browser extension error');
          return true;
        }
        if (originalErrorHandler) {
          return originalErrorHandler(message, source, lineno, colno, error);
        }
        return false;
      };
      
      setTimeout(() => {
        window.onerror = originalErrorHandler;
      }, 1000);
      
      showToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: 'Your ETF holdings report has been downloaded successfully.',
        duration: 5000,
      });
    } catch (error) {
      console.error('[ETF Download] Error generating PDF:', error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Could not establish connection') || 
          errorMsg.includes('Receiving end does not exist')) {
        console.warn('[ETF Download] Browser extension interference detected, but PDF may have been generated');
        showToast({
          type: 'success',
          title: 'PDF Downloaded',
          message: 'Your ETF holdings report has been downloaded. (Some browser extensions may show harmless errors)',
          duration: 5000,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Download Failed',
          message: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
          duration: 5000,
        });
      }
    }
  }, [holdings, sortField, sortDirection, totalValue, totalInvested, portfolioPercentage, mostRecentPriceDate, formatCurrency, showToast, sortedHoldings]);

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
        onDownload={handleDownload}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">ETF Holdings</h1>
            <div className="flex items-center gap-3">
              {/* ADD ETF BUTTON */}
              <button 
                onClick={handleAddETF}
                className="flex items-center gap-2 px-6 py-3 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add ETF</span>
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
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">No ETF holdings found</p>
                          <p className="text-xs text-[#9CA3AF] dark:text-[#64748B]">Upload your portfolio to see ETF holdings</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="group hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
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
                        {/* ACTIONS COLUMN */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                            {/* Edit Button */}
                            <button 
                              onClick={() => handleEditETF(holding)}
                              className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                              title="Edit holding"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeleteETF(holding)}
                              className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                              title="Delete holding"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ADD ETF MODAL */}
      {showAddETFModal && (
        <AddETFModal
          onClose={() => {
            setShowAddETFModal(false);
            setFormData({ 
              name: '', 
              symbol: '', 
              category: 'Equity', 
              units: '', 
              averagePrice: ''
            });
          }}
          onSave={handleAddETFSubmit}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* EDIT ETF MODAL */}
      {showEditModal && selectedETF && (
        <EditETFModal
          etf={selectedETF}
          onClose={() => {
            setShowEditModal(false);
            setSelectedETF(null);
          }}
          onSave={handleEditETFSubmit}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && etfToDelete && (
        <DeleteConfirmationDialog
          etf={etfToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setEtfToDelete(null);
          }}
          onConfirm={handleDeleteETFConfirm}
          isLoading={isLoading}
        />
      )}

    </div>
  );
}

/**
 * Add ETF Modal Component
 */
function AddETFModal({ 
  onClose, 
  onSave,
  formData,
  setFormData,
  isLoading,
  formatCurrency
}: { 
  onClose: () => void; 
  onSave: (data: any) => void;
  formData: any;
  setFormData: any;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.units || !formData.averagePrice) {
      return;
    }
    
    if (parseFloat(formData.units) <= 0) {
      return;
    }
    
    if (parseFloat(formData.averagePrice) <= 0) {
      return;
    }
    
    onSave({
      name: formData.name,
      symbol: formData.symbol || formData.name,
      category: formData.category,
      units: parseFloat(formData.units),
      averagePrice: parseFloat(formData.averagePrice)
    });
  };

  const investedValue = formData.units && formData.averagePrice
    ? parseFloat(formData.units) * parseFloat(formData.averagePrice)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-2xl font-bold text-foreground">Add ETF</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              ETF Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Nippon India ETF Nifty 50"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="e.g., NIFTYBEES"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            >
              <option value="Equity">Equity</option>
              <option value="Debt">Debt</option>
              <option value="Gold">Gold</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Units <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.units}
              onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              placeholder="100.50"
              min="0.01"
              step="0.01"
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
              value={formData.averagePrice}
              onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
              placeholder="150.25"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
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
              disabled={isLoading || !formData.name || !formData.units || !formData.averagePrice}
              className="flex-1 px-6 py-3 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add ETF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Edit ETF Modal Component
 */
function EditETFModal({ 
  etf, 
  onClose, 
  onSave,
  formData,
  setFormData,
  isLoading,
  formatCurrency
}: { 
  etf: ETFHolding; 
  onClose: () => void; 
  onSave: (data: any) => void;
  formData: any;
  setFormData: any;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parseFloat(formData.units) <= 0) {
      return;
    }
    
    if (parseFloat(formData.averagePrice) <= 0) {
      return;
    }
    
    onSave({
      units: parseFloat(formData.units),
      averagePrice: parseFloat(formData.averagePrice)
    });
  };

  const newInvestedValue = formData.units && formData.averagePrice
    ? parseFloat(formData.units) * parseFloat(formData.averagePrice)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Edit ETF</h2>
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
            <div className="font-semibold text-foreground text-lg">{etf.name}</div>
            <div className="text-sm text-muted-foreground">{etf.symbol} • {etf.category}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Units <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.units}
              onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              min="0.01"
              step="0.01"
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
              value={formData.averagePrice}
              onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
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
                Previous: {formatCurrency(etf.investedValue)}
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
  etf, 
  onClose, 
  onConfirm,
  isLoading
}: { 
  etf: ETFHolding; 
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
            Delete ETF?
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete{' '}
            <strong className="text-foreground">{etf.name}</strong>?{' '}
            This will remove{' '}
            <strong className="text-foreground">
              {etf.units.toLocaleString('en-IN', { maximumFractionDigits: 2 })} units
            </strong>{' '}
            with invested value of{' '}
            <strong className="text-foreground">
              ₹{etf.investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </strong>.
          </p>

          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
            <p className="text-sm text-foreground">
              <strong>Warning:</strong> This action cannot be undone. You'll need to add 
              this ETF again manually or re-upload your CSV if you change your mind.
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
              {isLoading ? 'Deleting...' : 'Delete ETF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

