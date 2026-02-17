'use client';

/**
 * Real Estate Dashboard
 * 
 * Layout-only component for displaying Real Estate portfolio overview.
 * No business logic or data fetching - ready to receive data via props/hooks.
 * 
 * Features:
 * - KPI cards for key metrics
 * - Chart placeholders for visualizations
 * - Tabbed interface for Properties and Insights
 * - Responsive design (mobile → desktop)
 * - Automatic light/dark mode support
 * 
 * NOTE:
 * This page may be refactored into src/features/real-estate
 * once property detail & edit flows are added.
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusIcon, FileIcon, TrashIcon } from '@/components/icons';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import RealEstateAddModal from '@/components/real-estate/RealEstateAddModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import SimpleToast from '@/components/SimpleToast';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import { LockedFeaturePage } from '@/components/LockedFeaturePage';
import { getCachedRealEstateData, setCachedRealEstateData, isRealEstateCacheStale } from '@/lib/portfolio-cache';
import type { RealEstateDashboardData } from '@/types/realEstateDashboard.types';

// ============================================================================
// TYPES
// ============================================================================

type TabValue = 'properties' | 'insights';

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * KPI Card Component
 * Displays a single key performance indicator
 */
function KPICard({
  label,
  value,
  helperText,
}: {
  label: string;
  value: string;
  helperText?: string;
}) {
  return (
    <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
      <CardHeader className="pb-3">
        <CardDescription className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {value}
          </p>
          {helperText && (
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              {helperText}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Property Value Bar Chart Component
 * Displays property-wise value distribution as horizontal bars
 */
function PropertyValueChart({
  data,
  formatCurrency,
}: {
  data: Array<{ propertyName: string; estimatedValue: number; city: string }>;
  formatCurrency: (value: number) => string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">No properties to display</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.estimatedValue));
  const colors = [
    '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE',
    '#1E40AF', '#1E3A8A', '#1E293B', '#334155', '#475569'
  ];

  return (
    <div className="space-y-4 h-[300px] overflow-y-auto pr-2">
      {data.map((item, index) => {
        const percentage = (item.estimatedValue / maxValue) * 100;
        const color = colors[index % colors.length];
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                  {item.propertyName}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{item.city}</p>
              </div>
              <p className="ml-4 font-semibold text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">
                {formatCurrency(item.estimatedValue)}
              </p>
            </div>
            <div className="w-full h-6 bg-[#F6F8FB] dark:bg-[#0F172A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Asset Allocation Donut Chart Component
 * Displays Real Estate vs Other Assets breakdown
 * Shows asset info only on hover
 */
function AssetAllocationChart({
  data,
  formatCurrency,
}: {
  data: Array<{ assetClass: string; value: number }>;
  formatCurrency: (value: number) => string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">No allocation data</p>
      </div>
    );
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const allocation = data.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
  }));

  // Bright, distinct colors for all asset classes - NO REPEATS
  // Each unique asset class gets a unique, sharp color
  const colors: Record<string, string> = {
    real_estate: '#2563EB',      // Blue - Real Estate
    equity: '#10B981',            // Emerald Green - Equity/Stocks
    stocks: '#10B981',            // Emerald Green - Stocks (same as equity)
    stock: '#10B981',             // Emerald Green - Stock (same as equity)
    mutual_funds: '#7C3AED',     // Purple - Mutual Funds
    mutual_fund: '#7C3AED',      // Purple - Mutual Fund (same as mutual_funds)
    hybrid: '#7C3AED',            // Purple - Hybrid (same as mutual_funds)
    fixed_income: '#F59E0B',     // Amber - Fixed Income
    fixed_deposit: '#F59E0B',    // Amber - Fixed Deposit (same as fixed_income)
    fd: '#F59E0B',                // Amber - FD (same as fixed_income)
    bonds: '#6366F1',             // Indigo - Bonds
    bond: '#6366F1',              // Indigo - Bond (same as bonds)
    cash: '#06B6D4',              // Cyan - Cash
    gold: '#DC2626',              // Red - Gold
    commodity: '#DC2626',         // Red - Commodity (same as gold)
    ppf: '#8B5CF6',               // Violet - PPF
    epf: '#14B8A6',               // Teal - EPF (different from PPF)
    nps: '#EC4899',               // Pink - NPS
    etf: '#22C55E',               // Green - ETFs (different from equity)
    etfs: '#22C55E',             // Green - ETFs (same as etf)
    retirement: '#F43F5E',        // Rose - Retirement (different from NPS)
    other: '#F97316',             // Orange - Other
  };

  const labels: Record<string, string> = {
    real_estate: 'Real Estate',
    equity: 'Equity',
    stocks: 'Stocks',
    mutual_funds: 'Mutual Funds',
    mutual_fund: 'Mutual Fund',
    fixed_income: 'Fixed Income',
    fixed_deposit: 'Fixed Deposit',
    fd: 'Fixed Deposit',
    cash: 'Cash',
    bonds: 'Bonds',
    bond: 'Bond',
    gold: 'Gold',
    ppf: 'PPF',
    epf: 'EPF',
    nps: 'NPS',
    etf: 'ETFs',
    etfs: 'ETFs',
    retirement: 'Retirement',
    other: 'Other',
  };


  const hoveredItem = hoveredIndex !== null ? allocation[hoveredIndex] : null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-[240px]">
      {/* Pie Chart */}
      <div className="relative w-full max-w-[220px] h-[220px] flex-shrink-0 mx-auto">
        <svg viewBox="0 0 200 200" className="w-full h-full" style={{ maxWidth: '100%', height: 'auto' }}>
          {(() => {
            const centerX = 100;
            const centerY = 100;
            const radius = 88; // Large radius for solid pie chart
            let startAngle = -90;

            return allocation.map((item, index) => {
              const angle = item.percentage * 3.6; // Convert percentage to degrees
              const endAngle = startAngle + angle;
              
              if (angle < 0.1) {
                startAngle = endAngle;
                return null;
              }

              // Handle full circle (100% or very close)
              if (angle >= 359.9 || allocation.length === 1) {
                // Get color - assetClass is already normalized
                const color = colors[item.assetClass] || colors.other;
                startAngle = endAngle;
                return (
                  <circle
                    key={index}
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill={color}
                    className={`transition-all duration-300 cursor-pointer ${
                      hoveredIndex === index 
                        ? 'opacity-100' 
                        : hoveredIndex === null 
                          ? 'opacity-100' 
                          : 'opacity-30'
                    }`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              }

              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              const x1 = centerX + radius * Math.cos(startRad);
              const y1 = centerY + radius * Math.sin(startRad);
              const x2 = centerX + radius * Math.cos(endRad);
              const y2 = centerY + radius * Math.sin(endRad);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              // Solid pie chart (no inner radius)
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              // Get color with normalized asset class
              // Use the assetClass as-is since it's already normalized in the allocation data
              const color = colors[item.assetClass] || colors.other;
              
              startAngle = endAngle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={color}
                  className={`transition-all duration-300 cursor-pointer ${
                    hoveredIndex === index 
                      ? 'opacity-100' 
                      : hoveredIndex === null 
                        ? 'opacity-100' 
                        : 'opacity-30'
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            });
          })()}
        </svg>
      </div>
      
      {/* Asset details below chart on hover */}
      {hoveredItem && (
        <div className="w-full max-w-[220px] mt-3 mx-auto">
          <div className="bg-[#1E293B] dark:bg-[#0F172A] rounded-lg border border-[#334155] dark:border-[#1E293B] p-3 shadow-lg">
            <p className="text-sm font-semibold text-[#F8FAFC] text-center mb-2">
              {labels[hoveredItem.assetClass] || hoveredItem.assetClass}
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="text-center flex-1">
                <p className="text-xs text-[#94A3B8] mb-1">Allocation</p>
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  {hoveredItem.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="w-px h-8 bg-[#334155] flex-shrink-0"></div>
              <div className="text-center flex-1">
                <p className="text-xs text-[#94A3B8] mb-1">Value</p>
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  {formatCurrency(hoveredItem.value)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Property List Item Component
 * Displays a single property in the list
 */
function PropertyListItem({
  nickname,
  city,
  propertyType,
  estimatedValue,
  yieldPercent,
}: {
  nickname: string;
  city: string;
  propertyType: string;
  estimatedValue: string;
  yieldPercent: string | null;
}) {
  return (
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] dark:border-[#334155] last:border-b-0 hover:bg-[#F6F8FB] dark:hover:bg-[#1E293B] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {nickname}
          </h3>
        </div>
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
          {city} • {propertyType}
        </p>
      </div>
      <div className="flex items-center gap-6 ml-4">
        <div className="text-right">
          <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {estimatedValue}
          </p>
        </div>
        <div className="text-right min-w-[80px]">
          {yieldPercent ? (
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
              {yieldPercent}%
            </p>
          ) : (
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Insight Card Component
 * Displays a single insight/alert
 */
function InsightCard({
  title,
  description,
  severity = 'info',
}: {
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
}) {
  const severityStyles = {
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
    critical: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
  };

  const severityTextStyles = {
    info: 'text-blue-900 dark:text-blue-100',
    warning: 'text-amber-900 dark:text-amber-100',
    critical: 'text-red-900 dark:text-red-100',
  };

  return (
    <Card className={severityStyles[severity]}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-base ${severityTextStyles[severity]}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-sm ${severityTextStyles[severity]}`}>{description}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RealEstateDashboard() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const fetchingRef = useRef(false);

  const [activeTab, setActiveTab] = useState<TabValue>('properties');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<RealEstateDashboardData | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    propertyId: string | null;
    propertyName: string | null;
  }>({
    isOpen: false,
    propertyId: null,
    propertyName: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Real Estate data
  const fetchData = useCallback(async (userId: string, skipCache = false) => {
    if (fetchingRef.current) {
      return;
    }

    // Try dedicated Real Estate cache first (not overwritten by other portfolio pages)
    if (!skipCache) {
      const cached = getCachedRealEstateData<RealEstateDashboardData>(userId);
      if (cached && cached.summary && Array.isArray(cached.propertyValueSeries)) {
        setDashboardData(cached);
        setLoading(false);

        // Refresh in background if stale
        if (isRealEstateCacheStale(userId)) {
          fetchData(userId, true).catch(err =>
            console.error('[RealEstate] Background refresh failed:', err)
          );
        }
        return;
      }
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/real-estate/assets');

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          // Get assets data
          const assets = result.data;

          // Calculate dashboard data using the mapper
          const { getRealEstateDashboardData } = await import('@/analytics/realEstateDashboard.mapper');

          // Get total net worth for allocation calculation
          let totalNetWorth: number | null = null;
          let fullAllocation: Array<{ assetClass: string; value: number }> = [];

          try {
            const portfolioResponse = await fetch(`/api/portfolio/data?user_id=${userId}`);
            if (portfolioResponse.ok) {
              const portfolioResult = await portfolioResponse.json();
              if (portfolioResult.success && portfolioResult.data?.metrics) {
                totalNetWorth = portfolioResult.data.metrics.netWorth || null;

                // Get holdings to aggregate by individual asset class (not buckets)
                // This ensures each asset class gets its own distinct color
                if (portfolioResult.data.holdings && Array.isArray(portfolioResult.data.holdings) && portfolioResult.data.holdings.length > 0) {
                  try {
                    const { aggregateByClassification } = await import('@/lib/portfolio-classification-aggregation');

                    // Aggregate holdings by individual asset class
                    const classification = aggregateByClassification(
                      portfolioResult.data.holdings.map((h: any) => ({
                        id: h?.id || '',
                        name: h?.name || '',
                        assetType: h?.assetType || 'Unknown',
                        investedValue: h?.investedValue || 0,
                        currentValue: h?.currentValue || 0,
                        metadata: h?.metadata || {},
                      }))
                    );

                    // Use individual asset class allocation (not buckets)
                    if (classification && classification.allocation && Array.isArray(classification.allocation)) {
                      fullAllocation = classification.allocation.map((item: any) => ({
                        assetClass: (item?.assetClass || 'equity').toLowerCase(),
                        value: item?.value || 0,
                      }));
                    }
                  } catch (classificationError) {
                    console.error('[RealEstate] Classification error:', classificationError);
                    fullAllocation = [];
                  }
                } else if (portfolioResult.data.allocation && Array.isArray(portfolioResult.data.allocation)) {
                  // Fallback: Use allocation if holdings not available
                  fullAllocation = portfolioResult.data.allocation.map((item: any) => ({
                    assetClass: (item?.name || 'equity').toLowerCase().replace(/\s+/g, '_'),
                    value: item?.value || 0,
                  }));
                }
              }
            }
          } catch (portfolioError) {
            console.error('[RealEstate] Portfolio data fetch error:', portfolioError);
            fullAllocation = [];
          }

          // Calculate dashboard data
          const dashboard = await getRealEstateDashboardData(assets, totalNetWorth);

          // Merge real estate allocation with other asset classes for the chart
          if (Array.isArray(fullAllocation) && fullAllocation.length > 0) {
            // Normalize asset class names to match color mapping
            // Classification system uses PascalCase (Equity, FixedIncome, etc.)
            // We need to map to lowercase keys that match the color mapping
            const normalizedAllocation = fullAllocation.map(item => {
              let normalizedClass = item.assetClass.toLowerCase().trim();
              
              // Map classification system asset classes to color keys
              // Classification uses: Equity, FixedIncome, Hybrid, Commodity, RealAsset, Cash
              if (normalizedClass === 'equity' || normalizedClass === 'stocks' || normalizedClass === 'stock') {
                normalizedClass = 'equity';
              } else if (normalizedClass === 'fixedincome' || normalizedClass === 'fixed_income' || 
                         normalizedClass === 'fixed deposit' || normalizedClass === 'fixeddeposits' || 
                         normalizedClass === 'fd' || normalizedClass === 'bond' || normalizedClass === 'bonds') {
                normalizedClass = 'fixed_income';
              } else if (normalizedClass === 'hybrid' || normalizedClass === 'mutual fund' || 
                         normalizedClass === 'mutualfunds' || normalizedClass === 'mf') {
                normalizedClass = 'mutual_funds';
              } else if (normalizedClass === 'commodity' || normalizedClass === 'gold') {
                normalizedClass = 'gold'; // Commodity is primarily gold
              } else if (normalizedClass === 'realasset' || normalizedClass === 'real_asset' || 
                         normalizedClass === 'real estate' || normalizedClass === 'realestate' || 
                         normalizedClass === 'property') {
                normalizedClass = 'real_estate';
              } else if (normalizedClass === 'cash') {
                normalizedClass = 'cash';
              } else if (normalizedClass === 'etf' || normalizedClass === 'etfs') {
                normalizedClass = 'etf'; // Keep ETF separate from equity
              } else if (normalizedClass === 'ppf') {
                normalizedClass = 'ppf'; // Keep PPF separate
              } else if (normalizedClass === 'epf') {
                normalizedClass = 'epf'; // Keep EPF separate from PPF
              } else if (normalizedClass === 'nps') {
                normalizedClass = 'nps'; // Keep NPS separate
              } else if (normalizedClass === 'retirement') {
                normalizedClass = 'retirement'; // Keep retirement separate from NPS
              }
              
              return {
                ...item,
                assetClass: normalizedClass,
              };
            });
            
            // Find real estate in full allocation and replace with dashboard data
            const realEstateIndex = normalizedAllocation.findIndex(
              (item) => item.assetClass === 'real_estate'
            );
            
            if (realEstateIndex >= 0) {
              normalizedAllocation[realEstateIndex] = {
                assetClass: 'real_estate',
                value: dashboard.summary.netRealEstateWorth,
              };
            } else {
              // Add real estate if not present
              normalizedAllocation.push({
                assetClass: 'real_estate',
                value: dashboard.summary.netRealEstateWorth,
              });
            }
            
            // Update asset allocation series with normalized data
            dashboard.assetAllocationSeries = normalizedAllocation.filter(item => item.value > 0);
          }

          if (dashboard) {
            setDashboardData(dashboard);
            // Cache in dedicated Real Estate cache (persists across navigation to other pages)
            setCachedRealEstateData(userId, dashboard);
          }
        } else {
          setToast({ message: 'Invalid data format received', type: 'error' });
        }
      } else {
        setToast({ message: 'Failed to fetch real estate data', type: 'error' });
      }
    } catch (error) {
      console.error('[RealEstateDashboard] Error fetching data:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load real estate data';
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Fetch data on mount and when user changes (only if user has real_assets capability)
  // useLayoutEffect: apply cache before paint to avoid loading flash on back-navigation
  useLayoutEffect(() => {
    if (authStatus === 'authenticated' && user?.id && hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
      fetchData(user.id);
    }
  }, [authStatus, user?.id, fetchData, hasCapability]);

  // Capability guard: show locked page BEFORE any API calls
  if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
    return (
      <LockedFeaturePage
        title="Real Estate"
        feature="REAL_ESTATE"
      />
    );
  }

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    // Refresh data
    if (user?.id) {
      fetchData(user.id, true); // Skip cache to get fresh data
    }
    setToast({ message: 'Property added successfully', type: 'success' });
  };

  // Delete handlers
  const handleDeleteClick = (propertyId: string, propertyName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      propertyId,
      propertyName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.propertyId || !user?.id) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/real-estate/assets?id=${deleteConfirmModal.propertyId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setToast({ message: 'Property deleted successfully', type: 'success' });

        // Close modal
        setDeleteConfirmModal({
          isOpen: false,
          propertyId: null,
          propertyName: null,
        });

        // Refresh data
        fetchData(user.id, true); // Skip cache to get fresh data
      } else {
        setToast({
          message: result.error || 'Failed to delete property',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('[RealEstate] Delete error:', error);
      setToast({ message: 'Failed to delete property', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmModal({
      isOpen: false,
      propertyId: null,
      propertyName: null,
    });
  };

  // Export handler
  const handleExport = async () => {
    if (!dashboardData || !dashboardData.properties || dashboardData.properties.length === 0) {
      setToast({ message: 'No data to export', type: 'error' });
      return;
    }

    try {
      const { exportRealEstatePortfolio } = await import('@/exports/realEstate.export');
      await exportRealEstatePortfolio(dashboardData);
      setToast({ message: 'Export successful', type: 'success' });
    } catch (error) {
      console.error('[RealEstate] Export error:', error);
      setToast({ message: 'Export failed', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        showDownload={false}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* ==================================================================== */}
        {/* PAGE HEADER */}
        {/* ==================================================================== */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Real Estate
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Overview of your property investments
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleExport}
                disabled={!dashboardData || !dashboardData.properties || dashboardData.properties.length === 0}
                className="inline-flex items-center justify-center gap-2 p-2.5 md:px-4 md:py-2 min-w-[44px] min-h-[44px] rounded-lg font-medium text-sm border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export"
              >
                <FileIcon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">Export</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 p-2.5 md:px-4 md:py-2 min-w-[44px] min-h-[44px] bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg font-medium text-sm hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                title="Add Property"
              >
                <PlusIcon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">Add Property</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KPI CARDS SECTION */}
        {/* ==================================================================== */}
        <section className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Real Estate Value"
              value={
                loading
                  ? 'Loading...'
                  : dashboardData
                    ? formatCurrency(dashboardData.summary.totalEstimatedValue)
                    : '—'
              }
              helperText="Sum of all property values"
            />
            <KPICard
              label="Net Real Estate Worth"
              value={
                loading
                  ? 'Loading...'
                  : dashboardData
                    ? formatCurrency(dashboardData.summary.netRealEstateWorth)
                    : '—'
              }
              helperText="After deducting loans"
            />
            <KPICard
              label="Average Rental Yield"
              value={
                loading
                  ? 'Loading...'
                  : dashboardData &&
                    dashboardData.summary &&
                    typeof dashboardData.summary.averageNetRentalYield === 'number'
                    ? `${dashboardData.summary.averageNetRentalYield.toFixed(2)}%`
                    : '—'
              }
              helperText="Across all rented properties"
            />
            <KPICard
              label="% of Total Portfolio"
              value={
                loading
                  ? 'Loading...'
                  : dashboardData &&
                    dashboardData.summary &&
                    typeof dashboardData.summary.portfolioAllocationPercent === 'number'
                    ? `${dashboardData.summary.portfolioAllocationPercent.toFixed(1)}%`
                    : '—'
              }
              helperText="Real estate allocation"
            />
          </div>
        </section>

        {/* ==================================================================== */}
        {/* CHARTS SECTION */}
        {/* ==================================================================== */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property-wise Value Chart */}
            <div className="lg:col-span-2">
              <Card className="h-full bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                    Property-wise Value
                  </CardTitle>
                  <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">
                    Distribution of value across properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData ? (
                    <PropertyValueChart
                      data={dashboardData.propertyValueSeries}
                      formatCurrency={formatCurrency}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading chart data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Real Estate vs Other Assets Pie Chart */}
            <div className="lg:col-span-1">
              <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                    Real Estate vs Other Assets
                  </CardTitle>
                  <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">
                    Portfolio allocation breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 pb-4">
                  {dashboardData ? (
                    <AssetAllocationChart
                      data={dashboardData.assetAllocationSeries}
                      formatCurrency={formatCurrency}
                    />
                  ) : (
                    <div className="flex items-center justify-center min-h-[280px]">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading chart data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* TABBED SECTION */}
        {/* ==================================================================== */}
        <section>
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader>
              {/* Tabs Navigation */}
              <div className="flex gap-1 border-b border-[#E5E7EB] dark:border-[#334155]">
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'properties'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Properties
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'insights'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Insights
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Properties Tab */}
              {activeTab === 'properties' && (
                <div className="space-y-0">
                  {loading ? (
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] text-center py-8">
                      Loading properties...
                    </p>
                  ) : dashboardData && dashboardData.properties && dashboardData.properties.length > 0 ? (
                    <div className="border border-[#E5E7EB] dark:border-[#334155] rounded-lg divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                      {dashboardData.properties.map((property) => (
                        <div
                          key={property.propertyId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#E5E7EB] dark:border-[#334155] last:border-b-0 hover:bg-[#F6F8FB] dark:hover:bg-[#1E293B] transition-colors"
                        >
                          <div
                            className="flex-1 min-w-0 cursor-pointer order-1"
                            onClick={() => router.push(`/portfolio/real-estate/${property.propertyId}`)}
                          >
                            <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] break-words">
                              {property.propertyName}
                            </h3>
                            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                              {property.city} • {property.propertyType}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 sm:gap-6 sm:ml-4 shrink-0 order-2">
                            <div className="text-right">
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Value</p>
                              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm sm:text-base">
                                {formatCurrency(property.estimatedValue)}
                              </p>
                            </div>
                            <div className="text-right min-w-[60px] sm:min-w-[80px]">
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Rental Yield</p>
                              {typeof property.netRentalYield === 'number' ? (
                                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                  {property.netRentalYield.toFixed(2)}%
                                </p>
                              ) : (
                                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">—</p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(property.propertyId, property.propertyName);
                              }}
                              className="p-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors"
                              title="Delete property"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-4 text-center">
                      No properties added yet. Click &quot;Add Property&quot; to get started.
                    </p>
                  )}
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] text-center py-8">
                      Loading insights...
                    </p>
                  ) : dashboardData && dashboardData.insights && dashboardData.insights.length > 0 ? (
                    dashboardData.insights.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        title={insight.title}
                        description={insight.description}
                        severity={insight.severity}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] text-center pt-4">
                      No insights available. Add properties to see recommendations.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Add Property Modal */}
      <RealEstateAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Property"
        message={`Are you sure you want to delete "${deleteConfirmModal.propertyName}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Toast Notifications */}
      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
