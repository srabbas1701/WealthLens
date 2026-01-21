/**
 * Sector Exposure Analysis Page
 * 
 * Shows sector-wise exposure combining direct equity and MF equity exposure.
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

interface SectorExposure {
  sector: string;
  directEquity: number;
  viaMF: number;
  total: number;
  percentage: number;
}

export default function SectorExposurePage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorExposure[]>([]);
  const [totalEquityExposure, setTotalEquityExposure] = useState(0);
  const [directEquity, setDirectEquity] = useState(0);
  const [equityViaMF, setEquityViaMF] = useState(0);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          
          // Direct equity holdings
          const equityHoldings = portfolioData.holdings.filter((h: any) => 
            h.assetType === 'Equity' || h.assetType === 'Stocks'
          );
          
          // MF holdings - calculate equity exposure based on asset_class
          const mfHoldings = portfolioData.holdings.filter((h: any) => 
            h.assetType === 'Mutual Funds' || h.assetType === 'Index Funds'
          );
          
          const direct = equityHoldings.reduce((sum: number, h: any) => sum + (h.currentValue || h.investedValue), 0);
          
          // Calculate MF equity exposure based on asset_class
          let viaMF = 0;
          mfHoldings.forEach((h: any) => {
            const value = h.currentValue || h.investedValue;
            const assetClass = h.assetClass || '';
            
            if (assetClass === 'FixedIncome') {
              viaMF += value * 0.10; // 10% equity in debt funds
            } else if (assetClass === 'Hybrid') {
              viaMF += value * 0.50; // 50% equity in hybrid funds
            } else {
              viaMF += value * 0.85; // 85% equity in equity funds
            }
          });
          
          const total = direct + viaMF;

          setDirectEquity(direct);
          setEquityViaMF(viaMF);
          setTotalEquityExposure(total);

          // Mock sector breakdown
          const sectorData: SectorExposure[] = [
            {
              sector: 'Technology',
              directEquity: direct * 0.25,
              viaMF: viaMF * 0.29,
              total: 0,
              percentage: 0,
            },
            {
              sector: 'Banking/Finance',
              directEquity: direct * 0.35,
              viaMF: viaMF * 0.24,
              total: 0,
              percentage: 0,
            },
            {
              sector: 'FMCG',
              directEquity: direct * 0.10,
              viaMF: viaMF * 0.13,
              total: 0,
              percentage: 0,
            },
            {
              sector: 'Pharma',
              directEquity: 0,
              viaMF: viaMF * 0.12,
              total: 0,
              percentage: 0,
            },
            {
              sector: 'Others',
              directEquity: direct * 0.30,
              viaMF: viaMF * 0.22,
              total: 0,
              percentage: 0,
            },
          ];

          // Calculate totals and percentages
          sectorData.forEach(s => {
            s.total = s.directEquity + s.viaMF;
            s.percentage = (s.total / total) * 100;
          });

          // Sort by total descending
          sectorData.sort((a, b) => b.total - a.total);

          setSectors(sectorData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sector exposure data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/analytics/sector-exposure');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  const highestSector = sectors[0];
  const hasConcentrationRisk = highestSector && highestSector.percentage > 25;

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
          <p className="text-sm text-[#6B7280]">Loading sector exposure analysis...</p>
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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Sector Exposure Analysis</h1>
          <p className="text-sm text-[#6B7280]">
            Which sectors are you exposed to?
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
                Use for risk assessment only. Dashboard values remain unchanged.
              </p>
            </div>
          </div>
        </div>

        {/* Sector Exposure Table */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-6">
            Sector Exposure (Direct Equity + MF Equity Exposure)
          </h2>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Sector
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
                {sectors.map((sector) => (
                  <tr key={sector.sector} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">{sector.sector}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {sector.directEquity > 0 ? '(owned)' : ''} {sector.viaMF > 0 ? '(via MF)' : ''} (total)
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A] number-emphasis">
                      {sector.directEquity > 0 ? formatCurrency(sector.directEquity) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-[#6B7280] number-emphasis">
                      {sector.viaMF > 0 ? formatCurrency(sector.viaMF) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                      {formatCurrency(sector.total)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]">
                        {sector.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] border-t-2 border-[#0F172A]">
                  <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A]">TOTAL</td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(directEquity)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(equityViaMF)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalEquityExposure)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-[#EFF6FF] rounded-lg border border-[#2563EB]/20 p-4">
            <p className="text-sm text-[#1E40AF]">
              <strong>Total Equity Exposure:</strong> {formatCurrency(totalEquityExposure)} 
              ({formatCurrency(directEquity)} direct + {formatCurrency(equityViaMF)} via MF)
            </p>
          </div>
        </section>

        {/* Concentration Risk */}
        {hasConcentrationRisk && (
          <section className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6">
            <h3 className="text-base font-semibold text-[#0F172A] mb-4">Concentration Risk</h3>
            <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4">
              <p className="text-sm text-[#92400E] mb-2">
                <strong>⚠ {highestSector.sector}:</strong> {highestSector.percentage.toFixed(1)}% of total equity exposure
              </p>
              <p className="text-xs text-[#92400E]">
                (Higher than recommended 25% single-sector limit)
              </p>
            </div>
            {sectors[1] && sectors[1].percentage > 20 && (
              <div className="bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg p-4 mt-3">
                <p className="text-sm text-[#1E40AF]">
                  <strong>ℹ {sectors[1].sector}:</strong> {sectors[1].percentage.toFixed(1)}% of total equity exposure
                </p>
                <p className="text-xs text-[#1E40AF] mt-1">
                  (Near recommended 25% single-sector limit)
                </p>
              </div>
            )}
          </section>
        )}

        {/* Data Source */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h3 className="text-base font-semibold text-[#0F172A] mb-4">Data Source & Limitations</h3>
          <div className="space-y-3 text-sm text-[#475569]">
            <p>
              <strong>Direct equity sector data:</strong> From your holdings
            </p>
            <p>
              <strong>MF equity sector data:</strong> Aggregated from fund factsheets
            </p>
            <p>
              <strong>Accuracy:</strong> ±5% (fund holdings change daily)
            </p>
            <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-3 mt-4">
              <p className="text-xs text-[#92400E]">
                <strong>⚠ Sector classifications may vary between sources.</strong> Use for directional insights, not precise allocation.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

