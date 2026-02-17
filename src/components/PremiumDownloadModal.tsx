/**
 * Modal shown when a download action is locked.
 * All locked actions route through ShowPaywall(reason, capability).
 */

'use client';

import ShowPaywall from '@/components/ShowPaywall';
import { FEATURE_ACCESS } from '@/config/feature-access';
import type { CapabilityKey } from '@/types/capabilities';

interface PremiumDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Capability that gates this download (default: download_reports) */
  capability?: CapabilityKey | string;
}

export default function PremiumDownloadModal({
  isOpen,
  onClose,
  capability = FEATURE_ACCESS.DOWNLOAD.capability,
}: PremiumDownloadModalProps) {
  return (
    <ShowPaywall
      reason="download_locked"
      capability={capability}
      variant="modal"
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
