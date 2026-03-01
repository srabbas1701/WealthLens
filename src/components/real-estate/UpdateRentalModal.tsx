/**
 * Update Rental & Cashflow Modal
 *
 * Modal for updating rental status, income, and expenses for a property.
 *
 * Key design decisions:
 * - rental_status is explicitly selected by user (not auto-derived from rent amount)
 * - property_tax_annual is stored and submitted as the FULL annual amount (not ownership-adjusted)
 * - rent_start_date is collected when status = 'rented' (needed for accurate XIRR)
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RentalStatus = 'self_occupied' | 'rented' | 'vacant';

interface UpdateRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashflowId: string | null;
  propertyId: string;
  currentData: {
    monthlyRent: number | null;
    maintenanceMonthly: number | null;
    propertyTaxAnnual: number | null;   // Raw annual from DB (not ownership-adjusted)
    otherExpensesMonthly: number | null;
    escalationPercent: number | null;
    rentalStatus: RentalStatus | null;
    rentStartDate: string | null;
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

  const [rentalStatus, setRentalStatus] = useState<RentalStatus>('self_occupied');
  const [monthlyRent, setMonthlyRent] = useState<string>('');
  const [rentStartDate, setRentStartDate] = useState<string>('');
  const [escalationPercent, setEscalationPercent] = useState<string>('');
  const [maintenanceMonthly, setMaintenanceMonthly] = useState<string>('');
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState<string>('');
  const [otherExpensesMonthly, setOtherExpensesMonthly] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];

  // Initialize form with current data
  useEffect(() => {
    if (isOpen) {
      setRentalStatus(currentData.rentalStatus ?? 'self_occupied');
      setMonthlyRent(currentData.monthlyRent?.toString() ?? '');
      setRentStartDate(currentData.rentStartDate ?? '');
      setEscalationPercent(currentData.escalationPercent?.toString() ?? '');
      setMaintenanceMonthly(currentData.maintenanceMonthly?.toString() ?? '');
      // Use raw annual value directly — no conversion needed
      setPropertyTaxAnnual(currentData.propertyTaxAnnual?.toString() ?? '');
      setOtherExpensesMonthly(currentData.otherExpensesMonthly?.toString() ?? '');
      setError(null);
    }
  }, [isOpen, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate: rented properties must have a positive monthly rent
    if (rentalStatus === 'rented') {
      const rent = parseFloat(monthlyRent);
      if (!monthlyRent || isNaN(rent) || rent <= 0) {
        setError('Monthly rent must be greater than 0 for rented properties');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        rental_status: rentalStatus,
        monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
        rent_start_date: rentStartDate || null,
        maintenance_monthly: maintenanceMonthly ? parseFloat(maintenanceMonthly) : null,
        // property_tax_annual is stored as full annual amount in DB — submit as-is
        property_tax_annual: propertyTaxAnnual ? parseFloat(propertyTaxAnnual) : null,
        other_expenses_monthly: otherExpensesMonthly ? parseFloat(otherExpensesMonthly) : null,
        escalation_percent: escalationPercent ? parseFloat(escalationPercent) : null,
      };

      // Clear rent fields when not rented
      if (rentalStatus !== 'rented') {
        payload.monthly_rent = null;
        payload.rent_start_date = null;
        payload.escalation_percent = null;
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

      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Update Rental & Cashflow</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Affects rental yield, cash flow & XIRR analytics
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Rental Status */}
          <div>
            <Label className="mb-2 block">Property Status</Label>
            <div className="flex gap-2">
              {(['self_occupied', 'rented', 'vacant'] as RentalStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRentalStatus(status)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    rentalStatus === status
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-[#E5E7EB] dark:border-[#334155] hover:bg-muted'
                  }`}
                >
                  {status === 'self_occupied' ? 'Self-Occupied' : status === 'rented' ? 'Rented' : 'Vacant'}
                </button>
              ))}
            </div>
          </div>

          {/* Rental Income (shown only when Rented) */}
          {rentalStatus === 'rented' && (
            <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rental Income</p>

              <div>
                <Label htmlFor="monthlyRent">Monthly Rent (₹) *</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  step="0.01"
                  min="1"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>

              <div>
                <Label htmlFor="rentStartDate">
                  Rent Start Date
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(Recommended for XIRR)</span>
                </Label>
                <Input
                  id="rentStartDate"
                  type="date"
                  max={today}
                  value={rentStartDate}
                  onChange={(e) => setRentStartDate(e.target.value)}
                />
                {!rentStartDate && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Without this date, rent income is excluded from XIRR calculation.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="escalationPercent">Annual Rent Escalation (%)</Label>
                <Input
                  id="escalationPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={escalationPercent}
                  onChange={(e) => setEscalationPercent(e.target.value)}
                  placeholder="e.g. 5"
                />
                <p className="mt-1 text-xs text-muted-foreground">Stored for reference. Apply manually when rent increases.</p>
              </div>
            </div>
          )}

          {/* Expenses */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-[#E5E7EB] dark:border-[#334155]">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recurring Expenses</p>

            <div>
              <Label htmlFor="maintenanceMonthly">Maintenance (₹/month)</Label>
              <Input
                id="maintenanceMonthly"
                type="number"
                step="0.01"
                min="0"
                value={maintenanceMonthly}
                onChange={(e) => setMaintenanceMonthly(e.target.value)}
                placeholder="e.g. 3000"
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
                placeholder="e.g. 12000"
              />
              <p className="mt-1 text-xs text-muted-foreground">Enter the full annual property tax amount.</p>
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
                placeholder="e.g. 1000"
              />
              <p className="mt-1 text-xs text-muted-foreground">Insurance, utilities, etc.</p>
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
