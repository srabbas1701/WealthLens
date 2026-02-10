/**
 * Shared capability helpers – client-safe barrel.
 *
 * Rule: Never check plan === premium (or tier, or plan name) directly.
 * Always use hasCapability(capabilityKey) or getUserEntitlements(userId).
 *
 * - React (client): import { useCapabilities, CAPABILITY_KEYS } from '@/lib/capabilities'
 * - Server (API routes): import { hasCapability, requireCapability, requirePaidAction } from '@/lib/capabilities/server'
 *                         import { getUserEntitlements } from '@/lib/entitlements'
 *
 * Server-only exports (hasCapability, requireCapability, requirePaidAction, getUserEntitlements)
 * are NOT re-exported here to avoid pulling next/headers into client bundles.
 */

export { checkCapability } from './client';
export { CAPABILITY_KEYS } from '@/types/capabilities';
export type { CapabilityKey } from '@/types/capabilities';
export { useCapabilities } from '@/hooks/useCapabilities';
export { useCapability } from '@/hooks/useCapability';
export type { UseCapabilityResult } from '@/hooks/useCapability';
export type { UserEntitlements } from '@/types/entitlements';
