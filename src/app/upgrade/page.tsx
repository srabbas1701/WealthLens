'use client';

/**
 * Upgrade Page – Razorpay Checkout
 *
 * Flow:
 * 1. User selects plan + billing cycle, clicks Upgrade
 * 2. Call /api/payments/create-subscription
 * 3. Open Razorpay checkout modal
 * 4. Do NOT trust frontend success – webhook handles activation
 * 5. After checkout (success or close), show message to refresh / check subscription
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthSession } from '@/lib/auth';
import { usePlans, type PricingPlan } from '@/hooks/usePlans';
import { AppHeader } from '@/components/AppHeader';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler?: (response: unknown) => void;
  modal?: { ondismiss?: () => void };
};

const CURRENCY = '₹';
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

type PaymentState = 'idle' | 'processing' | 'verifying' | 'success' | 'timeout' | 'error';

function getUserFriendlyError(rawError: string): string {
  const lower = rawError.toLowerCase();
  if (lower.includes('duplicate key') || lower.includes('duplicate') && lower.includes('key')) {
    return 'You already have a subscription in progress. Please wait a moment and refresh.';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('networkerror') ||
    (lower.includes('typeerror') && lower.includes('fetch'))
  ) {
    return 'Unable to connect. Please check your connection and try again.';
  }
  return 'Something went wrong. Please try again or contact support.';
}

function getPaidPlans(plans: PricingPlan[]): PricingPlan[] {
  return plans.filter(
    (p) => p.monthly_price != null && p.monthly_price > 0
  );
}

function formatPrice(plan: PricingPlan, billingCycle: 'monthly' | 'yearly'): string {
  if (billingCycle === 'yearly' && plan.annual_price != null) {
    return `${CURRENCY}${plan.annual_price.toLocaleString('en-IN')}/year`;
  }
  const monthly = plan.monthly_price ?? 0;
  return `${CURRENCY}${monthly.toLocaleString('en-IN')}/month`;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

export default function UpgradePage() {
  const { user, authStatus } = useAuthSession();
  const searchParams = useSearchParams();

  const planParam = searchParams.get('plan');
  const cycleParam = searchParams.get('cycle');

  const { plans, loading: plansLoading, error: plansError } = usePlans();

  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    cycleParam === 'yearly' ? 'yearly' : 'monthly'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [activatedPlanName, setActivatedPlanName] = useState<string | null>(null);
  const handlerFiredRef = useRef(false);

  const [currentSub, setCurrentSub] = useState<{
    tier: string;
    billing_cycle: string;
    current_period_end: string | null;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch('/api/plans/user')
      .then(r => r.json())
      .then(data => {
        if (data?.tier && data.tier !== 'free') {
          setCurrentSub({
            tier: data.tier,
            billing_cycle: data.billing_cycle,
            current_period_end: data.current_period_end,
            status: data.status,
          });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const currentUserTier = currentSub?.tier ?? 'free';
  const currentUserRank = PLAN_RANK[currentUserTier] ?? 0;

  const allPaidPlans = getPaidPlans(plans);
  const paidPlans = allPaidPlans.filter((p) => {
    const planTier = p.name?.toLowerCase() ?? '';
    const planRank = PLAN_RANK[planTier] ?? 0;
    if (planRank > currentUserRank) return true;
    if (
      planRank === currentUserRank &&
      currentSub?.status === 'active' &&
      currentSub?.billing_cycle !== billingCycle &&
      billingCycle === 'yearly'
    ) return true;
    return false;
  });
  useEffect(() => {
    if (!plansLoading && paidPlans.length > 0 && !selectedPlan) {
      const name = planParam?.toLowerCase();
      const match = name
        ? paidPlans.find((p) => p.name.toLowerCase() === name)
        : paidPlans[0];
      setSelectedPlan(match ?? paidPlans[0]);
    }
  }, [plans, plansLoading, paidPlans, planParam, selectedPlan]);

  // Poll /api/plans/user when verifying payment
  useEffect(() => {
    if (paymentState !== 'verifying') return;

    const POLL_INTERVAL = 2000;
    const MAX_POLL_TIME = 30000;
    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/plans/user');
        const data = await res.json();
        const planId = data?.plan_id;
        const planName = data?.plan_name ?? data?.plan?.name;
        if (planId && planId !== 'free') {
          setActivatedPlanName(planName || selectedPlan?.name || 'Pro');
          setPaymentState('success');
          return true;
        }
      } catch {
        /* ignore fetch errors during poll */
      }
      return false;
    };

    const runPoll = async () => {
      if (Date.now() - startTime >= MAX_POLL_TIME) {
        setPaymentState('timeout');
        return;
      }
      const done = await poll();
      if (done) return;
      timeoutId = setTimeout(runPoll, POLL_INTERVAL);
    };

    runPoll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentState, selectedPlan?.name]);

  const handleUpgrade = async () => {
    if (!user?.id || !selectedPlan) return;
    if (!selectedPlan.razorpay_plan_id && !selectedPlan.id) {
      setError('This plan is not configured for checkout. Please contact support.');
      return;
    }

    handlerFiredRef.current = false;
    setSubmitting(true);
    setError(null);
    setPaymentState('processing');

    try {
      const res = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.name?.toLowerCase() as 'pro' | 'premium',
          billingCycle: billingCycle === 'yearly' ? 'annual' : 'monthly',
          userId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to create subscription');
      }

      const { subscriptionId, checkoutOptions } = data;
      if (!subscriptionId || !checkoutOptions?.key || !checkoutOptions?.subscription_id) {
        throw new Error('Invalid checkout response');
      }

      await loadRazorpayScript();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error('Razorpay checkout could not be loaded');

      const options: RazorpayOptions = {
        key: checkoutOptions.key,
        subscription_id: checkoutOptions.subscription_id,
        name: 'LensOnWealth',
        description: `${selectedPlan.name} – ${formatPrice(selectedPlan, billingCycle)}`,
        prefill: {
          email: user.email ?? undefined,
          contact: (user as { phone?: string }).phone ?? undefined,
          name: (user.user_metadata as { full_name?: string } | undefined)?.full_name ?? undefined,
        },
        handler: () => {
          handlerFiredRef.current = true;
          setSubmitting(false);
          setPaymentState('verifying');
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            if (!handlerFiredRef.current) {
              setPaymentState('idle');
            }
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      setSubmitting(false);
      setPaymentState('error');
      const rawMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(getUserFriendlyError(rawMessage));
    }
  };

  if (authStatus === 'loading' || plansLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6">
            Please sign in to upgrade your plan.
          </p>
          <Link
            href="/login?redirect=/upgrade"
            className="inline-block px-6 py-3 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-semibold rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB]"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  if (plansError || paidPlans.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6">
            {plansError || 'No upgrade plans available at this time.'}
          </p>
          <Link
            href="/"
            className="text-[#2563EB] dark:text-[#3B82F6] hover:underline"
          >
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  // Premium user — already on highest plan
  if (currentSub?.tier === 'premium' && currentSub?.status === 'active') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#16A34A] dark:bg-[#22C55E] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            You're on Premium
          </h1>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-8">
            You already have the highest plan. All features are unlocked.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#2563EB] dark:bg-[#3B82F6] text-white font-semibold rounded-xl"
          >
            Go to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Success screen – replace entire page content
  if (paymentState === 'success') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-16 sm:py-24 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
          <div className="w-20 h-20 rounded-full bg-[#16A34A] dark:bg-[#22C55E] flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            Welcome to {activatedPlanName || selectedPlan?.name || 'Pro'}!
          </h1>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-8 max-w-sm">
            Your subscription is now active. Enjoy full access to LensOnWealth.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white font-semibold rounded-xl transition-colors shadow-lg"
          >
            Go to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Timeout screen – payment received but activation pending
  if (paymentState === 'timeout') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-16 sm:py-24 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
          <p className="text-[#0F172A] dark:text-[#F8FAFC] mb-8">
            Payment received! Your account will be activated shortly. Please refresh in a minute.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white font-semibold rounded-xl transition-colors"
          >
            Go to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Verifying overlay – full-page when payment just completed */}
      {paymentState === 'verifying' && (
        <div className="fixed inset-0 z-50 bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mb-6" />
          <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Verifying your payment...</p>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">This usually takes a few seconds</p>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 py-10 sm:py-16">
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Upgrade your plan
        </h1>
        <p className="text-[#6B7280] dark:text-[#94A3B8] mb-8">
          Select a plan and complete payment. Your subscription will activate automatically.
        </p>

        {currentSub?.tier && currentSub.tier !== 'free' && (
          <div className="mb-6 p-3 bg-[#F0FDF4] dark:bg-[#14532D]/30 border border-[#BBF7D0] dark:border-[#166534] rounded-lg">
            <p className="text-sm text-[#16A34A] dark:text-[#22C55E] font-medium">
              ✓ Currently on{' '}
              <span className="capitalize font-bold">{currentSub.tier}</span>
              {currentSub.billing_cycle
                ? ` (${currentSub.billing_cycle === 'yearly' || currentSub.billing_cycle === 'annual' ? 'Annual' : 'Monthly'})`
                : ''}
              {' '}— upgrading will take effect immediately after payment.
            </p>
          </div>
        )}

        {/* Billing cycle toggle */}
        <div className="flex rounded-lg bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-1 mb-6">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white'
                : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white'
                : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            Yearly (save more)
          </button>
        </div>

        {/* Plan options */}
        <div className="space-y-3 mb-8">
          {paidPlans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            const hasRazorpay = !!(plan.razorpay_plan_id || plan.id);

            const isCurrentPlan = currentSub?.tier === plan.name?.toLowerCase() &&
              currentSub?.billing_cycle === (billingCycle === 'yearly' ? 'yearly' : 'monthly') &&
              currentSub?.status === 'active';

            const isLowerPlan = currentSub &&
              PLAN_RANK[plan.name?.toLowerCase()] < PLAN_RANK[currentSub.tier];

            const renewalDate = isCurrentPlan && currentSub?.current_period_end
              ? new Date(currentSub.current_period_end).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })
              : null;

            const isDisabled = !hasRazorpay || isCurrentPlan || !!isLowerPlan;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => !isDisabled && setSelectedPlan(plan)}
                disabled={isDisabled}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-colors ${
                  isCurrentPlan
                    ? 'border-[#16A34A] dark:border-[#22C55E] bg-[#F0FDF4] dark:bg-[#14532D]/30'
                    : isLowerPlan
                      ? 'border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#1E293B] opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E3A8A]/30'
                        : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#94A3B8] dark:hover:border-[#64748B]'
                } ${!hasRazorpay && !isCurrentPlan && !isLowerPlan ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {isCurrentPlan ? (
                    <div className="w-5 h-5 rounded-full bg-[#16A34A] dark:bg-[#22C55E] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected && !isLowerPlan ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#2563EB] dark:bg-[#3B82F6]' : 'border-[#94A3B8] dark:border-[#64748B]'
                      }`}
                    >
                      {isSelected && !isLowerPlan && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {plan.name}
                      </p>
                      {isCurrentPlan && (
                        <span className="text-xs font-medium text-[#16A34A] dark:text-[#22C55E] bg-[#DCFCE7] dark:bg-[#14532D] px-2 py-0.5 rounded-full">
                          ✓ Current Plan
                        </span>
                      )}
                      {isLowerPlan && (
                        <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] bg-[#F3F4F6] dark:bg-[#334155] px-2 py-0.5 rounded-full">
                          Lower Plan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      {formatPrice(plan, billingCycle)}
                    </p>
                    {renewalDate && (
                      <p className="text-xs text-[#16A34A] dark:text-[#22C55E] mt-0.5">
                        Renews on {renewalDate}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && paymentState === 'error' && (
          <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleUpgrade}
          disabled={submitting || !selectedPlan ||
            (currentSub?.tier === selectedPlan?.name?.toLowerCase() &&
             currentSub?.billing_cycle === (billingCycle === 'yearly' ? 'yearly' : 'monthly') &&
             currentSub?.status === 'active')}
          className="w-full py-4 px-6 bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Opening checkout…
            </>
          ) : (
            'Proceed to payment'
          )}
        </button>

        <p className="mt-3 text-xs text-center text-[#6B7280] dark:text-[#94A3B8]">
          ⓘ ICICI Bank UPI users may experience payment failures.
          Please try Google Pay or PhonePe linked to a non-ICICI account,
          or use Netbanking/Card instead.
        </p>

        <p className="mt-6 text-xs text-[#6B7280] dark:text-[#94A3B8] text-center">
          After payment, your subscription will activate automatically. Refresh the page or check
          your account to see updated access.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6]"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
