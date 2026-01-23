/**
 * API Route Authentication Middleware
 * 
 * Provides consistent authentication checking for API routes.
 * Handles expired sessions gracefully and returns consistent error responses.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export interface AuthResult {
  user: any;
  supabase: ReturnType<typeof createClient>;
  error?: null;
}

export interface AuthError {
  user: null;
  supabase: null;
  error: {
    message: string;
    code: string;
    status: number;
  };
}

export type AuthCheckResult = AuthResult | AuthError;

/**
 * Check authentication for API routes
 * 
 * @param request - Next.js request object
 * @returns AuthCheckResult with user and supabase client, or error
 */
export async function checkAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Handle invalid/expired refresh token
    if (error && (
      error.message?.includes('Refresh Token Not Found') ||
      error.message?.includes('refresh_token_not_found') ||
      (error as any)?.code === 'refresh_token_not_found'
    )) {
      return {
        user: null,
        supabase: null,
        error: {
          message: 'Session expired. Please sign in again.',
          code: 'SESSION_EXPIRED',
          status: 401,
        },
      };
    }

    // Handle other auth errors
    if (error || !user) {
      return {
        user: null,
        supabase: null,
        error: {
          message: error?.message || 'Authentication required',
          code: 'UNAUTHORIZED',
          status: 401,
        },
      };
    }

    return {
      user,
      supabase,
      error: null,
    };
  } catch (error) {
    console.error('[API Auth] Error checking authentication:', error);
    return {
      user: null,
      supabase: null,
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR',
        status: 500,
      },
    };
  }
}

/**
 * Create a 401 Unauthorized response for API routes
 * 
 * @param message - Error message
 * @param code - Error code
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message: string = 'Authentication required', code: string = 'UNAUTHORIZED'): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code,
      },
    },
    { status: 401 }
  );
}

/**
 * Create a 401 response for expired sessions
 * 
 * @returns NextResponse with 401 status and session_expired flag
 */
export function sessionExpiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        message: 'Session expired. Please sign in again.',
        code: 'SESSION_EXPIRED',
      },
    },
    { status: 401 }
  );
}

/**
 * Wrapper for API route handlers that require authentication
 * 
 * Usage:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAuth(request);
 *   if (auth.error) {
 *     return unauthorizedResponse(auth.error.message, auth.error.code);
 *   }
 *   // Use auth.user and auth.supabase
 * }
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<AuthCheckResult> {
  return await checkAuth(request);
}
