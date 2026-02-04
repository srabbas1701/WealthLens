'use client';

/**
 * Insurance Detail & Edit Page
 *
 * View and edit existing insurance policies
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import type { InsurancePolicy } from '@/types/insurance';
import {
  formatInsuranceCategory,
  getStatusColor,
  getCategoryIcon,
  getDaysUntilExpiry,
} from '@/lib/insurance-utils';

type EditMode = 'view' | 'edit';

export default function InsuranceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const policyId = params.id as string;

  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InsurancePolicy> | null>(null);

  const fetchPolicy = useCallback(async () => {
    if (!user?.id || !policyId) return;

    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('id', policyId)
        .eq('user_id', user.id)
        .single();

      if (dbError) throw dbError;
      setPolicy(data as InsurancePolicy);
      setEditData(data as InsurancePolicy);
    } catch (err) {
      console.error('[Insurance Detail] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  }, [user?.id, policyId]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleEditChange = (name: string, value: any) => {
    setEditData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async () => {
    if (!editData || !user?.id) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updatePayload = {
        policy_name: editData.policy_name,
        provider_name: editData.provider_name,
        sum_assured: editData.sum_assured,
        annual_premium: editData.annual_premium,
        monthly_premium: editData.monthly_premium,
        policy_end_date: editData.policy_end_date,
        next_renewal_date: editData.next_renewal_date,
        nominee_name: editData.nominee_name,
        nominee_relation: editData.nominee_relation,
        status: editData.status,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('insurance_policies')
        .update(updatePayload)
        .eq('id', policyId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      setPolicy((prev) => (prev ? { ...prev, ...editData } : null));
      setEditMode('view');
    } catch (err) {
      console.error('[Insurance Detail] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('insurance_policies')
        .delete()
        .eq('id', policyId)
        .eq('user_id', user?.id);

      if (dbError) throw dbError;

      router.push('/portfolio/insurance');
    } catch (err) {
      console.error('[Insurance Detail] Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton={true} backLabel="Back to Insurance" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-gray-600 dark:text-gray-400">Loading policy...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton={true} backLabel="Back to Insurance" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-gray-600 dark:text-gray-400">Policy not found</p>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(policy.policy_end_date);
  const displayData = editMode === 'edit' ? editData : policy;

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton={true} backLabel="Back to Insurance" />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {error && (
          <Card className="mb-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{getCategoryIcon(policy.category)}</span>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {displayData?.policy_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {formatInsuranceCategory(policy.category)} • Policy #{policy.policy_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`${getStatusColor(policy.status)} border`}
            >
              {policy.status === 'ACTIVE' ? '✓ Active' : policy.status}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sum Assured</p>
              <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                ₹{policy.sum_assured.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Annual Premium</p>
              <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                ₹{policy.annual_premium.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Provider</p>
              <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {policy.provider_name}
              </p>
            </CardContent>
          </Card>
          {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
            <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expires In</p>
                <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {daysUntilExpiry} days
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Policy Details */}
        <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155] mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Policy Details</CardTitle>
              {editMode === 'view' && (
                <Button variant="outline" size="sm" onClick={() => setEditMode('edit')}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {editMode === 'edit' ? (
              <>
                {/* Edit Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="policy_name">Policy Name</Label>
                    <Input
                      id="policy_name"
                      value={editData?.policy_name || ''}
                      onChange={(e) => handleEditChange('policy_name', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider_name">Provider Name</Label>
                    <Input
                      id="provider_name"
                      value={editData?.provider_name || ''}
                      onChange={(e) => handleEditChange('provider_name', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sum_assured">Sum Assured (₹)</Label>
                      <Input
                        id="sum_assured"
                        type="number"
                        value={editData?.sum_assured || ''}
                        onChange={(e) =>
                          handleEditChange('sum_assured', parseFloat(e.target.value))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="annual_premium">Annual Premium (₹)</Label>
                      <Input
                        id="annual_premium"
                        type="number"
                        value={editData?.annual_premium || ''}
                        onChange={(e) =>
                          handleEditChange('annual_premium', parseFloat(e.target.value))
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="policy_end_date">End / Maturity Date</Label>
                      <Input
                        id="policy_end_date"
                        type="date"
                        value={editData?.policy_end_date || ''}
                        onChange={(e) =>
                          handleEditChange('policy_end_date', e.target.value)
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="next_renewal_date">Next Renewal</Label>
                      <Input
                        id="next_renewal_date"
                        type="date"
                        value={editData?.next_renewal_date || ''}
                        onChange={(e) =>
                          handleEditChange('next_renewal_date', e.target.value)
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nominee_name">Nominee Name</Label>
                    <Input
                      id="nominee_name"
                      value={editData?.nominee_name || ''}
                      onChange={(e) =>
                        handleEditChange('nominee_name', e.target.value)
                      }
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end border-t border-[#E5E7EB] dark:border-[#334155] pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode('view');
                      setEditData(policy);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</p>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {new Date(policy.policy_start_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {policy.policy_end_date && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">End Date</p>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {new Date(policy.policy_end_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                  {policy.next_renewal_date && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Renewal</p>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {new Date(policy.next_renewal_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                  {policy.monthly_premium && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monthly Premium</p>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        ₹{policy.monthly_premium.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                  {policy.nominee_name && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nominee</p>
                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {policy.nominee_name}
                        {policy.nominee_relation && ` (${policy.nominee_relation})`}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Button */}
        {editMode === 'view' && (
          <Button
            variant="outline"
            className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 w-full"
            onClick={handleDelete}
          >
            Delete Policy
          </Button>
        )}
      </main>
    </div>
  );
}
