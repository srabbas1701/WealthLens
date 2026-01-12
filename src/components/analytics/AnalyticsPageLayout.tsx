/**
 * Analytics Page Layout Component
 * 
 * Reusable layout for all analytics pages.
 * Includes header, disclaimer banner, and content container.
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, InfoIcon } from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { COMMON_DISCLAIMERS } from '@/constants/analyticsCopy';

interface AnalyticsPageLayoutProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  showDisclaimer?: boolean;
  disclaimerText?: string;
}

export function AnalyticsPageLayout({
  title,
  description,
  backHref = '/dashboard',
  backLabel = 'Back to Dashboard',
  children,
  showDisclaimer = true,
  disclaimerText,
}: AnalyticsPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton={true} backHref={backHref} backLabel={backLabel} />

      <main className="max-w-[1280px] mx-auto px-6 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{description}</p>
          )}
        </div>

        {/* Disclaimer Banner */}
        {showDisclaimer && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  For Portfolio Insight Only
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  {disclaimerText || COMMON_DISCLAIMERS.notAdvice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {children}

        {/* Trust Statement Footer */}
        <div className="mt-12 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
          <p className="text-xs text-center text-[#6B7280] dark:text-[#94A3B8]">
            {COMMON_DISCLAIMERS.notAdvice}
          </p>
        </div>
      </main>
    </div>
  );
}