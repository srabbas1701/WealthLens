'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import OnboardingQueueBanner from '@/components/OnboardingQueueBanner';
import { readQueue } from '@/lib/onboarding-queue';
import SilverAddModal from '@/components/SilverAddModal';
import SimpleToast from '@/components/SimpleToast';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from '@/components/icons';

type SilverType = 'physical' | 'etf' | 'digital';

interface SilverHolding {
  id: string;
  asset_id: string;
  silverType: SilverType;
  name: string;
  investedValue: number;
  currentValue: number;
  quantity: number;
  unitType: 'gram' | 'unit';
  purchaseDate: string;
  gainLoss: number;
  gainLossPct: number;
  allocationPct: number;
  form?: 'jewellery' | 'coin' | 'bar';
  purity?: string;
  grossWeight?: number;
  netWeight?: number;
  makingCharges?: number;
  physicalQuantity?: number;
  totalGrams?: number;
  etfName?: string;
  isin?: string;
  exchange?: string;
  platform?: string;
  provider?: string;
  vaulted?: boolean;
}

interface PortfolioHoldingRaw {
  id: string;
  asset_id: string;
  assetType?: string;
  asset?: { asset_type?: string; name?: string };
  name?: string;
  investedValue?: number;
  invested_value?: number;
  currentValue?: number;
  current_value?: number;
  quantity?: number;
  created_at?: string;
  notes?: string | null;
}

const SILVER_TYPE_LABELS: Record<SilverType, string> = {
  physical: 'Physical Silver',
  etf: 'Silver ETF',
  digital: 'Digital Silver',
};

