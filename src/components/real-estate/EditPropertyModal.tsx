/**
 * Edit Property Modal
 *
 * Modal for editing all property information across multiple steps.
 * Mirrors the Add Property modal structure for consistency.
 *
 * Step 1: Basic Info (nickname, type, status)
 * Step 2: Financial Details (price, date, ownership, co-owner when < 100%)
 * Step 3: Location & Property Details (state dropdown, city datalist, pincode validation)
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  INDIA_STATES,
  getCitiesForState,
  isPincodeValidForState,
} from '@/constants/india-locations';

const CO_OWNER_RELATIONSHIPS = [
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Business Partner',
  'Other',
];

const today = new Date().toISOString().split('T')[0];
const MIN_DATE = '1900-01-01';

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  currentData: {
    propertyNickname: string;
    propertyType: string;
    propertyStatus: string;
    purchasePrice: number;
    purchaseDate: string;
    registrationValue: number | null;
    ownershipPercentage: number;
    city: string;
    state: string;
    pincode: string;
    address: string | null;
    projectName: string | null;
    builderName: string | null;
    reraNumber: string | null;
    carpetAreaSqft: number | null;
    builtupAreaSqft: number | null;
    coOwnerName: string | null;
    coOwnerRelationship: string | null;
  };
  onSuccess: () => void;
}

export default function EditPropertyModal({
  isOpen,
  onClose,
  propertyId,
  currentData,
  onSuccess,
}: EditPropertyModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pincodeMismatchWarning, setPincodeMismatchWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    property_nickname: '',
    property_type: 'residential' as 'residential' | 'commercial' | 'land',
    property_status: 'ready' as 'ready' | 'under_construction',
    purchase_price: '',
    purchase_date: '',
    registration_value: '',
    ownership_percentage: '100',
    co_owner_name: '',
    co_owner_relationship: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    project_name: '',
    builder_name: '',
    rera_number: '',
    carpet_area_sqft: '',
    builtup_area_sqft: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        property_nickname: currentData.propertyNickname || '',
        property_type:
          (currentData.propertyType as 'residential' | 'commercial' | 'land') || 'residential',
        property_status:
          (currentData.propertyStatus as 'ready' | 'under_construction') || 'ready',
        purchase_price: currentData.purchasePrice?.toString() || '',
        purchase_date: currentData.purchaseDate || '',
        registration_value: currentData.registrationValue?.toString() || '',
        ownership_percentage: currentData.ownershipPercentage?.toString() || '100',
        co_owner_name: currentData.coOwnerName || '',
        co_owner_relationship: currentData.coOwnerRelationship || '',
        city: currentData.city || '',
        state: currentData.state || '',
        pincode: currentData.pincode || '',
        address: currentData.address || '',
        project_name: currentData.projectName || '',
        builder_name: currentData.builderName || '',
        rera_number: currentData.reraNumber || '',
        carpet_area_sqft: currentData.carpetAreaSqft?.toString() || '',
        builtup_area_sqft: currentData.builtupAreaSqft?.toString() || '',
      });
      setCurrentStep(1);
      setError(null);
      setPincodeMismatchWarning(null);
    }
  }, [isOpen, currentData]);

  const ownership = parseFloat(formData.ownership_percentage) || 100;
  const showCoOwner = ownership < 100;
  const citySuggestions = getCitiesForState(formData.state);

  const handleStateChange = (newState: string) => {
    // When state changes, clear city and pincode to avoid stale data
    setFormData({ ...formData, state: newState, city: '', pincode: '' });
    setPincodeMismatchWarning(null);
  };

  const handlePincodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setFormData({ ...formData, pincode: digits });
    if (digits.length === 6 && formData.state) {
      const valid = isPincodeValidForState(digits, formData.state);
      if (!valid) {
        setPincodeMismatchWarning(
          `This pincode doesn't match the expected range for ${formData.state}. Verify it's correct.`
        );
      } else {
        setPincodeMismatchWarning(null);
      }
    } else {
      setPincodeMismatchWarning(null);
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    if (step === 1) {
      if (!formData.property_nickname.trim()) {
        setError('Property nickname is required');
        return false;
      }
    } else if (step === 2) {
      if (!formData.purchase_price || parseFloat(formData.purchase_price) <= 0) {
        setError('Purchase price is required and must be greater than 0');
        return false;
      }
      if (!formData.purchase_date) {
        setError('Purchase date is required');
        return false;
      }
      const year = new Date(formData.purchase_date).getFullYear();
      if (year < 1900 || year > new Date().getFullYear()) {
        setError('Purchase date must be between 1900 and today');
        return false;
      }
      if (formData.registration_value) {
        const regVal = parseFloat(formData.registration_value);
        if (isNaN(regVal) || regVal < 0) {
          setError('Registration value cannot be negative');
          return false;
        }
      }
      const ownershipVal = parseFloat(formData.ownership_percentage);
      if (isNaN(ownershipVal) || ownershipVal <= 0 || ownershipVal > 100) {
        setError('Ownership percentage must be between 1 and 100');
        return false;
      }
    } else if (step === 3) {
      if (!formData.address.trim()) {
        setError('Address is required');
        return false;
      }
      if (!formData.city.trim()) {
        setError('City is required');
        return false;
      }
      if (!formData.state.trim()) {
        setError('State is required');
        return false;
      }
      if (!formData.pincode.trim()) {
        setError('Pincode is required');
        return false;
      }
      if (!/^\d{6}$/.test(formData.pincode)) {
        setError('Pincode must be exactly 6 digits');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        property_nickname: formData.property_nickname.trim(),
        property_type: formData.property_type,
        property_status: formData.property_status,
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
        registration_value: formData.registration_value
          ? parseFloat(formData.registration_value)
          : null,
        ownership_percentage: parseFloat(formData.ownership_percentage) || 100,
        co_owner_name: formData.co_owner_name.trim() || null,
        co_owner_relationship: formData.co_owner_relationship || null,
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        address: formData.address.trim() || null,
        project_name: formData.project_name.trim() || null,
        builder_name: formData.builder_name.trim() || null,
        rera_number: formData.rera_number.trim() || null,
        carpet_area_sqft: formData.carpet_area_sqft
          ? parseFloat(formData.carpet_area_sqft)
          : null,
        builtup_area_sqft: formData.builtup_area_sqft
          ? parseFloat(formData.builtup_area_sqft)
          : null,
      };

      const response = await fetch(`/api/real-estate/assets/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update property');
      }

      onSuccess();
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('[EditPropertyModal] Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update property');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectCls =
    'w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]';
  const hintCls = 'text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1';
  const warnCls = 'text-xs text-amber-600 dark:text-amber-400 mt-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Edit Property
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {currentStep === 1 && 'Step 1: Basic Information'}
              {currentStep === 2 && 'Step 2: Financial Details'}
              {currentStep === 3 && 'Step 3: Location & Property Details'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* ────────────────── STEP 1 ────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyNickname" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Property Nickname <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="propertyNickname"
                  type="text"
                  value={formData.property_nickname}
                  onChange={(e) =>
                    setFormData({ ...formData, property_nickname: e.target.value })
                  }
                  placeholder="e.g., My Home, Rental Apartment"
                  required
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyType" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Property Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="propertyType"
                  value={formData.property_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property_type: e.target.value as 'residential' | 'commercial' | 'land',
                    })
                  }
                  className={selectCls}
                  required
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyStatus" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Property Status <span className="text-red-500">*</span>
                </Label>
                <select
                  id="propertyStatus"
                  value={formData.property_status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property_status: e.target.value as 'ready' | 'under_construction',
                    })
                  }
                  className={selectCls}
                  required
                >
                  <option value="ready">Ready</option>
                  <option value="under_construction">Under Construction</option>
                </select>
              </div>
            </div>
          )}

          {/* ────────────────── STEP 2 ────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Purchase Price (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    setFormData({ ...formData, purchase_price: e.target.value })
                  }
                  placeholder="e.g. 7500000"
                  required
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
                <p className={hintCls}>
                  Used for unrealized gain, XIRR, and valuation fallback — important for all analytics.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Purchase Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  min={MIN_DATE}
                  max={today}
                  value={formData.purchase_date}
                  onChange={(e) =>
                    setFormData({ ...formData, purchase_date: e.target.value })
                  }
                  required
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationValue" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Registration Value (₹)
                </Label>
                <Input
                  id="registrationValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.registration_value}
                  onChange={(e) =>
                    setFormData({ ...formData, registration_value: e.target.value })
                  }
                  placeholder="Optional"
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
                <p className={hintCls}>
                  Value declared at registration (for stamp duty). Often differs from purchase price.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownershipPercentage" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Ownership Percentage (%)
                </Label>
                <Input
                  id="ownershipPercentage"
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={formData.ownership_percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, ownership_percentage: e.target.value })
                  }
                  placeholder="100"
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
                <p className={hintCls}>
                  Enter 100 if you&apos;re the sole owner. For jointly owned property, enter your share (e.g., 50).
                </p>
              </div>

              {/* Co-owner section — shown when ownership < 100% */}
              {showCoOwner && (
                <div className="p-4 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] space-y-4">
                  <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide">
                    Joint Owner Details
                  </p>
                  <p className={hintCls}>
                    You own {formData.ownership_percentage}% — capture your co-owner&apos;s details for reference.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="coOwnerName" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      Co-owner Name
                    </Label>
                    <Input
                      id="coOwnerName"
                      type="text"
                      value={formData.co_owner_name}
                      onChange={(e) =>
                        setFormData({ ...formData, co_owner_name: e.target.value })
                      }
                      placeholder="e.g. Priya Sharma"
                      className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coOwnerRelationship" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      Relationship
                    </Label>
                    <select
                      id="coOwnerRelationship"
                      value={formData.co_owner_relationship}
                      onChange={(e) =>
                        setFormData({ ...formData, co_owner_relationship: e.target.value })
                      }
                      className={selectCls}
                    >
                      <option value="">Select relationship</option>
                      {CO_OWNER_RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────── STEP 3 ────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="e.g., 123 Main Street, Sector 1"
                  required
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
              </div>

              {/* State dropdown */}
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  State <span className="text-red-500">*</span>
                </Label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className={selectCls}
                  required
                >
                  <option value="">Select state</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* City with datalist filtered by state */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  City <span className="text-red-500">*</span>
                </Label>
                <input
                  id="city"
                  type="text"
                  list="edit-city-suggestions"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder={formData.state ? 'Type or select city' : 'Select a state first'}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                />
                <datalist id="edit-city-suggestions">
                  {citySuggestions.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                {formData.state && citySuggestions.length > 0 && !formData.city && (
                  <p className={hintCls}>
                    Showing cities for {formData.state}. You may also type a city not in this list.
                  </p>
                )}
              </div>

              {/* Pincode with state validation */}
              <div className="space-y-2">
                <Label htmlFor="pincode" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="6-digit pincode"
                  required
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
                {pincodeMismatchWarning && (
                  <p className={warnCls}>{pincodeMismatchWarning}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    Project Name
                  </Label>
                  <Input
                    id="projectName"
                    type="text"
                    value={formData.project_name}
                    onChange={(e) =>
                      setFormData({ ...formData, project_name: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="builderName" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    Builder Name
                  </Label>
                  <Input
                    id="builderName"
                    type="text"
                    value={formData.builder_name}
                    onChange={(e) =>
                      setFormData({ ...formData, builder_name: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reraNumber" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    RERA Number
                  </Label>
                  <Input
                    id="reraNumber"
                    type="text"
                    value={formData.rera_number}
                    onChange={(e) =>
                      setFormData({ ...formData, rera_number: e.target.value })
                    }
                    placeholder="e.g. P51700012345"
                    className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carpetArea" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    Carpet Area (sq ft)
                  </Label>
                  <Input
                    id="carpetArea"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.carpet_area_sqft}
                    onChange={(e) =>
                      setFormData({ ...formData, carpet_area_sqft: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                  <p className={hintCls}>Usable floor area (excludes walls). Preferred for valuation.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="builtupArea" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    Built-up Area (sq ft)
                  </Label>
                  <Input
                    id="builtupArea"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.builtup_area_sqft}
                    onChange={(e) =>
                      setFormData({ ...formData, builtup_area_sqft: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                  <p className={hintCls}>Includes walls and common areas. Must be ≥ carpet area.</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#0F172A]">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={loading || currentStep === 1}
            className="border-[#E5E7EB] dark:border-[#334155]"
          >
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Step {currentStep} of 3
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-[#E5E7EB] dark:border-[#334155]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white"
            >
              {loading ? 'Saving...' : currentStep === 3 ? 'Update Property' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
