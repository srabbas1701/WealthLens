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

  // During build/static generation, env vars might not be available
  // Check if we're in a build environment (Next.js sets NEXT_PHASE during build)
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                      (process.env.NODE_ENV === 'production' && typeof window === 'undefined');

  if (!url || !anonKey) {
    if (isBuildTime) {
      // Build time: create a mock client that won't crash
      // This allows the build to complete without errors
      console.warn('[Supabase Client] Environment variables not available during build - using mock client');
      // Return a minimal mock that satisfies the type but won't work
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: null } }),
          signInWithOtp: async () => ({ error: new Error('Not available during build') }),
          signOut: async () => ({ error: null }),
          verifyOtp: async () => ({ error: new Error('Not available during build') }),
        },
      } as any;
    }
    
    // Runtime: throw error so developers know to set env vars
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

