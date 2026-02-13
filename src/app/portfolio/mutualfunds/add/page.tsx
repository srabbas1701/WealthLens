'use client';

/**
 * Add Mutual Fund Page
 * Redirects to MF list page with add modal open (?add=1)
 * Preserves ?from=onboarding for back navigation
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AddMFRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams?.get('from') === 'onboarding';

  useEffect(() => {
    router.replace(`/portfolio/mutualfunds?add=1${fromOnboarding ? '&from=onboarding' : ''}`);
  }, [router, fromOnboarding]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB] dark:bg-[#0F172A]">
      <div className="animate-pulse text-[#6B7280] dark:text-[#94A3B8] text-sm">
        Opening Mutual Funds...
      </div>
    </div>
  );
}

export default function AddMutualFundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="animate-pulse text-[#6B7280] dark:text-[#94A3B8] text-sm">Loading...</div>
      </div>
    }>
      <AddMFRedirect />
    </Suspense>
  );
}
