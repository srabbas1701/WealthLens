'use client';

/**
 * Add Holding Hub Page
 *
 * Asset type selector - navigate to the appropriate add flow for each asset type.
 * MF, Stocks, ETFs have dedicated add pages. Others link to their list pages.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useCapabilities } from '@/lib/capabilities';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ASSET_CATALOG_GROUPS, type AssetCatalogItem } from '@/lib/asset-catalog';
import { getOnboardingLaunchRoute, withOnboardingParam } from '@/lib/onboarding-queue';

function AddHoldingHubContent() {
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams?.get('from') === 'onboarding';
  const { hasCapability } = useCapabilities();
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    plan: 'Pro' | 'Premium';
    title: string;
    description: string;
    benefits: string[];
  }>({ open: false, plan: 'Pro', title: '', description: '', benefits: [] });

  const openUpgradeModal = (item: AssetCatalogItem) => {
    const capability = item.requiredCapability;
    if (!capability) return;

    const copyByCapability: Record<string, { title: string; description: string; benefits: string[] }> = {
      manage_real_assets: {
        title: 'Real Estate',
        description: 'Track properties, rental income, loans, and see real estate as part of your total net worth.',
        benefits: [
          'Property valuations & current value',
          'Rental income & expense tracking',
          'Loan and EMI management',
          'Net worth with real assets',
        ],
      },
      manage_insurance: {
        title: 'Insurance Tracking',
        description: 'Track life and health insurance policies with full portfolio visibility.',
        benefits: [
          'Life and health policy tracking',
          'Premium and policy detail management',
          'Coverage insights in one place',
          'Integrated net worth view',
        ],
      },
      manage_liabilities: {
        title: 'Loans & Liabilities',
        description: 'Track home, vehicle, and personal loans along with outstanding balances and EMIs.',
        benefits: [
          'Loan and EMI tracking',
          'Outstanding balance visibility',
          'Liability-adjusted net worth',
          'Better cash flow planning',
        ],
      },
      manage_commodities: {
        title: 'Commodities',
        description: 'Track gold and silver holdings with detailed valuation and portfolio impact.',
        benefits: [
          'Gold and silver holding tracking',
          'Physical, ETF, and digital commodity support',
          'Portfolio allocation visibility',
          'Commodity performance insights',
        ],
      },
    };

    const modalCopy = copyByCapability[capability] ?? {
      title: item.label,
      description: `Upgrade to ${item.requiredPlan ?? 'Pro'} to track this asset.`,
      benefits: ['Advanced tracking features', 'Richer portfolio insights', 'Priority feature access', 'Better analytics'],
    };

    setUpgradeModal({
      open: true,
      plan: item.requiredPlan ?? 'Pro',
      title: modalCopy.title,
      description: modalCopy.description,
      benefits: modalCopy.benefits,
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader
        showBackButton={true}
        backHref={fromOnboarding ? '/onboarding/select?step=add-details' : '/dashboard'}
        backLabel={fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            What do you currently own?
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Pick a category to jump directly into its add-details screen.
          </p>
        </div>

        <div className="space-y-2.5">
          {ASSET_CATALOG_GROUPS.map(group => (
            <div key={group.id}>
              <h3 className="text-xs font-bold text-[#B6C2D4] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 pb-1 border-b border-[#E5E7EB] dark:border-[#334155]">
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const locked = !!item.requiredCapability && !hasCapability(item.requiredCapability);
                  const launchRoute = fromOnboarding
                    ? withOnboardingParam(getOnboardingLaunchRoute(item.id))
                    : getOnboardingLaunchRoute(item.id);

                  if (locked) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openUpgradeModal(item)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#1E293B]/60 opacity-75 hover:opacity-90 transition-all duration-150 text-left w-full"
                      >
                        <span className="text-base shrink-0" aria-hidden="true">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#9CA3AF] dark:text-[#64748B]">{item.label}</p>
                          <p className="text-[11px] text-[#9CA3AF] dark:text-[#64748B] truncate">{item.description}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                          🔒 {item.requiredPlan ?? 'Pro'}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={launchRoute}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#9CA3AF] dark:hover:border-[#475569] transition-all duration-150 text-left w-full"
                    >
                      <span className="text-base shrink-0" aria-hidden="true">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]">{item.label}</p>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] truncate">{item.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <UpgradeModal
          isOpen={upgradeModal.open}
          onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
          requiredPlan={upgradeModal.plan}
          featureTitle={upgradeModal.title}
          featureDescription={upgradeModal.description}
          benefits={upgradeModal.benefits}
        />
      </main>
    </div>
  );
}

export default function AddHoldingHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="animate-pulse text-[#6B7280] dark:text-[#94A3B8] text-sm">Loading...</div>
      </div>
    }>
      <AddHoldingHubContent />
    </Suspense>
  );
}
