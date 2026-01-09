/**
 * XIRR (Extended Internal Rate of Return) Calculator
 * 
 * Calculates annualized returns accounting for timing of investments.
 * 
 * Since we don't have individual transaction dates, we use a simplified approach:
 * 1. Calculate total invested value and current value
 * 2. Use portfolio age (from creation/update date) as holding period
 * 3. Calculate annualized return using compound annual growth rate (CAGR)
 * 
 * Note: True XIRR requires transaction dates. This is an approximation.
 */

/**
 * Calculate XIRR for portfolio using CAGR approximation
 * 
 * @param investedValue - Total amount invested (negative cash flow)
 * @param currentValue - Current portfolio value (positive cash flow)
 * @param startDate - Portfolio creation or earliest investment date
 * @param endDate - Current date (default: today)
 * @returns XIRR as percentage (e.g., 12.5 for 12.5%), or null if insufficient data
 */
export function calculatePortfolioXIRR(
  investedValue: number,
  currentValue: number,
  startDate: string | Date | null,
  endDate: Date = new Date()
): number | null {
  // Validate inputs
  if (!investedValue || investedValue <= 0) {
    return null;
  }
  
  if (!currentValue || currentValue <= 0) {
    return null;
  }
  
  if (!startDate) {
    return null;
  }
  
  // Parse start date
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  
  // Calculate time period in years
  const timeDiffMs = endDate.getTime() - start.getTime();
  const daysDiff = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
  
  // Need at least 30 days of data for meaningful XIRR
  if (daysDiff < 30) {
    return null;
  }
  
  const years = daysDiff / 365.25; // Account for leap years
  
  // Calculate CAGR: (End Value / Start Value)^(1/Years) - 1
  const cagr = Math.pow(currentValue / investedValue, 1 / years) - 1;
  
  // Convert to percentage and round to 1 decimal place
  const xirr = cagr * 100;
  
  // Cap at reasonable range (-99% to 999%)
  if (xirr < -99) return -99;
  if (xirr > 999) return 999;
  
  return Math.round(xirr * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate XIRR from portfolio data
 * 
 * @param holdings - Array of holdings with investedValue and currentValue
 * @param portfolioStartDate - Portfolio creation date or earliest date
 * @returns XIRR as percentage, or null if cannot calculate
 */
export function calculateXIRRFromHoldings(
  holdings: Array<{ investedValue: number; currentValue: number }>,
  portfolioStartDate: string | Date | null
): number | null {
  if (!holdings || holdings.length === 0) {
    return null;
  }
  
  // Sum up invested and current values
  const totalInvested = holdings.reduce((sum, h) => sum + (h.investedValue || 0), 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + (h.currentValue || h.investedValue || 0), 0);
  
  // Calculate XIRR
  return calculatePortfolioXIRR(totalInvested, totalCurrent, portfolioStartDate);
}

/**
 * Format XIRR for display
 * 
 * @param xirr - XIRR value or null
 * @param showNotAvailable - Whether to show "N/A" when null
 * @returns Formatted string (e.g., "12.5%" or "N/A")
 */
export function formatXIRR(xirr: number | null, showNotAvailable: boolean = true): string {
  if (xirr === null) {
    return showNotAvailable ? 'N/A' : '—';
  }
  
  return `${xirr >= 0 ? '+' : ''}${xirr.toFixed(1)}%`;
}
