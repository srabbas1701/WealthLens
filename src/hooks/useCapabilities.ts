/**
 * Capabilities Hook
 *
 * Fetches entitlements from GET /api/entitlements only. Does NOT infer capabilities
 * from plan/tier; the API is the single source of truth.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import type { UserEntitlements } from '@/types/entitlements';
import type { UserCapabilities, Capability, CapabilityKey } from '@/types/capabilities';

const USAGE_KEYS = new Set(['ai_remaining', 'scenario_remaining']);
const TRIAL_KEY = 'trial';

/** Capability keys that have a "remaining" count in entitlements. */
const REMAINING_BY_KEY: Record<string, 'ai_remaining' | 'scenario_remaining'> = {
  use_ai_help: 'ai_remaining',
  run_scenarios: 'scenario_remaining',
};

function capabilityKeysFromEntitlements(ent: UserEntitlements): string[] {
  return Object.entries(ent)
    .filter(
      ([k, v]) =>
        k !== TRIAL_KEY && !USAGE_KEYS.has(k) && typeof v === 'boolean' && v === true
    )
    .map(([k]) => k);
}

export function useCapabilities() {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setEntitlements(null);
      return;
    }

    const fetchEntitlements = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/entitlements');

        if (!response.ok) {
          if (response.status === 401) {
            setEntitlements(null);
            return;
          }
          throw new Error(`Failed to fetch entitlements: ${response.statusText}`);
        }

        const data: UserEntitlements = await response.json();
        setEntitlements(data);
      } catch (err) {
        console.error('Failed to fetch entitlements:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch entitlements');
        setEntitlements(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEntitlements();
  }, [user?.id]);

  const capability_keys = useMemo(
    () => (entitlements ? capabilityKeysFromEntitlements(entitlements) : []),
    [entitlements]
  );

  const hasCapability = useMemo(() => {
    return (key: CapabilityKey | string): boolean => {
      if (!entitlements) return false;
      return entitlements[key] === true;
    };
  }, [entitlements]);

  const hasAllCapabilities = useMemo(() => {
    return (keys: (CapabilityKey | string)[]): boolean => {
      if (!entitlements) return false;
      return keys.every((k) => entitlements[k] === true);
    };
  }, [entitlements]);

  const hasAnyCapability = useMemo(() => {
    return (keys: (CapabilityKey | string)[]): boolean => {
      if (!entitlements) return false;
      return keys.some((k) => entitlements[k] === true);
    };
  }, [entitlements]);

  const getCapability = useMemo(() => {
    return (_key: CapabilityKey | string): Capability | undefined => {
      return undefined;
    };
  }, []);

  const getRemaining = useMemo(() => {
    return (key: CapabilityKey | string): number | undefined => {
      if (!entitlements) return undefined;
      const remainingKey = REMAINING_BY_KEY[key];
      if (!remainingKey) return undefined;
      const v = entitlements[remainingKey];
      return typeof v === 'number' ? v : undefined;
    };
  }, [entitlements]);

  const capabilitiesShape: UserCapabilities | null = entitlements
    ? {
        user_id: user?.id ?? '',
        plan_id: null,
        capabilities: [],
        capability_keys,
        trial: entitlements.trial,
      }
    : null;

  return {
    capabilities: capabilitiesShape,
    loading,
    error,
    hasCapability,
    hasAllCapabilities,
    hasAnyCapability,
    getCapability,
    getRemaining,
    capabilityKeys: capability_keys,
    trial: entitlements?.trial,
    isTrial: !!entitlements?.trial?.active,
    trialEndsAt: entitlements?.trial?.ends_at ?? null,
    trialLimits: entitlements?.trial?.limits ?? null,
  };
}
