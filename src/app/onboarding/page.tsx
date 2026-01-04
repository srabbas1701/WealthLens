/**
 * Onboarding Page
 * 
 * Multi-step onboarding flow for new users.
 * 
 * USER FLOW RULES:
 * - Only accessible to authenticated users WITHOUT a portfolio
 * - Users with existing portfolio are redirected to /dashboard
 * - Onboarding runs ONCE - existing users never see this again
 * 
 * STEPS:
 * 1. Welcome - Name collection
 * 2. Contact Details - Progressive collection (ask for missing contact)
 * 3. Goals - Investment goals selection
 * 4. Risk - Risk comfort assessment
 * 5. Investments - Portfolio upload or manual entry
 * 6. Confirmation - Summary and redirect to dashboard
 * 
 * PROGRESSIVE CONTACT COLLECTION:
 * - If user logged in via mobile → ask for email
 * - If user logged in via email → ask for mobile
 * - Verification is NON-BLOCKING (user can skip or verify later)
 * 
 * DESIGN PRINCIPLES:
 * - Calm, trust-first language
 * - Every step is skippable
 * - No financial jargon
 * - Subtle insight hints
 * - No blocking validations
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SparklesIcon, ArrowRightIcon, ArrowLeftIcon, CheckCircleIcon, LockIcon, UploadIcon, PlusIcon, MailIcon, PhoneIcon } from '@/components/icons';
import PortfolioUploadModal from '@/components/PortfolioUploadModal';
import { useAuth } from '@/lib/auth';

type Step = 'welcome' | 'contact' | 'goals' | 'risk' | 'investments' | 'confirmation';

interface OnboardingData {
  name: string;
  // Contact details (progressive collection)
  secondaryContact: string;
  secondaryContactType: 'email' | 'phone' | null;
  goals: string[];
  timeHorizon: string;
  riskComfort: string;
  investments: { name: string; type: string; value: string }[];
}

const STEPS: Step[] = ['welcome', 'contact', 'goals', 'risk', 'investments', 'confirmation'];

// Country codes for India-focused app
const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { 
    user, 
    authStatus, 
    hasPortfolio, 
    profile, 
    refreshProfile, 
    authMethod,
    sendEmailVerification,
    sendPhoneVerification,
    verifyPhoneOtp,
  } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    secondaryContact: '',
    secondaryContactType: null,
    goals: [],
    timeHorizon: '',
    riskComfort: '',
    investments: [],
  });
  
  // Contact verification state
  const [countryCode, setCountryCode] = useState('+91');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Portfolio upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Pre-fill name from profile if available
  useEffect(() => {
    if (profile?.full_name && !data.name) {
      setData(prev => ({ ...prev, name: profile.full_name || '' }));
    }
  }, [profile, data.name]);
  
  // Set secondary contact type based on auth method
  useEffect(() => {
    if (authMethod && !data.secondaryContactType) {
      // If user logged in via mobile, ask for email
      // If user logged in via email, ask for phone
      setData(prev => ({
        ...prev,
        secondaryContactType: authMethod === 'mobile' ? 'email' : 'phone',
      }));
    }
  }, [authMethod, data.secondaryContactType]);
  
  // GUARD: Redirect if user already has portfolio (existing user)
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    // GUARD: Block redirects during loading
    if (authStatus === 'loading') return;
    
    // Auth state resolved - check if user has portfolio
    if (authStatus === 'authenticated' && hasPortfolio) {
      // Existing user - redirect to dashboard
      router.replace('/dashboard');
    }
  }, [authStatus, hasPortfolio, router]);
  
  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    // GUARD: Block redirects during loading
    if (authStatus === 'loading') return;
    
    // Auth state resolved - check authentication
    if (authStatus === 'unauthenticated') {
      // Unauthenticated - redirect to login
      router.replace('/login?redirect=/onboarding');
    }
  }, [authStatus, router]);

  const currentIndex = STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  const next = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const back = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const skip = () => next();

  /**
   * Handle sending verification for secondary contact
   */
  const handleSendVerification = async () => {
    setVerificationError(null);
    setIsVerifying(true);
    
    try {
      if (data.secondaryContactType === 'email') {
        const { error } = await sendEmailVerification(data.secondaryContact);
        if (error) {
          setVerificationError(error.message);
        } else {
          setVerificationSent(true);
        }
      } else if (data.secondaryContactType === 'phone') {
        const fullPhone = `${countryCode}${data.secondaryContact.replace(/\D/g, '')}`;
        const { error } = await sendPhoneVerification(fullPhone);
        if (error) {
          setVerificationError(error.message);
        } else {
          setVerificationSent(true);
          setShowOtpInput(true);
        }
      }
    } catch {
      setVerificationError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  /**
   * Handle OTP verification for phone
   */
  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setVerificationError('Please enter the complete 6-digit OTP');
      return;
    }
    
    setVerificationError(null);
    setIsVerifying(true);
    
    try {
      const fullPhone = `${countryCode}${data.secondaryContact.replace(/\D/g, '')}`;
      const { error } = await verifyPhoneOtp(fullPhone, otpValue);
      
      if (error) {
        setVerificationError(error.message);
        setOtp(['', '', '', '', '', '']);
      } else {
        // Success - move to next step
        next();
      }
    } catch {
      setVerificationError('Could not verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  /**
   * Handle OTP input change
   */
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };
  
  /**
   * Handle OTP keydown
   */
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };
  
  /**
   * Save contact and continue (without verification)
   */
  const handleSaveAndContinue = async () => {
    if (data.secondaryContact) {
      // Save contact but don't require verification
      await handleSendVerification();
    }
    next();
  };

  /**
   * Save onboarding data and complete the flow
   */
  const complete = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Save onboarding data to the API
      const response = await fetch('/api/onboarding/understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          full_name: data.name,
          goals: data.goals,
          time_horizon: data.timeHorizon,
          risk_comfort: data.riskComfort,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save onboarding data');
      }
      
      // Refresh profile to get updated data
      await refreshProfile();
      
      // Redirect to dashboard
      router.replace('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still redirect - don't block user
      router.replace('/dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle successful portfolio upload
   */
  const handleUploadSuccess = () => {
    setUploadedCount(prev => prev + 1);
    // Refresh profile to update hasPortfolio state
    refreshProfile();
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // GUARD: Redirect if user has portfolio (only after loading is complete)
  if (authStatus === 'authenticated' && hasPortfolio) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">WealthLens</span>
          </div>
          <span className="text-sm text-gray-500">Step {currentIndex + 1} of {STEPS.length}</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-100">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          
          {/* Step 1: Welcome */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Welcome to WealthLens
              </h1>
              <p className="text-gray-600 mb-8">
                Let's set up your portfolio. This takes about 5 minutes.
              </p>

              <div className="mb-8">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              {/* Trust Message */}
              <div className="bg-emerald-50 rounded-lg p-4 mb-8 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <LockIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-emerald-800">No bank login required</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      We never access your bank accounts. You control what you share.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={next}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                Continue
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Contact Details (Progressive Collection) */}
          {currentStep === 'contact' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Contact details <span className="text-gray-400 font-normal text-lg">(recommended)</span>
              </h2>
              <p className="text-gray-600 mb-6">
                For best portfolio matching and future integrations, use the same {data.secondaryContactType === 'email' ? 'email' : 'mobile'} you've used for your investments.
              </p>

              {/* Show what's already connected */}
              <div className="mb-6 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-800">
                    {authMethod === 'mobile' ? (
                      <>Connected via mobile: <span className="font-medium">{user?.phone}</span></>
                    ) : (
                      <>Connected via email: <span className="font-medium">{user?.email}</span></>
                    )}
                  </span>
                </div>
              </div>

              {/* Ask for the OTHER contact method */}
              {data.secondaryContactType === 'email' ? (
                /* Email Input */
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MailIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={data.secondaryContact}
                      onChange={(e) => setData({ ...data, secondaryContact: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>
                  {verificationSent && !verificationError && (
                    <p className="mt-2 text-sm text-emerald-600">
                      ✓ Verification email sent! You can verify later.
                    </p>
                  )}
                </div>
              ) : (
                /* Phone Input */
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-28 px-3 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                    >
                      {COUNTRY_CODES.map((cc) => (
                        <option key={cc.code} value={cc.code}>
                          {cc.flag} {cc.code}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PhoneIcon className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={data.secondaryContact}
                        onChange={(e) => setData({ ...data, secondaryContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit number"
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  
                  {/* OTP Input (shown after sending) */}
                  {showOtpInput && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                        Enter 6-digit OTP
                      </label>
                      <div className="flex justify-center gap-2">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpInputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-10 h-12 text-center text-lg font-semibold rounded-lg border border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {verificationSent && !showOtpInput && (
                    <p className="mt-2 text-sm text-emerald-600">
                      ✓ OTP sent! You can verify now or later.
                    </p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {verificationError && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-sm text-amber-800">{verificationError}</p>
                </div>
              )}

              {/* Why this matters */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg mb-8">
                <SparklesIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Why add this?</span> We can match your investments from different platforms and send you important updates.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={back} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={skip} 
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleSaveAndContinue}
                    disabled={isVerifying}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        Save & Continue
                        <ArrowRightIcon className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals & Time Horizon */}
          {currentStep === 'goals' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What are you investing for?
              </h2>
              <p className="text-gray-600 mb-8">
                Select all that apply. This helps me explain your portfolio better.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { id: 'retirement', label: 'Retirement', icon: '🏖️' },
                  { id: 'home', label: 'Buy a Home', icon: '🏠' },
                  { id: 'education', label: 'Education', icon: '🎓' },
                  { id: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
                  { id: 'wealth', label: 'Wealth Building', icon: '💰' },
                  { id: 'other', label: 'Other Goals', icon: '✨' },
                ].map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => {
                      const goals = data.goals.includes(goal.id)
                        ? data.goals.filter((g) => g !== goal.id)
                        : [...data.goals, goal.id];
                      setData({ ...data, goals });
                    }}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      data.goals.includes(goal.id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{goal.icon}</span>
                    <span className="font-medium text-gray-900 text-sm">{goal.label}</span>
                  </button>
                ))}
              </div>

              {/* Time Horizon */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  When do you need this money?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '1-3', label: '1-3 yrs' },
                    { id: '3-5', label: '3-5 yrs' },
                    { id: '5-10', label: '5-10 yrs' },
                    { id: '10+', label: '10+ yrs' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setData({ ...data, timeHorizon: option.id })}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                        data.timeHorizon === option.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insight Hint */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg mb-8">
                <SparklesIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">This helps provide better insights:</span> We'll show how your investments align with these goals.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={back} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={skip} className="text-sm text-gray-500 hover:text-gray-700">
                    Skip
                  </button>
                  <button
                    onClick={next}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Continue
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Risk Comfort (Emotion-based) */}
          {currentStep === 'risk' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                How do you feel about risk?
              </h2>
              <p className="text-gray-600 mb-8">
                There's no right answer. This helps me understand your comfort level.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { 
                    id: 'cautious', 
                    label: 'I prefer safety', 
                    desc: 'I sleep better knowing my money is secure, even if returns are lower',
                    emoji: '🛡️'
                  },
                  { 
                    id: 'balanced', 
                    label: 'I can handle some ups and downs', 
                    desc: 'Some volatility is okay if it means better long-term growth',
                    emoji: '⚖️'
                  },
                  { 
                    id: 'growth', 
                    label: 'I focus on growth', 
                    desc: "I'm comfortable with volatility for higher potential returns",
                    emoji: '📈'
                  },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, riskComfort: option.id })}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      data.riskComfort === option.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{option.emoji}</span>
                      <div>
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{option.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Insight Hint */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg mb-8">
                <SparklesIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">This helps provide better insights:</span> We'll highlight if your portfolio matches your comfort level.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={back} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={skip} className="text-sm text-gray-500 hover:text-gray-700">
                    Skip
                  </button>
                  <button
                    onClick={next}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Continue
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Add Investments */}
          {currentStep === 'investments' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Add your investments
              </h2>
              <p className="text-gray-600 mb-6">
                Upload your portfolio or add investments manually.
              </p>

              {/* Security Note */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100 mb-6">
                <LockIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-800">Your data is encrypted and never shared</span>
              </div>

              {/* Upload Success Indicator */}
              {uploadedCount > 0 && (
                <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-800 font-medium">
                      Portfolio uploaded successfully!
                    </span>
                  </div>
                </div>
              )}

              {/* Investment List (manual entries) */}
              {data.investments.length > 0 && (
                <div className="space-y-2 mb-6">
                  {data.investments.map((inv, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{inv.name}</p>
                        <p className="text-xs text-gray-500">{inv.type} • ₹{parseInt(inv.value).toLocaleString('en-IN')}</p>
                      </div>
                      <button
                        onClick={() => setData({ ...data, investments: data.investments.filter((_, i) => i !== index) })}
                        className="text-gray-400 hover:text-red-500 text-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Option - Primary CTA */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full bg-emerald-600 p-4 rounded-xl mb-4 hover:bg-emerald-700 transition-all group text-white"
              >
                <div className="flex items-center justify-center gap-3">
                  <UploadIcon className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">
                      {uploadedCount > 0 
                        ? 'Upload more investments'
                        : 'Upload CSV or Excel file'
                      }
                    </p>
                    <p className="text-sm text-emerald-100">
                      Import from Groww, Zerodha, or any broker
                    </p>
                  </div>
                </div>
              </button>

              {/* Manual Add Form */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Or add manually</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    id="inv-name"
                    placeholder="Investment name"
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <select
                    id="inv-type"
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Mutual Fund">Mutual Fund</option>
                    <option value="Stock">Stock</option>
                    <option value="FD">FD</option>
                    <option value="PPF">PPF</option>
                    <option value="NPS">NPS</option>
                    <option value="Gold">Gold</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    id="inv-value"
                    placeholder="Current value (₹)"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const nameEl = document.getElementById('inv-name') as HTMLInputElement;
                      const typeEl = document.getElementById('inv-type') as HTMLSelectElement;
                      const valueEl = document.getElementById('inv-value') as HTMLInputElement;
                      if (nameEl.value && valueEl.value) {
                        setData({
                          ...data,
                          investments: [...data.investments, { name: nameEl.value, type: typeEl.value, value: valueEl.value }],
                        });
                        nameEl.value = '';
                        valueEl.value = '';
                      }
                    }}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Skip Option */}
              <button
                onClick={() => {
                  next();
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mb-8"
              >
                Skip for now - I'll add later →
              </button>

              <div className="flex items-center justify-between">
                <button onClick={back} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Continue
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {currentStep === 'confirmation' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're all set{data.name ? `, ${data.name}` : ''}!
              </h2>
              <p className="text-gray-600 mb-8">
                Your portfolio is ready. Start exploring your investments.
              </p>

              {/* Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">What I understand:</h3>
                <div className="space-y-3 text-sm">
                  {data.goals.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-gray-600">
                        You're investing for: <span className="text-gray-900">{data.goals.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}</span>
                      </span>
                    </div>
                  )}
                  {data.timeHorizon && (
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-gray-600">
                        Time horizon: <span className="text-gray-900">{data.timeHorizon} years</span>
                      </span>
                    </div>
                  )}
                  {data.riskComfort && (
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-gray-600">
                        Risk comfort: <span className="text-gray-900 capitalize">{data.riskComfort}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span className="text-gray-600">
                      Portfolio: <span className="text-gray-900">{uploadedCount > 0 ? 'Uploaded' : data.investments.length > 0 ? `${data.investments.length} investments` : 'Not added yet'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Message */}
              <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100 mb-8 text-left">
                <SparklesIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  I'm ready to help you understand your investments. Ask me anything about your portfolio!
                </p>
              </div>

              <button
                onClick={complete}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRightIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
        Your data is encrypted and stored securely in India
      </footer>

      {/* Portfolio Upload Modal */}
      {user && (
        <PortfolioUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          userId={user.id}
          source="onboarding"
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
