/**
 * Logout Confirmation Modal
 * 
 * Calm, professional confirmation dialog for logout action.
 */

'use client';

import { memo } from 'react';
import { LogOutIcon, XIcon } from '@/components/icons';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function LogoutConfirmationModalInner({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Log out of LensOnWealth?</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            You'll need to sign in again to access your portfolio.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#0F172A] rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-white dark:hover:bg-[#1E293B] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-6 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
          >
            <LogOutIcon className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(LogoutConfirmationModalInner);





