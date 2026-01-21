/**
 * XIRR (Extended Internal Rate of Return) Calculator
 * 
 * Calculates XIRR from cash flows with dates using Newton-Raphson method.
 * 
 * Formula: Σ(CF_i / (1 + r)^((date_i - date_0) / 365)) = 0
 * 
 * Where:
 * - CF_i = Cash flow at date_i
 * - r = Internal rate of return (to be solved)
 * - date_0 = First cash flow date
 * 
 * @module utils/xirr
 */

/**
 * Cash flow entry with date and amount
 */
export interface CashFlow {
  date: Date;
  amount: number; // Positive for inflows, negative for outflows
}

/**
 * Calculate XIRR using Newton-Raphson method
 * 
 * Solves: Σ(CF_i / (1 + r)^((date_i - date_0) / 365)) = 0
 * 
 * @param cashFlows - Array of cash flows with dates
 * @param guess - Initial guess for rate (default: 0.1 = 10%)
 * @param maxIterations - Maximum iterations (default: 100)
 * @param tolerance - Convergence tolerance (default: 1e-6)
 * @returns XIRR as decimal (e.g., 0.125 for 12.5%), or null if cannot solve
 */
export function calculateXIRR(
  cashFlows: CashFlow[],
  guess: number = 0.1,
  maxIterations: number = 100,
  tolerance: number = 1e-6
): number | null {
  if (!cashFlows || cashFlows.length < 2) {
    return null; // Need at least 2 cash flows
  }

  // Sort cash flows by date
  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const firstDate = sorted[0].date;
  
  // Validate: At least one negative (outflow) and one positive (inflow)
  const hasNegative = sorted.some(cf => cf.amount < 0);
  const hasPositive = sorted.some(cf => cf.amount > 0);
  
  if (!hasNegative || !hasPositive) {
    return null; // Need both inflows and outflows
  }

  // Newton-Raphson method
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0; // Net Present Value
    let npvDerivative = 0; // Derivative of NPV
    
    for (const cf of sorted) {
      const days = (cf.date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      
      if (years === 0) {
        npv += cf.amount;
        continue;
      }
      
      const factor = Math.pow(1 + rate, years);
      npv += cf.amount / factor;
      
      // Derivative: -years * amount / (1 + rate)^(years + 1)
      npvDerivative -= (years * cf.amount) / (factor * (1 + rate));
    }
    
    // Check convergence
    if (Math.abs(npv) < tolerance) {
      return rate;
    }
    
    // Avoid division by zero
    if (Math.abs(npvDerivative) < tolerance) {
      break;
    }
    
    // Newton-Raphson update: rate = rate - npv / npvDerivative
    const newRate = rate - npv / npvDerivative;
    
    // Prevent invalid rates
    if (newRate <= -1 || !isFinite(newRate)) {
      break;
    }
    
    // Check convergence
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    
    rate = newRate;
  }
  
  // If didn't converge, try alternative guesses
  for (const altGuess of [-0.5, -0.1, 0.05, 0.2, 0.5, 1.0]) {
    const result = calculateXIRRWithGuess(cashFlows, altGuess, maxIterations, tolerance);
    if (result !== null) {
      return result;
    }
  }
  
  return null;
}

/**
 * Calculate XIRR with specific initial guess
 */
function calculateXIRRWithGuess(
  cashFlows: CashFlow[],
  guess: number,
  maxIterations: number,
  tolerance: number
): number | null {
  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstDate = sorted[0].date;
  
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let npvDerivative = 0;
    
    for (const cf of sorted) {
      const days = (cf.date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      
      if (years === 0) {
        npv += cf.amount;
        continue;
      }
      
      const factor = Math.pow(1 + rate, years);
      npv += cf.amount / factor;
      npvDerivative -= (years * cf.amount) / (factor * (1 + rate));
    }
    
    if (Math.abs(npv) < tolerance) {
      return rate;
    }
    
    if (Math.abs(npvDerivative) < tolerance) {
      return null;
    }
    
    const newRate = rate - npv / npvDerivative;
    
    if (newRate <= -1 || !isFinite(newRate)) {
      return null;
    }
    
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    
    rate = newRate;
  }
  
  return null;
}

/**
 * Format XIRR as percentage
 * 
 * @param xirr - XIRR as decimal (e.g., 0.125 for 12.5%)
 * @returns Formatted string (e.g., "12.5%")
 */
export function formatXIRR(xirr: number | null): string {
  if (xirr === null) {
    return 'N/A';
  }
  
  const percent = xirr * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}
