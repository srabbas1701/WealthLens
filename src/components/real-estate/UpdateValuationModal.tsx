/**
 * Update Valuation Modal
 * 
 * Modal for updating user override value for property valuation.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UpdateValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  currentValue: number | null;
  estimatedMin: number | null;
  estimatedMax: number | null;
  onSuccess: () => void;
}

export default function UpdateValuationModal({
  isOpen,
  onClose,
  propertyId,
  currentValue,
  estimatedMin,
  estimatedMax,
  onSuccess,
}: UpdateValuationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [useOverride, setUseOverride] = useState(true);

  // Initialize form with current data
  useEffect(() => {
    if (isOpen) {
      // If currentValue exists and matches user override, use it
      // Otherwise, show empty (will use system estimate)
      setOverrideValue(currentValue?.toString() ?? '');
      setUseOverride(currentValue !== null);
      setError(null);
    }
  }, [isOpen, currentValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let valueToSet: number | null = null;

      if (useOverride) {
        const parsed = parseFloat(overrideValue);
        if (isNaN(parsed) || parsed <= 0) {
          throw new Error('Valuation must be a positive number');
        }
        valueToSet = parsed;
      }

      const response = await fetch(`/api/real-estate/assets/${propertyId}/valuation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_override_value: valueToSet }),
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Failed to update valuation';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update valuation');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update valuation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const estimatedMidpoint =
    estimatedMin !== null && estimatedMax !== null
      ? (estimatedMin + estimatedMax) / 2
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Update Property Value</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your value always takes precedence over estimates
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* System Estimate Info */}
            {estimatedMin !== null && estimatedMax !== null && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">System Estimated Range</p>
                    <p className="text-base font-bold text-blue-900 dark:text-blue-100">
                      ₹{estimatedMin.toLocaleString('en-IN')} — ₹{estimatedMax.toLocaleString('en-IN')}
                    </p>
                    {estimatedMidpoint !== null && (
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1.5">
                        Suggested midpoint: ₹{estimatedMidpoint.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Based on market comparables, location, and property characteristics
                </p>
              </div>
            )}

            {/* Current Override Info */}
            {currentValue !== null && useOverride && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Your Current Value</p>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  ₹{currentValue.toLocaleString('en-IN')}
                </p>
              </div>
            )}

            {/* Toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800">
                <input
                  type="checkbox"
                  id="useOverride"
                  checked={useOverride}
                  onChange={(e) => setUseOverride(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                  disabled={loading}
                />
                <Label htmlFor="useOverride" className="cursor-pointer text-sm font-medium">
                  Enter your property's current value
                </Label>
              </div>
            </div>

            {/* Override Input */}
            {useOverride && (
              <div>
                <Label htmlFor="overrideValue" className="font-medium">Your Property Valuation (₹)</Label>
                <Input
                  id="overrideValue"
                  type="number"
                  step="1"
                  min="1"
                  max="999999999"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="e.g., 5000000"
                  required={useOverride}
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  This value will override the system estimate for all calculations (XIRR, returns, analytics, etc.)
                </p>
              </div>
            )}

            {!useOverride && currentValue !== null && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Clearing your override</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  System will use the estimated range instead
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : useOverride ? 'Save Override' : 'Clear Override'}
          </Button>
        </div>
      </div>
    </div>
  );
}
