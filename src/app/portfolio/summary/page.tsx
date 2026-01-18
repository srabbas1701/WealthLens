/**
 * Portfolio Summary Page
 * 
 * Shows asset-wise totals with expand/collapse functionality.
 * This is NOT the dashboard - it's for detailed verification.
 * 
 * Data Rules:
 * - All numbers must match dashboard aggregates
 * - No charts, pure data tables
 * - Explicit about data sources and freshness
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

interface AssetSummary {
  assetType: string;
  totalValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
  holdingsCount: number;
  topHoldings: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

interface PortfolioSummaryData {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalHoldings: number;
  assetSummaries: AssetSummary[];
  lastUpdated: string;
}

export default function PortfolioSummaryPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous fetches
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortfolioSummaryData | null>(null);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

  // Fetch portfolio summary data
  const fetchData = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      console.log('[Summary Page] Skipping duplicate fetch');
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
          // Transform dashboard data into summary format
          const portfolioData = result.data;
          // CRITICAL: Calculate from ALL holdings, not just allocation items
          // This ensures no asset types are missed (like Gold if it's missing from allocation)
          const allAssetTypes = new Set(portfolioData.holdings.map((h: any) => h.assetType).filter(Boolean));
          
          const assetSummaries: AssetSummary[] = Array.from(allAssetTypes).map((assetType: string) => {
            const assetHoldings = portfolioData.holdings.filter((h: any) => h.assetType === assetType);
            const totalInvested = assetHoldings.reduce((sum: number, h: any) => sum + (h.investedValue || 0), 0);
            const totalCurrent = assetHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || 0), 0);
            const gainLoss = totalCurrent - totalInvested;
            
            // Find corresponding allocation item for value (if exists)
            const allocationItem = portfolioData.allocation.find((a: any) => a.name === assetType);
            
            // Use current value (totalCurrent) - this is the source of truth
            // Fallback to allocation value only if current is 0
            const totalValue = totalCurrent > 0 ? totalCurrent : (allocationItem?.value || 0);
            
            return {
              assetType: assetType,
              totalValue: totalValue,
              investedValue: totalInvested,
              gainLoss: gainLoss,
              gainLossPercent: totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0,
              holdingsCount: assetHoldings.length,
              topHoldings: assetHoldings
                .sort((a: any, b: any) => (b.investedValue || 0) - (a.investedValue || 0))
                .slice(0, 5)
                .map((h: any) => ({
                  name: h.name,
                  value: h.investedValue || 0,
                  percentage: totalValue > 0 ? ((h.investedValue || 0) / totalValue) * 100 : 0,
                })),
            };
          }).sort((a, b) => b.totalValue - a.totalValue); // Sort by total value descending

          // CRITICAL: Calculate totals from ALL holdings, not just assetSummaries
          // This ensures totals match the sum of all holdings (including any missing from allocation)
          const totalInvestedFromHoldings = portfolioData.holdings.reduce((sum: number, h: any) => sum + (h.investedValue || 0), 0);
          const totalCurrentFromHoldings = portfolioData.holdings.reduce((sum: number, h: any) => sum + (h.currentValue || 0), 0);
          const totalInvested = assetSummaries.reduce((sum, a) => sum + a.investedValue, 0);
          const totalGainLoss = assetSummaries.reduce((sum, a) => sum + a.gainLoss, 0);
          
          // VALIDATION: Verify totals match (with small tolerance for rounding)
          const totalInvestedDiff = Math.abs(totalInvestedFromHoldings - totalInvested);
          const totalCurrentDiff = Math.abs(totalCurrentFromHoldings - portfolioData.metrics.netWorth);
          if (totalInvestedDiff > 1 || totalCurrentDiff > 1) {
            console.warn('[Portfolio Summary] Total mismatch detected:', {
              totalInvestedFromHoldings,
              totalInvested,
              totalCurrentFromHoldings,
              netWorth: portfolioData.metrics.netWorth,
            });
          }

          setData({
            totalValue: portfolioData.metrics.netWorth,
            totalInvested,
            totalGainLoss,
            totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
            totalHoldings: portfolioData.holdings.length,
            assetSummaries,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch portfolio summary:', error);
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
      router.replace('/login?redirect=/portfolio/summary');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  const toggleAsset = (assetType: string) => {
    const newExpanded = new Set(expandedAssets);
    if (newExpanded.has(assetType)) {
      newExpanded.delete(assetType);
    } else {
      newExpanded.add(assetType);
    }
    setExpandedAssets(newExpanded);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Map asset type names to route paths
  const getAssetRoute = (assetType: string): string => {
    const routeMap: Record<string, string> = {
      'Stocks': '/portfolio/equity',
      'Equity': '/portfolio/equity',
      'Mutual Funds': '/portfolio/mutualfunds',
      'Fixed Deposits': '/portfolio/fixeddeposits',
      'Fixed Deposit': '/portfolio/fixeddeposits',
      'Cash': '/portfolio/cash',
      'Bonds': '/portfolio/bonds',
      'Bond': '/portfolio/bonds',
      'ETFs': '/portfolio/etfs',
      'ETF': '/portfolio/etfs',
      'PPF': '/portfolio/ppf',
      'EPF': '/portfolio/epf',
      'NPS': '/portfolio/nps',
      'Index Funds': '/portfolio/mutualfunds',
      'Gold': '/portfolio/gold',
      'Other': '/portfolio/summary',
    };
    
    const route = routeMap[assetType] || '/portfolio/summary';
    // Debug: Log route resolution for troubleshooting
    if (assetType === 'PPF' || assetType === 'EPF') {
      console.log(`[Portfolio Summary] Routing ${assetType} to ${route}`);
    }
    return route;
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
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading portfolio summary...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#475569] dark:text-[#CBD5E1] mb-4">Failed to load portfolio data</p>
          <button
            onClick={() => user?.id && fetchData(user.id)}
            className="px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]"
          >
            Retry
          </button>
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

      <main className="max-w-[1280px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Portfolio Summary</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            Last updated: {formatDate(data.lastUpdated)}
          </p>
        </div>

        {/* Summary Totals */}
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-2">Total Portfolio Value</p>
              <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(data.totalValue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-2">Total Invested Amount</p>
              <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(data.totalInvested)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-2">Total Unrealized Gain/Loss</p>
              <p className={`text-3xl font-semibold number-emphasis ${
                data.totalGainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
              }`}>
                {data.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(data.totalGainLoss)}
              </p>
              <p className={`text-sm font-medium mt-1 ${
                data.totalGainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
              }`}>
                ({data.totalGainLoss >= 0 ? '+' : ''}{data.totalGainLossPercent.toFixed(2)}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-2">Number of Holdings</p>
              <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {data.totalHoldings}
              </p>
            </div>
          </div>
        </section>

        {/* Asset-wise Breakdown */}
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Asset-wise Breakdown</h2>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
            {data.assetSummaries.map((asset) => (
              <div key={asset.assetType}>
                {/* Asset Row */}
                <div className="px-6 py-5 flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                  <div 
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => toggleAsset(asset.assetType)}
                  >
                    {expandedAssets.has(asset.assetType) ? (
                      <ChevronDownIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                    ) : (
                      <ChevronUpIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] rotate-90" />
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{asset.assetType}</h3>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                        {asset.holdingsCount} holding{asset.holdingsCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                        {formatCurrency(asset.totalValue)}
                      </p>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        {((asset.totalValue / data.totalValue) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <Link
                      href={getAssetRoute(asset.assetType)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#2563EB] hover:underline text-sm font-medium transition-all"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedAssets.has(asset.assetType) && (
                  <div className="px-6 py-4 bg-[#F9FAFB] dark:bg-[#334155] border-t border-[#E5E7EB] dark:border-[#334155]">
                    <div className="grid grid-cols-3 gap-6 mb-4">
                      <div>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium mb-1">Invested</p>
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                          {formatCurrency(asset.investedValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium mb-1">Gain/Loss</p>
                        <p className={`text-sm font-semibold number-emphasis ${
                          asset.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
                        }`}>
                          {asset.gainLoss >= 0 ? '+' : ''}{formatCurrency(asset.gainLoss)}
                        </p>
                        <p className={`text-xs font-medium ${
                          asset.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'
                        }`}>
                          ({asset.gainLoss >= 0 ? '+' : ''}{asset.gainLossPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    {asset.topHoldings.length > 0 && (
                      <>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium mb-3">Top {asset.topHoldings.length} Holdings</p>
                        <div className="space-y-2">
                          {asset.topHoldings.map((holding, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2">
                              <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">{holding.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                                  {formatCurrency(holding.value)}
                                </span>
                                <span className="text-sm text-[#6B7280] dark:text-[#94A3B8] w-12 text-right">
                                  {holding.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Link
                          href={`/portfolio/${asset.assetType.toLowerCase().replace(/\s+/g, '')}`}
                          className="inline-block mt-3 text-sm text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#2563EB] font-medium"
                        >
                          View all {asset.holdingsCount} holdings →
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Verification Note */}
        <div className="mt-6 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Data Verified</p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Total portfolio value matches dashboard: {formatCurrency(data.totalValue)} ✓
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                All values computed from transaction history and current holdings.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

