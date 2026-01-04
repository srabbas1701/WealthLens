export type CurrencyFormat = 'raw' | 'lacs' | 'crores';

/**
 * Formats a number as Indian currency based on the specified format.
 * 
 * @param amount - The amount to format (can be null/undefined, returns '—' in that case)
 * @param format - The format to use: 'raw' (Indian numbering), 'lacs', or 'crores'
 * @returns Formatted currency string (e.g., "₹45,20,000", "₹45.20 L", "₹4.52 Cr")
 */
export function formatCurrency(
  amount: number | null | undefined,
  format: CurrencyFormat
): string {
  // Safety: handle null/undefined
  if (amount === null || amount === undefined) {
    return '—';
  }

  if (format === 'raw') {
    // Indian numbering system: commas every 2 digits after first 3 digits
    // Example: 4520000 → ₹45,20,000
    const rounded = Math.round(amount);
    const str = rounded.toString();
    const len = str.length;
    
    if (len <= 3) {
      return `₹${str}`;
    }
    
    // First 3 digits from right
    let result = str.slice(-3);
    
    // Then every 2 digits
    for (let i = len - 3; i > 0; i -= 2) {
      const start = Math.max(0, i - 2);
      result = str.slice(start, i) + ',' + result;
    }
    
    return `₹${result}`;
  } else if (format === 'lacs') {
    // Convert ALL values to Lacs (even values less than 1 lac)
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else { // crores
    // Convert ALL values to Crores
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
}








