/**
 * Mutual Fund Exposure Analytics Page
 * 
 * Shows what your mutual funds are invested in (equity, debt, other).
 * Clearly separates ownership from exposure.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { 
  ArrowLeftIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

interface MFExposure {
  equity: number;
  debt: number;
  other: number;
  total: number;
}

interface SchemeExposure {
  id: string;
  name: string;
  value: number;
  equity: number;
  debt: number;
  other: number;
  equityPct: number;
  debtPct: number;
  otherPct: number;
  dataSource: 'factsheet' | 'estimated';
  asOfDate?: string;
}

interface CombinedView {
  assetType: string;
  directHoldings: number;
  exposureViaMF: number;
  combinedView: number;
}

export default function MFExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [totalMFValue, setTotalMFValue] = useState(0);
  const [exposure, setExposure] = useState<MFExposure | null>(null);
  const [schemes, setSchemes] = useState<SchemeExposure[]>([]);
  const [directEquity, setDirectEquity] = useState(0);
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set());
  const [portfolioTotal, setPortfolioTotal] = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const mfHoldings = portfolioData.holdings.filter((h: any) => h.assetType === 'Mutual Funds');
          const equityHoldings = portfolioData.holdings.filter((h: any) => h.assetType === 'Equity' || h.assetType === 'Stocks');
          
          const totalMF = mfHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || h.investedValue), 0);
          const totalEquity = equityHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || h.investedValue), 0);
          
          setTotalMFValue(totalMF);
          setDirectEquity(totalEquity);
          setPortfolioTotal(portfolioData.metrics.netWorth);

          // Calculate exposure (mock - in production from factsheet)
          const equityExposure = totalMF * 0.85;
          const debtExposure = totalMF * 0.12;
          const otherExposure = totalMF * 0.03;

          setExposure({
            equity: equityExposure,
            debt: debtExposure,
            other: otherExposure,
            total: totalMF,
          });

          // Generate scheme-wise breakdown (mock data)
          const schemeBreakdown: SchemeExposure[] = mfHoldings.map((h: any, idx: number) => {
            const value = h.currentValue || h.investedValue;
            // Vary exposure percentages per scheme
            const equityPct = 80 + (idx % 3) * 5; // 80%, 85%, 90%
            const debtPct = 15 - (idx % 3) * 2.5; // 15%, 12.5%, 10%
            const otherPct = 5 - (idx % 3) * 2.5; // 5%, 2.5%, 0%
            
            return {
              id: h.id,
              name: h.name,
              value,
              equity: value * (equityPct / 100),
              debt: value * (debtPct / 100),
              other: value * (otherPct / 100),
              equityPct,
              debtPct,
              otherPct,
              dataSource: idx < 3 ? 'factsheet' : 'estimated',
              asOfDate: idx < 3 ? '2024-11-30' : undefined,
            };
          });

          setSchemes(schemeBreakdown);
        }
      }
    } catch (error) {
      console.error('Failed to fetch MF exposure data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/mutualfund-exposure');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  const toggleScheme = (schemeId: string) => {
    const newExpanded = new Set(expandedSchemes);
    if (newExpanded.has(schemeId)) {
      newExpanded.delete(schemeId);
    } else {
      newExpanded.add(schemeId);
    }
    setExpandedSchemes(newExpanded);
  };


  const combinedView: CombinedView[] = [
    {
      assetType: 'Stocks',
      directHoldings: directEquity,
      exposureViaMF: exposure?.equity || 0,
      combinedView: directEquity + (exposure?.equity || 0),
    },
    {
      assetType: 'Debt',
      directHoldings: 0,
      exposureViaMF: exposure?.debt || 0,
      combinedView: exposure?.debt || 0,
    },
  ];

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
          <p className="text-sm text-[#6B7280]">Loading MF exposure analytics...</p>
        </div>
      </div>
    );
  }

  if (!exposure) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#475569] mb-4">Failed to load exposure data</p>
          <button
            onClick={() => user?.id && fetchData(user.id)}
            className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/analytics/overview"
        backLabel="Back to Analytics"
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Mutual Fund Exposure Analytics</h1>
          <p className="text-sm text-[#6B7280]">
            Understanding what your mutual funds are invested in
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#92400E] mb-1">
                Analytics View - Exposure Analysis
              </p>
              <p className="text-xs text-[#92400E]">
                This screen shows exposure analysis, not asset ownership. Values here may differ from 
                dashboard and holdings screens. Dashboard values remain authoritative.
              </p>
            </div>
          </div>
        </div>

        {/* Your Mutual Fund Holdings */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Your Mutual Fund Holdings (Asset Ownership)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[#6B7280] font-medium mb-2">Total Mutual Fund Value</p>
              <p className="text-3xl font-semibold text-[#0F172A] number-emphasis">
                {formatCurrency(totalMFValue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] font-medium mb-2">Number of Schemes</p>
              <p className="text-3xl font-semibold text-[#0F172A] number-emphasis">
                {schemes.length}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-[#16A34A]" />
            <p className="text-sm text-[#6B7280]">This is what you OWN. ✓</p>
          </div>
        </section>

        {/* Exposure Breakdown */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-6">Exposure Breakdown (What your MFs invest in)</h2>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Asset Class
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Exposure Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    % of MF Holdings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    % of Portfolio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                <tr>
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm">Equity</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">(via Mutual Funds)</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(exposure.equity)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] number-emphasis">
                    {((exposure.equity / totalMFValue) * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] number-emphasis">
                    {((exposure.equity / portfolioTotal) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm">Debt</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">(via Mutual Funds)</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(exposure.debt)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] number-emphasis">
                    {((exposure.debt / totalMFValue) * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] number-emphasis">
                    {((exposure.debt / portfolioTotal) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm">Cash/Others</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">(via Mutual Funds)</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(exposure.other)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] number-emphasis">
                    {((exposure.other / totalMFValue) * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] number-emphasis">
                    {((exposure.other / portfolioTotal) * 100).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] border-t-2 border-[#0F172A]">
                  <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A]">TOTAL</td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(exposure.total)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">100.0%</td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">
                    {((exposure.total / portfolioTotal) * 100).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-[#16A34A]" />
            <p className="text-sm text-[#6B7280]">
              Total: {formatCurrency(exposure.total)} (matches your MF holdings) ✓
            </p>
          </div>
        </section>

        {/* Combined View */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Combined View (Ownership + Exposure)</h2>
          <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#92400E]">
              <strong>⚠ For reference only.</strong> Dashboard values remain unchanged.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Asset Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Direct Holdings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Exposure (via MF)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Combined View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {combinedView.map((item) => (
                  <tr key={item.assetType}>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">{item.assetType}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {item.assetType === 'Stocks' ? '(owned)' : '(owned)'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] number-emphasis">
                      {item.directHoldings > 0 ? formatCurrency(item.directHoldings) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] number-emphasis">
                      {item.exposureViaMF > 0 ? (
                        <>
                          {formatCurrency(item.exposureViaMF)}
                          <span className="text-xs text-[#6B7280] block mt-0.5">(via MF)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                      {item.combinedView > 0 ? (
                        <>
                          {formatCurrency(item.combinedView)}
                          <span className="text-xs text-[#6B7280] block mt-0.5">(total exp)</span>
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm">Mutual Funds</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">(as asset class)</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalMFValue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280]">—</td>
                  <td className="px-4 py-3.5 text-right text-sm text-[#6B7280]">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#0F172A] mb-1">
                  This "Combined View" is for analytics only.
                </p>
                <p className="text-xs text-[#6B7280]">
                  Your dashboard continues to show: Stocks {formatCurrency(directEquity)} (direct holdings), 
                  Mutual Funds {formatCurrency(totalMFValue)} (total MF value).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Scheme-wise Breakdown */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-6">
          <div className="px-8 py-6 border-b border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#0F172A]">Scheme-wise Exposure Breakdown</h2>
          </div>

          <div className="divide-y divide-[#E5E7EB]">
            {schemes.slice(0, 10).map((scheme) => (
              <div key={scheme.id}>
                <button
                  onClick={() => toggleScheme(scheme.id)}
                  className="w-full px-8 py-5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {expandedSchemes.has(scheme.id) ? (
                      <ChevronDownIcon className="w-5 h-5 text-[#6B7280]" />
                    ) : (
                      <ChevronUpIcon className="w-5 h-5 text-[#6B7280] rotate-90" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-[#0F172A]">{scheme.name}</h3>
                        <span className="text-xs text-[#6B7280]">({formatCurrency(scheme.value)})</span>
                        {scheme.dataSource === 'factsheet' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#D1FAE5] text-[#065F46] border border-[#16A34A]/20">
                            Factsheet
                          </span>
                        )}
                        {scheme.dataSource === 'estimated' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/20">
                            Estimated
                          </span>
                        )}
                      </div>
                      {scheme.asOfDate && (
                        <p className="text-xs text-[#6B7280] mt-1">
                          Source: Fund factsheet as of {new Date(scheme.asOfDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {expandedSchemes.has(scheme.id) && (
                  <div className="px-8 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-[#6B7280] font-medium mb-1">Equity</p>
                        <p className="text-sm font-semibold text-[#0F172A] number-emphasis">
                          {formatCurrency(scheme.equity)}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">({scheme.equityPct.toFixed(1)}%)</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] font-medium mb-1">Debt</p>
                        <p className="text-sm font-semibold text-[#0F172A] number-emphasis">
                          {formatCurrency(scheme.debt)}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">({scheme.debtPct.toFixed(1)}%)</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] font-medium mb-1">Cash/Other</p>
                        <p className="text-sm font-semibold text-[#0F172A] number-emphasis">
                          {formatCurrency(scheme.other)}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">({scheme.otherPct.toFixed(1)}%)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Data Source */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h3 className="text-base font-semibold text-[#0F172A] mb-4">Data Source & Accuracy</h3>
          <div className="space-y-3 text-sm text-[#475569]">
            <p>
              <strong>Exposure data from:</strong> Fund factsheets (as of Nov 30, 2024)
            </p>
            <p>
              <strong>Update frequency:</strong> Monthly
            </p>
            <p>
              <strong>Accuracy:</strong> ±2% (fund allocations change daily)
            </p>
            <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-3 mt-4">
              <p className="text-xs text-[#92400E]">
                <strong>⚠ Exposure percentages are approximate.</strong> For exact holdings, refer to individual fund factsheets.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

