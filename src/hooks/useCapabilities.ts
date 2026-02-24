/**
 * Capabilities Hook
 *
 * Fetches entitlements from GET /api/entitlements only.
 * Module-level cache prevents re-fetching on every route navigation.
 * Cache is keyed by user ID and expires after 5 minutes.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import type { UserEntitlements } from '@/types/entitlements';
import type { UserCapabilities, Capability, CapabilityKey } from '@/types/capabilities';

const USAGE_KEYS = new Set(['ai_remaining', 'scenario_remaining']);
const TRIAL_KEY = 'trial';

const REMAINING_BY_KEY: Record<string, 'ai_remaining' | 'scenario_remaining'> = {
  use_ai_help: 'ai_remaining',
  run_scenarios: 'scenario_remaining',
};

// ─── Module-level cache (survives route navigation) ───────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface EntitlementsCache {
  userId: string;
  entitlements: UserEntitlements;
  fetchedAt: number;
}

let entitlementsCache: EntitlementsCache | null = null;

function getCached(userId: string): UserEntitlements | null {
  if (!entitlementsCache) return null;
  if (entitlementsCache.userId !== userId) return null;
  if (Date.now() - entitlementsCache.fetchedAt > CACHE_TTL_MS) {
    entitlementsCache = null;
    return null;
  }
  return entitlementsCache.entitlements;
}

function setCache(userId: string, entitlements: UserEntitlements) {
  entitlementsCache = { userId, entitlements, fetchedAt: Date.now() };
}

export function clearEntitlementsCache() {
  entitlementsCache = null;
}
// ─────────────────────────────────────────────────────────────────────────────

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

  // Initialize state from cache immediately (no flash)
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(
    () => (user?.id ? getCached(user.id) : null)
  );
  const [loading, setLoading] = useState(() => {
    if (!user?.id) return false;
    return getCached(user.id) === null; // Only loading if no cache
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setEntitlements(null);
      return;
    }

    // If we have a valid cache, use it immediately — no fetch needed
    const cached = getCached(user.id);
    if (cached) {
      setEntitlements(cached);
      setLoading(false);
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
        setCache(user.id, data); // Store in module cache
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
