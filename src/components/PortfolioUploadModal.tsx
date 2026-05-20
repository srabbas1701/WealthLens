/**
 * Portfolio Upload Modal
 * 
 * A comprehensive, trust-first upload experience for CSV/Excel portfolio files.
 * 
 * DESIGN PHILOSOPHY:
 * - Multi-step process: Upload → Mapping → Preview → Confirm
 * - User stays in control at every step
 * - Clear, non-scary error messages
 * - Intelligent column detection with user override capability
 * - Explicit display of ignored columns
 * - No trading language
 * 
 * COLUMN MAPPING STRATEGY:
 * - Auto-detect using fuzzy matching and synonyms
 * - Prefer ISIN > Symbol for asset identification
 * - EXPLICITLY IGNORE calculated columns (Current Value, P&L, Returns, etc.)
 * - Allow user to override any mapping
 * 
 * UX PRINCIPLES:
 * - Drag & drop or click to upload
 * - Show detected mappings with confidence indicators
 * - Highlight ignored columns with explanation
 * - Preview table shows exactly what will be imported
 * - Invalid rows are highlighted but don't block import
 */

'use client';

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { 
  XIcon, 
  UploadIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  SparklesIcon,
  ChevronDownIcon,
  InfoIcon,
  RefreshIcon,
  EditIcon,
} from '@/components/icons';
import { useCurrency } from '@/lib/currency/useCurrency';
import type { 
  ParsedHolding, 
  UploadPreviewResponse, 
  UploadErrorResponse,
  ConfirmUploadResponse,
} from '@/types/portfolio-upload';

interface PortfolioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  source: 'onboarding' | 'dashboard';
  onSuccess?: () => void;
}

type UploadStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'success' | 'error';

// Target fields for column mapping
type TargetField = 'symbol' | 'isin' | 'name' | 'quantity' | 'average_price' | 'asset_type' | 'ignore';

interface ColumnMapping {
  header: string;
  targetField: TargetField;
  confidence: 'high' | 'medium' | 'low' | 'manual';
  isIgnored: boolean;
  ignoreReason?: string;
}

// Columns that should be IGNORED (calculated values we don't trust)
const IGNORED_COLUMN_PATTERNS = [
  { pattern: /current.*value|market.*value|present.*value/i, reason: 'Calculated from market prices' },
  { pattern: /p[&]?l|profit|loss|gain|return/i, reason: 'Calculated value' },
  { pattern: /day.*change|today.*change|change.*%/i, reason: 'Daily fluctuation' },
  { pattern: /unrealized|realized/i, reason: 'Calculated P&L' },
  { pattern: /xirr|cagr|absolute.*return/i, reason: 'Performance metric' },
  { pattern: /nav|ltp|last.*price|current.*price/i, reason: 'Current market price (not buy price)' },
  { pattern: /order.*id|trade.*id|txn.*id|transaction.*id/i, reason: 'Transaction reference' },
  { pattern: /date|time|timestamp/i, reason: 'Date/time field' },
  { pattern: /status|state|remark/i, reason: 'Metadata field' },
];

// Field labels for UI
const FIELD_LABELS: Record<TargetField, string> = {
  symbol: 'Symbol/Ticker',
  isin: 'ISIN',
  name: 'Name',
  quantity: 'Quantity',
  average_price: 'Buy/Avg Price',
  asset_type: 'Asset Type',
  ignore: 'Ignore',
};

