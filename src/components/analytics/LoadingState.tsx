/**
 * Loading State Component
 * 
 * Reusable loading state for analytics pages.
 */

'use client';

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading analytics...</p>
    </div>
  );
}