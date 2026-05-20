/**
 * ONBOARDING — Pick What You Own
 * Route: /onboarding/select
 *
 * Two-step flow:
 *
 *   STEP 1 — "select"
 *   Multi-select asset tile grid. Plan-gated tiles are visually disabled
 *   with a Pro/Premium lock badge — no click required to see the restriction.
 *   Bottom bar:
 *     • 0 free-tier assets selected → "Skip to Dashboard"
 *     • 1 selected                  → "Continue →" (skips step 2, goes direct to add page)
 *     • 2+ selected                 → "Continue →" (shows step 2 card grid)
 *
 *   STEP 2 — "add-details"  (only when ≥ 2 selected)
 *   Numbered cards for each selected asset, each linking to its add page.
 *   Queue is written to localStorage BEFORE this screen so all asset pages
 *   can read context. Back goes to step 1.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { createClient } from '@/lib/supabase/client';
import { writeQueue, getOnboardingLaunchRoute, withOnboardingParam } from '@/lib/onboarding-queue';
import { ASSET_CATALOG_BY_ID, ASSET_CATALOG_GROUPS, type AssetCatalogItem } from '@/lib/asset-catalog';

// ─── Helper ───────────────────────────────────────────────────────────────────

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
  } catch { /* non-critical */ }
}

// ─── Page component ───────────────────────────────────────────────────────────

type PageStep = 'select' | 'add-details';

