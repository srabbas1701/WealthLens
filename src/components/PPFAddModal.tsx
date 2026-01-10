/**
 * PPF Add/Edit Modal Component
 * 
 * Comprehensive form for adding/editing Public Provident Fund account details.
 * Handles account information, contribution history, and maturity tracking.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon, InfoIcon } from './icons';

interface PPFAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingHolding?: {
    id: string;
    accountNumber: string;
    accountHolderName: string;
    openingDate: string;
    maturityDate: string;
    currentBalance: number;
    totalContributions: number;
    interestEarned: number;
    interestRate: number;
    bankOrPostOffice: string;
    branch: string;
    status: 'active' | 'matured' | 'extended';
    extensionDetails?: {
      extensionStartDate: string;
      extensionEndDate: string;
      extensionNumber: number;
    };
  } | null;
}

type Step = 'basic' | 'financial' | 'review' | 'saving' | 'success' | 'error';

export default function PPFAddModal({ isOpen, onClose, userId, onSuccess, existingHolding }: PPFAddModalProps) {
  const isEditing = !!existingHolding;
  
  const [step, setStep] = useState<Step>('basic');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Basic Information
  const [accountNumber, setAccountNumber] = useState(existingHolding?.accountNumber || '');
  const [accountHolderName, setAccountHolderName] = useState(existingHolding?.accountHolderName || '');
  const [openingDate, setOpeningDate] = useState(existingHolding?.openingDate || '');
  const [maturityDate, setMaturityDate] = useState(existingHolding?.maturityDate || '');
  const [bankOrPostOffice, setBankOrPostOffice] = useState(existingHolding?.bankOrPostOffice || '');
  const [branch, setBranch] = useState(existingHolding?.branch || '');
  const [status, setStatus] = useState<'active' | 'matured' | 'extended'>(existingHolding?.status || 'active');

  // Financial Information
  const [currentBalance, setCurrentBalance] = useState(existingHolding?.currentBalance || 0);
  const [totalContributions, setTotalContributions] = useState(existingHolding?.totalContributions || 0);
  const [interestEarned, setInterestEarned] = useState(existingHolding?.interestEarned || 0);
  const [interestRate, setInterestRate] = useState(existingHolding?.interestRate || 7.1); // Current PPF rate

  // Extension Details (if status is 'extended')
  const [hasExtension, setHasExtension] = useState(!!existingHolding?.extensionDetails);
  const [extensionStartDate, setExtensionStartDate] = useState(existingHolding?.extensionDetails?.extensionStartDate || '');
  const [extensionEndDate, setExtensionEndDate] = useState(existingHolding?.extensionDetails?.extensionEndDate || '');
  const [extensionNumber, setExtensionNumber] = useState(existingHolding?.extensionDetails?.extensionNumber || 1);

  // Pre-fill form when editing an existing holding
  useEffect(() => {
    if (existingHolding && isOpen) {
      setAccountNumber(existingHolding.accountNumber || '');
      setAccountHolderName(existingHolding.accountHolderName || '');
      setOpeningDate(existingHolding.openingDate || '');
      setMaturityDate(existingHolding.maturityDate || '');
      setBankOrPostOffice(existingHolding.bankOrPostOffice || '');
      setBranch(existingHolding.branch || '');
      setStatus(existingHolding.status || 'active');
      setCurrentBalance(existingHolding.currentBalance || 0);
      setTotalContributions(existingHolding.totalContributions || 0);
      setInterestEarned(existingHolding.interestEarned || 0);
      setInterestRate(existingHolding.interestRate || 7.1);
      setHasExtension(!!existingHolding.extensionDetails);
      setExtensionStartDate(existingHolding.extensionDetails?.extensionStartDate || '');
      setExtensionEndDate(existingHolding.extensionDetails?.extensionEndDate || '');
      setExtensionNumber(existingHolding.extensionDetails?.extensionNumber || 1);
    }
  }, [existingHolding, isOpen]);

  // Auto-calculate maturity date when opening date changes
  useEffect(() => {
    if (openingDate && !isEditing) {
      const opening = new Date(openingDate);
      const maturity = new Date(opening);
      maturity.setFullYear(maturity.getFullYear() + 15);
      setMaturityDate(maturity.toISOString().split('T')[0]);
    }
  }, [openingDate, isEditing]);

  // Auto-calculate interest earned
  useEffect(() => {
    if (currentBalance > 0 && totalContributions > 0) {
      const calculated = currentBalance - totalContributions;
      if (calculated >= 0) {
        setInterestEarned(calculated);
      }
    }
  }, [currentBalance, totalContributions]);

  // Reset form when modal closes
  const handleClose = () => {
    setStep('basic');
    if (!isEditing) {
      setAccountNumber('');
      setAccountHolderName('');
      setOpeningDate('');
      setMaturityDate('');
      setBankOrPostOffice('');
      setBranch('');
      setStatus('active');
      setCurrentBalance(0);
      setTotalContributions(0);
      setInterestEarned(0);
      setInterestRate(7.1);
      setHasExtension(false);
      setExtensionStartDate('');
      setExtensionEndDate('');
      setExtensionNumber(1);
    }
    setError(null);
    onClose();
  };

  const validateBasic = () => {
    if (!accountNumber || accountNumber.length < 6) {
      setError('Please enter a valid PPF account number');
      return false;
    }
    if (!accountHolderName || accountHolderName.trim().length < 2) {
      setError('Please enter account holder name');
      return false;
    }
    if (!openingDate) {
      setError('Please select account opening date');
      return false;
    }
    if (!maturityDate) {
      setError('Please select maturity date');
      return false;
    }
    if (!bankOrPostOffice || bankOrPostOffice.trim().length < 2) {
      setError('Please enter bank or post office name');
      return false;
    }
    
    // Validate maturity date is after opening date
    const opening = new Date(openingDate);
    const maturity = new Date(maturityDate);
    if (maturity <= opening) {
      setError('Maturity date must be after opening date');
      return false;
    }
    
    setError(null);
    return true;
  };

  const validateFinancial = () => {
    if (currentBalance < 0) {
      setError('Current balance cannot be negative');
      return false;
    }
    if (totalContributions < 0) {
      setError('Total contributions cannot be negative');
      return false;
    }
    if (currentBalance < totalContributions) {
      setError('Current balance cannot be less than total contributions');
      return false;
    }
    if (interestRate < 0 || interestRate > 20) {
      setError('Please enter a valid interest rate (0-20%)');
      return false;
    }
    
    // Validate extension details if status is extended
    if (status === 'extended') {
      if (!hasExtension) {
        setError('Please provide extension details for extended accounts');
        return false;
      }
      if (!extensionStartDate || !extensionEndDate) {
        setError('Please provide extension start and end dates');
        return false;
      }
      const extStart = new Date(extensionStartDate);
      const extEnd = new Date(extensionEndDate);
      if (extEnd <= extStart) {
        setError('Extension end date must be after start date');
        return false;
      }
    }
    
    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateBasic() || !validateFinancial()) return;

    setSaving(true);
    setStep('saving');

    try {
      const payload = {
        user_id: userId,
        holdingId: existingHolding?.id,
        accountNumber,
        accountHolderName,
        openingDate,
        maturityDate,
        currentBalance,
        totalContributions,
        interestEarned,
        interestRate,
        bankOrPostOffice,
        branch,
        status,
        extensionDetails: status === 'extended' && hasExtension ? {
          extensionStartDate,
          extensionEndDate,
          extensionNumber,
        } : null,
      };

      console.log('[PPF Modal] Saving payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/ppf/holdings', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setStep('success');
        onSuccess();
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to save PPF account');
        setStep('error');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Something went wrong. Please try again.');
      setStep('error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1E40AF] dark:text-[#93C5FD]">
                  PPF Account Information
                </p>
                <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD] mt-1">
                  PPF has a 15-year lock-in period. You can extend it in blocks of 5 years after maturity.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                PPF Account Number <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter your PPF account number"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Your unique PPF account number from your bank or post office
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Account Holder Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Opening Date <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Maturity Date <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Auto-calculated: Opening date + 15 years
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Bank / Post Office <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={bankOrPostOffice}
                onChange={(e) => setBankOrPostOffice(e.target.value)}
                placeholder="e.g., State Bank of India, India Post"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Branch <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g., Mumbai Main Branch"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Account Status
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'active', label: 'Active', desc: 'Currently active' },
                  { value: 'matured', label: 'Matured', desc: 'Completed 15 years' },
                  { value: 'extended', label: 'Extended', desc: 'Extended beyond 15 years' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatus(option.value as any)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      status === option.value
                        ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A] dark:border-[#3B82F6]'
                        : 'border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6]'
                    }`}
                  >
                    <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC] text-sm">{option.label}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
              </div>
            )}
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#F0FDF4] dark:bg-[#14532D] border border-[#16A34A]/20 dark:border-[#22C55E]/20 rounded-lg">
              <p className="text-sm text-[#15803D] dark:text-[#86EFAC]">
                Enter your current PPF balance and contribution details. Interest earned will be auto-calculated.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Current Balance <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Total amount currently in your PPF account (₹)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Total Contributions <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalContributions}
                onChange={(e) => setTotalContributions(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Total amount you have contributed over time (₹)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Interest Earned
              </label>
              <div className="px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC]">
                ₹{interestEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Auto-calculated: Current Balance - Total Contributions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Current Interest Rate (% p.a.) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                placeholder="7.1"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Government-set PPF interest rate (currently 7.1% for FY 2024-25)
              </p>
            </div>

            {status === 'extended' && (
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hasExtension"
                    checked={hasExtension}
                    onChange={(e) => setHasExtension(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] dark:text-[#3B82F6] border-[#E5E7EB] dark:border-[#334155] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                  <label htmlFor="hasExtension" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    Add Extension Details
                  </label>
                </div>

                {hasExtension && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                          Extension Start Date
                        </label>
                        <input
                          type="date"
                          value={extensionStartDate}
                          onChange={(e) => setExtensionStartDate(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                          Extension End Date
                        </label>
                        <input
                          type="date"
                          value={extensionEndDate}
                          onChange={(e) => setExtensionEndDate(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Extension Number
                      </label>
                      <select
                        value={extensionNumber}
                        onChange={(e) => setExtensionNumber(parseInt(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>Extension {num} (5 years)</option>
                        ))}
                      </select>
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                        PPF can be extended in blocks of 5 years after maturity
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
              </div>
            )}
          </div>
        );

      case 'review':
        const returnsPercentage = totalContributions > 0 
          ? ((interestEarned / totalContributions) * 100).toFixed(2)
          : '0.00';

        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#F6F8FB] dark:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] rounded-lg">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Review your PPF account details before saving.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Account Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Account Number</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Account Holder</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{accountHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Bank / Post Office</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{bankOrPostOffice}</span>
                </div>
                {branch && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Branch</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{branch}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Opening Date</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{new Date(openingDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Maturity Date</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{new Date(maturityDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Status</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    status === 'active' ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#14532D] dark:text-[#86EFAC]' :
                    status === 'matured' ? 'bg-[#E0E7FF] text-[#3730A3] dark:bg-[#1E3A8A] dark:text-[#93C5FD]' :
                    'bg-[#FEF3C7] text-[#92400E] dark:bg-[#78350F] dark:text-[#FCD34D]'
                  }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Financial Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Current Balance</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Total Contributions</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    ₹{totalContributions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Interest Earned</span>
                  <span className="font-medium text-[#16A34A] dark:text-[#22C55E]">
                    ₹{interestEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Interest Rate</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{interestRate}% p.a.</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#334155]">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Returns</span>
                  <span className="font-medium text-[#16A34A] dark:text-[#22C55E]">+{returnsPercentage}%</span>
                </div>
              </div>
            </div>

            {status === 'extended' && hasExtension && (
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Extension Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Extension Period</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {new Date(extensionStartDate).toLocaleDateString('en-IN')} - {new Date(extensionEndDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Extension Number</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">Extension {extensionNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
              </div>
            )}
          </div>
        );

      case 'saving':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
            <p className="text-[#6B7280] dark:text-[#94A3B8] font-medium">
              {isEditing ? 'Updating' : 'Saving'} PPF account...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircleIcon className="w-16 h-16 text-[#16A34A] dark:text-[#22C55E]" />
            <div className="text-center">
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">
                PPF Account {isEditing ? 'Updated' : 'Added'}
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">
                Your PPF account has been successfully {isEditing ? 'updated' : 'added to your portfolio'}.
              </p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangleIcon className="w-16 h-16 text-[#DC2626] dark:text-[#EF4444]" />
            <div className="text-center">
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">Something went wrong</p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">{error}</p>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'basic': return 'Account Information';
      case 'financial': return 'Financial Details';
      case 'review': return 'Review & Confirm';
      case 'saving': return 'Saving...';
      case 'success': return 'Success!';
      case 'error': return 'Error';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'basic' || step === 'error' ? handleClose : undefined}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {isEditing ? 'Edit PPF Account' : 'Add PPF Account'}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {getStepTitle()}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#334155]">
          {step === 'basic' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (validateBasic()) setStep('financial');
                }}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
              >
                Next: Financial Details
              </button>
            </>
          )}

          {step === 'financial' && (
            <>
              <button
                onClick={() => setStep('basic')}
                className="flex items-center gap-2 px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => {
                  if (validateFinancial()) setStep('review');
                }}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
              >
                Review & Save
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('financial')}
                className="flex items-center gap-2 px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-50"
              >
                {isEditing ? 'Update PPF Account' : 'Save PPF Account'}
              </button>
            </>
          )}

          {(step === 'success' || step === 'saving') && (
            <button
              onClick={handleClose}
              disabled={step === 'saving'}
              className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors disabled:opacity-50"
            >
              Close
            </button>
          )}

          {step === 'error' && (
            <button
              onClick={() => setStep('review')}
              className="px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
