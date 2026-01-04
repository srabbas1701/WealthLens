/**
 * Portfolio Upload Page
 * 
 * Trust-first upload experience for CSV/Excel portfolio files.
 * 
 * DESIGN PHILOSOPHY:
 * - Explain the process clearly to reduce anxiety
 * - Two-column layout: Explanation (left) + Upload (right)
 * - Step-by-step expectation setting
 * - No auto-finalization - user must review before confirmation
 * - Clear security reassurance
 * 
 * STATES:
 * - Initial: Ready to upload
 * - Uploading: File being processed
 * - Processing: Parsing and validating data
 * - Ready for review: Preview shown, awaiting confirmation
 * - Success: Upload confirmed
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { 
  UploadIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  LockIcon,
  ShieldCheckIcon,
  FileIcon,
  ArrowRightIcon,
  InfoIcon,
  RefreshIcon,
} from '@/components/icons';
import type { 
  ParsedHolding, 
  UploadPreviewResponse, 
  UploadErrorResponse,
  ConfirmUploadResponse,
} from '@/types/portfolio-upload';
import Link from 'next/link';

type UploadState = 'ready' | 'uploading' | 'processing' | 'review' | 'success' | 'error';

export default function PortfolioUploadPage() {
  const router = useRouter();
  const { user, authStatus } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [state, setState] = useState<UploadState>('ready');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/portfolio/upload');
    }
  }, [authStatus, router]);

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return null;
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return null; // Redirect happens in useEffect
  }

  /**
   * Handle file selection (drag & drop or click)
   */
  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploadedFile(file);
    setState('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setState('processing');
      const response = await fetch('/api/portfolio/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadPreviewResponse | UploadErrorResponse = await response.json();

      if (data.success) {
        const previewData = data as UploadPreviewResponse;
        setPreview(previewData);
        setState('review');
      } else {
        const errorData = data as UploadErrorResponse;
        setError(errorData.error || 'Failed to process file');
        setState('error');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
      handleFileSelect(file);
    } else {
      setError('Please upload a CSV or Excel file (.csv, .xls, .xlsx)');
    }
  }, []);

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Confirm and import portfolio
   */
  const handleConfirm = async () => {
    if (!preview || !user) return;

    setState('processing');
    setError(null);

    try {
      const response = await fetch('/api/portfolio/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          holdings: preview.holdings,
          source: 'dashboard',
        }),
      });

      const data: ConfirmUploadResponse | UploadErrorResponse = await response.json();

      if (data.success) {
        setResult(data as ConfirmUploadResponse);
        setState('success');
      } else {
        const errorData = data as UploadErrorResponse;
        setError(errorData.error || 'Failed to import portfolio');
        setState('error');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  };

  /**
   * Reset and start over
   */
  const handleReset = () => {
    setState('ready');
    setUploadedFile(null);
    setPreview(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Already handled above with authStatus checks

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Upload Portfolio</h1>
          <p className="text-sm text-[#6B7280]">
            Upload your investment portfolio from a CSV or Excel file
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Explanation */}
          <div className="space-y-6">
            {/* Process Explanation */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">How it works</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#2563EB]">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Upload your file</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Upload a CSV or Excel file exported from your broker or mutual fund platform.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#2563EB]">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">We process it</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      We'll parse your file and identify your holdings. This usually takes a few seconds.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#2563EB]">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Review and confirm</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Review the preview of your holdings. Nothing is saved until you confirm.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#2563EB]">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Done</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Your portfolio is imported and ready to view on your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Reassurance */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Your data is secure</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <LockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Read-only access</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      We only view your investments. We never execute trades or modify your portfolio.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Bank-grade encryption</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Your data is encrypted and stored securely in India. We never share your information.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Files are not stored</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      We parse your file in memory and discard it immediately. Only your portfolio data is saved.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* File Requirements */}
            <div className="bg-[#F6F8FB] rounded-xl border border-[#E5E7EB] p-6">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">File requirements</h3>
              <ul className="space-y-2 text-sm text-[#6B7280]">
                <li className="flex items-start gap-2">
                  <span className="text-[#2563EB] mt-0.5">•</span>
                  <span>CSV or Excel format (.csv, .xls, .xlsx)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2563EB] mt-0.5">•</span>
                  <span>Maximum file size: 5MB</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2563EB] mt-0.5">•</span>
                  <span>Should include: Asset name, Quantity, Buy price</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2563EB] mt-0.5">•</span>
                  <span>ISIN or Symbol helps with accurate identification</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Upload Action */}
          <div className="space-y-6">
            {/* Upload Area */}
            {state === 'ready' && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-8">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-[#2563EB] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] hover:border-[#2563EB]/50'
                  }`}
                >
                  <UploadIcon className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                    Drop your file here
                  </h3>
                  <p className="text-sm text-[#6B7280] mb-4">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              </div>
            )}

            {/* Uploading State */}
            {state === 'uploading' && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
                <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Uploading file</h3>
                <p className="text-sm text-[#6B7280]">
                  {uploadedFile?.name}
                </p>
              </div>
            )}

            {/* Processing State */}
            {state === 'processing' && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
                <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Processing your file</h3>
                <p className="text-sm text-[#6B7280]">
                  Parsing data and identifying holdings...
                </p>
              </div>
            )}

            {/* Review State */}
            {state === 'review' && preview && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Review your portfolio</h3>
                  <p className="text-sm text-[#6B7280]">
                    Please review the holdings below. Nothing will be saved until you confirm.
                  </p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F6F8FB] rounded-lg p-4">
                    <p className="text-xs text-[#6B7280] mb-1">Total Holdings</p>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {preview.holdings.length}
                    </p>
                  </div>
                  <div className="bg-[#F6F8FB] rounded-lg p-4">
                    <p className="text-xs text-[#6B7280] mb-1">Total Invested</p>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {formatCurrency(
                        preview.holdings.reduce((sum, h) => sum + h.invested_value, 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {preview.warnings && preview.warnings.length > 0 && (
                  <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[#92400E] mb-2">Note</p>
                        <ul className="space-y-1 text-sm text-[#92400E]">
                          {preview.warnings.slice(0, 3).map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                          {preview.warnings.length > 3 && (
                            <li className="text-[#78350F]">
                              + {preview.warnings.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Holdings Preview */}
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280]">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280]">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280]">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280]">Invested</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {preview.holdings.slice(0, 20).map((holding, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-[#0F172A]">{holding.name}</td>
                            <td className="px-4 py-3 text-[#6B7280]">
                              {holding.asset_type === 'equity' ? 'Equity' :
                               holding.asset_type === 'mutual_fund' ? 'Mutual Fund' :
                               holding.asset_type === 'fd' ? 'Fixed Deposit' :
                               holding.asset_type === 'bond' ? 'Bond' :
                               holding.asset_type === 'etf' ? 'ETF' :
                               holding.asset_type === 'gold' ? 'Gold' :
                               holding.asset_type === 'cash' ? 'Cash' :
                               holding.asset_type}
                            </td>
                            <td className="px-4 py-3 text-right text-[#0F172A]">
                              {holding.quantity.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-right text-[#0F172A]">
                              {formatCurrency(holding.invested_value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.holdings.length > 20 && (
                    <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] text-sm text-[#6B7280] text-center">
                      + {preview.holdings.length - 20} more holdings
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-3 border border-[#E5E7EB] text-[#0F172A] font-medium rounded-lg hover:bg-[#F6F8FB] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-3 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors flex items-center justify-center gap-2"
                  >
                    Confirm & Import
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Success State */}
            {state === 'success' && result && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                  <CheckCircleIcon className="w-8 h-8 text-[#16A34A]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Portfolio imported successfully</h3>
                <p className="text-sm text-[#6B7280] mb-6">
                  {result.holdingsCreated + result.holdingsUpdated} holdings imported
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
                >
                  View Dashboard
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Error State */}
            {state === 'error' && error && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Error</h3>
                    <p className="text-sm text-[#991B1B]">{error}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-3 border border-[#E5E7EB] text-[#0F172A] font-medium rounded-lg hover:bg-[#F6F8FB] transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

