/**
 * LogoLockup Component
 * 
 * Professional fintech-grade logo lockup.
 * - Displays full logo image (icon + text combined)
 * - Proper sizing for header visibility
 * - Automatic light/dark mode support
 * - Uses plain <img> tag (no Next.js Image component)
 * 
 * ASSET REQUIREMENTS:
 * - Full logo asset at /logo.png (contains icon + text)
 * - File should be placed in: public/logo.png
 * - Recommended size: ~140px wide × 32px tall
 */

'use client';

import Link from 'next/link';

interface LogoLockupProps {
  /**
   * Whether the logo should be wrapped in a Link to home
   * @default true
   */
  linkToHome?: boolean;
  
  /**
   * Additional className for the container
   */
  className?: string;
  
  /**
   * Logo height (default: h-24 = 96px for prominent visibility)
   * @default 'h-24'
   */
  height?: 'h-10' | 'h-12' | 'h-14' | 'h-20' | 'h-24';
}

export function LogoLockup({
  linkToHome = true,
  className = '',
  height = 'h-24',
}: LogoLockupProps) {
  // Logo height: 96px (h-24) by default for prominent visibility in header
  // Width is auto to maintain aspect ratio
  
  const logoContent = (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.png"
        alt="WealthLens"
        className={`${height} w-auto object-contain`}
      />
    </div>
  );

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
