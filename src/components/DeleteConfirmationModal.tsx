'use client';

import { XIcon, AlertTriangleIcon } from '@/components/icons';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl max-w-md w-full border border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FEF2F2] dark:bg-[#7F1D1D]">
              <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444]" />
            </div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-[#6B7280] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-[#475569] dark:text-[#94A3B8] mb-4">
            {message}
          </p>

          {itemName && (
            <div className="p-3 bg-[#F6F8FB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#475569] mb-4">
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                {itemName}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FEE2E2] dark:border-[#EF4444] rounded-lg">
            <AlertTriangleIcon className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444] flex-shrink-0" />
            <p className="text-xs text-[#991B1B] dark:text-[#FEE2E2]">
              This action cannot be undone. All data associated with this item will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F6F8FB] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155] rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#1E293B] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#DC2626] dark:bg-[#EF4444] hover:bg-[#B91C1C] dark:hover:bg-[#DC2626] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
