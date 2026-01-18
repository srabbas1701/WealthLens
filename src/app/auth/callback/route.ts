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
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');

    // MOBILE FIX: Get origin from request headers (more reliable on mobile)
    const origin = request.headers.get('origin') || 
                   request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                   requestUrl.origin;
    
    // MOBILE FIX: Use explicit origin for redirects (handles mobile browsers better)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Auth Callback] Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      });
      return NextResponse.redirect(
        `${baseUrl}/login?error=missing_config`
      );
    }

    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
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
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
              console.warn('[Auth Callback] Cookie set error (non-critical):', error);
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
      
      if (error) {
        console.error('[Auth Callback] Magic link verification error:', {
          message: error.message,
          status: error.status,
          type,
        });
      }
    }
    // Handle OAuth code exchange
    else if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      user = data?.user;
      authError = error;
      
      if (error) {
        console.error('[Auth Callback] Code exchange error:', {
          message: error.message,
          status: error.status,
        });
      }
    } else {
      // No valid auth params
      console.warn('[Auth Callback] No valid auth params:', {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        hasType: !!type,
        url: requestUrl.toString(),
        userAgent: request.headers.get('user-agent'),
        origin,
      });
      return NextResponse.redirect(
        `${baseUrl}/login?error=invalid_callback`
      );
    }

    if (!authError && user) {
      // Check if user has a portfolio to determine redirect
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (portfolioError) {
        console.error('[Auth Callback] Portfolio check error:', portfolioError);
        // Still redirect to dashboard even if portfolio check fails
      }

      if (portfolio) {
        // User has portfolio → go to dashboard
        // MOBILE FIX: Use absolute URL for better mobile browser compatibility
        return NextResponse.redirect(`${baseUrl}/dashboard`);
      } else {
        // New user → go to onboarding
        // MOBILE FIX: Use absolute URL for better mobile browser compatibility
        return NextResponse.redirect(`${baseUrl}/onboarding`);
      }
    }

    // If there's an error, redirect to login with error message
    const errorMessage = authError?.message || 'Authentication failed';
    console.error('[Auth Callback] Auth error:', {
      message: errorMessage,
      status: authError?.status,
      hasCode: !!code,
      hasTokenHash: !!token_hash,
      userAgent: request.headers.get('user-agent'),
      origin,
    });
    
    // MOBILE FIX: Use absolute URL for better mobile browser compatibility
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(errorMessage)}`
    );
  } catch (error: any) {
    // Catch any unexpected errors
    const origin = request.headers.get('origin') || 
                   request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                   new URL(request.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
    
    console.error('[Auth Callback] Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      origin,
    });
    
    // MOBILE FIX: Use absolute URL for better mobile browser compatibility
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(error?.message || 'unexpected_error')}`
    );
  }
}

