/**
 * Update Loan Outstanding Modal
 * 
 * Modal for updating loan outstanding balance.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UpdateLoanOutstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
  currentOutstanding: number | null;
  loanAmount: number | null;
  onSuccess: () => void;
}

export default function UpdateLoanOutstandingModal({
  isOpen,
  onClose,
  loanId,
  currentOutstanding,
  loanAmount,
  onSuccess,
}: UpdateLoanOutstandingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outstandingBalance, setOutstandingBalance] = useState<string>('');

  // Initialize form with current data
  useEffect(() => {
    if (isOpen) {
      setOutstandingBalance(currentOutstanding?.toString() ?? '');
      setError(null);
    }
  }, [isOpen, currentOutstanding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loanId) {
      setError('Loan not found');
      return;
    }

    const balance = parseFloat(outstandingBalance);
    if (isNaN(balance) || balance < 0) {
      setError('Outstanding balance must be a non-negative number');
      return;
    }

    if (loanAmount !== null && balance > loanAmount) {
      setError(`Outstanding balance cannot exceed loan amount (₹${loanAmount.toLocaleString('en-IN')})`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/real-estate/loans/${loanId}/outstanding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outstanding_balance: balance }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update outstanding balance');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update outstanding balance');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
            <h2 className="text-lg font-semibold text-foreground">Update Loan Outstanding</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Used to calculate net worth and returns
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
            {loanAmount !== null && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
                <p className="text-sm font-semibold text-foreground">
                  ₹{loanAmount.toLocaleString('en-IN')}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="outstandingBalance">Outstanding Balance (₹)</Label>
              <Input
                id="outstandingBalance"
                type="number"
                step="0.01"
                min="0"
                max={loanAmount ?? undefined}
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(e.target.value)}
                placeholder="0"
                required
              />
              {loanAmount !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: ₹{loanAmount.toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
