import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Supabase Server Client
 * 
 * Use this client in:
 * - Server Components
 * - Route Handlers (API routes)
 * - Server Actions
 * 
 * This client handles cookies for auth state
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build/static generation, env vars might not be available
  // Check if we're in a build environment (Next.js sets NEXT_PHASE during build)
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  if (!url || !anonKey) {
    if (isBuildTime) {
      // Build time: create a mock client that won't crash
      // This allows the build to complete without errors
      console.warn('[Supabase Server Client] Environment variables not available during build - using mock client');
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
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }),
      } as any;
    }
    
    // Runtime: throw error so developers know to set env vars
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Supabase Admin Client (Service Role)
 * 
 * ⚠️ WARNING: This bypasses RLS - use only for:
 * - Background jobs
 * - Admin operations
 * - Seeding data
 * 
 * NEVER expose to client or use for user-facing operations
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // During build/static generation, env vars might not be available
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  if (!url || !serviceKey) {
    if (isBuildTime) {
      // Build time: create a mock client that won't crash
      console.warn('[Supabase Admin Client] Environment variables not available during build - using mock client');
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
        },
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }),
      } as any;
    }
    
    // Runtime: throw error so developers know to set env vars
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // Use @supabase/supabase-js directly for admin client to ensure RLS bypass
  // The SSR client might not properly bypass RLS even with service role key
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

