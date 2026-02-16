/**
 * Liabilities Page (UI-only)
 *
 * Header with + Add Liability, summary strip, and list/grid with edit/delete.
 * Uses localStorage-based liabilities store. No backend.
 * Integration point: replace getLiabilities/setLiabilities with API when ready.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileIcon,
  XIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import AddLiabilityModal from '@/components/AddLiabilityModal';
import {
  getLiabilities,
  deleteLiability,
  getLiabilityTotals,
  type Liability,
  type LiabilityType,
} from '@/lib/liabilities-store';
import {
  calculateApproxInterestCost,
  calculatePrepaymentImpact,
  getInterestPriorityTag,
} from '@/lib/liability-insights';
import { generateNetWorthTimeline } from '@/lib/net-worth-timeline';
import { generateNetWorthStatementPDF } from '@/lib/pdf/net-worth-pdf';
import { calculateCreditHealthScore } from '@/lib/credit-health-score';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  HOME_LOAN: 'Home Loan',
  VEHICLE_LOAN: 'Vehicle Loan',
  CREDIT_CARD: 'Credit Card',
  PERSONAL_LOAN: 'Personal Loan',
  EDUCATION_LOAN: 'Education Loan',
  OTHER: 'Other',
};

export default function LiabilitiesPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [portfolioData, setPortfolioData] = useState<{
    assetsTotal: number;
    allocationBuckets: Array<{ name: string; value: number }>;
  } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Expandable Cost & Insights per liability
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [prepaymentInputByLiabilityId, setPrepaymentInputByLiabilityId] = useState<Record<string, string>>({});
  const [prepaymentResultByLiabilityId, setPrepaymentResultByLiabilityId] = useState<Record<string, ReturnType<typeof calculatePrepaymentImpact> | null>>({});
  const [expandedCreditScoreCalc, setExpandedCreditScoreCalc] = useState(false);

  const loadLiabilities = useCallback(() => {
    if (!user?.id) return;
    const list = getLiabilities(user.id);
    setLiabilities(list);
  }, [user?.id]);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/liabilities');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      loadLiabilities();
    }
    setLoading(false);
  }, [user?.id, loadLiabilities]);

  // Fetch portfolio data for PDF (assets from /api/portfolio/data)
  useEffect(() => {
    if (!user?.id) return;
    const fetchPortfolio = async () => {
      try {
        const params = new URLSearchParams({ user_id: user.id });
        const res = await fetch(`/api/portfolio/data?${params}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            const assetsTotal = d.metrics?.netWorth ?? 0;
            const allocationBuckets = (d.allocation ?? []).map((a: { name: string; value: number }) => ({
              name: a.name,
              value: a.value ?? 0,
            }));
            setPortfolioData({ assetsTotal, allocationBuckets });
          }
        }
      } catch {
        setPortfolioData(null);
      }
    };
    fetchPortfolio();
  }, [user?.id]);

  const handleAddSuccess = () => {
    loadLiabilities();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    loadLiabilities();
    setEditingLiability(null);
  };

  const totals = getLiabilityTotals(liabilities);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = () => {
    if (!user?.id || !deleteConfirmId) return;
    deleteLiability(user.id, deleteConfirmId);
    loadLiabilities();
    setDeleteConfirmId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleDownloadNetWorthStatement = async () => {
    if (!user?.id) return;
    setPdfLoading(true);
    try {
      // Use existing computed totals — no recalculation. assetsTotal from portfolio API.
      const assetsTotal = portfolioData?.assetsTotal ?? 0;
      const timeline = generateNetWorthTimeline({
        assetsTotal,
        liabilities,
        months: 12,
      });
      await generateNetWorthStatementPDF({
        assetsTotal,
        liabilitiesTotal: totals.totalOutstanding,
        allocationBuckets: portfolioData?.allocationBuckets ?? [],
        liabilities,
        timeline,
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const hasAssets = (portfolioData?.assetsTotal ?? 0) > 0;
  const hasLiabilities = totals.totalOutstanding > 0;
  const canDownloadPdf = hasAssets || hasLiabilities;

  const handlePrepaymentCalculate = (liability: Liability) => {
    const raw = prepaymentInputByLiabilityId[liability.id] ?? '';
    const amount = parseFloat(raw) || 0;
    if (amount <= 0) return;
    const result = calculatePrepaymentImpact(liability, amount);
    setPrepaymentResultByLiabilityId((prev) => ({ ...prev, [liability.id]: result }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading liabilities...</p>
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

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Header with + Add Liability */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
              Liabilities
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Track loans and credit obligations
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadNetWorthStatement}
              disabled={!canDownloadPdf || pdfLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border-2 border-[#E5E7EB] dark:border-[#334155] font-medium rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileIcon className="w-5 h-5" />
              {pdfLoading ? 'Generating...' : 'Download Net Worth Statement'}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Liability
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[var(--card)] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">
                Total Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(totals.totalOutstanding)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--card)] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">
                Monthly EMI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                {formatCurrency(totals.totalEmi)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--card)] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">
                Secured vs Unsecured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                {totals.securedCount} secured • {totals.unsecuredCount} unsecured
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--card)] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">
                Avg Interest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {totals.avgInterest != null
                  ? `${totals.avgInterest.toFixed(1)}%`
                  : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Health Score — show only if active liabilities >= 2 */}
        {liabilities.length >= 2 && (() => {
          const creditScore = calculateCreditHealthScore(liabilities);
          if (!creditScore) return null;
          return (
            <Card className="mb-8 bg-[var(--card)] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Credit Health Score
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Internal score based on your tracked liabilities. Not a CIBIL score.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {creditScore.score}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {creditScore.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedCreditScoreCalc(!expandedCreditScoreCalc)}
                  className="mt-4 text-sm text-muted-foreground hover:text-[#0F172A] dark:hover:text-[#F8FAFC] flex items-center gap-1"
                >
                  {expandedCreditScoreCalc ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                  How this score is calculated
                </button>
                {expandedCreditScoreCalc && (
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155] space-y-2 text-sm text-muted-foreground">
                    <p>Debt Mix (30 pts): More secured loans = better.</p>
                    <p>Interest Quality (30 pts): Lower average interest = better.</p>
                    <p>Liability Count (20 pts): Fewer liabilities = better.</p>
                    <p>EMI Discipline (20 pts): More liabilities with EMI tracked = better.</p>
                    <p className="pt-2">
                      Your breakdown: Debt Mix {creditScore.breakdown.debtMix.score}/{creditScore.breakdown.debtMix.max} • Interest {creditScore.breakdown.interestQuality.score}/{creditScore.breakdown.interestQuality.max} • Count {creditScore.breakdown.liabilityCount.score}/{creditScore.breakdown.liabilityCount.max} • EMI {creditScore.breakdown.emiDiscipline.score}/{creditScore.breakdown.emiDiscipline.max}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* List / Grid */}
        <Card className="bg-[var(--card)] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Your Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {liabilities.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
                  No liabilities added yet
                </p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mb-4">
                  Add home loans, credit cards, personal loans, and more
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Liability
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {liabilities.map((liability) => {
                  const interestPriority = getInterestPriorityTag(liability.interestRate);
                  const approxCost = calculateApproxInterestCost(liability);
                  const hasEmi = liability.emi != null && liability.emi > 0;
                  const isExpanded = expandedInsightId === liability.id;
                  const prepaymentInput = prepaymentInputByLiabilityId[liability.id] ?? '';
                  const prepaymentResult = prepaymentResultByLiabilityId[liability.id];

                  return (
                    <div key={liability.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              {liability.lender}
                            </p>
                            {/* Interest Priority badge — only if interest_rate exists */}
                            {interestPriority != null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]">
                                {interestPriority} interest
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                            {LIABILITY_TYPE_LABELS[liability.type]}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                              {formatCurrency(liability.outstanding)}
                            </p>
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                              Outstanding
                            </p>
                          </div>
                          {hasEmi && (
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                {formatCurrency(liability.emi)}
                              </p>
                              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                                EMI
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedInsightId(isExpanded ? null : liability.id)}
                              className="p-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] rounded-lg transition-colors"
                              aria-label={isExpanded ? 'Hide insights' : 'Show Cost & Insights'}
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="w-4 h-4" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingLiability(liability)}
                              className="p-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] rounded-lg transition-colors"
                              aria-label="Edit"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(liability.id)}
                              className="p-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#DC2626] dark:hover:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors"
                              aria-label="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Cost & Insights — inline, no modal */}
                      {isExpanded && (
                        <div className="px-6 pb-4 pt-0 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]">
                          <p className="text-xs font-medium text-muted-foreground mb-3">
                            Cost & Insights
                          </p>
                          <div className="space-y-3">
                            {/* Approx yearly interest — if calculable */}
                            {approxCost != null && (
                              <p className="text-sm text-muted-foreground">
                                Approx. yearly interest: {formatCurrency(approxCost.yearlyInterest)}
                              </p>
                            )}
                            {/* Prepayment input + Calculate — only if EMI exists */}
                            {hasEmi && (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="number"
                                  step="1000"
                                  min="0"
                                  placeholder="Prepayment amount (₹)"
                                  value={prepaymentInput}
                                  onChange={(e) =>
                                    setPrepaymentInputByLiabilityId((prev) => ({
                                      ...prev,
                                      [liability.id]: e.target.value,
                                    }))
                                  }
                                  className="w-40 px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePrepaymentCalculate(liability)}
                                  className="px-3 py-2 text-sm font-medium rounded-lg bg-[#E5E7EB] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#D1D5DB] dark:hover:bg-[#475569] transition-colors"
                                >
                                  Calculate
                                </button>
                              </div>
                            )}
                            {/* Prepayment result — muted text, no red/green */}
                            {prepaymentResult != null && (
                              <p className="text-sm text-muted-foreground">
                                Approx. interest saved: {formatCurrency(prepaymentResult.approxInterestSaved)}. New outstanding: {formatCurrency(prepaymentResult.newOutstanding)}
                                {prepaymentResult.approxMonthsSaved != null &&
                                  ` • ~${prepaymentResult.approxMonthsSaved} months saved`}
                              </p>
                            )}
                            {/* TODO: timeline, export, credit score when available */}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Liability Modal */}
      <AddLiabilityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        userId={user?.id || ''}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Liability Modal */}
      <AddLiabilityModal
        isOpen={!!editingLiability}
        onClose={() => setEditingLiability(null)}
        userId={user?.id || ''}
        onSuccess={handleEditSuccess}
        existingLiability={editingLiability}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const liabilityToDelete = liabilities.find((l) => l.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleDeleteCancel}
              aria-hidden
            />
            <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
                <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Delete liability?
                </h2>
                <button
                  onClick={handleDeleteCancel}
                  className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
                  aria-label="Close"
                >
                  <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                </button>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  {liabilityToDelete
                    ? `Are you sure you want to delete "${liabilityToDelete.lender}" (${LIABILITY_TYPE_LABELS[liabilityToDelete.type]})? This cannot be undone.`
                    : 'Are you sure you want to delete this liability? This cannot be undone.'}
                </p>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#0F172A] rounded-b-xl">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex items-center gap-2 px-6 py-2 bg-[#DC2626] dark:bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#B91C1C] dark:hover:bg-[#DC2626] transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
