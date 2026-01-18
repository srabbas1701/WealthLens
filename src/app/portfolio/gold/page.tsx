/**
 * Gold Holdings Page
 * 
 * Displays all gold holdings grouped by type:
 * - SGB (Sovereign Gold Bonds)
 * - Physical Gold (Jewellery, Coins, Bars)
 * - Gold ETF
 * - Digital Gold
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { getAssetTotals } from '@/lib/portfolio-aggregation';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';
import GoldAddModal from '@/components/GoldAddModal';

interface GoldHolding {
  id: string;
  asset_id: string;
  goldType: 'sgb' | 'physical' | 'etf' | 'digital';
  name: string;
  investedValue: number;
  currentValue: number;
  quantity: number;
  unitType: 'gram' | 'unit';
  purchaseDate: string;
  gainLoss: number;
  gainLossPct: number;
  allocationPct: number;
  // SGB fields
  seriesName?: string;
  issueDate?: string;
  maturityDate?: string;
  interestRate?: number;
  // Physical Gold fields
  form?: 'jewellery' | 'coin' | 'bar';
  purity?: string;
  grossWeight?: number;
  netWeight?: number;
  makingCharges?: number;
  // Gold ETF fields
  etfName?: string;
  isin?: string;
  exchange?: string;
  // Digital Gold fields
  platform?: string;
  provider?: string;
  vaulted?: boolean;
}

type GoldTypeGroup = 'sgb' | 'physical' | 'etf' | 'digital';

const GOLD_TYPE_LABELS: Record<GoldTypeGroup, string> = {
  sgb: 'SGB (Sovereign Gold Bonds)',
  physical: 'Physical Gold',
  etf: 'Gold ETF',
  digital: 'Digital Gold',
};

export default function GoldHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<GoldHolding[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalCurrentValue, setTotalCurrentValue] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<GoldHolding | null>(null);
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          
          // Filter gold holdings
          const goldHoldings: GoldHolding[] = portfolioData.holdings
            .filter((h: any) => {
              const assetType = (h.assetType || '').toLowerCase();
              return assetType === 'gold' || h.asset?.asset_type === 'gold';
            })
            .map((h: any) => {
              const notes = h.notes ? JSON.parse(h.notes) : {};
              // Use camelCase field names from portfolio data API
              const investedValue = h.investedValue || h.invested_value || 0;
              const currentValue = h.currentValue || h.current_value || 0;
              const gainLoss = currentValue - investedValue;
              const gainLossPct = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
              const portfolioValue = portfolioData.metrics?.netWorth || portfolioData.metrics?.totalValue || 0;
              const allocationPct = portfolioValue > 0 ? (currentValue / portfolioValue) * 100 : 0;

              return {
                id: h.id,
                asset_id: h.asset_id,
                goldType: notes.gold_type || 'gold',
                name: h.name || h.asset?.name || 'Gold Holding',
                investedValue,
                currentValue,
                quantity: h.quantity || 0,
                // For ETFs, always use 'unit', not 'gram'
                unitType: notes.gold_type === 'etf' ? 'unit' : (notes.unit_type || 'gram'),
                purchaseDate: notes.purchase_date || h.created_at,
                gainLoss,
                gainLossPct,
                allocationPct,
                // SGB fields
                seriesName: notes.series_name,
                issueDate: notes.issue_date,
                maturityDate: notes.maturity_date,
                interestRate: notes.interest_rate,
                // Physical Gold fields
                form: notes.form,
                purity: notes.purity,
                grossWeight: notes.gross_weight,
                netWeight: notes.net_weight,
                makingCharges: notes.making_charges,
                // Gold ETF fields
                etfName: notes.etf_name,
                isin: notes.isin,
                exchange: notes.exchange,
                // Digital Gold fields
                platform: notes.platform,
                provider: notes.provider,
                vaulted: notes.vaulted,
              };
            });

          // Calculate totals
          const investedTotal = goldHoldings.reduce((sum, h) => sum + h.investedValue, 0);
          const currentTotal = goldHoldings.reduce((sum, h) => sum + h.currentValue, 0);
          const portfolioValue = portfolioData.metrics?.netWorth || portfolioData.metrics?.totalValue || 0;
          const portfolioPct = portfolioValue > 0 ? (currentTotal / portfolioValue) * 100 : 0;

          setHoldings(goldHoldings);
          setTotalInvested(investedTotal);
          setTotalCurrentValue(currentTotal);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch gold holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/gold');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setEditingHolding(null);
    if (user?.id) {
      fetchData(user.id);
    }
  };

  const handleEdit = (holding: GoldHolding) => {
    setEditingHolding(holding);
    setShowAddModal(true);
  };

  const handleDelete = async (holdingId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Are you sure you want to delete this gold holding? This action cannot be undone.')) {
      return;
    }

    setDeletingHoldingId(holdingId);
    try {
      const params = new URLSearchParams({
        user_id: user.id,
        holding_id: holdingId,
      });

      const response = await fetch(`/api/gold/holdings?${params}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchData(user.id);
      } else {
        alert(`Failed to delete gold holding: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete gold holding. Please try again.');
    } finally {
      setDeletingHoldingId(null);
    }
  };

  // Group holdings by type
  const groupedHoldings = useMemo(() => {
    const groups: Record<GoldTypeGroup, GoldHolding[]> = {
      sgb: [],
      physical: [],
      etf: [],
      digital: [],
    };

    holdings.forEach(holding => {
      const type = holding.goldType as GoldTypeGroup;
      if (groups[type]) {
        groups[type].push(holding);
      }
    });

    return Object.entries(groups)
      .filter(([_, holdings]) => holdings.length > 0)
      .map(([type, holdings]) => ({
        type: type as GoldTypeGroup,
        label: GOLD_TYPE_LABELS[type as GoldTypeGroup],
        holdings,
        totalInvested: holdings.reduce((sum, h) => sum + h.investedValue, 0),
        totalCurrentValue: holdings.reduce((sum, h) => sum + h.currentValue, 0),
      }));
  }, [holdings]);

  // Total gain/loss
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = holdings.length > 0;

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[1200px] mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Gold Holdings</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Track all your gold investments in one place</p>
          </div>
          <button
            onClick={() => {
              setEditingHolding(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Add Gold Holding
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Total Invested</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(totalInvested)}
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Current Value</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(totalCurrentValue)}
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Gain/Loss</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            ) : (
              <div>
                <p className={`text-2xl font-semibold number-emphasis ${
                  totalGainLoss >= 0 
                    ? 'text-[#16A34A] dark:text-[#22C55E]' 
                    : 'text-[#DC2626] dark:text-[#EF4444]'
                }`}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                </p>
                <p className={`text-sm mt-1 ${
                  totalGainLossPct >= 0 
                    ? 'text-[#16A34A] dark:text-[#22C55E]' 
                    : 'text-[#DC2626] dark:text-[#EF4444]'
                }`}>
                  {totalGainLossPct >= 0 ? '+' : ''}{totalGainLossPct.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Portfolio Allocation</p>
            {!hasData ? (
              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">—</p>
            ) : (
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {portfolioPercentage.toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        {/* Data Consolidation Message if needed */}
        {!hasData && !loading && (
          <DataConsolidationMessage className="mb-6" />
        )}

        {/* Holdings by Type */}
        {hasData && groupedHoldings.length > 0 && (
          <div className="space-y-6">
            {groupedHoldings.map((group) => (
              <div key={group.type} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
                {/* Group Header */}
                <div className="px-6 py-4 bg-[#F6F8FB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {group.label}
                      </h2>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                        {group.holdings.length} holding{group.holdings.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Total Value</p>
                      <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {formatCurrency(group.totalCurrentValue)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Holdings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F6F8FB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Holding Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Invested Value
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Current Value
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Gain/Loss
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Allocation
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                      {group.holdings.map((holding) => (
                        <tr key={holding.id} className="hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              {holding.name}
                            </p>
                            {holding.seriesName && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                                {holding.seriesName}
                              </p>
                            )}
                            {holding.etfName && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                                {holding.etfName}
                              </p>
                            )}
                            {holding.platform && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                                {holding.platform}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                              {holding.quantity} {holding.goldType === 'etf' ? 'units' : (holding.unitType === 'gram' ? 'g' : 'units')}
                            </p>
                            {holding.purity && holding.goldType !== 'etf' && (
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                                {holding.purity}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                              {formatCurrency(holding.investedValue)}
                            </p>
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                              {new Date(holding.purchaseDate).toLocaleDateString('en-IN')}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                              {formatCurrency(holding.currentValue)}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {holding.gainLoss >= 0 ? (
                                <TrendingUpIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                              ) : (
                                <TrendingDownIcon className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444]" />
                              )}
                              <div>
                                <p className={`text-sm font-medium ${
                                  holding.gainLoss >= 0 
                                    ? 'text-[#16A34A] dark:text-[#22C55E]' 
                                    : 'text-[#DC2626] dark:text-[#EF4444]'
                                }`}>
                                  {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                                </p>
                                <p className={`text-xs ${
                                  holding.gainLossPct >= 0 
                                    ? 'text-[#16A34A] dark:text-[#22C55E]' 
                                    : 'text-[#DC2626] dark:text-[#EF4444]'
                                }`}>
                                  {holding.gainLossPct >= 0 ? '+' : ''}{holding.gainLossPct.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] dark:bg-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6]">
                              {holding.allocationPct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(holding)}
                                className="p-2 text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] rounded-lg transition-colors"
                                title="Edit holding"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(holding.id)}
                                disabled={deletingHoldingId === holding.id}
                                className="p-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-50"
                                title="Delete holding"
                              >
                                {deletingHoldingId === holding.id ? (
                                  <div className="w-4 h-4 border-2 border-[#DC2626] dark:border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <TrashIcon className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#F6F8FB] dark:bg-[#334155] border-t-2 border-[#E5E7EB] dark:border-[#334155]">
                      <tr>
                        <td colSpan={2} className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Total</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                            {formatCurrency(group.totalInvested)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                            {formatCurrency(group.totalCurrentValue)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-sm font-semibold ${
                            (group.totalCurrentValue - group.totalInvested) >= 0 
                              ? 'text-[#16A34A] dark:text-[#22C55E]' 
                              : 'text-[#DC2626] dark:text-[#EF4444]'
                          }`}>
                            {group.totalCurrentValue - group.totalInvested >= 0 ? '+' : ''}
                            {formatCurrency(group.totalCurrentValue - group.totalInvested)}
                          </p>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <GoldAddModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingHolding(null);
          }}
          userId={user?.id || ''}
          onSuccess={handleAddSuccess}
          existingHolding={editingHolding ? {
            id: editingHolding.id,
            goldType: editingHolding.goldType,
            investedAmount: editingHolding.investedValue,
            quantity: editingHolding.quantity,
            unitType: editingHolding.unitType,
            purchaseDate: editingHolding.purchaseDate,
            seriesName: editingHolding.seriesName,
            issueDate: editingHolding.issueDate,
            maturityDate: editingHolding.maturityDate,
            interestRate: editingHolding.interestRate,
            form: editingHolding.form,
            purity: editingHolding.purity,
            grossWeight: editingHolding.grossWeight,
            netWeight: editingHolding.netWeight,
            makingCharges: editingHolding.makingCharges,
            etfName: editingHolding.etfName,
            isin: editingHolding.isin,
            exchange: editingHolding.exchange,
            platform: editingHolding.platform,
            provider: editingHolding.provider,
            vaulted: editingHolding.vaulted,
          } : undefined}
        />
      )}
    </div>
  );
}
