/**
 * Demo NPS Holdings Page
 * 
 * Read-only view of NPS holdings in demo mode.
 */

'use client';

import { useMemo, useState } from 'react';
import DemoBanner from '@/components/DemoBanner';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { LockIcon, InfoIcon, CalendarIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { DEMO_PORTFOLIO } from '@/data/demo-portfolio';

export default function DemoNPSHoldingsPage() {
  const { formatCurrency } = useCurrency();
  const [showContributionHistory, setShowContributionHistory] = useState(false);
  
  const npsHoldings = useMemo(() => {
    return DEMO_PORTFOLIO.holdings.filter(h => h.assetType === 'NPS');
  }, []);

  const totalBalance = npsHoldings.reduce((sum, h) => sum + (h.currentValue || h.investedValue), 0);
  const portfolioPercentage = DEMO_PORTFOLIO.metrics.netWorth > 0 
    ? (totalBalance / DEMO_PORTFOLIO.metrics.netWorth) * 100 
    : 0;

  // Demo data with NPS-specific fields
  // Tier I: Mandatory retirement account with withdrawal restrictions
  // Tier II: Voluntary account with flexible withdrawals
  // Realistic allocation: 50% equity, 50% debt (balanced for retirement)
  const demoNPSData = npsHoldings.map((holding, index) => ({
    ...holding,
    accountType: index === 0 ? 'Tier I' as const : 'Tier II' as const,
    pran: `XXXXXX${1234 + index}`,
    contributionType: index === 0 ? 'Employee' as const : 'Individual' as const,
    equityAllocation: 50.0,
    debtAllocation: 50.0,
    schemeType: 'Auto' as const,
    status: 'active' as const,
  }));

  const tier1Accounts = demoNPSData.filter(a => a.accountType === 'Tier I');
  const tier2Accounts = demoNPSData.filter(a => a.accountType === 'Tier II');
  
  const tier1Balance = tier1Accounts.reduce((sum, a) => sum + (a.currentValue || a.investedValue), 0);
  const tier2Balance = tier2Accounts.reduce((sum, a) => sum + (a.currentValue || a.investedValue), 0);

  const summary = {
    tier1Balance,
    tier2Balance,
    averageEquityAllocation: 50.0,
    averageDebtAllocation: 50.0,
  };

  const maskPRAN = (pran: string): string => {
    return 'XXXXXX' + pran.slice(-4);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">NPS Holdings</h1>
          <p className="text-sm text-[#6B7280]">National Pension System accounts in your portfolio</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Total Balance</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Tier I Balance</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {formatCurrency(summary.tier1Balance)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Tier II Balance</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {formatCurrency(summary.tier2Balance)}
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

        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F8FB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Account Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">PRAN</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Contribution Type</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Current Balance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Equity Allocation</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Debt Allocation</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Scheme Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {demoNPSData.map((account) => (
                  <tr key={account.id} className="hover:bg-[#F6F8FB] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        account.accountType === 'Tier I'
                          ? 'bg-[#EEF2FF] text-[#4338CA]'
                          : 'bg-[#F0FDF4] text-[#166534]'
                      }`}>
                        {account.accountType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#6B7280] font-mono">
                        {maskPRAN(account.pran)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#0F172A]">
                      {account.contributionType}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      {formatCurrency(account.currentValue || account.investedValue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                      {formatPercentage(account.equityAllocation)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                      {formatPercentage(account.debtAllocation)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#0F172A]">
                      {account.schemeType}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#166534]">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F6F8FB] border-t-2 border-[#E5E7EB]">
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-[#0F172A]">Total</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalBalance)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                    {formatPercentage(summary.averageEquityAllocation)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                    {formatPercentage(summary.averageDebtAllocation)}
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Contribution History */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] mb-6">
          <button
            onClick={() => setShowContributionHistory(!showContributionHistory)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F6F8FB] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-[#6B7280]" />
              <span className="text-sm font-medium text-[#0F172A]">Contribution History</span>
            </div>
            {showContributionHistory ? (
              <ChevronUpIcon className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-[#6B7280]" />
            )}
          </button>
          
          {showContributionHistory && (
            <div className="px-6 py-4 border-t border-[#E5E7EB]">
              <p className="text-sm text-[#6B7280] mb-4">
                Contribution history details will be available here. This feature tracks your NPS contributions over time.
              </p>
              <div className="bg-[#F6F8FB] rounded-lg p-4 border border-[#E5E7EB]">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#475569]">
                    <p className="font-medium text-[#0F172A] mb-1">NPS Contribution Limits</p>
                    <p className="mb-2">
                      Tier I: Minimum ₹500 per year, maximum ₹2 Lakhs per year (including employer contribution).
                    </p>
                    <p>
                      Tier II: No minimum contribution requirement. Contributions are eligible for tax deduction under Section 80C (Tier I) and Section 80CCD(1B) for additional deduction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Light AI Insights */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Insights</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#475569]">
                <p className="font-medium text-[#0F172A] mb-1">Retirement Allocation</p>
                <p>
                  Your NPS accounts have an average equity allocation of {summary.averageEquityAllocation.toFixed(1)}% and debt allocation of {summary.averageDebtAllocation.toFixed(1)}%. 
                  This allocation is designed to balance growth potential with stability for long-term retirement planning.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#475569]">
                <p className="font-medium text-[#0F172A] mb-1">Tier I vs Tier II</p>
                <p>
                  Tier I accounts are mandatory for retirement savings with withdrawal restrictions until age 60. 
                  Tier II accounts offer more flexibility with no withdrawal restrictions, making them suitable for medium-term goals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#475569]">
                <p className="font-medium text-[#0F172A] mb-1">Tax Benefits</p>
                <p>
                  NPS Tier I contributions qualify for tax deduction under Section 80C (up to ₹1.5 Lakhs) and Section 80CCD(1B) 
                  (additional ₹50,000). Tier II contributions are not eligible for tax deductions. 
                  Withdrawals are partially tax-exempt at retirement.
                </p>
              </div>
            </div>

            {summary.tier1Balance > 0 && summary.tier2Balance > 0 && (
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#475569]">
                  <p className="font-medium text-[#0F172A] mb-1">Account Balance</p>
                  <p>
                    Your Tier I balance is {formatCurrency(summary.tier1Balance)} ({((summary.tier1Balance / totalBalance) * 100).toFixed(0)}% of total NPS balance), 
                    while Tier II balance is {formatCurrency(summary.tier2Balance)} ({((summary.tier2Balance / totalBalance) * 100).toFixed(0)}% of total).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}








