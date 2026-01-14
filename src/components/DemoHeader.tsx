/**
 * Demo Header Component
 * 
 * Header for demo mode that does NOT use authentication hooks.
 * Shows "Sign In" button instead of Account menu.
 * 
 * RULES:
 * - Must NOT use useAuth() or any auth hooks
 * - Must NOT access authStatus
 * - Must NOT call Supabase APIs
 * - Errors in demo cannot affect AuthProvider
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FileIcon } from '@/components/icons';
import { useCurrency } from './AppHeader';
import { LogoLockup } from '@/components/LogoLockup';

interface DemoHeaderProps {
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  showDownload?: boolean;
  onDownload?: () => void;
}

export function DemoHeader({
  showBackButton = false,
  backHref = '/demo',
  backLabel = 'Back',
  showDownload = false,
  onDownload,
}: DemoHeaderProps) {
  const { format, setFormat } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo and Back Button */}
        <div className="flex items-center gap-4">
          <LogoLockup />
          
          {showBackButton && (
            <Link 
              href={backHref}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#0F172A] transition-colors ml-4 pl-4 border-l border-[#E5E7EB]"
            >
              <span className="text-sm font-medium">{backLabel}</span>
            </Link>
          )}
        </div>

        {/* Center: Currency Format Selector (available in demo too) */}
        <div className="flex items-center gap-2 bg-[#F6F8FB] rounded-lg p-1">
          <button
            onClick={() => setFormat('raw')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              format === 'raw'
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-[#6B7280] hover:text-[#0F172A]'
            }`}
          >
            Raw
          </button>
          <button
            onClick={() => setFormat('lacs')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              format === 'lacs'
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-[#6B7280] hover:text-[#0F172A]'
            }`}
          >
            Lacs
          </button>
          <button
            onClick={() => setFormat('crores')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              format === 'crores'
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-[#6B7280] hover:text-[#0F172A]'
            }`}
          >
            Crores
          </button>
        </div>

        {/* Right: Navigation and Actions */}
        <div className="flex items-center gap-3">
          {showDownload && (
            <button
              onClick={onDownload || (() => {})}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0F172A] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F6F8FB] transition-colors"
            >
              <FileIcon className="w-4 h-4" />
              Download
            </button>
          )}
          
          {/* Sign In and Get Started buttons (demo mode) */}
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-[#6B7280] text-sm font-medium hover:text-[#0F172A] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1E40AF] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}









