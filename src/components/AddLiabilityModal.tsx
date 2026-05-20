/**
 * Add Liability Modal
 *
 * Multi-step onboarding for liabilities with type-specific fields.
 * Step 1: Select liability type
 * Step 2: Core details (lender, outstanding, interest rate)
 * Step 3: Type-specific details (varies by type)
 * Step 4: EMI & payment (skipped for credit cards)
 * Step 5: Classification (secured, tax benefit, prepayment — pre-filled per type)
 * Step 6: Review & save
 *
 * Persists to Supabase via /api/liabilities.
 */

'use client';

import { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon, InfoIcon } from './icons';
import type { Liability, LiabilityType } from '@/lib/liabilities-store';

interface AddLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingLiability?: Liability | null;
}

const LIABILITY_TYPES: { value: LiabilityType; label: string; description: string }[] = [
  { value: 'HOME_LOAN', label: 'Home Loan', description: 'Mortgage, housing loan' },
  { value: 'VEHICLE_LOAN', label: 'Vehicle Loan', description: 'Car, bike, commercial' },
  { value: 'CREDIT_CARD', label: 'Credit Card', description: 'Outstanding balance' },
  { value: 'PERSONAL_LOAN', label: 'Personal Loan', description: 'Unsecured personal loan' },
  { value: 'EDUCATION_LOAN', label: 'Education Loan', description: 'Student / higher education' },
  { value: 'OTHER', label: 'Other', description: 'Any other borrowing' },
];

const VEHICLE_TYPES = ['car', 'bike', 'commercial', 'other'] as const;
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Car / SUV',
  bike: 'Two-Wheeler',
  commercial: 'Commercial Vehicle',
  other: 'Other',
};

const PERSONAL_LOAN_PURPOSES = [
  'Home Renovation',
  'Medical',
  'Wedding',
  'Travel',
  'Electronics / Appliances',
  'Debt Consolidation',
  'Business',
  'Other',
];

type Step = 'type' | 'core' | 'type_details' | 'emi' | 'classification' | 'review' | 'saving' | 'success' | 'error';

// EMI formula: P × r × (1+r)^n / ((1+r)^n - 1)
function calculateEMI(principal: number, ratePA: number, tenureMonths: number): number {
  const r = ratePA / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return Math.round((principal * r * factor) / (factor - 1));
}

// Smart classification defaults per type
function getDefaultClassification(t: LiabilityType) {
  switch (t) {
    case 'HOME_LOAN':     return { secured: true,  taxBenefit: true,  prepayment: true  };
    case 'VEHICLE_LOAN':  return { secured: true,  taxBenefit: false, prepayment: false };
    case 'EDUCATION_LOAN':return { secured: false, taxBenefit: true,  prepayment: false };
    default:              return { secured: false, taxBenefit: false, prepayment: false };
  }
}

function getStepLabel(s: string) {
  switch (s) {
    case 'type':          return 'Type';
    case 'core':          return 'Core';
    case 'type_details':  return 'Details';
    case 'emi':           return 'EMI';
    case 'classification':return 'Class';
    case 'review':        return 'Review';
    default: return '';
  }
}

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all';

const selectClass =
  'w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all';

