/**
 * Real Estate Export Module
 * 
 * Provides advisor-ready export functionality for Real Estate portfolio.
 * Supports CSV and PDF formats.
 * 
 * Read-only exports - no editing, no schema changes.
 */

import type { RealEstateDashboardData } from '@/types/realEstateDashboard.types';
import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';
import type { RealEstatePropertyAlert } from '@/types/realEstatePropertyAlerts.types';
import type { SellVsHoldResult } from '@/types/realEstateSellHold.types';

// ============================================================================
// EXPORT DATA TYPES
// ============================================================================

export interface PortfolioExportRow {
  propertyName: string;
  city: string;
  propertyType: string;
  currentValue: number | null;
  loanOutstanding: number | null;
  netWorth: number | null;
  rentalYield: number | null;
  cashFlowStatus: string;
  ownershipPercentage: number;
}

export interface PropertyDetailExportData {
  // Basic Info
  propertyName: string;
  city: string;
  propertyType: string;
  ownershipPercentage: number;
  
  // KPIs
  currentEstimatedValue: number | null;
  unrealizedGain: number | null;
  xirr: number | null;
  netRentalYield: number | null;
  emiRentGap: number | null;
  
  // Performance
  purchasePrice: number | null;
  purchaseDate: string | null;
  holdingPeriodYears: number | null;
  
  // Loan Details
  lenderName: string | null;
  loanAmount: number | null;
  interestRate: number | null;
  emi: number | null;
  outstandingBalance: number | null;
  tenureMonths: number | null;
  
  // Cash Flow
  monthlyRent: number | null;
  monthlyEmi: number | null;
  monthlyExpenses: number | null;
  netMonthlyCashFlow: number | null;
  escalationPercent: number | null;
  
  // Property Details
  address: string | null;
  state: string | null;
  pincode: string | null;
  carpetAreaSqft: number | null;
  builtupAreaSqft: number | null;
  reraNumber: string | null;
  builderName: string | null;
  projectName: string | null;
  
  // Alerts
  alerts: RealEstatePropertyAlert[];
  
  // Sell vs Hold (optional)
  sellVsHold?: SellVsHoldResult | null;
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Format number for CSV (no currency symbols, raw number)
 */
function formatNumberForCSV(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return value.toFixed(2);
}

/**
 * Format percentage for CSV
 */
function formatPercentForCSV(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return value.toFixed(2) + '%';
}

/**
 * Export Real Estate Portfolio to CSV
 * 
 * @param dashboardData - Dashboard data from analytics
 * @param loanOutstandingMap - Optional map of propertyId -> loan outstanding balance
 */
export function exportRealEstatePortfolioToCSV(
  dashboardData: RealEstateDashboardData,
  loanOutstandingMap?: Map<string, number>
): string {
  const rows: PortfolioExportRow[] = dashboardData.properties.map((property) => {
    // Get loan outstanding from map if available
    const loanOutstanding = loanOutstandingMap?.get(property.propertyId) ?? null;
    
    // Calculate net worth (current value - loan outstanding)
    const netWorth =
      property.estimatedValue !== null && loanOutstanding !== null
        ? property.estimatedValue - loanOutstanding
        : property.estimatedValue;
    
    // Determine cash flow status
    let cashFlowStatus = 'N/A';
    if (property.emiRentGap !== null) {
      if (property.emiRentGap > 0) {
        cashFlowStatus = 'Positive';
      } else if (property.emiRentGap < 0) {
        cashFlowStatus = 'Negative';
      } else {
        cashFlowStatus = 'Neutral';
      }
    } else if (property.rentalStatus === 'self_occupied') {
      cashFlowStatus = 'Self Occupied';
    } else if (property.rentalStatus === 'vacant') {
      cashFlowStatus = 'Vacant';
    }
    
    return {
      propertyName: property.propertyName,
      city: property.city,
      propertyType: property.propertyType,
      currentValue: property.estimatedValue,
      loanOutstanding,
      netWorth,
      rentalYield: property.netRentalYield,
      cashFlowStatus,
      ownershipPercentage: 100, // Default, should be from asset data if available
    };
  });
  
  // CSV Header
  const headers = [
    'Property Name',
    'City',
    'Property Type',
    'Current Value (₹)',
    'Loan Outstanding (₹)',
    'Net Worth (₹)',
    'Rental Yield (%)',
    'Cash Flow Status',
    'Ownership %',
  ];
  
  // CSV Rows
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      [
        `"${row.propertyName}"`,
        `"${row.city}"`,
        `"${row.propertyType}"`,
        formatNumberForCSV(row.currentValue),
        formatNumberForCSV(row.loanOutstanding),
        formatNumberForCSV(row.netWorth),
        formatPercentForCSV(row.rentalYield),
        `"${row.cashFlowStatus}"`,
        formatPercentForCSV(row.ownershipPercentage),
      ].join(',')
    ),
  ];
  
  return csvRows.join('\n');
}

