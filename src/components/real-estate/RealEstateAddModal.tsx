/**
 * Real Estate Add Modal Component
 * 
 * Basic modal for adding Real Estate properties.
 * Can be enhanced later with multi-step wizard.
 */

'use client';

import { useState } from 'react';
import { XIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!validateStep(3)) {
      return;
    }

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
          registration_value: formData.registration_value ? parseFloat(formData.registration_value) : null,
          ownership_percentage: parseFloat(formData.ownership_percentage) || 100,
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          address: formData.address.trim() || null,
          project_name: formData.project_name.trim() || null,
          builder_name: formData.builder_name.trim() || null,
          rera_number: formData.rera_number.trim() || null,
          carpet_area_sqft: formData.carpet_area_sqft ? parseFloat(formData.carpet_area_sqft) : null,
          builtup_area_sqft: formData.builtup_area_sqft ? parseFloat(formData.builtup_area_sqft) : null,
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
        router.refresh();
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
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Property Nickname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.property_nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, property_nickname: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="e.g., My Home, Rental Apartment"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
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
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    required
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
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
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    required
                  >
                    <option value="ready">Ready</option>
                    <option value="under_construction">Under Construction</option>
                  </select>
                </div>
              </>
            )}

            {/* Step 2: Financial Details */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Purchase Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_price: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_date: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Registration Value (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.registration_value}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_value: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Ownership Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.ownership_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, ownership_percentage: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="100"
                  />
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    Default: 100% (full ownership)
                  </p>
                </div>
              </>
            )}

            {/* Step 3: Location & Property Details */}
            {currentStep === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="Full address of the property"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="Mumbai"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="Maharashtra"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="400001"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={formData.project_name}
                      onChange={(e) =>
                        setFormData({ ...formData, project_name: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Builder Name
                    </label>
                    <input
                      type="text"
                      value={formData.builder_name}
                      onChange={(e) =>
                        setFormData({ ...formData, builder_name: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    RERA Number
                  </label>
                  <input
                    type="text"
                    value={formData.rera_number}
                    onChange={(e) =>
                      setFormData({ ...formData, rera_number: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Carpet Area (sq ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.carpet_area_sqft}
                      onChange={(e) =>
                        setFormData({ ...formData, carpet_area_sqft: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                      Built-up Area (sq ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.builtup_area_sqft}
                      onChange={(e) =>
                        setFormData({ ...formData, builtup_area_sqft: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#3B82F6]"
                      placeholder="Optional"
                    />
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
