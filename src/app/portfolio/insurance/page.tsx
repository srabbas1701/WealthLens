'use client';

/**
 * Insurance Dashboard
 *
 * Main protection dashboard showing all insurance policies,
 * coverage summaries, and alerts
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCapabilities } from '@/lib/capabilities';
import { FEATURE_ACCESS } from '@/config/feature-access';
import { LockedFeaturePage } from '@/components/LockedFeaturePage';
import {
  PlusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  WalletIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import type {
  InsurancePolicy,
  InsuranceSummary,
  InsuranceAlert,
  InsuranceCategory,
  InsuranceStatus,
} from '@/types/insurance';
import {
  calculateInsuranceSummary,
  generateInsuranceAlerts,
  formatInsuranceCategory,
  getStatusColor,
  getCategoryIcon,
  getDaysUntilExpiry,
} from '@/lib/insurance-utils';

// ─── Category color system ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { strip: string; text: string; badgeBg: string }> = {
  LIFE:              { strip: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-300',    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  HEALTH:            { strip: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  MOTOR:             { strip: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-300',   badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  HOME:              { strip: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-300',  badgeBg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
  TRAVEL:            { strip: 'bg-cyan-500',    text: 'text-cyan-700 dark:text-cyan-300',    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  PERSONAL_ACCIDENT: { strip: 'bg-rose-500',   text: 'text-rose-700 dark:text-rose-300',   badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  OTHER:             { strip: 'bg-slate-400',  text: 'text-slate-600 dark:text-slate-300',  badgeBg: 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER;
}

// ─── Expiry urgency helper ─────────────────────────────────────────────────

function getExpiryInfo(days: number | null): { text: string; color: string; dot: string } {
  if (days === null) return { text: '—', color: 'text-gray-400', dot: 'bg-gray-300 dark:bg-gray-600' };
  if (days < 0)  return { text: 'Expired',    color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' };
  if (days === 0) return { text: 'Today!',    color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' };
  if (days <= 30) return { text: `${days}d left`,               color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' };
  if (days <= 90) return { text: `${days}d left`,               color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' };
  const months = Math.round(days / 30);
  return { text: `${months} mo left`, color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400' };
}

// ─── Format cover amounts ─────────────────────────────────────────────────

function formatCover(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatPremium(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Alert Banner ─────────────────────────────────────────────────────────

function AlertBanner({ alert }: { alert: InsuranceAlert }) {
  const isDanger  = alert.type === 'danger';
  const isWarning = alert.type === 'warning';

  const s = isDanger
    ? { border: 'border-l-4 border-red-500',    bg: 'bg-red-50 dark:bg-red-950/30',    text: 'text-red-800 dark:text-red-200',    sub: 'text-red-600 dark:text-red-300',    dot: 'bg-red-500' }
    : isWarning
    ? { border: 'border-l-4 border-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-800 dark:text-amber-200', sub: 'text-amber-600 dark:text-amber-300', dot: 'bg-amber-500' }
    : { border: 'border-l-4 border-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30',   text: 'text-blue-800 dark:text-blue-200',   sub: 'text-blue-600 dark:text-blue-300',   dot: 'bg-blue-400' };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${s.bg} ${s.border}`}>
      <div className={`flex-shrink-0 w-2 h-2 rounded-full ${s.dot} mt-1.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${s.text}`}>{alert.title}</p>
        <p className={`text-xs mt-0.5 ${s.sub}`}>{alert.description}</p>
        {alert.action && (
          <Link href={alert.action.href} className={`text-xs font-medium mt-1.5 inline-flex items-center gap-1 hover:underline ${s.text}`}>
            {alert.action.label} →
          </Link>
        )}
      </div>
      {(isDanger || isWarning) ? (
        <AlertTriangleIcon className={`w-4 h-4 flex-shrink-0 ${s.text}`} />
      ) : (
        <CheckCircleIcon className={`w-4 h-4 flex-shrink-0 ${s.text}`} />
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
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
      <p className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Policy Card ──────────────────────────────────────────────────────────

function PolicyCard({ policy }: { policy: InsurancePolicy }) {
  const colors = getCategoryColors(policy.category);
  const daysUntilExpiry = getDaysUntilExpiry(policy.policy_end_date);
  const expiry = getExpiryInfo(daysUntilExpiry);
  const statusColor = getStatusColor(policy.status as InsuranceStatus);

  return (
    <Link href={`/portfolio/insurance/${policy.id}`}>
      <div className="group flex bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-md transition-all overflow-hidden cursor-pointer">

        {/* Left category accent strip */}
        <div className={`w-1.5 flex-shrink-0 ${colors.strip}`} />

        <div className="flex-1 px-5 py-4 min-w-0">
          {/* Row 1: Category badge + policy name + status */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.badgeBg}`}>
                {getCategoryIcon(policy.category as InsuranceCategory)}
                {formatInsuranceCategory(policy.category as InsuranceCategory)}
              </span>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                {policy.policy_name}
              </h3>
            </div>
            <Badge className={`${statusColor} border flex-shrink-0 text-xs font-semibold`}>
              {policy.status === 'ACTIVE' ? '✓ Active' : policy.status}
            </Badge>
          </div>

          {/* Row 2: Provider + Policy number */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {policy.provider_name}
            {policy.policy_number && (
              <span className="text-gray-300 dark:text-gray-600"> &bull; </span>
            )}
            {policy.policy_number && <span>#{policy.policy_number}</span>}
          </p>

          {/* Row 3: Key metrics */}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">

            {/* Sum Assured — primary, largest */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Sum Assured</p>
              <p className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-none">
                {formatCover(policy.sum_assured)}
              </p>
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block w-px h-10 bg-[#E5E7EB] dark:bg-[#334155]" />

            {/* Annual Premium */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Annual Premium</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {formatPremium(policy.annual_premium)}<span className="text-xs font-normal text-gray-400">/yr</span>
              </p>
              {policy.monthly_premium && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  ₹{policy.monthly_premium.toLocaleString('en-IN')}/mo
                </p>
              )}
            </div>

            {/* Expiry */}
            {policy.policy_end_date && (
              <>
                <div className="hidden sm:block w-px h-10 bg-[#E5E7EB] dark:bg-[#334155]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Expires</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${expiry.dot}`} />
                    <p className={`text-sm font-bold ${expiry.color}`}>{expiry.text}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(policy.policy_end_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </>
            )}

            {/* Nominee — right-aligned */}
            {policy.nominee_name && (
              <div className="ml-auto text-right hidden lg:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Nominee</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {policy.nominee_name}
                </p>
                {policy.nominee_relation && (
                  <p className="text-[10px] text-gray-400">{policy.nominee_relation}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center px-3 text-gray-300 dark:text-gray-600 group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors">
          <ArrowRightIcon className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

// ─── Category / Status Group Header ──────────────────────────────────────

function GroupHeader({
  groupKey,
  policies,
  groupBy,
}: {
  groupKey: string;
  policies: InsurancePolicy[];
  groupBy: 'category' | 'status';
}) {
  const colors = getCategoryColors(groupKey);
  const totalCover = policies.reduce((s, p) => s + p.sum_assured, 0);
  const activePolicies = policies.filter((p) => p.status === 'ACTIVE').length;

  if (groupBy === 'status') {
    const statusStyles: Record<string, string> = {
      ACTIVE:   'text-emerald-700 dark:text-emerald-300',
      EXPIRED:  'text-red-600 dark:text-red-400',
      LAPSED:   'text-amber-600 dark:text-amber-400',
      INACTIVE: 'text-gray-500 dark:text-gray-400',
    };
    return (
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-[#E5E7EB] dark:bg-[#334155]" />
        <span className={`text-xs font-bold uppercase tracking-wider px-2 ${statusStyles[groupKey] || 'text-gray-500'}`}>
          {groupKey}
        </span>
        <div className="h-px flex-1 bg-[#E5E7EB] dark:bg-[#334155]" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-3 h-3 rounded-full ${colors.strip}`} />
        <h2 className={`text-sm font-bold ${colors.text}`}>
          {getCategoryIcon(groupKey as InsuranceCategory)}{' '}
          {formatInsuranceCategory(groupKey as InsuranceCategory)}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
          {activePolicies < policies.length && (
            <span className="text-amber-500 dark:text-amber-400"> · {activePolicies} active</span>
          )}
        </span>
      </div>
      <span className={`text-xs font-bold ${colors.text}`}>
        {formatCover(totalCover)} cover
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function InsuranceDashboardPage() {
  const { authStatus, user } = useAuth();
  const router = useRouter();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [alerts, setAlerts] = useState<InsuranceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'category' | 'status'>('category');

  useEffect(() => {
    if (authStatus === 'authenticated' && user?.id && hasCapability(FEATURE_ACCESS.INSURANCE.capability)) {
      fetchInsurancePolicies(user.id);
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, user?.id, router, hasCapability]);

  if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability(FEATURE_ACCESS.INSURANCE.capability)) {
    return <LockedFeaturePage title="Insurance" feature="INSURANCE" />;
  }

  async function fetchInsurancePolicies(userId: string) {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('user_id', userId)
        .order('policy_start_date', { ascending: false });

      if (dbError) throw dbError;

      const typedPolicies = (data || []) as InsurancePolicy[];
      setPolicies(typedPolicies);

      const calc = calculateInsuranceSummary(typedPolicies);
      setSummary(calc);

      const generated = generateInsuranceAlerts(typedPolicies, calc, null);
      setAlerts(generated);
    } catch (err) {
      console.error('[Insurance Dashboard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }

  const groupedPolicies = policies.reduce(
    (acc, policy) => {
      const key = groupBy === 'category' ? policy.category : (policy.status as InsuranceStatus);
      if (!acc[key]) acc[key] = [];
      acc[key].push(policy);
      return acc;
    },
    {} as Record<string, InsurancePolicy[]>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton={true} backLabel="Back to Dashboard" />
        <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading insurance data...
        </div>
      </div>
    );
  }

  const totalPolicies = policies.length;
  const lifeCount   = policies.filter((p) => p.category === 'LIFE'   && p.status === 'ACTIVE').length;
  const healthCount = policies.filter((p) => p.category === 'HEALTH' && p.status === 'ACTIVE').length;
  const allActive   = summary && totalPolicies > 0 && summary.activePolicies === totalPolicies;

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton={true} backLabel="Back to Dashboard" />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheckIcon className="w-6 h-6 text-[#2563EB]" />
              <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Protection & Insurance
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-8.5">
              {totalPolicies > 0
                ? `${summary?.activePolicies || 0} active · ${totalPolicies} total policies`
                : 'Track all your insurance policies in one place'}
            </p>
          </div>
          <Link href="/portfolio/insurance/add">
            <Button className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
              <PlusIcon className="w-4 h-4" />
              Add Policy
            </Button>
          </Link>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert) => (
              <AlertBanner key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            {/* Life Cover */}
            <KpiCard
              label="Life Cover"
              value={formatCover(summary.totalLifeCover)}
              sub={lifeCount > 0 ? `${lifeCount} active life ${lifeCount === 1 ? 'policy' : 'policies'}` : 'No active life policies'}
              accent="bg-blue-500"
              iconBg="bg-blue-50 dark:bg-blue-950/40"
              icon={<ShieldCheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            />

            {/* Health Cover */}
            <KpiCard
              label="Health Cover"
              value={formatCover(summary.totalHealthCover)}
              sub={healthCount > 0 ? `${healthCount} health ${healthCount === 1 ? 'policy' : 'policies'} active` : 'No active health policies'}
              accent="bg-emerald-500"
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              icon={<CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            />

            {/* Annual Premium */}
            <KpiCard
              label="Annual Premium"
              value={`₹${summary.totalAnnualPremium.toLocaleString('en-IN')}`}
              sub={`≈ ₹${Math.round(summary.totalAnnualPremium / 12).toLocaleString('en-IN')}/month`}
              accent="bg-violet-500"
              iconBg="bg-violet-50 dark:bg-violet-950/40"
              icon={<WalletIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
            />

            {/* Policy Status */}
            <KpiCard
              label="Active Policies"
              value={`${summary.activePolicies} / ${totalPolicies}`}
              sub={
                summary.policiesExpiringIn30Days > 0
                  ? `⚠ ${summary.policiesExpiringIn30Days} expiring within 30 days`
                  : summary.expiredPolicies > 0
                  ? `${summary.expiredPolicies} expired · check coverage`
                  : totalPolicies === 0
                  ? 'No policies added yet'
                  : 'All policies current'
              }
              accent={allActive ? 'bg-emerald-500' : 'bg-amber-500'}
              iconBg={allActive ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}
              icon={
                <CalendarIcon
                  className={`w-4 h-4 ${allActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                />
              }
            />
          </div>
        )}

        {/* ── Policies List ────────────────────────────────────────────────── */}
        <section>

          {/* Controls row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Your Policies
              {totalPolicies > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({totalPolicies})</span>
              )}
            </h2>
            <div className="flex items-center bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-0.5 gap-0.5">
              {(['category', 'status'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setGroupBy(opt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    groupBy === opt
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {opt === 'category' ? 'By Category' : 'By Status'}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {Object.keys(groupedPolicies).length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] border border-dashed border-[#E5E7EB] dark:border-[#334155] rounded-xl py-16 text-center">
              <ShieldCheckIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
                No insurance policies yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
                Add your life, health, motor and other policies to track coverage
              </p>
              <Link href="/portfolio/insurance/add">
                <Button variant="outline" size="sm" className="gap-2">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Your First Policy
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedPolicies).map(([groupKey, groupPolicies]) => (
                <div key={groupKey}>
                  <GroupHeader groupKey={groupKey} policies={groupPolicies} groupBy={groupBy} />
                  <div className="space-y-3">
                    {groupPolicies.map((policy) => (
                      <PolicyCard key={policy.id} policy={policy} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
