/**
 * Toast Notification System
 * 
 * Industry-standard toast notifications with smooth animations.
 * Supports success, error, warning, and info types.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from './icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          container: 'bg-white dark:bg-[#1E293B] border-l-4 border-[#16A34A] dark:border-[#22C55E]',
          icon: 'bg-[#DCFCE7] dark:bg-[#14532D] text-[#16A34A] dark:text-[#22C55E]',
          iconComponent: CheckCircleIcon,
        };
      case 'error':
        return {
          container: 'bg-white dark:bg-[#1E293B] border-l-4 border-[#DC2626] dark:border-[#EF4444]',
          icon: 'bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#EF4444]',
          iconComponent: AlertTriangleIcon,
        };
      case 'warning':
        return {
          container: 'bg-white dark:bg-[#1E293B] border-l-4 border-[#F59E0B] dark:border-[#FBBF24]',
          icon: 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#F59E0B] dark:text-[#FBBF24]',
          iconComponent: AlertTriangleIcon,
        };
      case 'info':
        return {
          container: 'bg-white dark:bg-[#1E293B] border-l-4 border-[#2563EB] dark:border-[#3B82F6]',
          icon: 'bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6]',
          iconComponent: InfoIcon,
        };
    }
  };

  const styles = getToastStyles();
  const IconComponent = styles.iconComponent;

  return (
    <div
      className={`
        ${styles.container}
        rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md
        border border-[#E5E7EB] dark:border-[#334155]
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-slide-in
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.icon} flex items-center justify-center`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-0.5">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              {toast.message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
          aria-label="Dismiss notification"
        >
          <XIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-20 right-4 z-[9999] pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={hideToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

// Animation styles - Add to globals.css
export const toastAnimationStyles = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
`;
