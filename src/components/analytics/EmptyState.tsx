/**
 * Empty State Component
 * 
 * Reusable empty state for analytics pages.
 */

'use client';

import { InfoIcon } from '@/components/icons';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <InfoIcon className="w-12 h-12 text-[#6B7280] dark:text-[#94A3B8] mb-4" />
      {title && (
        <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          {title}
        </h3>
      )}
      {message && (
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] max-w-md text-center">
          {message}
        </p>
      )}
    </div>
  );
}