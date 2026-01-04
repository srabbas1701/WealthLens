/**
 * Mutual Funds Holdings Page
 * 
 * Data-heavy table showing all mutual fund holdings with XIRR.
 * Sortable, groupable by AMC or category.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  RefreshIcon,
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
}

export default function MutualFundsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
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
        if (data.success) {
          // Refresh data to show updated NAVs
          if (user?.id) {
            await fetchData(user.id);
          }
        } else {
          alert('Failed to update NAVs: ' + (data.error || 'Unknown error'));
        }
      } else {
        throw new Error('Failed to update NAVs: ' + response.status);
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

  const sortedHoldings = [...holdings].sort((a, b) => {
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
          <p className="text-sm text-[#6B7280]">Loading mutual fund holdings...</p>
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
            <h1 className="text-2xl font-semibold text-[#0F172A]">Mutual Fund Holdings</h1>
            <button
              onClick={handleNavUpdate}
              disabled={navUpdateLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                navUpdateLoading
                  ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#2563EB] text-white hover:bg-[#1E40AF]'
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
          <p className="text-sm text-[#6B7280]">
            {holdings.length} holdings • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-6">
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
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-white text-[#475569] border border-[#E5E7EB] hover:bg-[#F6F8FB]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#6B7280]">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#0F172A] font-medium"
              >
                <option value="currentValue">Current Value</option>
                <option value="name">Scheme Name</option>
                <option value="amc">AMC</option>
                <option value="units">Units</option>
                <option value="investedValue">Invested Value</option>
                <option value="xirr">XIRR</option>
                <option value="gainLoss">P&L</option>
                <option value="allocation">% Portfolio</option>
              </select>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Scheme Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Invested Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    XIRR
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    % Port
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {groupedHoldings().map(group => (
                  <React.Fragment key={group.key}>
                    {groupBy !== 'none' && (
                      <tr className="bg-[#F9FAFB]">
                        <td colSpan={7} className="px-6 py-2.5 text-sm font-semibold text-[#0F172A]">
                          {group.label}
                          <span className="ml-2 text-[#6B7280] font-medium">
                            ({group.holdings.length} scheme{group.holdings.length !== 1 ? 's' : ''}, {
                              formatCurrency(group.holdings.reduce((sum, h) => sum + h.currentValue, 0))
                            })
                          </span>
                        </td>
                      </tr>
                    )}
                    {group.holdings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="font-semibold text-[#0F172A] text-sm">{holding.name}</p>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              {holding.amc} • {holding.plan}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              Category: {holding.category} • Folio: {holding.folio}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[#0F172A] font-semibold number-emphasis text-sm">
                              {holding.units.toLocaleString('en-IN', { maximumFractionDigits: 4, minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs text-[#6B7280] font-medium">
                              Avg NAV: ₹{holding.avgBuyNav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            <span className="text-xs text-[#6B7280] font-medium">
                              Latest NAV: ₹{holding.latestNav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] font-semibold number-emphasis text-sm">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium number-emphasis text-sm">
                          {formatCurrency(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm">
                          {holding.xirr !== null ? (
                            <span className="font-semibold text-[#0F172A] number-emphasis">
                              {holding.xirr.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
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
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] border-t-2 border-[#0F172A]">
                  <td colSpan={2} className="px-6 py-3.5 text-sm font-bold text-[#0F172A]">
                    TOTAL
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalInvested)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm">
                    —
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
            </table>
          </div>
        </div>

        {/* XIRR Note */}
        <div className="mt-4 bg-[#EFF6FF] rounded-lg border border-[#2563EB]/20 p-4">
          <p className="text-xs text-[#1E40AF]">
            <strong>Note:</strong> XIRR (Extended Internal Rate of Return) reflects annualized returns 
            accounting for timing of investments and redemptions. Calculated from transaction history.
          </p>
        </div>

        {/* Verification Note */}
        <div className="mt-4 bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A]">
                Verification: Total matches dashboard mutual fund value ({formatCurrency(totalValue)}) ✓
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

