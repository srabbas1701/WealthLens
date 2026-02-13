/**
 * Signup Page
 * 
 * Trust-first signup experience for wealth management platform.
 * Uses passwordless authentication (Mobile OTP or Email Magic Link).
 * 
 * DESIGN PHILOSOPHY:
 * - Reduce anxiety with clear, calm messaging
 * - Set trust expectations upfront
 * - Explicitly state read-only access
 * - Progressive disclosure of information
 * - No marketing claims or AI buzzwords
 * 
 * USER FLOW:
 * - User chooses authentication method (mobile OR email)
 * - After successful signup → /onboarding
 * - Account is created automatically on first authentication
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  LockIcon, 
  MailIcon, 
  PhoneIcon,
  SmartphoneIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  UserIcon
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';

// Authentication method types
type AuthMethod = 'mobile' | 'email';
type OtpStep = 'phone' | 'otp';
type EmailStep = 'email' | 'sent';

// Country codes for India-focused app
const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
];

export default function SignupPage() {
  const router = useRouter();
  const { sendMagicLink, user, authStatus } = useAuth();
  
  // Auth method selection
  const [authMethod, setAuthMethod] = useState<AuthMethod>('mobile');
  
  // Email magic link state
  const [email, setEmail] = useState('');
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  
  // Mobile OTP state
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Optional cross-method fields (for progressive data collection)
  // When signing up with phone, user can optionally provide email (no email verification)
  // When signing up with email, user can optionally provide phone (no phone verification)
  const [fullName, setFullName] = useState('');
  const [optionalEmail, setOptionalEmail] = useState('');
  const [optionalPhone, setOptionalPhone] = useState('');
  const [optionalPhoneCountryCode, setOptionalPhoneCountryCode] = useState('+91');
  
  // OTP input refs for auto-focus
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Guard: MSG91 widget may call error callback after success (e.g. on unmount) - ignore spurious errors
  const verificationSucceededRef = useRef(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Load MSG91 widget script and initialize ONCE (same as login page)
  useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.__msg91Initialized) return;

    const script = document.createElement('script');
    script.id = 'msg91-widget';
    script.src = 'https://verify.msg91.com/otp-provider.js';
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      window.initSendOTP({
        widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
        tokenAuth: process.env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN,
        exposeMethods: true,
        success: () => {},
        failure: () => {},
      });

      // @ts-ignore
      window.__msg91Initialized = true;
      console.log('MSG91 widget initialized');
    };

    document.body.appendChild(script);
  }, []);
  
  // GUARD: Redirect if already authenticated
  // RULE: Never redirect while authStatus === 'loading'
  // PRODUCTION FIX: Ensure session is established before redirecting
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'authenticated' && user) {
      // PRODUCTION FIX: Add a small delay to ensure session cookies are set
      const redirectTimer = setTimeout(() => {
        if (authStatus === 'authenticated' && user) {
          try {
            const redirectResult = router.replace('/onboarding');
            // Check if router.replace returns a Promise
            if (redirectResult && typeof redirectResult.catch === 'function') {
              redirectResult.catch((err) => {
                console.error('[Signup] Redirect failed:', err);
                setTimeout(() => {
                  window.location.href = '/onboarding';
                }, 500);
              });
            } else {
              // router.replace didn't return a promise, check if redirect worked
              setTimeout(() => {
                if (window.location.pathname !== '/onboarding') {
                  window.location.href = '/onboarding';
                }
              }, 100);
            }
          } catch (err) {
            console.error('[Signup] Redirect error:', err);
            window.location.href = '/onboarding';
          }
        }
      }, 300);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [authStatus, user, router]);
  
  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);
  
  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (otpStep === 'otp' && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [otpStep]);
  
  /**
   * Guarded MSG91 sendOtp wrapper (same as login page)
   */
  const sendPhoneOtp = (
    phone: string,
    onSuccess: () => void,
    onError: (err: unknown) => void
  ) => {
    // @ts-ignore
    if (typeof window === 'undefined' || !window.sendOtp) {
      onError(new Error('MSG91 widget not initialized yet'));
      return;
    }
    // @ts-ignore
    window.sendOtp(phone, () => onSuccess(), (err: unknown) => onError(err));
  };
  
  /**
   * Handle email magic link submission
   * DUPLICATE CHECK: Verify email doesn't exist before sending magic link
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      // 1. Duplicate check - both auth.users and public.users
      const checkRes = await fetch('/api/auth/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: email.trim() }),
      });
      const checkData = await checkRes.json();
      
      if (checkData.exists) {
        setError('An account with this email already exists. Please sign in instead.');
        setIsLoading(false);
        return;
      }
      
      // 2. Duplicate check for optional phone (if provided)
      const cleanOptionalPhone = optionalPhone.replace(/\D/g, '');
      const fullOptionalPhone = cleanOptionalPhone.length >= 10
        ? `${optionalPhoneCountryCode}${cleanOptionalPhone}`
        : null;
      if (fullOptionalPhone) {
        const phoneCheckRes = await fetch('/api/auth/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'phone', value: fullOptionalPhone }),
        });
        const phoneCheckData = await phoneCheckRes.json();
        if (phoneCheckData.exists) {
          setError('An account with this phone number already exists. Please sign in instead.');
          setIsLoading(false);
          return;
        }
      }
      
      // 3. Store full name and optional phone in localStorage (saved after auth callback)
      const trimmedName = fullName.trim();
      if (trimmedName) localStorage.setItem('signup_full_name', trimmedName);
      else localStorage.removeItem('signup_full_name');
      if (fullOptionalPhone) {
        localStorage.setItem('signup_optional_phone', fullOptionalPhone);
      } else {
        localStorage.removeItem('signup_optional_phone');
      }
      
      // 3. Send magic link
      const { error: magicLinkError } = await sendMagicLink(email);
      
      if (magicLinkError) {
        setError(friendlyErrorMessage(magicLinkError.message));
      } else {
        setEmailStep('sent');
        setSuccess('Check your email for the signup link');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle mobile OTP send
   * DUPLICATE CHECK: Verify phone doesn't exist before sending OTP
   * MSG91: Uses MSG91 widget (same as login page)
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fullPhone = `${countryCode}${cleanPhone}`;
      
      // 1. Duplicate check - both auth.users and public.users
      const checkRes = await fetch('/api/auth/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone', value: fullPhone }),
      });
      const checkData = await checkRes.json();
      
      if (checkData.exists) {
        setError('An account with this phone number already exists. Please sign in instead.');
        setIsLoading(false);
        return;
      }
      
      // 2. Duplicate check for optional email (if provided)
      const trimmedOptionalEmail = optionalEmail.trim();
      if (trimmedOptionalEmail && trimmedOptionalEmail.includes('@')) {
        const emailCheckRes = await fetch('/api/auth/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', value: trimmedOptionalEmail }),
        });
        const emailCheckData = await emailCheckRes.json();
        if (emailCheckData.exists) {
          setError('An account with this email already exists. Please sign in instead.');
          setIsLoading(false);
          return;
        }
      }
      
      // 3. MSG91 widget must be initialized
      // @ts-ignore
      if (typeof window === 'undefined' || !window.__msg91Initialized) {
        setError('OTP service is initializing. Please wait a moment and try again.');
        setIsLoading(false);
        return;
      }
      
      // 4. Send OTP via MSG91 widget
      sendPhoneOtp(
        fullPhone,
        () => {
          setOtpStep('otp');
          setResendTimer(30);
          setSuccess('OTP sent! Check your phone for the 6-digit code.');
          setIsLoading(false);
        },
        () => {
          setError('Could not send OTP. Please try again.');
          setIsLoading(false);
        }
      );
    } catch {
      setError('Could not send OTP. Please try again.');
      setIsLoading(false);
    }
  };
  
  /**
   * Handle OTP verification
   * MSG91: Uses MSG91 widget + phone-login API (same as login page)
   * phone-login supports BOTH signup (creates user) and login (finds existing)
   * @param otpValueOverride - When provided (e.g. from auto-submit), use this instead of state to avoid stale closure
   */
  const handleVerifyOtp = async (otpValueOverride?: string) => {
    if (isVerifying) return;
    
    const otpValue = otpValueOverride ?? otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    
    setError(null);
    setIsVerifying(true);
    
    // @ts-ignore
    if (typeof window === 'undefined' || !window.verifyOtp) {
      setError('OTP service not ready. Please refresh and try again.');
      setIsVerifying(false);
      return;
    }
    
    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    // @ts-ignore
    window.verifyOtp(
      otpValue,
      async (data: unknown) => {
        try {
          const response = await fetch('/api/auth/phone-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              phone: fullPhone,
              fullName: fullName.trim() || undefined,
              optionalEmail: optionalEmail.trim() || undefined,
            }),
          });
          const resData = await response.json();

          if (!response.ok) {
            setError(resData.error || 'Signup failed. Please try again.');
            setIsVerifying(false);
            return;
          }

          if (resData.success && resData.credentials) {
            const supabase = createClient();
            const { error: sessionError } = await supabase.auth.signInWithPassword({
              email: resData.credentials.email,
              password: resData.credentials.password,
            });

            if (sessionError) {
              setError('Failed to create session. Please try again.');
              setIsVerifying(false);
              return;
            }

            setSuccess('Account created! Redirecting...');
            verificationSucceededRef.current = true;
            router.replace('/onboarding');
          } else {
            setError(resData.error || 'Signup failed.');
            setIsVerifying(false);
          }
        } catch (err) {
          console.error('[Signup] OTP verification error:', err);
          setError('Signup failed. Please try again.');
          setIsVerifying(false);
        }
      },
      (err: unknown) => {
        // MSG91 may call error callback after success (e.g. on unmount) - ignore spurious errors
        if (verificationSucceededRef.current) return;
        console.error('OTP verify failed:', err);
        setError('Invalid OTP. Please try again.');
        setIsVerifying(false);
      }
    );
  };
  
  /**
   * Handle OTP input change with auto-advance
   */
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-advance to next input
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all 6 digits are entered (only if not already verifying)
    // Pass newOtp.join('') to avoid stale closure - state may not have updated yet
    if (value && index === 5 && newOtp.every(d => d !== '') && !isVerifying) {
      const completeOtp = newOtp.join('');
      setTimeout(() => handleVerifyOtp(completeOtp), 100);
    }
  };
  
  /**
   * Handle OTP input keydown for backspace navigation
   */
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };
  
  /**
   * Handle OTP paste
   */
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6 && !isVerifying) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
      // Pass pastedData to avoid stale closure
      setTimeout(() => handleVerifyOtp(pastedData), 100);
    }
  };
  
  /**
   * Handle resend OTP (MSG91 widget)
   */
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setError(null);
    setIsLoading(true);
    
    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    sendPhoneOtp(
      fullPhone,
      () => {
        setResendTimer(30);
        setSuccess('New OTP sent!');
        setOtp(['', '', '', '', '', '']);
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
        setIsLoading(false);
      },
      () => {
        setError('Could not resend OTP. Please try again.');
        setIsLoading(false);
      }
    );
  };
  
  /**
   * Handle resend magic link
   * Duplicate check on resend (edge case: someone registered same email meanwhile)
   */
  const handleResendMagicLink = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const checkRes = await fetch('/api/auth/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: email.trim() }),
      });
      const checkData = await checkRes.json();
      
      if (checkData.exists) {
        setError('An account with this email already exists. Please sign in instead.');
        setIsLoading(false);
        return;
      }
      
      const { error: magicLinkError } = await sendMagicLink(email);
      
      if (magicLinkError) {
        setError(friendlyErrorMessage(magicLinkError.message));
      } else {
        setSuccess('New signup link sent! Check your email.');
      }
    } catch {
      setError('Could not resend link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Go back to phone input from OTP step
   */
  const handleBackToPhone = () => {
    setOtpStep('phone');
    setOtp(['', '', '', '', '', '']);
    setError(null);
    setSuccess(null);
  };
  
  /**
   * Go back to email input from sent step
   */
  const handleBackToEmail = () => {
    setEmailStep('email');
    setError(null);
    setSuccess(null);
  };
  
  /**
   * Convert technical error messages to friendly ones
   */
  const friendlyErrorMessage = (message: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email or password is incorrect. Please try again.',
      'Email not confirmed': 'Please verify your email address first.',
      'User already registered': 'An account with this email already exists. Please sign in instead.',
      'Invalid phone number': 'Please enter a valid mobile number with country code.',
      'Token has expired or is invalid': 'This OTP has expired. Please request a new one.',
      'Invalid OTP': 'The OTP you entered is incorrect. Please try again.',
      'Phone number rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
      'Unsupported phone provider': 'Unsupported phone provider',
      'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
      'Unable to validate email address': 'Please enter a valid email address.',
    };
    
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return message;
  };
  
  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />
      
      {/* Main Content */}
      <main className="flex items-center justify-center px-6 py-12 pt-24">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {authMethod === 'mobile' && otpStep === 'otp' 
                  ? 'Enter verification code'
                  : authMethod === 'email' && emailStep === 'sent'
                    ? 'Check your email'
                    : 'Create your account'
                }
              </h1>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">
                {authMethod === 'mobile' && otpStep === 'otp'
                  ? `We sent a 6-digit code to ${countryCode} ${phoneNumber}`
                  : authMethod === 'email' && emailStep === 'sent'
                    ? `We sent a signup link to ${email}`
                    : 'Get started with portfolio visibility'
                }
              </p>
            </div>
            
            {/* Auth Method Tabs (only show on initial screen) */}
            {!(authMethod === 'mobile' && otpStep === 'otp') && 
             !(authMethod === 'email' && emailStep === 'sent') && (
              <div className="flex gap-2 mb-6 p-1 bg-[#F6F8FB] dark:bg-[#334155] rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('mobile');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    authMethod === 'mobile'
                      ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm'
                      : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <SmartphoneIcon className="w-4 h-4" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('email');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    authMethod === 'email'
                      ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm'
                      : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <MailIcon className="w-4 h-4" />
                  Email
                </button>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#991B1B] rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#991B1B] dark:text-[#FCA5A5]">{error}</p>
                    {error.includes('already exists') && (
                      <Link
                        href="/login"
                        className="inline-block mt-2 text-sm font-medium text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] underline"
                      >
                        Go to Sign in →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-[#F0FDF4] dark:bg-[#14532D] border border-[#D1FAE5] dark:border-[#166534] rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#166534] dark:text-[#86EFAC]">{success}</p>
                </div>
              </div>
            )}
            
            {/* Mobile OTP Flow */}
            {authMethod === 'mobile' && (
              <>
                {otpStep === 'phone' ? (
                  /* Phone Number Input */
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label htmlFor="full-name-mobile" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Full Name <span className="text-[#9CA3AF] dark:text-[#64748B] font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                        </div>
                        <input
                          id="full-name-mobile"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Mobile Number
                      </label>
                      <div className="flex gap-2">
                        {/* Country Code Selector */}
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-28 px-3 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all text-sm"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code} className="bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                              {cc.flag} {cc.code}
                            </option>
                          ))}
                        </select>
                        
                        {/* Phone Input */}
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                          </div>
                          <input
                            id="phone"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="10-digit number"
                            required
                            maxLength={10}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                        We'll send a one-time password via SMS
                      </p>
                    </div>
                    
                    {/* Optional Email (no verification needed) */}
                    <div>
                      <label htmlFor="optional-email" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Email Address <span className="text-[#9CA3AF] dark:text-[#64748B] font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MailIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                        </div>
                        <input
                          id="optional-email"
                          type="email"
                          value={optionalEmail}
                          onChange={(e) => setOptionalEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#9CA3AF] dark:text-[#64748B]">
                        For account recovery and portfolio reports. No verification needed.
                      </p>
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || phoneNumber.length < 10}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <span>Continue with Mobile</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* OTP Input */
                  <div className="space-y-5">
                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={handleBackToPhone}
                      className="flex items-center gap-1 text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      Change number
                    </button>
                    
                    {/* OTP Input Fields */}
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-3 text-center">
                        Enter 6-digit OTP
                      </label>
                      <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                            className="w-12 h-14 text-center text-xl font-semibold rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Verify Button */}
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={isVerifying}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify OTP</span>
                      )}
                    </button>
                    
                    {/* Resend OTP */}
                    <div className="text-center">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        Didn't receive the code?{' '}
                        {resendTimer > 0 ? (
                          <span className="text-[#9CA3AF] dark:text-[#64748B]">
                            Resend in {resendTimer}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isLoading || isVerifying}
                            className="text-[#2563EB] dark:text-[#3B82F6] font-medium hover:text-[#1E40AF] dark:hover:text-[#60A5FA] disabled:opacity-50"
                          >
                            Resend OTP
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Email Magic Link Flow */}
            {authMethod === 'email' && (
              <>
                {emailStep === 'email' ? (
                  /* Email Input */
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="full-name-email" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Full Name <span className="text-[#9CA3AF] dark:text-[#64748B] font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                        </div>
                        <input
                          id="full-name-email"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                          disabled={isLoading}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MailIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          disabled={isLoading}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                        We'll send a secure signup link to your email
                      </p>
                    </div>
                    
                    {/* Optional Phone (no verification needed) */}
                    <div>
                      <label htmlFor="optional-phone" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Mobile Number <span className="text-[#9CA3AF] dark:text-[#64748B] font-normal">(optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={optionalPhoneCountryCode}
                          onChange={(e) => setOptionalPhoneCountryCode(e.target.value)}
                          disabled={isLoading}
                          className="w-28 px-3 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code} className="bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                              {cc.flag} {cc.code}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
                          </div>
                          <input
                            id="optional-phone"
                            type="tel"
                            value={optionalPhone}
                            onChange={(e) => setOptionalPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="10-digit number"
                            maxLength={10}
                            disabled={isLoading}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[#9CA3AF] dark:text-[#64748B]">
                        For quick OTP login later. No verification needed now.
                      </p>
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending link...</span>
                        </>
                      ) : (
                        <span>Continue with Email</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Email Sent Confirmation */
                  <div className="space-y-5">
                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="flex items-center gap-1 text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      Use different email
                    </button>
                    
                    {/* Email Sent Message */}
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center">
                        <MailIcon className="w-8 h-8 text-[#2563EB] dark:text-[#3B82F6]" />
                      </div>
                      <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm">
                        Click the link in your email to create your account. The link expires in 1 hour.
                      </p>
                    </div>
                    
                    {/* Resend Link */}
                    <div className="text-center">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                        Didn't receive the email?{' '}
                        <button
                          type="button"
                          onClick={handleResendMagicLink}
                          disabled={isLoading}
                          className="text-[#2563EB] dark:text-[#3B82F6] font-medium hover:text-[#1E40AF] dark:hover:text-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-[#2563EB]/30 dark:border-[#3B82F6]/30 border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
                              Resending...
                            </>
                          ) : (
                            'Resend link'
                          )}
                        </button>
                      </p>
                      <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-2">
                        Check your spam folder if you don't see it
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Trust & Security Message */}
          <div className="mt-6 space-y-4">
            {/* Read-Only Access */}
            <div className="p-4 bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Read-only access</p>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    We only view your investments. We never execute trades or modify your portfolio.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Data Security */}
            <div className="p-4 bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-start gap-3">
                <LockIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Your data is secure</p>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                    Bank-grade encryption. Data stored in India. We never share your information.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#2563EB] dark:text-[#3B82F6] font-medium hover:text-[#1E40AF] dark:hover:text-[#60A5FA]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