/**
 * Export Real Estate Portfolio Summary
 * 
 * @param dashboardData - Dashboard data from analytics
 * @param format - Export format ('csv' | 'pdf')
 * @param loanOutstandingMap - Optional map of propertyId -> loan outstanding balance
 */
export async function exportRealEstatePortfolio(
  dashboardData: RealEstateDashboardData,
  format: 'csv' | 'pdf' = 'csv',
  loanOutstandingMap?: Map<string, number>
): Promise<void> {
  if (format === 'csv') {
    const csv = exportRealEstatePortfolioToCSV(dashboardData, loanOutstandingMap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Real_Estate_Portfolio_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === 'pdf') {
    await exportRealEstatePortfolioToPDF(dashboardData, loanOutstandingMap);
  }
}

// ============================================================================
// PROPERTY DETAIL EXPORT
// ============================================================================

/**
 * Export Single Property Detail to CSV
 */
export function exportPropertyDetailToCSV(
  propertyData: RealEstatePropertyDetailData,
  alerts: RealEstatePropertyAlert[] = [],
  sellVsHold?: SellVsHoldResult | null
): string {
  const rows: string[][] = [];
  
  // Basic Info Section
  rows.push(['PROPERTY INFORMATION', '']);
  rows.push(['Property Name', propertyData.propertyName]);
  rows.push(['City', propertyData.city]);
  rows.push(['Property Type', propertyData.propertyType]);
  rows.push(['Ownership %', formatPercentForCSV(propertyData.ownershipPercentage)]);
  rows.push(['']);
  
  // KPI Section
  rows.push(['KEY PERFORMANCE INDICATORS', '']);
  rows.push(['Current Estimated Value (₹)', formatNumberForCSV(propertyData.currentEstimatedValue)]);
  rows.push(['Unrealized Gain/Loss (₹)', formatNumberForCSV(propertyData.unrealizedGain)]);
  rows.push(['XIRR (%)', formatPercentForCSV(propertyData.xirr)]);
  rows.push(['Net Rental Yield (%)', formatPercentForCSV(propertyData.netRentalYield)]);
  rows.push(['EMI vs Rent Gap (₹)', formatNumberForCSV(propertyData.emiRentGap)]);
  rows.push(['']);
  
  // Performance Section
  rows.push(['PERFORMANCE', '']);
  rows.push(['Purchase Price (₹)', formatNumberForCSV(propertyData.purchasePrice)]);
  rows.push(['Purchase Date', propertyData.purchaseDate || '']);
  rows.push(['Holding Period (Years)', formatNumberForCSV(propertyData.holdingPeriodYears)]);
  rows.push(['']);
  
  // Loan Section
  rows.push(['LOAN DETAILS', '']);
  rows.push(['Lender Name', propertyData.lenderName || '']);
  rows.push(['Loan Amount (₹)', formatNumberForCSV(propertyData.loanAmount)]);
  rows.push(['Interest Rate (%)', formatPercentForCSV(propertyData.interestRate)]);
  rows.push(['EMI (₹)', formatNumberForCSV(propertyData.emi)]);
  rows.push(['Outstanding Balance (₹)', formatNumberForCSV(propertyData.outstandingBalance)]);
  rows.push(['Tenure (Months)', propertyData.tenureMonths?.toString() || '']);
  rows.push(['']);
  
  // Cash Flow Section
  rows.push(['CASH FLOW', '']);
  rows.push(['Monthly Rent (₹)', formatNumberForCSV(propertyData.monthlyRent)]);
  rows.push(['Monthly EMI (₹)', formatNumberForCSV(propertyData.monthlyEmi)]);
  rows.push(['Monthly Expenses (₹)', formatNumberForCSV(propertyData.monthlyExpenses)]);
  rows.push(['Net Monthly Cash Flow (₹)', formatNumberForCSV(propertyData.netMonthlyCashFlow)]);
  rows.push(['Rent Escalation (%)', formatPercentForCSV(propertyData.escalationPercent)]);
  rows.push(['']);
  
  // Property Details Section
  rows.push(['PROPERTY DETAILS', '']);
  rows.push(['Address', propertyData.address || '']);
  rows.push(['State', propertyData.state || '']);
  rows.push(['Pincode', propertyData.pincode || '']);
  rows.push(['Carpet Area (sqft)', formatNumberForCSV(propertyData.carpetAreaSqft)]);
  rows.push(['Built-up Area (sqft)', formatNumberForCSV(propertyData.builtupAreaSqft)]);
  rows.push(['RERA Number', propertyData.reraNumber || '']);
  rows.push(['Builder Name', propertyData.builderName || '']);
  rows.push(['Project Name', propertyData.projectName || '']);
  rows.push(['']);
  
  // Alerts Section
  if (alerts.length > 0) {
    rows.push(['ALERTS & INSIGHTS', '']);
    alerts.forEach((alert) => {
      rows.push([`${alert.severity.toUpperCase()}: ${alert.title}`, alert.description]);
    });
    rows.push(['']);
  }
  
  // Sell vs Hold Section (if available)
  if (sellVsHold) {
    rows.push(['SELL VS HOLD SIMULATION', '']);
    rows.push(['Sell Today - Net Proceeds (₹)', formatNumberForCSV(sellVsHold.sellTodayNetProceeds)]);
    rows.push(['Hold Scenario - Years', sellVsHold.holdScenario.years.toString()]);
    rows.push(['Hold Scenario - Net Proceeds (₹)', formatNumberForCSV(sellVsHold.holdScenario.netProceeds)]);
    rows.push(['Hold Scenario - IRR (%)', formatPercentForCSV(sellVsHold.holdScenario.irr)]);
    rows.push(['Delta - Absolute (₹)', formatNumberForCSV(sellVsHold.delta.absoluteDifference)]);
    rows.push(['Delta - Percentage (%)', formatPercentForCSV(sellVsHold.delta.percentageDifference)]);
    rows.push(['Better Option', sellVsHold.delta.betterOption]);
    rows.push(['']);
  }
  
  // Convert to CSV string
  const csvRows = rows.map((row) =>
    row.map((cell) => `"${cell}"`).join(',')
  );
  
  return csvRows.join('\n');
}

/**
 * Export Single Property Detail
 * 
 * @param propertyData - Property detail data
 * @param alerts - Property alerts (optional)
 * @param sellVsHold - Sell vs Hold simulation result (optional)
 * @param format - Export format ('csv' | 'pdf')
 */
export async function exportRealEstateProperty(
  propertyData: RealEstatePropertyDetailData,
  alerts: RealEstatePropertyAlert[] = [],
  sellVsHold?: SellVsHoldResult | null,
  format: 'csv' | 'pdf' = 'csv'
): Promise<void> {
  if (format === 'csv') {
    const csv = exportPropertyDetailToCSV(propertyData, alerts, sellVsHold);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Property_${propertyData.propertyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === 'pdf') {
    await exportPropertyDetailToPDF(propertyData, alerts, sellVsHold);
  }
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export Real Estate Portfolio to PDF
 * 
 * @param dashboardData - Dashboard data from analytics
 * @param loanOutstandingMap - Optional map of propertyId -> loan outstanding balance
 */
async function exportRealEstatePortfolioToPDF(
  dashboardData: RealEstateDashboardData,
  loanOutstandingMap?: Map<string, number>
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;
  
  // Colors
  const primaryColor = [15, 23, 42];
  const secondaryColor = [71, 85, 105];
  const borderColor = [229, 231, 235];
  const headerBgColor = [249, 250, 251];
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Real Estate Portfolio Summary', margin, currentY);
  currentY += 10;
  
  // Summary Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Total Estimated Value: ₹${formatNumberForPDF(dashboardData.summary.totalEstimatedValue)}`,
    margin,
    currentY
  );
  currentY += 5;
  doc.text(
    `Net Real Estate Worth: ₹${formatNumberForPDF(dashboardData.summary.netRealEstateWorth)}`,
    margin,
    currentY
  );
  currentY += 5;
  if (dashboardData.summary.averageNetRentalYield !== null) {
    doc.text(
      `Average Rental Yield: ${dashboardData.summary.averageNetRentalYield.toFixed(2)}%`,
      margin,
      currentY
    );
    currentY += 5;
  }
  currentY += 5;
  
  // Table Header
  const colWidths = [50, 30, 25, 30, 30, 30, 25, 30];
  const headers = [
    'Property',
    'City',
    'Type',
    'Value (₹)',
    'Loan (₹)',
    'Net Worth (₹)',
    'Yield (%)',
    'Cash Flow',
  ];
  
  let startX = margin;
  doc.setFillColor(...headerBgColor);
  doc.rect(startX, currentY, pageWidth - 2 * margin, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  
  headers.forEach((header, idx) => {
    doc.text(header, startX + 2, currentY + 5);
    startX += colWidths[idx];
  });
  
  currentY += 8;
  
  // Table Rows
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...primaryColor);
  
  dashboardData.properties.forEach((property) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = margin;
    }
    
    startX = margin;
    const loanOutstanding = loanOutstandingMap?.get(property.propertyId) ?? null;
    const netWorth =
      property.estimatedValue !== null && loanOutstanding !== null
        ? property.estimatedValue - loanOutstanding
        : property.estimatedValue;
    
    const rowData = [
      property.propertyName.substring(0, 20),
      property.city,
      property.propertyType,
      formatNumberForPDF(property.estimatedValue),
      loanOutstanding !== null ? formatNumberForPDF(loanOutstanding) : '—',
      netWorth !== null ? formatNumberForPDF(netWorth) : '—',
      property.netRentalYield !== null
        ? property.netRentalYield.toFixed(2) + '%'
        : '—',
      property.hasNegativeCashFlow ? 'Negative' : 'Positive',
    ];
    
    rowData.forEach((cell, idx) => {
      doc.text(cell, startX + 2, currentY + 4);
      startX += colWidths[idx];
    });
    
    currentY += 6;
  });
  
  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Generated by LensOnWealth • ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  
  // Save
  const filename = `Real_Estate_Portfolio_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export Property Detail to PDF
 */
async function exportPropertyDetailToPDF(
  propertyData: RealEstatePropertyDetailData,
  alerts: RealEstatePropertyAlert[] = [],
  sellVsHold?: SellVsHoldResult | null
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;
  
  // Colors
  const primaryColor = [15, 23, 42];
  const secondaryColor = [71, 85, 105];
  
  // Helper to format number
  const formatNum = (val: number | null) =>
    val !== null && !isNaN(val) ? formatNumberForPDF(val) : '—';
  const formatPct = (val: number | null) =>
    val !== null && !isNaN(val) ? val.toFixed(2) + '%' : '—';
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Property Detail Report', margin, currentY);
  currentY += 8;
  
  doc.setFontSize(14);
  doc.text(propertyData.propertyName, margin, currentY);
  currentY += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(`${propertyData.city} • ${propertyData.propertyType}`, margin, currentY);
  currentY += 10;
  
  // KPIs Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Key Performance Indicators', margin, currentY);
  currentY += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  
  const kpis = [
    ['Current Estimated Value', `₹${formatNum(propertyData.currentEstimatedValue)}`],
    ['Unrealized Gain/Loss', `₹${formatNum(propertyData.unrealizedGain)}`],
    ['XIRR', formatPct(propertyData.xirr)],
    ['Net Rental Yield', formatPct(propertyData.netRentalYield)],
    ['EMI vs Rent Gap', `₹${formatNum(propertyData.emiRentGap)}`],
  ];
  
  kpis.forEach(([label, value]) => {
    doc.text(label + ':', margin, currentY);
    doc.setTextColor(...primaryColor);
    doc.text(value, margin + 60, currentY);
    doc.setTextColor(...secondaryColor);
    currentY += 5;
  });
  
  currentY += 5;
  
  // Loan Details (if exists)
  if (propertyData.lenderName) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Loan Details', margin, currentY);
    currentY += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    
    const loanDetails = [
      ['Lender', propertyData.lenderName],
      ['Loan Amount', `₹${formatNum(propertyData.loanAmount)}`],
      ['Interest Rate', formatPct(propertyData.interestRate)],
      ['EMI', `₹${formatNum(propertyData.emi)}`],
      ['Outstanding Balance', `₹${formatNum(propertyData.outstandingBalance)}`],
      ['Tenure', propertyData.tenureMonths ? `${propertyData.tenureMonths} months` : '—'],
    ];
    
    loanDetails.forEach(([label, value]) => {
      doc.text(label + ':', margin, currentY);
      doc.setTextColor(...primaryColor);
      doc.text(value, margin + 60, currentY);
      doc.setTextColor(...secondaryColor);
      currentY += 5;
    });
    
    currentY += 5;
  }
  
  // Cash Flow (if exists)
  if (propertyData.monthlyRent !== null || propertyData.monthlyEmi !== null) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Cash Flow', margin, currentY);
    currentY += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    
    const cashFlow = [
      ['Monthly Rent', `₹${formatNum(propertyData.monthlyRent)}`],
      ['Monthly EMI', `₹${formatNum(propertyData.monthlyEmi)}`],
      ['Monthly Expenses', `₹${formatNum(propertyData.monthlyExpenses)}`],
      ['Net Monthly Cash Flow', `₹${formatNum(propertyData.netMonthlyCashFlow)}`],
    ];
    
    cashFlow.forEach(([label, value]) => {
      doc.text(label + ':', margin, currentY);
      doc.setTextColor(...primaryColor);
      doc.text(value, margin + 60, currentY);
      doc.setTextColor(...secondaryColor);
      currentY += 5;
    });
    
    currentY += 5;
  }
  
  // Alerts (if any)
  if (alerts.length > 0) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Alerts & Insights', margin, currentY);
    currentY += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    alerts.forEach((alert) => {
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${alert.severity.toUpperCase()}: ${alert.title}`, margin, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(alert.description, margin + 5, currentY, { maxWidth: pageWidth - 2 * margin - 10 });
      currentY += 6;
    });
    
    currentY += 5;
  }
  
  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Generated by LensOnWealth • ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  
  // Save
  const filename = `Property_${propertyData.propertyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Format number for PDF (Indian numbering system)
 */
function formatNumberForPDF(num: number | null, decimals: number = 0): string {
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
    return decimals > 0 && decimalPart
      ? `${sign}${integerPart}.${decimalPart}`
      : `${sign}${integerPart}`;
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
