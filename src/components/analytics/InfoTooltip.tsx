/**
 * Info Tooltip Component
 * 
 * Reusable tooltip component for displaying informational tooltips.
 */

'use client';

import { InfoIcon } from '@/components/icons';
import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className="focus:outline-none"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label="More information"
      >
        <InfoIcon className={`w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] cursor-help ${className}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-[#0F172A] dark:bg-[#1E293B] text-white text-xs rounded-lg shadow-lg border border-[#334155]">
          {content}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-[#0F172A] dark:bg-[#1E293B] border-l border-t border-[#334155] transform rotate-45" />
        </div>
      )}
    </div>
  );
}