/**
 * Demo Banner Component
 * 
 * Subtle banner shown in demo mode to indicate sample data.
 * Always visible but non-intrusive.
 * 
 * DESIGN PRINCIPLES:
 * - Clear but not alarming
 * - Professional tone
 * - Easy to dismiss (but reappears on page refresh)
 */

'use client';

import { useState } from 'react';
import { InfoIcon, XIcon } from '@/components/icons';
import Link from 'next/link';

interface DemoBannerProps {
  onExit?: () => void;
}

export default function DemoBanner({ onExit }: DemoBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <InfoIcon className="w-5 h-5 text-[#2563EB] flex-shrink-0" />
          <p className="text-sm text-[#1E40AF]">
            <strong className="font-semibold">Demo portfolio • Sample data</strong>
            {' '}— This is a demonstration using fictional data. Sign up to track your real portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/onboarding"
            className="px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1E40AF] transition-colors whitespace-nowrap"
          >
            Sign Up
          </Link>
          {onExit && (
            <button
              onClick={onExit}
              className="px-4 py-2 text-[#1E40AF] text-sm font-medium rounded-lg hover:bg-[#DBEAFE] transition-colors whitespace-nowrap"
            >
              Exit Demo
            </button>
          )}
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 rounded-lg hover:bg-[#DBEAFE] transition-colors"
            aria-label="Dismiss banner"
          >
            <XIcon className="w-4 h-4 text-[#1E40AF]" />
          </button>
        </div>
      </div>
    </div>
  );
}








