/**
 * Gold Add Modal Component
 * 
 * Multi-step wizard for adding gold holdings.
 * Supports 4 types: SGB, Physical Gold, Gold ETF, Digital Gold
 */

'use client';

import React, { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon, InfoIcon } from './icons';
import { useCurrency } from './AppHeader';

interface GoldAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingHolding?: {
    id: string;
    goldType: 'sgb' | 'physical' | 'etf' | 'digital';
    investedAmount: number;
    quantity: number;
    unitType: 'gram' | 'unit';
    purchaseDate: string;
    // SGB fields
    seriesName?: string;
    issueDate?: string;
    maturityDate?: string;
    interestRate?: number;
    // Physical Gold fields
    form?: 'jewellery' | 'coin' | 'bar';
    purity?: string;
    grossWeight?: number;
    netWeight?: number;
    makingCharges?: number;
    // Gold ETF fields
    etfName?: string;
    isin?: string;
    exchange?: string;
    // Digital Gold fields
    platform?: string;
    provider?: string;
    vaulted?: boolean;
  } | null;
}

type GoldType = 'sgb' | 'physical' | 'etf' | 'digital';
type Step = 'select' | 'form' | 'review' | 'saving' | 'success' | 'error';
type UnitType = 'gram' | 'unit';

interface FormData {
  goldType: GoldType | null;
  investedAmount: number | null;
  quantity: number | null;
  unitType: UnitType;
  purchaseDate: string;
  // SGB fields
  seriesName: string;
  issueDate: string;
  maturityDate: string;
  interestRate: number;
  // Physical Gold fields
  form: 'jewellery' | 'coin' | 'bar';
  purity: string;
  grossWeight: number | null;
  netWeight: number | null;
  makingCharges: number | null;
  // Gold ETF fields
  etfName: string;
  isin: string;
  exchange: string;
  // Digital Gold fields
  platform: string;
  provider: string;
  vaulted: boolean;
}

const GOLD_TYPES: Array<{ id: GoldType; name: string; description: string }> = [
  { id: 'sgb', name: 'SGB', description: 'Sovereign Gold Bond' },
  { id: 'physical', name: 'Physical Gold', description: 'Jewellery, Coins, or Bars' },
  { id: 'etf', name: 'Gold ETF', description: 'Gold Exchange Traded Fund' },
  { id: 'digital', name: 'Digital Gold', description: 'SafeGold, MMTC, etc.' },
];

const EXCHANGES = ['NSE', 'BSE'];
const DIGITAL_PLATFORMS = ['SafeGold', 'MMTC-PAMP', 'Digital Gold India', 'Paytm Gold', 'Other'];
const DIGITAL_PROVIDERS = ['SafeGold', 'MMTC-PAMP', 'Digital Gold India', 'Paytm', 'Other'];