export default function SilverHoldingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<SilverHolding[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<SilverHolding | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasAddedOneInQueue, setHasAddedOneInQueue] = useState(false);
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    holdingId: string | null;
    holdingName: string | null;
  }>({ isOpen: false, holdingId: null, holdingName: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const fromOnboarding = searchParams?.get('from') === 'onboarding';

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/portfolio/data?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      if (!result.success || !result.data) return;

      const portfolioData = result.data;
      const portfolioValue = portfolioData.metrics?.netWorth || portfolioData.metrics?.totalValue || 0;

      const rawHoldings = (portfolioData.holdings || []) as PortfolioHoldingRaw[];
      const silverHoldings: SilverHolding[] = rawHoldings
        .filter((h) => {
          try {
            const notes = h.notes ? JSON.parse(h.notes) : {};
            if (notes?.silver_type) return true;
          } catch {
            // ignore malformed metadata and fall back to asset type checks
          }
          const assetType = (h.assetType || '').toLowerCase();
          return assetType === 'silver' || h.asset?.asset_type === 'silver';
        })
        .map((h) => {
          const notes = h.notes ? JSON.parse(h.notes) : {};
          const investedValue = h.investedValue || h.invested_value || 0;
          const currentValue = h.currentValue || h.current_value || investedValue;
          const gainLoss = currentValue - investedValue;
          const gainLossPct = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
          const allocationPct = portfolioValue > 0 ? (currentValue / portfolioValue) * 100 : 0;
          return {
            id: h.id,
            asset_id: h.asset_id,
            silverType: notes.silver_type || 'physical',
            name: h.name || h.asset?.name || 'Silver Holding',
            investedValue,
            currentValue,
            quantity: h.quantity || 0,
            unitType: notes.unit_type || 'gram',
            purchaseDate: notes.purchase_date || h.created_at,
            gainLoss,
            gainLossPct,
            allocationPct,
            form: typeof notes.form === 'string'
              ? (notes.form.toLowerCase() as 'jewellery' | 'coin' | 'bar')
              : undefined,
            purity: notes.purity,
            grossWeight: notes.gross_weight,
            netWeight: notes.net_weight,
            makingCharges: notes.making_charges,
            physicalQuantity: notes.quantity,
            totalGrams: notes.total_grams,
            etfName: notes.etf_name,
            isin: notes.isin,
            exchange: notes.exchange,
            platform: notes.platform,
            provider: notes.provider,
            vaulted: notes.vaulted,
          };
        });

      setHoldings(silverHoldings);
    } catch {
      setToast({ message: 'Failed to load silver holdings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/silver');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (searchParams?.get('add') === '1' && user?.id) {
      setEditingHolding(null);
      setShowAddModal(true);
      router.replace(`/portfolio/silver${fromOnboarding ? '?from=onboarding' : ''}`, { scroll: false });
    }
  }, [searchParams, user?.id, router, fromOnboarding]);

  useEffect(() => {
    if (user?.id) fetchData(user.id);
  }, [user?.id, fetchData]);

  const grouped = useMemo(() => {
    const groups: Record<SilverType, SilverHolding[]> = { physical: [], etf: [], digital: [] };
    holdings.forEach(h => groups[h.silverType]?.push(h));
    return (Object.keys(groups) as SilverType[])
      .filter(type => groups[type].length > 0)
      .map(type => ({
        type,
        label: SILVER_TYPE_LABELS[type],
        holdings: groups[type],
        totalInvested: groups[type].reduce((s, h) => s + h.investedValue, 0),
        totalCurrentValue: groups[type].reduce((s, h) => s + h.currentValue, 0),
      }));
  }, [holdings]);

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalGainLoss = totalCurrent - totalInvested;
  const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  const totalAllocation = holdings.reduce((s, h) => s + h.allocationPct, 0);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setEditingHolding(null);
    if (user?.id) {
      fetchData(user.id);
      const q = readQueue(user.id);
      if (q && q.current === 'silver') setHasAddedOneInQueue(true);
    }
  };

  const handleDeleteClick = (holding: SilverHolding) => {
    setDeleteConfirmModal({ isOpen: true, holdingId: holding.id, holdingName: holding.name });
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !deleteConfirmModal.holdingId) return;
    setIsDeleting(true);
    setDeletingHoldingId(deleteConfirmModal.holdingId);
    try {
      const params = new URLSearchParams({ user_id: user.id, holding_id: deleteConfirmModal.holdingId });
      const response = await fetch(`/api/silver/holdings?${params}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setToast({ message: 'Silver holding deleted successfully', type: 'success' });
        fetchData(user.id);
      } else {
        setToast({ message: result.error || 'Failed to delete silver holding', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to delete silver holding', type: 'error' });
    } finally {
      setIsDeleting(false);
      setDeletingHoldingId(null);
      setDeleteConfirmModal({ isOpen: false, holdingId: null, holdingName: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader
        showBackButton={true}
        backHref={fromOnboarding ? '/onboarding/select?step=add-details' : '/dashboard'}
        backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
      />
      {fromOnboarding && user?.id && <OnboardingQueueBanner userId={user.id} hasAddedOne={hasAddedOneInQueue} />}

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Silver Holdings</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Track your physical, ETF, and digital silver investments</p>
          </div>
          <button
            onClick={() => {
              setEditingHolding(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 p-2.5 md:px-4 md:py-2.5 min-w-[44px] min-h-[44px] bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden md:inline">Add Silver Holding</span>
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Total Invested</p>
            <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">{holdings.length ? formatCurrency(totalInvested) : '—'}</p>
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Current Value</p>
            <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">{holdings.length ? formatCurrency(totalCurrent) : '—'}</p>
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Gain/Loss</p>
            <p className={`text-2xl font-semibold number-emphasis ${totalGainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
              {holdings.length ? `${totalGainLoss >= 0 ? '+' : ''}${formatCurrency(totalGainLoss)}` : '—'}
            </p>
            {holdings.length > 0 && (
              <p className={`text-sm mt-1 ${totalGainLossPct >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                {totalGainLossPct >= 0 ? '+' : ''}{totalGainLossPct.toFixed(2)}%
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Portfolio Allocation</p>
            <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">{holdings.length ? `${totalAllocation.toFixed(1)}%` : '—'}</p>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 text-center text-[#6B7280] dark:text-[#94A3B8]">
            No silver holdings found yet. Add your first silver investment to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.type} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
                <div className="px-6 py-4 bg-[#F6F8FB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{group.label}</h2>
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">{group.holdings.length} holding{group.holdings.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Total Value</p>
                      <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(group.totalCurrentValue)}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F6F8FB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Holding</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Invested</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Current</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Gain/Loss</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Allocation</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                      {group.holdings.map(holding => (
                        <tr key={holding.id} className="hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{holding.name}</td>
                          <td className="px-6 py-4 text-sm text-[#0F172A] dark:text-[#F8FAFC]">{holding.quantity} {holding.unitType === 'unit' ? 'units' : 'g'}</td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(holding.investedValue)}</td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(holding.currentValue)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {holding.gainLoss >= 0 ? <TrendingUpIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" /> : <TrendingDownIcon className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444]" />}
                              <span className={`text-sm font-medium ${holding.gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                                {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-[#0F172A] dark:text-[#F8FAFC]">{holding.allocationPct.toFixed(1)}%</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => { setEditingHolding(holding); setShowAddModal(true); }} className="p-2 text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] rounded-lg transition-colors" title="Edit holding">
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteClick(holding)} disabled={deletingHoldingId === holding.id} className="p-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-50" title="Delete holding">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <SilverAddModal
          isOpen={showAddModal}
          onClose={() => {
            if (fromOnboarding) {
              router.replace('/onboarding/select?step=add-details');
              return;
            }
            setShowAddModal(false);
            setEditingHolding(null);
          }}
          userId={user?.id || ''}
          onSuccess={handleAddSuccess}
          existingHolding={editingHolding ? {
            id: editingHolding.id,
            silverType: editingHolding.silverType,
            investedAmount: editingHolding.investedValue,
            quantity: editingHolding.quantity,
            unitType: editingHolding.unitType,
            purchaseDate: editingHolding.purchaseDate,
            form: editingHolding.form,
            purity: editingHolding.purity,
            grossWeight: editingHolding.grossWeight,
            netWeight: editingHolding.netWeight,
            makingCharges: editingHolding.makingCharges,
            physicalQuantity: editingHolding.physicalQuantity,
            totalGrams: editingHolding.totalGrams,
            etfName: editingHolding.etfName,
            isin: editingHolding.isin,
            exchange: editingHolding.exchange,
            platform: editingHolding.platform,
            provider: editingHolding.provider,
            vaulted: editingHolding.vaulted,
          } : undefined}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, holdingId: null, holdingName: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Silver Holding"
        message="Are you sure you want to delete this silver holding?"
        itemName={deleteConfirmModal.holdingName || undefined}
        isDeleting={isDeleting}
      />

      {toast && <SimpleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