export default function OnboardingSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authStatus } = useAuth();
  const { hasCapability, loading: capLoading } = useCapabilities();

  const [step, setStep] = useState<PageStep>('select');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/onboarding');
    }
  }, [authStatus, router]);

  // Restore in-progress onboarding selections when user returns from an asset page.
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(`onboarding_selections_${user.id}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;

      const validIds = parsed.filter((id: unknown) => typeof id === 'string' && !!ASSET_CATALOG_BY_ID[id]);
      if (validIds.length === 0) return;

      // Defer state updates to avoid synchronous setState inside effect body.
      queueMicrotask(() => {
        setSelected(new Set(validIds));

        const requestedStep = searchParams?.get('step');
        if (requestedStep === 'add-details' && validIds.length > 1) {
          setStep('add-details');
        }
      });
    } catch {
      // ignore localStorage parse errors
    }
  }, [user?.id, searchParams]);

  const isAccessible = (item: AssetCatalogItem): boolean => {
    if (!item.requiredCapability) return true;
    return hasCapability(item.requiredCapability);
  };

  const toggleItem = (id: string) => {
    const item = ASSET_CATALOG_BY_ID[id];
    if (!item || !isAccessible(item)) return; // guard for locked items
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── "Skip to Dashboard" ──────────────────────────────────────────────────
  const handleSkip = async () => {
    setIsSaving(true);
    if (user?.id) {
      await markOnboardingComplete(user.id);
      localStorage.removeItem(`onboarding_state_${user.id}`);
      // Local fallback so dashboard redirect guard does not bounce before profile refresh catches up
      localStorage.setItem(`onboarding_completed_${user.id}`, '1');
    }
    router.replace('/dashboard?from=onboarding');
  };

  // ── "Continue →" ────────────────────────────────────────────────────────
  const handleContinue = async () => {
    if (!user?.id || selected.size === 0) return;
    setIsSaving(true);

    const orderedIds = ASSET_CATALOG_GROUPS
      .flatMap(g => g.items)
      .map(item => item.id)
      .filter(id => selected.has(id));

    localStorage.setItem(`onboarding_selections_${user.id}`, JSON.stringify(orderedIds));
    localStorage.removeItem(`onboarding_state_${user.id}`);
    localStorage.setItem(`onboarding_completed_${user.id}`, '1');
    await markOnboardingComplete(user.id);

    if (orderedIds.length === 1) {
      // Single asset: skip step 2, go directly to the add page
      writeQueue(user.id, orderedIds);
      const route = getOnboardingLaunchRoute(orderedIds[0]);
      router.replace(withOnboardingParam(route));
      return;
    }

    // Multiple: write queue, show step 2
    writeQueue(user.id, orderedIds);
    setIsSaving(false);
    setStep('add-details');
  };

  // ── "Go to Dashboard" from add-details screen ────────────────────────────
  const handleGoToDashboard = async () => {
    setIsSaving(true);
    if (user?.id) {
      localStorage.setItem(`onboarding_completed_${user.id}`, '1');
    }
    router.replace('/dashboard?from=onboarding');
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const selectedCount = selected.size;
  const selectedItems = ASSET_CATALOG_GROUPS
    .flatMap(g => g.items)
    .filter(item => selected.has(item.id));

  // ── STEP 2: Add Details ──────────────────────────────────────────────────
  if (step === 'add-details') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col">
        <AppHeader />
        <main className="flex-1 px-4 sm:px-6 py-8 pt-24 sm:pt-28 pb-32 sm:pb-16">
          <div className="w-full max-w-3xl mx-auto">

            {/* Success heading */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Great! Now let&apos;s add your details.
                </h1>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Select any category below to add details now, or skip and continue from dashboard later.
                </p>
              </div>
            </div>

            {/* Numbered cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedItems.map((item, idx) => (
                <Link
                  key={item.id}
                  href={withOnboardingParam(getOnboardingLaunchRoute(item.id))}
                  className="group flex items-center gap-4 p-4 rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all duration-150"
                >
                  {/* Step number */}
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#334155] flex items-center justify-center text-xl shrink-0">
                    {item.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5 truncate">
                      {item.description}
                    </p>
                  </div>

                  <ArrowRightIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#64748B] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-colors" />
                </Link>
              ))}
            </div>

            <p className="mt-5 text-xs text-center text-[#9CA3AF] dark:text-[#64748B]">
              Skipping this step will not lose anything - you can add or edit assets anytime from dashboard.
            </p>
          </div>
        </main>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto bg-white dark:bg-[#1E293B] border-t border-[#E5E7EB] dark:border-[#334155] px-4 sm:px-6 py-4 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep('select')}
              className="btn-secondary-standard"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Change selection
            </button>
            <button
              type="button"
              onClick={handleGoToDashboard}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>I&apos;ll add these later <ArrowRightIcon className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1: Select ────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col">
      <AppHeader />
      <main className="flex-1 px-4 sm:px-6 pt-20 sm:pt-22 pb-12 overflow-hidden">
        <div className="w-full max-w-4xl mx-auto">

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors mb-3"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </Link>

          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
              What do you currently own?
            </h1>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Select all that apply. We&apos;ll guide you to add each one.
            </p>
          </div>

          <div className="space-y-2.5">
            {ASSET_CATALOG_GROUPS.map(group => (
              <div key={group.id}>
                <h3 className="text-xs font-bold text-[#B6C2D4] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 pb-1 border-b border-[#E5E7EB] dark:border-[#334155]">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {group.items.map(item => {
                    const locked = !capLoading && !!item.requiredCapability && !hasCapability(item.requiredCapability);
                    const isSelected = selected.has(item.id);

                    return (
                      <div key={item.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          disabled={locked}
                          aria-pressed={isSelected}
                          aria-label={locked ? `${item.label} — requires ${item.requiredPlan} plan` : item.label}
                          className={`
                            flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left w-full transition-all duration-150
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1
                            ${locked
                              ? 'border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#1E293B]/60 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                              : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#9CA3AF] dark:hover:border-[#475569]'
                            }
                          `}
                        >
                          <span className="text-base shrink-0" aria-hidden="true">{item.icon}</span>
                          <span className={`text-xs font-medium flex-1 ${
                            locked
                              ? 'text-[#9CA3AF] dark:text-[#64748B]'
                              : isSelected
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-[#0F172A] dark:text-[#F8FAFC]'
                          }`}>
                            {item.label}
                          </span>

                          {locked ? (
                            /* Lock badge */
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                              🔒 {item.requiredPlan}
                            </span>
                          ) : (
                            /* Checkmark */
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-[#D1D5DB] dark:border-[#475569] bg-transparent'
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )}
                        </button>

                        {/* Tooltip shown on hover for locked tiles */}
                        {locked && (
                          <div className="absolute inset-0 rounded-xl flex items-end justify-center pointer-events-none group-hover:opacity-100">
                            <div className="hidden group-hover:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] text-xs font-medium whitespace-nowrap shadow-lg z-20">
                              Upgrade to {item.requiredPlan} to track this
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto bg-white dark:bg-[#1E293B] border-t border-[#E5E7EB] dark:border-[#334155] px-4 sm:px-6 py-2.5 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] shrink-0">
            {selectedCount === 0 ? 'Nothing selected' : `${selectedCount} selected`}
          </p>

          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Continue <ArrowRightIcon className="w-4 h-4" /></>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Skip to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
