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
import { PlusIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function KPIItem({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]">{label}</p>
      <p className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{value}</p>
      {subtext && <p className="text-xs text-[#9CA3AF] dark:text-[#64748B]">{subtext}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: InsuranceStatus }) {
  const colorClass = getStatusColor(status as InsuranceStatus);
  const label = status === 'ACTIVE' ? '✓ Active' : status;
  return <Badge className={`${colorClass} border`}>{label}</Badge>;
}

function AlertCard({ alert }: { alert: InsuranceAlert }) {
  const bgColor =
    alert.type === 'danger'
      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
      : alert.type === 'warning'
      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';

  const textColor =
    alert.type === 'danger'
      ? 'text-red-800 dark:text-red-200'
      : alert.type === 'warning'
      ? 'text-amber-800 dark:text-amber-200'
      : 'text-blue-800 dark:text-blue-200';

  const icon =
    alert.type === 'danger' || alert.type === 'warning' ? (
      <AlertTriangleIcon className="w-5 h-5" />
    ) : (
      <CheckCircleIcon className="w-5 h-5" />
    );

  return (
    <Card className={`${bgColor} border`}>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${textColor} mb-1`}>{alert.title}</h3>
            <p className={`text-xs ${textColor}`}>{alert.description}</p>
            {alert.action && (
              <Link
                href={alert.action.href}
                className={`text-xs font-medium mt-2 inline-block hover:underline ${textColor}`}
              >
                {alert.action.label} →
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

  // Capability guard: show locked page BEFORE any API calls
  if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability(FEATURE_ACCESS.INSURANCE.capability)) {
    return (
      <LockedFeaturePage
        title="Insurance"
        feature="INSURANCE"
      />
    );
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
      const key =
        groupBy === 'category'
          ? policy.category
          : (policy.status as InsuranceStatus);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(policy);
      return acc;
    },
    {} as Record<string, InsurancePolicy[]>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader showBackButton={true} backLabel="Back to Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading insurance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader showBackButton={true} backLabel="Back to Dashboard" />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Protection & Insurance
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your insurance policies and coverage
            </p>
          </div>
          <Link href="/portfolio/insurance/add">
            <Button className="gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Insurance
            </Button>
          </Link>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* KPI Strip */}
        {summary && (
          <section className="mb-8">
            <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  <KPIItem
                    label="Life Cover"
                    value={`₹${(summary.totalLifeCover / 100000).toFixed(1)}L`}
                  />
                  <KPIItem
                    label="Health Coverage"
                    value={`₹${(summary.totalHealthCover / 100000).toFixed(1)}L`}
                  />
                  <KPIItem
                    label="Annual Premium"
                    value={`₹${(summary.totalAnnualPremium / 1000).toFixed(0)}K`}
                  />
                  <KPIItem
                    label="Active Policies"
                    value={summary.activePolicies}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Policies List */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'category' | 'status')}
              className="px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm"
            >
              <option value="category">Group by Category</option>
              <option value="status">Group by Status</option>
            </select>
          </div>

          {Object.keys(groupedPolicies).length === 0 ? (
            <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]">
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No insurance policies added yet
                </p>
                <Link href="/portfolio/insurance/add">
                  <Button variant="outline">Add Your First Policy</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPolicies).map(([groupKey, groupPolicies]) => (
                <div key={groupKey}>
                  <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                    {groupBy === 'category'
                      ? `${getCategoryIcon(groupKey as InsuranceCategory)} ${formatInsuranceCategory(
                          groupKey as InsuranceCategory
                        )}`
                      : `Status: ${groupKey}`}
                  </h2>
                  <div className="space-y-3">
                    {groupPolicies.map((policy) => {
                      const daysUntilExpiry = getDaysUntilExpiry(
                        policy.policy_end_date
                      );
                      return (
                        <Link
                          key={policy.id}
                          href={`/portfolio/insurance/${policy.id}`}
                        >
                          <Card className="bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-colors cursor-pointer">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">
                                      {getCategoryIcon(
                                        policy.category as InsuranceCategory
                                      )}
                                    </span>
                                    <div>
                                      <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                        {policy.policy_name}
                                      </h3>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {policy.provider_name} • Policy #{policy.policy_number}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-4 text-sm mt-3">
                                    <div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Sum Assured
                                      </p>
                                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                        ₹{policy.sum_assured.toLocaleString('en-IN')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Annual Premium
                                      </p>
                                      <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                        ₹{policy.annual_premium.toLocaleString('en-IN')}
                                      </p>
                                    </div>
                                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          Expires in
                                        </p>
                                        <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                          {daysUntilExpiry} days
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <StatusBadge status={policy.status as InsuranceStatus} />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
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
