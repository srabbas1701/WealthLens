/**
 * ShowPaywall(reason, capability)
 *
 * Single component for all locked actions. No inline hardcoded messages;
 * copy comes from getPaywallCopy(reason, capability).
 * All locked actions must route through this.
 */

'use client';

import Link from 'next/link';
import { X, ArrowRight, Sparkles, Info } from 'lucide-react';
import { getPaywallCopy, type PaywallReason } from '@/lib/paywall-copy';
import type { CapabilityKey } from '@/types/capabilities';

export type PaywallVariant = 'inline' | 'card' | 'modal' | 'banner';

export interface ShowPaywallProps {
  reason: PaywallReason;
  capability: CapabilityKey | string;
  variant?: PaywallVariant;
  /** For modal: open state */
  isOpen?: boolean;
  /** For modal: close handler */
  onClose?: () => void;
  /** For banner (limit_reached): e.g. "You've used all 15 queries" */
  bannerDetail?: string;
}

export default function ShowPaywall({
  reason,
  capability,
  variant = 'card',
  isOpen = true,
  onClose,
  bannerDetail,
}: ShowPaywallProps) {
  const copy = getPaywallCopy(reason, capability);

  if (variant === 'modal' && !isOpen) return null;

  const ctaLink = (
    <Link
      href="/upgrade"
      onClick={variant === 'modal' ? onClose : undefined}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2563EB] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E3A8A] rounded-lg hover:bg-[#DBEAFE] dark:hover:bg-[#2563EB] transition-colors"
    >
      {copy.ctaText}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );

  const benefitsList = (
    <ul className="space-y-2">
      {copy.benefits.map((benefit, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-[#475569] dark:text-[#CBD5E1]">
          <span className="text-[#2563EB] dark:text-[#60A5FA] mt-1">•</span>
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-md border border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {copy.title}
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
          <div className="p-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">{copy.description}</p>
            <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Premium benefits
              </p>
              {benefitsList}
            </div>
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
                {copy.ctaText}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="bg-[#F6F8FB] dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {bannerDetail && (
              <p className="text-sm text-[#475569] dark:text-[#94A3B8] mb-2">{bannerDetail}</p>
            )}
            <p className="text-sm text-[#475569] dark:text-[#94A3B8] mb-3">{copy.description}</p>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#2563EB] transition-colors"
            >
              {copy.ctaText}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="mt-3 p-4 bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-[#475569] dark:text-[#94A3B8] mb-2">
              <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{copy.title}</span>
              {' — '}
              {copy.description}
            </p>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] dark:text-[#60A5FA] hover:text-[#1E40AF] transition-colors"
            >
              {copy.ctaText}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // card (default)
  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 mt-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            {copy.title}
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3">{copy.description}</p>
          {copy.benefits.length > 0 && (
            <div className="space-y-1.5 mb-4">{benefitsList}</div>
          )}
          {ctaLink}
        </div>
      </div>
    </div>
  );
}
