'use client';

import Link from 'next/link';
import type { PricingPlan, CurrentSubscription } from '@/hooks/usePlans';

const CURRENCY = '₹';
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

type Tier = 'free' | 'pro' | 'premium';

const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
};

const TIER_CONFIG: Record<
  Tier,
  {
    tagline: string;
    features: string[];
    ctaText: string;
    ctaHref: string;
    microcopy?: string;
  }
> = {
  free: {
    tagline: 'Track and organize your financial records in one place.',
    features: [
      'Equity & Mutual Fund tracking',
      'Retirement account visibility',
      'Automated price updates (after market hours)',
      'Allocation summaries',
      'CSV upload & manual entry',
      'India-hosted secure data',
    ],
    ctaText: 'Get Started Free',
    ctaHref: '/signup',
    microcopy: 'No credit card required',
  },
  pro: {
    tagline: 'Most popular · Everything you need to stay in control',
    features: [
      'Everything in Free',
      'Real asset tracking (real estate, gold & more)',
      'Liabilities tracking',
      'Advanced reporting tools',
      'Sector & market exposure breakdown',
      'Capital gains summaries (informational)',
      'Scenario comparison tools',
      'PDF & Excel exports',
    ],
    ctaText: 'Upgrade to Pro',
    ctaHref: '/upgrade?plan=pro',
    microcopy: 'Billed monthly or yearly',
  },
  premium: {
    tagline: 'Intelligence when you need it',
    features: [
      'Everything in Pro',
      'AI-powered data explanations',
      'Weekly portfolio summaries',
      'Advanced scenario comparisons',
      'Priority support',
    ],
    ctaText: 'Upgrade to Premium',
    ctaHref: '/upgrade?plan=premium',
    microcopy: 'Billed monthly or yearly',
  },
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatRenewalDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function getThreeTiers(
  plans: PricingPlan[]
): Array<{ tier: Tier; plan: PricingPlan | null }> {
  const sorted = [...plans].sort(
    (a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0)
  );
  const freePlan =
    sorted.find((p) => p.monthly_price === 0 || p.monthly_price === null) ??
    null;
  const paid = sorted.filter(
    (p) => p.monthly_price != null && p.monthly_price > 0
  );
  const proPlan = paid.length >= 2 ? paid[0]! : paid[0] ?? null;
  const premiumPlan = paid.length >= 1 ? paid[paid.length - 1]! : null;
  return [
    { tier: 'free', plan: freePlan },
    { tier: 'pro', plan: proPlan },
    { tier: 'premium', plan: premiumPlan },
  ];
}

function formatPrice(
  plan: PricingPlan | null,
  tier: Tier
): { primary: string; secondary?: string } {
  if (!plan) {
    if (tier === 'free') return { primary: `${CURRENCY}0`, secondary: '/month' };
    return { primary: '—', secondary: undefined };
  }
  const monthly = plan.monthly_price ?? null;
  const annual = plan.annual_price ?? null;
  if (monthly !== null && monthly !== undefined) {
    if (monthly === 0)
      return { primary: `${CURRENCY}0`, secondary: '/month' };
    const yearlySavings =
      annual && monthly > 0
        ? Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100)
        : null;
    const yearlyMo = annual ? Math.round(annual / 12) : null;
    return {
      primary: `${CURRENCY}${monthly.toLocaleString('en-IN')}`,
      secondary:
        yearlySavings && yearlySavings > 0 && yearlyMo != null
          ? `/month · or ${CURRENCY}${annual.toLocaleString('en-IN')}/year (save ${yearlySavings}%)`
          : '/month',
    };
  }
  if (annual !== null && annual !== undefined)
    return {
      primary: `${CURRENCY}${annual.toLocaleString('en-IN')}`,
      secondary: '/year',
    };
  if (tier === 'free') return { primary: `${CURRENCY}0`, secondary: '/month' };
  return { primary: '—', secondary: undefined };
}

interface PricingSectionProps {
  plans: PricingPlan[];
  loading: boolean;
  error: string | null;
  currentSubscription?: CurrentSubscription | null;
  isLoggedIn?: boolean;
}

