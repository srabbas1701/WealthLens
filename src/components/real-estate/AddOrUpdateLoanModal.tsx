/**
 * Add or Update Loan Modal
 *
 * Modal for adding a new loan or updating full loan details for a property.
 * Mirrors the rental-details flow: same UX for add vs update.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddOrUpdateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  hasExistingLoan: boolean;
  currentData: {
    lenderName: string | null;
    loanAmount: number | null;
    interestRate: number | null;
    emi: number | null;
    tenureMonths: number | null;
    outstandingBalance: number | null;
  };
  onSuccess: () => void;
}

export default function AddOrUpdateLoanModal({
  isOpen,
  onClose,
  propertyId,
  hasExistingLoan,
  currentData,
  onSuccess,
}: AddOrUpdateLoanModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lenderName, setLenderName] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [emi, setEmi] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('');
  const [outstandingBalance, setOutstandingBalance] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLenderName(currentData.lenderName ?? '');
      setLoanAmount(currentData.loanAmount?.toString() ?? '');
      setInterestRate(currentData.interestRate?.toString() ?? '');
      setEmi(currentData.emi?.toString() ?? '');
      setTenureMonths(currentData.tenureMonths?.toString() ?? '');
      setOutstandingBalance(currentData.outstandingBalance?.toString() ?? '');
      setError(null);
    }
  }, [isOpen, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const amount = loanAmount ? parseFloat(loanAmount) : null;
      if (!amount || amount <= 0) {
        throw new Error('Loan amount must be greater than 0');
      }
      if (!lenderName.trim() || lenderName.trim().length < 2) {
        throw new Error('Lender name is required (minimum 2 characters)');
      }

      const ob = outstandingBalance ? parseFloat(outstandingBalance) : null;
      if (ob != null && (isNaN(ob) || ob < 0)) {
        throw new Error('Outstanding balance must be a non-negative number');
      }
      if (ob != null && ob > amount) {
        throw new Error('Outstanding balance cannot exceed loan amount');
      }

      const payload: Record<string, unknown> = {
        lender_name: lenderName.trim(),
        loan_amount: amount,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        emi: emi ? parseFloat(emi) : null,
        tenure_months: tenureMonths ? parseFloat(tenureMonths) : null,
        outstanding_balance: ob ?? amount,
      };

      const response = await fetch(`/api/real-estate/assets/${propertyId}/loan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save loan details');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save loan details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const title = hasExistingLoan ? 'Update Loan Details' : 'Add Loan';
  const subtitle = hasExistingLoan
    ? 'Mortgage and loan information. Affects net worth and returns.'
    : 'Add mortgage or loan for this property. Affects net worth and returns.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="lenderName">Lender Name *</Label>
              <Input
                id="lenderName"
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g. HDFC Bank"
                required
              />
            </div>

            <div>
              <Label htmlFor="loanAmount">Loan Amount (₹) *</Label>
              <Input
                id="loanAmount"
                type="number"
                step="0.01"
                min="0"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="interestRate">Interest Rate (% p.a.)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="emi">EMI (₹/month)</Label>
              <Input
                id="emi"
                type="number"
                step="0.01"
                min="0"
                value={emi}
                onChange={(e) => setEmi(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="tenureMonths">Tenure (months)</Label>
              <Input
                id="tenureMonths"
                type="number"
                step="1"
                min="0"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                placeholder="e.g. 240"
              />
            </div>

            <div>
              <Label htmlFor="outstandingBalance">Outstanding Balance (₹)</Label>
              <Input
                id="outstandingBalance"
                type="number"
                step="0.01"
                min="0"
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(e.target.value)}
                placeholder="Leave blank to use loan amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current amount owed. Defaults to loan amount if empty.
              </p>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : hasExistingLoan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
