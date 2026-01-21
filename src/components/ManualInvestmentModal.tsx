/**
 * Manual Investment Entry Modal
 * 
 * Asset-first manual entry for investment holdings.
 * 
 * DESIGN PRINCIPLES:
 * - Asset-first, not form-first
 * - Fields map exactly to holdings table
 * - Minimal required inputs
 * - Optional fields clearly marked
 * - No unnecessary validation
 * - Allow missing values where appropriate
 * - Calm, professional copy
 * 
 * FLOW:
 * 1. Select asset type
 * 2. Show asset-specific form
 * 3. Review before saving
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon } from '@/components/icons';
import { useCurrency } from '@/components/AppHeader';

interface ManualInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  portfolioId?: string;
  source?: 'onboarding' | 'dashboard';
  onSuccess?: () => void;
  editingHoldingId?: string;
  editingData?: any;
  category?: string; // Onboarding category to pre-select asset type
  onPPFSelected?: () => void; // Callback when PPF is selected
  onNPSSelected?: () => void; // Callback when NPS is selected
  onEPFSelected?: () => void; // Callback when EPF is selected
  onGoldSelected?: () => void; // Callback when Gold is selected
}

type AssetTypeOption = 'fd' | 'bond' | 'gold' | 'cash' | 'epf' | 'ppf' | 'nps' | 'real_estate';
type Step = 'select' | 'form' | 'review' | 'saving' | 'success' | 'error';

interface FormData {
  assetType: AssetTypeOption | null;
  // Core holding fields (map to holdings table)
  invested_value: number | null; // Required
  average_price: number | null; // Optional, defaults to invested_value
  quantity: number; // Always 1 for manual
  // Asset metadata (stored in notes JSON)
  name?: string; // Asset name
  // FD fields (optional)
  institution?: string;
  interest_rate?: number;
  start_date?: string;
  maturity_date?: string;
  // Bond fields (optional)
  issuer?: string;
  coupon_rate?: number;
  coupon_frequency?: string;
  bond_maturity_date?: string;
  // Gold fields (optional)
  gold_type?: 'sgb' | 'physical' | 'etf';
  purchase_date?: string;
  // Cash fields (optional)
  account_type?: string;
  // EPF fields (optional)
  epf_account_number?: string;
  // PPF fields (optional)
  ppf_account_number?: string;
  ppf_maturity_date?: string;
  // NPS fields (optional)
  nps_tier?: 'tier1' | 'tier2';
  nps_pran?: string;
}

// Map onboarding categories to asset types
function getAssetTypeFromCategory(category?: string): AssetTypeOption | null {
  if (!category) return null;
  
  const categoryToAssetType: Record<string, AssetTypeOption> = {
    'fixed_deposits': 'fd',
    'gold': 'gold',
    'epf_ppf_nps': null, // Keep as null so user can choose EPF, PPF, or NPS
    'pension_retirement': null, // Could map to NPS, but let user choose
  };
  
  return categoryToAssetType[category] || null;
}

export default function ManualInvestmentModal({
  isOpen,
  onClose,
  userId,
  portfolioId,
  source,
  onSuccess,
  editingHoldingId,
  editingData,
  category,
  onPPFSelected,
  onNPSSelected,
  onEPFSelected,
  onGoldSelected,
}: ManualInvestmentModalProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState<Step>('select');
  const [formData, setFormData] = useState<FormData>({
    assetType: null,
    invested_value: null,
    average_price: null,
    quantity: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with category or editing data if provided
  useEffect(() => {
    // Reset when modal closes
    if (!isOpen) {
      setStep('select');
      setFormData({
        assetType: null,
        invested_value: null,
        average_price: null,
        quantity: 1,
      });
      setError(null);
      return;
    }
    
    // Pre-select asset type from category if provided
    if (category && step === 'select' && !formData.assetType && !editingData) {
      const assetType = getAssetTypeFromCategory(category);
      if (assetType) {
        setFormData(prev => ({ ...prev, assetType }));
        setStep('form');
      }
    }
    
    // Initialize with editing data if provided
    if (editingData && isOpen && step === 'select' && !formData.assetType) {
      setFormData({
        assetType: editingData.assetType || editingData.form_data?.assetType || null,
        invested_value: editingData.invested_value || editingData.fdPrincipal || editingData.bondAmount || editingData.goldAmount || editingData.cashAmount || null,
        average_price: null,
        quantity: 1,
        name: editingData.name || editingData.fdInstitution || editingData.bondIssuer || editingData.cashAccountType || undefined,
        institution: editingData.institution || editingData.fdInstitution,
        interest_rate: editingData.interest_rate || editingData.fdRate,
        start_date: editingData.start_date || editingData.fdStartDate,
        maturity_date: editingData.maturity_date || editingData.fdMaturityDate,
        issuer: editingData.issuer || editingData.bondIssuer,
        coupon_rate: editingData.coupon_rate || editingData.bondCouponRate,
        coupon_frequency: editingData.coupon_frequency || editingData.bondCouponFrequency,
        bond_maturity_date: editingData.bond_maturity_date || editingData.bondMaturityDate,
        gold_type: editingData.gold_type || editingData.goldType,
        purchase_date: editingData.purchase_date || editingData.goldPurchaseDate,
        account_type: editingData.account_type || editingData.cashAccountType,
      });
      setStep('form');
    }
  }, [editingData, isOpen]);

  const handleClose = () => {
    setStep('select');
    setFormData({
      assetType: null,
      invested_value: null,
      average_price: null,
      quantity: 1,
    });
    setError(null);
    onClose();
  };

  const handleAssetTypeSelect = (type: AssetTypeOption) => {
    // Special handling for PPF - redirect to comprehensive PPF modal
    if (type === 'ppf' && onPPFSelected) {
      onPPFSelected();
      return;
    }
    
    // Special handling for NPS - redirect to comprehensive NPS modal
    if (type === 'nps' && onNPSSelected) {
      onNPSSelected();
      return;
    }
    
    // Special handling for EPF - redirect to comprehensive EPF modal
    if (type === 'epf' && onEPFSelected) {
      onEPFSelected();
      return;
    }
    
    // Special handling for Gold - redirect to comprehensive Gold modal
    if (type === 'gold' && onGoldSelected) {
      onGoldSelected();
      return;
    }
    
    // Special handling for Real Estate - navigate to Real Estate dashboard
    if (type === 'real_estate') {
      onClose();
      router.push('/portfolio/real-estate');
      return;
    }
    
    setFormData({
      ...formData,
      assetType: type,
      invested_value: null,
      average_price: null,
    });
    setStep('form');
    setError(null);
  };

  const handleFormSubmit = () => {
    // Minimal validation: only invested_value is required
    if (!formData.invested_value || formData.invested_value <= 0) {
      setError('Please enter the invested amount');
      return;
    }
    setError(null);
    setStep('review');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setStep('saving');

    try {
      // Map form data to API format
      const apiFormData: any = {
        assetType: formData.assetType,
      };

      // Map fields based on asset type
      if (formData.assetType === 'fd') {
        apiFormData.fdInstitution = formData.name || formData.institution || 'Fixed Deposit';
        apiFormData.fdPrincipal = formData.invested_value;
        apiFormData.fdRate = formData.interest_rate;
        apiFormData.fdStartDate = formData.start_date;
        apiFormData.fdMaturityDate = formData.maturity_date;
      } else if (formData.assetType === 'bond') {
        apiFormData.bondIssuer = formData.name || formData.issuer || 'Bond';
        apiFormData.bondAmount = formData.invested_value;
        apiFormData.bondCouponRate = formData.coupon_rate;
        apiFormData.bondCouponFrequency = formData.coupon_frequency || 'annual';
        apiFormData.bondMaturityDate = formData.bond_maturity_date;
      } else if (formData.assetType === 'gold') {
        apiFormData.goldType = formData.gold_type || 'physical';
        apiFormData.goldAmount = formData.invested_value;
        apiFormData.goldPurchaseDate = formData.purchase_date;
      } else if (formData.assetType === 'cash') {
        apiFormData.cashAmount = formData.invested_value;
        apiFormData.cashAccountType = formData.name || formData.account_type || 'Savings Account';
      } else if (formData.assetType === 'epf') {
        apiFormData.epfAccountNumber = formData.epf_account_number;
        apiFormData.epfBalance = formData.invested_value;
        apiFormData.epfName = formData.name || 'EPF Account';
      } else if (formData.assetType === 'ppf') {
        apiFormData.ppfAccountNumber = formData.ppf_account_number;
        apiFormData.ppfBalance = formData.invested_value;
        apiFormData.ppfMaturityDate = formData.ppf_maturity_date;
        apiFormData.ppfName = formData.name || 'PPF Account';
      } else if (formData.assetType === 'nps') {
        apiFormData.npsPRAN = formData.nps_pran;
        apiFormData.npsTier = formData.nps_tier;
        apiFormData.npsBalance = formData.invested_value;
        apiFormData.npsName = formData.name || 'NPS Account';
      }

      const response = await fetch('/api/investments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          portfolio_id: portfolioId,
          form_data: apiFormData,
          editing_holding_id: editingHoldingId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStep('success');
        onSuccess?.();
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to save holding');
        setStep('error');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Something went wrong. Please try again.');
      setStep('error');
    } finally {
      setIsSaving(false);
    }
  };

  const getAssetName = (): string => {
    if (formData.name) return formData.name;
    switch (formData.assetType) {
      case 'fd': return formData.institution || 'Fixed Deposit';
      case 'bond': return formData.issuer || 'Bond';
      case 'gold': return `Gold (${formData.gold_type || 'physical'})`;
      case 'cash': return formData.account_type || 'Savings Account';
      case 'epf': return formData.epf_account_number ? `EPF (${formData.epf_account_number.slice(-4)})` : 'EPF Account';
      case 'ppf': return formData.ppf_account_number ? `PPF (${formData.ppf_account_number.slice(-4)})` : 'PPF Account';
      case 'nps': return formData.nps_pran ? `NPS (${formData.nps_pran.slice(-4)})` : 'NPS Account';
      default: return 'Investment';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'select' || step === 'error' ? handleClose : undefined}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white rounded-xl border border-[#E5E7EB] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              {editingHoldingId ? 'Edit Holding' : 'Add Holding'}
            </h2>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {step === 'select' && 'Select the type of investment'}
              {step === 'form' && 'Enter holding details'}
              {step === 'review' && 'Review before saving'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] transition-colors"
          >
            <XIcon className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Select Asset Type */}
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-[#6B7280] mb-4">
                  What type of investment are you adding?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'fd' as AssetTypeOption, label: 'Fixed Deposit', description: 'Bank FD, corporate FD' },
                    { id: 'bond' as AssetTypeOption, label: 'Bond', description: 'Government, corporate bonds' },
                    { id: 'gold' as AssetTypeOption, label: 'Gold', description: 'SGB, physical, ETF' },
                    { id: 'cash' as AssetTypeOption, label: 'Cash', description: 'Savings, current account' },
                    { id: 'epf' as AssetTypeOption, label: 'EPF', description: 'Employee Provident Fund' },
                    { id: 'ppf' as AssetTypeOption, label: 'PPF', description: 'Public Provident Fund' },
                    { id: 'nps' as AssetTypeOption, label: 'NPS', description: 'National Pension System' },
                    { id: 'real_estate' as AssetTypeOption, label: 'Real Estate', description: 'Residential, commercial, land' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAssetTypeSelect(option.id)}
                      className="p-4 rounded-lg border-2 border-[#E5E7EB] hover:border-[#2563EB] transition-all text-left"
                    >
                      <p className="font-medium text-[#0F172A] text-sm">{option.label}</p>
                      <p className="text-xs text-[#6B7280] mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Asset-Specific Form */}
          {step === 'form' && formData.assetType && (
            <div className="space-y-6">
              {/* Required: Invested Value */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Invested Amount <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  value={formData.invested_value || ''}
                  onChange={(e) => setFormData({ ...formData, invested_value: parseFloat(e.target.value) || null })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
                <p className="text-xs text-[#6B7280] mt-1">
                  This is the amount you invested in this holding
                </p>
              </div>

              {/* Asset-Specific Fields */}
              {formData.assetType === 'fd' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Bank or Institution <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.institution || formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value, name: e.target.value })}
                      placeholder="e.g., HDFC Bank"
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Interest Rate (%) <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.interest_rate || ''}
                        onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || undefined })}
                        placeholder="6.5"
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Maturity Date <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.maturity_date || ''}
                        onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value || undefined })}
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.assetType === 'bond' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Issuer Name <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.issuer || formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, issuer: e.target.value, name: e.target.value })}
                      placeholder="e.g., NTPC, Government of India"
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Coupon Rate (%) <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.coupon_rate || ''}
                        onChange={(e) => setFormData({ ...formData, coupon_rate: parseFloat(e.target.value) || undefined })}
                        placeholder="7.5"
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Maturity Date <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.bond_maturity_date || ''}
                        onChange={(e) => setFormData({ ...formData, bond_maturity_date: e.target.value || undefined })}
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.assetType === 'gold' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Type <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'sgb', label: 'SGB' },
                        { id: 'physical', label: 'Physical' },
                        { id: 'etf', label: 'ETF' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setFormData({ ...formData, gold_type: option.id as any })}
                          className={`p-3 rounded-lg border transition-all text-sm font-medium ${
                            formData.gold_type === option.id
                              ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                              : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Purchase Date <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value || undefined })}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {formData.assetType === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Account Type <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.account_type || formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value, name: e.target.value })}
                    placeholder="e.g., Savings Account, Current Account"
                    className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#991B1B]">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F6F8FB] border border-[#E5E7EB] rounded-lg">
                <p className="text-sm text-[#6B7280]">
                  Review your holding details. You can go back to make changes.
                </p>
              </div>

              <div className="border border-[#E5E7EB] rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#6B7280] uppercase mb-1">Holding</p>
                    <p className="font-medium text-[#0F172A]">{getAssetName()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] uppercase mb-1">Invested Amount</p>
                    <p className="font-medium text-[#0F172A]">
                      {formatCurrency(formData.invested_value || 0)}
                    </p>
                  </div>
                </div>

                {/* Asset-specific details */}
                {formData.assetType === 'fd' && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    {formData.institution && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Institution</span>
                        <span className="text-[#0F172A]">{formData.institution}</span>
                      </div>
                    )}
                    {formData.interest_rate && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Interest Rate</span>
                        <span className="text-[#0F172A]">{formData.interest_rate}% p.a.</span>
                      </div>
                    )}
                    {formData.maturity_date && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Maturity Date</span>
                        <span className="text-[#0F172A]">{formData.maturity_date}</span>
                      </div>
                    )}
                  </div>
                )}

                {formData.assetType === 'bond' && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    {formData.issuer && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Issuer</span>
                        <span className="text-[#0F172A]">{formData.issuer}</span>
                      </div>
                    )}
                    {formData.coupon_rate && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Coupon Rate</span>
                        <span className="text-[#0F172A]">{formData.coupon_rate}%</span>
                      </div>
                    )}
                    {formData.bond_maturity_date && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Maturity Date</span>
                        <span className="text-[#0F172A]">{formData.bond_maturity_date}</span>
                      </div>
                    )}
                  </div>
                )}

                {formData.assetType === 'gold' && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    {formData.gold_type && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Type</span>
                        <span className="text-[#0F172A] capitalize">{formData.gold_type}</span>
                      </div>
                    )}
                    {formData.purchase_date && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Purchase Date</span>
                        <span className="text-[#0F172A]">{formData.purchase_date}</span>
                      </div>
                    )}
                  </div>
                )}

                {formData.assetType === 'cash' && formData.account_type && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Account Type</span>
                      <span className="text-[#0F172A]">{formData.account_type}</span>
                    </div>
                  </div>
                )}

                {formData.assetType === 'epf' && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    {formData.epf_account_number && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Account Number</span>
                        <span className="text-[#0F172A]">{formData.epf_account_number}</span>
                      </div>
                    )}
                    {formData.name && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Account Name</span>
                        <span className="text-[#0F172A]">{formData.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {formData.assetType === 'ppf' && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    {formData.ppf_account_number && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Account Number</span>
                        <span className="text-[#0F172A]">{formData.ppf_account_number}</span>
                      </div>
                    )}
                    {formData.ppf_maturity_date && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Maturity Date</span>
                        <span className="text-[#0F172A]">{formData.ppf_maturity_date}</span>
                      </div>
                    )}
                    {formData.name && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Account Name</span>
                        <span className="text-[#0F172A]">{formData.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {formData.assetType === 'nps' && (
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-sm">
                    {formData.nps_pran && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">PRAN</span>
                        <span className="text-[#0F172A]">{formData.nps_pran}</span>
                      </div>
                    )}
                    {formData.nps_tier && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Tier</span>
                        <span className="text-[#0F172A] capitalize">{formData.nps_tier}</span>
                      </div>
                    )}
                    {formData.name && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Account Name</span>
                        <span className="text-[#0F172A]">{formData.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Saving Step */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
              <p className="text-[#6B7280] font-medium">Saving holding...</p>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircleIcon className="w-16 h-16 text-[#16A34A]" />
              <div className="text-center">
                <p className="font-semibold text-[#0F172A] text-lg">Holding saved</p>
                <p className="text-[#6B7280] text-sm mt-2">
                  {editingHoldingId ? 'Your holding has been updated.' : 'Your portfolio has been updated.'}
                </p>
              </div>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertTriangleIcon className="w-16 h-16 text-[#DC2626]" />
              <div className="text-center">
                <p className="font-semibold text-[#0F172A] text-lg">Something went wrong</p>
                <p className="text-[#6B7280] text-sm mt-2">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] bg-[#F6F8FB]">
          {step === 'select' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 'form' && (
            <>
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-2 px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={!formData.invested_value || formData.invested_value <= 0}
                className="px-6 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('form')}
                className="flex items-center gap-2 px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors disabled:opacity-50"
              >
                {editingHoldingId ? 'Update' : 'Save'} Holding
              </button>
            </>
          )}

          {(step === 'success' || step === 'saving') && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
            >
              Close
            </button>
          )}

          {step === 'error' && (
            <button
              onClick={() => setStep('form')}
              className="px-4 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
