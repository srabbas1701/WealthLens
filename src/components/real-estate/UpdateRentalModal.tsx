/**
 * Update Rental Modal
 * 
 * Modal for updating rental details (rent, expenses) for a property.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';

interface UpdateRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashflowId: string | null;
  propertyId: string;
  currentData: {
    monthlyRent: number | null;
    maintenanceMonthly: number | null;
    propertyTaxMonthly: number | null;
    otherExpensesMonthly: number | null;
    escalationPercent: number | null;
  };
  onSuccess: () => void;
}

export default function UpdateRentalModal({
  isOpen,
  onClose,
  cashflowId,
  propertyId,
  currentData,
  onSuccess,
}: UpdateRentalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlyRent, setMonthlyRent] = useState<string>('');
  const [maintenanceMonthly, setMaintenanceMonthly] = useState<string>('');
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState<string>('');
  const [otherExpensesMonthly, setOtherExpensesMonthly] = useState<string>('');
  const [escalationPercent, setEscalationPercent] = useState<string>('');

  // Initialize form with current data
  useEffect(() => {
    if (isOpen) {
      setMonthlyRent(currentData.monthlyRent?.toString() ?? '');
      setMaintenanceMonthly(currentData.maintenanceMonthly?.toString() ?? '');
      setPropertyTaxAnnual(
        currentData.propertyTaxMonthly ? (currentData.propertyTaxMonthly * 12).toString() : ''
      );
      setOtherExpensesMonthly(currentData.otherExpensesMonthly?.toString() ?? '');
      setEscalationPercent(currentData.escalationPercent?.toString() ?? '');
      setError(null);
    }
  }, [isOpen, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare payload
      const payload: any = {
        monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
        maintenance_monthly: maintenanceMonthly ? parseFloat(maintenanceMonthly) : null,
        property_tax_annual: propertyTaxAnnual ? parseFloat(propertyTaxAnnual) : null,
        other_expenses_monthly: otherExpensesMonthly ? parseFloat(otherExpensesMonthly) : null,
        escalation_percent: escalationPercent ? parseFloat(escalationPercent) : null,
      };

      // Validate: If rent is provided, it must be positive
      if (payload.monthly_rent !== null && payload.monthly_rent <= 0) {
        throw new Error('Monthly rent must be greater than 0');
      }

      // Determine rental status based on monthly rent
      if (payload.monthly_rent && payload.monthly_rent > 0) {
        payload.rental_status = 'rented';
      } else {
        payload.rental_status = 'self_occupied';
      }

      // Always use upsert (create or update by asset). Avoids 404 when cashflowId
      // is missing, stale, or points to a deleted cashflow.
      const response = await fetch(`/api/real-estate/assets/${propertyId}/cashflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update rental details');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rental details');
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

      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Update Rental Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              This affects rental yield & cash flow analytics
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
            <div>
              <Label htmlFor="monthlyRent">Monthly Rent (₹)</Label>
              <Input
                id="monthlyRent"
                type="number"
                step="0.01"
                min="0"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="escalationPercent">Escalation % (Annual)</Label>
              <Input
                id="escalationPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={escalationPercent}
                onChange={(e) => setEscalationPercent(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="maintenanceMonthly">Maintenance (₹/month)</Label>
              <Input
                id="maintenanceMonthly"
                type="number"
                step="0.01"
                min="0"
                value={maintenanceMonthly}
                onChange={(e) => setMaintenanceMonthly(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="propertyTaxAnnual">Property Tax (₹/year)</Label>
              <Input
                id="propertyTaxAnnual"
                type="number"
                step="0.01"
                min="0"
                value={propertyTaxAnnual}
                onChange={(e) => setPropertyTaxAnnual(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="otherExpensesMonthly">Other Expenses (₹/month)</Label>
              <Input
                id="otherExpensesMonthly"
                type="number"
                step="0.01"
                min="0"
                value={otherExpensesMonthly}
                onChange={(e) => setOtherExpensesMonthly(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
