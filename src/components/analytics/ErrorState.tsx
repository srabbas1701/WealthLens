/**
 * Error State Component
 * 
 * Reusable error state for analytics pages.
 */

'use client';

import { AlertTriangleIcon } from '@/components/icons';
import { EMPTY_STATES } from '@/constants/analyticsCopy';

interface ErrorStateProps {
  error?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertTriangleIcon className="w-12 h-12 text-amber-500 dark:text-amber-400 mb-4" />
      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
        {EMPTY_STATES.error}
      </h3>
      {error && (
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-6 max-w-md text-center">
          {error}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}