export default function GoldAddModal({ isOpen, onClose, userId, onSuccess, existingHolding }: GoldAddModalProps) {
  const { formatCurrency } = useCurrency();
  const isEditing = !!existingHolding;
  
  const [step, setStep] = useState<Step>(existingHolding ? 'form' : 'select');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    goldType: null,
    investedAmount: null,
    quantity: null,
    unitType: 'gram',
    purchaseDate: new Date().toISOString().split('T')[0],
    seriesName: '',
    issueDate: '',
    maturityDate: '',
    interestRate: 2.5,
    form: 'jewellery',
    purity: '22k',
    grossWeight: null,
    netWeight: null,
    makingCharges: null,
    etfName: '',
    isin: '',
    exchange: 'NSE',
    platform: '',
    provider: '',
    vaulted: false,
  });

  // Initialize with existing holding data if editing
  useEffect(() => {
    if (existingHolding && isOpen) {
      setFormData({
        goldType: existingHolding.goldType,
        investedAmount: existingHolding.investedAmount,
        quantity: existingHolding.quantity,
        unitType: existingHolding.unitType,
        purchaseDate: existingHolding.purchaseDate,
        seriesName: existingHolding.seriesName || '',
        issueDate: existingHolding.issueDate || '',
        maturityDate: existingHolding.maturityDate || '',
        interestRate: existingHolding.interestRate || 2.5,
        form: existingHolding.form || 'jewellery',
        purity: existingHolding.purity || '22k',
        grossWeight: existingHolding.grossWeight || null,
        netWeight: existingHolding.netWeight || null,
        makingCharges: existingHolding.makingCharges || null,
        etfName: existingHolding.etfName || '',
        isin: existingHolding.isin || '',
        exchange: existingHolding.exchange || 'NSE',
        platform: existingHolding.platform || '',
        provider: existingHolding.provider || '',
        vaulted: existingHolding.vaulted ?? false,
      });
      setStep('form');
    }
  }, [existingHolding, isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setFormData({
        goldType: null,
        investedAmount: null,
        quantity: null,
        unitType: 'gram',
        purchaseDate: new Date().toISOString().split('T')[0],
        seriesName: '',
        issueDate: '',
        maturityDate: '',
        interestRate: 2.5,
        form: 'jewellery',
        purity: '22k',
        grossWeight: null,
        netWeight: null,
        makingCharges: null,
        etfName: '',
        isin: '',
        exchange: 'NSE',
        platform: '',
        provider: '',
        vaulted: false,
      });
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleTypeSelect = (type: GoldType) => {
    setFormData(prev => ({ 
      ...prev, 
      goldType: type,
      // For ETFs, always use 'unit' as unit type
      unitType: type === 'etf' ? 'unit' : prev.unitType
    }));
    setStep('form');
  };

  const handleNext = () => {
    // Validate form based on gold type
    if (!formData.goldType) {
      setError('Please select a gold type');
      return;
    }

    if (!formData.investedAmount || formData.investedAmount <= 0) {
      setError('Please enter invested amount');
      return;
    }

    if (!formData.quantity || formData.quantity <= 0) {
      setError('Please enter quantity');
      return;
    }

    if (!formData.purchaseDate) {
      setError('Please select purchase date');
      return;
    }

    // Type-specific validation
    if (formData.goldType === 'sgb') {
      if (!formData.seriesName) {
        setError('Please enter series name');
        return;
      }
    } else if (formData.goldType === 'etf') {
      if (!formData.etfName) {
        setError('Please enter ETF name');
        return;
      }
    } else if (formData.goldType === 'digital') {
      if (!formData.platform) {
        setError('Please enter platform');
        return;
      }
    }

    setError(null);
    setStep('review');
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('form');
    } else if (step === 'form') {
      if (isEditing) {
        setStep('form');
      } else {
        setStep('select');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // For ETFs, always use 'unit' as unit_type
      const unitType = formData.goldType === 'etf' ? 'unit' : formData.unitType;
      
      const response = await fetch('/api/gold/holdings', {
        method: existingHolding ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          holding_id: existingHolding?.id,
          gold_type: formData.goldType,
          invested_amount: formData.investedAmount,
          quantity: formData.quantity,
          unit_type: unitType,
          purchase_date: formData.purchaseDate,
          // SGB fields
          series_name: formData.goldType === 'sgb' ? formData.seriesName : undefined,
          issue_date: formData.goldType === 'sgb' ? formData.issueDate : undefined,
          maturity_date: formData.goldType === 'sgb' ? formData.maturityDate : undefined,
          interest_rate: formData.goldType === 'sgb' ? formData.interestRate : undefined,
          // Physical Gold fields
          form: formData.goldType === 'physical' ? formData.form : undefined,
          purity: formData.goldType === 'physical' ? formData.purity : undefined,
          gross_weight: formData.goldType === 'physical' ? formData.grossWeight : undefined,
          net_weight: formData.goldType === 'physical' ? formData.netWeight : undefined,
          making_charges: formData.goldType === 'physical' ? formData.makingCharges : undefined,
          // Gold ETF fields
          etf_name: formData.goldType === 'etf' ? formData.etfName : undefined,
          isin: formData.goldType === 'etf' ? formData.isin : undefined,
          exchange: formData.goldType === 'etf' ? formData.exchange : undefined,
          // Digital Gold fields
          platform: formData.goldType === 'digital' ? formData.platform : undefined,
          provider: formData.goldType === 'digital' ? formData.provider : undefined,
          vaulted: formData.goldType === 'digital' ? formData.vaulted : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to save gold holding');
        setStep('error');
        return;
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving gold holding:', err);
      setError('Failed to save gold holding. Please try again.');
      setStep('error');
    } finally {
      setSaving(false);
    }
  };

  // Get current gold price (mock for now)
  const getCurrentGoldPrice = (): number => {
    // This will be replaced with actual API call
    return formData.unitType === 'gram' ? 6400 : 6400; // Mock 22k price per gram
  };

  const calculateCurrentValue = (): number => {
    if (!formData.quantity || !formData.purchaseDate) return 0;
    const pricePerUnit = getCurrentGoldPrice();
    return formData.quantity * pricePerUnit;
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-6">
              Select the type of gold holding you want to add
            </p>
            <div className="grid grid-cols-2 gap-4">
              {GOLD_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="p-6 text-left border-2 border-[#E5E7EB] dark:border-[#334155] rounded-xl hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] transition-all"
                >
                  <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                    {type.name}
                  </h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'form':
        return (
          <div className="space-y-6">
            {/* Common Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Invested Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.investedAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, investedAmount: parseFloat(e.target.value) || null }))}
                  className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  placeholder="100000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || null }))}
                    className="flex-1 px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="10"
                    min="0"
                    step="0.01"
                  />
                  <select
                    value={formData.goldType === 'etf' ? 'unit' : formData.unitType}
                    onChange={(e) => {
                      if (formData.goldType !== 'etf') {
                        setFormData(prev => ({ ...prev, unitType: e.target.value as UnitType }));
                      }
                    }}
                    disabled={formData.goldType === 'etf'}
                    className={`px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6] ${
                      formData.goldType === 'etf' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="gram">Gram</option>
                    <option value="unit">Unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Type-Specific Fields */}
            {formData.goldType === 'sgb' && (
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">SGB Details</h3>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Series Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.seriesName}
                    onChange={(e) => setFormData(prev => ({ ...prev, seriesName: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="SGB 2023-24 Series I"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Maturity Date
                  </label>
                  <input
                    type="date"
                    value={formData.maturityDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, maturityDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.interestRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 2.5 }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="2.5"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}

            {formData.goldType === 'physical' && (
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Physical Gold Details</h3>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Form
                  </label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData(prev => ({ ...prev, form: e.target.value as 'jewellery' | 'coin' | 'bar' }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  >
                    <option value="jewellery">Jewellery</option>
                    <option value="coin">Coin</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Purity
                  </label>
                  <select
                    value={formData.purity}
                    onChange={(e) => setFormData(prev => ({ ...prev, purity: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  >
                    <option value="24k">24k</option>
                    <option value="22k">22k</option>
                    <option value="18k">18k</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Gross Weight (grams)
                  </label>
                  <input
                    type="number"
                    value={formData.grossWeight || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, grossWeight: parseFloat(e.target.value) || null }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="10"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Net Weight (grams)
                  </label>
                  <input
                    type="number"
                    value={formData.netWeight || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, netWeight: parseFloat(e.target.value) || null }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="8"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Making Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.makingCharges || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, makingCharges: parseFloat(e.target.value) || null }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="5000"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {formData.goldType === 'etf' && (
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Gold ETF Details</h3>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    ETF Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.etfName}
                    onChange={(e) => setFormData(prev => ({ ...prev, etfName: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="Gold BeES"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    ISIN
                  </label>
                  <input
                    type="text"
                    value={formData.isin}
                    onChange={(e) => setFormData(prev => ({ ...prev, isin: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="INF204K01YV9"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Exchange
                  </label>
                  <select
                    value={formData.exchange}
                    onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  >
                    {EXCHANGES.map(ex => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {formData.goldType === 'digital' && (
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Digital Gold Details</h3>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  >
                    <option value="">Select platform</option>
                    {DIGITAL_PLATFORMS.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E5E7EB] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  >
                    <option value="">Select provider</option>
                    {DIGITAL_PROVIDERS.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vaulted"
                    checked={formData.vaulted}
                    onChange={(e) => setFormData(prev => ({ ...prev, vaulted: e.target.checked }))}
                    className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6] border-[#E5E7EB] dark:border-[#334155] rounded focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                  />
                  <label htmlFor="vaulted" className="text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    Vaulted (stored securely)
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        );

      case 'review':
        const currentValue = calculateCurrentValue();
        const gainLoss = currentValue - (formData.investedAmount || 0);
        const gainLossPct = formData.investedAmount && formData.investedAmount > 0 
          ? (gainLoss / formData.investedAmount) * 100 
          : 0;

        return (
          <div className="space-y-6">
            <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Holding Summary</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Holding Type</p>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {GOLD_TYPES.find(t => t.id === formData.goldType)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Quantity</p>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formData.quantity} {formData.unitType === 'gram' ? 'grams' : 'units'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Invested Amount</p>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatCurrency(formData.investedAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Purchase Date</p>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {new Date(formData.purchaseDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Estimated Current Value</p>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatCurrency(currentValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Gain/Loss</p>
                  <p className={`font-semibold ${gainLoss >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPct.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        );

      case 'saving':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Saving gold holding...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircleIcon className="w-16 h-16 text-[#16A34A] dark:text-[#22C55E] mb-4" />
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Gold holding saved successfully!
            </h3>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Your gold holding has been added to your portfolio.
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangleIcon className="w-16 h-16 text-[#DC2626] dark:text-[#EF4444] mb-4" />
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Failed to save gold holding
            </h3>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            )}
            <button
              onClick={() => setStep('form')}
              className="px-4 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'select' || step === 'error' || step === 'success' ? handleClose : undefined}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {isEditing ? 'Edit Gold Holding' : 'Add Gold Holding'}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {step === 'select' && 'Select gold type'}
              {step === 'form' && 'Enter details'}
              {step === 'review' && 'Review & confirm'}
              {step === 'saving' && 'Saving...'}
              {step === 'success' && 'Success!'}
              {step === 'error' && 'Error'}
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
          {step === 'select' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
          )}

          {(step === 'form' || step === 'review') && (
            <>
              <button
                onClick={handleBack}
                disabled={saving}
                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={step === 'form' ? handleNext : handleSave}
                disabled={saving}
                className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-50 font-medium"
              >
                {step === 'form' ? 'Next' : saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
              </button>
            </>
          )}

          {(step === 'success' || step === 'error') && (
            <button
              onClick={handleClose}
              className="ml-auto px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
