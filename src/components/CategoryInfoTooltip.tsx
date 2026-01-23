/**
 * Category Info Tooltip Component
 * 
 * Tooltip for asset category cards with micro-animations and mobile support.
 * - Desktop: Hover to show
 * - Mobile: Tap to show, tap outside to close
 * - Smooth animations with no bounce
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CategoryInfoTooltipProps {
  content: string;
  className?: string;
}

export function CategoryInfoTooltip({ content, className = '' }: CategoryInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate tooltip position based on trigger button
  // Smart positioning to avoid overlapping adjacent cards
  // Using fixed positioning, so getBoundingClientRect() gives viewport coordinates
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 288; // w-72 = 18rem = 288px
      const tooltipHeight = 120; // Approximate height
      const gap = 8; // 8px gap below icon
      
      // For fixed positioning, use viewport coordinates directly (no scroll offset needed)
      let left = rect.left;
      let top = rect.bottom + gap;
      
      // Check if tooltip would overflow right edge
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 16; // 16px margin from edge
      }
      
      // Check if tooltip would overflow left edge
      if (left < 0) {
        left = 16; // 16px margin from edge
      }
      
      // Check if tooltip would overflow bottom edge (show above instead)
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - gap;
      }
      
      setPosition({ top, left });
    }
  };

  // Update position when tooltip opens or window resizes
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updatePosition();
      });
      
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Close tooltip on outside click (mobile)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Use a small delay to avoid immediate close on mobile tap
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        <button
          ref={triggerRef}
          type="button"
          className="focus:outline-none focus:ring-0"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={handleToggle}
          onTouchStart={handleToggle}
          aria-label="More information about this category"
          aria-expanded={isOpen}
        >
          <span
            className={`inline-flex items-center justify-center text-[#6B7280] dark:text-[#94A3B8] cursor-help transition-all duration-150 ease-out ${
              isOpen
                ? 'opacity-100 scale-105'
                : 'opacity-60 hover:opacity-100 hover:scale-105'
            } ${className}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              style={{
                shapeRendering: 'geometricPrecision',
              }}
            >
              {/* Circle */}
              <circle
                cx="7"
                cy="7"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              {/* Letter "i" - dot */}
              <circle
                cx="7"
                cy="4.5"
                r="0.8"
                fill="currentColor"
              />
              {/* Letter "i" - stem */}
              <rect
                x="6.4"
                y="5.8"
                width="1.2"
                height="3.5"
                rx="0.6"
                fill="currentColor"
              />
            </svg>
          </span>
        </button>
      </div>
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="fixed w-72 p-4 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-xs rounded-lg shadow-lg border border-[#E5E7EB] dark:border-[#334155] tooltip-fade-in z-[9999]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="leading-relaxed whitespace-pre-line">{content}</div>
          {/* Arrow pointing up */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-white dark:bg-[#1E293B] border-l border-t border-[#E5E7EB] dark:border-[#334155] transform rotate-45" />
        </div>,
        document.body
      )}
    </>
  );
}
