/**
 * Generic PDF Generation Utility for All Holdings Types
 * 
 * Generates nicely formatted PDFs for different types of holdings
 * 
 * Note: Uses dynamic import for client-side only execution
 */

// Helper function to format numbers with Indian numbering system for PDF
function formatNumberForPDF(num: number, decimals: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  const numValue = typeof num === 'number' ? num : parseFloat(String(num));
  if (isNaN(numValue)) {
    return '0';
  }
  
  const absNum = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  const fixed = absNum.toFixed(decimals);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  const len = integerPart.length;
  
  if (len <= 3) {
    return decimals > 0 && decimalPart ? `${sign}${integerPart}.${decimalPart}` : `${sign}${integerPart}`;
  }
  
  let result = integerPart.slice(-3);
  for (let i = len - 3; i > 0; i -= 2) {
    const start = Math.max(0, i - 2);
    const chunk = integerPart.slice(start, i);
    result = chunk + ',' + result;
  }
  
  if (decimals > 0 && decimalPart) {
    result = result + '.' + decimalPart;
  }
  
  return sign + result;
}

// Generic PDF generation function
async function generatePDFInternal({
  title,
  holdings,
  columns,
  totalValue,
  totalInvested,
  portfolioPercentage,
  dateLabel,
  dateValue,
}: {
  title: string;
  holdings: any[];
  columns: Array<{
    key: string;
    label: string;
    width: number;
    align?: 'left' | 'right';
    formatter?: (value: any, holding: any) => string;
  }>;
  totalValue: number;
  totalInvested: number;
  portfolioPercentage: number;
  dateLabel?: string;
  dateValue?: string | null;
}): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const startX = margin;
  let currentY = margin;

  // Colors
  const primaryColor = [15, 23, 42];
  const secondaryColor = [71, 85, 105];
  const successColor = [16, 163, 74];
  const dangerColor = [220, 38, 38];
  const borderColor = [229, 231, 235];
  const headerBgColor = [249, 250, 251];

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(title, startX, currentY);
  currentY += 10;

  // Date and summary
  if (dateLabel && dateValue) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    const dateText = dateValue
      ? `${dateLabel} ${new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    doc.text(dateText, startX, currentY);
    currentY += 6;
  }

  // Summary stats
  doc.setFontSize(9);
  const summaryText = `${holdings.length} holdings • Total Value: Rs.${formatNumberForPDF(totalValue, 0)} • ${portfolioPercentage.toFixed(1)}% of portfolio`;
  doc.text(summaryText, startX, currentY);
  currentY += 10;

  // Table setup
  const tableStartX = startX;
  const tableStartY = currentY;
  const rowHeight = 9;
  const headerHeight = 10;
  const cellPadding = 5;
  const headerVerticalPadding = 6.5;
  const rowVerticalCenter = 4.5;

  // Calculate column positions
  const colX: Record<string, number> = {};
  let currentX = tableStartX;
  columns.forEach((col) => {
    colX[col.key] = currentX;
    currentX += col.width;
  });

  const rightAlignX = (key: string) => colX[key] + columns.find(c => c.key === key)!.width - cellPadding;

  // Table header
  doc.setFillColor(...headerBgColor);
  doc.rect(tableStartX, tableStartY, pageWidth - 2 * margin, headerHeight, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  const headerY = tableStartY + headerVerticalPadding;

  columns.forEach((col) => {
    const x = col.align === 'right' ? rightAlignX(col.key) : colX[col.key] + cellPadding;
    doc.text(col.label.toUpperCase(), x, headerY, col.align === 'right' ? { align: 'right' } : {});
  });

  currentY = tableStartY + headerHeight;

  // Table rows
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  for (const holding of holdings) {
    if (currentY + rowHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      
      // Redraw header
      doc.setFillColor(...headerBgColor);
      doc.rect(tableStartX, currentY, pageWidth - 2 * margin, headerHeight, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...secondaryColor);
      const newHeaderY = currentY + headerVerticalPadding;
      columns.forEach((col) => {
        const x = col.align === 'right' ? rightAlignX(col.key) : colX[col.key] + cellPadding;
        doc.text(col.label.toUpperCase(), x, newHeaderY, col.align === 'right' ? { align: 'right' } : {});
      });
      currentY += headerHeight;
    }

    // Draw row border
    doc.setDrawColor(...borderColor);
    doc.line(tableStartX, currentY, pageWidth - margin, currentY);

    const dataY = currentY + rowVerticalCenter;

    columns.forEach((col) => {
      const value = holding[col.key];
      const formatted = col.formatter ? col.formatter(value, holding) : String(value || '');
      const x = col.align === 'right' ? rightAlignX(col.key) : colX[col.key] + cellPadding;
      
      // Color coding for P&L columns
      if (col.key.includes('gainLoss') || col.key.includes('pl')) {
        const isPositive = typeof value === 'number' && value >= 0;
        doc.setTextColor(...(isPositive ? successColor : dangerColor));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        
        // For P&L, show amount on top line and percentage below
        const plAmount = formatted;
        const plPercent = holding.gainLossPercent !== undefined && holding.gainLossPercent !== null
          ? `(${holding.gainLossPercent >= 0 ? '+' : ''}${holding.gainLossPercent.toFixed(2)}%)`
          : '';
        
        if (plPercent) {
          doc.text(plAmount, x, dataY - 1, col.align === 'right' ? { align: 'right' } : {});
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(plPercent, x, dataY + 1.5, col.align === 'right' ? { align: 'right' } : {});
        } else {
          doc.text(plAmount, x, dataY, col.align === 'right' ? { align: 'right' } : {});
        }
      } else {
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(formatted, x, dataY, col.align === 'right' ? { align: 'right' } : {});
      }
    });

    currentY += rowHeight;
  }

  // Footer totals
  currentY += 2;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(tableStartX, currentY, pageWidth - margin, currentY);
  currentY += 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL', colX[columns[0].key] + cellPadding, currentY);

  // Find and display total invested and total value columns
  const investedCol = columns.find(c => c.key.includes('invested'));
  const valueCol = columns.find(c => c.key.includes('currentValue') || c.key.includes('value'));
  
  if (investedCol) {
    const totalInvestedStr = 'Rs. ' + formatNumberForPDF(totalInvested, 0);
    doc.text(totalInvestedStr, rightAlignX(investedCol.key), currentY, { align: 'right' });
  }

  if (valueCol) {
    const totalValueStr = 'Rs. ' + formatNumberForPDF(totalValue, 0);
    doc.text(totalValueStr, rightAlignX(valueCol.key), currentY, { align: 'right' });
  }

  // Footer text
  const footerTextY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Generated by LensOnWealth • ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2,
    footerTextY,
    { align: 'center' }
  );

  // Generate filename
  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Save PDF with error handling
  try {
    doc.save(filename);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes('Could not establish connection') && !errorMsg.includes('Receiving end does not exist')) {
      throw error;
    }
    console.warn('[PDF] Browser extension interference detected, but PDF was generated successfully');
  }
}

// Mutual Funds PDF - Updated to match required format: SCHEME NAME, UNITS, INVESTED VALUE, CURRENT VALUE, XIRR, P&L
export async function generateMutualFundsPDF({
  holdings,
  totalValue,
  totalInvested,
  portfolioPercentage,
  navDate,
  formatCurrency,
}: {
  holdings: Array<{
    name: string;
    amc: string;
    category: string;
    units: number;
    avgBuyNav: number;
    latestNav: number;
    investedValue: number;
    currentValue: number;
    xirr: number | null;
    gainLoss: number;
    gainLossPercent: number;
  }>;
  totalValue: number;
  totalInvested: number;
  portfolioPercentage: number;
  navDate?: string | null;
  formatCurrency: (value: number) => string;
}): Promise<void> {
  return generatePDFInternal({
    title: 'Mutual Funds Holdings Report',
    holdings,
    columns: [
      { key: 'name', label: 'SCHEME NAME', width: 75, align: 'left' }, // Wider for scheme names
      { key: 'units', label: 'UNITS', width: 32, align: 'right', formatter: (v) => formatNumberForPDF(v, 4) },
      { key: 'investedValue', label: 'INVESTED VALUE', width: 40, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'currentValue', label: 'CURRENT VALUE', width: 40, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'xirr', label: 'XIRR', width: 30, align: 'right', formatter: (v) => v !== null ? `${v.toFixed(2)}%` : 'N/A' },
      { key: 'gainLoss', label: 'P&L', width: 40, align: 'right', formatter: (v) => {
        const sign = v >= 0 ? '+' : '-';
        return 'Rs. ' + sign + formatNumberForPDF(Math.abs(v), 0);
      }},
    ],
    totalValue,
    totalInvested,
    portfolioPercentage,
    dateLabel: 'NAV as of',
    dateValue: navDate,
  });
}

// ETFs PDF
export async function generateETFSPDF({
  holdings,
  totalValue,
  totalInvested,
  portfolioPercentage,
  priceDate,
  formatCurrency,
}: {
  holdings: Array<{
    name: string;
    symbol: string | null;
    category: string;
    units: number;
    averagePrice: number;
    currentNAV: number;
    investedValue: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercent: number;
  }>;
  totalValue: number;
  totalInvested: number;
  portfolioPercentage: number;
  priceDate?: string | null;
  formatCurrency: (value: number) => string;
}): Promise<void> {
  return generatePDFInternal({
    title: 'ETF Holdings Report',
    holdings,
    columns: [
      { key: 'name', label: 'ETF NAME', width: 55, align: 'left' },
      { key: 'category', label: 'CATEGORY', width: 28, align: 'left' },
      { key: 'units', label: 'UNITS', width: 24, align: 'right', formatter: (v) => formatNumberForPDF(v, 4) },
      { key: 'averagePrice', label: 'AVG PRICE', width: 28, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 2) },
      { key: 'currentNAV', label: 'CURRENT NAV', width: 28, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 2) },
      { key: 'investedValue', label: 'INVESTED', width: 32, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'currentValue', label: 'CURRENT VALUE', width: 32, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'gainLoss', label: 'P&L', width: 32, align: 'right', formatter: (v, h) => {
        const sign = v >= 0 ? '+' : '-';
        const percent = h.gainLossPercent || 0;
        return 'Rs. ' + sign + formatNumberForPDF(Math.abs(v), 0);
      }},
    ],
    totalValue,
    totalInvested,
    portfolioPercentage,
    dateLabel: 'Price as of',
    dateValue: priceDate,
  });
}

// Bonds PDF
export async function generateBondsPDF({
  holdings,
  totalValue,
  totalInvested,
  portfolioPercentage,
  formatCurrency,
}: {
  holdings: Array<{
    name: string;
    issuer: string | null;
    type: string;
    couponRate: number | null;
    maturityDate: string | null;
    faceValue: number;
    investedValue: number;
    currentValue: number;
    yield: number | null;
  }>;
  totalValue: number;
  totalInvested: number;
  portfolioPercentage: number;
  formatCurrency: (value: number) => string;
}): Promise<void> {
  return generatePDFInternal({
    title: 'Bonds Holdings Report',
    holdings,
    columns: [
      { key: 'name', label: 'BOND NAME', width: 50, align: 'left' },
      { key: 'type', label: 'TYPE', width: 28, align: 'left' },
      { key: 'couponRate', label: 'COUPON %', width: 24, align: 'right', formatter: (v) => v !== null ? `${v.toFixed(2)}%` : 'N/A' },
      { key: 'faceValue', label: 'FACE VALUE', width: 28, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'maturityDate', label: 'MATURITY', width: 32, align: 'left', formatter: (v) => v ? new Date(v).toLocaleDateString('en-IN') : 'N/A' },
      { key: 'investedValue', label: 'INVESTED', width: 32, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'currentValue', label: 'CURRENT VALUE', width: 32, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'yield', label: 'YIELD %', width: 24, align: 'right', formatter: (v) => v !== null ? `${v.toFixed(2)}%` : 'N/A' },
    ],
    totalValue,
    totalInvested,
    portfolioPercentage,
  });
}

// Fixed Deposits PDF
export async function generateFixedDepositsPDF({
  holdings,
  totalValue,
  totalPrincipal,
  portfolioPercentage,
  formatCurrency,
}: {
  holdings: Array<{
    bank: string;
    fdNumber: string;
    principal: number;
    rate: number;
    startDate: string;
    maturityDate: string;
    currentValue: number;
    daysLeft: number;
  }>;
  totalValue: number;
  totalPrincipal: number;
  portfolioPercentage: number;
  formatCurrency: (value: number) => string;
}): Promise<void> {
  return generatePDFInternal({
    title: 'Fixed Deposits Holdings Report',
    holdings,
    columns: [
      { key: 'bank', label: 'BANK', width: 40, align: 'left' },
      { key: 'fdNumber', label: 'FD NUMBER', width: 32, align: 'left' },
      { key: 'principal', label: 'PRINCIPAL', width: 28, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'rate', label: 'RATE %', width: 20, align: 'right', formatter: (v) => `${v.toFixed(2)}%` },
      { key: 'startDate', label: 'START DATE', width: 28, align: 'left', formatter: (v) => new Date(v).toLocaleDateString('en-IN') },
      { key: 'maturityDate', label: 'MATURITY DATE', width: 32, align: 'left', formatter: (v) => new Date(v).toLocaleDateString('en-IN') },
      { key: 'currentValue', label: 'CURRENT VALUE', width: 32, align: 'right', formatter: (v) => 'Rs. ' + formatNumberForPDF(v, 0) },
      { key: 'daysLeft', label: 'DAYS LEFT', width: 24, align: 'right', formatter: (v) => String(v) },
    ],
    totalValue,
    totalInvested: totalPrincipal,
    portfolioPercentage,
  });
}
