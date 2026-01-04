/**
 * Security Settings Page
 * 
 * Shows session policy, last login time, and security information.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { ShieldCheckIcon, LockIcon, ClockIcon, InfoIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const { user, profile, authStatus } = useAuth();
  const router = useRouter();
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  // NOTE: Demo mode does NOT imply authenticated state - demo routes are separate
  useEffect(() => {
    // GUARD: Block redirects during loading
    if (authStatus === 'loading') return;
    
    // Auth state resolved - check authentication
    if (authStatus === 'unauthenticated') {
      // Check if we're in demo mode (demo mode is separate, not authenticated)
      if (window.location.pathname.startsWith('/demo')) {
        router.replace('/demo');
        return;
      }
      // Unauthenticated - redirect to login
      router.replace('/login?redirect=/security');
      return;
    }

    // Get last login from session metadata (only if authenticated)
    if (authStatus === 'authenticated' && user) {
      const sessionData = user.last_sign_in_at || user.created_at;
      if (sessionData) {
        const date = new Date(sessionData);
        setLastLogin(date.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }));
      }
    }
  }, [authStatus, user, router]);

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[800px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Security</h1>
          <p className="text-sm text-[#6B7280]">
            Your account security settings and session information
          </p>
        </div>

        {/* Session Policy */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <ShieldCheckIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Session Policy</h2>
              <p className="text-sm text-[#6B7280]">
                For your security, you'll be automatically logged out after 15 minutes of inactivity.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <InfoIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#0F172A] font-medium mb-1">Inactivity Warning</p>
                  <p className="text-[#6B7280]">
                    You'll receive a warning after 13 minutes of inactivity with the option to stay signed in.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <InfoIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#0F172A] font-medium mb-1">Automatic Logout</p>
                  <p className="text-[#6B7280]">
                    After 15 minutes of inactivity, you'll be automatically logged out to keep your account secure.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <InfoIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#0F172A] font-medium mb-1">Activity Tracking</p>
                  <p className="text-[#6B7280]">
                    We track mouse movements, clicks, keyboard input, and API requests to determine activity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Login */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-start gap-3">
            <ClockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Last Login</h2>
              {lastLogin ? (
                <p className="text-sm text-[#6B7280]">{lastLogin}</p>
              ) : (
                <p className="text-sm text-[#6B7280]">Not available</p>
              )}
            </div>
          </div>
        </div>

        {/* Data Security */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <div className="flex items-start gap-3">
            <LockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Data Security</h2>
              <div className="space-y-3 text-sm text-[#6B7280]">
                <p>
                  • Your data is encrypted and stored securely in India
                </p>
                <p>
                  • We use bank-grade encryption for all data transmission
                </p>
                <p>
                  • Your session data is cleared when you log out
                </p>
                <p>
                  • We never share your information with third parties
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

