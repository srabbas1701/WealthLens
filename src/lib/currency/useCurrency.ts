'use client';

import { useContext } from 'react';
import { CurrencyContext } from '@/components/AppHeader';
import { formatCurrency as formatCurrencyUtil, type CurrencyFormat } from './formatCurrency';

/**
 * Hook to access currency formatting functionality.
 * 
 * Reads the current currency format from CurrencyContext and provides
 * a formatCurrency function that uses the shared utility.
 * 
 * @returns Object with format, setFormat, and formatCurrency function
 * @throws Error if used outside CurrencyProvider
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);
  
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  const { format, setFormat } = context;

  // Return formatCurrency that uses the shared utility with current format
  return {
    format,
    setFormat,
    formatCurrency: (amount: number | null | undefined): string => {
      return formatCurrencyUtil(amount, format);
    },
  };
}









