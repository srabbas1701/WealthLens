'use client';

/**
 * LockedFeaturePage
 *
 * Conversion-focused full-page locked UX for capability-gated features.
 * Uses FEATURE_ACCESS config for title, tagline, valueProps, upgradePlan.
 * Same pattern as Notion, Figma, Stripe dashboards.
 */

import Link from 'next/link';
import { LockIcon, CheckCircleIcon } from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { FEATURE_ACCESS, type FeatureAccessKey } from '@/config/feature-access';

export type RequiredPlan = 'Pro' | 'Premium';

export interface LockedFeaturePageProps {
  /** Override title when feature has custom context (e.g. sub-page name) */
  title?: string;
  /** Required plan – optional when feature is provided */
  requiredPlan?: RequiredPlan;
  /** Feature key – when provided, uses FEATURE_ACCESS for title, tagline, valueProps, upgradePlan */
  feature?: FeatureAccessKey;
  /** Override tagline (optional) */
  tagline?: string;
  /** Override value props (optional) */
  valueProps?: string[];
  /** Deprecated: use tagline instead. Overrides default "Why locked" text */
  description?: string;
}

const ctaCopy: Record<RequiredPlan, string> = {
  Pro: 'Upgrade to Pro',
  Premium: 'View Plans',
};

const planBadgeCopy: Record<RequiredPlan, string> = {
  Pro: 'Pro & above',
  Premium: 'Premium',
};

export function LockedFeaturePage({
  title: titleOverride,
  requiredPlan: requiredPlanProp,
  feature,
  tagline: taglineOverride,
  valueProps: valuePropsOverride,
  description,
}: LockedFeaturePageProps) {
  const config = feature ? FEATURE_ACCESS[feature] : null;
  const requiredPlan = config?.upgradePlan ?? (requiredPlanProp ?? 'Pro');
  const title = titleOverride ?? config?.title ?? 'Unlock this feature';
  const tagline = taglineOverride ?? description ?? config?.tagline ?? `This feature is available on ${planBadgeCopy[requiredPlan]}.`;
  const valueProps = valuePropsOverride ?? config?.valueProps ?? [
    'Upgrade to unlock this feature',
    'Full access to your plan benefits',
    'Cancel anytime',
  ];
  const ctaText = ctaCopy[requiredPlan];

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />
      <main className="max-w-[640px] mx-auto px-4 sm:px-6 py-16 sm:py-24 pt-24 sm:pt-32">
        <div className="flex flex-col">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E5E7EB] dark:bg-[#334155] mb-5">
              <LockIcon className="w-7 h-7 text-[#6B7280] dark:text-[#94A3B8]" />
            </div>

            {/* Plan badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#DBEAFE] dark:bg-[#1E3A8A]/40 text-[#1E40AF] dark:text-[#93C5FD] text-xs font-semibold uppercase tracking-wide mb-4">
              {planBadgeCopy[requiredPlan]}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 leading-tight">
              {title}
            </h1>
            <p className="text-base text-[#6B7280] dark:text-[#94A3B8] max-w-[480px] mx-auto">
              {tagline}
            </p>
          </div>

          {/* Value props grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-10">
            {valueProps.map((prop, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]"
              >
                <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-[#374151] dark:text-[#E2E8F0]">
                  {prop}
                </span>
              </div>
            ))}
          </div>

          {/* CTA section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#pricing"
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 bg-[#2563EB] dark:bg-[#3B82F6] text-white text-base font-semibold rounded-xl hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors shadow-lg shadow-[#2563EB]/20 dark:shadow-[#3B82F6]/20"
            >
              {ctaText}
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 text-[#6B7280] dark:text-[#94A3B8] text-base font-medium hover:text-[#374151] dark:hover:text-[#CBD5E1] transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
