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
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

