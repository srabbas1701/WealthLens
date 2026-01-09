/**
 * NPS Holdings Page
 * 
 * Comprehensive NPS (National Pension System) portfolio tracking.
 * Supports Tier I (retirement, locked) and Tier II (voluntary, withdrawable).
 * Tracks 4 asset classes (E, C, G, A) across multiple fund managers.
 * Auto-updates NAVs daily for accurate portfolio valuation.
 * 
 * DESIGN PRINCIPLES:
 * - Expert-level detail capture (PRAN, tiers, asset classes, fund managers)
 * - Clean, expandable UI for tier-wise scheme viewing
 * - Daily NAV updates with historical tracking
 * - Full CRUD operations for NPS accounts
 * - Dark mode compatible
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { useToast } from '@/components/Toast';
import { 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  RefreshIcon,
  InfoIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
} from '@/components/icons';
import NPSAddModal from '@/components/NPSAddModal';

// ============================================================================
// TYPES
// ============================================================================

interface NPSScheme {
  assetClass: 'E' | 'C' | 'G' | 'A';
  fundManager: string;
  allocationPercentage: number;
  investedAmount: number;
  currentUnits: number;
  currentNAV: number;
  currentValue: number;
  navDate: string;
  returns: number;
  returnsPercentage: number;
}

interface NPSTier {
  tierId: 'tier1' | 'tier2';
  tierName: string;
  allocationStrategy: 'auto' | 'active';
  autoChoiceType?: 'aggressive' | 'moderate' | 'conservative';
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnsPercentage: number;
  schemes: NPSScheme[];
  lastContribution?: string;
}

interface NPSHolding {
  id: string;
  pranNumber: string;
  subscriberName?: string;
  dateOfOpening?: string;
  tier1: NPSTier;
  tier2?: NPSTier | null;
  totalInvested: number;
  totalCurrentValue: number;
  totalReturns: number;
  overallReturnsPercentage: number;
  navUpdatedDate: string;
}

// Fund managers
const FUND_MANAGERS = [
  { id: 'HDFC', name: 'HDFC Pension' },
  { id: 'ICICI', name: 'ICICI Prudential' },
  { id: 'SBI', name: 'SBI Pension' },
  { id: 'UTI', name: 'UTI Retirement' },
  { id: 'LIC', name: 'LIC Pension' },
  { id: 'KOTAK', name: 'Kotak Mahindra' },
  { id: 'BIRLA', name: 'Aditya Birla' },
  { id: 'MAX', name: 'Max Life' },
];

const ASSET_CLASSES = [
  { id: 'E' as const, name: 'Equity', fullName: 'Equity (Stocks)', color: '#DC2626', riskLevel: 'High' },
  { id: 'C' as const, name: 'Corporate Bonds', fullName: 'Corporate Bonds', color: '#F59E0B', riskLevel: 'Medium' },
  { id: 'G' as const, name: 'Government Securities', fullName: 'Government Securities (G-Sec)', color: '#16A34A', riskLevel: 'Low' },
  { id: 'A' as const, name: 'Alternative Funds', fullName: 'Alternative Investment Funds', color: '#2563EB', riskLevel: 'Medium-High' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NPSHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  const { showToast } = useToast();

  const [holdings, setHoldings] = useState<NPSHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTier, setExpandedTier] = useState<{ [key: string]: 'tier1' | 'tier2' | null }>({});
  const [navUpdateLoading, setNavUpdateLoading] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<NPSHolding | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auth check
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  // Fetch NPS holdings
  useEffect(() => {
    if (user?.id) {
      fetchNPSHoldings();
    }
  }, [user]);

  const fetchNPSHoldings = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/nps/holdings?user_id=${user.id}`);
      const result = await response.json();
      
      if (result.success) {
        setHoldings(result.data || []);
      } else {
        showToast({
          type: 'error',
          title: 'Failed to Load NPS Holdings',
          message: result.error || 'Unable to fetch your NPS data.',
          duration: 7000,
        });
      }
    } catch (error) {
      console.error('Error fetching NPS holdings:', error);
      showToast({
        type: 'error',
        title: 'Error Occurred',
        message: 'Failed to load NPS holdings. Please refresh the page.',
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNAVs = async () => {
    setNavUpdateLoading(true);
    showToast({
      type: 'info',
      title: 'Updating NAVs',
      message: 'Fetching latest NAV data for all NPS schemes...',
      duration: 0,
    });

    try {
      const response = await fetch('/api/nps/update-navs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchNPSHoldings();
        showToast({
          type: 'success',
          title: 'NAVs Updated',
          message: `Updated ${result.updatedCount || 0} scheme NAVs successfully.`,
          duration: 5000,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Partial Update',
          message: result.error || 'Some NAVs could not be updated.',
          duration: 7000,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update NAVs. Please try again later.',
        duration: 7000,
      });
    } finally {
      setNavUpdateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/nps/holdings?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirmId(null);
        await fetchNPSHoldings();
        showToast({
          type: 'success',
          title: 'NPS Holding Deleted',
          message: 'The NPS account has been removed from your portfolio.',
          duration: 5000,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Deletion Failed',
          message: result.error || 'Unable to delete NPS holding.',
          duration: 7000,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error Occurred',
        message: 'Failed to delete NPS holding.',
        duration: 7000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleTierExpansion = (holdingId: string, tier: 'tier1' | 'tier2') => {
    setExpandedTier(prev => ({
      ...prev,
      [holdingId]: prev[holdingId] === tier ? null : tier,
    }));
  };

  // Calculate totals
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.totalCurrentValue, 0);
  const totalReturns = totalCurrentValue - totalInvested;
  const totalReturnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Aggregate asset allocation
  const aggregateAllocation = holdings.reduce((acc, holding) => {
    const addSchemes = (tier: NPSTier | null | undefined) => {
      if (!tier) return;
      tier.schemes.forEach(scheme => {
        const existing = acc.find(a => a.assetClass === scheme.assetClass);
        if (existing) {
          existing.value += scheme.currentValue;
        } else {
          acc.push({
            assetClass: scheme.assetClass,
            value: scheme.currentValue,
          });
        }
      });
    };
    addSchemes(holding.tier1);
    addSchemes(holding.tier2);
    return acc;
  }, [] as { assetClass: string; value: number }[]);

  const allocationPercentages = aggregateAllocation.map(a => ({
    ...a,
    percentage: totalCurrentValue > 0 ? (a.value / totalCurrentValue) * 100 : 0,
  }));

  // Loading state
  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
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
      />

      <div className="max-w-7xl mx-auto px-6 py-8 pt-24">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              NPS Holdings
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              {holdings.length} account{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalCurrentValue)}
              {totalReturns !== 0 && (
                <span className={`ml-2 font-medium ${totalReturns >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                  {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)} ({totalReturnsPercentage >= 0 ? '+' : ''}{totalReturnsPercentage.toFixed(2)}%)
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpdateNAVs}
              disabled={navUpdateLoading || holdings.length === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                navUpdateLoading || holdings.length === 0
                  ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed dark:bg-[#334155] dark:text-[#64748B]'
                  : 'bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]'
              }`}
            >
              <RefreshIcon className={`w-4 h-4 ${navUpdateLoading ? 'animate-spin' : ''}`} />
              Update NAVs
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg font-medium text-sm hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add NPS Account
            </button>
          </div>
        </div>

        {/* Overall Asset Allocation */}
        {holdings.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Overall Asset Allocation
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {ASSET_CLASSES.map(assetClass => {
                const allocation = allocationPercentages.find(a => a.assetClass === assetClass.id);
                const percentage = allocation?.percentage || 0;
                const value = allocation?.value || 0;

                return (
                  <div key={assetClass.id} className="p-4 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: assetClass.color }}
                      />
                      <span className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase">
                        {assetClass.id}
                      </span>
                    </div>
                    <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mb-1">{assetClass.name}</p>
                    <p className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                      {formatCurrency(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NPS Holdings List */}
        {holdings.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-12 text-center">
            <InfoIcon className="w-12 h-12 text-[#6B7280] dark:text-[#94A3B8] mx-auto mb-4" />
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">No NPS holdings found</p>
            <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mb-4">
              Add your NPS account details to track performance and allocation
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg font-medium text-sm hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Your First NPS Account
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {holdings.map(holding => (
              <div 
                key={holding.id}
                className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden"
              >
                {/* Holding Header */}
                <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {holding.subscriberName || 'NPS Account'}
                      </h3>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                        PRAN: {holding.pranNumber}
                        {holding.dateOfOpening && ` • Opened: ${new Date(holding.dateOfOpening).toLocaleDateString('en-IN')}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Current Value</p>
                        <p className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.totalCurrentValue)}
                        </p>
                        <p className={`text-sm font-medium ${holding.totalReturns >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                          {holding.totalReturns >= 0 ? '+' : ''}{formatCurrency(holding.totalReturns)} ({holding.overallReturnsPercentage >= 0 ? '+' : ''}{holding.overallReturnsPercentage.toFixed(2)}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!holding.tier2 && (
                          <button
                            onClick={() => {
                              setEditingHolding(holding);
                              setIsEditModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-[#2563EB] dark:text-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg hover:bg-[#DBEAFE] dark:hover:bg-[#1E3A8A] transition-colors"
                            title="Add Tier II to this account"
                          >
                            + Add Tier II
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingHolding(holding);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
                          title="Edit NPS Account"
                        >
                          <EditIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(holding.id)}
                          className="p-2 rounded-lg hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D] transition-colors"
                          title="Delete NPS Account"
                        >
                          <TrashIcon className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tier I Details */}
                <div className="border-b border-[#E5E7EB] dark:border-[#334155]">
                  <button
                    onClick={() => toggleTierExpansion(holding.id, 'tier1')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#1E40AF] dark:text-[#93C5FD] rounded-lg text-sm font-semibold">
                        Tier I
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {holding.tier1.allocationStrategy === 'auto' ? 'Auto Choice' : 'Active Choice'}
                          {holding.tier1.autoChoiceType && ` (${holding.tier1.autoChoiceType})`}
                        </p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                          {holding.tier1.schemes.length} scheme{holding.tier1.schemes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatCurrency(holding.tier1.currentValue)}
                        </p>
                        <p className={`text-sm font-medium ${holding.tier1.returns >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                          {holding.tier1.returns >= 0 ? '+' : ''}{formatCurrency(holding.tier1.returns)} ({holding.tier1.returnsPercentage >= 0 ? '+' : ''}{holding.tier1.returnsPercentage.toFixed(2)}%)
                        </p>
                      </div>
                      {expandedTier[holding.id] === 'tier1' ? (
                        <ChevronUpIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                      )}
                    </div>
                  </button>

                  {/* Tier I Schemes Table */}
                  {expandedTier[holding.id] === 'tier1' && (
                    <div className="px-6 py-4 bg-[#F9FAFB] dark:bg-[#334155]">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b border-[#E5E7EB] dark:border-[#334155]">
                            <tr>
                              <th className="text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Asset Class
                              </th>
                              <th className="text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Fund Manager
                              </th>
                              <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Allocation
                              </th>
                              <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Invested
                              </th>
                              <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Current NAV
                              </th>
                              <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Units
                              </th>
                              <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Current Value
                              </th>
                              <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                Returns
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                            {holding.tier1.schemes.map((scheme, idx) => {
                              const assetClassInfo = ASSET_CLASSES.find(a => a.id === scheme.assetClass);
                              const schemeName = `${scheme.fundManager} Pension Fund Scheme ${scheme.assetClass}-Tier I`;
                              return (
                                <tr key={idx} className="text-sm">
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2.5 h-2.5 rounded-full" 
                                        style={{ backgroundColor: assetClassInfo?.color }}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                          {scheme.assetClass}
                                        </span>
                                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                                          {schemeName}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 text-[#475569] dark:text-[#CBD5E1]">
                                    {scheme.fundManager}
                                  </td>
                                  <td className="py-3 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                                    {scheme.allocationPercentage.toFixed(1)}%
                                  </td>
                                  <td className="py-3 text-right text-[#475569] dark:text-[#CBD5E1]">
                                    {formatCurrency(scheme.investedAmount)}
                                  </td>
                                  <td className="py-3 text-right text-[#475569] dark:text-[#CBD5E1]">
                                    ₹{scheme.currentNAV.toFixed(4)}
                                  </td>
                                  <td className="py-3 text-right text-[#475569] dark:text-[#CBD5E1]">
                                    {scheme.currentUnits.toFixed(4)}
                                  </td>
                                  <td className="py-3 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                                    {formatCurrency(scheme.currentValue)}
                                  </td>
                                  <td className={`py-3 text-right font-medium ${scheme.returns >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                                    {scheme.returns >= 0 ? '+' : ''}{formatCurrency(scheme.returns)}
                                    <span className="text-xs ml-1">({scheme.returnsPercentage >= 0 ? '+' : ''}{scheme.returnsPercentage.toFixed(2)}%)</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-3">
                        NAV as of {new Date(holding.navUpdatedDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tier II Details (if exists) */}
                {holding.tier2 && (
                  <div>
                    <button
                      onClick={() => toggleTierExpansion(holding.id, 'tier2')}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-[#F0FDF4] dark:bg-[#14532D] text-[#166534] dark:text-[#86EFAC] rounded-lg text-sm font-semibold">
                          Tier II
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {holding.tier2.allocationStrategy === 'auto' ? 'Auto Choice' : 'Active Choice'}
                            {holding.tier2.autoChoiceType && ` (${holding.tier2.autoChoiceType})`}
                          </p>
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                            {holding.tier2.schemes.length} scheme{holding.tier2.schemes.length !== 1 ? 's' : ''} • Withdrawable
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatCurrency(holding.tier2.currentValue)}
                          </p>
                          <p className={`text-sm font-medium ${holding.tier2.returns >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                            {holding.tier2.returns >= 0 ? '+' : ''}{formatCurrency(holding.tier2.returns)} ({holding.tier2.returnsPercentage >= 0 ? '+' : ''}{holding.tier2.returnsPercentage.toFixed(2)}%)
                          </p>
                        </div>
                        {expandedTier[holding.id] === 'tier2' ? (
                          <ChevronUpIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                        )}
                      </div>
                    </button>

                    {/* Tier II Schemes Table */}
                    {expandedTier[holding.id] === 'tier2' && (
                      <div className="px-6 py-4 bg-[#F9FAFB] dark:bg-[#334155]">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="border-b border-[#E5E7EB] dark:border-[#334155]">
                              <tr>
                                <th className="text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Asset Class
                                </th>
                                <th className="text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Fund Manager
                                </th>
                                <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Allocation
                                </th>
                                <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Invested
                                </th>
                                <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Current NAV
                                </th>
                                <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Units
                                </th>
                                <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Current Value
                                </th>
                                <th className="text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider pb-2">
                                  Returns
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                            {holding.tier2.schemes.map((scheme, idx) => {
                              const assetClassInfo = ASSET_CLASSES.find(a => a.id === scheme.assetClass);
                              const schemeName = `${scheme.fundManager} Pension Fund Scheme ${scheme.assetClass}-Tier II`;
                              return (
                                <tr key={idx} className="text-sm">
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2.5 h-2.5 rounded-full" 
                                        style={{ backgroundColor: assetClassInfo?.color }}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                          {scheme.assetClass}
                                        </span>
                                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                                          {schemeName}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                    <td className="py-3 text-[#475569] dark:text-[#CBD5E1]">
                                      {scheme.fundManager}
                                    </td>
                                    <td className="py-3 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                                      {scheme.allocationPercentage.toFixed(1)}%
                                    </td>
                                    <td className="py-3 text-right text-[#475569] dark:text-[#CBD5E1]">
                                      {formatCurrency(scheme.investedAmount)}
                                    </td>
                                    <td className="py-3 text-right text-[#475569] dark:text-[#CBD5E1]">
                                      ₹{scheme.currentNAV.toFixed(4)}
                                    </td>
                                    <td className="py-3 text-right text-[#475569] dark:text-[#CBD5E1]">
                                      {scheme.currentUnits.toFixed(4)}
                                    </td>
                                    <td className="py-3 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                                      {formatCurrency(scheme.currentValue)}
                                    </td>
                                    <td className={`py-3 text-right font-medium ${scheme.returns >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                                      {scheme.returns >= 0 ? '+' : ''}{formatCurrency(scheme.returns)}
                                      <span className="text-xs ml-1">({scheme.returnsPercentage >= 0 ? '+' : ''}{scheme.returnsPercentage.toFixed(2)}%)</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-3">
                          NAV as of {new Date(holding.navUpdatedDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* NPS Info Banner */}
        <div className="mt-6 bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg border border-[#2563EB]/20 dark:border-[#3B82F6]/20 p-4">
          <div className="flex gap-3">
            <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-[#1E40AF] dark:text-[#93C5FD] font-medium mb-1">
                About NPS
              </p>
              <p className="text-[#1E40AF] dark:text-[#93C5FD] text-xs leading-relaxed">
                <strong>Tier I</strong> is mandatory, locked until retirement (age 60). You can invest in 4 asset classes (E, C, G, A) across 8 fund managers.
                <strong className="ml-2">Tier II</strong> is voluntary, withdrawable anytime, with higher equity allocation allowed. NAVs are updated daily.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Note */}
        <div className="mt-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4">
          <div className="flex gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Data Verified</p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                All values are calculated from your holdings and latest NAVs. Manual updates ensure accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteConfirmId(null)}
          />
          <div className="relative bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Delete NPS Account?
            </h3>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-6">
              This will permanently remove this NPS account and all its tier data from your portfolio. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="px-4 py-2 bg-[#DC2626] dark:bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#B91C1C] dark:hover:bg-[#DC2626] transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add NPS Modal */}
      <NPSAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHolding(null); // Clear editing state when modal closes
        }}
        userId={user?.id || ''}
        onSuccess={fetchNPSHoldings}
        existingHolding={editingHolding ? {
          pranNumber: editingHolding.pranNumber,
          subscriberName: editingHolding.subscriberName || '',
          dateOfOpening: editingHolding.dateOfOpening || '',
          tier1: {
            allocationStrategy: editingHolding.tier1.allocationStrategy,
            autoChoiceType: editingHolding.tier1.autoChoiceType,
            schemes: editingHolding.tier1.schemes,
          },
        } : null}
      />

      {/* Edit Modal Placeholder - For adding Tier II */}
      {isEditModalOpen && editingHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingHolding(null);
            }}
          />
          <div className="relative bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              {editingHolding.tier2 ? 'Edit NPS Account' : 'Add Tier II'}
            </h3>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">
              {editingHolding.tier2 
                ? 'Edit modal coming soon. For now, please delete and re-add the account to make changes.'
                : `To add Tier II to PRAN ${editingHolding.pranNumber}, click "Add NPS Account" below, enter the same PRAN number, and check "Add Tier II". The system will update this account instead of creating a duplicate.`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingHolding(null);
                }}
                className="flex-1 px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
              >
                Cancel
              </button>
              {!editingHolding.tier2 && (
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    // Don't clear editingHolding - we need it for the add modal
                    setIsAddModalOpen(true);
                  }}
                  className="flex-1 px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                >
                  Add Tier II
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
