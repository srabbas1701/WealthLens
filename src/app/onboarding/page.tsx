/**
 * ONBOARDING SCREEN 1 — Welcome / Quick Start
 *
 * New users land here after email/phone verification.
 * Three clear paths:
 *   A. Upload CAS Statement (recommended — auto-imports MF, stocks, bonds)
 *   B. Pick What You Own  → /onboarding/select
 *   C. Just Explore First → skip to /dashboard
 *
 * Max clicks to dashboard: 1 (paths A or C) or 2 (path B + Continue).
 *
 * PRESERVED BEHAVIOURS (do not break):
 * - Auth guard: unauthenticated → /login, has portfolio → /dashboard
 * - PortfolioUploadModal integration for CAS upload
 * - refreshProfile() + markOnboardingComplete() before dashboard redirect
 * - Redirect-loop prevention via localStorage counters
 * - Dark mode / light mode compatibility
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UploadIcon, CheckCircleIcon, ArrowRightIcon } from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import PortfolioUploadModal from '@/components/PortfolioUploadModal';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

/** Upserts onboarding_snapshots.is_complete = true so dashboard does not redirect back. */
async function markOnboardingComplete(userId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('onboarding_snapshots').upsert(
      {
        user_id: userId,
        is_complete: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'user_id' }
    );
  } catch {
    // Non-critical: if this fails, user lands back on onboarding — acceptable edge case.
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authStatus, hasPortfolio, refreshProfile } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const redirectAttemptedRef = useRef(false);

  // ─── Auth guards (preserve existing loop-prevention logic) ────────────────
  useEffect(() => {
    if (pathname !== '/onboarding') return;
    if (authStatus === 'loading') return;

    if (authStatus === 'unauthenticated') {
      redirectAttemptedRef.current = false;
      router.replace('/login?redirect=/onboarding');
      return;
    }

    // Check if we just came from dashboard to prevent loops
    const dashboardRedirectKey = `dashboard_redirect_${user?.id}`;
    const dashboardRedirectData = user?.id ? localStorage.getItem(dashboardRedirectKey) : null;
    const now = Date.now();
    let timeSinceDashboardRedirect = Infinity;
    if (dashboardRedirectData) {
      try {
        const parsed = JSON.parse(dashboardRedirectData);
        timeSinceDashboardRedirect = now - (parsed.timestamp || 0);
      } catch {
        // ignore
      }
    }

    if (
      authStatus === 'authenticated' &&
      hasPortfolio &&
      !redirectAttemptedRef.current &&
      timeSinceDashboardRedirect > 15000
    ) {
      const redirectKey = `onboarding_redirect_${user?.id}`;
      const redirectData = user?.id ? localStorage.getItem(redirectKey) : null;
      let lastRedirectTime = 0;
      let redirectCount = 0;
      if (redirectData) {
        try {
          const parsed = JSON.parse(redirectData);
          lastRedirectTime = parsed.timestamp || 0;
          redirectCount = parsed.count || 0;
        } catch {
          if (user?.id) localStorage.removeItem(redirectKey);
        }
      }

      const timeSinceRedirect = now - lastRedirectTime;
      if (timeSinceRedirect > 10000 && redirectCount < 3) {
        redirectAttemptedRef.current = true;
        if (user?.id) {
          localStorage.setItem(redirectKey, JSON.stringify({
            timestamp: now,
            count: redirectCount + 1,
            expiresAt: now + 60000,
          }));
          localStorage.removeItem(dashboardRedirectKey);
        }
        router.replace('/dashboard');
      }
    } else if (!hasPortfolio && user?.id) {
      redirectAttemptedRef.current = false;
      localStorage.removeItem(`onboarding_redirect_${user.id}`);
    }
  }, [authStatus, hasPortfolio, router, user?.id, pathname]);

  // ─── Handler: "Just Explore First" / skip ────────────────────────────────
  const handleExplore = async () => {
    if (user?.id) {
      await markOnboardingComplete(user.id);
      localStorage.removeItem(`onboarding_state_${user.id}`);
    }
    await refreshProfile();
    router.replace('/dashboard');
  };

  // ─── Loading / redirect guards ────────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || (authStatus === 'authenticated' && hasPortfolio)) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Redirecting…</p>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 pt-24 sm:pt-28">
        <div className="w-full max-w-3xl">
          {/* Heading */}
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight mb-3">
              Let&apos;s build your complete financial picture
            </h1>
            <p className="text-base text-[#6B7280] dark:text-[#94A3B8] max-w-xl mx-auto">
              Choose how you&apos;d like to get started. You can always change this later.
            </p>
          </div>

          {/* Three option cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">

            {/* ── Card A: Upload CAS — Recommended ── */}
            <div className="relative flex flex-col bg-white dark:bg-[#1E293B] rounded-2xl border-2 border-emerald-500 dark:border-emerald-500 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6">
              {/* Recommended badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                  Recommended
                </span>
              </div>

              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 mt-2">
                <UploadIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Upload a Statement
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] flex-1 mb-5">
                Auto-import from CAS (NSDL/CDSL), Zerodha, Groww, Kuvera, ICICI Direct, HDFC Securities, and more. CSV / XLSX accepted.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                aria-label="Upload portfolio statement"
              >
                Upload Statement
              </button>
            </div>

            {/* ── Card B: Pick What You Own ── */}
            <div className="flex flex-col bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:shadow-md hover:border-[#9CA3AF] dark:hover:border-[#475569] hover:-translate-y-0.5 transition-all duration-200 p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <CheckCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Pick What You Own
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] flex-1 mb-5">
                Select the asset types you have. We&apos;ll set up your dashboard accordingly.
              </p>
              <Link
                href="/onboarding/select"
                className="w-full py-2.5 rounded-lg border-2 border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 block"
                aria-label="Choose asset types you own"
              >
                Choose Assets
              </Link>
            </div>

            {/* ── Card C: Just Explore First ── */}
            <div className="flex flex-col bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:shadow-md hover:border-[#9CA3AF] dark:hover:border-[#475569] hover:-translate-y-0.5 transition-all duration-200 p-6">
              <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] dark:bg-[#334155] flex items-center justify-center mb-4">
                <ArrowRightIcon className="w-6 h-6 text-[#6B7280] dark:text-[#94A3B8]" />
              </div>
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Just Explore First
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] flex-1 mb-5">
                Skip setup and head straight to your dashboard. Add investments anytime.
              </p>
              <button
                onClick={handleExplore}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9CA3AF] focus-visible:ring-offset-2"
                aria-label="Skip setup and go to dashboard"
              >
                Take Me to Dashboard
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[#9CA3AF] dark:text-[#64748B]">
            🔒 Your data stays in India. End-to-end encrypted.
          </p>
        </div>
      </main>

      {/* Compact footer */}
      <footer className="border-t border-[#E5E7EB] dark:border-[#334155] py-4 shrink-0">
        <p className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
          © {new Date().getFullYear()} LensOnWealth ·{' '}
          <Link href="/privacy" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors">
            Privacy
          </Link>
          {' · '}
          <Link href="/terms" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors">
            Terms
          </Link>
          {' · '}
          🔒 Core data stored in India
        </p>
      </footer>

      {/* CAS Upload Modal — unchanged integration */}
      {user && isUploadModalOpen && (
        <PortfolioUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          userId={user.id}
          source="onboarding"
          onSuccess={async () => {
            setIsUploadModalOpen(false);
            if (user?.id) {
              await markOnboardingComplete(user.id);
              localStorage.removeItem(`onboarding_state_${user.id}`);
            }
            await refreshProfile();
            router.replace('/dashboard');
          }}
        />
      )}
    </div>
  );
}
