/**
 * EPF Add/Edit Modal Component
 * 
 * Simplified 2-step form for adding/editing Employee Provident Fund account details.
 * Handles UAN, employer information, and financial data.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon, InfoIcon } from './icons';

interface EPFAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingHolding?: {
    id: string;
    uan: string;
    memberId?: string;
    employerName: string;
    employerCode?: string;
    dateOfJoining?: string;
    dateOfLeaving?: string;
    currentBalance: number;
    employeeContributions: number;
    employerContributions: number;
    interestEarned: number;
    interestRate: number;
    lastUpdated: string;
  } | null;
}

type Step = 'basic' | 'financial' | 'saving' | 'success' | 'error';

export default function EPFAddModal({ isOpen, onClose, userId, onSuccess, existingHolding }: EPFAddModalProps) {
  const isEditing = !!existingHolding;
  
  const [step, setStep] = useState<Step>('basic');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Basic Information
  const [uan, setUAN] = useState(existingHolding?.uan || '');
  const [memberId, setMemberId] = useState(existingHolding?.memberId || '');
  const [employerName, setEmployerName] = useState(existingHolding?.employerName || '');
  const [employerCode, setEmployerCode] = useState(existingHolding?.employerCode || '');
  const [dateOfJoining, setDateOfJoining] = useState(existingHolding?.dateOfJoining || '');
  const [dateOfLeaving, setDateOfLeaving] = useState(existingHolding?.dateOfLeaving || '');

  // Financial Information
  const [currentBalance, setCurrentBalance] = useState(existingHolding?.currentBalance || 0);
  const [employeeContributions, setEmployeeContributions] = useState(existingHolding?.employeeContributions || 0);
  const [employerContributions, setEmployerContributions] = useState(existingHolding?.employerContributions || 0);
  const [interestEarned, setInterestEarned] = useState(existingHolding?.interestEarned || 0);
  const [interestRate, setInterestRate] = useState(existingHolding?.interestRate || 8.25); // Current EPF rate
  const [lastUpdated, setLastUpdated] = useState(existingHolding?.lastUpdated || new Date().toISOString().split('T')[0]);

  // Pre-fill form when editing an existing holding
  useEffect(() => {
    if (existingHolding && isOpen) {
      setUAN(existingHolding.uan || '');
      setMemberId(existingHolding.memberId || '');
      setEmployerName(existingHolding.employerName || '');
      setEmployerCode(existingHolding.employerCode || '');
      setDateOfJoining(existingHolding.dateOfJoining || '');
      setDateOfLeaving(existingHolding.dateOfLeaving || '');
      setCurrentBalance(existingHolding.currentBalance || 0);
      setEmployeeContributions(existingHolding.employeeContributions || 0);
      setEmployerContributions(existingHolding.employerContributions || 0);
      setInterestEarned(existingHolding.interestEarned || 0);
      setInterestRate(existingHolding.interestRate || 8.25);
      setLastUpdated(existingHolding.lastUpdated ? existingHolding.lastUpdated.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [existingHolding, isOpen]);

  // Auto-calculate interest earned and total contributions
  useEffect(() => {
    const totalContributions = employeeContributions + employerContributions;
    if (currentBalance > 0 && totalContributions > 0) {
      const calculated = currentBalance - totalContributions;
      if (calculated >= 0) {
        setInterestEarned(calculated);
      }
    } else {
      setInterestEarned(0);
    }
  }, [currentBalance, employeeContributions, employerContributions]);

  // Reset form when modal closes
  const handleClose = () => {
    setStep('basic');
    if (!isEditing) {
      setUAN('');
      setMemberId('');
      setEmployerName('');
      setEmployerCode('');
      setDateOfJoining('');
      setDateOfLeaving('');
      setCurrentBalance(0);
      setEmployeeContributions(0);
      setEmployerContributions(0);
      setInterestEarned(0);
      setInterestRate(8.25);
      setLastUpdated(new Date().toISOString().split('T')[0]);
    }
    setError(null);
    onClose();
  };

  const validateBasic = () => {
    // Validate UAN (12 digits)
    if (!uan || !/^\d{12}$/.test(uan)) {
      setError('Please enter a valid 12-digit UAN');
      return false;
    }
    if (!employerName || employerName.trim().length < 2) {
      setError('Please enter employer name');
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
    if (employeeContributions < 0) {
      setError('Employee contributions cannot be negative');
      return false;
    }
    if (employerContributions < 0) {
      setError('Employer contributions cannot be negative');
      return false;
    }
    const totalContributions = employeeContributions + employerContributions;
    if (currentBalance < totalContributions) {
      setError('Current balance cannot be less than total contributions');
      return false;
    }
    if (interestRate < 0 || interestRate > 15) {
      setError('Please enter a valid interest rate (0-15%)');
      return false;
    }
    if (!lastUpdated) {
      setError('Please select last updated date');
      return false;
    }
    
    // Validate date of leaving if provided
    if (dateOfLeaving && dateOfJoining) {
      const joining = new Date(dateOfJoining);
      const leaving = new Date(dateOfLeaving);
      if (leaving <= joining) {
        setError('Date of leaving must be after date of joining');
        return false;
      }
    }
    
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateBasic()) {
      setStep('financial');
    }
  };

  const handleSave = async () => {
    if (!validateBasic() || !validateFinancial()) return;

    setSaving(true);
    setStep('saving');

    try {
      const totalContributions = employeeContributions + employerContributions;
      const payload = {
        user_id: userId,
        holdingId: existingHolding?.id,
        uan,
        memberId: memberId || undefined,
        employerName,
        employerCode: employerCode || undefined,
        dateOfJoining: dateOfJoining || undefined,
        dateOfLeaving: dateOfLeaving || undefined,
        currentBalance,
        employeeContributions,
        employerContributions,
        interestEarned,
        interestRate,
        lastUpdated: lastUpdated + 'T00:00:00.000Z', // Convert to ISO format
      };

      console.log('[EPF Modal] Saving payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/epf/holdings', {
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
        setError(result.error || 'Failed to save EPF account');
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

  const totalContributions = employeeContributions + employerContributions;

  const renderStepContent = () => {
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1E40AF] dark:text-[#93C5FD]">
                  EPF Account Information
                </p>
                <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD] mt-1">
                  UAN (Universal Account Number) is a 12-digit unique ID for all EPF members. You can have multiple Member IDs under one UAN (different employers).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                UAN (Universal Account Number) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={uan}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Only digits
                  if (value.length <= 12) {
                    setUAN(value);
                  }
                }}
                placeholder="Enter your 12-digit UAN"
                maxLength={12}
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                12-digit unique identifier (e.g., 123456789012)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Member ID <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Enter Member ID (if you have multiple employers)"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Member ID is specific to each employer. Leave blank if you have only one employer.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Employer Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="Enter your employer name"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Employer Establishment Code <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={employerCode}
                onChange={(e) => setEmployerCode(e.target.value)}
                placeholder="Enter employer establishment code"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Date of Joining <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Date of Leaving <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={dateOfLeaving}
                  onChange={(e) => setDateOfLeaving(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
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
                Enter your current EPF balance and contribution details. Interest earned will be auto-calculated.
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
                Total amount currently in your EPF account (₹)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Employee Contributions <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={employeeContributions}
                  onChange={(e) => setEmployeeContributions(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Your total contributions (₹)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Employer Contributions <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={employerContributions}
                  onChange={(e) => setEmployerContributions(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Employer's total contributions (₹)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Total Contributions
              </label>
              <div className="px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC]">
                ₹{totalContributions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                Auto-calculated: Employee + Employer Contributions
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Current Interest Rate (% p.a.) <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                  placeholder="8.25"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  EPFO-declared interest rate (currently 8.25% for FY 2024-25)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Last Updated Date <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="date"
                  value={lastUpdated}
                  onChange={(e) => setLastUpdated(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  When was this balance last updated?
                </p>
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

      case 'saving':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
            <p className="text-[#6B7280] dark:text-[#94A3B8] font-medium">
              {isEditing ? 'Updating' : 'Saving'} EPF account...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircleIcon className="w-16 h-16 text-[#16A34A] dark:text-[#22C55E]" />
            <div className="text-center">
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">
                EPF Account {isEditing ? 'Updated' : 'Added'}
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">
                Your EPF account has been successfully {isEditing ? 'updated' : 'added to your portfolio'}.
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
      case 'saving': return 'Saving...';
      case 'success': return 'Success!';
      case 'error': return 'Error';
      default: return '';
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
              {isEditing ? 'Edit EPF Account' : 'Add EPF Account'}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {getStepTitle()}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-[#F9FAFB] dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-1.5 rounded-full ${step !== 'basic' ? 'bg-[#2563EB] dark:bg-[#3B82F6]' : 'bg-[#E5E7EB] dark:bg-[#334155]'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step === 'financial' || step === 'saving' || step === 'success' || step === 'error' ? 'bg-[#2563EB] dark:bg-[#3B82F6]' : 'bg-[#E5E7EB] dark:bg-[#334155]'}`} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span className={step !== 'basic' ? 'text-[#2563EB] dark:text-[#3B82F6] font-medium' : ''}>Basic Info</span>
            <span className={step === 'financial' || step === 'saving' || step === 'success' || step === 'error' ? 'text-[#2563EB] dark:text-[#3B82F6] font-medium' : ''}>Financial</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A] flex items-center justify-between gap-4">
          {step === 'basic' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}
          {step === 'financial' && (
            <>
              <button
                onClick={() => setStep('basic')}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-[#16A34A] dark:bg-[#22C55E] text-white rounded-lg hover:bg-[#15803D] dark:hover:bg-[#16A34A] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Update EPF Account' : 'Save EPF Account'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
