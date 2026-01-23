/**
 * Regular Holdings List Component
 * 
 * Renders all holdings at once (no virtualization).
 * Used for small lists (<50 items) where virtualization overhead isn't needed.
 * 
 * Features:
 * - Renders all items at once
 * - Same styling and layout as virtualized version
 * - Simpler implementation
 * 
 * Usage:
 *   <RegularHoldingsList 
 *     holdings={holdings} 
 *     formatCurrency={formatCurrency}
 *   />
 */

'use client';

import { useMemo } from 'react';

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

interface RegularHoldingsListProps {
  holdings: Holding[];
  formatCurrency: (value: number) => string;
}

export function RegularHoldingsList({ 
  holdings, 
  formatCurrency 
}: RegularHoldingsListProps) {
  // Calculate total value
  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [holdings]);

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

      {/* List */}
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
        {holdings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              No holdings found
            </p>
          </div>
        ) : (
          holdings.map((holding) => (
            <div
              key={holding.id}
              className="px-6 py-4 hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
            >
              <div className="flex items-center justify-between">
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
          ))
        )}
      </div>

      {/* Footer with Total */}
      {holdings.length > 0 && (
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
      )}
    </div>
  );
}
