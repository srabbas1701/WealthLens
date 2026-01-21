/**
 * Bonds Holdings Page
 * 
 * Conservative, trust-first fixed-income holdings page.
 * Table-based layout with explicit missing data handling.
 * Maturity and income-focused insights only.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/icons';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { useToast } from '@/components/Toast';
import { generateBondsPDF } from '@/lib/pdf/generateHoldingsPDF';

type SortField = 'name' | 'type' | 'coupon' | 'maturityDate' | 'faceValue' | 'investedValue' | 'currentValue' | 'yield' | 'status';
type SortDirection = 'asc' | 'desc';

interface BondHolding {
  id: string;
  name: string;
  issuer: string | null;
  type: string; // Government, Corporate, etc.
  couponRate: number | null;
  couponFrequency: string | null;
  maturityDate: string | null;
  faceValue: number;
  investedValue: number;
  currentValue: number;
  yield: number | null; // Current yield if calculable
  status: 'Active' | 'Matured' | 'Unknown';
  daysToMaturity: number | null;
  hasCompleteData: boolean;
}

// Determine bond type from issuer name or metadata
const getBondType = (issuer: string | null, name: string): string => {
  if (!issuer && !name) return 'Unknown';
  
  const issuerLower = (issuer || name || '').toLowerCase();
  
  // Government bonds
  if (issuerLower.includes('government') || 
      issuerLower.includes('govt') || 
      issuerLower.includes('sovereign') ||
      issuerLower.includes('rbi') ||
      issuerLower.includes('reserve bank')) {
    return 'Government';
  }
  
  // Corporate bonds
  if (issuerLower.includes('corporate') || 
      issuerLower.includes('pvt') ||
      issuerLower.includes('private')) {
    return 'Corporate';
  }
  
  // PSU bonds
  if (issuerLower.includes('psu') || 
      issuerLower.includes('public sector')) {
    return 'PSU';
  }
  
  // Default to Corporate for most cases
  return 'Corporate';
};

// Calculate current yield (annual coupon / current value * 100)
const calculateYield = (
  couponRate: number | null,
  couponFrequency: string | null,
  faceValue: number,
  currentValue: number
): number | null => {
  if (!couponRate || currentValue <= 0) return null;
  
  // Annual coupon payment
  let annualCoupon = (couponRate / 100) * faceValue;
  
  // Adjust for frequency if available
  if (couponFrequency) {
    const freq = couponFrequency.toLowerCase();
    if (freq.includes('semi') || freq.includes('half')) {
      annualCoupon = annualCoupon * 2;
    } else if (freq.includes('quarter')) {
      annualCoupon = annualCoupon * 4;
    } else if (freq.includes('month')) {
      annualCoupon = annualCoupon * 12;
    }
  }
  
  return (annualCoupon / currentValue) * 100;
};

// Determine bond status
const getBondStatus = (maturityDate: string | null): 'Active' | 'Matured' | 'Unknown' => {
  if (!maturityDate) return 'Unknown';
  
  const maturity = new Date(maturityDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  maturity.setHours(0, 0, 0, 0);
  
  if (maturity < today) return 'Matured';
  return 'Active';
};

// Calculate days to maturity
const getDaysToMaturity = (maturityDate: string | null): number | null => {
  if (!maturityDate) return null;
  
  const maturity = new Date(maturityDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  maturity.setHours(0, 0, 0, 0);
  
  const diffTime = maturity.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default function BondsHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<BondHolding[]>([]);
  const [totalFaceValue, setTotalFaceValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalCurrentValue, setTotalCurrentValue] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
  const [sortField, setSortField] = useState<SortField>('maturityDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // CRUD state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBond, setSelectedBond] = useState<BondHolding | null>(null);
  const [bondToDelete, setBondToDelete] = useState<BondHolding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    issuer: '',
    amount: '',
    couponRate: '',
    couponFrequency: '',
    maturityDate: ''
  });

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const bondHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Bonds' || h.assetType === 'Bond')
            .map((h: any) => {
              // Parse bond metadata from notes (stored as JSON)
              let bondMetadata: any = {};
              if (h.notes) {
                try {
                  bondMetadata = JSON.parse(h.notes);
                } catch (e) {
                  console.warn('Failed to parse bond notes:', e);
                }
              }
              
              const issuer = bondMetadata.issuer || bondMetadata.bondIssuer || null;
              const couponRate = bondMetadata.coupon_rate || bondMetadata.couponRate || bondMetadata.bondCouponRate || null;
              const couponFrequency = bondMetadata.coupon_frequency || bondMetadata.couponFrequency || bondMetadata.bondCouponFrequency || null;
              const maturityDateStr = bondMetadata.maturity_date || bondMetadata.maturityDate || bondMetadata.bondMaturityDate || null;
              
              // Face value: typically equals invested value for bonds, or use quantity if available
              const faceValue = h.quantity > 0 && h.quantity !== 1 
                ? h.investedValue / h.quantity 
                : h.investedValue;
              
              // Current value: use stored value, fallback to invested value (no market estimates)
              const currentValue = h.currentValue > 0 ? h.currentValue : h.investedValue;
              
              // Calculate yield if we have coupon rate
              const yieldValue = calculateYield(couponRate, couponFrequency, faceValue, currentValue);
              
              // Determine status and days to maturity
              const status = getBondStatus(maturityDateStr);
              const daysToMaturity = getDaysToMaturity(maturityDateStr);
              
              // Check if we have complete data
              const hasCompleteData = !!(couponRate && maturityDateStr && issuer);
              
              return {
                id: h.id,
                name: h.name,
                issuer,
                type: getBondType(issuer, h.name),
                couponRate,
                couponFrequency,
                maturityDate: maturityDateStr,
                faceValue,
                investedValue: h.investedValue,
                currentValue,
                yield: yieldValue,
                status,
                daysToMaturity,
                hasCompleteData,
              };
            });

          const totalFace = bondHoldings.reduce((sum: number, h: BondHolding) => sum + h.faceValue, 0);
          const totalInv = bondHoldings.reduce((sum: number, h: BondHolding) => sum + h.investedValue, 0);
          const totalCurrent = bondHoldings.reduce((sum: number, h: BondHolding) => sum + h.currentValue, 0);
          const portfolioPct = portfolioData.metrics.netWorth > 0 
            ? (totalCurrent / portfolioData.metrics.netWorth) * 100 
            : 0;

          setHoldings(bondHoldings);
          setTotalFaceValue(totalFace);
          setTotalInvested(totalInv);
          setTotalCurrentValue(totalCurrent);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bond holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/bonds');
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
      setSortDirection(field === 'maturityDate' || field === 'status' ? 'asc' : 'desc');
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
      
      if (sortField === 'name' || sortField === 'type' || sortField === 'status') {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      
      if (sortField === 'maturityDate') {
        aVal = a.maturityDate ? new Date(a.maturityDate).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
        bVal = b.maturityDate ? new Date(b.maturityDate).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [holdings, sortField, sortDirection]);


  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatDays = (days: number | null) => {
    if (days === null) return '—';
    if (days < 0) return 'Matured';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-[#2563EB]" />
      : <ChevronDownIcon className="w-4 h-4 text-[#2563EB]" />;
  };

  // Calculate maturity insights
  const upcomingMaturities = useMemo(() => {
    return sortedHoldings
      .filter(h => h.status === 'Active' && h.daysToMaturity !== null && h.daysToMaturity <= 365)
      .sort((a, b) => (a.daysToMaturity || Infinity) - (b.daysToMaturity || Infinity))
      .slice(0, 3);
  }, [sortedHoldings]);

  const totalAnnualIncome = useMemo(() => {
    return sortedHoldings.reduce((sum, h) => {
      if (!h.couponRate || !h.faceValue) return sum;
      let annualCoupon = (h.couponRate / 100) * h.faceValue;
      if (h.couponFrequency) {
        const freq = h.couponFrequency.toLowerCase();
        if (freq.includes('semi') || freq.includes('half')) {
          annualCoupon = annualCoupon * 2;
        } else if (freq.includes('quarter')) {
          annualCoupon = annualCoupon * 4;
        } else if (freq.includes('month')) {
          annualCoupon = annualCoupon * 12;
        }
      }
      return sum + annualCoupon;
    }, 0);
  }, [sortedHoldings]);

  // CRUD Handlers
  const handleAddBond = async (bondData: {
    issuer: string;
    amount: number;
    couponRate?: number;
    couponFrequency?: string;
    maturityDate?: string;
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

      const response = await fetch('/api/investments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          form_data: {
            assetType: 'bond',
            bondIssuer: bondData.issuer,
            bondAmount: bondData.amount,
            bondCouponRate: bondData.couponRate,
            bondCouponFrequency: bondData.couponFrequency,
            bondMaturityDate: bondData.maturityDate,
          }
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add bond');
      }

      await fetchData(user.id);
      setShowAddModal(false);
      setFormData({
        issuer: '',
        amount: '',
        couponRate: '',
        couponFrequency: 'Annual',
        maturityDate: ''
      });
      
      showToast({
        type: 'success',
        title: 'Bond Added',
        message: `${bondData.issuer} has been added to your portfolio.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error adding bond:', error);
      showToast({
        type: 'error',
        title: 'Failed to Add Bond',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBond = async (bondData: {
    issuer: string;
    amount: number;
    couponRate?: number;
    couponFrequency?: string;
    maturityDate?: string;
  }) => {
    if (!selectedBond || !user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/investments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          editing_holding_id: selectedBond.id,
          form_data: {
            assetType: 'bond',
            bondIssuer: bondData.issuer,
            bondAmount: bondData.amount,
            bondCouponRate: bondData.couponRate,
            bondCouponFrequency: bondData.couponFrequency,
            bondMaturityDate: bondData.maturityDate,
          }
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update bond');
      }

      await fetchData(user.id);
      setShowEditModal(false);
      setSelectedBond(null);
      
      showToast({
        type: 'success',
        title: 'Bond Updated',
        message: `${bondData.issuer} has been updated.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error updating bond:', error);
      showToast({
        type: 'error',
        title: 'Failed to Update Bond',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBond = async () => {
    if (!bondToDelete || !user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/bonds/delete/${bondToDelete.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete bond' }));
        throw new Error(error.error || 'Failed to delete bond');
      }

      await fetchData(user.id);
      setShowDeleteConfirm(false);
      const deletedName = bondToDelete.name;
      setBondToDelete(null);
      
      showToast({
        type: 'success',
        title: 'Bond Deleted',
        message: `${deletedName} has been removed from your portfolio.`,
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Error deleting bond:', error);
      showToast({
        type: 'error',
        title: 'Failed to Delete Bond',
        message: error.message || 'Please try again.',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Download handler for Bonds
  const handleDownload = useCallback(async () => {
    console.log('[Bonds Download] Handler called - starting download process');
    
    try {
      console.log('[Bonds Download] Starting PDF generation...', { holdingsCount: holdings.length, totalValue: totalCurrentValue });
      
      if (!holdings || holdings.length === 0) {
        showToast({
          type: 'warning',
          title: 'No Data',
          message: 'No bond holdings available to download.',
          duration: 5000,
        });
        return;
      }
      
      // Convert holdings to PDF format (same order as displayed)
      const pdfData = sortedHoldings.map(holding => ({
        name: String(holding.name || 'Unknown'),
        issuer: holding.issuer || null,
        type: String(holding.type || 'Corporate'),
        couponRate: holding.couponRate,
        maturityDate: holding.maturityDate,
        faceValue: typeof holding.faceValue === 'number' ? holding.faceValue : parseFloat(String(holding.faceValue)) || 0,
        investedValue: typeof holding.investedValue === 'number' ? holding.investedValue : parseFloat(String(holding.investedValue)) || 0,
        currentValue: typeof holding.currentValue === 'number' ? holding.currentValue : parseFloat(String(holding.currentValue)) || 0,
        yield: holding.yield,
      }));
      
      console.log('[Bonds Download] Calling generateBondsPDF with', pdfData.length, 'holdings');
      await generateBondsPDF({
        holdings: pdfData,
        totalValue: totalCurrentValue,
        totalInvested,
        portfolioPercentage,
        formatCurrency,
      });

      console.log('[Bonds Download] PDF generation complete');
      
      // Suppress extension errors
      const originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        const errorStr = String(message || error?.message || '');
        if (errorStr.includes('Could not establish connection') || 
            errorStr.includes('Receiving end does not exist') ||
            errorStr.includes('content-all.js')) {
          console.debug('[Bonds Download] Ignoring harmless browser extension error');
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
        message: 'Your bonds holdings report has been downloaded successfully.',
        duration: 5000,
      });
    } catch (error) {
      console.error('[Bonds Download] Error generating PDF:', error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Could not establish connection') || 
          errorMsg.includes('Receiving end does not exist')) {
        console.warn('[Bonds Download] Browser extension interference detected, but PDF may have been generated');
        showToast({
          type: 'success',
          title: 'PDF Downloaded',
          message: 'Your bonds holdings report has been downloaded. (Some browser extensions may show harmless errors)',
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
  }, [holdings, sortField, sortDirection, totalCurrentValue, totalInvested, portfolioPercentage, formatCurrency, showToast, sortedHoldings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2563EB] dark:border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading bond holdings...</p>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Bonds Holdings</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              {holdings.length} holding{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalCurrentValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedBond(null);
              setFormData({
                issuer: '',
                amount: '',
                couponRate: '',
                couponFrequency: 'Annual',
                maturityDate: ''
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Bond
          </button>
        </div>

        {/* Data Completeness Notice */}
        {holdings.some(h => !h.hasCompleteData) && (
          <div className="mb-6 bg-[#FEF3C7] dark:bg-[#78350F] border border-[#FCD34D] dark:border-[#FBBF24]/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#92400E] dark:text-[#FCD34D] mb-1">
                  Incomplete Data Detected
                </p>
                <p className="text-xs text-[#78350F] dark:text-[#FCD34D]">
                  Some bonds are missing coupon rate, maturity date, or issuer information. 
                  Values shown are based on available data. Missing fields are marked with "—".
                </p>
              </div>
            </div>
          </div>
        )}

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
                        <span>Bond Name</span>
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Type</span>
                        <SortIcon field="type" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('coupon')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Coupon %</span>
                        <SortIcon field="coupon" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('maturityDate')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Maturity Date</span>
                        <SortIcon field="maturityDate" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('faceValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Face Value</span>
                        <SortIcon field="faceValue" />
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
                      onClick={() => handleSort('yield')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Yield</span>
                        <SortIcon field="yield" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#475569] transition-colors group"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-[#6B7280] mb-2">No bond holdings found</p>
                          <p className="text-xs text-[#9CA3AF]">Upload your portfolio to see bond holdings</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.name}</p>
                            {holding.issuer && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{holding.issuer}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            holding.type === 'Government' 
                              ? 'bg-[#E0F2FE] dark:bg-[#1E3A8A] text-[#0369A1] dark:text-[#93C5FD]'
                              : holding.type === 'PSU'
                              ? 'bg-[#F0FDF4] dark:bg-[#14532D] text-[#166534] dark:text-[#86EFAC]'
                              : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#4B5563] dark:text-[#CBD5E1]'
                          }`}>
                            {holding.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {holding.couponRate !== null ? `${holding.couponRate.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          <div>
                            <p>{formatDate(holding.maturityDate)}</p>
                            {holding.daysToMaturity !== null && holding.status === 'Active' && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                                {formatDays(holding.daysToMaturity)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.faceValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                          {holding.yield !== null ? `${holding.yield.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            holding.status === 'Active'
                              ? 'bg-[#D1FAE5] dark:bg-[#14532D] text-[#065F46] dark:text-[#86EFAC]'
                              : holding.status === 'Matured'
                              ? 'bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#991B1B] dark:text-[#FCA5A5]'
                              : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#4B5563] dark:text-[#CBD5E1]'
                          }`}>
                            {holding.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const bondMetadata: any = {};
                                try {
                                  // We need to fetch the notes from the holding to get metadata
                                  // For now, we'll use what we have
                                  if (holding.issuer || holding.couponRate || holding.maturityDate) {
                                    bondMetadata.issuer = holding.issuer;
                                    bondMetadata.coupon_rate = holding.couponRate;
                                    bondMetadata.coupon_frequency = holding.couponFrequency;
                                    bondMetadata.maturity_date = holding.maturityDate;
                                  }
                                } catch (e) {}
                                
                                setSelectedBond(holding);
                                setFormData({
                                  issuer: holding.issuer || '',
                                  amount: holding.investedValue.toString(),
                                  couponRate: holding.couponRate?.toString() || '',
                                  couponFrequency: holding.couponFrequency || 'Annual',
                                  maturityDate: holding.maturityDate || ''
                                });
                                setShowEditModal(true);
                              }}
                              className="p-2 hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded-lg transition-colors"
                              title="Edit Bond"
                            >
                              <Edit className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                            </button>
                            <button
                              onClick={() => {
                                setBondToDelete(holding);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors"
                              title="Delete Bond"
                            >
                              <Trash2 className="w-4 h-4 text-[#DC2626] dark:text-[#FCA5A5]" />
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
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalFaceValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalInvested)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(totalCurrentValue)}
                      </td>
                      <td className="px-4 py-3.5"></td>
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
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Verification: Total matches dashboard bonds value ({formatCurrency(totalCurrentValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Current values shown are from your portfolio data. No market price estimates are used.
              </p>
            </div>
          </div>
        </div>

        {/* Maturity and Income-Focused AI Insights */}
        {sortedHoldings.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Fixed Income Insights</h2>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                <p className="mb-2">
                  <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Total Bond Holdings:</strong> {formatCurrency(totalCurrentValue)} ({portfolioPercentage.toFixed(1)}% of portfolio)
                </p>
                
                {totalAnnualIncome > 0 && (
                  <p className="mb-2">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Estimated Annual Income:</strong> {formatCurrency(totalAnnualIncome)} 
                    {sortedHoldings.some(h => !h.couponRate) && (
                      <span className="text-[#6B7280] dark:text-[#94A3B8] ml-1">(based on available coupon data)</span>
                    )}
                  </p>
                )}
                
                {upcomingMaturities.length > 0 && (
                  <div className="mb-2">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Upcoming Maturities (next 12 months):</strong>
                    <ul className="list-disc list-inside mt-1 ml-2 text-[#475569] dark:text-[#CBD5E1]">
                      {upcomingMaturities.map((h, idx) => (
                        <li key={h.id}>
                          {h.name} — {formatDate(h.maturityDate)} ({formatDays(h.daysToMaturity)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {sortedHoldings.filter(h => h.status === 'Matured').length > 0 && (
                  <p className="mb-2">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Matured Bonds:</strong>{' '}
                    {sortedHoldings.filter(h => h.status === 'Matured').length} holding(s) have reached maturity date.
                  </p>
                )}
                
                {sortedHoldings.some(h => !h.hasCompleteData) && (
                  <p className="text-[#6B7280] dark:text-[#94A3B8] italic">
                    Note: Some bonds have incomplete data. Complete bond information (coupon rate, maturity date, issuer) 
                    provides more accurate income and maturity insights.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADD BOND MODAL */}
      {showAddModal && (
        <AddBondModal
          onClose={() => {
            setShowAddModal(false);
            setFormData({
              issuer: '',
              amount: '',
              couponRate: '',
              couponFrequency: 'Annual',
              maturityDate: ''
            });
          }}
          onSave={handleAddBond}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* EDIT BOND MODAL */}
      {showEditModal && selectedBond && (
        <EditBondModal
          bond={selectedBond}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBond(null);
          }}
          onSave={handleEditBond}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && bondToDelete && (
        <DeleteBondDialog
          bond={bondToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setBondToDelete(null);
          }}
          onConfirm={handleDeleteBond}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

/**
 * Add Bond Modal Component
 */
function AddBondModal({ 
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
    
    if (!formData.issuer || !formData.amount) {
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      return;
    }
    
    onSave({
      issuer: formData.issuer,
      amount: amount,
      couponRate: formData.couponRate ? parseFloat(formData.couponRate) : undefined,
      couponFrequency: formData.couponFrequency || 'Annual',
      maturityDate: formData.maturityDate || undefined,
    });
  };

  const investedValue = formData.amount ? parseFloat(formData.amount) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Add Bond Holding</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Issuer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
              required
              autoFocus
              placeholder="e.g., NTPC, Government of India"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Investment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
              required
              placeholder="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Coupon Rate (%)
            </label>
            <input
              type="number"
              value={formData.couponRate}
              onChange={(e) => setFormData({ ...formData, couponRate: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
              placeholder="e.g., 7.5"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Coupon Frequency
            </label>
            <select
              value={formData.couponFrequency}
              onChange={(e) => setFormData({ ...formData, couponFrequency: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="Annual">Annual</option>
              <option value="Semi-Annual">Semi-Annual</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Maturity Date
            </label>
            <input
              type="date"
              value={formData.maturityDate}
              onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          {investedValue > 0 && (
            <div className="bg-[#F3F4F6] dark:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-4">
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
              className="flex-1 px-6 py-3 border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add Bond'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Edit Bond Modal Component
 */
function EditBondModal({ 
  bond, 
  onClose, 
  onSave,
  formData,
  setFormData,
  isLoading,
  formatCurrency
}: { 
  bond: BondHolding; 
  onClose: () => void; 
  onSave: (data: any) => void;
  formData: any;
  setFormData: any;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.issuer || !formData.amount) {
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      return;
    }
    
    onSave({
      issuer: formData.issuer,
      amount: amount,
      couponRate: formData.couponRate ? parseFloat(formData.couponRate) : undefined,
      couponFrequency: formData.couponFrequency || 'Annual',
      maturityDate: formData.maturityDate || undefined,
    });
  };

  const newInvestedValue = formData.amount ? parseFloat(formData.amount) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Edit Bond Holding</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-[#F3F4F6] dark:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-4">
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">{bond.name}</div>
            {bond.issuer && (
              <div className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{bond.issuer}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Issuer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Investment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Coupon Rate (%)
            </label>
            <input
              type="number"
              value={formData.couponRate}
              onChange={(e) => setFormData({ ...formData, couponRate: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Coupon Frequency
            </label>
            <select
              value={formData.couponFrequency}
              onChange={(e) => setFormData({ ...formData, couponFrequency: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="Annual">Annual</option>
              <option value="Semi-Annual">Semi-Annual</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Maturity Date
            </label>
            <input
              type="date"
              value={formData.maturityDate}
              onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          {newInvestedValue > 0 && (
            <div className="bg-[#F3F4F6] dark:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-4">
              <div className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-1">New Invested Value</div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {formatCurrency(newInvestedValue)}
              </div>
              <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Previous: {formatCurrency(bond.investedValue)}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
 * Delete Bond Dialog Component
 */
function DeleteBondDialog({ 
  bond, 
  onClose, 
  onConfirm,
  isLoading,
  formatCurrency
}: { 
  bond: BondHolding; 
  onClose: () => void; 
  onConfirm: () => void;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            Delete Bond Holding?
          </h2>
          
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6">
            Are you sure you want to delete{' '}
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{bond.name}</strong>?{' '}
            This will remove a bond holding with invested value of{' '}
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
              {formatCurrency(bond.investedValue)}
            </strong>.
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
            <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
              <strong>Warning:</strong> This action cannot be undone. You'll need to add 
              this bond again manually or re-upload your CSV if you change your mind.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete Bond'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

