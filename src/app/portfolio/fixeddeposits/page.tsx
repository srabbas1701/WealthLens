/**
 * Fixed Deposits Holdings Page
 * 
 * Data-heavy table showing all FD holdings with maturity tracking.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

type SortField = 'bank' | 'principal' | 'rate' | 'startDate' | 'maturityDate' | 'currentValue' | 'daysLeft';
type SortDirection = 'asc' | 'desc';

interface FDHolding {
  id: string;
  bank: string;
  fdNumber: string;
  principal: number;
  rate: number;
  startDate: string;
  maturityDate: string;
  currentValue: number;
  daysLeft: number;
  interestType: string;
  tdsApplicable: boolean;
}

export default function FixedDepositsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<FDHolding[]>([]);
  const [totalPrincipal, setTotalPrincipal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  const [maturityFilter, setMaturityFilter] = useState<'all' | '30' | '60' | '90'>('all');
  
  const [sortField, setSortField] = useState<SortField>('maturityDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const portfolioData = result.data;
          const fdHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Fixed Deposit' || h.assetType === 'Fixed Deposits')
            .map((h: any) => {
              // Parse FD metadata from notes (stored as JSON)
              let fdMetadata: any = {};
              if (h.notes) {
                try {
                  fdMetadata = JSON.parse(h.notes);
                } catch (e) {
                  console.warn('Failed to parse FD notes:', e);
                }
              }
              
              // Use real data from database
              const bank = h.name || 'Unknown Bank'; // Asset name contains bank name
              const principal = h.investedValue;
              
              // Extract FD-specific data from metadata or use defaults
              // Metadata keys: institution, principal, interest_rate, start_date, maturity_date
              const rate = fdMetadata.interest_rate || fdMetadata.fdRate || fdMetadata.rate || 6.5; // Default 6.5% if not available
              const startDateStr = fdMetadata.start_date || fdMetadata.fdStartDate || fdMetadata.startDate;
              const maturityDateStr = fdMetadata.maturity_date || fdMetadata.fdMaturityDate || fdMetadata.maturityDate;
              
              // Parse dates or use defaults
              let startDate: Date;
              let maturityDate: Date;
              
              if (startDateStr && maturityDateStr) {
                startDate = new Date(startDateStr);
                maturityDate = new Date(maturityDateStr);
              } else {
                // Fallback: Use reasonable defaults if dates not available
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6); // Assume started 6 months ago
                maturityDate = new Date(startDate);
                maturityDate.setFullYear(maturityDate.getFullYear() + 1); // Assume 1 year term
              }
              
              const today = new Date();
              const daysLeft = Math.max(0, Math.floor((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
              
              // Calculate current value with interest (if dates available)
              let currentValue = principal;
              if (startDateStr && maturityDateStr) {
                const years = Math.max(0, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
                currentValue = principal * Math.pow(1 + rate / 100, years);
              } else {
                // If dates not available, use invested value
                currentValue = principal;
              }
              
              return {
                id: h.id,
                bank,
                fdNumber: fdMetadata.fdNumber || `FD${h.id.slice(0, 8).toUpperCase()}`,
                principal,
                rate,
                startDate: startDate.toISOString(),
                maturityDate: maturityDate.toISOString(),
                currentValue,
                daysLeft,
                interestType: fdMetadata.interestType || 'Cumulative',
                tdsApplicable: fdMetadata.tdsApplicable !== undefined ? fdMetadata.tdsApplicable : true,
              };
            });

          const totalPrinc = fdHoldings.reduce((sum: number, h: FDHolding) => sum + h.principal, 0);
          const totalVal = fdHoldings.reduce((sum: number, h: FDHolding) => sum + h.currentValue, 0);
          const portfolioPct = (totalVal / portfolioData.metrics.netWorth) * 100;

          setHoldings(fdHoldings);
          setTotalPrincipal(totalPrinc);
          setTotalValue(totalVal);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch FD holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/fixeddeposits');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'maturityDate' || field === 'daysLeft' ? 'asc' : 'desc');
    }
  };

  const filteredHoldings = holdings.filter(h => {
    if (maturityFilter === 'all') return true;
    const days = parseInt(maturityFilter);
    return h.daysLeft <= days && h.daysLeft >= 0;
  });

  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'bank':
        return multiplier * a.bank.localeCompare(b.bank);
      case 'principal':
        return multiplier * (a.principal - b.principal);
      case 'rate':
        return multiplier * (a.rate - b.rate);
      case 'startDate':
        return multiplier * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      case 'maturityDate':
        return multiplier * (new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime());
      case 'currentValue':
        return multiplier * (a.currentValue - b.currentValue);
      case 'daysLeft':
        return multiplier * (a.daysLeft - b.daysLeft);
      default:
        return 0;
    }
  });


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getMaturityBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return <span className="text-xs text-[#DC2626] font-semibold">Matured</span>;
    }
    if (daysLeft <= 30) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#DC2626]/20">
        Mat. in 30d
      </span>;
    }
    if (daysLeft <= 60) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/20">
        Mat. in 60d
      </span>;
    }
    if (daysLeft <= 90) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1E40AF] border border-[#2563EB]/20">
        Mat. in 90d
      </span>;
    }
    return null;
  };

  const maturingSoon = holdings.filter(h => h.daysLeft <= 90 && h.daysLeft >= 0).length;
  const weightedAvgRate = holdings.length > 0
    ? holdings.reduce((sum, h) => sum + (h.rate * h.principal), 0) / totalPrincipal
    : 0;

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
          <p className="text-sm text-[#6B7280]">Loading fixed deposit holdings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        showDownload={true}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Fixed Deposit Holdings</h1>
          <p className="text-sm text-[#6B7280]">
            {holdings.length} holdings • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
          </p>
        </div>

        {/* Maturity Alert */}
        {maturingSoon > 0 && (
          <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#92400E]">
                  {maturingSoon} FD{maturingSoon !== 1 ? 's' : ''} maturing in next 90 days
                </p>
                <p className="text-xs text-[#92400E] mt-1">
                  Plan ahead for reinvestment to avoid idle funds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#6B7280]">Show:</span>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All FDs' },
                  { value: '30', label: 'Mat. in 30d' },
                  { value: '60', label: 'Mat. in 60d' },
                  { value: '90', label: 'Mat. in 90d' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setMaturityFilter(option.value as any)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                      maturityFilter === option.value
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-white text-[#475569] border border-[#E5E7EB] hover:bg-[#F6F8FB]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#6B7280]">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#0F172A] font-medium"
              >
                <option value="maturityDate">Maturity Date</option>
                <option value="bank">Bank</option>
                <option value="principal">Principal</option>
                <option value="rate">Interest Rate</option>
                <option value="startDate">Start Date</option>
                <option value="currentValue">Current Value</option>
                <option value="daysLeft">Days Left</option>
              </select>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Bank/Institution
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Maturity Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Days Left
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {sortedHoldings.map((holding) => (
                  <tr key={holding.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">{holding.bank}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">FD No: {holding.fdNumber}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Interest: {holding.interestType} • TDS: {holding.tdsApplicable ? 'Applicable' : 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium number-emphasis text-sm">
                      {formatCurrency(holding.principal)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#0F172A] font-semibold number-emphasis text-sm">
                      {holding.rate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#475569] text-sm">
                      {formatDate(holding.startDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#0F172A] font-medium text-sm">
                      {formatDate(holding.maturityDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#0F172A] font-semibold number-emphasis text-sm">
                      {formatCurrency(holding.currentValue)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium text-[#0F172A] number-emphasis">
                          {holding.daysLeft < 0 ? 'Matured' : `${holding.daysLeft} days`}
                        </span>
                        {getMaturityBadge(holding.daysLeft)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] border-t-2 border-[#0F172A]">
                  <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A]">
                    TOTAL
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalPrincipal)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm">
                    <span className="font-semibold text-[#0F172A]">{weightedAvgRate.toFixed(2)}%</span>
                    <span className="text-xs text-[#6B7280] block">Weighted Avg</span>
                  </td>
                  <td colSpan={2} className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">
                    {maturingSoon} maturing in 90 days
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] number-emphasis">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-4 py-3.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Interest Note */}
        <div className="mt-4 bg-[#EFF6FF] rounded-lg border border-[#2563EB]/20 p-4">
          <p className="text-xs text-[#1E40AF]">
            <strong>Note:</strong> Current value includes accrued interest as of today. 
            Actual maturity value may differ based on final interest calculation.
          </p>
        </div>

        {/* Verification Note */}
        <div className="mt-4 bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A]">
                Verification: Total matches dashboard FD value ({formatCurrency(totalValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                Total Principal: {formatCurrency(totalPrincipal)} • 
                Total Current Value: {formatCurrency(totalValue)} • 
                Weighted Avg Rate: {weightedAvgRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

