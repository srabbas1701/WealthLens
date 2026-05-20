'use client';

import { useEffect, useState } from 'react';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ArrowLeftIcon } from './icons';
import { useCurrency } from './AppHeader';

type SilverType = 'physical' | 'etf' | 'digital';
type Step = 'select' | 'form' | 'review' | 'saving' | 'success' | 'error';
type UnitType = 'gram' | 'unit';

interface SilverAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingHolding?: {
    id: string;
    silverType: SilverType;
    investedAmount: number;
    quantity: number;
    unitType: UnitType;
    purchaseDate: string;
    form?: 'jewellery' | 'coin' | 'bar';
    purity?: string;
    grossWeight?: number;
    netWeight?: number;
    makingCharges?: number;
    physicalQuantity?: number;
    totalGrams?: number;
    etfName?: string;
    isin?: string;
    exchange?: string;
    platform?: string;
    provider?: string;
    vaulted?: boolean;
  } | null;
}

interface FormData {
  silverType: SilverType | null;
  investedAmount: number | null;
  quantity: number | null;
  unitType: UnitType;
  purchaseDate: string;
  form: 'jewellery' | 'coin' | 'bar';
  purity: string;
  physicalQuantity: number | null;
  totalGrams: number | null;
  grossWeight: number | null;
  netWeight: number | null;
  makingCharges: number | null;
  etfName: string;
  schemeCode: string;
  isin: string;
  exchange: string;
  platform: string;
  provider: string;
  vaulted: boolean;
}

const SILVER_TYPES: Array<{ id: SilverType; name: string; description: string }> = [
  { id: 'physical', name: 'Physical Silver', description: 'Coins, bars, jewellery' },
  { id: 'etf', name: 'Silver ETF', description: 'Exchange traded silver funds' },
  { id: 'digital', name: 'Digital Silver', description: 'Platform-based digital silver' },
];

const DIGITAL_PLATFORMS = ['SafeGold', 'MMTC-PAMP', 'Paytm', 'PhonePe', 'Other'];

interface SilverETFOption {
  name: string;
  schemeCode: string;
  isin: string;
  exchange: 'NSE' | 'BSE';
  amc: string;
}

