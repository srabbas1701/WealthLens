/**
 * Demo Mutual Funds Holdings Page
 * 
 * Read-only view of mutual fund holdings in demo mode.
 */

'use client';

import { useMemo } from 'react';
import DemoBanner from '@/components/DemoBanner';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { LockIcon } from '@/components/icons';
import { DEMO_PORTFOLIO } from '@/data/demo-portfolio';

export default function DemoMutualFundsHoldingsPage() {
  const { formatCurrency } = useCurrency();
  
  const mfHoldings = useMemo(() => {
    return DEMO_PORTFOLIO.holdings.filter(h => h.assetType === 'Mutual Fund');
  }, []);

  const totalValue = mfHoldings.reduce((sum, h) => sum + (h.currentValue || h.investedValue), 0);
  const totalInvested = mfHoldings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  const portfolioPercentage = DEMO_PORTFOLIO.metrics.netWorth > 0 
    ? (totalValue / DEMO_PORTFOLIO.metrics.netWorth) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <DemoBanner />
      <AppHeader 
        showBackButton={true}
        backHref="/demo"
        backLabel="Back to Demo Dashboard"
      />

      <main className="max-w-[1200px] mx-auto px-6 py-8 pt-24">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Mutual Funds Holdings</h1>
          <p className="text-sm text-[#6B7280]">Mutual fund investments in your portfolio</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Total Value</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Invested Value</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {formatCurrency(totalInvested)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Gain/Loss</p>
            <p className={`text-2xl font-semibold number-emphasis ${
              totalGainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
            </p>
            <p className={`text-sm mt-1 ${
              totalGainLossPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Portfolio Allocation</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {portfolioPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mb-6 bg-[#F6F8FB] border border-[#E5E7EB] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <LockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
            <p className="text-sm text-[#475569]">
              <strong className="text-[#0F172A]">Edit, delete, and add actions are disabled in demo mode.</strong>
              {' '}Available after sign-up.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F8FB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Fund Name</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Units</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Avg NAV</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Current NAV</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Invested Value</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Current Value</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Gain/Loss</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Allocation %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {mfHoldings.map((holding) => {
                  const currentValue = holding.currentValue || holding.investedValue;
                  const currentNav = holding.quantity > 0 ? currentValue / holding.quantity : 0;
                  const gainLoss = currentValue - holding.investedValue;
                  const gainLossPercent = holding.investedValue > 0 
                    ? (gainLoss / holding.investedValue) * 100 
                    : 0;
                  
                  return (
                    <tr key={holding.id} className="hover:bg-[#F6F8FB] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#0F172A]">{holding.name}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        {holding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        ₹{holding.averagePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        ₹{currentNav.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        {formatCurrency(holding.investedValue)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        {formatCurrency(currentValue)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <p className={`text-sm font-medium number-emphasis ${
                            gainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                          </p>
                          <p className={`text-xs ${
                            gainLossPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}>
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                        {holding.allocationPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#F6F8FB] border-t-2 border-[#E5E7EB]">
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-[#0F172A]">Total</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalInvested)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <p className={`text-sm font-semibold number-emphasis ${
                        totalGainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}>
                        {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                      </p>
                      <p className={`text-xs ${
                        totalGainLossPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}>
                        {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {portfolioPercentage.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}








