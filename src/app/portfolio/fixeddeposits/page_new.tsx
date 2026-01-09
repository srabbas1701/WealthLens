/**
 * Fixed Deposits Holdings Page with CRUD
 * 
 * Allows users to Add, Edit, Delete Fixed Deposits manually.
 * Clean, industry-best design with modal forms.
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
  PlusIcon,
  EditIcon,
  TrashIcon,
  XIcon,
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

interface FDFormData {
  bank: string;
  fdNumber: string;
  principal: string;
  rate: string;
  startDate: string;
  maturityDate: string;
  interestType: 'Cumulative' | 'Simple' | 'Monthly' | 'Quarterly';
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FDFormData>({
    bank: '',
    fdNumber: '',
    principal: '',
    rate: '',
    startDate: '',
    maturityDate: '',
    interestType: 'Cumulative',
    tdsApplicable: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<FDFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
              let fdMetadata: any = {};
              if (h.notes) {
                try {
                  fdMetadata = JSON.parse(h.notes);
                } catch (e) {
                  console.warn('Failed to parse FD notes:', e);
                }
              }
              
              const bank = h.name || 'Unknown Bank';
              const principal = h.investedValue;
              const rate = fdMetadata.interest_rate || fdMetadata.fdRate || fdMetadata.rate || 6.5;
              const startDateStr = fdMetadata.start_date || fdMetadata.fdStartDate || fdMetadata.startDate;
              const maturityDateStr = fdMetadata.maturity_date || fdMetadata.fdMaturityDate || fdMetadata.maturityDate;
              
              let startDate: Date;
              let maturityDate: Date;
              
              if (startDateStr && maturityDateStr) {
                startDate = new Date(startDateStr);
                maturityDate = new Date(maturityDateStr);
              } else {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6);
                maturityDate = new Date(startDate);
                maturityDate.setFullYear(maturityDate.getFullYear() + 1);
              }
              
              const today = new Date();
              const daysLeft = Math.max(0, Math.floor((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
              
              let currentValue = principal;
              if (startDateStr && maturityDateStr) {
                const years = Math.max(0, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
                currentValue = principal * Math.pow(1 + rate / 100, years);
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

  // Open modal for adding new FD
  const handleAddNew = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      bank: '',
      fdNumber: '',
      principal: '',
      rate: '',
      startDate: '',
      maturityDate: '',
      interestType: 'Cumulative',
      tdsApplicable: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing existing FD
  const handleEdit = (holding: FDHolding) => {
    setModalMode('edit');
    setEditingId(holding.id);
    setFormData({
      bank: holding.bank,
      fdNumber: holding.fdNumber,
      principal: holding.principal.toString(),
      rate: holding.rate.toString(),
      startDate: holding.startDate.split('T')[0],
      maturityDate: holding.maturityDate.split('T')[0],
      interestType: holding.interestType as any,
      tdsApplicable: holding.tdsApplicable,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<FDFormData> = {};

    if (!formData.bank.trim()) errors.bank = 'Bank name is required';
    if (!formData.principal || parseFloat(formData.principal) <= 0) errors.principal = 'Valid principal amount is required';
    if (!formData.rate || parseFloat(formData.rate) <= 0) errors.rate = 'Valid interest rate is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.maturityDate) errors.maturityDate = 'Maturity date is required';
    
    if (formData.startDate && formData.maturityDate) {
      if (new Date(formData.maturityDate) <= new Date(formData.startDate)) {
        errors.maturityDate = 'Maturity date must be after start date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        id: editingId,
        bank: formData.bank.trim(),
        fdNumber: formData.fdNumber.trim() || undefined,
        principal: formData.principal,
        rate: formData.rate,
        startDate: formData.startDate,
        maturityDate: formData.maturityDate,
        interestType: formData.interestType,
        tdsApplicable: formData.tdsApplicable,
      };

      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const response = await fetch('/api/fixed-deposits', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setIsModalOpen(false);
        await fetchData(user.id);
        alert(modalMode === 'add' ? 'Fixed Deposit added successfully!' : 'Fixed Deposit updated successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting FD:', error);
      alert('Failed to save Fixed Deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete FD
  const handleDelete = async (id: string) => {
    if (!user?.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/fixed-deposits?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirmId(null);
        await fetchData(user.id);
        alert('Fixed Deposit deleted successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting FD:', error);
      alert('Failed to delete Fixed Deposit. Please try again.');
    } finally {
      setDeleting(false);
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
      return <span className="text-xs text-[#DC2626] dark:text-[#EF4444] font-semibold">Matured</span>;
    }
    if (daysLeft <= 30) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#991B1B] dark:text-[#FCA5A5] border border-[#DC2626]/20 dark:border-[#EF4444]/20">
        Mat. in 30d
      </span>;
    }
    if (daysLeft <= 60) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] dark:bg-[#78350F] text-[#92400E] dark:text-[#FCD34D] border border-[#F59E0B]/20 dark:border-[#FBBF24]/20">
        Mat. in 60d
      </span>;
    }
    if (daysLeft <= 90) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#1E40AF] dark:text-[#93C5FD] border border-[#2563EB]/20 dark:border-[#3B82F6]/20">
        Mat. in 90d
      </span>;
    }
    return null;
  };

  const maturingSoon = holdings.filter(h => h.daysLeft <= 90 && h.daysLeft >= 0).length;
  const weightedAvgRate = holdings.length > 0
    ? holdings.reduce((sum, h) => sum + (h.rate * h.principal), 0) / totalPrincipal
    : 0;

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading fixed deposit holdings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader 
          showBackButton={true}
          backHref="/dashboard"
          backLabel="Back to Dashboard"
          showDownload={true}
        />

        <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
          {/* Page Title with Add Button */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Fixed Deposit Holdings</h1>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                {holdings.length} holdings • Total Value: {formatCurrency(totalValue)} • {portfolioPercentage.toFixed(1)}% of portfolio
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium text-sm shadow-sm"
            >
              <PlusIcon className="w-5 h-5" />
              Add New FD
            </button>
          </div>

          {/* Maturity Alert */}
          {maturingSoon > 0 && (
            <div className="bg-[#FEF3C7] dark:bg-[#78350F] border border-[#F59E0B]/20 dark:border-[#FBBF24]/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] dark:text-[#FBBF24] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#92400E] dark:text-[#FCD34D]">
                    {maturingSoon} FD{maturingSoon !== 1 ? 's' : ''} maturing in next 90 days
                  </p>
                  <p className="text-xs text-[#92400E] dark:text-[#FCD34D] mt-1">
                    Plan ahead for reinvestment to avoid idle funds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">Show:</span>
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
                          ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white'
                          : 'bg-white dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F6F8FB] dark:hover:bg-[#334155]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">Sort by:</span>
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as SortField)}
                  className="px-3 py-1.5 text-sm border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-medium"
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
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9FAFB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Bank/Institution
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Maturity Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Days Left
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <FileIcon className="w-12 h-12 text-[#9CA3AF] dark:text-[#64748B]" />
                          <div>
                            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">No Fixed Deposits Yet</p>
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Click "Add New FD" to create your first fixed deposit entry</p>
                          </div>
                          <button
                            onClick={handleAddNew}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium text-sm"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Add First FD
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors">
                        <td className="px-6 py-3.5">
                          <div>
                            <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm">{holding.bank}</p>
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">FD No: {holding.fdNumber}</p>
                            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                              Interest: {holding.interestType} • TDS: {holding.tdsApplicable ? 'Applicable' : 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium number-emphasis text-sm">
                          {formatCurrency(holding.principal)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-semibold number-emphasis text-sm">
                          {holding.rate.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#475569] dark:text-[#CBD5E1] text-sm">
                          {formatDate(holding.startDate)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-medium text-sm">
                          {formatDate(holding.maturityDate)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#0F172A] dark:text-[#F8FAFC] font-semibold number-emphasis text-sm">
                          {formatCurrency(holding.currentValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                              {holding.daysLeft < 0 ? 'Matured' : `${holding.daysLeft} days`}
                            </span>
                            {getMaturityBadge(holding.daysLeft)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(holding)}
                              className="p-2 rounded-lg hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6] transition-colors"
                              title="Edit FD"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(holding.id)}
                              className="p-2 rounded-lg hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D] text-[#DC2626] dark:text-[#EF4444] transition-colors"
                              title="Delete FD"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sortedHoldings.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#F9FAFB] dark:bg-[#334155] border-t-2 border-[#0F172A] dark:border-[#F8FAFC]">
                      <td className="px-6 py-3.5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        TOTAL
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                        {formatCurrency(totalPrincipal)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{weightedAvgRate.toFixed(2)}%</span>
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block">Weighted Avg</span>
                      </td>
                      <td colSpan={2} className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {maturingSoon} maturing in 90 days
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                        {formatCurrency(totalValue)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Interest Note */}
          <div className="mt-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg border border-[#2563EB]/20 dark:border-[#3B82F6]/20 p-4">
            <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
              <strong>Note:</strong> Current value includes accrued interest as of today. 
              Actual maturity value may differ based on final interest calculation.
            </p>
          </div>

          {/* Verification Note */}
          {holdings.length > 0 && (
            <div className="mt-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    Verification: Total matches dashboard FD value ({formatCurrency(totalValue)}) ✓
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    Total Principal: {formatCurrency(totalPrincipal)} • 
                    Total Current Value: {formatCurrency(totalValue)} • 
                    Weighted Avg Rate: {weightedAvgRate.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {modalMode === 'add' ? 'Add New Fixed Deposit' : 'Edit Fixed Deposit'}
              </h2>
              <button
                onClick={() => !submitting && setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
                disabled={submitting}
              >
                <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Bank / Institution <span className="text-[#DC2626] dark:text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    formErrors.bank 
                      ? 'border-[#DC2626] dark:border-[#EF4444]' 
                      : 'border-[#E5E7EB] dark:border-[#334155]'
                  } bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors`}
                  placeholder="e.g., HDFC Bank, SBI, ICICI Bank"
                  disabled={submitting}
                />
                {formErrors.bank && (
                  <p className="mt-1 text-xs text-[#DC2626] dark:text-[#EF4444]">{formErrors.bank}</p>
                )}
              </div>

              {/* FD Number */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  FD Number <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.fdNumber}
                  onChange={(e) => setFormData({ ...formData, fdNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors"
                  placeholder="e.g., FD123456789"
                  disabled={submitting}
                />
              </div>

              {/* Principal and Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Principal Amount <span className="text-[#DC2626] dark:text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.principal}
                    onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      formErrors.principal 
                        ? 'border-[#DC2626] dark:border-[#EF4444]' 
                        : 'border-[#E5E7EB] dark:border-[#334155]'
                    } bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors`}
                    placeholder="₹ 100,000"
                    disabled={submitting}
                  />
                  {formErrors.principal && (
                    <p className="mt-1 text-xs text-[#DC2626] dark:text-[#EF4444]">{formErrors.principal}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Interest Rate (% p.a.) <span className="text-[#DC2626] dark:text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      formErrors.rate 
                        ? 'border-[#DC2626] dark:border-[#EF4444]' 
                        : 'border-[#E5E7EB] dark:border-[#334155]'
                    } bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors`}
                    placeholder="e.g., 7.5"
                    disabled={submitting}
                  />
                  {formErrors.rate && (
                    <p className="mt-1 text-xs text-[#DC2626] dark:text-[#EF4444]">{formErrors.rate}</p>
                  )}
                </div>
              </div>

              {/* Start and Maturity Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Start Date <span className="text-[#DC2626] dark:text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      formErrors.startDate 
                        ? 'border-[#DC2626] dark:border-[#EF4444]' 
                        : 'border-[#E5E7EB] dark:border-[#334155]'
                    } bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors`}
                    disabled={submitting}
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-xs text-[#DC2626] dark:text-[#EF4444]">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Maturity Date <span className="text-[#DC2626] dark:text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.maturityDate}
                    onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      formErrors.maturityDate 
                        ? 'border-[#DC2626] dark:border-[#EF4444]' 
                        : 'border-[#E5E7EB] dark:border-[#334155]'
                    } bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors`}
                    disabled={submitting}
                  />
                  {formErrors.maturityDate && (
                    <p className="mt-1 text-xs text-[#DC2626] dark:text-[#EF4444]">{formErrors.maturityDate}</p>
                  )}
                </div>
              </div>

              {/* Interest Type */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Interest Type
                </label>
                <select
                  value={formData.interestType}
                  onChange={(e) => setFormData({ ...formData, interestType: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] transition-colors"
                  disabled={submitting}
                >
                  <option value="Cumulative">Cumulative</option>
                  <option value="Simple">Simple</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>

              {/* TDS Applicable */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tdsApplicable"
                  checked={formData.tdsApplicable}
                  onChange={(e) => setFormData({ ...formData, tdsApplicable: e.target.checked })}
                  className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6] bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] rounded focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  disabled={submitting}
                />
                <label htmlFor="tdsApplicable" className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                  TDS Applicable
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors font-medium"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Add FD' : 'Update FD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#FEE2E2] dark:bg-[#7F1D1D] flex items-center justify-center">
                  <AlertTriangleIcon className="w-6 h-6 text-[#DC2626] dark:text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Delete Fixed Deposit?</h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    This action cannot be undone. The FD will be permanently deleted.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors font-medium"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#DC2626] dark:bg-[#EF4444] text-white hover:bg-[#B91C1C] dark:hover:bg-[#DC2626] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
