/**
 * Stocks Holdings Page - Redirect
 * 
 * Redirects /portfolio/stocks to /portfolio/equity
 * for consistency with API labels.
 */

import { redirect } from 'next/navigation';

export default function StocksPage() {
  redirect('/portfolio/equity');
}








