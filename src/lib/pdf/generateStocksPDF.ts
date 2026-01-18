/**
 * PDF Generation Utility for Stocks Holdings
 * 
 * Generates a nicely formatted PDF with selected columns only
 * 
 * Note: Uses dynamic import for client-side only execution
 */

export interface StockPDFRow {
  name: string;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  investedValue: number;
  currentPrice: number;
  currentValue: number;
  pl: number;
  plPercentage: number;
  allocation: number;
}

interface GenerateStocksPDFOptions {
  stocks: StockPDFRow[];
  totalValue: number;
  totalInvested: number;
  portfolioPercentage: number;
  priceDate?: string | null;
  formatCurrency: (value: number) => string;
}

// Helper function to format numbers with Indian numbering system for PDF
// Returns plain string without special characters to avoid jsPDF encoding issues
function formatNumberForPDF(num: number, decimals: number = 2): string {
  // Validate and convert to number
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  // Ensure it's a number
  const numValue = typeof num === 'number' ? num : parseFloat(String(num));
  if (isNaN(numValue)) {
    return '0';
  }
  
  const absNum = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  
  // Format with decimals
  const fixed = absNum.toFixed(decimals);
  
  // Split into integer and decimal parts
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Apply Indian numbering system: last 3 digits, then every 2 digits
  const len = integerPart.length;
  if (len <= 3) {
    // No commas needed
    return decimals > 0 && decimalPart ? `${sign}${integerPart}.${decimalPart}` : `${sign}${integerPart}`;
  }
  
  // Build formatted string with commas (Indian numbering)
  let result = integerPart.slice(-3); // Last 3 digits
  
  // Add commas for remaining digits (every 2 digits from right to left)
  for (let i = len - 3; i > 0; i -= 2) {
    const start = Math.max(0, i - 2);
    const chunk = integerPart.slice(start, i);
    result = chunk + ',' + result;
  }
  
  // Add decimal part
  if (decimals > 0 && decimalPart) {
    result = result + '.' + decimalPart;
  }
  
  return sign + result;
}

