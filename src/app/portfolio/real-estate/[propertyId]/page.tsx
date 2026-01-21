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
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { getRealEstateAssetById, type OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
import { getRealEstatePropertyDetailData } from '@/analytics/realEstatePropertyDetail.mapper';
import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';
import { getPropertyAlerts } from '@/analytics/realEstatePropertyAlerts.engine';
import type { RealEstatePropertyAlert } from '@/types/realEstatePropertyAlerts.types';
import UpdateRentalModal from '@/components/real-estate/UpdateRentalModal';
import UpdateLoanOutstandingModal from '@/components/real-estate/UpdateLoanOutstandingModal';
import UpdateValuationModal from '@/components/real-estate/UpdateValuationModal';
import EditPropertyModal from '@/components/real-estate/EditPropertyModal';
import SellHoldSimulation from '@/components/real-estate/SellHoldSimulation';
import { exportRealEstateProperty } from '@/exports/realEstate.export';
import { FileIcon } from '@/components/icons';

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
 * Chart Placeholder Component
 * Empty container for future chart implementation
 */
function ChartPlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="h-full bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
      <CardHeader>
        <CardTitle className="text-lg text-[#0F172A] dark:text-[#F8FAFC]">{title}</CardTitle>
        {description && (
          <CardDescription className="text-[#6B7280] dark:text-[#94A3B8]">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-[300px] bg-[#F6F8FB] dark:bg-[#0F172A] rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#334155]">
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Chart placeholder</p>
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
  const propertyId = params.propertyId as string;
  const fetchingRef = useRef(false);

  const [activeTab, setActiveTab] = useState<TabValue>('performance');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RealEstatePropertyDetailData | null>(null);
  const [assetData, setAssetData] = useState<OwnershipAdjustedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);

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
    if (authStatus === 'authenticated' && user?.id && propertyId) {
      fetchData(user.id, propertyId);
    } else if (authStatus === 'unauthenticated') {
      setLoading(false);
      setError('Please log in to view property details');
    }
  }, [authStatus, user?.id, propertyId, fetchData]);

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
                {data.city} • {data.propertyType.charAt(0).toUpperCase() + data.propertyType.slice(1)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
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
                className="gap-2"
              >
                <FileIcon className="w-4 h-4" />
                Export Property
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
                  helperText="Ownership adjusted"
                />
                <KPIItem
                  label="Unrealized Gain / Loss"
                  value={formatValue(data.unrealizedGain)}
                  helperText="vs purchase price"
                />
                <KPIItem
                  label="XIRR"
                  value={formatPercent(data.xirr)}
                  helperText="Loan-adjusted return"
                />
                <KPIItem
                  label="Net Rental Yield"
                  value={formatPercent(data.netRentalYield)}
                  helperText="After expenses"
                />
                <KPIItem
                  label="EMI vs Rent"
                  value={formatValue(data.emiRentGap)}
                  helperText="Cash flow indicator"
                />
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
              {/* Tabs Navigation */}
              <div className="flex gap-1 border-b border-[#E5E7EB] dark:border-[#334155] overflow-x-auto">
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === 'performance'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Performance
                </button>
                <button
                  onClick={() => setActiveTab('cashflow')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === 'cashflow'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Cash Flow
                </button>
                <button
                  onClick={() => setActiveTab('loan')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === 'loan'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Loan
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === 'details'
                      ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Property Details
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartPlaceholder
                      title="Value vs Purchase Price"
                      description="Property value trend over time"
                    />
                    <ChartPlaceholder
                      title="Loan Outstanding Trend"
                      description="Remaining loan balance over time"
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
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                        Monthly Cash Flow Breakdown
                      </h3>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        Income and expenses for this property
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRentalModal(true)}
                    >
                      Update Rent
                    </Button>
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
                    {data.loanId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLoanModal(true)}
                      >
                        Update Outstanding
                      </Button>
                    )}
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
                ownershipPercentage: data.ownershipPercentage,
                address: data.address,
                carpetAreaSqft: data.carpetAreaSqft,
                builtupAreaSqft: data.builtupAreaSqft,
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
              propertyTaxMonthly: data.propertyTaxMonthly,
              otherExpensesMonthly: data.otherExpensesMonthly,
              escalationPercent: data.escalationPercent,
            }}
            onSuccess={() => {
              if (user?.id) {
                fetchData(user.id, propertyId);
              }
            }}
          />

          <UpdateLoanOutstandingModal
            isOpen={showLoanModal}
            onClose={() => setShowLoanModal(false)}
            loanId={data.loanId}
            currentOutstanding={data.outstandingBalance}
            loanAmount={data.loanAmount}
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
