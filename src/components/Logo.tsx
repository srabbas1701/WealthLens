/**
 * Logo Component - LensOnWealth
 * 
 * Uses the official LensOnWealth logo image file.
 * Display with optional brand text and tagline.
 */

'use client';

interface LogoProps {
  /**
   * Size of the logo icon (in pixels or Tailwind class)
   * @default 'w-10 h-10'
   */
  size?: string;
  
  /**
   * Show brand text alongside logo
   * @default false
   */
  showText?: boolean;
  
  /**
   * Show tagline below brand text
   * @default false
   */
  showTagline?: boolean;
  
  /**
   * Additional className for the container
   */
  className?: string;
}

export function Logo({
  size = 'w-16 h-16',
  showText = false,
  showTagline = false,
  className = '',
}: LogoProps) {
  const iconSize = size || 'w-16 h-16';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Using image file */}
      <div className={`${iconSize} relative flex-shrink-0 flex items-center justify-center`}>
        <img
          src="/logo.png"
          alt="LensOnWealth Logo"
          className="w-full h-full object-contain"
          style={{
            backgroundColor: 'transparent',
            imageRendering: 'crisp-edges',
          }}
          onError={(e) => {
            // Fallback if image fails to load
            console.error('Logo image failed to load from /logo.png');
          }}
        />
      </div>
      
      {/* Brand Text (optional) */}
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            LensOnWealth
          </span>
          {showTagline && (
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] -mt-1">
              Clarity . Growth . Legacy
            </span>
          )}
        </div>
      )}
    </div>
  );
}