const labelClass = 'block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2';
const optionalBadge = <span className="text-[#6B7280] dark:text-[#94A3B8] text-xs font-normal ml-1">(Optional)</span>;

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

  // Step 1 — Type
  const [type, setType] = useState<LiabilityType>(existingLiability?.type ?? 'HOME_LOAN');

  // Step 2 — Core
  const [lender, setLender] = useState(existingLiability?.lender ?? '');
  const [outstanding, setOutstanding] = useState(existingLiability?.outstanding ?? 0);
  const [interestRate, setInterestRate] = useState<number | ''>(existingLiability?.interestRate ?? '');

  // Step 3 — Type-specific (shared loan fields)
  const [originalLoanAmount, setOriginalLoanAmount] = useState<number | ''>(existingLiability?.originalLoanAmount ?? '');
  const [loanStartDate, setLoanStartDate] = useState(existingLiability?.loanStartDate ?? '');
  const [tenureMonths, setTenureMonths] = useState<number | ''>(existingLiability?.tenureMonths ?? '');

  // Vehicle-specific
  const [vehicleType, setVehicleType] = useState<string>(existingLiability?.vehicleType ?? '');
  const [vehicleNumber, setVehicleNumber] = useState(existingLiability?.vehicleNumber ?? '');

  // Credit card-specific
  const [creditLimit, setCreditLimit] = useState<number | ''>(existingLiability?.creditLimit ?? '');
  const [billingCycleDate, setBillingCycleDate] = useState<number | ''>(existingLiability?.billingCycleDate ?? '');
  const [minimumDue, setMinimumDue] = useState<number | ''>(existingLiability?.minimumDue ?? '');

  // Personal loan-specific
  const [purpose, setPurpose] = useState(existingLiability?.purpose ?? '');

  // Education loan-specific
  const [institutionName, setInstitutionName] = useState(existingLiability?.institutionName ?? '');
  const [courseName, setCourseName] = useState(existingLiability?.courseName ?? '');
  const [moratoriumMonths, setMoratoriumMonths] = useState<number | ''>(existingLiability?.moratoriumMonths ?? '');

  // Other-specific
  const [description, setDescription] = useState(existingLiability?.description ?? '');

  // Step 4 — EMI
  const [emi, setEmi] = useState<number | ''>(existingLiability?.emi ?? '');

  // Step 5 — Classification
  const [secured, setSecured] = useState(existingLiability?.secured ?? false);
  const [taxBenefit, setTaxBenefit] = useState(existingLiability?.taxBenefit ?? false);
  const [prepayment, setPrepayment] = useState(existingLiability?.prepayment ?? false);

  // Populate all fields when editing
  useEffect(() => {
    if (isOpen && existingLiability) {
      setType(existingLiability.type);
      setLender(existingLiability.lender);
      setOutstanding(existingLiability.outstanding);
      setInterestRate(existingLiability.interestRate ?? '');
      setOriginalLoanAmount(existingLiability.originalLoanAmount ?? '');
      setLoanStartDate(existingLiability.loanStartDate ?? '');
      setTenureMonths(existingLiability.tenureMonths ?? '');
      setVehicleType(existingLiability.vehicleType ?? '');
      setVehicleNumber(existingLiability.vehicleNumber ?? '');
      setCreditLimit(existingLiability.creditLimit ?? '');
      setBillingCycleDate(existingLiability.billingCycleDate ?? '');
      setMinimumDue(existingLiability.minimumDue ?? '');
      setPurpose(existingLiability.purpose ?? '');
      setInstitutionName(existingLiability.institutionName ?? '');
      setCourseName(existingLiability.courseName ?? '');
      setMoratoriumMonths(existingLiability.moratoriumMonths ?? '');
      setDescription(existingLiability.description ?? '');
      setEmi(existingLiability.emi ?? '');
      setSecured(existingLiability.secured ?? false);
      setTaxBenefit(existingLiability.taxBenefit ?? false);
      setPrepayment(existingLiability.prepayment ?? false);
      setStep('core'); // Edit starts at core, not type
    }
  }, [isOpen, existingLiability]);

  // Dynamic step list based on type (credit card has no EMI step)
  const getSteps = (): string[] =>
    type === 'CREDIT_CARD'
      ? ['type', 'core', 'type_details', 'classification', 'review']
      : ['type', 'core', 'type_details', 'emi', 'classification', 'review'];

  const handleTypeChange = (newType: LiabilityType) => {
    setType(newType);
    if (!isEditing) {
      // Apply smart defaults for classification
      const defaults = getDefaultClassification(newType);
      setSecured(defaults.secured);
      setTaxBenefit(defaults.taxBenefit);
      setPrepayment(defaults.prepayment);
    }
  };

  const resetState = () => {
    setType('HOME_LOAN');
    setLender('');
    setOutstanding(0);
    setInterestRate('');
    setOriginalLoanAmount('');
    setLoanStartDate('');
    setTenureMonths('');
    setVehicleType('');
    setVehicleNumber('');
    setCreditLimit('');
    setBillingCycleDate('');
    setMinimumDue('');
    setPurpose('');
    setInstitutionName('');
    setCourseName('');
    setMoratoriumMonths('');
    setDescription('');
    setEmi('');
    setSecured(false);
    setTaxBenefit(false);
    setPrepayment(false);
    setError(null);
  };

  const handleClose = () => {
    setStep('type');
    if (!isEditing) resetState();
    setError(null);
    onClose();
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateCore = (): boolean => {
    if (!lender.trim() || lender.trim().length < 2) {
      setError('Lender name is required (minimum 2 characters)');
      return false;
    }
    if (outstanding <= 0) {
      setError('Outstanding amount must be greater than 0');
      return false;
    }
    if (interestRate !== '' && (Number(interestRate) < 0 || Number(interestRate) > 60)) {
      setError('Interest rate must be between 0% and 60%');
      return false;
    }
    setError(null);
    return true;
  };

  const validateTypeDetails = (): boolean => {
    if (originalLoanAmount !== '' && Number(originalLoanAmount) <= 0) {
      setError('Original loan amount must be greater than 0');
      return false;
    }
    if (tenureMonths !== '' && Number(tenureMonths) <= 0) {
      setError('Tenure must be greater than 0 months');
      return false;
    }
    if (creditLimit !== '' && Number(creditLimit) <= 0) {
      setError('Credit limit must be greater than 0');
      return false;
    }
    if (billingCycleDate !== '' && (Number(billingCycleDate) < 1 || Number(billingCycleDate) > 28)) {
      setError('Billing cycle date must be between 1 and 28');
      return false;
    }
    if (minimumDue !== '' && Number(minimumDue) < 0) {
      setError('Minimum due cannot be negative');
      return false;
    }
    setError(null);
    return true;
  };

  const validateEmi = (): boolean => {
    if (emi !== '' && Number(emi) <= 0) {
      setError('EMI must be greater than 0 if provided');
      return false;
    }
    setError(null);
    return true;
  };

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handleNext = () => {
    const steps = getSteps();
    const currentIdx = steps.indexOf(step);
    if (step === 'core' && !validateCore()) return;
    if (step === 'type_details' && !validateTypeDetails()) return;
    if (step === 'emi' && !validateEmi()) return;
    const nextStep = steps[currentIdx + 1];
    if (nextStep) setStep(nextStep as Step);
  };

  const handleBack = () => {
    const steps = getSteps();
    const currentIdx = steps.indexOf(step);
    const prevStep = steps[currentIdx - 1];
    if (prevStep) setStep(prevStep as Step);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (step !== 'review') return;
    if (!validateCore()) return;

    setSaving(true);
    setStep('saving');

    try {
      const payload: Omit<Liability, 'id' | 'createdAt'> = {
        type,
        lender: lender.trim(),
        outstanding,
        interestRate: interestRate === '' ? null : Number(interestRate),
        emi: emi === '' ? null : Number(emi),
        secured,
        taxBenefit,
        prepayment,
        // Shared loan fields
        originalLoanAmount: originalLoanAmount === '' ? null : Number(originalLoanAmount),
        loanStartDate: loanStartDate || null,
        tenureMonths: tenureMonths === '' ? null : Number(tenureMonths),
        // Vehicle
        vehicleType: (vehicleType as Liability['vehicleType']) || null,
        vehicleNumber: vehicleNumber.trim() || null,
        // Credit card
        creditLimit: creditLimit === '' ? null : Number(creditLimit),
        billingCycleDate: billingCycleDate === '' ? null : Number(billingCycleDate),
        minimumDue: minimumDue === '' ? null : Number(minimumDue),
        // Personal loan
        purpose: purpose || null,
        // Education loan
        institutionName: institutionName.trim() || null,
        courseName: courseName.trim() || null,
        moratoriumMonths: moratoriumMonths === '' ? null : Number(moratoriumMonths),
        // Other
        description: description.trim() || null,
      };

      const response = await fetch('/api/liabilities', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? { user_id: userId, id: existingLiability!.id, ...payload }
            : { user_id: userId, ...payload }
        ),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save liability');
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

  // ── Calculated EMI ───────────────────────────────────────────────────────────

  const canAutoCalcEmi =
    originalLoanAmount !== '' &&
    interestRate !== '' &&
    tenureMonths !== '' &&
    Number(originalLoanAmount) > 0 &&
    Number(interestRate) > 0 &&
    Number(tenureMonths) > 0;

  const autoCalculatedEmi = canAutoCalcEmi
    ? calculateEMI(Number(originalLoanAmount), Number(interestRate), Number(tenureMonths))
    : null;

  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  const steps = getSteps();
  const currentStepIdx = steps.indexOf(step);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'type' || step === 'error' ? handleClose : undefined}
      />

      <div className="relative modal-shell-standard max-w-2xl max-h-[90vh] mx-4 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="modal-header-standard">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {isEditing ? 'Edit Liability' : 'Add Liability'}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {LIABILITY_TYPES.find((t) => t.value === type)?.label ?? type}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Progress */}
        {['type', 'core', 'type_details', 'emi', 'classification', 'review'].includes(step) && (
          <div className="px-6 py-3 bg-[#F9FAFB] dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex gap-1">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    i <= currentStepIdx
                      ? 'bg-[#2563EB] dark:bg-[#3B82F6]'
                      : 'bg-[#E5E7EB] dark:bg-[#334155]'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {steps.map((s) => (
                <span key={s} className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  {getStepLabel(s)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ── Step 1: Type ── */}
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
                    onClick={() => handleTypeChange(opt.value)}
                    className={`px-4 py-3 rounded-lg border text-left transition-colors ${
                      type === opt.value
                        ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E3A8A]'
                        : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#2563EB]/50'
                    }`}
                  >
                    <p className={`font-medium text-sm ${type === opt.value ? 'text-[#2563EB] dark:text-[#93C5FD]' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Core ── */}
          {step === 'core' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#1E40AF] dark:text-[#93C5FD]">
                  Lender and current outstanding amount are required. Interest rate helps compute cost & insights.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  {type === 'CREDIT_CARD' ? 'Card Issuer / Bank' : 'Lender / Bank Name'} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  placeholder={type === 'CREDIT_CARD' ? 'e.g. HDFC Bank, Axis Bank' : 'e.g. HDFC Bank, SBI'}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {type === 'CREDIT_CARD' ? 'Current Outstanding Balance (₹)' : 'Current Outstanding Amount (₹)'} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={outstanding || ''}
                  onChange={(e) => setOutstanding(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Interest Rate (% p.a.) {optionalBadge}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="60"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder={type === 'CREDIT_CARD' ? 'e.g. 36 (credit cards are typically 36–42%)' : 'e.g. 8.5'}
                  className={inputClass}
                />
                {type === 'CREDIT_CARD' && (
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    Credit card interest is usually 36–42% p.a. Check your card statement.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Type-specific details ── */}
          {step === 'type_details' && (
            <div className="space-y-5">

              {/* HOME LOAN */}
              {type === 'HOME_LOAN' && (
                <>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Loan details help track repayment progress and enable EMI auto-calculation.
                  </p>
                  <div>
                    <label className={labelClass}>Original Loan Amount (₹) {optionalBadge}</label>
                    <input type="number" step="1" min="1" value={originalLoanAmount} onChange={(e) => setOriginalLoanAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="e.g. 5000000" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Loan Start Date {optionalBadge}</label>
                      <input type="date" value={loanStartDate} max={today} onChange={(e) => setLoanStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tenure (months) {optionalBadge}</label>
                      <input type="number" step="1" min="1" max="360" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="e.g. 240" className={inputClass} />
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">e.g. 240 = 20 years</p>
                    </div>
                  </div>
                </>
              )}

              {/* VEHICLE LOAN */}
              {type === 'VEHICLE_LOAN' && (
                <>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Vehicle and loan details for better tracking.
                  </p>
                  <div>
                    <label className={labelClass}>Vehicle Type <span className="text-[#DC2626]">*</span></label>
                    <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className={selectClass}>
                      <option value="">Select vehicle type</option>
                      {VEHICLE_TYPES.map((v) => (
                        <option key={v} value={v}>{VEHICLE_TYPE_LABELS[v]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Vehicle Registration Number {optionalBadge}</label>
                    <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Original Loan Amount (₹) {optionalBadge}</label>
                    <input type="number" step="1" min="1" value={originalLoanAmount} onChange={(e) => setOriginalLoanAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="e.g. 800000" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Loan Start Date {optionalBadge}</label>
                      <input type="date" value={loanStartDate} max={today} onChange={(e) => setLoanStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tenure (months) {optionalBadge}</label>
                      <input type="number" step="1" min="1" max="84" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="e.g. 60" className={inputClass} />
                    </div>
                  </div>
                </>
              )}

              {/* CREDIT CARD */}
              {type === 'CREDIT_CARD' && (
                <>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Card details for credit utilization tracking and payment reminders.
                  </p>
                  <div>
                    <label className={labelClass}>Credit Limit (₹) {optionalBadge}</label>
                    <input type="number" step="1" min="1" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="e.g. 200000" className={inputClass} />
                    {creditLimit !== '' && outstanding > 0 && Number(creditLimit) > 0 && (
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                        Utilization: {Math.round((outstanding / Number(creditLimit)) * 100)}% of credit limit used
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Statement / Billing Date {optionalBadge}</label>
                      <select value={billingCycleDate} onChange={(e) => setBillingCycleDate(e.target.value === '' ? '' : parseInt(e.target.value))} className={selectClass}>
                        <option value="">Select day of month</option>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of every month</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Minimum Due (₹) {optionalBadge}</label>
                      <input type="number" step="1" min="0" value={minimumDue} onChange={(e) => setMinimumDue(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="e.g. 2500" className={inputClass} />
                    </div>
                  </div>
                  <div className="p-3 bg-[#FEF3C7] dark:bg-[#78350F] border border-[#FCD34D] dark:border-[#F59E0B] rounded-lg">
                    <p className="text-xs text-[#92400E] dark:text-[#FDE68A]">
                      Paying only the minimum due keeps interest charges very high. Always aim to pay the full outstanding amount before the due date.
                    </p>
                  </div>
                </>
              )}

              {/* PERSONAL LOAN */}
              {type === 'PERSONAL_LOAN' && (
                <>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Loan details enable repayment tracking and EMI auto-calculation.
                  </p>
                  <div>
                    <label className={labelClass}>Loan Purpose {optionalBadge}</label>
                    <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={selectClass}>
                      <option value="">Select purpose</option>
                      {PERSONAL_LOAN_PURPOSES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Original Loan Amount (₹) {optionalBadge}</label>
                    <input type="number" step="1" min="1" value={originalLoanAmount} onChange={(e) => setOriginalLoanAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="e.g. 500000" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Loan Start Date {optionalBadge}</label>
                      <input type="date" value={loanStartDate} max={today} onChange={(e) => setLoanStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tenure (months) {optionalBadge}</label>
                      <input type="number" step="1" min="1" max="84" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="e.g. 36" className={inputClass} />
                    </div>
                  </div>
                </>
              )}

              {/* EDUCATION LOAN */}
              {type === 'EDUCATION_LOAN' && (
                <>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Education loan details. Tax benefit under Section 80E is auto-enabled.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Institution Name {optionalBadge}</label>
                      <input type="text" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="e.g. IIT Bombay" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Course / Program {optionalBadge}</label>
                      <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. B.Tech, MBA" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Original Loan Amount (₹) {optionalBadge}</label>
                    <input type="number" step="1" min="1" value={originalLoanAmount} onChange={(e) => setOriginalLoanAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="e.g. 1500000" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Loan Start Date {optionalBadge}</label>
                      <input type="date" value={loanStartDate} max={today} onChange={(e) => setLoanStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Moratorium Period (months) {optionalBadge}</label>
                      <input type="number" step="1" min="0" max="84" value={moratoriumMonths} onChange={(e) => setMoratoriumMonths(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="e.g. 12" className={inputClass} />
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">Period with no EMI payment</p>
                    </div>
                  </div>
                </>
              )}

              {/* OTHER */}
              {type === 'OTHER' && (
                <>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Any additional notes about this liability.
                  </p>
                  <div>
                    <label className={labelClass}>Description / Notes {optionalBadge}</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Borrowed from family member for business"
                      rows={4}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: EMI (loan types only) ── */}
          {step === 'emi' && (
            <div className="space-y-5">

              {/* Auto-calculate section */}
              {canAutoCalcEmi && autoCalculatedEmi && (
                <div className="p-4 bg-[#F0FDF4] dark:bg-[#14532D] border border-[#BBF7D0] dark:border-[#16A34A] rounded-lg">
                  <p className="text-sm font-medium text-[#166534] dark:text-[#86EFAC]">
                    Calculated EMI
                  </p>
                  <p className="text-xs text-[#166534] dark:text-[#86EFAC] mt-0.5">
                    Based on ₹{Number(originalLoanAmount).toLocaleString('en-IN')} at {interestRate}% for {tenureMonths} months
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-2xl font-semibold text-[#166534] dark:text-[#4ADE80]">
                      ₹{autoCalculatedEmi.toLocaleString('en-IN')} / mo
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmi(autoCalculatedEmi)}
                      className="px-3 py-1.5 text-sm font-medium bg-[#16A34A] dark:bg-[#22C55E] text-white rounded-lg hover:bg-[#15803D] dark:hover:bg-[#16A34A] transition-colors"
                    >
                      Use this EMI
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Monthly EMI (₹) {optionalBadge}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={emi}
                  onChange={(e) => setEmi(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="Enter your actual EMI"
                  className={inputClass}
                />
                {canAutoCalcEmi && (
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    Use the calculated value above or enter your actual EMI from your loan statement.
                  </p>
                )}
                {!canAutoCalcEmi && (
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    Tip: Enter loan amount, rate, and tenure in the Details step to auto-calculate EMI.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Classification ── */}
          {step === 'classification' && (
            <div className="space-y-5">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Classification details for your records. Defaults are pre-filled based on liability type.
              </p>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={secured} onChange={(e) => setSecured(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-[#E5E7EB] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Secured loan</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Backed by collateral (property, vehicle). Generally has lower interest rates.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={taxBenefit} onChange={(e) => setTaxBenefit(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-[#E5E7EB] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Tax benefit eligible</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Home loan (80C/24b), Education loan (80E). Check with your CA.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={prepayment} onChange={(e) => setPrepayment(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-[#E5E7EB] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Prepayment allowed</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Can make lump-sum payments to reduce outstanding balance.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ── Step 6: Review ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
                Review your liability details before saving.
              </p>
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Type</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    {LIABILITY_TYPES.find((t) => t.value === type)?.label ?? type}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">{type === 'CREDIT_CARD' ? 'Card / Bank' : 'Lender'}</span>
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
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{interestRate}% p.a.</span>
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

                {/* Type-specific review fields */}
                {originalLoanAmount !== '' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Original Loan</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      ₹{Number(originalLoanAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {tenureMonths !== '' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Tenure</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{tenureMonths} months</span>
                  </div>
                )}
                {vehicleType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Vehicle</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {VEHICLE_TYPE_LABELS[vehicleType] ?? vehicleType}{vehicleNumber ? ` • ${vehicleNumber}` : ''}
                    </span>
                  </div>
                )}
                {creditLimit !== '' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Credit Limit</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      ₹{Number(creditLimit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {minimumDue !== '' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Minimum Due</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      ₹{Number(minimumDue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {purpose && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Purpose</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{purpose}</span>
                  </div>
                )}
                {institutionName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Institution</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{institutionName}{courseName ? ` • ${courseName}` : ''}</span>
                  </div>
                )}
                {description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Notes</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC] text-right max-w-[60%]">{description}</span>
                  </div>
                )}

                {(secured || taxBenefit || prepayment) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Classification</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {[secured && 'Secured', taxBenefit && 'Tax benefit', prepayment && 'Prepayment ok'].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Saving ── */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
              <p className="text-[#6B7280] dark:text-[#94A3B8] font-medium">
                {isEditing ? 'Updating' : 'Saving'} liability...
              </p>
            </div>
          )}

          {/* ── Success ── */}
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

          {/* ── Error ── */}
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
          {['type', 'core', 'type_details', 'emi', 'classification'].includes(step) && (
            <>
              <button
                onClick={step === 'type' ? handleClose : handleBack}
                className="btn-secondary-standard"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleNext}
                className="btn-primary-standard px-6 py-2"
              >
                Next
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button
                onClick={handleBack}
                className="btn-secondary-standard"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary-standard px-6 py-2"
              >
                {isEditing ? 'Update Liability' : 'Save Liability'}
              </button>
            </>
          )}
          {step === 'error' && (
            <button
              onClick={handleClose}
              className="ml-auto btn-primary-standard px-6 py-2"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
