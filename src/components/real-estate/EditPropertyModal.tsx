/**
 * Edit Property Modal
 * 
 * Modal for editing basic property information (nickname, ownership, address, area).
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  currentData: {
    propertyNickname: string;
    ownershipPercentage: number;
    address: string | null;
    carpetAreaSqft: number | null;
    builtupAreaSqft: number | null;
  };
  onSuccess: () => void;
}

export default function EditPropertyModal({
  isOpen,
  onClose,
  propertyId,
  currentData,
  onSuccess,
}: EditPropertyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyNickname, setPropertyNickname] = useState<string>('');
  const [ownershipPercentage, setOwnershipPercentage] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [carpetAreaSqft, setCarpetAreaSqft] = useState<string>('');
  const [builtupAreaSqft, setBuiltupAreaSqft] = useState<string>('');

  // Initialize form with current data
  useEffect(() => {
    if (isOpen) {
      setPropertyNickname(currentData.propertyNickname || '');
      setOwnershipPercentage(currentData.ownershipPercentage?.toString() || '100');
      setAddress(currentData.address || '');
      setCarpetAreaSqft(currentData.carpetAreaSqft?.toString() || '');
      setBuiltupAreaSqft(currentData.builtupAreaSqft?.toString() || '');
      setError(null);
    }
  }, [isOpen, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate ownership percentage
      const ownership = ownershipPercentage ? parseFloat(ownershipPercentage) : 100;
      if (ownership < 0 || ownership > 100) {
        throw new Error('Ownership percentage must be between 0 and 100');
      }

      // Prepare update payload
      const payload: any = {
        property_nickname: propertyNickname.trim() || undefined,
        ownership_percentage: ownership,
        address: address.trim() || null,
        carpet_area_sqft: carpetAreaSqft ? parseFloat(carpetAreaSqft) : null,
        builtup_area_sqft: builtupAreaSqft ? parseFloat(builtupAreaSqft) : null,
      };

      // Remove undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await fetch(`/api/real-estate/assets/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update property');
      }

      // Success - close modal and refresh data
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditPropertyModal] Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update property');
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

      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Edit Property</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Update basic property information. Changes will affect analytics calculations.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]"
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
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Property Nickname */}
            <div className="space-y-2">
              <Label htmlFor="propertyNickname" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Property Nickname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="propertyNickname"
                type="text"
                value={propertyNickname}
                onChange={(e) => setPropertyNickname(e.target.value)}
                placeholder="e.g., 2BHK Apartment, Mumbai"
                required
                className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>

            {/* Ownership Percentage */}
            <div className="space-y-2">
              <Label htmlFor="ownershipPercentage" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Ownership Percentage (%)
              </Label>
              <Input
                id="ownershipPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={ownershipPercentage}
                onChange={(e) => setOwnershipPercentage(e.target.value)}
                placeholder="100"
                className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
              />
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                Percentage of property you own (0-100)
              </p>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Address
              </Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main Street, Sector 1"
                className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>

            {/* Area Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carpetAreaSqft" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Carpet Area (sq ft)
                </Label>
                <Input
                  id="carpetAreaSqft"
                  type="number"
                  min="0"
                  step="0.01"
                  value={carpetAreaSqft}
                  onChange={(e) => setCarpetAreaSqft(e.target.value)}
                  placeholder="e.g., 1200"
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="builtupAreaSqft" className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Built-up Area (sq ft)
                </Label>
                <Input
                  id="builtupAreaSqft"
                  type="number"
                  min="0"
                  step="0.01"
                  value={builtupAreaSqft}
                  onChange={(e) => setBuiltupAreaSqft(e.target.value)}
                  placeholder="e.g., 1500"
                  className="bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#0F172A]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-[#E5E7EB] dark:border-[#334155]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !propertyNickname.trim()}
            className="bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white"
          >
            {loading ? 'Updating...' : 'Update Property'}
          </Button>
        </div>
      </div>
    </div>
  );
}
