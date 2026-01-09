/**
 * Logout Confirmation Modal
 * 
 * Calm, professional confirmation dialog for logout action.
 */

'use client';

import { LogOutIcon, XIcon } from '@/components/icons';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmationModal({
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

      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl border border-[#E5E7EB] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#0F172A]">Log out of WealthLens?</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] transition-colors"
          >
            <XIcon className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#6B7280]">
            You'll need to sign in again to access your portfolio.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F6F8FB]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
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









