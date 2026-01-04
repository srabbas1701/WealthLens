/**
 * Auth Callback Route
 * 
 * Handles authentication callbacks from Supabase Auth.
 * 
 * This route is called after:
 * - Email magic link click
 * - OAuth login (Google, GitHub, etc.)
 * - Email verification
 * 
 * It exchanges the auth code/token for a session and redirects the user appropriately.
 * 
 * USER FLOW:
 * - New user (no portfolio) → /onboarding
 * - Existing user (has portfolio) → /dashboard
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  let user = null;
  let authError = null;

  // Handle magic link token (email OTP)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'magiclink',
    });
    user = data?.user;
    authError = error;
  }
  // Handle OAuth code exchange
  else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    user = data?.user;
    authError = error;
  }

  if (!authError && user) {
    // Check if user has a portfolio to determine redirect
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (portfolio) {
      // User has portfolio → go to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // New user → go to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // If there's an error or no valid auth params, redirect to login
  console.error('[Auth Callback] Error:', authError?.message || 'No valid auth params');
  return NextResponse.redirect(new URL('/login', request.url));
}

