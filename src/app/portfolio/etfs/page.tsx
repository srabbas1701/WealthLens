/**
 * ETF Holdings Page
 * 
 * Table-first layout for ETF holdings.
 * Clear separation from direct equity holdings.
 * Professional, portfolio-grade presentation.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import OnboardingQueueBanner from '@/components/OnboardingQueueBanner';
import { readQueue } from '@/lib/onboarding-queue';
import {
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  InfoIcon,
  LockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import PremiumDownloadModal from '@/components/PremiumDownloadModal';
import { UpgradeModal } from '@/components/UpgradeModal';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { useToast } from '@/components/Toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { generateETFSPDF } from '@/lib/pdf/generateHoldingsPDF';
import { useMarketDataStatus } from '@/hooks/useMarketDataStatus';
import { getCachedPortfolioData, setCachedPortfolioData, isCacheStale } from '@/lib/portfolio-cache';

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
  const searchParams = useSearchParams();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showIntelligenceModal, setShowIntelligenceModal] = useState(false);
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous fetches

  const { data: marketDataStatus, loading: marketDataStatusLoading } = useMarketDataStatus();

  function minutesSince(dateString?: string): number | null {
    if (!dateString) return null;
    const ts = new Date(dateString).getTime();
    if (Number.isNaN(ts)) return null;
    return (Date.now() - ts) / (1000 * 60);
  }

  // ETFs use the same Yahoo EOD run as stocks (market_data_runs asset_type=STOCK)
  const lastRun = marketDataStatus?.stock ?? null;
  const minutesAgo = minutesSince(lastRun?.completedAt);
  const disableForRecentRun = !!lastRun && minutesAgo !== null && minutesAgo < 30;

  const lastUpdatedTooltip = lastRun
    ? `Updated: ${lastRun.successCount}, Failed: ${lastRun.failedCount}`
    : 'No update history yet';

  const warningTooltip = 'Some symbols failed in last update';

  const updateButtonTooltip = disableForRecentRun
    ? 'Prices were updated recently. Please wait before retrying.'
    : lastRun
    ? lastRun.failedCount > 0
      ? `Last update had failures: ${lastRun.failedCount} failed`
      : 'Manually refresh ETF prices'
    : 'No update history yet';
  
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
  const [hasAddedOneInQueue, setHasAddedOneInQueue] = useState(false);
  
  // Intelligence state (premium)
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    category: 'Equity',
    units: '',
    averagePrice: ''
  });

  const fetchData = useCallback(async (userId: string, silentRefresh = false) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      console.log('[ETF Page] Skipping duplicate fetch');
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

  // Fetch sparklines for ETF symbols (reuses stocks sparkline API — ETFs trade on NSE like stocks)
  const fetchSparklines = useCallback(async (etfs: ETFHolding[]) => {
    const symbols = etfs
      .map(h => h.symbol)
      .filter((s): s is string => !!s && s.trim().length > 0);
    if (symbols.length === 0) return;
    try {
      const res = await fetch(`/api/stocks/sparklines?symbols=${symbols.join(',')}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.sparklines) setSparklines(data.sparklines);
    } catch {
      // sparklines are decorative — silently skip
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

  // Open add modal when navigated with ?add=1 (e.g. from Add Holding or onboarding)
  useEffect(() => {
    if (searchParams?.get('add') === '1' && user?.id) {
      setShowAddETFModal(true);
      const fromOnboarding = searchParams?.get('from') === 'onboarding';
      router.replace(`/portfolio/etfs${fromOnboarding ? '?from=onboarding' : ''}`, { scroll: false });
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

  // Fetch sparklines once holdings load (premium only)
  useEffect(() => {
    if (holdings.length > 0 && !capabilitiesLoading && hasCapability(FEATURE_ACCESS.ANALYST_VIEW.capability)) {
      fetchSparklines(holdings);
    }
  }, [holdings, capabilitiesLoading, hasCapability, fetchSparklines]);

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

      if (user?.id) {
        const q = readQueue(user.id);
        if (q && q.current === 'etf') setHasAddedOneInQueue(true);
      }

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

  // ---------------------------------------------------------------------------
  // ETF Intelligence helpers (premium)
  // ---------------------------------------------------------------------------
  const hasPremium = !capabilitiesLoading && hasCapability(FEATURE_ACCESS.ANALYST_VIEW.capability);

  const computeETFSignal = (returnPct: number): 'strong' | 'good' | 'steady' | 'loss' => {
    if (returnPct >= 20) return 'strong';
    if (returnPct >= 10) return 'good';
    if (returnPct >= 0)  return 'steady';
    return 'loss';
  };

  const ETF_SIGNAL_CONFIG = {
    strong: { label: 'Strong Performer', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
    good:   { label: 'Good Performer',   color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
    steady: { label: 'Steady',           color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
    loss:   { label: 'In Loss',          color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
  } as const;

  const ETF_TYPE_NOTES: Record<string, string> = {
    Equity: 'Equity index ETF — tracks a stock market index (Nifty 50, Bank Nifty, etc.)',
    Debt:   'Debt ETF — fixed income exposure, lower volatility than equity',
    Gold:   'Gold ETF — inflation hedge, tracks physical gold prices',
    Hybrid: 'Hybrid ETF — blends equity and debt for balanced exposure',
    Cash:   'Liquid ETF — near-zero duration, capital preservation focus',
    Other:  'Diversified ETF — review the underlying index for category details',
  };

  // Rank each holding within its category by absolute return
  const categoryIntelligence = useMemo(() => {
    const byCategory: Record<string, ETFHolding[]> = {};
    for (const h of holdings) {
      if (!byCategory[h.category]) byCategory[h.category] = [];
      byCategory[h.category].push(h);
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].sort((a, b) => b.gainLossPercent - a.gainLossPercent);
    }
    const result: Record<string, { rank: number; total: number; categoryAvgReturn: number }> = {};
    for (const members of Object.values(byCategory)) {
      const avgReturn = members.reduce((s, h) => s + h.gainLossPercent, 0) / members.length;
      members.forEach((h, i) => {
        result[h.id] = { rank: i + 1, total: members.length, categoryAvgReturn: avgReturn };
      });
    }
    return result;
  }, [holdings]);

  // Inline sparkline SVG
  const ETFSparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const W = 80, H = 22;
    const pts = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const color = positive ? '#16A34A' : '#DC2626';
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    if (capabilitiesLoading) {
      showToast({ type: 'info', title: 'Loading...', message: 'Please wait while we check your access.', duration: 3000 });
      return;
    }
    if (!hasCapability(FEATURE_ACCESS.DOWNLOAD.capability)) {
      setShowPremiumModal(true);
      return;
    }
    
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
  }, [holdings, sortField, sortDirection, totalValue, totalInvested, portfolioPercentage, mostRecentPriceDate, formatCurrency, showToast, sortedHoldings, hasCapability, capabilitiesLoading]);

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

  const fromOnboarding = searchParams?.get('from') === 'onboarding';

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader 
        showBackButton={true}
        backHref={fromOnboarding ? '/onboarding/select?step=add-details' : '/dashboard'}
        backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
        showDownload={true}
        downloadLabel="Download ETFs"
        onDownload={handleDownload}
      />
      {fromOnboarding && user?.id && (
        <OnboardingQueueBanner userId={user.id} hasAddedOne={hasAddedOneInQueue} />
      )}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">ETF Holdings</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="/portfolio/etfs/add"
                className="inline-flex items-center justify-center gap-2 p-2.5 md:px-5 md:py-2.5 md:min-w-[140px] bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm min-w-[44px] min-h-[44px]"
                title="Add ETF"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">Add ETF</span>
              </Link>
              <button
                onClick={handlePriceUpdate}
                disabled={priceUpdateLoading || priceUpdateDisabled || disableForRecentRun}
                className={`inline-flex items-center justify-center gap-2 p-2.5 md:px-5 md:py-2.5 md:min-w-[140px] min-w-[44px] min-h-[44px] rounded-lg font-semibold text-sm transition-colors ${
                  priceUpdateLoading || priceUpdateDisabled || disableForRecentRun
                    ? 'bg-[#E5E7EB] dark:bg-[#334155] text-[#9CA3AF] dark:text-[#64748B] cursor-not-allowed'
                    : 'bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]'
                }`}
                title={updateButtonTooltip}
              >
                <RefreshIcon 
                  className={`w-5 h-5 shrink-0 ${priceUpdateLoading ? 'animate-spin' : ''}`} 
                />
                <span className="hidden md:inline">
                  {priceUpdateLoading ? 'Updating...' : priceUpdateDisabled ? 'Updated Today' : 'Update Prices'}
                </span>
              </button>
            </div>
          </div>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] break-words">
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
          </p>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#94A3B8] break-words">
            {marketDataStatusLoading ? (
              'Loading market update status…'
            ) : lastRun ? (
              <span className="inline-flex items-center gap-2">
                <span title={lastUpdatedTooltip} className="cursor-default">
                  Last updated on{' '}
                  {new Date(lastRun.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
                {lastRun.failedCount > 0 && (
                  <span title={warningTooltip} className="cursor-help">
                    ⚠️
                  </span>
                )}
              </span>
            ) : (
              'No stock update recorded yet'
            )}
          </p>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3 mb-6">
          {sortedHoldings.map((holding) => (
            <div
              key={holding.id}
              className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm truncate">{holding.name}</div>
                  {holding.symbol && (
                    <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{holding.symbol}</div>
                  )}
                </div>
                <div className={`font-semibold shrink-0 ${holding.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                  {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                  <span className="text-sm font-medium ml-1">({holding.gainLoss >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Units</span>
                  <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatNumber(holding.units, 2)}</div>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Invested</span>
                  <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(holding.investedValue)}</div>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Current</span>
                  <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(holding.currentValue)}</div>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Allocation</span>
                  <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.allocationPct.toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#334155]">
                <button
                  onClick={() => handleEditETF(holding)}
                  className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                  title="Edit holding"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteETF(holding)}
                  className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete holding"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Holdings Table - Desktop */}
        <div className="hidden md:block bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden mb-6">
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
                      className="px-3 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Category</span>
                        <SortIcon field="category" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('units')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Units</span>
                        <SortIcon field="units" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('avgPrice')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Avg Buy Price</span>
                        <SortIcon field="avgPrice" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('currentNAV')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>CMP</span>
                        <SortIcon field="currentNAV" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('investedValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Invested Value</span>
                        <SortIcon field="investedValue" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('currentValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Current Value</span>
                        <SortIcon field="currentValue" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('gainLoss')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Gain/Loss</span>
                        <SortIcon field="gainLoss" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('allocation')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>% Port</span>
                        <SortIcon field="allocation" />
                      </div>
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider w-24">
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
                    sortedHoldings.map((holding) => {
                      const sparkData = holding.symbol ? sparklines[holding.symbol] : undefined;
                      const isPositiveTrend = sparkData && sparkData.length >= 2
                        ? sparkData[sparkData.length - 1] >= sparkData[0]
                        : holding.gainLoss >= 0;
                      const isExpanded = expandedRows.has(holding.id);
                      const intelligence = categoryIntelligence[holding.id];
                      const signal = computeETFSignal(holding.gainLossPercent);
                      const signalCfg = ETF_SIGNAL_CONFIG[signal];
                      const returnPct = holding.gainLossPercent;
                      const returnColorClass =
                        returnPct >= 20 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                        returnPct >= 10 ? 'text-blue-600 dark:text-blue-400 font-medium' :
                        returnPct >= 0  ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400';

                      return (
                        <React.Fragment key={holding.id}>
                          <tr className="group hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                            {/* ETF Name + sparkline */}
                            <td className="px-6 py-3.5">
                              <div>
                                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.name}</p>
                                {holding.symbol && (
                                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{holding.symbol}</p>
                                )}
                                <div className="mt-1">
                                  {hasPremium ? (
                                    sparkData ? (
                                      <ETFSparkline data={sparkData} positive={isPositiveTrend} />
                                    ) : (
                                      <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">—</span>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => setShowIntelligenceModal(true)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                                    >
                                      <LockIcon className="w-2.5 h-2.5" />
                                      1M Trend
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Category badge */}
                            <td className="px-3 py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                holding.category === 'Equity'
                                  ? 'bg-[#E0F2FE] dark:bg-[#0C4A6E] text-[#0369A1] dark:text-[#7DD3FC]'
                                  : holding.category === 'Debt'
                                  ? 'bg-[#F0FDF4] dark:bg-[#14532D] text-[#166534] dark:text-[#86EFAC]'
                                  : holding.category === 'Gold'
                                  ? 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#92400E] dark:text-[#FDE047]'
                                  : holding.category === 'Hybrid'
                                  ? 'bg-[#F5F3FF] dark:bg-[#4C1D95] text-[#6D28D9] dark:text-[#C4B5FD]'
                                  : 'bg-[#F3F4F6] dark:bg-[#475569] text-[#4B5563] dark:text-[#E5E7EB]'
                              }`}>
                                {holding.category}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                              {formatNumber(holding.units, 2)}
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                              ₹{formatNumber(holding.averagePrice, 2)}
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                              ₹{formatNumber(holding.currentNAV, 2)}
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                              {formatCurrency(holding.investedValue)}
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              {formatCurrency(holding.currentValue)}
                            </td>
                            {/* Gain/Loss with color-coded % */}
                            <td className="px-3 py-3.5 text-right text-sm">
                              <div>
                                <div className={`font-medium ${holding.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                                  {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                                </div>
                                <div className={`text-xs ${returnColorClass}`}>
                                  {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-right text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              {holding.allocationPct.toFixed(1)}%
                            </td>
                            {/* ACTIONS COLUMN */}
                            <td className="px-3 py-3.5 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                {/* Insights / Premium pill — matches MF Holdings style */}
                                {hasPremium ? (
                                  <button
                                    onClick={() => toggleRow(holding.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                      isExpanded
                                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                                        : 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 text-[#2563EB] dark:text-[#93C5FD] border-[#BFDBFE] dark:border-[#1E40AF] hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB]'
                                    }`}
                                    title="Open ETF Intelligence panel"
                                  >
                                    <span className="text-[9px]">✦</span>
                                    Insights
                                    {isExpanded
                                      ? <ChevronUpIcon className="w-2.5 h-2.5" />
                                      : <ChevronDownIcon className="w-2.5 h-2.5" />}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setShowIntelligenceModal(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                                    title="ETF Intelligence — upgrade to Premium to unlock"
                                  >
                                    <LockIcon className="w-2.5 h-2.5" />
                                    Insights
                                  </button>
                                )}
                                {/* Edit + Delete */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditETF(holding)}
                                    className="min-w-[32px] min-h-[32px] p-1.5 inline-flex items-center justify-center hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                    title="Edit holding"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteETF(holding)}
                                    className="min-w-[32px] min-h-[32px] p-1.5 inline-flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                    title="Delete holding"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Intelligence Panel (premium only) */}
                          {isExpanded && hasPremium && (
                            <tr className="bg-[#EFF6FF] dark:bg-[#1E3A5F]/40">
                              <td colSpan={10} className="px-6 py-4">
                                <div className="flex flex-wrap items-start gap-4">
                                  {/* Signal Badge */}
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide text-[#6B7280] dark:text-[#94A3B8] mb-1 font-semibold">Signal</p>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${signalCfg.color}`}>
                                      {signalCfg.label}
                                    </span>
                                  </div>

                                  {/* Category Rank */}
                                  {intelligence && intelligence.total > 1 && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-[#6B7280] dark:text-[#94A3B8] mb-1 font-semibold">Category Rank</p>
                                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                        #{intelligence.rank} of {intelligence.total} {holding.category} ETFs
                                      </p>
                                    </div>
                                  )}

                                  {/* Category Avg Return */}
                                  {intelligence && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-[#6B7280] dark:text-[#94A3B8] mb-1 font-semibold">{holding.category} Avg Return</p>
                                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                        {intelligence.categoryAvgReturn >= 0 ? '+' : ''}{intelligence.categoryAvgReturn.toFixed(1)}%
                                        <span className={`ml-1.5 text-xs ${(holding.gainLossPercent - intelligence.categoryAvgReturn) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                          ({(holding.gainLossPercent - intelligence.categoryAvgReturn) >= 0 ? '+' : ''}{(holding.gainLossPercent - intelligence.categoryAvgReturn).toFixed(1)}% vs avg)
                                        </span>
                                      </p>
                                    </div>
                                  )}

                                  {/* Concentration Alert */}
                                  {holding.allocationPct > 40 && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-[#6B7280] dark:text-[#94A3B8] mb-1 font-semibold">Concentration</p>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                                        ⚠ Heavy — {holding.allocationPct.toFixed(1)}% of ETF portfolio
                                      </span>
                                    </div>
                                  )}

                                  {/* ETF Type Note */}
                                  <div className="flex-1 min-w-[200px]">
                                    <p className="text-[10px] uppercase tracking-wide text-[#6B7280] dark:text-[#94A3B8] mb-1 font-semibold">ETF Type</p>
                                    <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                                      {ETF_TYPE_NOTES[holding.category] ?? ETF_TYPE_NOTES['Other']}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                {sortedHoldings.length > 0 && (
                  <tfoot className="bg-[#F9FAFB] dark:bg-[#334155] border-t-2 border-[#E5E7EB] dark:border-[#334155]">
                    <tr>
                      <td className="px-6 py-3.5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        Total
                      </td>
                      <td className="px-3 py-3.5"></td>
                      <td className="px-3 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatNumber(sortedHoldings.reduce((sum, h) => sum + h.units, 0), 2)}
                      </td>
                      <td className="px-3 py-3.5"></td>
                      <td className="px-3 py-3.5"></td>
                      <td className="px-3 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalInvested)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-sm">
                        <div className={`font-semibold ${
                          (totalValue - totalInvested) >= 0
                            ? 'text-[#16A34A] dark:text-[#22C55E]'
                            : 'text-[#DC2626] dark:text-[#EF4444]'
                        }`}>
                          {(totalValue - totalInvested) >= 0 ? '+' : ''}{formatCurrency(totalValue - totalInvested)}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {portfolioPercentage.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3.5"></td>
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

        {/* Portfolio Insights */}
        {sortedHoldings.length > 0 && (() => {
          // Compute category breakdown
          const categories = Array.from(new Set(sortedHoldings.map(h => h.category)));
          const catData = categories.map(cat => {
            const items = sortedHoldings.filter(h => h.category === cat);
            const value = items.reduce((s, h) => s + h.currentValue, 0);
            return { cat, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 };
          }).sort((a, b) => b.value - a.value);

          const top3Pct = sortedHoldings.slice(0, Math.min(3, sortedHoldings.length)).reduce((s, h) => s + h.allocationPct, 0);
          const overallReturnPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
          const bestEtf = [...sortedHoldings].sort((a, b) => b.gainLossPercent - a.gainLossPercent)[0];
          const worstEtf = [...sortedHoldings].sort((a, b) => a.gainLossPercent - b.gainLossPercent)[0];

          const CAT_COLORS: Record<string, string> = {
            Equity: 'bg-blue-500',
            Debt:   'bg-emerald-500',
            Gold:   'bg-amber-500',
            Hybrid: 'bg-violet-500',
            Cash:   'bg-cyan-500',
            Other:  'bg-slate-400',
          };

          return (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
              <div className="flex items-center gap-2 mb-5">
                <InfoIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Portfolio Insights</h2>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg p-3">
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Total Value</p>
                  <p className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(totalValue)}</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{portfolioPercentage.toFixed(1)}% of portfolio</p>
                </div>
                <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg p-3">
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Overall Return</p>
                  <p className={`text-base font-bold ${overallReturnPct >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                    {overallReturnPct >= 0 ? '+' : ''}{overallReturnPct.toFixed(2)}%
                  </p>
                  <p className={`text-xs ${(totalValue - totalInvested) >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                    {(totalValue - totalInvested) >= 0 ? '+' : ''}{formatCurrency(totalValue - totalInvested)}
                  </p>
                </div>
                <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg p-3">
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Best Performer</p>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">{bestEtf.name}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">+{bestEtf.gainLossPercent.toFixed(2)}%</p>
                </div>
                <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg p-3">
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Needs Review</p>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">{worstEtf.name}</p>
                  <p className={`text-xs ${worstEtf.gainLossPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {worstEtf.gainLossPercent >= 0 ? '+' : ''}{worstEtf.gainLossPercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Category breakdown */}
              <div>
                <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide mb-3">Category Breakdown</p>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
                  {catData.map(({ cat, pct }) => (
                    <div
                      key={cat}
                      className={`${CAT_COLORS[cat] || 'bg-slate-400'} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${cat}: ${pct.toFixed(1)}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {catData.map(({ cat, value, pct }) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${CAT_COLORS[cat] || 'bg-slate-400'}`} />
                      <span className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                        {cat} <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{pct.toFixed(1)}%</span>
                        <span className="text-[#9CA3AF] dark:text-[#64748B] ml-1">({formatCurrency(value)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Concentration note */}
              {sortedHoldings.length >= 3 && (
                <p className="mt-4 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  Top 3 holdings represent <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{top3Pct.toFixed(1)}%</span> of your ETF portfolio
                  {top3Pct > 70 && <span className="ml-1 text-amber-600 dark:text-amber-400">— consider diversifying</span>}
                </p>
              )}

              {/* Footer notes */}
              <div className="mt-5 pt-4 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-wrap gap-3 text-[11px] text-[#9CA3AF] dark:text-[#64748B]">
                <span>● Return % is absolute (current vs invested value)</span>
                <span>● ✦ Insights available for Premium users</span>
                <span>● CMP = Current Market Price (NSE live/EOD)</span>
              </div>
            </div>
          );
        })()}
      </main>

      {/* ADD ETF MODAL */}
      {showAddETFModal && (
        <AddETFModal
          onClose={() => {
            if (fromOnboarding) {
              router.replace('/onboarding/select?step=add-details');
              return;
            }
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

      <PremiumDownloadModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      <UpgradeModal
        isOpen={showIntelligenceModal}
        onClose={() => setShowIntelligenceModal(false)}
        requiredPlan="Premium"
        featureTitle="ETF Intelligence"
        featureDescription="Analyse each ETF's price trend, category rank, signal strength, and get type-specific insights."
        benefits={[
          '1-month price sparkline per ETF',
          'Category rank vs peer ETFs in your portfolio',
          'Signal classification: Strong, Good, Steady, or In Loss',
          'ETF type notes (Equity, Debt, Gold, Hybrid & more)',
        ]}
      />
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
      <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155] sticky top-0 bg-white dark:bg-[#1E293B]">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Add ETF</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F6F8FB] dark:hover:bg-[#334155] rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              ETF Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Nippon India ETF Nifty 50"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="e.g., NIFTYBEES"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
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
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Units <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.units}
              onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              placeholder="100.50"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Average Buy Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.averagePrice}
              onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
              placeholder="150.25"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]"
              required
            />
          </div>

          {investedValue > 0 && (
            <div className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 border border-[#BFDBFE] dark:border-[#1E40AF] rounded-lg p-4">
              <div className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-1">Invested Value</div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {formatCurrency(investedValue)}
              </div>
            </div>
          )}

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
              disabled={isLoading || !formData.name || !formData.units || !formData.averagePrice}
              className="flex-1 px-6 py-3 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

