'use client';

/**
 * Real Estate Property Detail Dashboard
 * 
 * Displays detailed view of a single property with analytics.
 * 
 * Features:
 * - Property header with actions
 * - KPI strip for key metrics
 * - Tabbed interface for Performance, Cash Flow, Loan, and Property Details
 * - Responsive design (mobile → desktop)
 * - Automatic light/dark mode support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/lib/auth/context';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import { LockedFeaturePage } from '@/components/LockedFeaturePage';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { getRealEstateAssetById, type OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
import { getRealEstatePropertyDetailData } from '@/analytics/realEstatePropertyDetail.mapper';
import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';
import { getPropertyAlerts } from '@/analytics/realEstatePropertyAlerts.engine';
import type { RealEstatePropertyAlert } from '@/types/realEstatePropertyAlerts.types';
import UpdateRentalModal from '@/components/real-estate/UpdateRentalModal';
import AddOrUpdateLoanModal from '@/components/real-estate/AddOrUpdateLoanModal';
import UpdateValuationModal from '@/components/real-estate/UpdateValuationModal';
import EditPropertyModal from '@/components/real-estate/EditPropertyModal';
import SellHoldSimulation from '@/components/real-estate/SellHoldSimulation';
import { exportRealEstateProperty } from '@/exports/realEstate.export';
import { FileIcon, ArrowLeftIcon, ArrowRightIcon, PlusIcon } from '@/components/icons';

// ============================================================================
// TYPES
// ============================================================================

type TabValue = 'performance' | 'cashflow' | 'loan' | 'details';

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * KPI Item Component
 * Displays a single key performance indicator in the KPI strip
 */
