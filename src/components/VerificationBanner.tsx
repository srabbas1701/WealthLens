/**
 * Verification Banner Component
 * 
 * Shows a subtle, non-blocking banner when user has unverified contact info.
 * 
 * DESIGN PHILOSOPHY:
 * - NON-BLOCKING: User can dismiss and continue using the app
 * - SUBTLE: Not alarming or urgent
 * - TRUST-FIRST: Calm language, no scary warnings
 * - DISMISSIBLE: User can hide it for the session
 * 
 * BEHAVIOR:
 * - Shows when email or phone is unverified
 * - Can be dismissed (hidden for session)
 * - Provides quick action to verify
 */

'use client';

import { useState } from 'react';
import { MailIcon, PhoneIcon, XIcon, CheckCircleIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';

interface VerificationBannerProps {
  className?: string;
}

export default function VerificationBanner({ className = '' }: VerificationBannerProps) {
  const { 
    user, 
    profile, 
    authMethod, 
    isEmailVerified, 
    isPhoneVerified,
    sendEmailVerification,
    sendPhoneVerification,
  } = useAuth();
  
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Don't show if dismissed
  if (isDismissed) return null;
  
  // Determine what needs verification
  const needsEmailVerification = authMethod === 'mobile' && profile?.email && !isEmailVerified;
  const needsPhoneVerification = authMethod === 'email' && profile?.phone_number && !isPhoneVerified;
  
  // Don't show if nothing needs verification
  if (!needsEmailVerification && !needsPhoneVerification) return null;
  
  const handleSendVerification = async () => {
    setIsSending(true);
    setError(null);
    
    try {
      if (needsEmailVerification && profile?.email) {
        const { error: sendError } = await sendEmailVerification(profile.email);
        if (sendError) {
          setError(sendError.message);
        } else {
          setSent(true);
        }
      } else if (needsPhoneVerification && profile?.phone_number) {
        const { error: sendError } = await sendPhoneVerification(profile.phone_number);
        if (sendError) {
          setError(sendError.message);
        } else {
          setSent(true);
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  const contactType = needsEmailVerification ? 'email' : 'phone';
  const contactValue = needsEmailVerification ? profile?.email : profile?.phone_number;
  const Icon = needsEmailVerification ? MailIcon : PhoneIcon;
  
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          {sent ? (
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-700">
                Verification {contactType === 'email' ? 'email' : 'OTP'} sent to {contactValue}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Verify your {contactType}</span>
                <span className="text-slate-500 ml-1">
                  to enable all features
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {contactValue}
              </p>
              
              {error && (
                <p className="text-xs text-amber-600 mt-1">{error}</p>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {!sent && (
            <button
              onClick={handleSendVerification}
              disabled={isSending}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Verify'}
            </button>
          )}
          
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}













