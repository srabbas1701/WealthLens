/**
 * Supabase Client Exports
 * 
 * Usage:
 * 
 * Client Components:
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 * 
 * Server Components / API Routes:
 *   import { createClient } from '@/lib/supabase/server'
 *   const supabase = await createClient()
 * 
 * Admin Operations (bypass RLS):
 *   import { createAdminClient } from '@/lib/supabase/server'
 *   const supabase = createAdminClient()
 */

export { createClient } from './client';
export { createClient as createServerClient, createAdminClient } from './server';
export { updateSession } from './middleware';

