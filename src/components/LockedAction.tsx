/**
 * Locked Action Component
 * 
 * Shows when an action is disabled in demo mode.
 * Explains that the feature is available after sign-up.
 * 
 * DESIGN PRINCIPLES:
 * - Clear but not pushy
 * - Professional tone
 * - Direct CTA to sign up
 */

'use client';

import { LockIcon, ArrowRightIcon } from '@/components/icons';
import Link from 'next/link';

interface LockedActionProps {
  action: string; // e.g., "Upload portfolio", "Add investment"
  description?: string;
  className?: string;
}

export default function LockedAction({ action, description, className = '' }: LockedActionProps) {
  return (
    <div className={`bg-[#F6F8FB] border border-[#E5E7EB] rounded-lg p-6 text-center ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#E5E7EB] flex items-center justify-center">
          <LockIcon className="w-6 h-6 text-[#6B7280]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#0F172A] mb-1">
            {action} is not available in demo mode
          </p>
          {description && (
            <p className="text-sm text-[#6B7280] mb-4">
              {description}
            </p>
          )}
          <p className="text-sm text-[#475569] mb-4">
            Available after sign-up
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
          >
            Sign Up Free
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}








