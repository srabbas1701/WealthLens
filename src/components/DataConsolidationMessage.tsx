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
    <div className={`bg-[#F6F8FB] border border-[#E5E7EB] rounded-lg p-6 text-center ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <InfoIcon className="w-8 h-8 text-[#6B7280]" />
        <div>
          <p className="text-sm font-medium text-[#0F172A] mb-1">
            Data being consolidated
          </p>
          <p className="text-sm text-[#6B7280]">
            Portfolio totals are being calculated. Please check back shortly.
          </p>
        </div>
      </div>
    </div>
  );
}








