/**
 * Add Liability Modal (UI-only)
 *
 * Multi-step onboarding for liabilities.
 * Step 1: Select liability type
 * Step 2: Core details (lender, outstanding, interest optional)
 * Step 3: EMI & payment details (EMI optional)
 * Step 4: Optional classification (secured, tax benefit, prepayment)
 * Step 5: Review & save
 *
 * Uses useState + handleSubmit(e). No Zod/RHF.
 * Integration point: onSuccess() when backend is ready.
 */

'use client';

import { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon, InfoIcon } from './icons';
import type { Liability, LiabilityType } from '@/lib/liabilities-store';
import { addLiability, updateLiability } from '@/lib/liabilities-store';

interface AddLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingLiability?: Liability | null;
}

const LIABILITY_TYPES: { value: LiabilityType; label: string }[] = [
  { value: 'HOME_LOAN', label: 'Home Loan' },
  { value: 'VEHICLE_LOAN', label: 'Vehicle Loan' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'PERSONAL_LOAN', label: 'Personal Loan' },
  { value: 'EDUCATION_LOAN', label: 'Education Loan' },
  { value: 'OTHER', label: 'Other' },
];

type Step = 'type' | 'core' | 'emi' | 'classification' | 'review' | 'saving' | 'success' | 'error';

