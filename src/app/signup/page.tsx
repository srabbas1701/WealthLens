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
  ShieldCheckIcon
} from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';

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
  const { sendOtp, verifyOtp, sendMagicLink, user, authStatus } = useAuth();
  
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
  
  // OTP input refs for auto-focus
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // GUARD: Redirect if already authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'authenticated' && user) {
      router.replace('/onboarding');
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
   * Handle email magic link submission
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
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
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fullPhone = `${countryCode}${cleanPhone}`;
      const { error: otpError } = await sendOtp(fullPhone);
      
      if (otpError) {
        setError(friendlyErrorMessage(otpError.message));
      } else {
        setOtpStep('otp');
        setResendTimer(30); // 30 second cooldown for resend
        setSuccess('OTP sent! Check your phone for the 6-digit code.');
      }
    } catch {
      setError('Could not send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle OTP verification
   */
  const handleVerifyOtp = async () => {
    setError(null);
    setSuccess(null);
    
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      const { error: verifyError } = await verifyOtp(fullPhone, otpValue);
      
      if (verifyError) {
        setError(friendlyErrorMessage(verifyError.message));
        // Clear OTP on error so user can retry
        setOtp(['', '', '', '', '', '']);
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      } else {
        setSuccess('Account created! Redirecting...');
        router.push('/onboarding');
      }
    } catch {
      setError('Could not verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
    
    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      // Small delay to show the last digit
      setTimeout(() => handleVerifyOtp(), 100);
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
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
      // Auto-submit after paste
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };
  
  /**
   * Handle resend OTP
   */
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      const { error: otpError } = await sendOtp(fullPhone);
      
      if (otpError) {
        setError(friendlyErrorMessage(otpError.message));
      } else {
        setResendTimer(30);
        setSuccess('New OTP sent!');
        setOtp(['', '', '', '', '', '']);
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }
    } catch {
      setError('Could not resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle resend magic link
   */
  const handleResendMagicLink = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
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
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader />
      
      {/* Main Content */}
      <main className="flex items-center justify-center px-6 py-12 pt-24">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[#0F172A]">
                {authMethod === 'mobile' && otpStep === 'otp' 
                  ? 'Enter verification code'
                  : authMethod === 'email' && emailStep === 'sent'
                    ? 'Check your email'
                    : 'Create your account'
                }
              </h1>
              <p className="text-[#6B7280] text-sm mt-2">
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
              <div className="flex gap-2 mb-6 p-1 bg-[#F6F8FB] rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('mobile');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    authMethod === 'mobile'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#0F172A]'
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
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#0F172A]'
                  }`}
                >
                  <MailIcon className="w-4 h-4" />
                  Email
                </button>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#991B1B]">{error}</p>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-[#F0FDF4] border border-[#D1FAE5] rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#166534]">{success}</p>
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
                      <label htmlFor="phone" className="block text-sm font-medium text-[#0F172A] mb-2">
                        Mobile Number
                      </label>
                      <div className="flex gap-2">
                        {/* Country Code Selector */}
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-28 px-3 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all text-sm"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code}>
                              {cc.flag} {cc.code}
                            </option>
                          ))}
                        </select>
                        
                        {/* Phone Input */}
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="w-5 h-5 text-[#6B7280]" />
                          </div>
                          <input
                            id="phone"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="10-digit number"
                            required
                            maxLength={10}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280]">
                        We'll send a one-time password via SMS
                      </p>
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || phoneNumber.length < 10}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] text-white font-medium hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#0F172A] transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      Change number
                    </button>
                    
                    {/* OTP Input Fields */}
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-3 text-center">
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
                            className="w-12 h-14 text-center text-xl font-semibold rounded-lg border border-[#E5E7EB] text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Verify Button */}
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isLoading || otp.some(d => d === '')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] text-white font-medium hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
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
                      <p className="text-sm text-[#6B7280]">
                        Didn't receive the code?{' '}
                        {resendTimer > 0 ? (
                          <span className="text-[#9CA3AF]">
                            Resend in {resendTimer}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isLoading}
                            className="text-[#2563EB] font-medium hover:text-[#1E40AF] disabled:opacity-50"
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
                      <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MailIcon className="w-5 h-5 text-[#6B7280]" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280]">
                        We'll send a secure signup link to your email
                      </p>
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] text-white font-medium hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#0F172A] transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      Use different email
                    </button>
                    
                    {/* Email Sent Message */}
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                        <MailIcon className="w-8 h-8 text-[#2563EB]" />
                      </div>
                      <p className="text-[#6B7280] text-sm">
                        Click the link in your email to create your account. The link expires in 1 hour.
                      </p>
                    </div>
                    
                    {/* Resend Link */}
                    <div className="text-center">
                      <p className="text-sm text-[#6B7280]">
                        Didn't receive the email?{' '}
                        <button
                          type="button"
                          onClick={handleResendMagicLink}
                          disabled={isLoading}
                          className="text-[#2563EB] font-medium hover:text-[#1E40AF] disabled:opacity-50"
                        >
                          Resend link
                        </button>
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-2">
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
            <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Read-only access</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    We only view your investments. We never execute trades or modify your portfolio.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Data Security */}
            <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
              <div className="flex items-start gap-3">
                <LockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Your data is secure</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Bank-grade encryption. Data stored in India. We never share your information.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B7280]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#2563EB] font-medium hover:text-[#1E40AF]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

