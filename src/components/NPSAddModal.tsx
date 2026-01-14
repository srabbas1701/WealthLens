/**
 * NPS Add Modal Component
 * 
 * Multi-step wizard for adding comprehensive NPS account details.
 * Handles PRAN, Tier I/II, asset classes, fund managers, and allocations.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon, PlusIcon, TrashIcon } from './icons';

interface NPSAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingHolding?: {
    pranNumber: string;
    subscriberName: string;
    dateOfOpening: string;
    tier1: any;
  } | null;
}

type Step = 'basic' | 'tier1' | 'tier2' | 'review' | 'saving' | 'success' | 'error';

interface SchemeData {
  assetClass: 'E' | 'C' | 'G' | 'A';
  fundManager: string;
  allocationPercentage: number;
  investedAmount: number;
  currentUnits: number;
  currentNAV: number;
}

interface TierData {
  allocationStrategy: 'auto' | 'active';
  autoChoiceType?: 'aggressive' | 'moderate' | 'conservative';
  schemes: SchemeData[];
}

const FUND_MANAGERS = ['HDFC', 'ICICI', 'SBI', 'UTI', 'LIC', 'KOTAK', 'BIRLA', 'MAX'];
const ASSET_CLASSES = [
  { id: 'E' as const, name: 'Equity', color: '#DC2626' },
  { id: 'C' as const, name: 'Corporate Bonds', color: '#F59E0B' },
  { id: 'G' as const, name: 'Government Securities', color: '#16A34A' },
  { id: 'A' as const, name: 'Alternative Funds', color: '#2563EB' },
];

export default function NPSAddModal({ isOpen, onClose, userId, onSuccess, existingHolding }: NPSAddModalProps) {
  const isAddingTier2 = !!existingHolding; // Flag to indicate we're adding Tier II to existing account
  
  // If adding Tier II, start directly at tier2 step. Otherwise start at basic.
  const [step, setStep] = useState<Step>(isAddingTier2 ? 'tier2' : 'basic');
  const [error, setError] = useState<string | null>(null);

  // Basic info - pre-filled if adding Tier II
  const [pranNumber, setPranNumber] = useState(existingHolding?.pranNumber || '');
  const [subscriberName, setSubscriberName] = useState(existingHolding?.subscriberName || '');
  const [dateOfOpening, setDateOfOpening] = useState(existingHolding?.dateOfOpening || '');

  // Tier I - pre-filled if adding Tier II
  const [tier1, setTier1] = useState<TierData>(
    existingHolding?.tier1 || {
      allocationStrategy: 'active',
      schemes: [{ assetClass: 'E', fundManager: 'HDFC', allocationPercentage: 0, investedAmount: 0, currentUnits: 0, currentNAV: 0 }],
    }
  );

  // Tier II - auto-checked if adding Tier II
  const [hasTier2, setHasTier2] = useState(isAddingTier2);
  const [tier2, setTier2] = useState<TierData>({
    allocationStrategy: 'active',
    schemes: [{ assetClass: 'E', fundManager: 'HDFC', allocationPercentage: 0, investedAmount: 0, currentUnits: 0, currentNAV: 0 }],
  });

  const [saving, setSaving] = useState(false);
  
  // Update form when existingHolding changes (when adding Tier II)
  useEffect(() => {
    if (existingHolding) {
      setPranNumber(existingHolding.pranNumber);
      setSubscriberName(existingHolding.subscriberName || '');
      setDateOfOpening(existingHolding.dateOfOpening || '');
      setTier1(existingHolding.tier1);
      setHasTier2(true);
    }
  }, [existingHolding]);
  
  // Reset step when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setStep(isAddingTier2 ? 'tier2' : 'basic');
    }
  }, [isOpen, isAddingTier2]);

  const handleClose = () => {
    // Reset to appropriate starting step
    setStep(isAddingTier2 ? 'tier2' : 'basic');
    
    // Only clear form if not adding Tier II (data should persist)
    if (!isAddingTier2) {
      setPranNumber('');
      setSubscriberName('');
      setDateOfOpening('');
      setTier1({
        allocationStrategy: 'active',
        schemes: [{ assetClass: 'E', fundManager: 'HDFC', allocationPercentage: 0, investedAmount: 0, currentUnits: 0, currentNAV: 0 }],
      });
      setHasTier2(false);
    }
    
    // Always reset Tier II form
    setTier2({
      allocationStrategy: 'active',
      schemes: [{ assetClass: 'E', fundManager: 'HDFC', allocationPercentage: 0, investedAmount: 0, currentUnits: 0, currentNAV: 0 }],
    });
    setError(null);
    onClose();
  };

  const validateBasic = () => {
    if (!pranNumber || pranNumber.length !== 12 || !/^\d{12}$/.test(pranNumber)) {
      setError('PRAN must be exactly 12 digits');
      return false;
    }
    setError(null);
    return true;
  };

  const validateTier = (tierData: TierData, tierName: string, isTier2 = false) => {
    if (tierData.schemes.length === 0) {
      setError(`${tierName} must have at least one scheme`);
      return false;
    }

    const totalAllocation = tierData.schemes.reduce((sum, s) => sum + s.allocationPercentage, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      setError(`${tierName} allocation must total 100% (currently ${totalAllocation.toFixed(1)}%)`);
      return false;
    }

    for (const scheme of tierData.schemes) {
      if (!scheme.investedAmount || scheme.investedAmount <= 0) {
        setError(`All schemes must have an invested amount`);
        return false;
      }
      if (!scheme.currentNAV || scheme.currentNAV <= 0) {
        setError(`All schemes must have a valid NAV`);
        return false;
      }
      
      // For Tier II, units and NAV are optional (can be calculated or added later)
      // For Tier I, units are required
      if (!isTier2) {
        if (!scheme.currentUnits || scheme.currentUnits <= 0) {
          setError(`All ${tierName} schemes must have units`);
          return false;
        }
      }
    }

    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateTier(tier1, 'Tier I', false)) return;
    if (hasTier2 && !validateTier(tier2, 'Tier II', true)) return;

    setSaving(true);
    setStep('saving');

    try {
      // Calculate current values and returns
      const processSchemes = (schemes: SchemeData[]) => {
        return schemes.map(s => {
          // Auto-calculate units if not provided (useful for Tier II)
          let units = s.currentUnits;
          if ((!units || units <= 0) && s.investedAmount > 0 && s.currentNAV > 0) {
            units = s.investedAmount / s.currentNAV;
          }
          
          const currentValue = units * s.currentNAV;
          const returns = currentValue - s.investedAmount;
          const returnsPercentage = s.investedAmount > 0 ? (returns / s.investedAmount) * 100 : 0;
          return {
            ...s,
            currentUnits: units,
            currentValue,
            returns,
            returnsPercentage,
            navDate: new Date().toISOString(),
          };
        });
      };

      const tier1Data = {
        tierId: 'tier1' as const,
        tierName: 'Tier I',
        ...tier1,
        schemes: processSchemes(tier1.schemes),
      };

      const tier2Data = hasTier2 ? {
        tierId: 'tier2' as const,
        tierName: 'Tier II',
        ...tier2,
        schemes: processSchemes(tier2.schemes),
      } : null;

      const payload = {
        user_id: userId,
        pranNumber,
        subscriberName,
        dateOfOpening,
        tier1: tier1Data,
        tier2: tier2Data,
      };
      
      const response = await fetch('/api/nps/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setStep('success');
        // Show appropriate message in success state based on whether it was update or create
        if (result.message?.includes('updated')) {
          // Account was updated (Tier II added to existing PRAN)
        }
        onSuccess();
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to save NPS account');
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

  const addScheme = (tierData: TierData, setTierData: (data: TierData) => void) => {
    setTierData({
      ...tierData,
      schemes: [...tierData.schemes, { assetClass: 'E', fundManager: 'HDFC', allocationPercentage: 0, investedAmount: 0, currentUnits: 0, currentNAV: 0 }],
    });
  };

  const removeScheme = (tierData: TierData, setTierData: (data: TierData) => void, index: number) => {
    setTierData({
      ...tierData,
      schemes: tierData.schemes.filter((_, i) => i !== index),
    });
  };

  const updateScheme = (tierData: TierData, setTierData: (data: TierData) => void, index: number, field: keyof SchemeData, value: any) => {
    const newSchemes = [...tierData.schemes];
    newSchemes[index] = { ...newSchemes[index], [field]: value };
    setTierData({ ...tierData, schemes: newSchemes });
  };

  const autoCalculateUnits = (tierData: TierData, setTierData: (data: TierData) => void, index: number) => {
    const scheme = tierData.schemes[index];
    if (scheme.investedAmount > 0 && scheme.currentNAV > 0) {
      const units = scheme.investedAmount / scheme.currentNAV;
      updateScheme(tierData, setTierData, index, 'currentUnits', parseFloat(units.toFixed(4)));
    }
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-6">
            {isAddingTier2 && (
              <div className="p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg">
                <p className="text-sm font-medium text-[#1E40AF] dark:text-[#93C5FD] mb-1">
                  ✓ Adding Tier II to Existing Account
                </p>
                <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
                  Your existing Tier I data is pre-filled. Review and proceed to add Tier II schemes.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                PRAN Number <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={pranNumber}
                onChange={(e) => !isAddingTier2 && setPranNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="123456789012"
                maxLength={12}
                readOnly={isAddingTier2}
                disabled={isAddingTier2}
                className={`w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all ${
                  isAddingTier2 
                    ? 'bg-[#F9FAFB] dark:bg-[#334155] cursor-not-allowed opacity-75' 
                    : 'bg-white dark:bg-[#1E293B]'
                }`}
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                {isAddingTier2 
                  ? 'PRAN number is locked (adding Tier II to existing account)' 
                  : '12-digit unique identifier (e.g., 123456789012)'
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Subscriber Name <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={subscriberName}
                onChange={(e) => setSubscriberName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Date of Opening <span className="text-[#6B7280] text-xs font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={dateOfOpening}
                onChange={(e) => setDateOfOpening(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg flex items-start gap-3">
                <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#991B1B] dark:text-[#FEE2E2]">{error}</p>
              </div>
            )}
          </div>
        );

      case 'tier1':
      case 'tier2':
        const isTier1 = step === 'tier1';
        const tierData = isTier1 ? tier1 : tier2;
        const setTierData = isTier1 ? setTier1 : setTier2;
        const tierName = isTier1 ? 'Tier I' : 'Tier II';

        return (
          <div className="space-y-6">
            {!isTier1 && isAddingTier2 && (
              <div className="p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#2563EB]/20 dark:border-[#3B82F6]/20 rounded-lg">
                <p className="text-sm font-medium text-[#1E40AF] dark:text-[#93C5FD] mb-1">
                  ✓ Adding Tier II to Existing Account
                </p>
                <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
                  Add your Tier II schemes below. Tier II is voluntary and withdrawable.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Allocation Strategy
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'auto', label: 'Auto Choice', desc: 'Age-based allocation' },
                  { value: 'active', label: 'Active Choice', desc: 'Manual allocation' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTierData({ ...tierData, allocationStrategy: option.value as any })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      tierData.allocationStrategy === option.value
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

            {tierData.allocationStrategy === 'auto' && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Auto Choice Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['aggressive', 'moderate', 'conservative'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTierData({ ...tierData, autoChoiceType: type as any })}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium capitalize ${
                        tierData.autoChoiceType === type
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A8A] dark:text-[#93C5FD] dark:border-[#3B82F6]'
                          : 'border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:border-[#2563EB] dark:hover:border-[#3B82F6]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Schemes
                </label>
                <button
                  onClick={() => addScheme(tierData, setTierData)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Scheme
                </button>
              </div>

              <div className="space-y-4">
                {tierData.schemes.map((scheme, index) => (
                  <div key={index} className="p-4 bg-[#F9FAFB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        Scheme {index + 1}
                      </span>
                      {tierData.schemes.length > 1 && (
                        <button
                          onClick={() => removeScheme(tierData, setTierData, index)}
                          className="p-1 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D] rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                          Asset Class
                        </label>
                        <select
                          value={scheme.assetClass}
                          onChange={(e) => updateScheme(tierData, setTierData, index, 'assetClass', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                        >
                          {ASSET_CLASSES.map(ac => (
                            <option key={ac.id} value={ac.id}>{ac.id} - {ac.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                          Fund Manager
                        </label>
                        <select
                          value={scheme.fundManager}
                          onChange={(e) => updateScheme(tierData, setTierData, index, 'fundManager', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                        >
                          {FUND_MANAGERS.map(fm => (
                            <option key={fm} value={fm}>{fm}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                          Allocation %
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={scheme.allocationPercentage}
                          onChange={(e) => updateScheme(tierData, setTierData, index, 'allocationPercentage', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                          Invested Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={scheme.investedAmount}
                          onChange={(e) => updateScheme(tierData, setTierData, index, 'investedAmount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                          Current NAV (₹)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={scheme.currentNAV}
                          onChange={(e) => {
                            updateScheme(tierData, setTierData, index, 'currentNAV', parseFloat(e.target.value) || 0);
                            setTimeout(() => autoCalculateUnits(tierData, setTierData, index), 0);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                          Units {!isTier1 && <span className="text-[#9CA3AF] font-normal">(optional)</span>}
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={scheme.currentUnits}
                          onChange={(e) => updateScheme(tierData, setTierData, index, 'currentUnits', parseFloat(e.target.value) || 0)}
                          placeholder={!isTier1 ? "Will auto-calculate if empty" : ""}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B]"
                        />
                      </div>
                    </div>

                    {scheme.investedAmount > 0 && scheme.currentNAV > 0 && (
                      <button
                        onClick={() => autoCalculateUnits(tierData, setTierData, index)}
                        className="mt-2 text-xs text-[#2563EB] dark:text-[#3B82F6] hover:underline"
                      >
                        Auto-calculate units
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg">
                <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
                  <strong>Total Allocation:</strong> {tierData.schemes.reduce((sum, s) => sum + s.allocationPercentage, 0).toFixed(1)}% (must be 100%)
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

      case 'review':
        const tier1Total = tier1.schemes.reduce((sum, s) => sum + s.investedAmount, 0);
        const tier2Total = hasTier2 ? tier2.schemes.reduce((sum, s) => sum + s.investedAmount, 0) : 0;
        const grandTotal = tier1Total + tier2Total;

        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#F6F8FB] dark:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] rounded-lg">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Review your NPS account details before saving.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">PRAN Number</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{pranNumber}</span>
                </div>
                {subscriberName && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Subscriber Name</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{subscriberName}</span>
                  </div>
                )}
                {dateOfOpening && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Date of Opening</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{new Date(dateOfOpening).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Tier I Summary</h3>
              <div className="space-y-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Strategy</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{tier1.allocationStrategy === 'auto' ? 'Auto Choice' : 'Active Choice'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Schemes</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{tier1.schemes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Total Invested</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹{tier1Total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                {tier1.schemes.map((s, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span>{s.assetClass} ({s.fundManager})</span>
                    <span>{s.allocationPercentage}% • ₹{s.investedAmount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {hasTier2 && (
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Tier II Summary</h3>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Strategy</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{tier2.allocationStrategy === 'auto' ? 'Auto Choice' : 'Active Choice'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Schemes</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{tier2.schemes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-[#94A3B8]">Total Invested</span>
                    <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹{tier2Total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  {tier2.schemes.map((s, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{s.assetClass} ({s.fundManager})</span>
                      <span>{s.allocationPercentage}% • ₹{s.investedAmount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex justify-between text-base font-semibold">
                <span className="text-[#0F172A] dark:text-[#F8FAFC]">Grand Total</span>
                <span className="text-[#0F172A] dark:text-[#F8FAFC]">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {!hasTier2 && (
              <div className="mt-4 p-3 bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg border border-[#2563EB]/20 dark:border-[#3B82F6]/20">
                <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
                  <strong>Note:</strong> You can add Tier II later by editing this account if needed. Tier II is optional and withdrawable.
                </p>
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
            <p className="text-[#6B7280] dark:text-[#94A3B8] font-medium">Saving NPS account...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircleIcon className="w-16 h-16 text-[#16A34A] dark:text-[#22C55E]" />
            <div className="text-center">
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-lg">NPS Account Added</p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">
                Your NPS account has been successfully added to your portfolio.
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
      case 'basic': return 'Basic Information';
      case 'tier1': return 'Configure Tier I';
      case 'tier2': return 'Configure Tier II';
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

      <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {isAddingTier2 ? 'Add Tier II' : 'Add NPS Account'}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {isAddingTier2 
                ? (step === 'tier2' 
                    ? `Configure Tier II schemes for PRAN ${pranNumber}` 
                    : `Adding Tier II to PRAN ${pranNumber}`)
                : getStepTitle()
              }
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
                  if (validateBasic()) setStep('tier1');
                }}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
              >
                Next: Tier I
              </button>
            </>
          )}

          {step === 'tier1' && (
            <>
              <button
                onClick={() => setStep('basic')}
                className="flex items-center gap-2 px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
                  isAddingTier2 
                    ? 'bg-[#16A34A]/10 dark:bg-[#16A34A]/20 border-[#16A34A]/20 dark:border-[#16A34A]/30' 
                    : 'bg-[#EFF6FF] dark:bg-[#1E3A8A] border-[#2563EB]/20 dark:border-[#3B82F6]/20'
                }`}>
                  <input
                    type="checkbox"
                    id="tier2-checkbox"
                    checked={hasTier2}
                    onChange={(e) => !isAddingTier2 && setHasTier2(e.target.checked)}
                    disabled={isAddingTier2}
                    className={`w-4 h-4 rounded text-[#2563EB] dark:text-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 ${
                      isAddingTier2 
                        ? 'border-[#16A34A] dark:border-[#16A34A] cursor-not-allowed' 
                        : 'border-[#2563EB] dark:border-[#3B82F6]'
                    }`}
                  />
                  <label 
                    htmlFor="tier2-checkbox"
                    className={`text-sm font-medium ${
                      isAddingTier2 
                        ? 'text-[#16A34A] dark:text-[#22C55E]' 
                        : 'text-[#1E40AF] dark:text-[#93C5FD] cursor-pointer'
                    }`}
                  >
                    {isAddingTier2 
                      ? '✓ Tier II (Required for this operation)' 
                      : '✓ Also add Tier II (Optional - Withdrawable)'
                    }
                  </label>
                </div>
                <button
                  onClick={() => {
                    if (validateTier(tier1, 'Tier I', false)) {
                      if (hasTier2) {
                        setStep('tier2');
                      } else {
                        setStep('review');
                      }
                    }
                  }}
                  className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                >
                  {hasTier2 ? 'Next: Tier II' : 'Review & Save'}
                </button>
              </div>
            </>
          )}

          {step === 'tier2' && (
            <>
              <button
                onClick={() => isAddingTier2 ? handleClose() : setStep('tier1')}
                className="flex items-center gap-2 px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {isAddingTier2 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (validateTier(tier2, 'Tier II', true)) setStep('review');
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
                onClick={() => setStep(hasTier2 ? 'tier2' : 'tier1')}
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
                Save NPS Account
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
