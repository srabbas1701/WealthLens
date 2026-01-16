import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Supabase Browser Client
 * 
 * Use this client in Client Components (components with 'use client')
 * This client uses the anon key and respects RLS policies
 * 
 * NOTE: @supabase/ssr handles cookie management automatically for production
 * No manual cookie configuration needed - it handles SameSite, Secure, etc.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient<Database>(
    url,
    anonKey
  );
}