export default function PricingSection({
  plans,
  loading,
  error,
  currentSubscription,
  isLoggedIn = false,
}: PricingSectionProps) {
  if (loading) {
    return (
      <section
        id="pricing"
        className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8]">
              Free to start. Upgrade for enhanced reporting and automation.
            </p>
          </div>
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (error || plans.length === 0) {
    return (
      <section
        id="pricing"
        className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Simple, Transparent Pricing
            </h2>
          </div>
          <p className="text-center text-[#6B7280] dark:text-[#94A3B8] py-12">
            {error || 'No plans available at this time.'}
          </p>
        </div>
      </section>
    );
  }

  const tiers = getThreeTiers(plans);
  const activeTier = currentSubscription?.status === 'active'
    ? currentSubscription.tier
    : null;
  const activeBillingCycle = currentSubscription?.billingCycle ?? null;
  const isMonthlyPro =
    activeTier === 'pro' &&
    (activeBillingCycle === 'monthly');

  const proPlan = tiers.find((t) => t.tier === 'pro')?.plan ?? null;
  const proMonthlyCost = proPlan?.monthly_price ?? 0;
  const proAnnualCost = proPlan?.annual_price ?? 0;
  const annualSavings =
    proMonthlyCost > 0 && proAnnualCost > 0
      ? Math.round(proMonthlyCost * 12 - proAnnualCost)
      : 0;
  const annualSavingsPct =
    proMonthlyCost > 0 && proAnnualCost > 0
      ? Math.round(
          ((proMonthlyCost * 12 - proAnnualCost) / (proMonthlyCost * 12)) * 100
        )
      : 0;

  return (
    <section
      id="pricing"
      className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Simple, Transparent Pricing
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8]">
            Free to start. Upgrade for enhanced reporting and automation.
          </p>
          {/* Logged-in greeting */}
          {isLoggedIn && activeTier && (
            <p className="text-sm text-[#16A34A] dark:text-[#22C55E] font-medium">
              You are currently on the{' '}
              <span className="font-bold capitalize">{activeTier}</span> plan
              {activeBillingCycle
                ? ` (${activeBillingCycle === 'yearly' || activeBillingCycle === 'annual' ? 'Annual' : 'Monthly'})`
                : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto overflow-x-hidden">
          {tiers.map(({ tier, plan }) => {
            const config = TIER_CONFIG[tier];
            const isPro = tier === 'pro';
            const isPremium = tier === 'premium';
            const isFree = tier === 'free';
            const { primary: pricePrimary, secondary: priceSecondary } =
              formatPrice(plan, tier);

            const isCurrentPlan =
              activeTier === tier && currentSubscription?.status === 'active';
            const isLowerPlan =
              activeTier !== null &&
              (PLAN_RANK[tier] ?? 0) < (PLAN_RANK[activeTier] ?? 0);
            const renewalDate = isCurrentPlan
              ? formatRenewalDate(currentSubscription?.currentPeriodEnd ?? null)
              : null;

            const orderClass =
              tier === 'free'
                ? 'order-1 md:order-1'
                : tier === 'pro'
                  ? 'order-2 md:order-2'
                  : 'order-3 md:order-3';

            let borderClass = '';
            if (isCurrentPlan) {
              borderClass =
                'border-2 border-[#16A34A] dark:border-[#22C55E] shadow-lg shadow-[#16A34A]/10';
            } else if (isLowerPlan) {
              borderClass =
                'border border-[#E5E7EB] dark:border-[#334155] opacity-60';
            } else if (isPro && !activeTier) {
              borderClass =
                'border-2 border-[#2563EB] dark:border-[#3B82F6] shadow-lg shadow-[#2563EB]/10';
            } else {
              borderClass =
                'border border-[#E5E7EB] dark:border-[#334155] hover:border-[#94A3B8] dark:hover:border-[#64748B]';
            }

            return (
              <div
                key={tier}
                className={`${orderClass} flex flex-col h-full bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl transition-all duration-300 overflow-hidden min-w-0 ${borderClass}`}
              >
                {/* Top labels row */}
                <div className="px-6 pt-4 pb-0 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                      isCurrentPlan
                        ? 'bg-[#DCFCE7] dark:bg-[#14532D] text-[#16A34A] dark:text-[#22C55E]'
                        : isPro && !activeTier
                          ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A] text-[#2563EB] dark:text-[#93C5FD]'
                          : 'bg-[#F1F5F9] dark:bg-[#334155] text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                  {isCurrentPlan && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#16A34A] dark:bg-[#22C55E] text-white shrink-0">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Current Plan
                    </span>
                  )}
                  {!isCurrentPlan && isPro && !activeTier && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#2563EB] dark:bg-[#3B82F6] text-white shrink-0">
                      Most popular
                    </span>
                  )}
                  {isLowerPlan && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] dark:bg-[#334155] text-[#94A3B8] shrink-0">
                      Lower plan
                    </span>
                  )}
                </div>

                <div className="p-6 pt-3 flex flex-col flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                    {plan?.name ?? TIER_LABEL[tier]}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">
                    {isCurrentPlan
                      ? tier === 'pro'
                        ? 'Your active plan · Full access to all Pro features'
                        : 'Your active plan · Full access to all Premium features'
                      : config.tagline}
                  </p>

                  {/* Price block */}
                  <div className="mb-5">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {pricePrimary}
                      </span>
                      {priceSecondary && (
                        <span className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8]">
                          {priceSecondary}
                        </span>
                      )}
                    </div>
                    {/* Renewal date for current plan */}
                    {isCurrentPlan && renewalDate && (
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Next renewal: {renewalDate}
                      </p>
                    )}
                    {isCurrentPlan && !renewalDate && (
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1.5">
                        Active subscription
                      </p>
                    )}
                  </div>

                  {isCurrentPlan && isMonthlyPro && annualSavings > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 border border-[#BFDBFE] dark:border-[#3B82F6]/40">
                      <p className="text-xs font-semibold text-[#1E40AF] dark:text-[#93C5FD] mb-2">
                        💡 Switch to Annual — Save {annualSavingsPct}%
                      </p>
                      <p className="text-xs text-[#3B82F6] dark:text-[#BFDBFE] mb-2">
                        Save ₹{annualSavings.toLocaleString('en-IN')}/year by paying annually
                      </p>
                      <Link
                        href="/upgrade?plan=pro&cycle=yearly"
                        className="inline-block w-full text-center py-1.5 px-3 bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] text-white text-xs font-semibold rounded-md transition-colors"
                      >
                        Switch to Annual →
                      </Link>
                    </div>
                  )}

                  <ul className="space-y-1.5 sm:space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm flex-1 min-w-0">
                    {config.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 min-w-0">
                        <CheckIcon
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isCurrentPlan
                              ? 'text-[#16A34A] dark:text-[#22C55E]'
                              : isPro && !activeTier
                                ? 'text-[#2563EB] dark:text-[#3B82F6]'
                                : isFree
                                  ? 'text-[#16A34A] dark:text-[#22C55E]'
                                  : 'text-[#475569] dark:text-[#94A3B8]'
                          }`}
                        />
                        <span className="break-words">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA area */}
                  <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                    {isCurrentPlan ? (
                      // Current plan — no upgrade button, show manage link
                      <div className="text-center">
                        <div className="w-full py-3 px-4 rounded-lg text-sm font-semibold bg-[#F0FDF4] dark:bg-[#14532D]/40 text-[#16A34A] dark:text-[#22C55E] border border-[#BBF7D0] dark:border-[#166534] cursor-default select-none">
                          ✓ Active Plan · {
                            activeBillingCycle === 'yearly' || activeBillingCycle === 'annual'
                              ? 'Annual'
                              : 'Monthly'
                          }
                        </div>
                        <Link
                          href="/dashboard"
                          className="inline-block mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] underline"
                        >
                          Go to Dashboard →
                        </Link>
                      </div>
                    ) : isLowerPlan ? (
                      // Lower plan — greyed out, not clickable
                      <div className="text-center">
                        <div className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-[#F1F5F9] dark:bg-[#334155] text-[#94A3B8] cursor-not-allowed select-none">
                          Not available
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-2">
                          You're on a higher plan
                        </p>
                      </div>
                    ) : isFree && isLoggedIn ? (
                      // Free tier for logged-in user with paid plan — not applicable
                      <div className="text-center">
                        <div className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-[#F1F5F9] dark:bg-[#334155] text-[#94A3B8] cursor-not-allowed select-none">
                          Included in your plan
                        </div>
                      </div>
                    ) : (
                      // Normal CTA
                      <>
                        <Link
                          href={
                            isFree
                              ? isLoggedIn
                                ? '/dashboard'
                                : '/signup'
                              : config.ctaHref
                          }
                          className={`block w-full min-w-0 py-3 px-4 rounded-lg font-semibold text-sm text-center transition-colors duration-300 ${
                            isPro
                              ? 'bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white'
                              : isPremium
                                ? 'bg-[#F1F5F9] dark:bg-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] text-[#0F172A] dark:text-[#F8FAFC]'
                                : 'bg-[#F1F5F9] dark:bg-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] text-[#0F172A] dark:text-[#F8FAFC]'
                          }`}
                        >
                          {isFree && isLoggedIn
                            ? 'Go to Dashboard'
                            : config.ctaText}
                        </Link>
                        {config.microcopy && (
                          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] text-center mt-2">
                            {config.microcopy}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm mt-10 px-4">
          <span className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" />
            No credit card required to start
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" />
            Cancel anytime
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" />
            No commissions or hidden fees
          </span>
        </div>

        <p className="text-center text-[#6B7280] dark:text-[#94A3B8] text-sm max-w-2xl mx-auto mt-6 px-4">
          Your wealth is always visible in the free tier. Upgrade when you need
          deeper clarity and insights.
        </p>

        <p className="text-center text-[#6B7280] dark:text-[#94A3B8] text-xs max-w-2xl mx-auto mt-4 px-4">
          Subscription provides access to software features only. LensOnWealth
          does not provide investment advisory services or execute trades.
        </p>
      </div>
    </section>
  );
}