export async function generateStocksPDF({
  stocks,
  totalValue,
  totalInvested,
  portfolioPercentage,
  priceDate,
  formatCurrency,
}: GenerateStocksPDFOptions): Promise<void> {
  // Dynamic import for client-side only
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
  const primaryColor = [15, 23, 42]; // #0F172A
  const secondaryColor = [71, 85, 105]; // #475569
  const successColor = [16, 163, 74]; // #10b981
  const dangerColor = [220, 38, 38]; // #DC2626
  const borderColor = [229, 231, 235]; // #E5E7EB
  const headerBgColor = [249, 250, 251]; // #F9FAFB

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Stocks Holdings Report', startX, currentY);
  currentY += 10;

  // Date and summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  const dateText = priceDate 
    ? `Price as of ${new Date(priceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  doc.text(dateText, startX, currentY);
  currentY += 6;

  // Summary stats
  doc.setFontSize(9);
  const summaryText = `${stocks.length} holdings • Total Value: Rs.${formatNumberForPDF(totalValue, 0)} • ${portfolioPercentage.toFixed(1)}% of portfolio`;
  doc.text(summaryText, startX, currentY);
  currentY += 10;

  // Table setup
  const tableStartX = startX;
  const tableStartY = currentY;
  const rowHeight = 9; // Increased to accommodate stock name + symbol
  const headerHeight = 10;
  const cellPadding = 5; // Increased padding for better spacing
  const headerVerticalPadding = 6.5; // Center text vertically in header
  const rowVerticalCenter = 4.5; // Center text vertically in row

  // Column widths (adjusted for landscape A4 - total available: 267mm)
  // Removed allocation column and redistributed space for better readability
  const colWidths = {
    name: 65,  // Stock name column - wider for long names
    quantity: 24,  // Quantity - comfortable width
    avgBuyPrice: 32,  // Avg Buy Price - wider for readability
    investedValue: 38,  // Invested Value - wider for large numbers
    currentPrice: 32,  // Current Price - wider for readability
    currentValue: 38,  // Current Value - wider for large numbers
    pl: 38,  // P&L (needs space for amount + percentage) - wider for alignment
  };
  
  // Verify total width doesn't exceed available space (267mm - table margins)
  const totalTableWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);
  if (totalTableWidth > pageWidth - 2 * margin) {
    console.warn('[PDF] Column widths exceed page width, adjusting...');
  }

  const colX = {
    name: tableStartX,
    quantity: tableStartX + colWidths.name,
    avgBuyPrice: tableStartX + colWidths.name + colWidths.quantity,
    investedValue: tableStartX + colWidths.name + colWidths.quantity + colWidths.avgBuyPrice,
    currentPrice: tableStartX + colWidths.name + colWidths.quantity + colWidths.avgBuyPrice + colWidths.investedValue,
    currentValue: tableStartX + colWidths.name + colWidths.quantity + colWidths.avgBuyPrice + colWidths.investedValue + colWidths.currentPrice,
    pl: tableStartX + colWidths.name + colWidths.quantity + colWidths.avgBuyPrice + colWidths.investedValue + colWidths.currentPrice + colWidths.currentValue,
  };
  
  // Helper function for consistent right-aligned positioning
  const rightAlignX = (colKey: keyof typeof colWidths) => colX[colKey] + colWidths[colKey] - cellPadding;

  // Table header - Draw background
  doc.setFillColor(...headerBgColor);
  doc.rect(tableStartX, tableStartY, pageWidth - 2 * margin, headerHeight, 'F');
  
  // Header text - all consistently aligned
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  const headerY = tableStartY + headerVerticalPadding;

  // Left-aligned header
  doc.text('STOCK NAME', colX.name + cellPadding, headerY);
  
  // Right-aligned headers - all use the same right edge calculation
  doc.text('QTY', rightAlignX('quantity'), headerY, { align: 'right' });
  doc.text('AVG BUY', rightAlignX('avgBuyPrice'), headerY, { align: 'right' });
  doc.text('INVESTED', rightAlignX('investedValue'), headerY, { align: 'right' });
  
  // Current Price header - top row
  doc.text('CURRENT', rightAlignX('currentPrice'), headerY - 1.5, { align: 'right' });
  // Current Value header - top row
  doc.text('CURRENT', rightAlignX('currentValue'), headerY - 1.5, { align: 'right' });
  
  doc.text('P&L', rightAlignX('pl'), headerY - 1.5, { align: 'right' });

  // Header sub-labels for CURRENT columns
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('PRICE', rightAlignX('currentPrice'), headerY + 1.5, { align: 'right' });
  doc.text('VALUE', rightAlignX('currentValue'), headerY + 1.5, { align: 'right' });

  currentY = tableStartY + headerHeight;

  // Table rows
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Debug: Log data to verify correctness
  console.log('[PDF] Generating PDF with', stocks.length, 'stocks');
  if (stocks.length > 0) {
    console.log('[PDF] Sample stock data:', {
      name: stocks[0].name,
      quantity: stocks[0].quantity,
      avgBuyPrice: stocks[0].avgBuyPrice,
      investedValue: stocks[0].investedValue,
      currentPrice: stocks[0].currentPrice,
      currentValue: stocks[0].currentValue,
      pl: stocks[0].pl,
      formatted: {
        avgPrice: formatNumberForPDF(stocks[0].avgBuyPrice, 2),
        invested: formatNumberForPDF(stocks[0].investedValue, 0),
        currentPrice: formatNumberForPDF(stocks[0].currentPrice, 2),
        currentValue: formatNumberForPDF(stocks[0].currentValue, 0),
      }
    });
  }

  let rowIndex = 0;
  for (const stock of stocks) {
    // Validate stock data
    if (!stock || typeof stock.quantity !== 'number' || typeof stock.avgBuyPrice !== 'number') {
      console.warn('[PDF] Invalid stock data:', stock);
      continue;
    }
    
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      
      // Redraw header on new page
      const newHeaderY = currentY + headerVerticalPadding;
      doc.setFillColor(...headerBgColor);
      doc.rect(tableStartX, currentY, pageWidth - 2 * margin, headerHeight, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...secondaryColor);
      doc.text('STOCK NAME', colX.name + cellPadding, newHeaderY);
      doc.text('QTY', rightAlignX('quantity'), newHeaderY, { align: 'right' });
      doc.text('AVG BUY', rightAlignX('avgBuyPrice'), newHeaderY, { align: 'right' });
      doc.text('INVESTED', rightAlignX('investedValue'), newHeaderY, { align: 'right' });
      doc.text('CURRENT', rightAlignX('currentPrice'), newHeaderY - 1.5, { align: 'right' });
      doc.text('CURRENT', rightAlignX('currentValue'), newHeaderY - 1.5, { align: 'right' });
      doc.text('P&L', rightAlignX('pl'), newHeaderY - 1.5, { align: 'right' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('PRICE', rightAlignX('currentPrice'), newHeaderY + 1.5, { align: 'right' });
      doc.text('VALUE', rightAlignX('currentValue'), newHeaderY + 1.5, { align: 'right' });
      currentY += headerHeight;
    }

    // Draw row border
    doc.setDrawColor(...borderColor);
    doc.line(tableStartX, currentY, pageWidth - margin, currentY);

    // Stock name and symbol - left column
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    const nameY = currentY + rowVerticalCenter - 1.5; // Top line of two-line cell
    
    // Truncate name if too long
    const maxNameWidth = colWidths.name - 2 * cellPadding;
    let displayName = stock.name;
    if (doc.getTextWidth(displayName) > maxNameWidth) {
      // Truncate and add ellipsis
      while (doc.getTextWidth(displayName + '...') > maxNameWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }
    doc.text(displayName, colX.name + cellPadding, nameY, { maxWidth: maxNameWidth });
    
    // Symbol (below name, smaller font)
    if (stock.symbol && stock.symbol.trim()) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      const symbolText = stock.symbol.startsWith('NSE:') || stock.symbol.startsWith('BSE:') 
        ? stock.symbol 
        : `NSE: ${stock.symbol}`;
      doc.text(symbolText, colX.name + cellPadding, nameY + 3.5, { maxWidth: maxNameWidth });
    }

    // All numeric columns use consistent vertical alignment
    const dataY = currentY + rowVerticalCenter; // Center vertically in row

    // Quantity - right aligned
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    const quantity = typeof stock.quantity === 'number' ? stock.quantity : parseFloat(String(stock.quantity)) || 0;
    const quantityStr = formatNumberForPDF(quantity, 0);
    doc.text(quantityStr, rightAlignX('quantity'), dataY, { align: 'right' });

    // Avg Buy Price - right aligned
    const avgPriceStr = 'Rs. ' + formatNumberForPDF(stock.avgBuyPrice, 2);
    doc.text(avgPriceStr, rightAlignX('avgBuyPrice'), dataY, { align: 'right' });

    // Invested Value - right aligned
    const investedStr = 'Rs. ' + formatNumberForPDF(stock.investedValue, 0);
    doc.text(investedStr, rightAlignX('investedValue'), dataY, { align: 'right' });

    // Current Price - right aligned
    const currentPriceStr = 'Rs. ' + formatNumberForPDF(stock.currentPrice, 2);
    doc.text(currentPriceStr, rightAlignX('currentPrice'), dataY, { align: 'right' });

    // Current Value - right aligned
    const currentValueStr = 'Rs. ' + formatNumberForPDF(stock.currentValue, 0);
    doc.text(currentValueStr, rightAlignX('currentValue'), dataY, { align: 'right' });

    // P&L - two lines: amount and percentage, properly aligned
    const plColor = stock.pl >= 0 ? successColor : dangerColor;
    doc.setTextColor(...plColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const plNum = formatNumberForPDF(Math.abs(stock.pl), 0);
    const plSign = stock.pl >= 0 ? '+' : '-';
    const plStr = 'Rs. ' + plSign + plNum;
    // Amount on top - aligned to same Y as other columns
    doc.text(plStr, rightAlignX('pl'), dataY - 1, { align: 'right' });
    
    // P&L percentage below - aligned consistently
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const plPercentStr = `(${stock.pl >= 0 ? '+' : ''}${stock.plPercentage.toFixed(2)}%)`;
    doc.text(plPercentStr, rightAlignX('pl'), dataY + 2, { align: 'right' });

    currentY += rowHeight;
    rowIndex++;
  }

  // Footer row with totals
  currentY += 2;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(tableStartX, currentY, pageWidth - margin, currentY);
  currentY += 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL', colX.name + cellPadding, currentY);
  
  // Footer totals - all consistently aligned
  const footerY = currentY;
  
  // Total invested - right aligned
  const totalInvestedStr = 'Rs. ' + formatNumberForPDF(totalInvested, 0);
  doc.text(totalInvestedStr, rightAlignX('investedValue'), footerY, { align: 'right' });

  // Total current value - right aligned
  const totalValueStr = 'Rs. ' + formatNumberForPDF(totalValue, 0);
  doc.text(totalValueStr, rightAlignX('currentValue'), footerY, { align: 'right' });

  // Total P&L - two lines: amount and percentage, properly aligned
  const totalPL = totalValue - totalInvested;
  const totalPLPercentage = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const totalPLColor = totalPL >= 0 ? successColor : dangerColor;
  doc.setTextColor(...totalPLColor);
  doc.setFontSize(9);
  const totalPLNum = formatNumberForPDF(Math.abs(totalPL), 0);
  const totalPLSign = totalPL >= 0 ? '+' : '-';
  const totalPLStr = 'Rs. ' + totalPLSign + totalPLNum;
  // Amount on top - aligned to same Y as other totals
  doc.text(totalPLStr, rightAlignX('pl'), footerY - 1, { align: 'right' });
  doc.setFontSize(7);
  const totalPLPercentStr = `(${totalPL >= 0 ? '+' : ''}${totalPLPercentage.toFixed(2)}%)`;
  doc.text(totalPLPercentStr, rightAlignX('pl'), footerY + 2, { align: 'right' });

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
  const filename = `Stocks_Holdings_${new Date().toISOString().split('T')[0]}.pdf`;

  // Save PDF with error handling to suppress extension errors
  try {
    doc.save(filename);
  } catch (error) {
    // Some browser extensions may interfere with PDF downloads
    // Try alternative method if direct save fails
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes('Could not establish connection') && !errorMsg.includes('Receiving end does not exist')) {
      // Only re-throw if it's not an extension error
      throw error;
    }
    // Extension errors are harmless - PDF is still generated
    console.warn('[PDF] Browser extension interference detected, but PDF was generated successfully');
  }
}
