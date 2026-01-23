/**
 * Virtualized Holdings List Component
 * 
 * Optimizes rendering of large holdings lists (50+ items) by only rendering visible items.
 * Uses windowing/virtualization technique for smooth scrolling performance.
 * 
 * Features:
 * - Only renders visible items + 5 overscan (buffer)
 * - Fixed height container with scroll (600px)
 * - Smooth scrolling performance
 * - Estimated row height: 60px
 * - CSS containment for performance optimization
 * 
 * Usage:
 *   <VirtualizedHoldingsList 
 *     holdings={holdings} 
 *     formatCurrency={formatCurrency}
 *   />
 */

'use client';

import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Holding {
  id: string;
  name: string;
  symbol?: string | null;
  assetType: string;
  quantity: number;
  investedValue: number;
  currentValue: number;
  allocationPct: number;
}

interface VirtualizedHoldingsListProps {
  holdings: Holding[];
  formatCurrency: (value: number) => string;
}

export function VirtualizedHoldingsList({ 
  holdings, 
  formatCurrency 
}: VirtualizedHoldingsListProps) {
  // Calculate total value
  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [holdings]);

  // Virtualizer setup
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: holdings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height in pixels
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
        <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          All Holdings
          <span className="ml-2 text-sm font-normal text-[#6B7280] dark:text-[#94A3B8]">
            ({holdings.length})
          </span>
        </h3>
      </div>

      {/* Virtualized List Container */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto"
        style={{ contain: 'strict' }} // CSS containment for performance
      >
        {/* Virtualized items */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const holding = holdings[virtualItem.index];
            
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="border-b border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
              >
                <div className="px-6 py-4 flex items-center justify-between">
                  {/* Left: Name and Asset Type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {holding.name}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                      {holding.assetType}
                      {holding.symbol && ` • ${holding.symbol}`}
                    </p>
                  </div>

                  {/* Right: Current Value and Allocation */}
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                      {formatCurrency(holding.currentValue)}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                      {holding.allocationPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with Total */}
      <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#334155]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Total Value
          </span>
          <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>
    </div>
  );
}
