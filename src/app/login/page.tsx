'use client';

/**
 * Login Page
 *
 * Authentication page with multiple login options:
 * - Mobile Number + OTP (primary for India)
 * - Email Magic Link (passwordless, low friction)
 *
 * DESIGN PHILOSOPHY:
 * - Clean, trust-first UI
 * - Low-friction, India-friendly mobile OTP login
 * - Passwordless email via magic link
 * - Clear error messages (calm, not scary)
 * - Smooth transitions between login methods
 * - No dark patterns
 *
 * USER FLOW:
 * - User chooses ONE method (mobile OR email)
 * - After successful login → middleware handles redirect
 * - New users → /onboarding
 * - Existing users → /dashboard
 *
 * AUTH METHODS:
 * - Mobile OTP: Phone-based auth via Supabase SMS
 * - Email Magic Link: Passwordless email auth
 */

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  LockIcon, 
  MailIcon, 
  PhoneIcon,
  SmartphoneIcon,
  ArrowLeftIcon,
  ChevronDownIcon
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendOtp, verifyOtp, sendMagicLink, user, authStatus } = useAuth();
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  
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
  
  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  // Check for logout confirmation message
  useEffect(() => {
    if (searchParams.get('loggedOut') === 'true') {
      setShowLogoutMessage(true);
      // Remove query param from URL
      router.replace('/login', { scroll: false });
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowLogoutMessage(false), 5000);
      return () => clearTimeout(timer);
    }
    
    // Check for timeout message
    if (searchParams.get('timeout') === 'true') {
      setShowTimeoutMessage(true);
      // Remove query param from URL
      router.replace('/login', { scroll: false });
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowTimeoutMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);
  
  // GUARD: Redirect if already authenticated
  // RULE: Never redirect while authStatus === 'loading'
  // PRODUCTION FIX: Ensure session is established before redirecting
  useEffect(() => {
    // GUARD: Block redirects during loading
    if (authStatus === 'loading') return;
    
    // Auth state resolved - check if authenticated
    if (authStatus === 'authenticated' && user) {
      // PRODUCTION FIX: Add a small delay to ensure session cookies are set
      // This helps with mobile/production environments where cookies might propagate slower
      const redirectTimer = setTimeout(() => {
        // Double-check user is still authenticated before redirect
        if (authStatus === 'authenticated' && user) {
          // User is authenticated - redirect to appropriate page
          // Middleware will handle dashboard vs onboarding logic
          // Use the redirectUrl from query params or default to dashboard
          try {
            const redirectResult = router.replace(redirectUrl);
            // Check if router.replace returns a Promise (it might not in some Next.js versions)
            if (redirectResult && typeof redirectResult.catch === 'function') {
              redirectResult.catch((err) => {
                console.error('[Login] Redirect failed:', err);
                // Fallback: try again after a short delay
                setTimeout(() => {
                  try {
                    const retryResult = router.replace(redirectUrl);
                    if (retryResult && typeof retryResult.catch === 'function') {
                      retryResult.catch(() => {
                        // Last resort: force reload if redirect still fails
                        window.location.href = redirectUrl;
                      });
                    } else {
                      // If no promise returned, redirect succeeded or use fallback
                      setTimeout(() => {
                        if (window.location.pathname !== redirectUrl) {
                          window.location.href = redirectUrl;
                        }
                      }, 100);
                    }
                  } catch (retryErr) {
                    console.error('[Login] Retry redirect failed:', retryErr);
                    window.location.href = redirectUrl;
                  }
                }, 500);
              });
            } else {
              // router.replace didn't return a promise, check if redirect worked
              setTimeout(() => {
                if (window.location.pathname !== redirectUrl) {
                  window.location.href = redirectUrl;
                }
              }, 100);
            }
          } catch (err) {
            console.error('[Login] Redirect error:', err);
            // Fallback: use window.location as last resort
            window.location.href = redirectUrl;
          }
        }
      }, 300); // Small delay to ensure state is fully propagated
      
      return () => clearTimeout(redirectTimer);
    }
    // If authStatus === 'unauthenticated', show login form (no redirect needed)
  }, [authStatus, user, router, redirectUrl]);
  
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
        setSuccess('Check your email for the login link');
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
   * PRODUCTION FIX: Explicitly wait for session before showing success
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
        setIsLoading(false);
      } else {
        // PRODUCTION FIX: Show success message
        // The redirect useEffect will handle navigation once authStatus becomes 'authenticated'
        // Wait for the onAuthStateChange to fire and update authStatus
        setSuccess('Verified! Please wait...');
        // Wait a moment for auth state to update, then redirect
        setTimeout(() => {
          router.push(redirectUrl);
        }, 500);
      }
    } catch (err) {
      console.error('[Login] OTP verification error:', err);
      setError('Could not verify OTP. Please try again.');
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
        setSuccess('New login link sent! Check your email.');
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
      'User already registered': 'An account with this email already exists.',
      'Invalid phone number': 'Please enter a valid mobile number with country code.',
      'Token has expired or is invalid': 'This OTP has expired. Please request a new one.',
      'Invalid OTP': 'The OTP you entered is incorrect. Please try again.',
      'Phone number rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
      'Unsupported phone provider': 'Unsupported phone provider',
      'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
      'Unable to validate email address': 'Please enter a valid email address.',
      'Failed to send magic link': 'Unable to send email. Please check Supabase configuration.',
      'Internal Server Error': 'Server error. Please check: 1) Email provider is enabled in Supabase, 2) No rate limits exceeded, 3) Check Supabase Auth Logs for details.',
      '500': 'Server error (500). Check Supabase Dashboard → Authentication → Providers → Email is enabled.',
    };
    
    // Check for partial matches first
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // If message contains status codes or technical details, provide helpful guidance
    if (message.includes('500') || message.includes('Internal Server Error')) {
      return 'Server error. Please check Supabase Dashboard: Authentication → Providers → Email should be enabled. Also check Auth Logs for the exact error.';
    }
    
    // Return original message if no match found (so user can see the actual error)
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
                    : 'Sign in'
                }
              </h1>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-2">
                {authMethod === 'mobile' && otpStep === 'otp'
                  ? `We sent a 6-digit code to ${countryCode} ${phoneNumber}`
                  : authMethod === 'email' && emailStep === 'sent'
                    ? `We sent a login link to ${email}`
                    : authMethod === 'mobile'
                      ? "We'll send a one-time password to your mobile"
                      : "We'll send a login link to your email"
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
                  <p className="text-sm text-[#991B1B] dark:text-[#FCA5A5]">{error}</p>
                </div>
              </div>
            )}
            
            {/* Logout Confirmation Message */}
            {showLogoutMessage && (
              <div className="mb-6 p-4 bg-[#F0FDF4] dark:bg-[#14532D] border border-[#D1FAE5] dark:border-[#166534] rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#166534] dark:text-[#86EFAC]">You've been logged out safely.</p>
                </div>
              </div>
            )}

            {/* Timeout Message */}
            {showTimeoutMessage && (
              <div className="mb-6 p-4 bg-[#F0FDF4] dark:bg-[#14532D] border border-[#D1FAE5] dark:border-[#166534] rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#166534] dark:text-[#86EFAC]">
                    You were logged out due to inactivity to keep your account secure.
                  </p>
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
            
            {/* Mobile Helper Message (iPhone/iOS) */}
            {authMethod === 'email' && emailStep === 'sent' && (
              <div className="mb-6 p-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border border-[#DBEAFE] dark:border-[#1E40AF] rounded-lg">
                <div className="flex items-start gap-3">
                  <SmartphoneIcon className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1E40AF] dark:text-[#93C5FD] mb-1">
                      Using iPhone?
                    </p>
                    <p className="text-xs text-[#1E3A8A] dark:text-[#BFDBFE]">
                      For best results, copy the link from your email and paste it in Safari, or use "Open in Safari" from the Mail app.
                    </p>
                  </div>
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
                      <label htmlFor="phone" className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                        Mobile Number
                      </label>
                      <div className="flex gap-2">
                        {/* Country Code Selector */}
                        <div className="relative w-28">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-full px-3 py-3 pr-8 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all text-sm appearance-none cursor-pointer"
                          >
                            {COUNTRY_CODES.map((cc) => (
                              <option key={cc.code} value={cc.code} className="bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
                                {cc.flag} {cc.code}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <ChevronDownIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                          </div>
                        </div>
                        
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
                      onClick={handleVerifyOtp}
                      disabled={isLoading || otp.some(d => d === '')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={isLoading}
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
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280]">
                        We'll send a secure login link to your email
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
                        Click the link in your email to sign in. The link expires in 1 hour.
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
                          className="text-[#2563EB] dark:text-[#3B82F6] font-medium hover:text-[#1E40AF] dark:hover:text-[#60A5FA] disabled:opacity-50"
                        >
                          Resend link
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
          
          {/* Trust Message */}
          <div className="mt-6 p-4 bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex items-start gap-3">
              <LockIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">Your data is secure</p>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  We use bank-grade encryption and never share your data. No trading, no tips, just clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
