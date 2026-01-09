/**
 * Data Consolidation Message Component
 * 
 * Shows when portfolio data is incomplete or being consolidated.
 * Used instead of showing zero or guessed values.
 */

'use client';

import { InfoIcon } from '@/components/icons';

export default function DataConsolidationMessage({ className = '' }: { className?: string }) {
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









