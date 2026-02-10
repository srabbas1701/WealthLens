/**
 * Client-side capability check (pure function).
 * Use when you already have capability_keys (e.g. from useCapabilities()).
 * For React components, prefer useCapabilities().hasCapability(key).
 */

/**
 * Returns true if capabilityKeys includes the given key.
 * Use this when you have a list of keys (e.g. from API or context) and need a pure check.
 */
export function checkCapability(capabilityKeys: string[], capabilityKey: string): boolean {
  if (!capabilityKeys || capabilityKeys.length === 0) return false;
  return capabilityKeys.includes(capabilityKey);
}
