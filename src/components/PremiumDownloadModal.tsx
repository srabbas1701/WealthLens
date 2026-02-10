/**
 * Modal shown when a download action is locked.
 * All locked actions route through ShowPaywall(reason, capability).
 */

'use client';

import ShowPaywall from '@/components/ShowPaywall';
import { CAPABILITY_KEYS, type CapabilityKey } from '@/lib/capabilities';

interface PremiumDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Capability that gates this download (default: PDF_REPORTS) */
  capability?: CapabilityKey | string;
}

export default function PremiumDownloadModal({
  isOpen,
  onClose,
  capability = CAPABILITY_KEYS.PDF_REPORTS,
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
