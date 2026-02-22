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

import { useState, useEffect } from 'react';
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
  const { plans, loading: plansLoading, error: plansError } = usePlans();

  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidPlans = getPaidPlans(plans);
  const planParam = searchParams.get('plan');

  useEffect(() => {
    if (!plansLoading && paidPlans.length > 0 && !selectedPlan) {
      const name = planParam?.toLowerCase();
      const match = name
        ? paidPlans.find((p) => p.name.toLowerCase() === name)
        : paidPlans[0];
      setSelectedPlan(match ?? paidPlans[0]);
    }
  }, [plans, plansLoading, paidPlans, planParam, selectedPlan]);

  const handleUpgrade = async () => {
    if (!user?.id || !selectedPlan) return;
    if (!selectedPlan.razorpay_plan_id && !selectedPlan.id) {
      setError('This plan is not configured for checkout. Please contact support.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userId: user.id,
          billingCycle,
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
          setSubmitting(false);
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Something went wrong');
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

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />
      <main className="max-w-md mx-auto px-4 py-10 sm:py-16">
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          Upgrade your plan
        </h1>
        <p className="text-[#6B7280] dark:text-[#94A3B8] mb-8">
          Select a plan and complete payment. Your subscription will activate automatically.
        </p>

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
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => hasRazorpay && setSelectedPlan(plan)}
                disabled={!hasRazorpay}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-colors ${
                  isSelected
                    ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E3A8A]/30'
                    : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#94A3B8] dark:hover:border-[#64748B]'
                } ${!hasRazorpay ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#2563EB] dark:bg-[#3B82F6]' : 'border-[#94A3B8] dark:border-[#64748B]'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {plan.name}
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      {formatPrice(plan, billingCycle)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleUpgrade}
          disabled={submitting || !selectedPlan}
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
