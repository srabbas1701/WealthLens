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
import type { InsurancePolicy, InsuranceCategory, InsuranceStatus } from '@/types/insurance';
import {
  formatInsuranceCategory,
  getStatusColor,
  getCategoryIcon,
  getDaysUntilExpiry,
} from '@/lib/insurance-utils';
import { EditIcon, TrashIcon, CalendarIcon, WalletIcon, ShieldCheckIcon } from '@/components/icons';

type EditMode = 'view' | 'edit';

// ─── Shared helpers (same as dashboard) ─────────────────────────────────────

const CATEGORY_COLORS: Record<string, { strip: string; bg: string; text: string; badgeBg: string }> = {
  LIFE:              { strip: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/20',    text: 'text-blue-700 dark:text-blue-300',    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  HEALTH:            { strip: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  MOTOR:             { strip: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/20',   text: 'text-amber-700 dark:text-amber-300',   badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  HOME:              { strip: 'bg-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/20',  text: 'text-violet-700 dark:text-violet-300',  badgeBg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
  TRAVEL:            { strip: 'bg-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-950/20',    text: 'text-cyan-700 dark:text-cyan-300',    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  PERSONAL_ACCIDENT: { strip: 'bg-rose-500',   bg: 'bg-rose-50 dark:bg-rose-950/20',   text: 'text-rose-700 dark:text-rose-300',   badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  OTHER:             { strip: 'bg-slate-400',  bg: 'bg-slate-50 dark:bg-slate-900/20',  text: 'text-slate-600 dark:text-slate-300',  badgeBg: 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER;
}

function getExpiryInfo(days: number | null) {
  if (days === null) return { text: '—', color: 'text-gray-400', dot: 'bg-gray-300 dark:bg-gray-600', bgColor: '' };
  if (days < 0)   return { text: 'Expired',    color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500',    bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' };
  if (days === 0) return { text: 'Today!',     color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500',    bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' };
  if (days <= 30) return { text: `${days} days left`, color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500',    bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' };
  if (days <= 90) return { text: `${days} days left`, color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500',  bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' };
  const months = Math.round(days / 30);
  return { text: `${months} months left`, color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' };
}

function formatCover(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Detail metric card ───────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="relative bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-5 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between mb-3 mt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9] dark:border-[#1E293B] last:border-0">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0 w-36">{label}</p>
      <p className={`text-sm font-semibold text-right ${highlight || 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

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

  const handleEditChange = (name: string, value: unknown) => {
    setEditData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async () => {
    if (!editData || !user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const updatePayload = {
        policy_name:      editData.policy_name,
        provider_name:    editData.provider_name,
        sum_assured:      editData.sum_assured,
        annual_premium:   editData.annual_premium,
        monthly_premium:  editData.monthly_premium,
        policy_end_date:  editData.policy_end_date,
        next_renewal_date: editData.next_renewal_date,
        nominee_name:     editData.nominee_name,
        nominee_relation: editData.nominee_relation,
        status:           editData.status,
        updated_at:       new Date().toISOString(),
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
    if (!confirm('Are you sure you want to delete this policy? This cannot be undone.')) return;
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
        <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading policy...
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton={true} backLabel="Back to Insurance" />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-gray-400">
          Policy not found.
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(policy.policy_end_date);
  const expiry = getExpiryInfo(daysUntilExpiry);
  const colors = getCategoryColors(policy.category);
  const displayData = editMode === 'edit' ? editData : policy;

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton={true} backLabel="Back to Insurance" />

      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* ── Hero Header Card ────────────────────────────────────────────── */}
        <div className={`rounded-2xl border overflow-hidden mb-6 ${colors.bg} ${colors.badgeBg.split(' ').filter(c => c.startsWith('border')).join(' ')}`}>
          {/* Color strip */}
          <div className={`h-2 ${colors.strip}`} />
          <div className="px-6 py-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-5xl leading-none">{getCategoryIcon(policy.category as InsuranceCategory)}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors.badgeBg}`}>
                    {formatInsuranceCategory(policy.category as InsuranceCategory)}
                  </span>
                </div>
                <h1 className={`text-2xl font-bold ${colors.text} leading-tight`}>
                  {displayData?.policy_name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {policy.provider_name}
                  {policy.policy_number && <span className="text-gray-300 dark:text-gray-600"> &bull; </span>}
                  {policy.policy_number && <span>Policy #{policy.policy_number}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`${getStatusColor(policy.status as InsuranceStatus)} border text-xs font-bold`}>
                {policy.status === 'ACTIVE' ? '✓ Active' : policy.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Key Metrics ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="Sum Assured"
            value={formatCover(policy.sum_assured)}
            sub={`₹${policy.sum_assured.toLocaleString('en-IN')}`}
            accent={colors.strip}
            iconBg={`${colors.bg}`}
            icon={<ShieldCheckIcon className={`w-4 h-4 ${colors.text}`} />}
          />
          <MetricCard
            label="Annual Premium"
            value={`₹${policy.annual_premium.toLocaleString('en-IN')}`}
            sub={policy.monthly_premium ? `₹${policy.monthly_premium.toLocaleString('en-IN')}/month` : undefined}
            accent="bg-violet-500"
            iconBg="bg-violet-50 dark:bg-violet-950/40"
            icon={<WalletIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
          />
          {policy.policy_end_date && (
            <MetricCard
              label="Expires In"
              value={expiry.text}
              sub={new Date(policy.policy_end_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              accent={expiry.dot}
              iconBg={expiry.bgColor ? expiry.bgColor.split(' ').slice(0, 2).join(' ') : 'bg-gray-50'}
              icon={<CalendarIcon className={`w-4 h-4 ${expiry.color}`} />}
            />
          )}
        </div>

        {/* ── Policy Details ──────────────────────────────────────────────── */}
        <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155] mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Policy Details
              </CardTitle>
              {editMode === 'view' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode('edit')}
                  className="gap-2 text-xs"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editMode === 'edit' ? (
              <div className="space-y-5">
                {/* Edit Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="policy_name" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Policy Name</Label>
                    <Input
                      id="policy_name"
                      value={editData?.policy_name || ''}
                      onChange={(e) => handleEditChange('policy_name', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider_name" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Provider</Label>
                    <Input
                      id="provider_name"
                      value={editData?.provider_name || ''}
                      onChange={(e) => handleEditChange('provider_name', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sum_assured" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sum Assured (₹)</Label>
                    <Input
                      id="sum_assured"
                      type="number"
                      value={editData?.sum_assured || ''}
                      onChange={(e) => handleEditChange('sum_assured', parseFloat(e.target.value))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_premium" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Annual Premium (₹)</Label>
                    <Input
                      id="annual_premium"
                      type="number"
                      value={editData?.annual_premium || ''}
                      onChange={(e) => handleEditChange('annual_premium', parseFloat(e.target.value))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="policy_end_date" className="text-xs font-semibold uppercase tracking-wider text-gray-500">End / Maturity Date</Label>
                    <Input
                      id="policy_end_date"
                      type="date"
                      value={editData?.policy_end_date || ''}
                      onChange={(e) => handleEditChange('policy_end_date', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="next_renewal_date" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Next Renewal</Label>
                    <Input
                      id="next_renewal_date"
                      type="date"
                      value={editData?.next_renewal_date || ''}
                      onChange={(e) => handleEditChange('next_renewal_date', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nominee_name" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nominee Name</Label>
                    <Input
                      id="nominee_name"
                      value={editData?.nominee_name || ''}
                      onChange={(e) => handleEditChange('nominee_name', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nominee_relation" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nominee Relation</Label>
                    <Input
                      id="nominee_relation"
                      value={editData?.nominee_relation || ''}
                      onChange={(e) => handleEditChange('nominee_relation', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end border-t border-[#E5E7EB] dark:border-[#334155] pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setEditMode('view'); setEditData(policy); }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              /* View mode — clean detail rows */
              <div className="divide-y divide-[#F1F5F9] dark:divide-[#334155]">
                <DetailRow
                  label="Start Date"
                  value={new Date(policy.policy_start_date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                />
                {policy.policy_end_date && (
                  <DetailRow
                    label="End Date"
                    value={new Date(policy.policy_end_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                    highlight={daysUntilExpiry !== null && daysUntilExpiry <= 30 ? 'text-red-600 dark:text-red-400' : undefined}
                  />
                )}
                {policy.next_renewal_date && (
                  <DetailRow
                    label="Next Renewal"
                    value={new Date(policy.next_renewal_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  />
                )}
                {policy.monthly_premium && (
                  <DetailRow
                    label="Monthly Premium"
                    value={`₹${policy.monthly_premium.toLocaleString('en-IN')}`}
                  />
                )}
                {policy.plan_type && (
                  <DetailRow label="Plan Type" value={policy.plan_type} />
                )}
                {policy.nominee_name && (
                  <DetailRow
                    label="Nominee"
                    value={`${policy.nominee_name}${policy.nominee_relation ? ` (${policy.nominee_relation})` : ''}`}
                  />
                )}
                {policy.family_members_count && (
                  <DetailRow label="Family Members" value={String(policy.family_members_count)} />
                )}
                <DetailRow label="Policy ID" value={policy.id.slice(0, 8).toUpperCase()} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Danger Zone ─────────────────────────────────────────────────── */}
        {editMode === 'view' && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Delete this policy</p>
                <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="gap-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Delete Policy
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
