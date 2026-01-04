/**
 * Premium Feature Gate
 * 
 * Wraps premium features with a preview and upsell.
 * Shows preview content, then offers upgrade for full access.
 */

'use client';

import { ReactNode } from 'react';
import PremiumUpsell from './PremiumUpsell';

interface PremiumFeatureGateProps {
  /** Whether user has premium access */
  hasAccess: boolean;
  /** Preview content (shown to free users) */
  preview: ReactNode;
  /** Full content (shown to premium users) */
  children: ReactNode;
  /** Feature name for upsell */
  featureName: string;
  /** Description of what premium unlocks */
  description: string;
  /** List of benefits */
  benefits?: string[];
}

export default function PremiumFeatureGate({
  hasAccess,
  preview,
  children,
  featureName,
  description,
  benefits = [],
}: PremiumFeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      {preview}
      <PremiumUpsell
        feature={featureName}
        description={description}
        benefits={benefits}
        variant="card"
      />
    </>
  );
}








