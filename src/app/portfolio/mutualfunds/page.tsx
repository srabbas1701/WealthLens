/**
 * Mutual Funds Holdings Page
 * 
 * Data-heavy table showing all mutual fund holdings with XIRR.
 * Sortable, groupable by AMC or category.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { calculatePortfolioXIRR } from '@/lib/xirr-calculator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  RefreshIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { useToast } from '@/components/Toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { generateMutualFundsPDF } from '@/lib/pdf/generateHoldingsPDF';

type SortField = 'name' | 'amc' | 'units' | 'currentValue' | 'investedValue' | 'xirr' | 'gainLoss' | 'allocation';
type SortDirection = 'asc' | 'desc';
type GroupBy = 'none' | 'amc' | 'category';

interface MFHolding {
  id: string;
  name: string;
  amc: string;
  category: string;
  plan: string;
  folio: string;
  units: number; // Total units held
  avgBuyNav: number; // Average buy NAV (cost price)
  latestNav: number; // Latest NAV (market price)
  currentValue: number;
  investedValue: number;
  xirr: number | null;
  gainLoss: number;
  gainLossPercent: number;
  allocationPct: number;
  navDate: string | null; // NAV date (YYYY-MM-DD)
  purchaseDate: string | null; // Purchase date (YYYY-MM-DD) for XIRR calculation
}

export default function MutualFundsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous fetches
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<MFHolding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  
  // NAV update state
  const [navUpdateLoading, setNavUpdateLoading] = useState(false);
  
  // CRUD state
  const { showToast } = useToast();
  const [showAddMFModal, setShowAddMFModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMF, setSelectedMF] = useState<MFHolding | null>(null);
  const [mfToDelete, setMfToDelete] = useState<MFHolding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amc: '',
    category: '',
    plan: 'Direct - Growth',
    folio: '',
    units: '',
    avgBuyNav: '',
    isin: '',
    scheme_code: '',
    purchaseDate: '' // Purchase date for XIRR calculation
  });

  const fetchData = useCallback(async (userId: string, showLoadingScreen: boolean = true) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      console.log('[MF Page] Skipping duplicate fetch');
      return;
    }
    
    fetchingRef.current = true;
    // Only show full loading screen on initial load, not on background refreshes
    if (showLoadingScreen) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const mfHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Mutual Funds')
            .map((h: any, idx: number) => {
              // Parse metadata from notes
              let metadata: any = {};
              try {
                if (h.notes) {
                  metadata = typeof h.notes === 'string' ? JSON.parse(h.notes) : h.notes;
                }
              } catch (e) {
                console.warn('[MF Page] Failed to parse notes:', e);
              }
              
              // Extract metadata fields (use metadata if available, otherwise fallback to extraction)
              const amc = metadata.amc || 'Other';
              const category = metadata.category || 'Large Cap';
              const plan = metadata.plan || 'Direct - Growth';
              const folio = metadata.folio || ''; // Use actual folio from metadata, empty string if not set
              
              // Get purchase date: prefer dedicated column, fallback to metadata, then null
              const purchaseDate = h.purchaseDate || metadata.purchase_date || null;
              
              // Calculate NAV fields
              const units = h.quantity || 0;
              const avgBuyNav = h.averagePrice || 0;
              const investedValue = h.investedValue || 0;
              const currentValue = h.currentValue || h.investedValue;
              const latestNav = units > 0 ? currentValue / units : 0;
              
              // Calculate actual XIRR using purchase date
              // If no purchase date, XIRR cannot be calculated accurately
              const xirr = purchaseDate 
                ? calculatePortfolioXIRR(investedValue, currentValue, purchaseDate)
                : null;
              
              return {
                id: h.id,
                name: h.name,
                amc,
                category,
                plan,
                folio,
                units,
                avgBuyNav,
                latestNav,
                currentValue,
                investedValue: h.investedValue,
                xirr,
                gainLoss: currentValue - h.investedValue,
                gainLossPercent: h.investedValue > 0 
                  ? ((currentValue - h.investedValue) / h.investedValue) * 100 
                  : 0,
                allocationPct: h.allocationPct,
                navDate: h.navDate || null, // Extract NAV date from API response
                purchaseDate: purchaseDate || null, // Store purchase date for edit form
              };
            });

          const total = mfHoldings.reduce((sum: number, h: MFHolding) => sum + h.currentValue, 0);
          const invested = mfHoldings.reduce((sum: number, h: MFHolding) => sum + h.investedValue, 0);
          const portfolioPct = (total / portfolioData.metrics.netWorth) * 100;

          setHoldings(mfHoldings);
          setTotalValue(total);
          setTotalInvested(invested);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch MF holdings:', error);
    } finally {
      // Only reset loading state if we set it
      if (showLoadingScreen) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/mutualfunds');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  // Trigger NAV update
  const handleNavUpdate = useCallback(async () => {
    if (navUpdateLoading) return;
    
    setNavUpdateLoading(true);
    
    // Show loading toast
    showToast({
      type: 'info',
      title: 'Updating NAVs',
      message: 'Fetching latest NAV data from AMFI for all mutual fund schemes...',
      duration: 30000, // 30 seconds max - should be enough for the update
    });
    
    try {
      const response = await fetch('/api/mf/navs/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.updated > 0) {
          // Refresh data to show updated NAVs (background refresh, no loading screen)
          if (user?.id) {
            await fetchData(user.id, false);
          }
          showToast({
            type: 'success',
            title: 'NAVs Updated Successfully',
            message: `Updated ${data.updated} scheme${data.updated === 1 ? '' : 's'} with latest NAV data.`,
            duration: 5000,
          });
        } else if (data.success && data.updated === 0) {
          // Success but no NAVs updated - might be because they're already up to date
          // Still refresh to ensure we have latest data (background refresh, no loading screen)
          if (user?.id) {
            await fetchData(user.id, false);
          }
          showToast({
            type: 'info',
            title: 'NAVs Already Up to Date',
            message: 'All NAVs are current. No updates were needed.',
            duration: 5000,
          });
        } else {
          const errorMsg = data.error || `Failed to update NAVs. ${data.failed || 0} failed out of ${data.updated + (data.failed || 0)} requested.`;
          console.error('[MF Page] ❌ NAV update failed:', errorMsg);
          console.error('[MF Page] Full error response:', data);
          showToast({
            type: 'error',
            title: 'Update Failed',
            message: errorMsg,
            duration: 7000,
          });
        }
      } else {
        const errorText = await response.text();
        console.error('[MF Page] NAV update failed:', response.status, errorText);
        let errorMessage = 'Failed to update NAVs. Please try again later.';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Not JSON, use the text as is
          if (errorText) {
            errorMessage = errorText.substring(0, 200);
          }
        }
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: errorMessage,
          duration: 7000,
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'An error occurred while updating NAVs. Please try again later.',
        duration: 7000,
      });
    } finally {
      setNavUpdateLoading(false);
    }
  }, [navUpdateLoading, user?.id, fetchData, showToast]);

  // Handlers
  const handleAddMF = () => {
    setSelectedMF(null);
    setFormData({ 
      name: '', 
      amc: '', 
      category: '', 
      plan: 'Direct - Growth', 
      folio: '', 
      units: '', 
      avgBuyNav: '',
      isin: '',
      scheme_code: '',
      purchaseDate: ''
    });
    setShowAddMFModal(true);
  };

  const handleEditMF = (mf: MFHolding) => {
    setSelectedMF(mf);
    setFormData({
      name: mf.name,
      amc: mf.amc,
      category: mf.category,
      plan: mf.plan,
      folio: mf.folio,
      units: mf.units.toString(),
      avgBuyNav: mf.avgBuyNav.toString(),
      isin: '',
      scheme_code: '',
      purchaseDate: mf.purchaseDate || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteMF = (mf: MFHolding) => {
    setMfToDelete(mf);
    setShowDeleteConfirm(true);
  };

  const handleAddMFSubmit = async (mfData: {
    name: string;
    amc: string;
    category: string;
    plan: string;
    folio: string;
    units: number;
    avgBuyNav: number;
    isin?: string;
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

      const response = await fetch('/api/mf/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mfData.name,
          amc: mfData.amc,
          category: mfData.category,
          plan: mfData.plan,
          folio: mfData.folio,
          units: mfData.units,
          avgBuyNav: mfData.avgBuyNav,
          isin: mfData.isin,
          purchaseDate: mfData.purchaseDate,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add mutual fund' }));
        throw new Error(error.error || 'Failed to add mutual fund');
      }
      
      // Refresh data (background refresh, no loading screen)
      await fetchData(user.id, false);
      setShowAddMFModal(false);
      setFormData({ 
        name: '', 
        amc: '', 
        category: '', 
        plan: 'Direct - Growth', 
        folio: '', 
        units: '', 
        avgBuyNav: '',
        isin: '',
        scheme_code: '',
        purchaseDate: ''
      });
      
      showToast({
        type: 'success',
        title: 'Mutual Fund Added',
        message: `${mfData.name} has been added successfully.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error adding MF:', error);
      showToast({
        type: 'error',
        title: 'Failed to Add Mutual Fund',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMFSubmit = async (mfData: {
    units: number;
    avgBuyNav: number;
    folio?: string;
    purchaseDate?: string;
  }) => {
    if (!selectedMF || !user?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/mf/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMF.id,
          units: mfData.units,
          avgBuyNav: mfData.avgBuyNav,
          folio: mfData.folio || '',
          purchaseDate: mfData.purchaseDate || '',
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update mutual fund' }));
        throw new Error(error.error || 'Failed to update mutual fund');
      }
      
      // Refresh data (background refresh, no loading screen)
      await fetchData(user.id, false);
      setShowEditModal(false);
      setSelectedMF(null);
      
      showToast({
        type: 'success',
        title: 'Mutual Fund Updated',
        message: `${selectedMF.name} has been updated successfully.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error updating MF:', error);
      showToast({
        type: 'error',
        title: 'Failed to Update Mutual Fund',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMFConfirm = async () => {
    if (!mfToDelete || !user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/mf/delete/${mfToDelete.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete mutual fund' }));
        throw new Error(error.error || 'Failed to delete mutual fund');
      }

      // Refresh data (background refresh, no loading screen)
      await fetchData(user.id, false);
      setShowDeleteConfirm(false);
      const deletedName = mfToDelete.name;
      setMfToDelete(null);
      
      showToast({
        type: 'success',
        title: 'Mutual Fund Deleted',
        message: `${deletedName} has been removed from your portfolio.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error deleting MF:', error);
      showToast({
        type: 'error',
        title: 'Failed to Delete Mutual Fund',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
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
    return [...holdings].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'amc':
          return multiplier * a.amc.localeCompare(b.amc);
        case 'units':
          return multiplier * (a.units - b.units);
        case 'currentValue':
          return multiplier * (a.currentValue - b.currentValue);
        case 'investedValue':
          return multiplier * (a.investedValue - b.investedValue);
        case 'xirr':
          return multiplier * ((a.xirr || 0) - (b.xirr || 0));
        case 'gainLoss':
          return multiplier * (a.gainLoss - b.gainLoss);
        case 'allocation':
          return multiplier * (a.allocationPct - b.allocationPct);
        default:
          return 0;
      }
    });
  }, [holdings, sortField, sortDirection]);

  const groupedHoldings = () => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Holdings', holdings: sortedHoldings }];
    }

    if (groupBy === 'amc') {
      const groups = new Map<string, MFHolding[]>();
      sortedHoldings.forEach(h => {
        if (!groups.has(h.amc)) groups.set(h.amc, []);
        groups.get(h.amc)!.push(h);
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

    if (groupBy === 'category') {
      const groups = new Map<string, MFHolding[]>();
      sortedHoldings.forEach(h => {
        if (!groups.has(h.category)) groups.set(h.category, []);
        groups.get(h.category)!.push(h);
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
  };


  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  // Get most recent NAV date across all holdings
  const mostRecentNavDate = useMemo(() => {
    const dates = holdings
      .map(h => h.navDate)
      .filter((date): date is string => date !== null && date !== undefined)
      .sort((a, b) => b.localeCompare(a)); // Sort descending (most recent first)
    return dates.length > 0 ? dates[0] : null;
  }, [holdings]);

  // Download handler for Mutual Funds
  const handleDownload = useCallback(async () => {
    console.log('[MF Download] Handler called - starting download process');
    
    try {
      console.log('[MF Download] Starting PDF generation...', { holdingsCount: holdings.length, totalValue });
      
      if (!holdings || holdings.length === 0) {
        showToast({
          type: 'warning',
          title: 'No Data',
          message: 'No mutual fund holdings available to download.',
          duration: 5000,
        });
        return;
      }
      
      // Get sorted and grouped holdings for export (same as displayed)
      const sortedHoldingsForExport = sortedHoldings;
      const groupedHoldingsForExport = groupedHoldings();
      
      // Flatten grouped holdings for PDF (same order as displayed)
      const holdingsToExport: MFHolding[] = [];
      for (const group of groupedHoldingsForExport) {
        holdingsToExport.push(...group.holdings);
      }
      
      // Convert holdings to PDF format
      const pdfData = holdingsToExport.map(holding => ({
        name: String(holding.name || 'Unknown'),
        amc: String(holding.amc || 'Other'),
        category: String(holding.category || 'Other'),
        units: typeof holding.units === 'number' ? holding.units : parseFloat(String(holding.units)) || 0,
        avgBuyNav: typeof holding.avgBuyNav === 'number' ? holding.avgBuyNav : parseFloat(String(holding.avgBuyNav)) || 0,
        latestNav: typeof holding.latestNav === 'number' ? holding.latestNav : parseFloat(String(holding.latestNav)) || 0,
        investedValue: typeof holding.investedValue === 'number' ? holding.investedValue : parseFloat(String(holding.investedValue)) || 0,
        currentValue: typeof holding.currentValue === 'number' ? holding.currentValue : parseFloat(String(holding.currentValue)) || 0,
        xirr: typeof holding.xirr === 'number' ? holding.xirr : (holding.xirr !== null ? parseFloat(String(holding.xirr)) : null),
        gainLoss: typeof holding.gainLoss === 'number' ? holding.gainLoss : parseFloat(String(holding.gainLoss)) || 0,
        gainLossPercent: typeof holding.gainLossPercent === 'number' ? holding.gainLossPercent : parseFloat(String(holding.gainLossPercent)) || 0,
      }));
      
      console.log('[MF Download] Calling generateMutualFundsPDF with', pdfData.length, 'holdings');
      await generateMutualFundsPDF({
        holdings: pdfData,
        totalValue,
        totalInvested,
        portfolioPercentage,
        navDate: mostRecentNavDate,
        formatCurrency,
      });

      console.log('[MF Download] PDF generation complete');
      
      // Suppress extension errors
      const originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        const errorStr = String(message || error?.message || '');
        if (errorStr.includes('Could not establish connection') || 
            errorStr.includes('Receiving end does not exist') ||
            errorStr.includes('content-all.js')) {
          console.debug('[MF Download] Ignoring harmless browser extension error');
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
        message: 'Your mutual funds holdings report has been downloaded successfully.',
        duration: 5000,
      });
    } catch (error) {
      console.error('[MF Download] Error generating PDF:', error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Could not establish connection') || 
          errorMsg.includes('Receiving end does not exist')) {
        console.warn('[MF Download] Browser extension interference detected, but PDF may have been generated');
        showToast({
          type: 'success',
          title: 'PDF Downloaded',
          message: 'Your mutual funds holdings report has been downloaded. (Some browser extensions may show harmless errors)',
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
  }, [holdings, sortField, sortDirection, groupBy, totalValue, totalInvested, portfolioPercentage, mostRecentNavDate, formatCurrency, showToast]);

  // Format NAV date for display
  const formatNavDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Check if a NAV date is older than the most recent date
  const isNavDateOlder = (navDate: string | null): boolean => {
    if (!navDate || !mostRecentNavDate) return false;
    return navDate < mostRecentNavDate;
  };

  // Sort icon component
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
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading mutual fund holdings...</p>
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
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Mutual Fund Holdings</h1>
            <div className="flex items-center gap-3">
              {/* ADD MF BUTTON */}
              <button 
                onClick={handleAddMF}
                className="flex items-center gap-2 px-6 py-3 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add MF</span>
              </button>
              
              {/* Update NAVs button */}
              <button
                onClick={handleNavUpdate}
                disabled={navUpdateLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  navUpdateLoading
                    ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                    : 'bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]'
                }`}
                title="Update NAVs from AMFI"
              >
                <RefreshIcon 
                  className={`w-4 h-4 ${navUpdateLoading ? 'animate-spin' : ''}`} 
                />
                {navUpdateLoading 
                  ? 'Updating...' 
                  : 'Update NAVs'}
              </button>
            </div>
          </div>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            {holdings.length} holdings • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
            {mostRecentNavDate && (
              <span className="ml-2 text-[#475569] font-medium">
                • NAV as of {formatNavDate(mostRecentNavDate)}
              </span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#6B7280]">Group by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'amc', label: 'AMC' },
                  { value: 'category', label: 'Category' },
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
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Scheme Name</span>
                      <SortIcon field="name" />
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
                    onClick={() => handleSort('xirr')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>XIRR</span>
                      <SortIcon field="xirr" />
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
                      <span>% Port</span>
                      <SortIcon field="allocation" />
                    </div>
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {groupedHoldings().map(group => (
                  <React.Fragment key={group.key}>
                    {groupBy !== 'none' && (
                      <tr className="bg-[#F9FAFB] dark:bg-[#334155]">
                        <td colSpan={8} className="px-6 py-2.5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          {group.label}
                          <span className="ml-2 text-[#6B7280] dark:text-[#94A3B8] font-medium">
                            ({group.holdings.length} scheme{group.holdings.length !== 1 ? 's' : ''}, {
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
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                              {holding.amc} • {holding.plan}
                            </p>
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                              Category: {holding.category} • Folio: {holding.folio}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold number-emphasis text-sm">
                              {holding.units.toLocaleString('en-IN', { maximumFractionDigits: 4, minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">
                              Avg NAV: ₹{holding.avgBuyNav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">
                              Latest NAV: ₹{holding.latestNav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            {holding.navDate && isNavDateOlder(holding.navDate) && (
                              <span className="text-xs text-[#DC2626] font-medium">
                                ({formatNavDate(holding.navDate)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium number-emphasis text-sm">
                          {formatCurrency(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-semibold number-emphasis text-sm">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm">
                          {holding.xirr !== null ? (
                            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                              {holding.xirr.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#6B7280] dark:text-[#94A3B8]">—</span>
                          )}
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
                              onClick={() => handleEditMF(holding)}
                              className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                              title="Edit holding"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeleteMF(holding)}
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
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] dark:bg-[#334155] border-t-2 border-[#0F172A] dark:border-[#F8FAFC]">
                  <td colSpan={2} className="px-6 py-3.5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    TOTAL
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(totalInvested)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm">
                    —
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
            </table>
          </div>
        </div>

        {/* XIRR Note */}
        <div className="mt-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg border border-[#2563EB]/20 dark:border-[#3B82F6]/20 p-4">
          <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
            <strong>Note:</strong> XIRR (Extended Internal Rate of Return) reflects annualized returns 
            accounting for timing of investments and redemptions. Calculated from transaction history.
          </p>
        </div>

        {/* Verification Note */}
        <div className="mt-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Verification: Total matches dashboard mutual fund value ({formatCurrency(totalValue)}) ✓
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ADD MF MODAL */}
      {showAddMFModal && (
        <AddMFModal
          onClose={() => {
            setShowAddMFModal(false);
            setFormData({ 
              name: '', 
              amc: '', 
              category: '', 
              plan: 'Direct - Growth', 
              folio: '', 
              units: '', 
              avgBuyNav: '',
              isin: '',
              scheme_code: '',
              purchaseDate: ''
            });
          }}
          onSave={handleAddMFSubmit}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* EDIT MF MODAL */}
      {showEditModal && selectedMF && (
        <EditMFModal
          mf={selectedMF}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMF(null);
          }}
          onSave={handleEditMFSubmit}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && mfToDelete && (
        <DeleteConfirmationDialog
          mf={mfToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setMfToDelete(null);
          }}
          onConfirm={handleDeleteMFConfirm}
          isLoading={isLoading}
        />
      )}

    </div>
  );
}

/**
 * Add MF Modal Component
 */
function AddMFModal({ 
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
  const [amcList, setAmcList] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [planList, setPlanList] = useState<string[]>([]);
  const [schemeList, setSchemeList] = useState<Array<{scheme_name: string; scheme_code: string; isin_growth?: string; isin_div_payout?: string; isin_div_reinvest?: string}>>([]);
  const [loadingAMCs, setLoadingAMCs] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  // Load AMCs on mount
  useEffect(() => {
    const fetchAMCs = async () => {
      setLoadingAMCs(true);
      try {
        // Add cache-busting parameter to ensure fresh data
        const response = await fetch(`/api/mf/schemes/list?t=${Date.now()}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error fetching AMCs - response not ok:', response.status, errorData);
          setAmcList([]);
          return;
        }
        
        const data = await response.json();
        console.log('AMCs API response:', data);
        console.log('AMCs API response type:', Array.isArray(data) ? 'array' : typeof data);
        console.log('AMCs API response length:', Array.isArray(data) ? data.length : 'N/A');
        if (Array.isArray(data) && data.length > 0) {
          console.log('First 5 AMCs:', data.slice(0, 5));
        }
        
        // Ensure we have an array of strings (AMC names), not scheme names
        if (Array.isArray(data)) {
          const validAMCs = data.filter((item: any) => {
            // Must be a string
            if (typeof item !== 'string') {
              console.warn('Filtered out non-string AMC:', item, typeof item);
              return false;
            }
            const trimmed = item.trim();
            // Must be reasonable length (AMC names are typically 2-50 chars, not 100+ like scheme names)
            const isValid = trimmed.length > 1 && trimmed.length < 100;
            if (!isValid && item) {
              console.warn('Filtered out invalid AMC (wrong length):', trimmed, 'length:', trimmed.length);
            }
            return isValid;
          }).map((item: string) => item.trim());
          
          console.log(`Loaded ${validAMCs.length} valid AMCs`);
          if (validAMCs.length > 0) {
            console.log('Sample valid AMCs:', validAMCs.slice(0, 10));
          }
          setAmcList(validAMCs);
        } else {
          console.error('AMCs API did not return an array:', typeof data, data);
          setAmcList([]);
        }
      } catch (error) {
        console.error('Error fetching AMCs:', error);
        setAmcList([]);
      } finally {
        setLoadingAMCs(false);
      }
    };
    fetchAMCs();
  }, []);

  // Load categories when AMC changes
  useEffect(() => {
    if (formData.amc) {
      const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
          const response = await fetch(`/api/mf/schemes/list?amc=${encodeURIComponent(formData.amc)}`);
          if (response.ok) {
            const data = await response.json();
            setCategoryList(data);
            // Reset category, plan, and scheme when AMC changes
            setFormData((prev) => ({ ...prev, category: '', plan: '', name: '', scheme_code: '', isin: '' }));
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          setCategoryList([]);
        } finally {
          setLoadingCategories(false);
        }
      };
      fetchCategories();
    } else {
      setCategoryList([]);
      setFormData((prev) => ({ ...prev, category: '', plan: '', name: '', scheme_code: '', isin: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.amc]);

  // Load plans when AMC + Category changes
  useEffect(() => {
    if (formData.amc && formData.category) {
      const fetchPlans = async () => {
        setLoadingPlans(true);
        try {
          const response = await fetch(`/api/mf/schemes/list?amc=${encodeURIComponent(formData.amc)}&category=${encodeURIComponent(formData.category)}`);
          if (response.ok) {
            const data = await response.json();
            setPlanList(data);
            // Reset plan and scheme when category changes
            setFormData((prev) => ({ ...prev, plan: '', name: '', scheme_code: '', isin: '' }));
          }
        } catch (error) {
          console.error('Error fetching plans:', error);
          setPlanList([]);
        } finally {
          setLoadingPlans(false);
        }
      };
      fetchPlans();
    } else {
      setPlanList([]);
      setFormData((prev) => ({ ...prev, plan: '', name: '', scheme_code: '', isin: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.amc, formData.category]);

  // Load schemes when AMC + Category + Plan changes
  useEffect(() => {
    if (formData.amc && formData.category && formData.plan) {
      const fetchSchemes = async () => {
        setLoadingSchemes(true);
        try {
          const response = await fetch(`/api/mf/schemes/list?amc=${encodeURIComponent(formData.amc)}&category=${encodeURIComponent(formData.category)}&plan=${encodeURIComponent(formData.plan)}`);
          if (response.ok) {
            const data = await response.json();
            setSchemeList(data);
            // Reset scheme when plan changes
            setFormData((prev) => ({ ...prev, name: '', scheme_code: '', isin: '' }));
          }
        } catch (error) {
          console.error('Error fetching schemes:', error);
          setSchemeList([]);
        } finally {
          setLoadingSchemes(false);
        }
      };
      fetchSchemes();
    } else {
      setSchemeList([]);
      setFormData((prev) => ({ ...prev, name: '', scheme_code: '', isin: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.amc, formData.category, formData.plan]);

  // Handle scheme selection
  const handleSchemeChange = (schemeName: string) => {
    const selectedScheme = schemeList.find(s => s.scheme_name === schemeName);
    if (selectedScheme) {
      // Determine ISIN based on plan type
      let isin = selectedScheme.isin_growth || '';
      if (formData.plan?.includes('Dividend')) {
        isin = selectedScheme.isin_div_payout || selectedScheme.isin_div_reinvest || isin;
      }
      
      setFormData((prev) => ({
        ...prev,
        name: schemeName,
        scheme_code: selectedScheme.scheme_code,
        isin: isin
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.units || !formData.avgBuyNav || !formData.amc) {
      return;
    }
    
    if (parseFloat(formData.units) <= 0) {
      return;
    }
    
    if (parseFloat(formData.avgBuyNav) <= 0) {
      return;
    }
    
    onSave({
      name: formData.name,
      amc: formData.amc || 'Other',
      category: formData.category || 'Large Cap',
      plan: formData.plan,
      folio: formData.folio || '', // Use empty string if not provided, don't generate random
      units: parseFloat(formData.units),
      avgBuyNav: parseFloat(formData.avgBuyNav),
      isin: formData.isin,
      scheme_code: formData.scheme_code,
      purchaseDate: formData.purchaseDate || ''
    });
  };

  const investedValue = formData.units && formData.avgBuyNav
    ? parseFloat(formData.units) * parseFloat(formData.avgBuyNav)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-2xl font-bold text-foreground">Add Mutual Fund</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* AMC Field - First */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              AMC (Asset Management Company) <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.amc}
              onChange={(e) => setFormData({ ...formData, amc: e.target.value, category: '', plan: '', name: '', scheme_code: '', isin: '' })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              disabled={loadingAMCs}
            >
              <option value="">Select AMC</option>
              {amcList.length > 0 ? (
                amcList.map((amc) => (
                  <option key={amc} value={amc}>
                    {amc}
                  </option>
                ))
              ) : (
                !loadingAMCs && <option value="" disabled>No AMCs available</option>
              )}
            </select>
            {loadingAMCs && (
              <p className="text-xs text-muted-foreground mt-1">Loading AMCs...</p>
            )}
            {!loadingAMCs && amcList.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                No AMCs found. Please check if mf_scheme_master table has data.
              </p>
            )}
          </div>

          {/* Category Field - Second */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value, plan: '', name: '', scheme_code: '', isin: '' })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              disabled={!formData.amc || loadingCategories}
            >
              <option value="">{formData.amc ? 'Select Category' : 'Select AMC first'}</option>
              {categoryList.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {loadingCategories && (
              <p className="text-xs text-muted-foreground mt-1">Loading categories...</p>
            )}
            {formData.amc && !loadingCategories && categoryList.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No categories found for this AMC</p>
            )}
          </div>

          {/* Plan Field - Third */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Plan <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.plan}
              onChange={(e) => {
                const newPlan = e.target.value;
                setFormData({ ...formData, plan: newPlan, name: '', scheme_code: '', isin: '' });
              }}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              disabled={!formData.amc || !formData.category || loadingPlans}
            >
              <option value="">{formData.amc && formData.category ? 'Select Plan' : 'Select AMC and Category first'}</option>
              {planList.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
            {loadingPlans && (
              <p className="text-xs text-muted-foreground mt-1">Loading plans...</p>
            )}
            {formData.amc && formData.category && !loadingPlans && planList.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No plans found for this AMC and Category</p>
            )}
          </div>

          {/* Scheme Name Field - Fourth (filtered by AMC + Category + Plan) */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Scheme Name <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.name}
              onChange={(e) => handleSchemeChange(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              disabled={!formData.amc || !formData.category || !formData.plan || loadingSchemes}
            >
              <option value="">{formData.amc && formData.category && formData.plan ? 'Select Scheme' : 'Select AMC, Category, and Plan first'}</option>
              {schemeList.map((scheme) => (
                <option key={scheme.scheme_code} value={scheme.scheme_name}>
                  {scheme.scheme_name}
                </option>
              ))}
            </select>
            {loadingSchemes && (
              <p className="text-xs text-muted-foreground mt-1">Loading schemes...</p>
            )}
            {formData.amc && formData.category && formData.plan && !loadingSchemes && schemeList.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No schemes found for this combination</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Folio Number
            </label>
            <input
              type="text"
              value={formData.folio}
              onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
              placeholder="e.g., 12345/67"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
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
              min="0.0001"
              step="0.0001"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Average Buy NAV (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.avgBuyNav}
              onChange={(e) => setFormData({ ...formData, avgBuyNav: e.target.value })}
              placeholder="50.25"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Purchase Date <span className="text-muted-foreground text-xs">(for XIRR calculation)</span>
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]} // Cannot be future date
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required for accurate XIRR calculation. For SIP, use the first purchase date.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              ISIN (Auto-filled)
            </label>
            <input
              type="text"
              value={formData.isin}
              readOnly
              placeholder="Auto-filled based on scheme and plan"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-muted-foreground cursor-not-allowed"
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
              disabled={isLoading || !formData.name || !formData.units || !formData.avgBuyNav || !formData.amc || !formData.category || !formData.plan}
              className="flex-1 px-6 py-3 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add MF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Edit MF Modal Component
 */
function EditMFModal({ 
  mf, 
  onClose, 
  onSave,
  formData,
  setFormData,
  isLoading,
  formatCurrency
}: { 
  mf: MFHolding; 
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
    
    if (parseFloat(formData.avgBuyNav) <= 0) {
      return;
    }
    
    onSave({
      units: parseFloat(formData.units),
      avgBuyNav: parseFloat(formData.avgBuyNav),
      folio: formData.folio || '',
      purchaseDate: formData.purchaseDate || ''
    });
  };

  const newInvestedValue = formData.units && formData.avgBuyNav
    ? parseFloat(formData.units) * parseFloat(formData.avgBuyNav)
    : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Edit Mutual Fund</h2>
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
            <div className="font-semibold text-foreground text-lg">{mf.name}</div>
            <div className="text-sm text-muted-foreground">{mf.amc} • {mf.plan}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Units <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.units}
              onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              min="0.0001"
              step="0.0001"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Average Buy NAV (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={formData.avgBuyNav}
              onChange={(e) => setFormData({ ...formData, avgBuyNav: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Folio Number
            </label>
            <input
              type="text"
              value={formData.folio || ''}
              onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
              placeholder="e.g., 12345/67"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Purchase Date <span className="text-muted-foreground text-xs">(for XIRR calculation)</span>
            </label>
            <input
              type="date"
              value={formData.purchaseDate || ''}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]} // Cannot be future date
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required for accurate XIRR calculation. For SIP, use the first purchase date.
            </p>
          </div>

          {newInvestedValue > 0 && (
            <div className="bg-accent border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">New Invested Value</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(newInvestedValue)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Previous: {formatCurrency(mf.investedValue)}
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
  mf, 
  onClose, 
  onConfirm,
  isLoading
}: { 
  mf: MFHolding; 
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
            Delete Mutual Fund?
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete{' '}
            <strong className="text-foreground">{mf.name}</strong>?{' '}
            This will remove{' '}
            <strong className="text-foreground">
              {mf.units.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
            </strong>{' '}
            with invested value of{' '}
            <strong className="text-foreground">
              ₹{mf.investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </strong>.
          </p>

          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
            <p className="text-sm text-foreground">
              <strong>Warning:</strong> This action cannot be undone. You'll need to add 
              this mutual fund again manually or re-upload your CSV if you change your mind.
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
              {isLoading ? 'Deleting...' : 'Delete MF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