export default function AddLiabilityModal({
  isOpen,
  onClose,
  userId,
  onSuccess,
  existingLiability = null,
}: AddLiabilityModalProps) {
  const isEditing = !!existingLiability;

  const [step, setStep] = useState<Step>('type');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [type, setType] = useState<LiabilityType>(existingLiability?.type ?? 'HOME_LOAN');

  // Step 2
  const [lender, setLender] = useState(existingLiability?.lender ?? '');
  const [outstanding, setOutstanding] = useState(existingLiability?.outstanding ?? 0);
  const [interestRate, setInterestRate] = useState<number | ''>(
    existingLiability?.interestRate ?? ''
  );

  // Step 3
  const [emi, setEmi] = useState<number | ''>(existingLiability?.emi ?? '');

  // Step 4
  const [secured, setSecured] = useState(existingLiability?.secured ?? false);
  const [taxBenefit, setTaxBenefit] = useState(existingLiability?.taxBenefit ?? false);
  const [prepayment, setPrepayment] = useState(existingLiability?.prepayment ?? false);

  useEffect(() => {
    if (isOpen && existingLiability) {
      setType(existingLiability.type);
      setLender(existingLiability.lender);
      setOutstanding(existingLiability.outstanding);
      setInterestRate(existingLiability.interestRate ?? '');
      setEmi(existingLiability.emi ?? '');
      setSecured(existingLiability.secured ?? false);
      setTaxBenefit(existingLiability.taxBenefit ?? false);
      setPrepayment(existingLiability.prepayment ?? false);
    }
  }, [isOpen, existingLiability]);

  const handleClose = () => {
    setStep('type');
    if (!isEditing) {
      setType('HOME_LOAN');
      setLender('');
      setOutstanding(0);
      setInterestRate('');
      setEmi('');
      setSecured(false);
      setTaxBenefit(false);
      setPrepayment(false);
    }
    setError(null);
    onClose();
  };

  const validateCore = (): boolean => {
    if (!lender.trim() || lender.trim().length < 2) {
      setError('Lender name is required (minimum 2 characters)');
      return false;
    }
    if (outstanding <= 0) {
      setError('Outstanding amount must be greater than 0');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 'type') setStep('core');
    else if (step === 'core') {
      if (validateCore()) setStep('emi');
    } else if (step === 'emi') setStep('classification');
    else if (step === 'classification') setStep('review');
  };

  const handleBack = () => {
    if (step === 'core') setStep('type');
    else if (step === 'emi') setStep('core');
    else if (step === 'classification') setStep('emi');
    else if (step === 'review') setStep('classification');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'review') return;
    if (!validateCore()) return;

    setSaving(true);
    setStep('saving');

    try {
      const payload = {
        type,
        lender: lender.trim(),
        outstanding,
        interestRate: interestRate === '' ? null : Number(interestRate),
        emi: emi === '' ? null : Number(emi),
        secured,
        taxBenefit,
        prepayment,
      };

      if (isEditing && existingLiability) {
        updateLiability(userId, existingLiability.id, payload);
      } else {
        addLiability(userId, payload);
      }

      setStep('success');
      onSuccess();
      setTimeout(handleClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setStep('error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch (step) {
      case 'type': return 'Select Liability Type';
      case 'core': return 'Core Details';
      case 'emi': return 'EMI & Payment';
      case 'classification': return 'Classification';
      case 'review': return 'Review & Save';
      case 'saving': return 'Saving...';
      case 'success': return 'Saved!';
      case 'error': return 'Error';
      default: return '';
    }
  };

  const steps = ['type', 'core', 'emi', 'classification', 'review'];
  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'type' || step === 'error' ? handleClose : undefined}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {isEditing ? 'Edit Liability' : 'Add Liability'}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{getStepTitle()}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-[#F9FAFB] dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${
                  i <= currentStepIdx ? 'bg-[#2563EB] dark:bg-[#3B82F6]' : 'bg-[#E5E7EB] dark:bg-[#334155]'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span>Type</span>
            <span>Details</span>
            <span>EMI</span>
            <span>Class</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Select the type of liability you want to add.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {LIABILITY_TYPES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`px-4 py-3 rounded-lg border text-left font-medium transition-colors ${
                      type === opt.value
                        ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E3A8A] text-[#2563EB] dark:text-[#93C5FD]'
                        : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'core' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1E40AF] dark:text-[#93C5FD]">
                    Core liability details
                  </p>
                  <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD] mt-1">
                    Lender and outstanding amount are required. Interest rate is optional.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Lender / Bank Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Outstanding Amount (₹) <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={outstanding || ''}
                  onChange={(e) => setOutstanding(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Interest Rate (% p.a.) <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 8.5"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>
              {error && (
                <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'emi' && (
            <div className="space-y-6">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                EMI and payment details. No calculations — enter what you pay.
              </p>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Monthly EMI (₹) <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={emi}
                  onChange={(e) => setEmi(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 25000"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {step === 'classification' && (
            <div className="space-y-6">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Optional classification for your records.
              </p>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secured}
                    onChange={(e) => setSecured(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E5E7EB] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">Secured (backed by collateral)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxBenefit}
                    onChange={(e) => setTaxBenefit(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E5E7EB] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">Tax benefit (e.g. home loan 80C/24)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prepayment}
                    onChange={(e) => setPrepayment(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E5E7EB] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">Prepayment allowed</span>
                </label>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Type</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    {LIABILITY_TYPES.find((t) => t.value === type)?.label ?? type}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Lender</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{lender}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Outstanding</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    ₹{outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {interestRate !== '' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Interest Rate</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{interestRate}%</span>
                  </div>
                )}
                {emi !== '' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Monthly EMI</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      ₹{Number(emi).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {(secured || taxBenefit || prepayment) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Classification</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {[secured && 'Secured', taxBenefit && 'Tax benefit', prepayment && 'Prepayment'].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
              <p className="text-[#6B7280] dark:text-[#94A3B8] font-medium">
                {isEditing ? 'Updating' : 'Saving'} liability...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircleIcon className="w-16 h-16 text-[#16A34A] dark:text-[#22C55E]" />
              <div className="text-center">
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">
                  Liability {isEditing ? 'Updated' : 'Added'}
                </p>
                <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">
                  Your liability has been successfully {isEditing ? 'updated' : 'added'}.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertTriangleIcon className="w-16 h-16 text-[#DC2626] dark:text-[#EF4444]" />
              <div className="text-center">
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">Something went wrong</p>
                <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A] flex items-center justify-between gap-4">
          {['type', 'core', 'emi', 'classification'].includes(step) && (
            <>
              <button
                onClick={step === 'type' ? handleClose : handleBack}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium transition-colors flex items-center gap-2"
              >
                {step === 'type' ? 'Cancel' : <><ArrowLeftIcon className="w-4 h-4" /> Back</>}
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-[#16A34A] dark:bg-[#22C55E] text-white rounded-lg hover:bg-[#15803D] dark:hover:bg-[#16A34A] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Update Liability' : 'Save Liability'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
