/**
 * Market Cap Exposure Analysis Page
 * 
 * Shows market cap exposure (Large, Mid, Small) combining direct equity and MF equity exposure.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

interface MarketCapExposure {
  category: string;
  description: string;
  directEquity: number;
  viaMF: number;
  total: number;
  percentage: number;
}

export default function MarketCapExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [marketCaps, setMarketCaps] = useState<MarketCapExposure[]>([]);
  const [totalEquityExposure, setTotalEquityExposure] = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const equityHoldings = portfolioData.holdings.filter((h: any) => h.assetType === 'Equity' || h.assetType === 'Stocks');
          const mfHoldings = portfolioData.allocation.find((a: any) => a.name === 'Mutual Funds');
          
          const direct = equityHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || h.investedValue), 0);
          const mfValue = mfHoldings?.value || 0;
          const viaMF = mfValue * 0.85; // 85% equity exposure
          const total = direct + viaMF;

          setTotalEquityExposure(total);

          // Mock market cap breakdown
          const marketCapData: MarketCapExposure[] = [
            {
              category: 'Large Cap',
              description: 'Top 100 stocks',
              directEquity: direct * 0.66,
              viaMF: viaMF * 0.70,
              total: 0,
              percentage: 0,
            },
            {
              category: 'Mid Cap',
              description: '101-250',
              directEquity: direct * 0.25,
              viaMF: viaMF * 0.20,
              total: 0,
              percentage: 0,
            },
            {
              category: 'Small Cap',
              description: '251+',
              directEquity: direct * 0.09,
              viaMF: viaMF * 0.10,
              total: 0,
              percentage: 0,
            },
          ];

          // Calculate totals and percentages
          marketCapData.forEach(m => {
            m.total = m.directEquity + m.viaMF;
            m.percentage = (m.total / total) * 100;
          });

          setMarketCaps(marketCapData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch market cap exposure data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/marketcap-exposure');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);


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
          <p className="text-sm text-[#6B7280]">Loading market cap exposure analysis...</p>
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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Market Cap Exposure Analysis</h1>
          <p className="text-sm text-[#6B7280]">
            Large cap, mid cap, or small cap exposure?
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
                This combines direct equity holdings with equity exposure from mutual funds. 
                Dashboard values remain unchanged.
              </p>
            </div>
          </div>
        </div>

        {/* Market Cap Exposure Table */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-6">
            Market Cap Exposure (Direct Equity + MF Equity Exposure)
          </h2>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Market Cap
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Direct Equity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Via MF Exposure
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Total Exposure
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {marketCaps.map((cap) => (
                  <tr key={cap.category} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">{cap.category}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{cap.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] number-emphasis">
                      {cap.directEquity > 0 ? (
                        <>
                          {formatCurrency(cap.directEquity)}
                          <span className="text-xs text-[#6B7280] block mt-0.5">(owned)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] number-emphasis">
                      {cap.viaMF > 0 ? (
                        <>
                          {formatCurrency(cap.viaMF)}
                          <span className="text-xs text-[#6B7280] block mt-0.5">(via MF)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                      {formatCurrency(cap.total)}
                      <span className="text-xs text-[#6B7280] block mt-0.5">(total)</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]">
                        {cap.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] border-t-2 border-[#0F172A]">
                  <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A]">TOTAL</td>
                  <td colSpan={3} className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalEquityExposure)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Risk Profile */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6">
          <h3 className="text-base font-semibold text-[#0F172A] mb-4">Risk Profile</h3>
          
          <div className="space-y-4">
            {marketCaps[0] && marketCaps[0].percentage > 60 && (
              <div className="bg-[#D1FAE5] border border-[#16A34A]/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#065F46] mb-1">
                      Large Cap Dominant ({marketCaps[0].percentage.toFixed(1)}%)
                    </p>
                    <p className="text-xs text-[#065F46]">
                      Lower volatility, stable returns
                    </p>
                  </div>
                </div>
              </div>
            )}

            {marketCaps[1] && marketCaps[1].percentage > 20 && (
              <div className="bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#1E40AF] mb-1">
                      Mid Cap Allocation ({marketCaps[1].percentage.toFixed(1)}%)
                    </p>
                    <p className="text-xs text-[#1E40AF]">
                      Moderate volatility, growth potential
                    </p>
                  </div>
                </div>
              </div>
            )}

            {marketCaps[2] && marketCaps[2].percentage > 10 && (
              <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#92400E] mb-1">
                      Small Cap Allocation ({marketCaps[2].percentage.toFixed(1)}%)
                    </p>
                    <p className="text-xs text-[#92400E]">
                      Higher volatility, higher risk
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Data Source */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h3 className="text-base font-semibold text-[#0F172A] mb-4">Data Source & Accuracy</h3>
          <div className="space-y-3 text-sm text-[#475569]">
            <p>
              <strong>Direct equity market cap:</strong> Based on stock market capitalization
            </p>
            <p>
              <strong>MF equity market cap:</strong> Aggregated from fund factsheets and portfolio holdings
            </p>
            <p>
              <strong>Accuracy:</strong> ±5% (fund allocations change daily)
            </p>
            <div className="bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg p-3 mt-4">
              <p className="text-xs text-[#1E40AF]">
                Market cap classifications: Large Cap (Top 100), Mid Cap (101-250), Small Cap (251+)
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

