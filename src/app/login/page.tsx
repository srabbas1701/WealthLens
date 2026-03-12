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
  // Guard: MSG91 widget may call error callback after success (e.g. on unmount) - ignore spurious errors
  const verificationSucceededRef = useRef(false);
  // Track authMethod for MSG91 init guard (user may switch to Email while script is loading)
  const authMethodRef = useRef(authMethod);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Get redirect URL and error from query params
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const urlError = searchParams.get('error');
  
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

  // When magic_link_invalid, switch to email tab so user can request new link
  useEffect(() => {
    if (searchParams.get('error') === 'magic_link_invalid') {
      setAuthMethod('email');
      setEmailStep('email');
    }
  }, [searchParams]);

  /**
   * Handler for "Resend Login Link" button (from ?error= callback).
   * Switches to email tab so user can request a new magic link.
   */
  const handleResendLoginLinkFromError = () => {
    setAuthMethod('email');
    setEmailStep('email');
    setError(null);
    setSuccess(null);
    router.replace('/login', { scroll: false });
  };
  
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

  // Keep authMethodRef in sync for MSG91 onload guard (handles tab switch during script load)
  useEffect(() => {
    authMethodRef.current = authMethod;
  }, [authMethod]);

  /**
   * MSG91 widget: Initialize ONLY when Mobile tab is active.
   * - Email tab active → no initialization (avoids loading MSG91 when user chose email)
   * - Mobile tab active → initialize once (__msg91Initialized prevents duplicate registration)
   * - Switch Email → Mobile → initializes
   * - Switch Mobile → Email → no reinitialize; switching back uses existing widget
   */
  useEffect(() => {
    // Only initialize when user has Mobile tab selected
    if (authMethod !== "mobile") return;

    // Already initialized (e.g. user switched Mobile → Email → Mobile) — no duplicate init
    // @ts-ignore
    if (typeof window !== "undefined" && window.__msg91Initialized) return;

    // Script already in DOM (e.g. from previous init attempt) — wait for load or skip
    const existingScript = document.getElementById("msg91-widget");
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = "msg91-widget";
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;

    script.onload = () => {
      // Guard: user may have switched to Email while script was loading
      if (authMethodRef.current !== "mobile") return;
      // @ts-ignore
      if (window.__msg91Initialized) return;

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
      console.log("MSG91 widget initialized");
    };

    document.body.appendChild(script);

    // Cleanup: remove script element if user switches to Email BEFORE it loads.
    // Prevents initSendOTP from running when onload fires (avoids init on wrong tab).
    // Once __msg91Initialized is set, we leave script in DOM to avoid CustomElementRegistry errors.
    return () => {
      // @ts-ignore
      if (typeof window === "undefined" || window.__msg91Initialized) return;
      const scriptEl = document.getElementById("msg91-widget");
      if (scriptEl) scriptEl.remove();
    };
  }, [authMethod]);
  
  /**
   * Guarded MSG91 sendOtp wrapper
   * Ensures widget is initialized before calling sendOtp
   */
  const sendPhoneOtp = (
    phone: string,
    onSuccess: () => void,
    onError: (err: any) => void
  ) => {
    // @ts-ignore
    if (typeof window === 'undefined' || !window.sendOtp) {
      console.error("MSG91 widget not initialized yet");
      onError(new Error("MSG91 widget not initialized yet"));
      return;
    }

    // @ts-ignore
    window.sendOtp(
      phone,
      () => {
        console.log("MSG91 OTP sent");
        onSuccess();
      },
      (err: any) => {
        console.error("MSG91 OTP send failed", err);
        onError(err);
      }
    );
  };
  
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
   * MSG91 OTP Widget integration (replaces Supabase OTP)
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
      
      // Ensure MSG91 widget is initialized (it should be from useEffect)
      // @ts-ignore
      if (typeof window === 'undefined' || !window.__msg91Initialized) {
        setError('OTP service is initializing. Please wait a moment and try again.');
        setIsLoading(false);
        return;
      }

      // Check if phone number is registered before sending OTP
      // Prevents sending OTP to unregistered numbers
      const checkRes = await fetch('/api/auth/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone', value: fullPhone }),
      });
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        setError('No account found with this number. Please sign up first.');
        setIsLoading(false);
        return;
      }

      // ===============================
      // SUPABASE PHONE OTP (DISABLED)
      // Reason: DLT issues in India
      // Replaced by MSG91 OTP Widget
      // DO NOT DELETE – rollback safety
      // ===============================
      // const { error: otpError } = await sendOtp(fullPhone);
      
      // MSG91 OTP Widget - Send OTP
      sendPhoneOtp(
        fullPhone,
        () => {
          setOtpStep('otp');
          setResendTimer(30); // 30 second cooldown for resend
          setSuccess('OTP sent! Check your phone for the 6-digit code.');
          setIsLoading(false);
        },
        (err: any) => {
          setError('Could not send OTP. Please try again.');
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('[Login] OTP send error:', err);
      setError('Could not send OTP. Please try again.');
      setIsLoading(false);
    }
  };
  
  /**
   * Handle OTP verification
   * MSG91 OTP Widget integration (replaces Supabase OTP)
   * 
   * ===============================
   * SUPABASE PHONE OTP (DISABLED)
   * Reason: DLT issues in India
   * Replaced by MSG91 OTP Widget
   * DO NOT DELETE – rollback safety
   * ===============================
   * 
   * ❌ DISABLED — Supabase OTP verification
   * const { error: verifyError } = await verifyOtp({
   *   phone: fullPhone,
   *   token: otp,
   *   type: "sms",
   * });
   * if (verifyError) {
   *   setError(friendlyErrorMessage(verifyError.message));
   *   return;
   * }
   * 
   * 💤 FUTURE FALLBACK — Twilio OTP
   * await sendTwilioOtp(phoneNumber);
   * await verifyTwilioOtp(phoneNumber, otp);
   */
  const verifyPhoneOtp = async (otp: string) => {
    // Guard: Prevent double-submit
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);

    // @ts-ignore
    if (typeof window === 'undefined' || !window.verifyOtp) {
      console.error("MSG91 widget not initialized yet");
      setError("OTP service not ready. Please refresh and try again.");
      setIsVerifying(false);
      return;
    }

    // Extract phone number from user input (already in E.164 format)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = `${countryCode}${cleanPhone}`;

    // MSG91 widget verifies OTP
    // @ts-ignore
    window.verifyOtp(
      otp,
      async (data: any) => {
        console.log("MSG91 OTP verified");

        try {
          // Step 1: Call backend with verified phone number
          console.log(`Calling backend with phone ${fullPhone}`);
          const response = await fetch("/api/auth/phone-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: fullPhone, // E.164 format (backend normalizes if needed)
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error("Backend login failed:", data);
            setError(data.error || "Backend login failed");
            setIsVerifying(false);
            return;
          }

          // After MSG91 verifies OTP and backend responds
          if (data.success && data.credentials) {
            console.log("Establishing Supabase session...");

            // Sign in with email+password (Supabase standard method)
            // Retry up to 3 times with a short delay to handle transient failures
            // on mobile (e.g. password update propagation delay, network blip)
            const supabase = createClient();
            let sessionError = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
              if (attempt > 1) {
                await new Promise(r => setTimeout(r, 600));
              }
              const { error } = await supabase.auth.signInWithPassword({
                email: data.credentials.email,
                password: data.credentials.password,
              });
              sessionError = error;
              if (!error) break;
              console.warn(`Session attempt ${attempt} failed:`, error.message);
            }

            if (sessionError) {
              console.error("Session error:", sessionError);
              setError("Failed to create session. Please try again.");
              setIsVerifying(false);
              return;
            }

            console.log("✅ Session created successfully");
            verificationSucceededRef.current = true;
            // Use full page navigation (not client-side router.push) so the browser
            // sends a fresh HTTP request with the newly-set session cookie.
            // This fixes iOS Safari's "scroll back to login" issue where a client-side
            // navigation could race with cookie writes, causing the middleware to see
            // no session and redirect back to /login.
            window.location.href = "/dashboard";
          } else {
            setError(data.error || "Login failed");
            setIsVerifying(false);
          }
        } catch (error) {
          console.error("Error during login flow:", error);
          setError("Login failed. Please try again.");
          setIsVerifying(false);
        }
      },
      (err: any) => {
        // MSG91 may call error callback after success (e.g. on unmount) - ignore spurious errors
        if (verificationSucceededRef.current) return;
        console.error("OTP verify failed:", err);
        setError("Invalid OTP. Please try again.");
        setIsVerifying(false);
      }
    );
  };

  /**
   * Handle OTP verification (wrapper for button click)
   * @param otpValueOverride - When provided (e.g. from auto-submit), use this instead of state to avoid stale closure
   */
  const handleVerifyOtp = async (otpValueOverride?: string) => {
    const otpValue = otpValueOverride ?? otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    await verifyPhoneOtp(otpValue);
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
   * Handle resend OTP
   * MSG91 OTP Widget integration (replaces Supabase OTP)
   */
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      
      // ===============================
      // SUPABASE PHONE OTP (DISABLED)
      // Reason: DLT issues in India
      // Replaced by MSG91 OTP Widget
      // DO NOT DELETE – rollback safety
      // ===============================
      // const { error: otpError } = await sendOtp(fullPhone);
      // if (otpError) {
      //   setError(friendlyErrorMessage(otpError.message));
      // } else {
      //   setResendTimer(30);
      //   setSuccess('New OTP sent!');
      //   setOtp(['', '', '', '', '', '']);
      //   if (otpInputRefs.current[0]) {
      //     otpInputRefs.current[0].focus();
      //   }
      // }

      // MSG91 OTP Widget - Resend OTP
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
        (err: any) => {
          setError('Could not resend OTP. Please try again.');
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('[Login] OTP resend error:', err);
      setError('Could not resend OTP. Please try again.');
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
      <main className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12 pt-20 sm:pt-24">
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
            
            {/* Query param error (magic link invalid/expired) */}
            {urlError === 'magic_link_invalid' && (
              <div className="mb-6 p-4 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#991B1B] rounded-lg">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#991B1B] dark:text-[#FCA5A5]">
                      This login link is invalid or was opened in a different browser.
                      Please request a new login link.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendLoginLinkFromError}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                  >
                    Resend Login Link
                  </button>
                </div>
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
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] bg-white dark:bg-[#1E293B] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20 dark:focus:ring-[#3B82F6]/20 outline-none transition-all"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
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
