'use client';

import { useContext, useCallback, useMemo } from 'react';
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

  const formatCurrency = useCallback(
    (amount: number | null | undefined): string => formatCurrencyUtil(amount, format),
    [format]
  );

  return useMemo(
    () => ({ format, setFormat, formatCurrency }),
    [format, setFormat, formatCurrency]
  );
}









