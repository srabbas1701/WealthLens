/**
 * Net Worth Statement PDF — Client-side generation
 *
 * Uses pre-computed totals and utilities. Does NOT recalculate values.
 * Data sources: caller provides assets (from /api/portfolio/data), liabilities (from localStorage).
 *
 * ASSUMPTIONS:
 * - assetsTotal = portfolio metrics net worth (sum of holdings, excludes insurance)
 * - liabilities from localStorage
 * - Timeline from generateNetWorthTimeline (12 months)
 * - Debt insights from liability-insights utilities
 */

import type { Liability } from '@/lib/liabilities-store';
import type { TimelinePoint } from '@/lib/net-worth-timeline';
import { calculateApproxInterestCost, getInterestPriorityTag } from '@/lib/liability-insights';

/** Format number for PDF (Indian style, no decimals for large amounts). */
function formatNum(num: number, decimals = 0): string {
  if (num == null || !Number.isFinite(num)) return '0';
  const fixed = Math.abs(num).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const len = int.length;
  if (len <= 3) return (num < 0 ? '-' : '') + fixed;
  let result = int.slice(-3);
  for (let i = len - 3; i > 0; i -= 2) {
    result = int.slice(Math.max(0, i - 2), i) + ',' + result;
  }
  return (num < 0 ? '-' : '') + result + (decimals > 0 && dec ? '.' + dec : '');
}

export interface NetWorthPDFInput {
  /** Total assets — from /api/portfolio/data metrics.netWorth (sum of holdings). */
  assetsTotal: number;
  /** Total liabilities — from getLiabilityTotals(liabilities).totalOutstanding. */
  liabilitiesTotal: number;
  /** Asset allocation by bucket — from portfolio.allocation. No individual holdings. */
  allocationBuckets: Array<{ name: string; value: number }>;
  /** Liabilities — from getLiabilities(userId) localStorage. */
  liabilities: Liability[];
  /** 12-month timeline — from generateNetWorthTimeline({ assetsTotal, liabilities, months: 12 }). */
  timeline: TimelinePoint[];
}

/**
 * Generates and downloads Net Worth Statement PDF.
 * Omit sections gracefully if data missing.
 */
export async function generateNetWorthStatementPDF(input: NetWorthPDFInput): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const primary = [15, 23, 42];
  const muted = [107, 114, 128];
  const border = [229, 231, 235];

  // ---- Title ----
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('Net Worth Statement', margin, y);
  y += 10;

  // ---- Generated date ----
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    margin,
    y
  );
  y += 12;

  const netWorth = input.assetsTotal - input.liabilitiesTotal;

  // ---- Summary ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('Summary', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Assets: Rs.${formatNum(input.assetsTotal)}`, margin, y);
  y += 6;
  doc.text(`Total Liabilities: Rs.${formatNum(input.liabilitiesTotal)}`, margin, y);
  y += 6;
  doc.text(`Net Worth: Rs.${formatNum(netWorth)}`, margin, y);
  y += 12;

  // ---- Assets by bucket (omit if empty) ----
  if (input.allocationBuckets.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Assets by Category', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    for (const b of input.allocationBuckets) {
      doc.text(`${b.name}: Rs.${formatNum(b.value)}`, margin, y);
      y += 6;
    }
    y += 6;
  }

  // ---- Liabilities table (omit if empty) ----
  if (input.liabilities.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Liabilities', margin, y);
    y += 8;

    const typeLabels: Record<string, string> = {
      HOME_LOAN: 'Home Loan',
      VEHICLE_LOAN: 'Vehicle Loan',
      CREDIT_CARD: 'Credit Card',
      PERSONAL_LOAN: 'Personal Loan',
      EDUCATION_LOAN: 'Education Loan',
      OTHER: 'Other',
    };

    for (const l of input.liabilities) {
      const type = typeLabels[l.type] ?? l.type;
      const emi = l.emi != null && l.emi > 0 ? formatNum(l.emi) : '—';
      const rate = l.interestRate != null && l.interestRate > 0 ? `${l.interestRate}%` : '—';
      doc.setFontSize(9);
      doc.text(`${l.lender} (${type})`, margin, y);
      doc.text(`Outstanding: Rs.${formatNum(l.outstanding)} | EMI: Rs.${emi} | Interest: ${rate}`, margin + 5, y + 5);
      y += 12;
    }
    y += 6;
  }

  // ---- Debt insights (only if available) ----
  const insightsRows: string[] = [];
  for (const l of input.liabilities) {
    const priority = getInterestPriorityTag(l.interestRate);
    const cost = calculateApproxInterestCost(l);
    const parts: string[] = [];
    if (priority != null) parts.push(`${priority} interest priority`);
    if (cost != null) parts.push(`Approx. yearly interest Rs.${formatNum(cost.yearlyInterest)}`);
    if (parts.length > 0) insightsRows.push(`${l.lender}: ${parts.join('; ')}`);
  }
  if (insightsRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Debt Insights', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    for (const row of insightsRows) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.text(row, margin, y);
      y += 6;
    }
    y += 6;
  }

  // ---- 12-month timeline table ----
  doc.setFont('helvetica', 'bold');
  doc.text('Net Worth Timeline (Next 12 Months)', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const colW = (pageWidth - 2 * margin) / 4;
  const headers = ['Month', 'Assets', 'Liabilities', 'Net Worth'];
  headers.forEach((h, i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(h, margin + i * colW, y);
  });
  y += 6;
  doc.setFont('helvetica', 'normal');

  for (const p of input.timeline) {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    const monthLabel = p.month === 0 ? 'Current' : `Month ${p.month}`;
    doc.text(monthLabel, margin, y);
    doc.text(`Rs.${formatNum(p.assets_value)}`, margin + colW, y);
    doc.text(`Rs.${formatNum(p.liabilities_value)}`, margin + 2 * colW, y);
    doc.text(`Rs.${formatNum(p.net_worth)}`, margin + 3 * colW, y);
    y += 6;
  }
  y += 10;

  // ---- Footer disclaimer ----
  if (y > 250) doc.addPage();
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(
    'This statement is for informational purposes only and does not constitute financial advice. Consult a qualified advisor for investment decisions.',
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin }
  );

  doc.save('Net-Worth-Statement.pdf');
}
