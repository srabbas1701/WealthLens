/**
 * LogoLockup Component - LensOnWealth
 * 
 * Professional fintech-grade logo lockup with SVG logo.
 * - Displays SVG logo icon + brand text
 * - Proper sizing for header visibility
 * - Automatic light/dark mode support
 * - Navy blue and green brand colors
 */

'use client';

import Link from 'next/link';
import { Logo } from './Logo';

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
   * Logo icon size
   * @default 'w-16 h-16'
   */
  iconSize?: string;
  
  /**
   * Show tagline below brand name
   * @default false
   */
  showTagline?: boolean;
}

export function LogoLockup({
  linkToHome = true,
  className = '',
  iconSize = 'w-16 h-16',
  showTagline = false,
}: LogoLockupProps) {
  const logoContent = (
    <Logo 
      size={iconSize}
      showText={true}
      showTagline={showTagline}
      className={className}
    />
  );

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
