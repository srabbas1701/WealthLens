/**
 * Demo PPF Holdings Page
 * 
 * Read-only view of PPF holdings in demo mode.
 */

'use client';

import { useMemo } from 'react';
import DemoBanner from '@/components/DemoBanner';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { LockIcon, InfoIcon, CalendarIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { DEMO_PORTFOLIO } from '@/data/demo-portfolio';
import { useState } from 'react';

export default function DemoPPFHoldingsPage() {
  const { formatCurrency } = useCurrency();
  const [showContributionHistory, setShowContributionHistory] = useState(false);
  
  const ppfHoldings = useMemo(() => {
    return DEMO_PORTFOLIO.holdings.filter(h => h.assetType === 'PPF');
  }, []);

  const totalBalance = ppfHoldings.reduce((sum, h) => sum + (h.currentValue || h.investedValue), 0);
  const portfolioPercentage = DEMO_PORTFOLIO.metrics.netWorth > 0 
    ? (totalBalance / DEMO_PORTFOLIO.metrics.netWorth) * 100 
    : 0;

  // Demo data with PPF-specific fields
  // PPF account opened in 2015, matures in 2030 (15-year term)
  // Current balance matches invested value (360,000)
  // Annual contribution: ₹1.5 Lakhs (maximum allowed)
  // Interest rate: 7.1% (realistic current PPF rate)
  const demoPPFData = ppfHoldings.map((holding, index) => ({
    ...holding,
    accountNumber: `XXXX${1234 + index}`,
    openingYear: 2015,
    annualContribution: 150000, // ₹1.5 Lakhs per year (max limit)
    interestRate: 7.1, // Current PPF interest rate
    maturityYear: 2030, // 15 years from opening (standard PPF term)
    status: 'active' as const,
  }));

  const summary = {
    earliestOpeningYear: 2015,
    latestMaturityYear: 2030,
    totalAnnualContribution: 150000,
    averageInterestRate: 7.1,
  };

  const maskAccountNumber = (accountNumber: string): string => {
    return 'XXXX' + accountNumber.slice(-4);
  };

  const yearsToMaturity = (maturityYear: number): string => {
    const currentYear = new Date().getFullYear();
    const years = maturityYear - currentYear;
    if (years < 0) return 'Matured';
    if (years === 0) return 'This year';
    return `${years} year${years !== 1 ? 's' : ''}`;
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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">PPF Holdings</h1>
          <p className="text-sm text-[#6B7280]">Public Provident Fund accounts in your portfolio</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Total Balance</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Opening Year</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {summary.earliestOpeningYear}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <p className="text-sm text-[#6B7280] mb-2">Maturity Year</p>
            <p className="text-2xl font-semibold text-[#0F172A] number-emphasis">
              {summary.latestMaturityYear}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Account Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Account Number</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Opening Year</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Current Balance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Annual Contribution</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Interest Rate</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B7280] uppercase">Maturity Year</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {demoPPFData.map((holding) => (
                  <tr key={holding.id} className="hover:bg-[#F6F8FB] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#0F172A]">{holding.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#6B7280] font-mono">
                        {maskAccountNumber(holding.accountNumber)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                      {holding.openingYear}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A] number-emphasis">
                      {formatCurrency(holding.currentValue || holding.investedValue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                      {formatCurrency(holding.annualContribution)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                      {holding.interestRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#0F172A]">
                      <div className="flex flex-col items-end">
                        <span>{holding.maturityYear}</span>
                        <span className="text-xs text-[#6B7280] mt-1">
                          {yearsToMaturity(holding.maturityYear)}
                        </span>
                      </div>
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
                    {formatCurrency(summary.totalAnnualContribution)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A]">
                    {summary.averageInterestRate.toFixed(2)}%
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
                Contribution history details will be available here. This feature tracks your annual PPF contributions over time.
              </p>
              <div className="bg-[#F6F8FB] rounded-lg p-4 border border-[#E5E7EB]">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#475569]">
                    <p className="font-medium text-[#0F172A] mb-1">PPF Contribution Limits</p>
                    <p className="mb-2">
                      Minimum annual contribution: ₹500. Maximum annual contribution: ₹1.5 Lakhs.
                    </p>
                    <p>
                      Contributions are eligible for tax deduction under Section 80C of the Income Tax Act.
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
                <p className="font-medium text-[#0F172A] mb-1">Maturity Awareness</p>
                <p>
                  Your PPF account matures in {summary.latestMaturityYear}. 
                  You have {summary.latestMaturityYear - new Date().getFullYear()} years remaining.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#475569]">
                <p className="font-medium text-[#0F172A] mb-1">Tax Benefits</p>
                <p>
                  PPF contributions qualify for tax deduction under Section 80C up to ₹1.5 Lakhs per financial year. 
                  Interest earned is tax-free, and withdrawals are also tax-exempt.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#475569]">
                <p className="font-medium text-[#0F172A] mb-1">Interest Rate</p>
                <p>
                  Your PPF account earns interest at a rate of {summary.averageInterestRate.toFixed(2)}%. 
                  Interest is compounded annually and credited at the end of each financial year.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

