/**
 * Onboarding Hint Component
 * 
 * Contextual micro-guidance that appears once and is dismissible.
 * Shown only when relevant to help users understand features.
 * 
 * DESIGN PRINCIPLES:
 * - One-time only (tracked in localStorage)
 * - Dismissible with clear action
 * - Contextual (appears near relevant UI)
 * - Calm, helpful tone
 * - No AI hype language
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { XIcon, InfoIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';

interface OnboardingHintProps {
  id: string; // Unique identifier for this hint
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children?: React.ReactNode; // Element to attach hint to
}

export default function OnboardingHint({
  id,
  message,
  position = 'top',
  className = '',
  children,
}: OnboardingHintProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || isDismissed) return;

    // Check if this hint has been shown before
    const hintKey = `onboarding_hint_${id}_${user.id}`;
    const hasBeenShown = localStorage.getItem(hintKey);

    if (!hasBeenShown) {
      // Show hint after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setIsDismissed(true);
    }
  }, [user, id, isDismissed]);

  const handleDismiss = () => {
    if (!user) return;

    setIsVisible(false);
    setIsDismissed(true);
    
    // Mark as shown in localStorage
    const hintKey = `onboarding_hint_${id}_${user.id}`;
    localStorage.setItem(hintKey, 'true');
  };

  if (isDismissed || !isVisible || !user) {
    return children ? <>{children}</> : null;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={`relative ${className}`} ref={hintRef}>
      {children}
      <div
        className={`absolute z-50 w-64 ${positionClasses[position]} animate-in fade-in slide-in-from-bottom-2 duration-200`}
      >
        <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <InfoIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
              aria-label="Dismiss hint"
            >
              <XIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
            </button>
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-white dark:bg-[#1E293B] border-r border-b border-[#E5E7EB] dark:border-[#334155] transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2' :
              'right-full top-1/2 -translate-y-1/2 translate-x-1/2'
            }`}
          />
        </div>
      </div>
    </div>
  );
}









