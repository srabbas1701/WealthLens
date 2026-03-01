/**
 * Real Estate Add Modal Component
 *
 * 3-step wizard for adding a new real estate property.
 *
 * Step 1: Basic Info (nickname, type, status)
 * Step 2: Financial Details (price, date, ownership, co-owner when < 100%)
 * Step 3: Location & Property Details (state dropdown, city datalist, pincode validation)
 */

'use client';

import { useState } from 'react';
import { XIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
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

interface RealEstateAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RealEstateAddModal({
  isOpen,
  onClose,
  onSuccess,
}: RealEstateAddModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pincodeMismatchWarning, setPincodeMismatchWarning] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    property_nickname: '',
    property_type: 'residential' as 'residential' | 'commercial' | 'land',
    property_status: 'ready' as 'ready' | 'under_construction',
    // Step 2: Financial Details
    purchase_price: '',
    purchase_date: '',
    registration_value: '',
    ownership_percentage: '100',
    co_owner_name: '',
    co_owner_relationship: '',
    // Step 3: Location & Details
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

  const ownership = parseFloat(formData.ownership_percentage) || 100;
  const showCoOwner = ownership < 100;
  const citySuggestions = getCitiesForState(formData.state);

  const handleStateChange = (newState: string) => {
    setFormData({ ...formData, state: newState, city: '', pincode: '' });
    setPincodeMismatchWarning(null);
  };

  const handlePincodeChange = (value: string) => {
    setFormData({ ...formData, pincode: value });
    if (value.length === 6 && formData.state) {
      const valid = isPincodeValidForState(value, formData.state);
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
      const price = parseFloat(formData.purchase_price);
      if (!formData.purchase_price || price <= 0) {
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

    setSaving(true);

    try {
      const response = await fetch('/api/real-estate/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
        // Reset form
        setCurrentStep(1);
        setFormData({
          property_nickname: '',
          property_type: 'residential',
          property_status: 'ready',
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
        setPincodeMismatchWarning(null);
      } else {
        setError(result.error || 'Failed to add property');
      }
    } catch (err) {
      console.error('[RealEstateAddModal] Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputCls =
    'w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]';
  const labelCls = 'block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1';
  const hintCls = 'text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1';
  const warnCls = 'text-xs text-amber-600 dark:text-amber-400 mt-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Add Property
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {currentStep === 1 && 'Step 1: Basic Information'}
              {currentStep === 2 && 'Step 2: Financial Details'}
              {currentStep === 3 && 'Step 3: Location & Property Details'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNext();
            }}
            className="space-y-5"
          >
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* ────────────────── STEP 1 ────────────────── */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className={labelCls}>
                    Property Nickname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.property_nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, property_nickname: e.target.value })
                    }
                    className={inputCls}
                    placeholder="e.g., My Home, Rental Apartment"
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.property_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_type: e.target.value as 'residential' | 'commercial' | 'land',
                      })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Property Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.property_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property_status: e.target.value as 'ready' | 'under_construction',
                      })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="ready">Ready</option>
                    <option value="under_construction">Under Construction</option>
                  </select>
                </div>
              </>
            )}

            {/* ────────────────── STEP 2 ────────────────── */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className={labelCls}>
                    Purchase Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formData.purchase_price}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_price: e.target.value })
                    }
                    className={inputCls}
                    placeholder="e.g. 7500000"
                    required
                  />
                  <p className={hintCls}>
                    Used for unrealized gain, XIRR, and valuation fallback — important for all analytics.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={MIN_DATE}
                    max={today}
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_date: e.target.value })
                    }
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Registration Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.registration_value}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_value: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Optional"
                  />
                  <p className={hintCls}>
                    Value declared at registration (for stamp duty). Often differs from purchase price.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Ownership Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    value={formData.ownership_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, ownership_percentage: e.target.value })
                    }
                    className={inputCls}
                    placeholder="100"
                  />
                  <p className={hintCls}>
                    Enter 100 if you&apos;re the sole owner. For jointly owned property, enter your share (e.g., 50 for co-owner).
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

                    <div>
                      <label className={labelCls}>Co-owner Name</label>
                      <input
                        type="text"
                        value={formData.co_owner_name}
                        onChange={(e) =>
                          setFormData({ ...formData, co_owner_name: e.target.value })
                        }
                        className={inputCls}
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Relationship</label>
                      <select
                        value={formData.co_owner_relationship}
                        onChange={(e) =>
                          setFormData({ ...formData, co_owner_relationship: e.target.value })
                        }
                        className={inputCls}
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
              </>
            )}

            {/* ────────────────── STEP 3 ────────────────── */}
            {currentStep === 3 && (
              <>
                <div>
                  <label className={labelCls}>
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Full address of the property"
                    rows={3}
                    required
                  />
                </div>

                {/* State dropdown */}
                <div>
                  <label className={labelCls}>
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className={inputCls}
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
                <div>
                  <label className={labelCls}>
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="city-suggestions"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className={inputCls}
                    placeholder={formData.state ? 'Type or select city' : 'Select a state first'}
                    required
                  />
                  <datalist id="city-suggestions">
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
                <div>
                  <label className={labelCls}>
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                    className={inputCls}
                    placeholder="6-digit pincode"
                    required
                  />
                  {pincodeMismatchWarning && (
                    <p className={warnCls}>{pincodeMismatchWarning}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Project Name</label>
                    <input
                      type="text"
                      value={formData.project_name}
                      onChange={(e) =>
                        setFormData({ ...formData, project_name: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Builder Name</label>
                    <input
                      type="text"
                      value={formData.builder_name}
                      onChange={(e) =>
                        setFormData({ ...formData, builder_name: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>RERA Number</label>
                  <input
                    type="text"
                    value={formData.rera_number}
                    onChange={(e) =>
                      setFormData({ ...formData, rera_number: e.target.value })
                    }
                    className={inputCls}
                    placeholder="e.g. P51700012345 (format varies by state)"
                  />
                  <p className={hintCls}>
                    From your allotment letter or builder&apos;s RERA certificate. Optional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Carpet Area (sq ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={formData.carpet_area_sqft}
                      onChange={(e) =>
                        setFormData({ ...formData, carpet_area_sqft: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Optional"
                    />
                    <p className={hintCls}>
                      Usable floor area (excludes walls). Preferred for valuation.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Built-up Area (sq ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={formData.builtup_area_sqft}
                      onChange={(e) =>
                        setFormData({ ...formData, builtup_area_sqft: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Optional"
                    />
                    <p className={hintCls}>Includes walls and common areas. Must be ≥ carpet area.</p>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Footer / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#334155]">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                Previous
              </button>
            )}
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Step {currentStep} of 3
            </span>
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : currentStep === 3 ? 'Add Property' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
