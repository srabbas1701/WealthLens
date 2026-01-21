/**
 * Unified Supabase Client Exports
 * 
 * Centralized exports for Supabase clients.
 * Use this file to import clients throughout the application.
 */

// Browser client (for Client Components)
export { createClient as createBrowserClient } from './supabase/client';

// Server client (for Server Components, API routes, Server Actions)
export { createClient as createServerClient, createAdminClient } from './supabase/server';

// Re-export Database type for convenience
export type { Database } from '@/types/supabase';
