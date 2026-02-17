'use client';

import Link from 'next/link';
import type { PricingPlan } from '@/hooks/usePlans';

const CURRENCY = '₹';

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
    tagline: 'Track your investments in one place',
    features: [
      'Equity & Mutual Fund holdings',
      'EPF, NPS, PPF visibility',
      'NAV & price updates (MF, equity)',
      'Asset allocation & portfolio value',
      'CSV upload & manual entry',
      'Secure, India-hosted data',
    ],
    ctaText: 'Get Started Free',
    ctaHref: '/signup',
    microcopy: 'No credit card required',
  },
  pro: {
    tagline: 'Most popular · Everything you need to stay in control',
    features: [
      'Everything in Free',
      'Real Assets (Real Estate, Gold & Commodities)',
      'Liabilities tracking',
      'Insurance tracking',
      'Advanced Analytics',
      'Sector, market cap & geography exposure',
      'Stability & capital-protected breakdown',
      'Scenario impact (drawdown, rate shock)',
      'Portfolio Health Score & insights',
      'PDF & Excel exports',
    ],
    ctaText: 'Upgrade to Pro',
    ctaHref: '/upgrade',
    microcopy: 'Billed monthly or yearly',
  },
  premium: {
    tagline: 'Intelligence and guidance when you need it',
    features: [
      'Everything in Pro',
      'AI Portfolio Analyst (unlimited queries)',
      'AI-driven explanations & decision support',
      'Advanced scenario simulations with guidance',
      'Weekly deep-dive portfolio summaries',
      'Priority support',
      '14-day free trial',
    ],
    ctaText: 'Start Premium Trial',
    ctaHref: '/signup',
    microcopy: 'No card required for trial',
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

/** Always returns exactly three slots: Free, Pro, Premium. Plan may be null if API didn't return that tier. */
function getThreeTiers(plans: PricingPlan[]): Array<{ tier: Tier; plan: PricingPlan | null }> {
  const sorted = [...plans].sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
  const freePlan = sorted.find((p) => p.monthly_price === 0 || p.monthly_price === null) ?? null;
  const paid = sorted.filter((p) => p.monthly_price != null && p.monthly_price > 0);
  const proPlan = paid.length >= 2 ? paid[0]! : paid[0] ?? null;
  const premiumPlan = paid.length >= 1 ? paid[paid.length - 1]! : null;
  return [
    { tier: 'free', plan: freePlan },
    { tier: 'pro', plan: proPlan },
    { tier: 'premium', plan: premiumPlan },
  ];
}

interface PricingSectionProps {
  plans: PricingPlan[];
  loading: boolean;
  error: string | null;
}

function formatPrice(plan: PricingPlan | null, tier: Tier): { primary: string; secondary?: string } {
  if (!plan) {
    if (tier === 'free') return { primary: `${CURRENCY}0`, secondary: '/month' };
    return { primary: '—', secondary: undefined };
  }
  const monthly = plan.monthly_price ?? null;
  const annual = plan.annual_price ?? null;
  if (monthly !== null && monthly !== undefined) {
    if (monthly === 0) return { primary: `${CURRENCY}0`, secondary: '/month' };
    const yearlySavings =
      annual && monthly > 0
        ? Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100)
        : null;
    const yearlyMo = annual ? Math.round(annual / 12) : null;
    return {
      primary: `${CURRENCY}${monthly.toLocaleString('en-IN')}`,
      secondary: yearlySavings && yearlySavings > 0 && yearlyMo != null
        ? `/month · or ${CURRENCY}${annual.toLocaleString('en-IN')}/year (save ${yearlySavings}%)`
        : '/month',
    };
  }
  if (annual !== null && annual !== undefined)
    return { primary: `${CURRENCY}${annual.toLocaleString('en-IN')}`, secondary: '/year' };
  if (tier === 'free') return { primary: `${CURRENCY}0`, secondary: '/month' };
  return { primary: '—', secondary: undefined };
}

export default function PricingSection({ plans, loading, error }: PricingSectionProps) {
  if (loading) {
    return (
      <section id="pricing" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8]">
              Free to start. Upgrade when you need deeper insights.
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
      <section id="pricing" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]">
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

  return (
    <section id="pricing" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Simple, Transparent Pricing
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8]">
            Free to start. Upgrade when you need deeper insights.
          </p>
        </div>

        {/* Desktop ≥768px: single row, equal-width cards. Mobile <768px: stacked, order Free → Pro → Premium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto overflow-x-hidden">
          {tiers.map(({ tier, plan }) => {
            const config = TIER_CONFIG[tier];
            const isPro = tier === 'pro';
            const isPremium = tier === 'premium';
            const isFree = tier === 'free';
            const { primary: pricePrimary, secondary: priceSecondary } = formatPrice(plan, tier);
            const orderClass =
              tier === 'free'
                ? 'order-1 md:order-1'
                : tier === 'pro'
                  ? 'order-2 md:order-2'
                  : 'order-3 md:order-3';

            return (
              <div
                key={tier}
                className={`${orderClass} flex flex-col h-full bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl border transition-all duration-300 overflow-hidden min-w-0 ${
                  isPro
                    ? 'border-2 border-[#2563EB] dark:border-[#3B82F6] shadow-lg shadow-[#2563EB]/10 dark:shadow-[#3B82F6]/10'
                    : isPremium
                      ? 'border border-[#E5E7EB] dark:border-[#334155] hover:border-[#94A3B8] dark:hover:border-[#64748B]'
                      : 'border border-[#E5E7EB] dark:border-[#334155] hover:border-[#94A3B8] dark:hover:border-[#64748B]'
                }`}
              >
                {/* Pill label on top — consistent across cards; wraps on small screens to avoid overlap */}
                <div className="px-6 pt-4 pb-0 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                      isPro
                        ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A] text-[#2563EB] dark:text-[#93C5FD]'
                        : 'bg-[#F1F5F9] dark:bg-[#334155] text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                  {isPro && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#2563EB] dark:bg-[#3B82F6] text-white shrink-0">
                      Most popular
                    </span>
                  )}
                </div>

                <div className="p-6 pt-3 flex flex-col flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                    {plan?.name ?? TIER_LABEL[tier]}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">
                    {config.tagline}
                  </p>

                  {/* Single price block — one line per card; clearly visible on desktop and mobile */}
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
                  </div>

                  <ul className="space-y-1.5 sm:space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm flex-1 min-w-0">
                    {config.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 min-w-0">
                        <CheckIcon
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isPro
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

                  <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                    <Link
                      href={config.ctaHref}
                      className={`block w-full min-w-0 py-3 px-4 rounded-lg font-semibold text-sm text-center transition-colors duration-300 ${
                        isPro
                          ? 'bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white'
                          : isPremium
                            ? 'bg-[#F1F5F9] dark:bg-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] text-[#0F172A] dark:text-[#F8FAFC]'
                            : 'bg-[#F1F5F9] dark:bg-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] text-[#0F172A] dark:text-[#F8FAFC]'
                      }`}
                    >
                      {config.ctaText}
                    </Link>
                    {config.microcopy && (
                      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] text-center mt-2">
                        {config.microcopy}
                      </p>
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
          Your wealth is always visible in the free tier. Upgrade when you need deeper clarity and insights.
        </p>
      </div>
    </section>
  );
}
