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

    // MOBILE FIX: Log all URL parameters for debugging
    console.log('[Auth Callback] URL params:', {
      hasCode: !!code,
      hasTokenHash: !!token_hash,
      hasType: !!type,
      code: code ? code.substring(0, 20) + '...' : null,
      token_hash: token_hash ? token_hash.substring(0, 20) + '...' : null,
      type,
      fullUrl: requestUrl.toString(),
      userAgent: request.headers.get('user-agent'),
    });

    // Handle OAuth code exchange (modern Supabase magic links use 'code')
    // This should be checked FIRST as it's the standard format
    if (code) {
      console.log('[Auth Callback] Processing code exchange...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      user = data?.user;
      authError = error;
      
      if (error) {
        console.error('[Auth Callback] Code exchange error:', {
          message: error.message,
          status: error.status,
          code: error.code,
        });
      } else if (user) {
        console.log('[Auth Callback] Code exchange successful, user:', user.id);
      }
    }
    // Handle legacy magic link token (token_hash + type)
    else if (token_hash && type) {
      console.log('[Auth Callback] Processing token_hash verification...');
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
      } else if (user) {
        console.log('[Auth Callback] Token verification successful, user:', user.id);
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
        allParams: Object.fromEntries(requestUrl.searchParams.entries()),
      });
      return NextResponse.redirect(
        `${baseUrl}/login?error=invalid_callback&details=no_auth_params`
      );
    }

    if (!authError && user) {
      console.log('[Auth Callback] Authentication successful, checking portfolio...');
      
      // MOBILE FIX: Ensure session is properly stored before redirect
      // Get session to verify it's stored
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('[Auth Callback] Session check warning:', sessionError.message);
      } else if (sessionData?.session) {
        console.log('[Auth Callback] Session confirmed, user ID:', sessionData.session.user.id);
      } else {
        console.warn('[Auth Callback] No session found after authentication - this may cause issues on mobile');
      }

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

      const redirectPath = portfolio ? '/dashboard' : '/onboarding';
      console.log('[Auth Callback] Redirecting to:', redirectPath);
      
      // MOBILE FIX: Use absolute URL for better mobile browser compatibility
      // Also add a small delay parameter to help with cookie propagation on iOS
      const redirectUrl = new URL(redirectPath, baseUrl);
      redirectUrl.searchParams.set('auth_success', 'true');
      
      return NextResponse.redirect(redirectUrl.toString());
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

