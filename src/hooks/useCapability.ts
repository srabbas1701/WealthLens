/**
 * useCapability(capabilityKey)
 *
 * Reads from GET /api/entitlements (via useCapabilities). Returns whether the
 * capability is allowed and optional remaining limit for that key.
 *
 * @example
 * const { allowed, remaining } = useCapability('use_ai_help');
 * // { allowed: true, remaining: 5 }
 */

import { useMemo } from 'react';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { CapabilityKey } from '@/types/capabilities';

export interface UseCapabilityResult {
  /** Whether the user has this capability. */
  allowed: boolean;
  /** Remaining uses for this period (e.g. AI queries, scenario views), if applicable. */
  remaining: number | undefined;
  /** Entitlements are still loading. */
  loading: boolean;
}

export function useCapability(capabilityKey: CapabilityKey | string): UseCapabilityResult {
  const { hasCapability, getRemaining, loading } = useCapabilities();

  return useMemo(
    () => ({
      allowed: hasCapability(capabilityKey),
      remaining: getRemaining(capabilityKey),
      loading,
    }),
    [capabilityKey, hasCapability, getRemaining, loading]
  );
}
