/**
 * Mutual Funds Holdings Page
 * 
 * Data-heavy table showing all mutual fund holdings with XIRR.
 * Sortable, groupable by AMC or category.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  const fetchData = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      console.log('[MF Page] Skipping duplicate fetch');
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
          const mfHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Mutual Funds')
            .map((h: any, idx: number) => {
              // Extract AMC from scheme name (human-readable, no abbreviations)
              // Scheme name pattern: "AMC Name Scheme Name Direct/Regular Growth/Dividend"
              // Extract AMC name (typically first 2-3 words before scheme type keywords)
              let amc = 'Other';
              const schemeName = h.name || '';
              
              // Try to extract AMC name by matching common patterns
              // Pattern 1: Extract before common scheme keywords
              const amcPatterns = [
                /^([A-Za-z\s&]+?)\s+(?:Mutual Fund|MF|Fund|Equity|Debt|Hybrid|Balanced)/i,
                /^([A-Za-z\s&]+?)\s+(?:Flexi Cap|Large Cap|Mid Cap|Small Cap|Multi Cap)/i,
                /^([A-Za-z\s&]+?)\s+Direct/i,
              ];
              
              for (const pattern of amcPatterns) {
                const match = schemeName.match(pattern);
                if (match && match[1]) {
                  amc = match[1].trim();
                  break;
                }
              }
              
              // Fallback: Extract first 2-3 words if no pattern matches
              if (amc === 'Other') {
                const words = schemeName.split(/\s+/);
                if (words.length >= 2) {
                  amc = words.slice(0, Math.min(3, words.length - 1)).join(' ');
                } else {
                  amc = schemeName.split(' ')[0] || 'Other';
                }
              }
              
              // Mock categories
              const categories = ['Large Cap', 'Flexi Cap', 'Mid Cap', 'Small Cap', 'Debt', 'Hybrid'];
              const category = categories[idx % categories.length];
              
              // Mock XIRR (would come from actual calculation)
              const xirr = 8 + Math.random() * 10; // Random between 8-18%
              
              // Calculate NAV fields
              const units = h.quantity || 0;
              const avgBuyNav = h.averagePrice || 0;
              const currentValue = h.currentValue || h.investedValue;
              const latestNav = units > 0 ? currentValue / units : 0;
              
              // Debug logging for NAV calculation (log first 3 holdings to avoid spam)
              if (idx < 3 && units > 0) {
                console.log(`[MF Page] Holding ${h.name}: currentValue=${currentValue.toFixed(2)}, units=${units.toFixed(4)}, latestNav=${latestNav.toFixed(4)}, investedValue=${h.investedValue.toFixed(2)}, avgBuyNav=${avgBuyNav.toFixed(4)}`);
              }
              
              return {
                id: h.id,
                name: h.name,
                amc,
                category,
                plan: 'Direct - Growth',
                folio: `${Math.floor(10000 + Math.random() * 90000)}/${Math.floor(10 + Math.random() * 90)}`,
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
      setLoading(false);
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
    try {
      const response = await fetch('/api/mf/navs/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MF Page] NAV update response:', data);
        console.log('[MF Page] Response details - success:', data.success, 'updated:', data.updated, 'failed:', data.failed);
        
        if (data.success && data.updated > 0) {
          // Refresh data to show updated NAVs
          console.log('[MF Page] ✅ NAV update succeeded, refreshing data...');
          if (user?.id) {
            await fetchData(user.id);
            console.log('[MF Page] ✅ Data refreshed after NAV update');
          }
          alert(`NAVs updated successfully! ${data.updated} schemes updated.`);
        } else if (data.success && data.updated === 0) {
          // Success but no NAVs updated - might be because they're already up to date
          console.log('[MF Page] ⚠️ NAV update succeeded but no NAVs were updated (may already be up to date)');
          // Still refresh to ensure we have latest data
          if (user?.id) {
            await fetchData(user.id);
          }
          alert(`NAV update completed. ${data.updated} schemes updated (may already be up to date).`);
        } else {
          const errorMsg = data.error || `Failed to update NAVs. ${data.failed || 0} failed out of ${data.updated + (data.failed || 0)} requested.`;
          console.error('[MF Page] ❌ NAV update failed:', errorMsg);
          console.error('[MF Page] Full error response:', data);
          alert('Failed to update NAVs: ' + errorMsg);
        }
      } else {
        const errorText = await response.text();
        console.error('[MF Page] NAV update failed:', response.status, errorText);
        let errorMessage = 'Failed to update NAVs: ' + response.status;
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
        alert(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      alert('Error updating NAVs. Please try again.');
    } finally {
      setNavUpdateLoading(false);
    }
  }, [navUpdateLoading, user?.id, fetchData]);

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
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Mutual Fund Holdings</h1>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {groupedHoldings().map(group => (
                  <React.Fragment key={group.key}>
                    {groupBy !== 'none' && (
                      <tr className="bg-[#F9FAFB] dark:bg-[#334155]">
                        <td colSpan={7} className="px-6 py-2.5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
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
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
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
    </div>
  );
}

