'use client';

/**
 * Add Insurance Page
 *
 * Step-based form for adding new insurance policies
 * Steps: Category → Details → Coverage & Premium → Nominee → Document
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import { LockedFeaturePage } from '@/components/LockedFeaturePage';
import { ArrowLeftIcon, ArrowRightIcon, UploadIcon } from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  InsuranceCategory,
  InsuranceStatus,
  LifePlanType,
  HealthCoverType,
} from '@/types/insurance';
import { formatInsuranceCategory, getCategoryIcon } from '@/lib/insurance-utils';

interface FormData {
  category: InsuranceCategory | '';
  policy_number: string;
  provider_name: string;
  policy_name: string;
  sum_assured: string;
  annual_premium: string;
  monthly_premium: string;
  policy_start_date: string;
  policy_end_date: string;
  next_renewal_date: string;
  plan_type: string;
  nominee_name: string;
  nominee_relation: string;
  family_members_count: string;
  document_url: string;
}

type StepType = 1 | 2 | 3 | 4 | 5;

export default function AddInsurancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<StepType>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    category: '',
    policy_number: '',
    provider_name: '',
    policy_name: '',
    sum_assured: '',
    annual_premium: '',
    monthly_premium: '',
    policy_start_date: '',
    policy_end_date: '',
    next_renewal_date: '',
    plan_type: '',
    nominee_name: '',
    nominee_relation: '',
    family_members_count: '',
    document_url: '',
  });

  // Pre-select category when arriving from onboarding tiles
  useEffect(() => {
    const category = searchParams?.get('category');
    if (category === InsuranceCategory.LIFE || category === InsuranceCategory.HEALTH) {
      setFormData(prev => ({ ...prev, category }));
    }
  }, [searchParams]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (step: StepType): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (!formData.category) {
          setError('Please select an insurance category');
          return false;
        }
        return true;

      case 2:
        if (!formData.policy_number.trim()) {
          setError('Policy number is required');
          return false;
        }
        if (!formData.provider_name.trim()) {
          setError('Provider name is required');
          return false;
        }
        if (!formData.policy_name.trim()) {
          setError('Policy name is required');
          return false;
        }
        return true;

      case 3:
        if (!formData.sum_assured || parseFloat(formData.sum_assured) <= 0) {
          setError('Sum assured must be greater than 0');
          return false;
        }
        if (!formData.annual_premium || parseFloat(formData.annual_premium) <= 0) {
          setError('Annual premium must be greater than 0');
          return false;
        }
        if (!formData.policy_start_date) {
          setError('Policy start date is required');
          return false;
        }
        return true;

      case 4:
        if (formData.category === InsuranceCategory.LIFE && !formData.plan_type) {
          setError('Plan type is required for life insurance');
          return false;
        }
        if (formData.category === InsuranceCategory.HEALTH && !formData.plan_type) {
          setError('Coverage type is required for health insurance');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep((currentStep + 1) as StepType);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepType);
      setError(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // Upload to Supabase Storage
      const fileName = `${user?.id}/${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('insurance-documents')
        .upload(fileName, file);

      if (uploadError) {
        // If bucket doesn't exist, allow form to proceed without document
        if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
          console.warn('Document storage not configured, proceeding without document upload');
          setFormData((prev) => ({
            ...prev,
            document_url: '',
          }));
          setLoading(false);
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('insurance-documents')
        .getPublicUrl(data.path);

      setFormData((prev) => ({
        ...prev,
        document_url: publicData.publicUrl,
      }));
      setError(null);
    } catch (err) {
      console.error('Document upload error:', err);
      // Don't block form submission if upload fails
      setFormData((prev) => ({
        ...prev,
        document_url: '',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const payload = {
        user_id: user.id,
        category: formData.category,
        policy_number: formData.policy_number.trim(),
        provider_name: formData.provider_name.trim(),
        policy_name: formData.policy_name.trim(),
        status: InsuranceStatus.ACTIVE,
        sum_assured: parseFloat(formData.sum_assured),
        annual_premium: parseFloat(formData.annual_premium),
        monthly_premium: formData.monthly_premium
          ? parseFloat(formData.monthly_premium)
          : null,
        policy_start_date: formData.policy_start_date,
        policy_end_date: formData.policy_end_date || null,
        next_renewal_date: formData.next_renewal_date || null,
        plan_type: formData.plan_type || null,
        nominee_name: formData.nominee_name || null,
        nominee_relation: formData.nominee_relation || null,
        family_members_count: formData.family_members_count
          ? parseInt(formData.family_members_count)
          : null,
        document_url: formData.document_url || null,
      };

      const { error: dbError } = await supabase
        .from('insurance_policies')
        .insert([payload]);

      if (dbError) throw dbError;

      const onboardingSource = searchParams?.get('from') === 'onboarding';
      router.push(onboardingSource ? '/portfolio/insurance?from=onboarding' : '/portfolio/insurance');
    } catch (err) {
      console.error('[Add Insurance] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add insurance');
      setLoading(false);
    }
  };

  const stepTitles = [
    'Select Category',
    'Policy Details',
    'Coverage & Premium',
    'Nominee & Plan',
    'Upload Document',
  ];

  const stepDescriptions = [
    'What type of insurance are you adding?',
    'Enter your policy information',
    'Set coverage amount and premium',
    'Nominee details and plan type',
    'Upload your policy document (optional)',
  ];

  if (!capabilitiesLoading && !hasCapability(FEATURE_ACCESS.INSURANCE.capability)) {
    return (
      <LockedFeaturePage
        title="Insurance"
        feature="INSURANCE"
      />
    );
  }

  const fromOnboarding = searchParams?.get('from') === 'onboarding';

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] overflow-x-hidden">
      <AppHeader
        showBackButton={true}
        backHref={fromOnboarding ? '/onboarding/select?step=add-details' : '/portfolio/insurance'}
        backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Insurance'}
      />

      <main className="max-w-2xl mx-auto px-6 py-8 pt-24">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="overflow-x-auto pb-1">
            <div className="flex items-center justify-between mb-4 min-w-[540px]">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    step <= currentStep
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#E5E7EB] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]'
                  }`}
                >
                  {step}
                </div>
                {step < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-colors ${
                      step < currentStep
                        ? 'bg-[#2563EB]'
                        : 'bg-[#E5E7EB] dark:bg-[#334155]'
                    }`}
                  />
                )}
              </div>
            ))}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {stepTitles[currentStep - 1]}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {stepDescriptions[currentStep - 1]}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Form Content */}
        <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Step 1: Category Selection */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {Object.values(InsuranceCategory).map((category) => (
                    <button
                      key={category}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, category }))
                      }
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                        formData.category === category
                          ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]'
                          : 'border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB]'
                      }`}
                    >
                      <span className="text-2xl">
                        {getCategoryIcon(category as InsuranceCategory)}
                      </span>
                      <div>
                        <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          {formatInsuranceCategory(category as InsuranceCategory)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Policy Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="policy_number">Policy Number *</Label>
                    <Input
                      id="policy_number"
                      name="policy_number"
                      value={formData.policy_number}
                      onChange={handleInputChange}
                      placeholder="e.g., POL123456789"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider_name">Provider Name *</Label>
                    <Input
                      id="provider_name"
                      name="provider_name"
                      value={formData.provider_name}
                      onChange={handleInputChange}
                      placeholder="e.g., HDFC Life, ICICI Prudential"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="policy_name">Policy Name *</Label>
                    <Input
                      id="policy_name"
                      name="policy_name"
                      value={formData.policy_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Term Plan 1 Crore"
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Coverage & Premium */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sum_assured">Sum Assured (₹) *</Label>
                    <Input
                      id="sum_assured"
                      name="sum_assured"
                      type="number"
                      value={formData.sum_assured}
                      onChange={handleInputChange}
                      placeholder="e.g., 10000000"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_premium">Annual Premium (₹) *</Label>
                    <Input
                      id="annual_premium"
                      name="annual_premium"
                      type="number"
                      value={formData.annual_premium}
                      onChange={handleInputChange}
                      placeholder="e.g., 5000"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_premium">Monthly Premium (₹)</Label>
                    <Input
                      id="monthly_premium"
                      name="monthly_premium"
                      type="number"
                      value={formData.monthly_premium}
                      onChange={handleInputChange}
                      placeholder="Optional - auto-calculated if empty"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="policy_start_date">Start Date *</Label>
                    <Input
                      id="policy_start_date"
                      name="policy_start_date"
                      type="date"
                      value={formData.policy_start_date}
                      onChange={handleInputChange}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="policy_end_date">End Date / Maturity Date</Label>
                    <Input
                      id="policy_end_date"
                      name="policy_end_date"
                      type="date"
                      value={formData.policy_end_date}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Nominee & Plan */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  {formData.category === InsuranceCategory.LIFE && (
                    <div>
                      <Label htmlFor="plan_type">Plan Type *</Label>
                      <select
                        id="plan_type"
                        name="plan_type"
                        value={formData.plan_type}
                        onChange={handleInputChange}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]"
                      >
                        <option value="">Select plan type</option>
                        {Object.values(LifePlanType).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.category === InsuranceCategory.HEALTH && (
                    <div>
                      <Label htmlFor="plan_type">Coverage Type *</Label>
                      <select
                        id="plan_type"
                        name="plan_type"
                        value={formData.plan_type}
                        onChange={handleInputChange}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]"
                      >
                        <option value="">Select coverage type</option>
                        {Object.values(HealthCoverType).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.category === InsuranceCategory.HEALTH && (
                    <div>
                      <Label htmlFor="family_members_count">Number of Family Members</Label>
                      <Input
                        id="family_members_count"
                        name="family_members_count"
                        type="number"
                        value={formData.family_members_count}
                        onChange={handleInputChange}
                        placeholder="e.g., 4"
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="nominee_name">Nominee Name</Label>
                    <Input
                      id="nominee_name"
                      name="nominee_name"
                      value={formData.nominee_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Spouse name"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nominee_relation">Relation to Nominee</Label>
                    <Input
                      id="nominee_relation"
                      name="nominee_relation"
                      value={formData.nominee_relation}
                      onChange={handleInputChange}
                      placeholder="e.g., Spouse, Child, Parent"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="next_renewal_date">Next Renewal Date</Label>
                    <Input
                      id="next_renewal_date"
                      name="next_renewal_date"
                      type="date"
                      value={formData.next_renewal_date}
                      onChange={handleInputChange}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Document Upload */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <Label>Policy Document (PDF)</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
                      Upload your policy document for reference (completely optional - you can skip this)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="w-full p-4 border-2 border-dashed border-[#E5E7EB] dark:border-[#334155] rounded-lg hover:border-[#2563EB] transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UploadIcon className="w-5 h-5" />
                      <span>
                        {loading
                          ? 'Uploading...'
                          : formData.document_url
                          ? 'Document uploaded ✓'
                          : 'Click to upload PDF (or skip)'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="btn-secondary-standard"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Step {currentStep} of 5
          </div>

          <Button
            onClick={handleNext}
            disabled={loading}
            className="btn-primary-standard"
          >
            {loading ? 'Saving...' : currentStep === 5 ? 'Add Policy' : 'Next'}
            {currentStep < 5 && <ArrowRightIcon className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </main>
    </div>
  );
}
