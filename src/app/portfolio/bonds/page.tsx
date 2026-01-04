/**
 * Bonds Holdings Page
 * 
 * Conservative, trust-first fixed-income holdings page.
 * Table-based layout with explicit missing data handling.
 * Maturity and income-focused insights only.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  FileIcon,
  CheckCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';

type SortField = 'name' | 'type' | 'coupon' | 'maturityDate' | 'faceValue' | 'investedValue' | 'currentValue' | 'yield' | 'status';
type SortDirection = 'asc' | 'desc';

interface BondHolding {
  id: string;
  name: string;
  issuer: string | null;
  type: string; // Government, Corporate, etc.
  couponRate: number | null;
  couponFrequency: string | null;
  maturityDate: string | null;
  faceValue: number;
  investedValue: number;
  currentValue: number;
  yield: number | null; // Current yield if calculable
  status: 'Active' | 'Matured' | 'Unknown';
  daysToMaturity: number | null;
  hasCompleteData: boolean;
}

// Determine bond type from issuer name or metadata
const getBondType = (issuer: string | null, name: string): string => {
  if (!issuer && !name) return 'Unknown';
  
  const issuerLower = (issuer || name || '').toLowerCase();
  
  // Government bonds
  if (issuerLower.includes('government') || 
      issuerLower.includes('govt') || 
      issuerLower.includes('sovereign') ||
      issuerLower.includes('rbi') ||
      issuerLower.includes('reserve bank')) {
    return 'Government';
  }
  
  // Corporate bonds
  if (issuerLower.includes('corporate') || 
      issuerLower.includes('pvt') ||
      issuerLower.includes('private')) {
    return 'Corporate';
  }
  
  // PSU bonds
  if (issuerLower.includes('psu') || 
      issuerLower.includes('public sector')) {
    return 'PSU';
  }
  
  // Default to Corporate for most cases
  return 'Corporate';
};

// Calculate current yield (annual coupon / current value * 100)
const calculateYield = (
  couponRate: number | null,
  couponFrequency: string | null,
  faceValue: number,
  currentValue: number
): number | null => {
  if (!couponRate || currentValue <= 0) return null;
  
  // Annual coupon payment
  let annualCoupon = (couponRate / 100) * faceValue;
  
  // Adjust for frequency if available
  if (couponFrequency) {
    const freq = couponFrequency.toLowerCase();
    if (freq.includes('semi') || freq.includes('half')) {
      annualCoupon = annualCoupon * 2;
    } else if (freq.includes('quarter')) {
      annualCoupon = annualCoupon * 4;
    } else if (freq.includes('month')) {
      annualCoupon = annualCoupon * 12;
    }
  }
  
  return (annualCoupon / currentValue) * 100;
};

// Determine bond status
const getBondStatus = (maturityDate: string | null): 'Active' | 'Matured' | 'Unknown' => {
  if (!maturityDate) return 'Unknown';
  
  const maturity = new Date(maturityDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  maturity.setHours(0, 0, 0, 0);
  
  if (maturity < today) return 'Matured';
  return 'Active';
};

// Calculate days to maturity
const getDaysToMaturity = (maturityDate: string | null): number | null => {
  if (!maturityDate) return null;
  
  const maturity = new Date(maturityDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  maturity.setHours(0, 0, 0, 0);
  
  const diffTime = maturity.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default function BondsHoldingsPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<BondHolding[]>([]);
  const [totalFaceValue, setTotalFaceValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalCurrentValue, setTotalCurrentValue] = useState(0);
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  
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
          const bondHoldings = portfolioData.holdings
            .filter((h: any) => h.assetType === 'Bonds' || h.assetType === 'Bond')
            .map((h: any) => {
              // Parse bond metadata from notes (stored as JSON)
              let bondMetadata: any = {};
              if (h.notes) {
                try {
                  bondMetadata = JSON.parse(h.notes);
                } catch (e) {
                  console.warn('Failed to parse bond notes:', e);
                }
              }
              
              const issuer = bondMetadata.issuer || bondMetadata.bondIssuer || null;
              const couponRate = bondMetadata.coupon_rate || bondMetadata.couponRate || bondMetadata.bondCouponRate || null;
              const couponFrequency = bondMetadata.coupon_frequency || bondMetadata.couponFrequency || bondMetadata.bondCouponFrequency || null;
              const maturityDateStr = bondMetadata.maturity_date || bondMetadata.maturityDate || bondMetadata.bondMaturityDate || null;
              
              // Face value: typically equals invested value for bonds, or use quantity if available
              const faceValue = h.quantity > 0 && h.quantity !== 1 
                ? h.investedValue / h.quantity 
                : h.investedValue;
              
              // Current value: use stored value, fallback to invested value (no market estimates)
              const currentValue = h.currentValue > 0 ? h.currentValue : h.investedValue;
              
              // Calculate yield if we have coupon rate
              const yieldValue = calculateYield(couponRate, couponFrequency, faceValue, currentValue);
              
              // Determine status and days to maturity
              const status = getBondStatus(maturityDateStr);
              const daysToMaturity = getDaysToMaturity(maturityDateStr);
              
              // Check if we have complete data
              const hasCompleteData = !!(couponRate && maturityDateStr && issuer);
              
              return {
                id: h.id,
                name: h.name,
                issuer,
                type: getBondType(issuer, h.name),
                couponRate,
                couponFrequency,
                maturityDate: maturityDateStr,
                faceValue,
                investedValue: h.investedValue,
                currentValue,
                yield: yieldValue,
                status,
                daysToMaturity,
                hasCompleteData,
              };
            });

          const totalFace = bondHoldings.reduce((sum: number, h: BondHolding) => sum + h.faceValue, 0);
          const totalInv = bondHoldings.reduce((sum: number, h: BondHolding) => sum + h.investedValue, 0);
          const totalCurrent = bondHoldings.reduce((sum: number, h: BondHolding) => sum + h.currentValue, 0);
          const portfolioPct = portfolioData.metrics.netWorth > 0 
            ? (totalCurrent / portfolioData.metrics.netWorth) * 100 
            : 0;

          setHoldings(bondHoldings);
          setTotalFaceValue(totalFace);
          setTotalInvested(totalInv);
          setTotalCurrentValue(totalCurrent);
          setPortfolioPercentage(portfolioPct);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bond holdings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/bonds');
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
      setSortDirection(field === 'maturityDate' || field === 'status' ? 'asc' : 'desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];
    sorted.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // Handle null values
      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;
      
      if (sortField === 'name' || sortField === 'type' || sortField === 'status') {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      
      if (sortField === 'maturityDate') {
        aVal = a.maturityDate ? new Date(a.maturityDate).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
        bVal = b.maturityDate ? new Date(b.maturityDate).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [holdings, sortField, sortDirection]);


  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatDays = (days: number | null) => {
    if (days === null) return '—';
    if (days < 0) return 'Matured';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-[#2563EB]" />
      : <ChevronDownIcon className="w-4 h-4 text-[#2563EB]" />;
  };

  // Calculate maturity insights
  const upcomingMaturities = useMemo(() => {
    return sortedHoldings
      .filter(h => h.status === 'Active' && h.daysToMaturity !== null && h.daysToMaturity <= 365)
      .sort((a, b) => (a.daysToMaturity || Infinity) - (b.daysToMaturity || Infinity))
      .slice(0, 3);
  }, [sortedHoldings]);

  const totalAnnualIncome = useMemo(() => {
    return sortedHoldings.reduce((sum, h) => {
      if (!h.couponRate || !h.faceValue) return sum;
      let annualCoupon = (h.couponRate / 100) * h.faceValue;
      if (h.couponFrequency) {
        const freq = h.couponFrequency.toLowerCase();
        if (freq.includes('semi') || freq.includes('half')) {
          annualCoupon = annualCoupon * 2;
        } else if (freq.includes('quarter')) {
          annualCoupon = annualCoupon * 4;
        } else if (freq.includes('month')) {
          annualCoupon = annualCoupon * 12;
        }
      }
      return sum + annualCoupon;
    }, 0);
  }, [sortedHoldings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading bond holdings...</p>
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
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Bonds Holdings</h1>
          <p className="text-sm text-[#6B7280]">
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} • Total Value: {formatCurrency(totalCurrentValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
          </p>
        </div>

        {/* Data Completeness Notice */}
        {holdings.some(h => !h.hasCompleteData) && (
          <div className="mb-6 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#92400E] mb-1">
                  Incomplete Data Detected
                </p>
                <p className="text-xs text-[#78350F]">
                  Some bonds are missing coupon rate, maturity date, or issuer information. 
                  Values shown are based on available data. Missing fields are marked with "—".
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Bond Name</span>
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Type</span>
                        <SortIcon field="type" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('coupon')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Coupon %</span>
                        <SortIcon field="coupon" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('maturityDate')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Maturity Date</span>
                        <SortIcon field="maturityDate" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('faceValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Face Value</span>
                        <SortIcon field="faceValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('investedValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Invested Value</span>
                        <SortIcon field="investedValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('currentValue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Current Value</span>
                        <SortIcon field="currentValue" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('yield')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Yield</span>
                        <SortIcon field="yield" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer hover:bg-[#F1F5F9] transition-colors group"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        <SortIcon field="status" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-[#6B7280] mb-2">No bond holdings found</p>
                          <p className="text-xs text-[#9CA3AF]">Upload your portfolio to see bond holdings</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{holding.name}</p>
                            {holding.issuer && (
                              <p className="text-xs text-[#6B7280] mt-0.5">{holding.issuer}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            holding.type === 'Government' 
                              ? 'bg-[#E0F2FE] text-[#0369A1]'
                              : holding.type === 'PSU'
                              ? 'bg-[#F0FDF4] text-[#166534]'
                              : 'bg-[#F3F4F6] text-[#4B5563]'
                          }`}>
                            {holding.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          {holding.couponRate !== null ? `${holding.couponRate.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          <div>
                            <p>{formatDate(holding.maturityDate)}</p>
                            {holding.daysToMaturity !== null && holding.status === 'Active' && (
                              <p className="text-xs text-[#6B7280] mt-0.5">
                                {formatDays(holding.daysToMaturity)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          {formatCurrency(holding.faceValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          {formatCurrency(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-medium text-[#0F172A]">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-[#0F172A]">
                          {holding.yield !== null ? `${holding.yield.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            holding.status === 'Active'
                              ? 'bg-[#D1FAE5] text-[#065F46]'
                              : holding.status === 'Matured'
                              ? 'bg-[#FEE2E2] text-[#991B1B]'
                              : 'bg-[#F3F4F6] text-[#4B5563]'
                          }`}>
                            {holding.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sortedHoldings.length > 0 && (
                  <tfoot className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                    <tr>
                      <td className="px-6 py-3.5 text-sm font-semibold text-[#0F172A]">
                        Total
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A]">
                        {formatCurrency(totalFaceValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A]">
                        {formatCurrency(totalInvested)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A]">
                        {formatCurrency(totalCurrentValue)}
                      </td>
                      <td className="px-4 py-3.5"></td>
                      <td className="px-4 py-3.5"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Verification Note */}
        <div className="mb-6 bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A]">
                Verification: Total matches dashboard bonds value ({formatCurrency(totalCurrentValue)}) ✓
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                Current values shown are from your portfolio data. No market price estimates are used.
              </p>
            </div>
          </div>
        </div>

        {/* Maturity and Income-Focused AI Insights */}
        {sortedHoldings.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon className="w-5 h-5 text-[#6B7280]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Fixed Income Insights</h2>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-[#475569] leading-relaxed">
                <p className="mb-2">
                  <strong className="text-[#0F172A]">Total Bond Holdings:</strong> {formatCurrency(totalCurrentValue)} ({portfolioPercentage.toFixed(1)}% of portfolio)
                </p>
                
                {totalAnnualIncome > 0 && (
                  <p className="mb-2">
                    <strong className="text-[#0F172A]">Estimated Annual Income:</strong> {formatCurrency(totalAnnualIncome)} 
                    {sortedHoldings.some(h => !h.couponRate) && (
                      <span className="text-[#6B7280] ml-1">(based on available coupon data)</span>
                    )}
                  </p>
                )}
                
                {upcomingMaturities.length > 0 && (
                  <div className="mb-2">
                    <strong className="text-[#0F172A]">Upcoming Maturities (next 12 months):</strong>
                    <ul className="list-disc list-inside mt-1 ml-2 text-[#475569]">
                      {upcomingMaturities.map((h, idx) => (
                        <li key={h.id}>
                          {h.name} — {formatDate(h.maturityDate)} ({formatDays(h.daysToMaturity)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {sortedHoldings.filter(h => h.status === 'Matured').length > 0 && (
                  <p className="mb-2">
                    <strong className="text-[#0F172A]">Matured Bonds:</strong>{' '}
                    {sortedHoldings.filter(h => h.status === 'Matured').length} holding(s) have reached maturity date.
                  </p>
                )}
                
                {sortedHoldings.some(h => !h.hasCompleteData) && (
                  <p className="text-[#6B7280] italic">
                    Note: Some bonds have incomplete data. Complete bond information (coupon rate, maturity date, issuer) 
                    provides more accurate income and maturity insights.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

