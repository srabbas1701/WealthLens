'use client';

import { useEffect } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, XIcon } from './icons';

interface SimpleToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function SimpleToast({ message, type, onClose, duration = 5000 }: SimpleToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = type === 'success'
    ? {
        container: 'bg-white dark:bg-[#1E293B] border-l-4 border-[#16A34A] dark:border-[#22C55E]',
        icon: 'bg-[#DCFCE7] dark:bg-[#14532D] text-[#16A34A] dark:text-[#22C55E]',
        iconComponent: CheckCircleIcon,
      }
    : {
        container: 'bg-white dark:bg-[#1E293B] border-l-4 border-[#DC2626] dark:border-[#EF4444]',
        icon: 'bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#EF4444]',
        iconComponent: AlertTriangleIcon,
      };

  const IconComponent = styles.iconComponent;

  return (
    <div className="fixed top-20 right-4 z-[9999] animate-slide-in">
      <div
        className={`
          ${styles.container}
          rounded-lg shadow-lg p-4 min-w-[320px] max-w-md
          border border-[#E5E7EB] dark:border-[#334155]
        `}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.icon} flex items-center justify-center`}>
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
            aria-label="Dismiss notification"
          >
            <XIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>
      </div>
    </div>
  );
}
