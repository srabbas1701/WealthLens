/**
 * Premium Download Modal
 * 
 * Shows when non-premium users try to download holdings
 */

'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { ArrowRight, Download, Sparkles } from 'lucide-react';

interface PremiumDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function PremiumDownloadModal({
  isOpen,
  onClose,
  featureName = 'Download Holdings',
}: PremiumDownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-md border border-[#E5E7EB] dark:border-[#334155]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Premium Feature
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F6F8FB] dark:hover:bg-[#334155] rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
              <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {featureName}
              </h3>
            </div>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">
              Download your holdings in PDF format is available exclusively for Premium members.
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-3">
              Premium Benefits:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[#475569] dark:text-[#CBD5E1]">
                <span className="text-[#2563EB] dark:text-[#60A5FA] mt-1">•</span>
                <span>Download holdings in PDF format</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#475569] dark:text-[#CBD5E1]">
                <span className="text-[#2563EB] dark:text-[#60A5FA] mt-1">•</span>
                <span>Advanced analytics and insights</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#475569] dark:text-[#CBD5E1]">
                <span className="text-[#2563EB] dark:text-[#60A5FA] mt-1">•</span>
                <span>Unlimited portfolio analyst queries</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#475569] dark:text-[#CBD5E1]">
                <span className="text-[#2563EB] dark:text-[#60A5FA] mt-1">•</span>
                <span>Weekly deep-dive reports</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#E5E7EB] dark:border-[#334155] rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors font-medium"
            >
              Cancel
            </button>
            <Link
              href="/upgrade"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors font-medium flex items-center justify-center gap-2"
            >
              Upgrade to Premium
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
