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

import { useState, useRef, useCallback, useEffect } from 'react';
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

export default function PortfolioUploadModal({
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
  const [result, setResult] = useState<ConfirmUploadResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  const resetState = useCallback(() => {
    setStep('upload');
    setIsDragging(false);
    setIsUploading(false);
    setRawHeaders([]);
    setColumnMappings([]);
    setPreview(null);
    setError(null);
    setResult(null);
    setUploadedFile(null);
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

  const handleClose = () => {
    resetState();
    onClose();
  };

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
        setStep('error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Could not process your file. Please try again.');
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
   * Confirm and import the previewed holdings
   */
  const handleConfirm = async () => {
    if (!preview) return;

    setStep('importing');

    try {
      const response = await fetch('/api/portfolio/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          holdings: preview.holdings,
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
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <UploadIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Upload Portfolio</h2>
              <p className="text-sm text-gray-500">
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
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        {['upload', 'mapping', 'preview'].includes(step) && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {['upload', 'mapping', 'preview'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${step === s ? 'bg-emerald-600 text-white' : 
                      ['upload', 'mapping', 'preview'].indexOf(step) > i ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-gray-200 text-gray-500'}
                  `}>
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm ${step === s ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : 'Preview'}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-gray-300 mx-3" />}
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
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
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
                    <div className="w-12 h-12 mx-auto border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-gray-600">Processing your file...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <UploadIcon className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {isDragging ? 'Drop your file here' : 'Drag & drop your file'}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
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
                    <p className="text-xs text-gray-400 mt-4">
                      Supports CSV, XLS, XLSX • Max 5MB
                    </p>
                  </>
                )}
              </div>

              {/* Help text */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-medium text-gray-900">Intelligent column detection</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Our system automatically detects columns from any broker export. We identify:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                    <span>Symbol / ISIN</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                    <span>Quantity / Units</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                    <span>Buy / Average Price</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                    <span>Asset Type</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <strong>Note:</strong> We ignore calculated columns like Current Value, P&L, and Returns. 
                    We compute these ourselves from quantity × price.
                  </p>
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-800 text-sm">Your data is secure</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Files are processed in memory and never stored. We only save the investment data you approve.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 text-sm">Review column mappings</p>
                    <p className="text-sm text-blue-700 mt-1">
                      We've auto-detected your columns. Please verify and adjust if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Column mapping table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Your Column</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Maps To</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Confidence</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {columnMappings.map((mapping, index) => (
                      <tr 
                        key={mapping.header}
                        className={mapping.isIgnored ? 'bg-gray-50' : 'bg-white'}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-medium ${mapping.isIgnored ? 'text-gray-400' : 'text-gray-900'}`}>
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
                                ? 'border-gray-200 bg-gray-100 text-gray-500' 
                                : 'border-gray-200 bg-white text-gray-900'}
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
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                              Ignored
                            </span>
                          ) : (
                            <span className={`
                              inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                              ${mapping.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                mapping.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                mapping.confidence === 'manual' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'}
                            `}>
                              {mapping.confidence === 'high' ? 'High' :
                               mapping.confidence === 'medium' ? 'Medium' :
                               mapping.confidence === 'manual' ? 'Manual' : 'Low'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-32">
                          {mapping.ignoreReason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ignored columns explanation */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 text-sm">Why some columns are ignored</p>
                    <p className="text-sm text-amber-700 mt-1">
                      We don't import calculated values like Current Value, P&L, or Returns. 
                      We compute these ourselves to ensure accuracy and consistency.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
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
              {/* Summary */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800">
                    Ready to import {preview.summary.validRows} investment{preview.summary.validRows !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-emerald-600">Total Invested</p>
                    <p className="font-semibold text-emerald-900">
                      {formatCurrency(preview.summary.totalInvestedValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-600">Valid Rows</p>
                    <p className="font-semibold text-emerald-900">{preview.summary.validRows}</p>
                  </div>
                  {preview.summary.skippedRows > 0 && (
                    <div>
                      <p className="text-amber-600">Skipped</p>
                      <p className="font-semibold text-amber-700">{preview.summary.skippedRows}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detected Columns - Show what was auto-mapped */}
              {preview.detectedColumns && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <SparklesIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 text-sm mb-2">Auto-detected columns</p>
                      <div className="flex flex-wrap gap-2">
                        {preview.detectedColumns.name && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                            Name: <span className="font-medium">{preview.detectedColumns.name}</span>
                          </span>
                        )}
                        {preview.detectedColumns.symbol && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                            Symbol: <span className="font-medium">{preview.detectedColumns.symbol}</span>
                          </span>
                        )}
                        {preview.detectedColumns.isin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                            ISIN: <span className="font-medium">{preview.detectedColumns.isin}</span>
                          </span>
                        )}
                        {preview.detectedColumns.quantity && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                            Qty: <span className="font-medium">{preview.detectedColumns.quantity}</span>
                          </span>
                        )}
                        {preview.detectedColumns.average_price && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                            Price: <span className="font-medium">{preview.detectedColumns.average_price}</span>
                          </span>
                        )}
                        {/* Show that Value is computed */}
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded text-xs text-emerald-700">
                          Value: <span className="font-medium">Qty × Price</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 text-sm">Please note</p>
                      <ul className="mt-1 space-y-1">
                        {preview.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-amber-700">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Price</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Invested</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.holdings.map((holding, index) => (
                        <tr 
                          key={index}
                          className={holding.isValid ? 'bg-white' : 'bg-amber-50/50'}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-48">
                                {holding.name}
                              </p>
                              {(holding.symbol || holding.isin) && (
                                <p className="text-xs text-gray-500">
                                  {holding.symbol || holding.isin}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatAssetType(holding.asset_type)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {holding.quantity.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            ₹{holding.average_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(holding.invested_value)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {holding.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                                <CheckCircleIcon className="w-3 h-3" />
                                Ready
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs"
                                title={holding.validationNote}
                              >
                                <AlertTriangleIcon className="w-3 h-3" />
                                Skip
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate handling note */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700 text-sm">How we handle duplicates</p>
                    <p className="text-sm text-gray-600 mt-1">
                      If you upload the same investment again, we'll update the existing holding instead of creating a duplicate.
                      Assets are matched by ISIN first, then by Symbol.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setStep('upload');
                    setPreview(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
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
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Importing your portfolio...
              </p>
              <p className="text-sm text-gray-500">
                This will only take a moment
              </p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && result && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Portfolio updated successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                {result.holdingsCreated > 0 && `${result.holdingsCreated} new investment${result.holdingsCreated !== 1 ? 's' : ''} added`}
                {result.holdingsCreated > 0 && result.holdingsUpdated > 0 && ' • '}
                {result.holdingsUpdated > 0 && `${result.holdingsUpdated} existing updated`}
              </p>

              {/* Portfolio Insights hint */}
              <div className="inline-flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-left max-w-md mx-auto mb-8">
                <SparklesIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-800 text-sm">Portfolio insights are ready</p>
                  <p className="text-sm text-emerald-700 mt-1">
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

          {/* Step 6: Error */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangleIcon className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Something didn't work
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {error || 'We couldn\'t process your file. Please check the format and try again.'}
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setStep('upload');
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
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
