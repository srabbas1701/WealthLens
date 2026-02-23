'use client';

import Link from 'next/link';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan: 'Pro' | 'Premium';
  featureTitle: string;
  featureDescription: string;
  benefits: string[];
}

export function UpgradeModal({
  isOpen, onClose, requiredPlan, featureTitle, featureDescription, benefits
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const isPremium = requiredPlan === 'Premium';
  const accentColor = isPremium ? '#7C3AED' : '#2563EB';
  const accentBg = isPremium ? 'bg-purple-50 dark:bg-purple-950/20' : 'bg-blue-50 dark:bg-blue-950/20';
  const accentText = isPremium ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300';
  const badgeBg = isPremium ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-blue-100 dark:bg-blue-900/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl max-w-md w-full p-8 border border-[#E5E7EB] dark:border-[#334155]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B7280] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Plan badge */}
        <div className="flex justify-center mb-6">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${badgeBg} ${accentText}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {requiredPlan} Plan Required
          </span>
        </div>

        {/* Icon */}
        <div className={`w-16 h-16 ${accentBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
          <svg className={`w-8 h-8 ${accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        {/* Title & description */}
        <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-center mb-2">
          {featureTitle}
        </h2>
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] text-center mb-6">
          {featureDescription}
        </p>

        {/* Benefits */}
        <ul className="space-y-2.5 mb-8">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full ${accentBg} flex items-center justify-center flex-shrink-0`}>
                <svg className={`w-3 h-3 ${accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">{benefit}</span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <Link
          href={`/upgrade?plan=${requiredPlan.toLowerCase()}`}
          className="block w-full py-3 px-6 rounded-xl text-white text-sm font-semibold text-center transition-all hover:opacity-90 mb-3"
          style={{ backgroundColor: accentColor }}
        >
          Upgrade to {requiredPlan}
        </Link>
        <button
          onClick={onClose}
          className="block w-full py-2.5 px-6 rounded-xl text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
