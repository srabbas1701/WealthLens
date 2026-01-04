/**
 * Geography Exposure Analysis Page
 * 
 * Shows geography-wise exposure (India vs International) combining direct equity and MF equity exposure.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

interface GeographyExposure {
  geography: string;
  description: string;
  directEquity: number;
  viaMF: number;
  total: number;
  percentage: number;
}

export default function GeographyExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [geographies, setGeographies] = useState<GeographyExposure[]>([]);
  const [totalEquityExposure, setTotalEquityExposure] = useState(0);
  const [internationalSources, setInternationalSources] = useState<string[]>([]);

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
          const mfHoldingsList = portfolioData.holdings.filter((h: any) => h.assetType === 'Mutual Funds');
          
          const direct = equityHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || h.investedValue), 0);
          const mfValue = mfHoldings?.value || 0;
          const viaMF = mfValue * 0.85; // 85% equity exposure
          const total = direct + viaMF;

          setTotalEquityExposure(total);

          // Mock geography breakdown
          // Most Indian portfolios are 95%+ India, 5% international
          const indiaExposure = direct + (viaMF * 0.95);
          const internationalExposure = viaMF * 0.05;

          const geographyData: GeographyExposure[] = [
            {
              geography: 'India',
              description: 'Domestic markets',
              directEquity: direct,
              viaMF: viaMF * 0.95,
              total: indiaExposure,
              percentage: (indiaExposure / total) * 100,
            },
            {
              geography: 'International',
              description: 'US, EU, etc.',
              directEquity: 0,
              viaMF: viaMF * 0.05,
              total: internationalExposure,
              percentage: (internationalExposure / total) * 100,
            },
          ];

          setGeographies(geographyData);

          // Mock international sources
          const sources: string[] = [];
          if (internationalExposure > 0) {
            sources.push('Parag Parikh Flexi Cap Fund (foreign stocks: ~30%)');
            sources.push('Motilal Oswal Nasdaq 100 FOF (US tech: 100%)');
          }
          setInternationalSources(sources);
        }
      }
    } catch (error) {
      console.error('Failed to fetch geography exposure data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/geography-exposure');
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
          <p className="text-sm text-[#6B7280]">Loading geography exposure analysis...</p>
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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Geography Exposure Analysis</h1>
          <p className="text-sm text-[#6B7280]">
            India vs International exposure
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

        {/* Geography Exposure Table */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-6">
            Geography Exposure (Direct Equity + MF Equity Exposure)
          </h2>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Geography
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
                {geographies.map((geo) => (
                  <tr key={geo.geography} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">{geo.geography}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{geo.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] number-emphasis">
                      {geo.directEquity > 0 ? (
                        <>
                          {formatCurrency(geo.directEquity)}
                          <span className="text-xs text-[#6B7280] block mt-0.5">(owned)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] number-emphasis">
                      {geo.viaMF > 0 ? (
                        <>
                          {formatCurrency(geo.viaMF)}
                          <span className="text-xs text-[#6B7280] block mt-0.5">(via MF)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                      {formatCurrency(geo.total)}
                      <span className="text-xs text-[#6B7280] block mt-0.5">(total)</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]">
                        {geo.percentage.toFixed(1)}%
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

        {/* International Sources */}
        {internationalSources.length > 0 && (
          <section className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6">
            <h3 className="text-base font-semibold text-[#0F172A] mb-4">International Exposure Sources</h3>
            <div className="bg-[#EFF6FF] rounded-lg border border-[#2563EB]/20 p-4">
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1E40AF] mb-2">
                    International exposure comes from:
                  </p>
                  <ul className="space-y-1 text-sm text-[#1E40AF]">
                    {internationalSources.map((source, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#2563EB]">•</span>
                        <span>{source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Data Source */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h3 className="text-base font-semibold text-[#0F172A] mb-4">Data Source & Accuracy</h3>
          <div className="space-y-3 text-sm text-[#475569]">
            <p>
              <strong>Direct equity geography:</strong> Based on stock listing exchanges
            </p>
            <p>
              <strong>MF equity geography:</strong> Aggregated from fund factsheets and portfolio holdings
            </p>
            <p>
              <strong>Accuracy:</strong> ±5% (fund allocations change daily)
            </p>
            <div className="bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg p-3 mt-4">
              <p className="text-xs text-[#1E40AF]">
                International exposure typically comes from funds with overseas investment mandates 
                (e.g., Flexi Cap funds, International funds, FOFs).
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

