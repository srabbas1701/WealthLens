/**
 * PremiumFeatureGate
 *
 * Wraps premium content with a preview and ShowPaywall card when locked.
 * For full-page module gating (Real Estate, Insurance, Liabilities, Analytics),
 * use LockedFeaturePage instead — navigate to route, show locked page.
 * Modal gating is reserved for: Download, AI query limit.
 */

'use client';

import { ReactNode } from 'react';
import ShowPaywall from '@/components/ShowPaywall';
import { useCapabilities, type CapabilityKey } from '@/lib/capabilities';

interface PremiumFeatureGateProps {
  capabilityKey: CapabilityKey | string;
  preview: ReactNode;
  children: ReactNode;
  requireAll?: (CapabilityKey | string)[];
  requireAny?: (CapabilityKey | string)[];
}

export default function PremiumFeatureGate({
  capabilityKey,
  preview,
  children,
  requireAll,
  requireAny,
}: PremiumFeatureGateProps) {
  const { hasCapability, hasAllCapabilities, hasAnyCapability, loading } = useCapabilities();

  if (loading) return <>{preview}</>;

  let hasAccess = false;
  if (requireAll?.length) {
    hasAccess = hasAllCapabilities([capabilityKey, ...requireAll]);
  } else if (requireAny?.length) {
    hasAccess = hasAnyCapability([capabilityKey, ...requireAny]);
  } else {
    hasAccess = hasCapability(capabilityKey);
  }

  if (hasAccess) return <>{children}</>;

  return (
    <>
      {preview}
      <ShowPaywall reason="feature_locked" capability={capabilityKey} variant="card" />
    </>
  );
}
