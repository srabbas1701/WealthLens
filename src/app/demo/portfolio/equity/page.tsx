/**
 * Demo Equity Holdings Page
 * 
 * Read-only view of equity holdings in demo mode.
 * All actions are disabled with inline explanations.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, LockIcon } from '@/components/icons';
import DemoBanner from '@/components/DemoBanner';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { DEMO_PORTFOLIO } from '@/data/demo-portfolio';

type SortField = 'name' | 'quantity' | 'avgPrice' | 'currentPrice' | 'investedValue' | 'currentValue' | 'gainLoss' | 'allocation';
type SortDirection = 'asc' | 'desc';

export default function DemoEquityHoldingsPage() {
  const { formatCurrency } = useCurrency();
  
  // Filter equity holdings from demo portfolio
  const equityHoldings = useMemo(() => {
    return DEMO_PORTFOLIO.holdings
      .filter(h => h.assetType === 'Equity')
      .map(h => {
        const currentValue = h.currentValue || h.investedValue;
        const currentPrice = h.quantity > 0 ? currentValue / h.quantity : 0;
        const gainLoss = currentValue - h.investedValue;
        const gainLossPercent = h.investedValue > 0 
          ? (gainLoss / h.investedValue) * 100 
          : 0;
        
        return {
          id: h.id,
          name: h.name,
          symbol: h.symbol,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          currentPrice,
          investedValue: h.investedValue,
          currentValue,
          gainLoss,
          gainLossPercent,
          allocationPct: h.allocationPct,
        };
      });
  }, []);

  const totalValue = equityHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = equityHoldings.reduce((sum, h) => sum + h.investedValue, 0);
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Stocks Holdings</h1>
          <p className="text-sm text-[#6B7280]">Direct equity holdings in your portfolio</p>
        </div>

        {/* Summary Cards */}
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

        {/* Disabled Actions Notice */}
        <div className="mb-6 bg-[#F6F8FB] border border-[#E5E7EB] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <LockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
            <p className="text-sm text-[#475569]">
              <strong className="text-[#0F172A]">Edit, delete, and add actions are disabled in demo mode.</strong>
              {' '}Available after sign-up.
            </p>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F8FB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Stock Name
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Invested Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Gain/Loss
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Allocation %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {equityHoldings.map((holding) => (
                  <tr key={holding.id} className="hover:bg-[#F6F8FB] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{holding.name}</p>
                        {holding.symbol && (
                          <p className="text-xs text-[#6B7280]">{holding.symbol}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      {holding.quantity.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      ₹{holding.averagePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      ₹{holding.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      {formatCurrency(holding.investedValue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      {formatCurrency(holding.currentValue)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <p className={`text-sm font-medium number-emphasis ${
                          holding.gainLoss >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}>
                          {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                        </p>
                        <p className={`text-xs ${
                          holding.gainLossPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}>
                          {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      {holding.allocationPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F6F8FB] border-t-2 border-[#E5E7EB]">
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-[#0F172A]">
                    Total
                  </td>
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









