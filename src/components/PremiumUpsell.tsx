/**
 * Premium Upsell Component
 * 
 * Trust-first, non-intrusive upsell component.
 * Used inline within content, never as pop-ups or forced modals.
 */

'use client';

import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon } from '@/components/icons';

interface PremiumUpsellProps {
  /** Feature name being upsold */
  feature: string;
  /** Brief description of what premium unlocks */
  description: string;
  /** List of benefits (optional) */
  benefits?: string[];
  /** Inline variant (default) or card variant */
  variant?: 'inline' | 'card';
  /** Custom CTA text */
  ctaText?: string;
}

export default function PremiumUpsell({
  feature,
  description,
  benefits = [],
  variant = 'inline',
  ctaText = 'Unlock in Premium',
}: PremiumUpsellProps) {
  if (variant === 'card') {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 mt-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-1">
              {feature}
            </h3>
            <p className="text-sm text-[#6B7280] mb-3">
              {description}
            </p>
            {benefits.length > 0 && (
              <ul className="space-y-1.5 mb-4">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                    <span className="text-[#2563EB] mt-1">•</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2563EB] bg-[#EFF6FF] rounded-lg hover:bg-[#DBEAFE] transition-colors"
            >
              {ctaText}
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className="mt-3 p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
      <div className="flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-[#475569] mb-2">
            <span className="font-medium text-[#0F172A]">{feature}</span>
            {' '}
            {description}
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:text-[#1E40AF] transition-colors"
          >
            {ctaText}
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}








