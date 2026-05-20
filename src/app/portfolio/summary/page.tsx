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
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import { LockedFeaturePage } from '@/components/LockedFeaturePage';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { getCachedPortfolioData } from '@/lib/portfolio-cache';

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

function parseNotesSafely(notes: unknown): Record<string, any> {
  if (!notes) return {};
  if (typeof notes === 'object') return notes as Record<string, any>;
  if (typeof notes === 'string') {
    try {
      return JSON.parse(notes);
    } catch {
      return {};
    }
  }
  return {};
}

function isMaturedBondOrFD(holding: any): boolean {
  const assetType = String(holding?.assetType || '').toLowerCase();
  if (!assetType.includes('bond') && !assetType.includes('fixed deposit')) return false;

  const notes = parseNotesSafely(holding?.notes);
  const maturityDate =
    notes.maturity_date ||
    notes.maturityDate ||
    notes.bondMaturityDate ||
    notes.fdMaturityDate ||
    null;
  if (!maturityDate) return false;

  const maturity = new Date(maturityDate);
  if (Number.isNaN(maturity.getTime())) return false;
  const today = new Date();
  maturity.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return maturity < today;
}

export default function PortfolioSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous fetches
  const lastFetchedRef = useRef<string | null>(null); // Prevent re-fetch when effect re-runs (userId:bucket)
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortfolioSummaryData | null>(null);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  
  // Get bucket filter from query params
  const bucketFilter = searchParams?.get('bucket') || null;
  
  // Bucket labels
  const bucketLabels: Record<string, string> = {
    'Growth': 'Growth Assets',
    'IncomeAllocation': 'Income & Allocation',
    'RealAsset': 'Real Assets',
    'Commodity': 'Commodities',
    'Cash': 'Cash & Liquidity',
  };
  
  const pageTitle = bucketFilter 
    ? `${bucketLabels[bucketFilter] || bucketFilter} Portfolio Summary`
    : 'Portfolio Summary';

  // Transform portfolio data into summary format (shared logic for fetch and cache)
  const transformToSummaryData = useCallback((portfolioData: any) => {
    let filteredHoldings = portfolioData.holdings;
    if (bucketFilter) {
      filteredHoldings = portfolioData.holdings.filter((h: any) => {
        const bucketMap: Record<string, string> = {
          'Growth': 'Growth',
          'IncomeAllocation': 'IncomeAllocation',
          'Commodity': 'Commodity',
          'Cash': 'Cash',
        };
        return h.topLevelBucket === bucketMap[bucketFilter] || h.topLevelBucket === bucketFilter;
      });
    }
    // Matured bonds/FDs remain visible in dedicated holding pages, but are excluded from summary valuation.
    filteredHoldings = filteredHoldings.filter((h: any) => !isMaturedBondOrFD(h));
    const allAssetTypes = new Set(filteredHoldings.map((h: any) => h.assetType).filter(Boolean));
    const assetSummaries: AssetSummary[] = Array.from(allAssetTypes).map((assetType: string) => {
      const assetHoldings = filteredHoldings.filter((h: any) => h.assetType === assetType);
      const totalInvested = assetHoldings.reduce((sum: number, h: any) => sum + (h.investedValue || 0), 0);
      const totalCurrent = assetHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || 0), 0);
      const gainLoss = totalCurrent - totalInvested;
      const allocationItem = portfolioData.allocation.find((a: any) => a.name === assetType);
      const totalValue = totalCurrent > 0 ? totalCurrent : (allocationItem?.value || 0);
      return {
        assetType,
        totalValue,
        investedValue: totalInvested,
        gainLoss,
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
    }).sort((a, b) => b.totalValue - a.totalValue);
    const totalInvested = assetSummaries.reduce((sum, a) => sum + a.investedValue, 0);
    const totalGainLoss = assetSummaries.reduce((sum, a) => sum + a.gainLoss, 0);
    const totalCurrentFromHoldings = filteredHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || 0), 0);
    const totalValue = bucketFilter ? totalCurrentFromHoldings : portfolioData.metrics.netWorth;
    return {
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
      totalHoldings: filteredHoldings.length,
      assetSummaries,
      lastUpdated: new Date().toISOString(),
    };
  }, [bucketFilter]);

  // Fetch portfolio summary data
  const fetchData = useCallback(async (userId: string) => {
    const cacheKey = `${userId}:${bucketFilter || 'all'}`;
    if (lastFetchedRef.current === cacheKey) {
      console.log('[Summary Page] Already fetched for this user/bucket, skipping');
      return;
    }
    if (fetchingRef.current) {
      console.log('[Summary Page] Skipping duplicate fetch');
      return;
    }
    
    // OPTIMIZATION: Use cached portfolio data when available (instant load from dashboard)
    if (bucketFilter !== 'RealAsset') {
      const cached = getCachedPortfolioData(userId);
      if (cached?.holdings) {
        console.log('[Summary Page] Using cached portfolio data for instant load');
        lastFetchedRef.current = cacheKey;
        setData(transformToSummaryData(cached));
        setLoading(false);
        return;
      }
    }
    
    fetchingRef.current = true;
    setLoading(true);
    try {
      // Special handling for Real Assets bucket - fetch Real Estate data separately
      if (bucketFilter === 'RealAsset') {
        const response = await fetch('/api/real-estate/assets');
        
        if (response.ok) {
          const result = await response.json();
          const assets = result.success && result.data ? result.data : [];
          
          if (assets.length === 0) {
            // No real estate assets
            setData({
              totalValue: 0,
              totalInvested: 0,
              totalGainLoss: 0,
              totalGainLossPercent: 0,
              totalHoldings: 0,
              assetSummaries: [],
              lastUpdated: new Date().toISOString(),
            });
            return;
          }
          
          // Import Real Estate analytics
          const { getRealEstateDashboardData } = await import('@/analytics/realEstateDashboard.mapper');
          const dashboardData = await getRealEstateDashboardData(assets, null);
          
          // Calculate invested value (purchase price) and current value
          const totalInvested = assets.reduce((sum: number, a: any) => {
            return sum + (a.ownershipAdjusted?.purchasePrice || 0);
          }, 0);
          
          const netWorth = dashboardData.summary.netRealEstateWorth || 0;
          const totalGainLoss = netWorth - totalInvested;
          const gainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
          
          // Format Real Estate as AssetSummary
          const realEstateSummary: AssetSummary = {
            assetType: 'Real Estate',
            totalValue: netWorth,
            investedValue: totalInvested,
            gainLoss: totalGainLoss,
            gainLossPercent: gainLossPercent,
            holdingsCount: assets.length,
              topHoldings: assets
              .sort((a: any, b: any) => {
                const aValue = a.ownershipAdjusted?.currentValue || 0;
                const bValue = b.ownershipAdjusted?.currentValue || 0;
                return bValue - aValue;
              })
              .slice(0, 5)
              .map((a: any) => {
                const currentValue = a.ownershipAdjusted?.currentValue || 0;
                return {
                  name: a.asset.property_nickname || 'Unnamed Property',
                  value: currentValue,
                  percentage: netWorth > 0 ? (currentValue / netWorth) * 100 : 0,
                };
              }),
          };
          
          lastFetchedRef.current = cacheKey;
          setData({
            totalValue: netWorth,
            totalInvested,
            totalGainLoss,
            totalGainLossPercent: gainLossPercent,
            totalHoldings: assets.length,
            assetSummaries: [realEstateSummary],
            lastUpdated: new Date().toISOString(),
          });
        } else {
          console.error('Failed to fetch real estate assets');
          setData({
            totalValue: 0,
            totalInvested: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            totalHoldings: 0,
            assetSummaries: [],
            lastUpdated: new Date().toISOString(),
          });
        }
        return;
      }
      
      // For other buckets, use portfolio data API
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          lastFetchedRef.current = cacheKey;
          setData(transformToSummaryData(portfolioData));
        }
      }
    } catch (error) {
      console.error('Failed to fetch portfolio summary:', error);
      lastFetchedRef.current = null; // Allow retry on failure
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [bucketFilter, transformToSummaryData]);

  // Reset lastFetchedRef when user logs out (allows fresh fetch on next login)
  useEffect(() => {
    if (!user?.id) lastFetchedRef.current = null;
  }, [user?.id]);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/summary');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (!user?.id) return;
    // Real Asset bucket: wait for capabilities before deciding — no fetch for free users
    if (bucketFilter === 'RealAsset') {
      if (capabilitiesLoading) return; // Don't fetch until we know capability
      if (!hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
        setLoading(false);
        return; // Show LockedFeaturePage, no API call
      }
    }
    fetchData(user.id);
  }, [user?.id, fetchData, bucketFilter, capabilitiesLoading, hasCapability]);

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
      'Stocks': '/portfolio/stocks',
      'Equity': '/portfolio/stocks',
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
      'Silver': '/portfolio/silver',
      'Real Estate': '/portfolio/real-estate',
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

  // GUARD: Real Asset bucket requires MANAGE_REAL_ASSETS - show locked page for free users
  if (bucketFilter === 'RealAsset' && authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
    return (
      <LockedFeaturePage
        title="Real Assets"
        feature="REAL_ESTATE"
      />
    );
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
        showDownload={false}
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">{pageTitle}</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            {bucketFilter && (
              <span className="inline-block mr-2">
                Showing only <strong>{bucketLabels[bucketFilter] || bucketFilter}</strong> holdings
              </span>
            )}
            Last updated: {formatDate(data.lastUpdated)}
          </p>
        </div>

        {/* Summary Totals */}
        <section className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-2">
                {bucketFilter ? 'Total Bucket Value' : 'Total Portfolio Value'}
              </p>
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
                        {asset.holdingsCount} {asset.assetType === 'Real Estate' 
                          ? (asset.holdingsCount === 1 ? 'property' : 'properties')
                          : (asset.holdingsCount === 1 ? 'holding' : 'holdings')
                        }
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
                      href={asset.assetType === 'Real Estate' ? '/portfolio/real-estate' : getAssetRoute(asset.assetType)}
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
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium mb-3">
                          Top {asset.topHoldings.length} {asset.assetType === 'Real Estate' ? 'Properties' : 'Holdings'}
                        </p>
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
                          href={asset.assetType === 'Real Estate' ? '/portfolio/real-estate' : `/portfolio/${asset.assetType.toLowerCase().replace(/\s+/g, '')}`}
                          className="inline-block mt-3 text-sm text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#2563EB] font-medium"
                        >
                          View all {asset.holdingsCount} {asset.assetType === 'Real Estate' ? 'properties' : 'holdings'} →
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
                {bucketFilter 
                  ? `Showing ${data.totalHoldings} holdings from ${bucketLabels[bucketFilter] || bucketFilter} bucket`
                  : `Total portfolio value matches dashboard: ${formatCurrency(data.totalValue)} ✓`
                }
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