function PortfolioUploadModalInner({
  isOpen,
  onClose,
  userId,
  source,
  onSuccess,
}: PortfolioUploadModalProps) {
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState<UploadStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<ConfirmUploadResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importStatusIndex, setImportStatusIndex] = useState(0);
  /**
   * Per-row user overrides applied on the preview screen before confirming.
   * Keyed by `holdings` array index. Lets the user skip individual rows or
   * fix quantity / average price inline (e.g. when the file had ₹0 price).
   */
  const [rowOverrides, setRowOverrides] = useState<
    Record<number, { skipped?: boolean; quantity?: number; average_price?: number }>
  >({});
  /** Index of the row currently being edited inline (qty + price), null when none. */
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const IMPORT_STATUS_MESSAGES = [
    'Resolving your investments...',
    'Looking up holdings...',
    'Saving to your portfolio...',
  ];

  // Reset state when modal opens/closes
  const resetState = useCallback(() => {
    setStep('upload');
    setIsDragging(false);
    setIsUploading(false);
    setRawHeaders([]);
    setColumnMappings([]);
    setPreview(null);
    setError(null);
    setErrorCode(null);
    setDetectedHeaders([]);
    setResult(null);
    setUploadedFile(null);
    setRowOverrides({});
    setEditingRowIdx(null);
    setEditQty('');
    setEditPrice('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // Cycle through status messages during import for better perceived progress
  useEffect(() => {
    if (step !== 'importing') return;
    setImportStatusIndex(0);
    const interval = setInterval(() => {
      setImportStatusIndex(i => (i + 1) % IMPORT_STATUS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  /**
   * Check if a column should be ignored (calculated value)
   */
  const shouldIgnoreColumn = (header: string): { ignore: boolean; reason?: string } => {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const { pattern, reason } of IGNORED_COLUMN_PATTERNS) {
      if (pattern.test(normalizedHeader)) {
        return { ignore: true, reason };
      }
    }
    
    return { ignore: false };
  };

  /**
   * Auto-detect column mapping based on header name
   */
  const detectColumnMapping = (header: string): { field: TargetField; confidence: 'high' | 'medium' | 'low' } => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    
    // ISIN detection (highest priority)
    if (/^isin|isin_code|isin_number/.test(normalized)) {
      return { field: 'isin', confidence: 'high' };
    }
    
    // Symbol detection
    if (/^symbol|ticker|scrip|trading_?symbol/.test(normalized)) {
      return { field: 'symbol', confidence: 'high' };
    }
    if (/stock_?symbol|nse_?symbol|bse_?symbol/.test(normalized)) {
      return { field: 'symbol', confidence: 'medium' };
    }
    
    // Name detection
    if (/^name|stock_?name|company_?name|security_?name|instrument_?name|scheme_?name|fund_?name/.test(normalized)) {
      return { field: 'name', confidence: 'high' };
    }
    if (/company|security|instrument|scheme|fund|particulars/.test(normalized)) {
      return { field: 'name', confidence: 'medium' };
    }
    
    // Quantity detection
    if (/^quantity|^qty|^units|^shares|no_?of_?shares|num_?shares/.test(normalized)) {
      return { field: 'quantity', confidence: 'high' };
    }
    if (/holdings|balance_?units|balance_?qty/.test(normalized)) {
      return { field: 'quantity', confidence: 'medium' };
    }
    
    // Average price detection (careful - avoid current/market price)
    if (/^price$|^avg_?price|average_?price|avg_?cost|average_?cost|buy_?price|purchase_?price|cost_?price/.test(normalized)) {
      return { field: 'average_price', confidence: 'high' };
    }
    if (/buy_?avg|buy_?average|invested_?nav|average_?nav|rate/.test(normalized)) {
      return { field: 'average_price', confidence: 'medium' };
    }
    
    // Asset type detection
    if (/^asset_?type|^instrument_?type|^security_?type|^asset_?class/.test(normalized)) {
      return { field: 'asset_type', confidence: 'high' };
    }
    if (/^type$|^category$/.test(normalized)) {
      return { field: 'asset_type', confidence: 'low' };
    }
    
    // Default: ignore unrecognized columns
    return { field: 'ignore', confidence: 'low' };
  };

  /**
   * Handle file selection (drag & drop or click)
   */
  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/portfolio/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadPreviewResponse | UploadErrorResponse = await response.json();

      if (data.success) {
        const previewData = data as UploadPreviewResponse;
        setPreview(previewData);
        
        // Extract headers and create initial mappings
        if (previewData.holdings.length > 0) {
          // Get headers from detectedColumns or infer from preview
          const detectedCols = previewData.detectedColumns || {};
          const headers = Object.keys(previewData.holdings[0]).filter(
            k => !['isValid', 'validationNote', 'rowIndex'].includes(k)
          );
          
          // Build column mappings with auto-detection
          const mappings: ColumnMapping[] = [];
          
          // If we have detected columns from API, use them
          if (detectedCols) {
            // Add detected columns
            for (const [field, headerName] of Object.entries(detectedCols)) {
              if (headerName && field !== 'invested_value') {
                const { ignore, reason } = shouldIgnoreColumn(headerName);
                mappings.push({
                  header: headerName,
                  targetField: ignore ? 'ignore' : (field as TargetField),
                  confidence: 'high',
                  isIgnored: ignore,
                  ignoreReason: reason,
                });
              }
            }
          }
          
          setRawHeaders(headers);
          setColumnMappings(mappings);
        }
        
        // Skip mapping step if we have good auto-detection, go straight to preview
        setStep('preview');
      } else {
        const errorData = data as UploadErrorResponse;
        setError(errorData.details || errorData.error);
        setErrorCode(errorData.errorCode || null);
        setDetectedHeaders(errorData.detectedHeaders || []);
        setStep('error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Could not process your file. Please try again.');
      setErrorCode(null);
      setDetectedHeaders([]);
      setStep('error');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Update a column mapping
   */
  const updateMapping = (header: string, newField: TargetField) => {
    setColumnMappings(prev => 
      prev.map(m => 
        m.header === header 
          ? { ...m, targetField: newField, confidence: 'manual', isIgnored: newField === 'ignore' }
          : m
      )
    );
  };

  /**
   * Apply user overrides to a holding row to produce the "effective" row that
   * will actually be imported. Recomputes invested_value from qty × price.
   */
  const applyOverridesToHolding = useCallback((holding: ParsedHolding, idx: number): ParsedHolding => {
    const ov = rowOverrides[idx];
    if (!ov) return holding;
    const quantity = ov.quantity ?? holding.quantity;
    const average_price = ov.average_price ?? holding.average_price;
    const invested_value = quantity * average_price;
    const wasEdited = ov.quantity !== undefined || ov.average_price !== undefined;
    const isValid = quantity > 0 && average_price > 0;
    return {
      ...holding,
      quantity,
      average_price,
      invested_value,
      isValid,
      validationNote: wasEdited && isValid ? 'Edited before import' : holding.validationNote,
    };
  }, [rowOverrides]);

  /** Toggle a row's "skipped" state (user excluded it from import). */
  const toggleRowSkip = (idx: number) => {
    setRowOverrides(prev => ({
      ...prev,
      [idx]: { ...prev[idx], skipped: !prev[idx]?.skipped },
    }));
  };

  /** Begin inline-editing a row's quantity and price. */
  const startEditRow = (idx: number, currentQty: number, currentPrice: number) => {
    setEditingRowIdx(idx);
    setEditQty(currentQty > 0 ? String(currentQty) : '');
    setEditPrice(currentPrice > 0 ? String(currentPrice) : '');
  };

  /** Save inline edits to the row. */
  const saveEditRow = () => {
    if (editingRowIdx === null) return;
    const qty = parseFloat(editQty);
    const price = parseFloat(editPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      // Invalid input — flash a brief inline alert via window (no extra toast lib here)
      alert('Please enter a positive quantity and price.');
      return;
    }
    setRowOverrides(prev => ({
      ...prev,
      [editingRowIdx]: { ...prev[editingRowIdx], quantity: qty, average_price: price, skipped: false },
    }));
    setEditingRowIdx(null);
    setEditQty('');
    setEditPrice('');
  };

  const cancelEditRow = () => {
    setEditingRowIdx(null);
    setEditQty('');
    setEditPrice('');
  };

  /**
   * Holdings with all user overrides applied, used for both the preview
   * counts/totals and the final confirm payload.
   */
  const effectiveHoldings = (preview?.holdings ?? []).map((h, i) => ({
    holding: applyOverridesToHolding(h, i),
    skipped: rowOverrides[i]?.skipped ?? false,
    originalIndex: i,
  }));

  const includedHoldings = effectiveHoldings.filter(r => !r.skipped && r.holding.isValid);
  const livePreviewTotal = includedHoldings.reduce((sum, r) => sum + r.holding.invested_value, 0);

  /**
   * Confirm and import the previewed holdings
   */
  const handleConfirm = async () => {
    if (!preview) return;

    if (includedHoldings.length === 0) {
      alert('Please include at least one holding before importing.');
      return;
    }

    setStep('importing');

    try {
      const response = await fetch('/api/portfolio/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          holdings: includedHoldings.map(r => r.holding),
          source,
        }),
      });

      const data: ConfirmUploadResponse = await response.json();

      if (data.success) {
        setResult(data);
        setStep('success');
        onSuccess?.();
      } else {
        setError(data.error || 'Could not import your portfolio');
        setStep('error');
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setError('Something went wrong. Please try again.');
      setStep('error');
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleBrowseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };


  const formatAssetType = (type: string) => {
    const labels: Record<string, string> = {
      'equity': 'Stock',
      'mutual_fund': 'Mutual Fund',
      'index_fund': 'Index Fund',
      'etf': 'ETF',
      'fd': 'Fixed Deposit',
      'bond': 'Bond',
      'gold': 'Gold',
      'cash': 'Cash',
      'ppf': 'PPF',
      'epf': 'EPF',
      'nps': 'NPS',
      'other': 'Other',
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UploadIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Upload Portfolio</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'upload' && 'Import from CSV or Excel file'}
                {step === 'mapping' && 'Review column mappings'}
                {step === 'preview' && 'Review your holdings'}
                {step === 'importing' && 'Importing...'}
                {step === 'success' && 'Import complete'}
                {step === 'error' && 'Something went wrong'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Progress Steps */}
        {['upload', 'mapping', 'preview'].includes(step) && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155]">
            <div className="flex items-center gap-2">
              {['upload', 'mapping', 'preview'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${step === s ? 'bg-emerald-600 text-white' : 
                      ['upload', 'mapping', 'preview'].indexOf(step) > i ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                      'bg-gray-200 dark:bg-[#334155] text-gray-500 dark:text-gray-400'}
                  `}>
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm ${step === s ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : 'Preview'}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-gray-300 dark:bg-[#334155] mx-3" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-12 text-center transition-all
                  ${isDragging 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                    : 'border-gray-200 dark:border-[#334155] hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-gray-50 dark:hover:bg-[#334155]'
                  }
                  ${isUploading ? 'pointer-events-none opacity-60' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
                    <p className="text-gray-600 dark:text-gray-300">Processing your file...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <UploadIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {isDragging ? 'Drop your file here' : 'Drag & drop your file'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      or
                    </p>
                    {/* Browse button - explicit click handler */}
                    <button
                      type="button"
                      onClick={handleBrowseClick}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <UploadIcon className="w-4 h-4" />
                      Browse Files
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                      Supports CSV, XLS, XLSX • Max 5MB
                    </p>
                  </>
                )}
              </div>

              {/* Help text */}
              <div className="bg-gray-50 dark:bg-[#0F172A]/50 rounded-xl p-4 border border-gray-100 dark:border-[#334155]">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-medium text-gray-900 dark:text-white">Intelligent column detection</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Our system automatically detects columns from any broker export. We identify:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Symbol / ISIN</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Quantity / Units</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Buy / Average Price</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Asset Type</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#334155]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Note:</strong> We ignore calculated columns like Current Value, P&L, and Returns. 
                    We compute these ourselves from quantity × price.
                  </p>
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300 text-sm">Your data is secure</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400/80 mt-1">
                    Files are processed in memory and never stored. We only save the investment data you approve.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-300 text-sm">Review column mappings</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400/80 mt-1">
                      We've auto-detected your columns. Please verify and adjust if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Column mapping table */}
              <div className="border border-gray-200 dark:border-[#334155] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#0F172A]/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Your Column</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Maps To</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Confidence</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                    {columnMappings.map((mapping, index) => (
                      <tr 
                        key={mapping.header}
                        className={mapping.isIgnored ? 'bg-gray-50 dark:bg-[#0F172A]/50' : 'bg-white dark:bg-[#1E293B]'}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-medium ${mapping.isIgnored ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {mapping.header}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={mapping.targetField}
                            onChange={(e) => updateMapping(mapping.header, e.target.value as TargetField)}
                            className={`
                              px-3 py-1.5 rounded-lg border text-sm
                              ${mapping.isIgnored 
                                ? 'border-gray-200 dark:border-[#334155] bg-gray-100 dark:bg-[#334155] text-gray-500 dark:text-gray-400' 
                                : 'border-gray-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-gray-900 dark:text-white'}
                            `}
                          >
                            <option value="ignore">Ignore</option>
                            <option value="symbol">Symbol/Ticker</option>
                            <option value="isin">ISIN</option>
                            <option value="name">Name</option>
                            <option value="quantity">Quantity</option>
                            <option value="average_price">Buy/Avg Price</option>
                            <option value="asset_type">Asset Type</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {mapping.isIgnored ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-[#334155] text-gray-600 dark:text-gray-400 rounded text-xs">
                              Ignored
                            </span>
                          ) : (
                            <span className={`
                              inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                              ${mapping.confidence === 'high' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                mapping.confidence === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                mapping.confidence === 'manual' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                'bg-gray-100 dark:bg-[#334155] text-gray-600 dark:text-gray-400'}
                            `}>
                              {mapping.confidence === 'high' ? 'High' :
                               mapping.confidence === 'medium' ? 'Medium' :
                               mapping.confidence === 'manual' ? 'Manual' : 'Low'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs truncate max-w-32">
                          {mapping.ignoreReason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ignored columns explanation */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/50">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">Why some columns are ignored</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400/80 mt-1">
                      We don't import calculated values like Current Value, P&L, or Returns. 
                      We compute these ourselves to ensure accuracy and consistency.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#334155]">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('preview')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Continue to Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-6">
              {/* Summary — live totals reflecting user skip/edit overrides */}
              {(() => {
                const includedCount = includedHoldings.length;
                const skippedByUser = effectiveHoldings.filter(r => r.skipped).length;
                const invalidCount = effectiveHoldings.filter(r => !r.skipped && !r.holding.isValid).length;
                return (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/50">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-emerald-800 dark:text-emerald-300">
                        Ready to import {includedCount} investment{includedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-emerald-600 dark:text-emerald-400">Total Invested</p>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                          {formatCurrency(livePreviewTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-emerald-600 dark:text-emerald-400">Will Import</p>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">{includedCount}</p>
                      </div>
                      {(skippedByUser > 0 || invalidCount > 0) && (
                        <div>
                          <p className="text-amber-600 dark:text-amber-400">Excluded</p>
                          <p className="font-semibold text-amber-700 dark:text-amber-300">
                            {skippedByUser + invalidCount}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Detected Columns - Show what was auto-mapped */}
              {preview.detectedColumns && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-start gap-3">
                    <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-2">Auto-detected columns</p>
                      <div className="flex flex-wrap gap-2">
                        {preview.detectedColumns.name && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            Name: <span className="font-medium">{preview.detectedColumns.name}</span>
                          </span>
                        )}
                        {preview.detectedColumns.symbol && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            Symbol: <span className="font-medium">{preview.detectedColumns.symbol}</span>
                          </span>
                        )}
                        {preview.detectedColumns.isin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            ISIN: <span className="font-medium">{preview.detectedColumns.isin}</span>
                          </span>
                        )}
                        {preview.detectedColumns.quantity && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            Qty: <span className="font-medium">{preview.detectedColumns.quantity}</span>
                          </span>
                        )}
                        {preview.detectedColumns.average_price && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            Price: <span className="font-medium">{preview.detectedColumns.average_price}</span>
                          </span>
                        )}
                        {/* Show that Value is computed */}
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs text-emerald-700 dark:text-emerald-400">
                          Value: <span className="font-medium">Qty × Price</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/50">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">Please note</p>
                      <ul className="mt-1 space-y-1">
                        {preview.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-amber-700 dark:text-amber-400/80">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview table — interactive: skip / edit per row before import */}
              <div className="border border-gray-200 dark:border-[#334155] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#0F172A]/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Type</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Qty</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Avg Price</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Invested</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                      {effectiveHoldings.map(({ holding, skipped, originalIndex }) => {
                        const isEditing = editingRowIdx === originalIndex;
                        const hasIssue = !holding.isValid;
                        const wasEdited = rowOverrides[originalIndex]?.quantity !== undefined ||
                                          rowOverrides[originalIndex]?.average_price !== undefined;

                        // Row background — visually communicates state
                        const rowBg = skipped
                          ? 'bg-gray-100 dark:bg-[#0F172A]/60 opacity-60'
                          : hasIssue
                            ? 'bg-amber-50/60 dark:bg-amber-900/20'
                            : wasEdited
                              ? 'bg-blue-50/60 dark:bg-blue-900/20'
                              : 'bg-white dark:bg-[#1E293B]';

                        return (
                          <tr key={originalIndex} className={rowBg}>
                            {/* Name + symbol/isin */}
                            <td className="px-4 py-3 align-top">
                              <p className={`font-medium truncate max-w-48 ${
                                skipped ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'
                              }`}>
                                {holding.name}
                              </p>
                              {(holding.symbol || holding.isin) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-48">
                                  {holding.symbol || holding.isin}
                                </p>
                              )}
                              {hasIssue && !isEditing && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                  ⚠ Missing qty or price — edit or skip
                                </p>
                              )}
                              {wasEdited && !isEditing && !skipped && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                  ✓ Edited before import
                                </p>
                              )}
                            </td>

                            {/* Asset type */}
                            <td className="px-4 py-3 align-top text-gray-600 dark:text-gray-400">
                              {formatAssetType(holding.asset_type)}
                            </td>

                            {/* Qty — editable */}
                            <td className="px-4 py-3 align-top text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                  className="w-24 text-right px-2 py-1 text-sm bg-white dark:bg-[#0F172A] border border-blue-400 dark:border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Qty"
                                />
                              ) : (
                                <span className="text-gray-900 dark:text-white">
                                  {holding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                                </span>
                              )}
                            </td>

                            {/* Avg Price — editable */}
                            <td className="px-4 py-3 align-top text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-24 text-right px-2 py-1 text-sm bg-white dark:bg-[#0F172A] border border-blue-400 dark:border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Price"
                                />
                              ) : (
                                <span className="text-gray-900 dark:text-white">
                                  ₹{holding.average_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            {/* Invested */}
                            <td className="px-4 py-3 align-top text-right font-medium text-gray-900 dark:text-white">
                              {isEditing
                                ? formatCurrency((parseFloat(editQty) || 0) * (parseFloat(editPrice) || 0))
                                : formatCurrency(holding.invested_value)}
                            </td>

                            {/* Action — context-aware buttons */}
                            <td className="px-4 py-3 align-top">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={saveEditRow}
                                    className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                    aria-label="Save edits"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditRow}
                                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    aria-label="Cancel edit"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : skipped ? (
                                <button
                                  onClick={() => toggleRowSkip(originalIndex)}
                                  className="px-2.5 py-1 text-xs font-medium border border-gray-300 dark:border-[#334155] text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-[#334155]"
                                  aria-label="Include this row in import"
                                >
                                  Include
                                </button>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => startEditRow(originalIndex, holding.quantity, holding.average_price)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                    aria-label="Edit quantity and price"
                                    title="Edit quantity and price"
                                  >
                                    <EditIcon className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => toggleRowSkip(originalIndex)}
                                    className="px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded"
                                    aria-label="Skip this row"
                                    title="Don't import this row"
                                  >
                                    Skip
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Helper hint below the table */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-[#0F172A]/40 border-t border-gray-100 dark:border-[#334155] text-xs text-gray-600 dark:text-gray-400">
                  💡 Use <strong>Edit</strong> to fix missing quantity/price, or <strong>Skip</strong> to exclude rows you don&apos;t want to import.
                </div>
              </div>

              {/* Duplicate handling note */}
              <div className="bg-gray-50 dark:bg-[#0F172A]/50 rounded-xl p-4 border border-gray-100 dark:border-[#334155]">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">How we handle duplicates</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      If you upload the same investment again, we'll update the existing holding instead of creating a duplicate.
                      Assets are matched by ISIN first, then by Symbol.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#334155]">
                <button
                  onClick={() => {
                    setStep('upload');
                    setPreview(null);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                >
                  ← Choose different file
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Confirm Import
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {includedHoldings.length > 0
                  ? `Importing ${includedHoldings.length} holding${includedHoldings.length !== 1 ? 's' : ''}...`
                  : 'Importing your portfolio...'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {IMPORT_STATUS_MESSAGES[importStatusIndex]}
              </p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && result && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Portfolio updated successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {result.holdingsCreated > 0 && `${result.holdingsCreated} new investment${result.holdingsCreated !== 1 ? 's' : ''} added`}
                {result.holdingsCreated > 0 && result.holdingsUpdated > 0 && ' • '}
                {result.holdingsUpdated > 0 && `${result.holdingsUpdated} existing updated`}
              </p>

              {/* Portfolio Insights hint */}
              <div className="inline-flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 text-left max-w-md mx-auto mb-8">
                <SparklesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300 text-sm">Portfolio insights are ready</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400/80 mt-1">
                    You can now ask questions about your portfolio and get personalized insights.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Step 6: Error — structured, actionable guidance */}
          {step === 'error' && (
            <div className="py-6">
              {/* Icon + title */}
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangleIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {errorCode === 'empty_headers' ? 'Column headers not found' :
                   errorCode === 'size_error' ? 'File is too large' :
                   errorCode === 'type_error' ? 'Unsupported file type' :
                   errorCode === 'file_error' ? 'Could not read file' :
                   errorCode === 'capital_gains_report' ? 'This is a transaction report, not a holdings file' :
                   errorCode === 'all_zero_values' ? 'No quantity or price found' :
                   'File format not recognised'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  {error || 'We couldn\'t process your file. Check the format guide below and try again.'}
                </p>
              </div>

              {/* Where to download the RIGHT file — shown for wrong-file-type errors */}
              {(errorCode === 'capital_gains_report' || errorCode === 'all_zero_values') && (
                <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-blue-200 dark:border-blue-800/40">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                      Where to find your holdings file
                    </p>
                  </div>
                  <div className="divide-y divide-blue-100 dark:divide-blue-800/30">
                    <div className="px-3 py-2 flex items-start gap-2.5">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">CAS</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Email from NSDL/CDSL — request at <code className="text-[11px]">nsdl.co.in</code> or <code className="text-[11px]">cdslindia.com</code>
                      </p>
                    </div>
                    <div className="px-3 py-2 flex items-start gap-2.5">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">Zerodha</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Console → <strong>Holdings</strong> → Download CSV (not the Tax P&amp;L report)
                      </p>
                    </div>
                    <div className="px-3 py-2 flex items-start gap-2.5">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">Groww</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        My Investments → <strong>Download Statement</strong> → choose &ldquo;Holdings&rdquo;
                      </p>
                    </div>
                    <div className="px-3 py-2 flex items-start gap-2.5">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">Kuvera</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        My Investments → <strong>Export CSV</strong>
                      </p>
                    </div>
                    <div className="px-3 py-2 flex items-start gap-2.5">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">Other</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Look for &ldquo;Holdings&rdquo;, &ldquo;Portfolio Statement&rdquo;, or &ldquo;Current Investments&rdquo; — avoid &ldquo;Capital Gains&rdquo;, &ldquo;Tax P&amp;L&rdquo;, or transaction reports.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detected headers — shown when we have them */}
              {detectedHeaders.length > 0 && (
                <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    What we found in your file&apos;s first row
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedHeaders.slice(0, 16).map((h, i) => (
                      <span
                        key={i}
                        className={`inline-block text-xs px-2 py-0.5 rounded font-mono ${
                          h.startsWith('__EMPTY') || h.trim() === ''
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {h.startsWith('__EMPTY') ? '(empty)' : h}
                      </span>
                    ))}
                    {detectedHeaders.length > 16 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                        +{detectedHeaders.length - 16} more
                      </span>
                    )}
                  </div>
                  {errorCode === 'empty_headers' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                      <span className="mt-0.5">⚠️</span>
                      <span>Row 1 looks like account/personal details, not column headers. Open the file, delete rows above the column names, and re-save as CSV.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Expected format guide — only for header / format errors, not for wrong-file-type errors */}
              {(errorCode === 'empty_headers' || errorCode === 'ambiguous_types' || errorCode === 'all_zero_values' || !errorCode) && (
                <div className="mb-5 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Expected CSV column headers
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {/* Mutual Funds */}
                    <div className="px-3 py-2.5 flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">💰</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Mutual Funds</p>
                        <div className="flex flex-wrap gap-1">
                          {['Scheme Name', 'Units / Quantity', 'Invested Amount', 'ISIN (optional)'].map(col => (
                            <code key={col} className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {col}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Stocks */}
                    <div className="px-3 py-2.5 flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">📈</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Stocks / Shares</p>
                        <div className="flex flex-wrap gap-1">
                          {['Stock Name or Symbol', 'Quantity', 'Average Buy Price', 'ISIN (optional)'].map(col => (
                            <code key={col} className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {col}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* ETFs */}
                    <div className="px-3 py-2.5 flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">📊</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">ETFs</p>
                        <div className="flex flex-wrap gap-1">
                          {['ETF Name (include "ETF")', 'Quantity', 'Average Buy Price'].map(col => (
                            <code key={col} className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {col}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Fixed Deposits */}
                    <div className="px-3 py-2.5 flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">🏦</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Fixed Deposits / RDs</p>
                        <div className="flex flex-wrap gap-1">
                          {['Bank Name', 'Invested Amount', 'Interest Rate', 'Maturity Date'].map(col => (
                            <code key={col} className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {col}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/40">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💡 <strong>Tip:</strong> Row 1 must be the column header row. Delete any title rows, account summary rows, or blank rows above the headers before uploading.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setStep('upload');
                    setError(null);
                    setErrorCode(null);
                    setDetectedHeaders([]);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
                >
                  <RefreshIcon className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(PortfolioUploadModalInner);