export default function SilverAddModal({ isOpen, onClose, userId, onSuccess, existingHolding }: SilverAddModalProps) {
  const { formatCurrency } = useCurrency();
  const isEditing = !!existingHolding;
  const [step, setStep] = useState<Step>(existingHolding ? 'form' : 'select');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [etfOptions, setEtfOptions] = useState<SilverETFOption[]>([]);
  const [loadingEtfOptions, setLoadingEtfOptions] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    silverType: null,
    investedAmount: null,
    quantity: null,
    unitType: 'gram',
    purchaseDate: new Date().toISOString().split('T')[0],
    form: 'coin',
    purity: '999',
    physicalQuantity: null,
    totalGrams: null,
    grossWeight: null,
    netWeight: null,
    makingCharges: null,
    etfName: '',
    schemeCode: '',
    isin: '',
    exchange: 'NSE',
    platform: '',
    provider: '',
    vaulted: false,
  });

  useEffect(() => {
    if (existingHolding && isOpen) {
      setFormData({
        silverType: existingHolding.silverType,
        investedAmount: existingHolding.investedAmount,
        quantity: existingHolding.quantity,
        unitType: existingHolding.unitType,
        purchaseDate: existingHolding.purchaseDate,
        form: existingHolding.form || 'coin',
        purity: existingHolding.purity || '999',
        physicalQuantity: existingHolding.physicalQuantity || null,
        totalGrams: existingHolding.totalGrams || null,
        grossWeight: existingHolding.grossWeight || null,
        netWeight: existingHolding.netWeight || null,
        makingCharges: existingHolding.makingCharges || null,
        etfName: existingHolding.etfName || '',
        schemeCode: '',
        isin: existingHolding.isin || '',
        exchange: existingHolding.exchange || 'NSE',
        platform: existingHolding.platform || '',
        provider: existingHolding.provider || '',
        vaulted: existingHolding.vaulted || false,
      });
      setStep('form');
    }
  }, [existingHolding, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || formData.silverType !== 'etf' || etfOptions.length > 0 || loadingEtfOptions) return;
    const loadSilverEtfs = async () => {
      setLoadingEtfOptions(true);
      try {
        const res = await fetch('/api/silver/etfs/list');
        const result = await res.json();
        if (res.ok && result.success && Array.isArray(result.items)) {
          setEtfOptions(result.items as SilverETFOption[]);
        }
      } catch {
        // Graceful fallback: manual ETF entry stays enabled below.
      } finally {
        setLoadingEtfOptions(false);
      }
    };

    loadSilverEtfs();
  }, [isOpen, formData.silverType, etfOptions.length, loadingEtfOptions]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleTypeSelect = (silverType: SilverType) => {
    setFormData(prev => ({
      ...prev,
      silverType,
      unitType: silverType === 'etf' ? 'unit' : 'gram',
    }));
    setStep('form');
  };

  const validate = (): boolean => {
    if (!formData.silverType) {
      setError('Please select silver type');
      return false;
    }
    if (!formData.investedAmount || formData.investedAmount <= 0) {
      setError('Please enter invested amount greater than 0');
      return false;
    }
    if (!formData.purchaseDate) {
      setError('Please select purchase date');
      return false;
    }

    if (formData.silverType === 'physical') {
      const isJewellery = formData.form === 'jewellery';
      if (isJewellery) {
        if (!formData.grossWeight || formData.grossWeight <= 0) {
          setError('Please enter gross weight');
          return false;
        }
        if (!formData.netWeight || formData.netWeight <= 0) {
          setError('Please enter net weight');
          return false;
        }
      } else {
        if (!formData.physicalQuantity || formData.physicalQuantity < 1) {
          setError('Please enter quantity');
          return false;
        }
        if (!formData.totalGrams || formData.totalGrams <= 0) {
          setError('Please enter total grams');
          return false;
        }
      }
    } else if (formData.silverType === 'etf') {
      if (!formData.etfName.trim()) {
        setError('Please enter ETF name');
        return false;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        setError('Please enter quantity');
        return false;
      }
    } else if (formData.silverType === 'digital') {
      if (!formData.platform.trim()) {
        setError('Please select platform');
        return false;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        setError('Please enter quantity');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setStep('saving');

    try {
      const isPhysical = formData.silverType === 'physical';
      const qty = isPhysical
        ? (formData.form === 'jewellery'
            ? (formData.netWeight || formData.grossWeight || 0)
            : (formData.totalGrams || 0))
        : (formData.quantity || 0);

      const response = await fetch('/api/silver/holdings', {
        method: existingHolding ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          holding_id: existingHolding?.id,
          silver_type: formData.silverType,
          invested_amount: formData.investedAmount,
          quantity: qty,
          unit_type: formData.silverType === 'etf' ? 'unit' : 'gram',
          purchase_date: formData.purchaseDate,
          form: isPhysical ? formData.form : undefined,
          purity: isPhysical ? formData.purity : undefined,
          gross_weight: isPhysical && formData.form === 'jewellery' ? formData.grossWeight : undefined,
          net_weight: isPhysical && formData.form === 'jewellery' ? formData.netWeight : undefined,
          making_charges: isPhysical && formData.form === 'jewellery' ? formData.makingCharges : undefined,
          physical_quantity: isPhysical && formData.form !== 'jewellery' ? formData.physicalQuantity : undefined,
          total_grams: isPhysical && formData.form !== 'jewellery' ? formData.totalGrams : undefined,
          etf_name: formData.silverType === 'etf' ? formData.etfName : undefined,
          scheme_code: formData.silverType === 'etf' ? formData.schemeCode : undefined,
          isin: formData.silverType === 'etf' ? formData.isin : undefined,
          exchange: formData.silverType === 'etf' ? formData.exchange : undefined,
          platform: formData.silverType === 'digital' ? formData.platform : undefined,
          provider: formData.silverType === 'digital' ? formData.provider : undefined,
          vaulted: formData.silverType === 'digital' ? formData.vaulted : undefined,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error || 'Failed to save silver holding');
        setStep('error');
        return;
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1200);
    } catch {
      setError('Failed to save silver holding. Please try again.');
      setStep('error');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'review') setStep('form');
    else if (step === 'form') setStep(isEditing ? 'form' : 'select');
  };

  const renderForm = () => {
    if (formData.silverType === 'physical') {
      const isJewellery = formData.form === 'jewellery';
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Invested Amount (₹) <span className="text-red-500">*</span></label>
              <input type="number" value={formData.investedAmount || ''} onChange={(e) => setFormData(prev => ({ ...prev, investedAmount: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Purchase Date <span className="text-red-500">*</span></label>
              <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Form</label>
              <select value={formData.form} onChange={(e) => setFormData(prev => ({ ...prev, form: e.target.value as 'jewellery' | 'coin' | 'bar' }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
                <option value="coin">Coin</option>
                <option value="bar">Bar</option>
                <option value="jewellery">Jewellery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Purity</label>
              <select value={formData.purity} onChange={(e) => setFormData(prev => ({ ...prev, purity: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
                <option value="999">999</option>
                <option value="925">925</option>
                <option value="900">900</option>
              </select>
            </div>
          </div>
          {isJewellery ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Gross Wt (g)</label>
                <input type="number" value={formData.grossWeight || ''} onChange={(e) => setFormData(prev => ({ ...prev, grossWeight: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Net Wt (g)</label>
                <input type="number" value={formData.netWeight || ''} onChange={(e) => setFormData(prev => ({ ...prev, netWeight: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Making (₹)</label>
                <input type="number" value={formData.makingCharges || ''} onChange={(e) => setFormData(prev => ({ ...prev, makingCharges: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Quantity</label>
                <input type="number" value={formData.physicalQuantity || ''} onChange={(e) => setFormData(prev => ({ ...prev, physicalQuantity: e.target.value ? parseInt(e.target.value, 10) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Total grams</label>
                <input type="number" value={formData.totalGrams || ''} onChange={(e) => setFormData(prev => ({ ...prev, totalGrams: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (formData.silverType === 'etf') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              ETF Name <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.schemeCode}
              onChange={(e) => {
                const selected = etfOptions.find(item => item.schemeCode === e.target.value);
                if (!selected) {
                  setFormData(prev => ({ ...prev, schemeCode: '', etfName: '', isin: '' }));
                  return;
                }
                setFormData(prev => ({
                  ...prev,
                  schemeCode: selected.schemeCode,
                  etfName: selected.name,
                  isin: selected.isin || prev.isin,
                  exchange: selected.exchange || prev.exchange,
                }));
              }}
              className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]"
            >
              <option value="">{loadingEtfOptions ? 'Loading Silver ETFs...' : 'Select a Silver ETF'}</option>
              {etfOptions.map((item) => (
                <option key={item.schemeCode} value={item.schemeCode}>
                  {item.name}
                </option>
              ))}
            </select>
            {etfOptions.length === 0 && !loadingEtfOptions && (
              <p className="mt-1 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                Live ETF list is unavailable right now. You can enter ETF details manually.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Invested Amount (₹) <span className="text-red-500">*</span></label>
              <input type="number" value={formData.investedAmount || ''} onChange={(e) => setFormData(prev => ({ ...prev, investedAmount: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Quantity <span className="text-red-500">*</span></label>
              <input type="number" value={formData.quantity || ''} onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">ETF Name (manual fallback)</label>
              <input type="text" value={formData.etfName} onChange={(e) => setFormData(prev => ({ ...prev, etfName: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">ISIN (optional)</label>
              <input type="text" value={formData.isin} onChange={(e) => setFormData(prev => ({ ...prev, isin: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Purchase Date <span className="text-red-500">*</span></label>
            <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Invested Amount (₹) <span className="text-red-500">*</span></label>
            <input type="number" value={formData.investedAmount || ''} onChange={(e) => setFormData(prev => ({ ...prev, investedAmount: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Quantity (g) <span className="text-red-500">*</span></label>
            <input type="number" value={formData.quantity || ''} onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Platform <span className="text-red-500">*</span></label>
            <select value={formData.platform} onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
              <option value="">Select platform</option>
              {DIGITAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Provider (optional)</label>
            <input type="text" value={formData.provider} onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">Purchase Date <span className="text-red-500">*</span></label>
          <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]" />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step === 'select' || step === 'error' || step === 'success' ? handleClose : undefined} />
      <div className="relative modal-shell-standard w-full max-w-3xl h-[calc(100dvh-1rem)] sm:h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] mx-0 sm:mx-4 overflow-hidden flex flex-col min-h-0">
        <div className="modal-header-standard">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{isEditing ? 'Edit Silver Holding' : 'Add Silver Holding'}</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {step === 'select' && 'Select silver type'}
              {step === 'form' && 'Enter details'}
              {step === 'review' && 'Review & confirm'}
              {step === 'saving' && 'Saving...'}
              {step === 'success' && 'Success!'}
              {step === 'error' && 'Error'}
            </p>
          </div>
          <button onClick={handleClose} disabled={saving} className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50">
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 md:p-6">
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-6">Select the type of silver holding you want to add</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SILVER_TYPES.map(type => (
                  <button key={type.id} onClick={() => handleTypeSelect(type.id)} className="p-6 text-left border-2 border-[#E5E7EB] dark:border-[#334155] rounded-xl hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] transition-all">
                    <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">{type.name}</h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'form' && renderForm()}

          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Holding Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Holding Type</p>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{SILVER_TYPES.find(t => t.id === formData.silverType)?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Invested Amount</p>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{formatCurrency(formData.investedAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Quantity</p>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {formData.silverType === 'physical'
                        ? (formData.form === 'jewellery' ? `${formData.netWeight || formData.grossWeight || 0} g` : `${formData.physicalQuantity || 0} items / ${formData.totalGrams || 0} g`)
                        : `${formData.quantity || 0} ${formData.unitType === 'unit' ? 'units' : 'g'}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Purchase Date</p>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{new Date(formData.purchaseDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Saving silver holding...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircleIcon className="w-16 h-16 text-[#16A34A] dark:text-[#22C55E] mb-4" />
              <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Silver holding saved successfully!</h3>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Your silver holding has been added to your portfolio.</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangleIcon className="w-16 h-16 text-[#DC2626] dark:text-[#EF4444] mb-4" />
              <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Failed to save silver holding</h3>
              {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
              <button onClick={() => setStep('form')} className="btn-primary-standard px-4 py-2">Try Again</button>
            </div>
          )}

          {error && (step === 'form' || step === 'review') && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-3 px-4 sm:px-5 md:px-6 py-3 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#334155]">
          {step === 'select' && (
            <button onClick={handleClose} className="flex-1 btn-secondary-standard justify-center">Back</button>
          )}
          {(step === 'form' || step === 'review') && (
            <>
              <button onClick={handleBack} disabled={saving} className="flex-1 btn-secondary-standard justify-center disabled:opacity-50">
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button onClick={step === 'form' ? () => validate() && setStep('review') : handleSave} disabled={saving} className="flex-1 btn-primary-standard justify-center px-6 py-2">
                {step === 'form' ? 'Next' : saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
              </button>
            </>
          )}
          {(step === 'success' || step === 'error') && (
            <button onClick={handleClose} className="flex-1 btn-primary-standard justify-center px-6 py-2">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
