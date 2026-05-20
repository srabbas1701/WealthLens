/**
 * Data Consolidation Message Component
 *
 * Two modes:
 *   isEmpty=false (default): "Data being consolidated" — shown when data exists but
 *     is still being processed / validated (e.g. right after a CAS upload).
 *   isEmpty=true            : "Add your first investment" — shown when a brand new
 *     user has no holdings at all. More accurate and actionable than "consolidating".
 */

'use client';

import Link from 'next/link';
import { InfoIcon, PlusIcon } from '@/components/icons';

interface Props {
  className?: string;
  /** Pass true when the user has never added any holdings (portfolioData.hasData === false). */
  isEmpty?: boolean;
}

export default function DataConsolidationMessage({ className = '', isEmpty = false }: Props) {
  if (isEmpty) {
    return (
      <div className={`bg-[#F6F8FB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 text-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <InfoIcon className="w-8 h-8 text-[#6B7280] dark:text-[#94A3B8]" />
          <div>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
              Add your first investment to see your net worth
            </p>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">
              Upload a CAS statement or add investments manually to get started.
            </p>
            <Link
              href="/portfolio/holdings/add"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Investment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#F6F8FB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 text-center ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <InfoIcon className="w-8 h-8 text-[#6B7280] dark:text-[#94A3B8]" />
        <div>
          <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            Data being consolidated
          </p>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            Portfolio totals are being calculated. Please check back shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
