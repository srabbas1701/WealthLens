/**
 * Last Market Update Component
 * 
 * Displays the latest successful market data ingestion status
 * for stocks or mutual funds.
 * 
 * Shows:
 * - Status indicator (green/amber/red)
 * - Last updated timestamp (IST)
 * - Price/NAV date
 */

'use client';

import { useState, useEffect } from 'react';

interface MarketDataStatus {
  assetType: string;
  lastRunAt: string | null;
  targetDate: string | null;
  successCount: number;
  failedCount: number;
  error: string | null;
}

interface LastMarketUpdateProps {
  assetType: 'stocks' | 'mutual_fund';
}

export default function LastMarketUpdate({ assetType }: LastMarketUpdateProps) {
  const [status, setStatus] = useState<MarketDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/system/market-data/status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch market data status');
        }
        
        const data = await response.json();
        const assetStatus = assetType === 'stocks' ? data.stocks : data.mutual_fund;
        
        setStatus(assetStatus);
        setError(null);
      } catch (err) {
        console.error('[LastMarketUpdate] Error fetching status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [assetType]);

  // Determine status dot color
  const getStatusColor = (): 'green' | 'amber' | 'red' => {
    if (!status) return 'red';
    
    // Red if error exists
    if (status.error) return 'red';
    
    // Amber if successCount > 0 but targetDate < today (stale data)
    if (status.successCount > 0 && status.targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(status.targetDate + 'T00:00:00');
      
      // If targetDate is before today, show amber
      if (targetDate < today) {
        return 'amber';
      }
    }
    
    // Green if no error and data is fresh
    return 'green';
  };

  // Format timestamp to IST
  const formatISTDateTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      // Format as: "Jan 29, 2026 6:30 PM IST"
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      return 'Invalid date';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#94A3B8]">
        <div className="w-2 h-2 rounded-full bg-[#9CA3AF] dark:bg-[#64748B] animate-pulse" />
        <span>Loading status...</span>
      </div>
    );
  }

  // Error or no data state
  if (error || !status || !status.lastRunAt) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#94A3B8]">
        <div className="w-2 h-2 rounded-full bg-[#EF4444] dark:bg-[#DC2626]" />
        <span>No update history available</span>
      </div>
    );
  }

  const statusColor = getStatusColor();
  const statusDotColor = 
    statusColor === 'green' 
      ? 'bg-[#10B981] dark:bg-[#059669]'
      : statusColor === 'amber'
      ? 'bg-[#F59E0B] dark:bg-[#D97706]'
      : 'bg-[#EF4444] dark:bg-[#DC2626]';

  const dateLabel = assetType === 'stocks' ? 'Price date' : 'NAV date';
  const sourceLabel = assetType === 'stocks' ? '(Yahoo EOD)' : '(AMFI)';

  return (
    <div className="flex items-start gap-2 text-sm">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusDotColor}`} />
      
      {/* Text content */}
      <div className="flex flex-col gap-0.5">
        <div className="text-[#6B7280] dark:text-[#94A3B8]">
          Last updated: <span className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">{formatISTDateTime(status.lastRunAt)}</span>
        </div>
        {status.targetDate && (
          <div className="text-[#6B7280] dark:text-[#94A3B8]">
            {dateLabel}: <span className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">{status.targetDate}</span> {sourceLabel}
          </div>
        )}
      </div>
    </div>
  );
}