function KPIItem({
  label,
  value,
  helperText,
}: {
  label: string;
  value: string;
  helperText?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]">{label}</p>
      <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
        {value}
      </p>
      {helperText && (
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Info Row Component
 * Displays a label-value pair in property details
 */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[#E5E7EB] dark:border-[#334155] last:border-b-0">
      <span className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">{label}</span>
      <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC] text-right ml-4">
        {value ?? '—'}
      </span>
    </div>
  );
}

/**
 * Value vs Purchase Price Chart
 * Multi-point line chart showing annual value progression from purchase to now
 */
function ValueVsPurchaseChart({
  purchaseDate,
  purchasePrice,
  currentValue,
  formatValue,
  formatDate,
}: {
  purchaseDate: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  formatValue: (v: number | null) => string;
  formatDate: (d: string | null) => string;
}) {
  const hasData = purchasePrice != null && purchasePrice > 0 && currentValue != null && currentValue >= 0;
  const labelStart = purchaseDate ? formatDate(purchaseDate) : 'Purchase';
  const labelEnd = 'Now';

  if (!hasData) {
    return (
      <Card className="h-full bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
        <CardHeader>
          <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">Value vs Purchase Price</CardTitle>
          <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">
            Property value trend over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-[#F6F8FB] dark:bg-[#0F172A] rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#334155]">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Add purchase price and valuation to see the trend
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate annual data points
  const generateTrendData = () => {
    if (!purchaseDate) return [
      { value: purchasePrice, label: 'Purchase', date: null },
      { value: currentValue, label: 'Now', date: null },
    ];

    const startDate = new Date(purchaseDate);
    const nowDate = new Date();
    const yearsDiff = (nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsDiff < 0.5) {
      // Less than 6 months, just show start and end
      return [
        { value: purchasePrice, label: 'Purchase', date: purchaseDate },
        { value: currentValue, label: 'Now', date: null },
      ];
    }

    // Calculate annual appreciation rate using CAGR formula
    const cagr = Math.pow(currentValue / purchasePrice, 1 / yearsDiff) - 1;

    // Generate points for each year
    const points: { value: number; label: string; date: string | null }[] = [];
    const numYears = Math.ceil(yearsDiff);

    for (let year = 0; year <= numYears; year++) {
      const pointDate = new Date(startDate);
      pointDate.setFullYear(pointDate.getFullYear() + year);

      // Calculate projected value for this year
      const projectedValue = purchasePrice * Math.pow(1 + cagr, year);
      const isLastPoint = year === numYears;
      const label = year === 0 ? 'Purchase' : (isLastPoint ? 'Now' : `Year ${year}`);

      points.push({
        value: isLastPoint ? currentValue : projectedValue,
        label: label,
        date: isLastPoint ? null : pointDate.toISOString().split('T')[0],
      });
    }

    return points;
  };

  const trendData = generateTrendData();
  const minVal = Math.min(...trendData.map(p => p.value));
  const maxVal = Math.max(...trendData.map(p => p.value));
  const range = maxVal - minVal || 1;
  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const w = 320;
  const h = 280;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const y = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;
  const pointSpacing = chartW / Math.max(1, trendData.length - 1);

  // Generate path for line
  const pathLine = trendData
    .map((point, idx) => {
      const x = padding.left + idx * pointSpacing;
      const yVal = y(point.value);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${yVal}`;
    })
    .join(' ');

  // Generate path for area
  const pathArea =
    pathLine +
    ` L ${padding.left + (trendData.length - 1) * pointSpacing} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  return (
    <Card className="h-full bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
      <CardHeader>
        <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">Value vs Purchase Price</CardTitle>
        <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">
          Property value trend over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[300px]" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="value-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={pathArea} fill="url(#value-trend-gradient)" />
            <path
              d={pathLine}
              fill="none"
              stroke="#2563EB"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {trendData.map((point, idx) => {
              const x = padding.left + idx * pointSpacing;
              const yVal = y(point.value);
              return (
                <circle key={idx} cx={x} cy={yVal} r={4} fill="#2563EB" />
              );
            })}
            {trendData.map((point, idx) => {
              const x = padding.left + idx * pointSpacing;
              const showLabel = idx === 0 || idx === trendData.length - 1 || trendData.length <= 4;
              if (!showLabel) return null;
              return (
                <text
                  key={`label-${idx}`}
                  x={x}
                  y={padding.top + chartH + 20}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-xs text-[#6B7280] dark:text-[#94A3B8]"
                >
                  {point.label}
                </text>
              );
            })}
          </svg>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280] dark:text-[#94A3B8]">
              {labelStart}: <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatValue(purchasePrice)}</span>
            </span>
            <span className="text-[#6B7280] dark:text-[#94A3B8]">
              {labelEnd}: <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatValue(currentValue)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loan Outstanding Trend Chart
 * Multi-point line chart showing annual loan paydown from start to now
 */
function LoanOutstandingChart({
  loanAmount,
  outstandingBalance,
  purchaseDate,
  hasLoan,
  formatValue,
  formatDate,
}: {
  loanAmount: number | null;
  outstandingBalance: number | null;
  purchaseDate: string | null;
  hasLoan: boolean;
  formatValue: (v: number | null) => string;
  formatDate: (d: string | null) => string;
}) {
  const labelStart = purchaseDate ? formatDate(purchaseDate) : 'Loan Start';
  const labelEnd = 'Now';

  // Check if loan is closed (outstanding balance = 0)
  const isLoanClosed = outstandingBalance === 0 || outstandingBalance === null;

  if (!hasLoan || loanAmount == null || loanAmount <= 0 || isLoanClosed) {
    const emptyMessage = isLoanClosed
      ? 'Loan has been fully paid off'
      : 'No loan. Add loan details to see the paydown trend.';

    return (
      <Card className="h-full bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
        <CardHeader>
          <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">Loan Outstanding Trend</CardTitle>
          <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">
            Remaining loan balance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-[#F6F8FB] dark:bg-[#0F172A] rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#334155]">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              {emptyMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate annual loan paydown data points
  const generateLoanTrendData = () => {
    const ob = outstandingBalance ?? loanAmount;

    if (!purchaseDate) return [
      { value: loanAmount, label: 'Loan Start', date: null },
      { value: ob, label: 'Now', date: null },
    ];

    const startDate = new Date(purchaseDate);
    const nowDate = new Date();
    const yearsDiff = (nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsDiff < 0.5) {
      // Less than 6 months, just show start and end
      return [
        { value: loanAmount, label: 'Loan Start', date: purchaseDate },
        { value: ob, label: 'Now', date: null },
      ];
    }

    // Calculate annual paydown rate
    const totalPaydown = loanAmount - ob;
    const annualPaydown = totalPaydown / yearsDiff;

    // Generate points for each year
    const points: { value: number; label: string; date: string | null }[] = [];
    const numYears = Math.ceil(yearsDiff);

    for (let year = 0; year <= numYears; year++) {
      const pointDate = new Date(startDate);
      pointDate.setFullYear(pointDate.getFullYear() + year);

      // Calculate projected outstanding for this year
      const projectedOutstanding = Math.max(0, loanAmount - annualPaydown * year);
      const isLastPoint = year === numYears;
      const label = year === 0 ? 'Loan Start' : (isLastPoint ? 'Now' : `Year ${year}`);

      points.push({
        value: isLastPoint ? ob : projectedOutstanding,
        label: label,
        date: isLastPoint ? null : pointDate.toISOString().split('T')[0],
      });
    }

    return points;
  };

  const loanTrendData = generateLoanTrendData();
  const minVal = Math.min(0, ...loanTrendData.map(p => p.value));
  const maxVal = Math.max(...loanTrendData.map(p => p.value));
  const range = maxVal - minVal || 1;
  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const w = 320;
  const h = 280;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const y = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;
  const pointSpacing = chartW / Math.max(1, loanTrendData.length - 1);

  // Generate path for line
  const pathLine = loanTrendData
    .map((point, idx) => {
      const x = padding.left + idx * pointSpacing;
      const yVal = y(point.value);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${yVal}`;
    })
    .join(' ');

  // Generate path for area
  const pathArea =
    pathLine +
    ` L ${padding.left + (loanTrendData.length - 1) * pointSpacing} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  return (
    <Card className="h-full bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
      <CardHeader>
        <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">Loan Outstanding Trend</CardTitle>
        <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">
          Remaining loan balance over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[300px]" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="loan-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={pathArea} fill="url(#loan-trend-gradient)" />
            <path
              d={pathLine}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {loanTrendData.map((point, idx) => {
              const x = padding.left + idx * pointSpacing;
              const yVal = y(point.value);
              return (
                <circle key={idx} cx={x} cy={yVal} r={4} fill="#F59E0B" />
              );
            })}
            {loanTrendData.map((point, idx) => {
              const x = padding.left + idx * pointSpacing;
              const showLabel = idx === 0 || idx === loanTrendData.length - 1 || loanTrendData.length <= 4;
              if (!showLabel) return null;
              return (
                <text
                  key={`label-${idx}`}
                  x={x}
                  y={padding.top + chartH + 20}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-xs text-[#6B7280] dark:text-[#94A3B8]"
                >
                  {point.label}
                </text>
              );
            })}
          </svg>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280] dark:text-[#94A3B8]">
              {labelStart}: <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatValue(loanAmount)}</span>
            </span>
            <span className="text-[#6B7280] dark:text-[#94A3B8]">
              {labelEnd}: <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{formatValue(outstandingBalance)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Section Header Component
 * Displays a section title with optional description
 */
function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{description}</p>
      )}
    </div>
  );
}

/**
 * Alert Card Component
 * Displays a single property alert/insight
 */
function AlertCard({
  alert,
}: {
  alert: RealEstatePropertyAlert;
}) {
  const severityStyles = {
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
    critical: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
  };

  return (
    <Card className={severityStyles[alert.severity]}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{alert.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-sm ${
          alert.severity === 'info' ? 'text-blue-900 dark:text-blue-100' :
          alert.severity === 'warning' ? 'text-amber-900 dark:text-amber-100' :
          'text-red-900 dark:text-red-100'
        }`}>{alert.description}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const propertyId = params.propertyId as string;
  const fetchingRef = useRef(false);

  const [activeTab, setActiveTab] = useState<TabValue>('performance');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RealEstatePropertyDetailData | null>(null);
  const [assetData, setAssetData] = useState<OwnershipAdjustedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);

  // Tabs scroll state - arrows show when tabs overflow
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsScroll, setTabsScroll] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateTabsScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth;
    setTabsScroll({
      hasOverflow,
      canScrollLeft: hasOverflow && scrollLeft > 0,
      canScrollRight: hasOverflow && scrollLeft + clientWidth < scrollWidth,
    });
  }, []);

  useEffect(() => {
    updateTabsScrollState();
    const el = tabsScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateTabsScrollState);
    ro.observe(el);
    el.addEventListener('scroll', updateTabsScrollState);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateTabsScrollState);
    };
  }, [updateTabsScrollState, data]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const step = Math.min(200, el.clientWidth * 0.6);
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  const fetchData = useCallback(async (userId: string, assetId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const fetchedAssetData = await getRealEstateAssetById(supabase, assetId, userId);
      const propertyData = await getRealEstatePropertyDetailData(fetchedAssetData);
      setAssetData(fetchedAssetData);
      setData(propertyData);
    } catch (err) {
      console.error('[PropertyDetailPage] Error fetching property:', err);
      setError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && user?.id && propertyId && hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
      fetchData(user.id, propertyId);
    } else if (authStatus === 'unauthenticated') {
      setLoading(false);
      setError('Please log in to view property details');
    }
  }, [authStatus, user?.id, propertyId, fetchData, hasCapability]);

  if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
    return (
      <LockedFeaturePage
        title="Real Estate"
        feature="REAL_ESTATE"
      />
    );
  }

  // Format currency helper
  const formatValue = (value: number | null): string => {
    if (value === null) return '—';
    return formatCurrency(value);
  };

  // Format percentage helper
  const formatPercent = (value: number | null): string => {
    if (value === null) return '—';
    return `${value.toFixed(2)}%`;
  };

  // Format date helper
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };
  
  const formatPropertyType = (propertyType: RealEstatePropertyDetailData['propertyType']): string => {
    if (!propertyType) return '—';
    return `${propertyType.charAt(0).toUpperCase()}${propertyType.slice(1)}`;
  };

  const formatPropertyStatus = (
    propertyStatus: RealEstatePropertyDetailData['propertyStatus']
  ): string => {
    if (propertyStatus === 'under_construction') return 'Under Construction';
    if (propertyStatus === 'ready') return 'Ready';
    return '—';
  };

  // Format tenure helper
  const formatTenure = (months: number | null): string => {
    if (months === null) return '—';
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0 && remainingMonths > 0) {
      return `${years} years ${remainingMonths} months`;
    } else if (years > 0) {
      return `${years} years`;
    } else {
      return `${remainingMonths} months`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader 
          showBackButton={true}
          backHref="/portfolio/real-estate"
          backLabel="Back to Real Estate"
          showDownload={false}
        />
        <div className="flex items-center justify-center min-h-screen pt-24">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader 
          showBackButton={true}
          backHref="/portfolio/real-estate"
          backLabel="Back to Real Estate"
          showDownload={false}
        />
        <div className="flex items-center justify-center min-h-screen pt-24">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Error</p>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{error || 'Property not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader 
        showBackButton={true}
        backHref="/portfolio/real-estate"
        backLabel="Back to Real Estate"
        showDownload={false}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* ==================================================================== */}
        {/* PAGE HEADER */}
        {/* ==================================================================== */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                  {data.propertyName}
                </h1>
                <Badge variant="outline" className="shrink-0">
                  {data.ownershipPercentage}% Owned
                </Badge>
              </div>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                {data.city} • {formatPropertyType(data.propertyType)} • {formatPropertyStatus(data.propertyStatus)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                onClick={async () => {
                  if (!data) return;
                  const alerts = getPropertyAlerts(data);
                  try {
                    await exportRealEstateProperty(data, alerts, null, 'csv');
                  } catch (error) {
                    console.error('[PropertyDetailPage] Export error:', error);
                    alert('Failed to export property. Please try again.');
                  }
                }}
                className="gap-2 sm:gap-2"
              >
                <FileIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">Export Property</span>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setShowEditPropertyModal(true)}
              >
                Edit Property
              </Button>
              <Button size="lg" onClick={() => setShowValuationModal(true)}>
                Update Value
              </Button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KPI STRIP */}
        {/* ==================================================================== */}
        <section className="mb-8">
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                <KPIItem
                  label="Current Estimated Value"
                  value={formatValue(data.currentEstimatedValue)}
                  helperText="Your share (ownership-adjusted)"
                />
                <KPIItem
                  label="Unrealized Gain / Loss"
                  value={formatValue(data.unrealizedGain)}
                  helperText="Current value vs purchase price"
                />
                <KPIItem
                  label="XIRR"
                  value={data.xirr !== null ? formatPercent(data.xirr) : '—'}
                  helperText={data.xirr !== null ? "Annualized return (rent + value growth)" : "Add purchase date & rent start date"}
                />
                <KPIItem
                  label="Net Rental Yield"
                  value={data.netRentalYield !== null ? formatPercent(data.netRentalYield) : '—'}
                  helperText={data.netRentalYield !== null ? "After maintenance, tax & expenses" : "Only for rented, ready properties"}
                />
                <KPIItem
                  label="EMI vs Rent"
                  value={data.emiRentGap !== null ? formatValue(data.emiRentGap) : '—'}
                  helperText={data.emiRentGap !== null
                    ? (data.emiRentGap >= 0 ? "Positive — rent covers your EMI" : "Negative — you subsidize the gap")
                    : (data.monthlyEmi ? "No rental income — full EMI as outflow" : "No loan on this property")}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* D3: Under-Construction Completion Prompt */}
        {data.propertyStatus === 'under_construction' && (() => {
          if (!data.purchaseDate) return null;
          const purchaseYear = new Date(data.purchaseDate).getFullYear();
          const currentYear = new Date().getFullYear();
          const yearsHeld = currentYear - purchaseYear;
          if (yearsHeld < 2) return null;
          return (
            <section className="mb-6">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Has possession been received?
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-0.5">
                    This property has been under construction for {yearsHeld}+ years. If you have received possession, update the status to &ldquo;Ready&rdquo; to unlock rental yield and full analytics.
                  </p>
                  <button
                    onClick={() => setShowEditPropertyModal(true)}
                    className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    Update Property Status →
                  </button>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Current Value Explanation Banner */}
        <section className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">About Current Estimated Value</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      Your property's current value is calculated in this priority order:
                    </p>
                    <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-2 list-decimal">
                      <li><strong>Your Manual Override</strong> (if you set one via "Update Value" button) - highest priority</li>
                      <li><strong>System Estimate</strong> (based on market comparables, location, and property characteristics)</li>
                      <li><strong>Purchase Price</strong> (if no estimate available)</li>
                    </ol>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Current value differs from purchase price because market conditions and property valuations change over time. Click "Update Value" to set your own estimate if you believe the system estimate is inaccurate.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ==================================================================== */}
        {/* INSIGHTS & ALERTS */}
        {/* ==================================================================== */}
        <section className="mb-8">
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader>
              <CardTitle className="text-lg">Insights & Alerts</CardTitle>
              <CardDescription>
                Actionable insights based on your property analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                const alerts = getPropertyAlerts(data);
                if (alerts.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        No issues detected for this property
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </section>

        {/* ==================================================================== */}
        {/* SELL VS HOLD SIMULATION */}
        {/* ==================================================================== */}
        <section className="mb-8">
          <SellHoldSimulation propertyData={data} />
        </section>

        {/* ==================================================================== */}
        {/* MAIN CONTENT TABS */}
        {/* ==================================================================== */}
        <section>
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader>
              {/* Tabs Navigation - scrollable with arrow buttons when tabs overflow */}
              <div className="flex items-center gap-1 border-b border-[#E5E7EB] dark:border-[#334155] min-w-0">
                {tabsScroll.hasOverflow && (
                  <button
                    type="button"
                    onClick={() => scrollTabs('left')}
                    aria-label="Scroll tabs left"
                    disabled={!tabsScroll.canScrollLeft}
                    className={`shrink-0 p-2 -mb-px rounded-t transition-colors touch-target ${
                      tabsScroll.canScrollLeft
                        ? 'text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A]/30'
                        : 'text-[#D1D5DB] dark:text-[#475569] cursor-not-allowed'
                    }`}
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                )}
                <div
                  ref={tabsScrollRef}
                  className="scrollbar-hide flex gap-1 overflow-x-auto overflow-y-hidden -mx-1 px-1 pb-px min-w-0"
                >
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                    activeTab === 'performance'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Performance
                </button>
                <button
                  onClick={() => setActiveTab('cashflow')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                    activeTab === 'cashflow'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Cash Flow
                </button>
                <button
                  onClick={() => setActiveTab('loan')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                    activeTab === 'loan'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Loan
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                    activeTab === 'details'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <span className="hidden sm:inline">Property </span>Details
                </button>
                </div>
                {tabsScroll.hasOverflow && (
                  <button
                    type="button"
                    onClick={() => scrollTabs('right')}
                    aria-label="Scroll tabs right"
                    disabled={!tabsScroll.canScrollRight}
                    className={`shrink-0 p-2 -mb-px rounded-t transition-colors touch-target ${
                      tabsScroll.canScrollRight
                        ? 'text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A]/30'
                        : 'text-[#D1D5DB] dark:text-[#475569] cursor-not-allowed'
                    }`}
                  >
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ValueVsPurchaseChart
                      purchaseDate={data.purchaseDate}
                      purchasePrice={data.purchasePrice}
                      currentValue={data.currentEstimatedValue}
                      formatValue={formatValue}
                      formatDate={formatDate}
                    />
                    <LoanOutstandingChart
                      loanAmount={data.loanAmount}
                      outstandingBalance={data.outstandingBalance}
                      purchaseDate={data.purchaseDate}
                      hasLoan={!!data.loanId}
                      formatValue={formatValue}
                      formatDate={formatDate}
                    />
                  </div>
                  <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                    <CardHeader>
                      <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Holding Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Purchase Date
                          </span>
                          <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatDate(data.purchaseDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Holding Period
                          </span>
                          <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {data.holdingPeriodYears !== null
                              ? `${data.holdingPeriodYears.toFixed(2)} years`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Cash Flow Tab */}
              {activeTab === 'cashflow' && (
                <div className="space-y-6">
                  {/* D2: EMI carry banner for non-rented properties with a loan */}
                  {data.monthlyEmi && data.monthlyEmi > 0 && data.rentalStatus !== 'rented' && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Carrying EMI with no rental income
                          </p>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mt-0.5">
                            You are paying an EMI of{' '}
                            <strong>{data.monthlyEmi !== null ? formatCurrency(data.monthlyEmi) : '—'}/month</strong>{' '}
                            with{' '}
                            {data.rentalStatus === 'vacant' ? 'no tenant (vacant)' : 'self-occupancy (no rental income)'}.{' '}
                            Update rental details once you find a tenant.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                        Monthly Cash Flow Breakdown
                      </h3>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        Income and expenses for this property
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRentalModal(true)}
                      className="inline-flex items-center justify-center gap-2 p-2.5 md:px-4 md:py-2 min-w-[44px] min-h-[44px] rounded-lg font-medium text-sm border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
                      title="Update Rent"
                    >
                      <PlusIcon className="w-5 h-5 shrink-0" />
                      <span className="hidden md:inline">Update Rent</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                      <CardHeader>
                        <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Income</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Monthly Rent
                          </span>
                          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatValue(data.monthlyRent)}
                          </span>
                        </div>
                        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              Total Income
                            </span>
                            <span className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                              {formatValue(data.monthlyRent)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                      <CardHeader>
                        <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Expenses</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Monthly EMI
                          </span>
                          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatValue(data.monthlyEmi)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Maintenance
                          </span>
                          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatValue(data.maintenanceMonthly)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Property Tax (monthly)
                          </span>
                          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatValue(data.propertyTaxMonthly)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            Other Expenses
                          </span>
                          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatValue(data.otherExpensesMonthly)}
                          </span>
                        </div>
                        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              Total Expenses
                            </span>
                            <span className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                              {formatValue(data.monthlyExpenses)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                    <CardHeader>
                      <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Net Monthly Cash Flow</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                          Income - Expenses
                        </span>
                        <span className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatValue(data.netMonthlyCashFlow)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Loan Tab */}
              {activeTab === 'loan' && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                        Loan Details
                      </h3>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        Mortgage and loan information
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLoanDetailsModal(true)}
                      className="inline-flex items-center justify-center gap-2 p-2.5 md:px-4 md:py-2 min-w-[44px] min-h-[44px] bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg font-medium text-sm hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                      title={data.loanId ? 'Update Loan Details' : 'Add Loan'}
                    >
                      <PlusIcon className="w-5 h-5 shrink-0" />
                      <span className="hidden md:inline">
                        {data.loanId ? 'Update Loan Details' : 'Add Loan'}
                      </span>
                    </button>
                  </div>
                  <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                    <CardContent className="pt-6">
                      <div className="space-y-0">
                        <InfoRow label="Lender Name" value={data.lenderName} />
                        <InfoRow label="Loan Amount" value={formatValue(data.loanAmount)} />
                        <InfoRow
                          label="Interest Rate"
                          value={data.interestRate !== null ? `${data.interestRate}%` : null}
                        />
                        <InfoRow label="EMI" value={formatValue(data.emi)} />
                        <InfoRow
                          label="Outstanding Balance"
                          value={formatValue(data.outstandingBalance)}
                        />
                        <InfoRow label="Tenure" value={formatTenure(data.tenureMonths)} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Property Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Property Information"
                    description="Core property details and purchase information"
                  />
                  
                  <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                    <CardHeader>
                      <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Purchase Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-0">
                        <InfoRow label="Purchase Date" value={formatDate(data.purchaseDate)} />
                        <InfoRow label="Purchase Price" value={formatValue(data.purchasePrice)} />
                        <InfoRow
                          label="Registration Value"
                          value={formatValue(data.registrationValue)}
                        />
                        <InfoRow
                          label="Property Status"
                          value={data.propertyStatus === 'under_construction' ? 'Under Construction' : 'Ready to Occupy'}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                    <CardHeader>
                      <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Area Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-0">
                        <InfoRow
                          label="Carpet Area"
                          value={
                            data.carpetAreaSqft !== null
                              ? `${data.carpetAreaSqft} sq ft`
                              : null
                          }
                        />
                        <InfoRow
                          label="Built-up Area"
                          value={
                            data.builtupAreaSqft !== null
                              ? `${data.builtupAreaSqft} sq ft`
                              : null
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
                    <CardHeader>
                      <CardTitle className="text-base text-[#0F172A] dark:text-[#F8FAFC]">Legal & Builder Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-0">
                        <InfoRow label="RERA Number" value={data.reraNumber} />
                        <InfoRow label="Builder Name" value={data.builderName} />
                        <InfoRow label="Project Name" value={data.projectName} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Location</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-0">
                        <InfoRow label="Address" value={data.address} />
                        <InfoRow label="City" value={data.city} />
                        <InfoRow label="State" value={data.state} />
                        <InfoRow label="Pincode" value={data.pincode} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Modals */}
        {data && (
          <>
            <EditPropertyModal
              isOpen={showEditPropertyModal}
              onClose={() => setShowEditPropertyModal(false)}
              propertyId={propertyId}
              currentData={{
                propertyNickname: data.propertyName,
                propertyType: data.propertyType,
                propertyStatus: data.propertyStatus,
                purchasePrice: data.purchasePrice,
                purchaseDate: data.purchaseDate,
                registrationValue: data.registrationValue,
                ownershipPercentage: data.ownershipPercentage,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                address: data.address,
                projectName: data.projectName,
                builderName: data.builderName,
                reraNumber: data.reraNumber,
                carpetAreaSqft: data.carpetAreaSqft,
                builtupAreaSqft: data.builtupAreaSqft,
                coOwnerName: data.coOwnerName,
                coOwnerRelationship: data.coOwnerRelationship,
              }}
              onSuccess={() => {
                if (user?.id) {
                  fetchData(user.id, propertyId);
                }
              }}
            />

            <UpdateRentalModal
            isOpen={showRentalModal}
            onClose={() => setShowRentalModal(false)}
            cashflowId={data.cashflowId}
            propertyId={propertyId}
            currentData={{
              monthlyRent: data.monthlyRent,
              maintenanceMonthly: data.maintenanceMonthly,
              propertyTaxAnnual: data.propertyTaxAnnual,
              otherExpensesMonthly: data.otherExpensesMonthly,
              escalationPercent: data.escalationPercent,
              rentalStatus: data.rentalStatus,
              rentStartDate: data.rentStartDate,
            }}
            onSuccess={() => {
              if (user?.id) {
                fetchData(user.id, propertyId);
              }
            }}
          />

          <AddOrUpdateLoanModal
            isOpen={showLoanDetailsModal}
            onClose={() => setShowLoanDetailsModal(false)}
            propertyId={propertyId}
            hasExistingLoan={!!data.loanId}
            currentData={{
              lenderName: data.lenderName,
              loanAmount: data.loanAmount,
              interestRate: data.interestRate,
              emi: data.emi,
              tenureMonths: data.tenureMonths,
              outstandingBalance: data.outstandingBalance,
            }}
            onSuccess={() => {
              if (user?.id) {
                fetchData(user.id, propertyId);
              }
            }}
          />

          <UpdateValuationModal
            isOpen={showValuationModal}
            onClose={() => setShowValuationModal(false)}
            propertyId={propertyId}
            currentValue={
              assetData?.asset.user_override_value
                ? assetData.asset.user_override_value
                : null
            }
            estimatedMin={assetData?.asset.system_estimated_min ?? null}
            estimatedMax={assetData?.asset.system_estimated_max ?? null}
            onSuccess={() => {
              if (user?.id) {
                fetchData(user.id, propertyId);
              }
            }}
          />
        </>
      )}
      </main>
    </div>
  );
}
