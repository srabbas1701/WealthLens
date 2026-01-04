/**
 * Session Timeout Warning Modal
 * 
 * Calm, professional warning about upcoming automatic logout.
 */

'use client';

import { LogOutIcon, XIcon } from '@/components/icons';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}

export default function SessionTimeoutModal({
  isOpen,
  onStaySignedIn,
  onLogoutNow,
}: SessionTimeoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl border border-[#E5E7EB] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#0F172A]">Still there?</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#6B7280]">
            For your security, we'll log you out in 2 minutes due to inactivity.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F6F8FB]">
          <button
            onClick={onLogoutNow}
            className="flex items-center gap-2 px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
          >
            <LogOutIcon className="w-4 h-4" />
            Log out now
          </button>
          <button
            onClick={onStaySignedIn}
            className="px-6 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}








