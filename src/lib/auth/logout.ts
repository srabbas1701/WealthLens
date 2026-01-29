/**
 * Unified Logout Handler
 * 
 * Single source of truth for all logout operations.
 * Ensures consistent behavior across all logout triggers:
 * - Inactivity timeout
 * - Session expiration
 * - Token expiration
 * - Manual logout
 * 
 * All auto-logouts redirect to home/landing page.
 */

import { createClient } from '@/lib/supabase/client';

export type LogoutReason = 
  | 'inactivity' 
  | 'session_expired' 
  | 'token_expired' 
  | 'manual'
  | 'invalid_token';

export interface LogoutOptions {
  reason?: LogoutReason;
  redirectTo?: string;
  skipRedirect?: boolean;
}

/**
 * Unified logout handler
 * 
 * @param options - Logout configuration
 * @returns Promise that resolves when logout is complete
 */
export async function handleLogout(options: LogoutOptions = {}): Promise<void> {
  const {
    reason = 'manual',
    redirectTo = '/', // Default to home page for auto-logouts
    skipRedirect = false,
  } = options;

  console.log('[Logout] Starting logout process, reason:', reason);

  const doRedirect = () => {
    if (!skipRedirect && typeof window !== 'undefined') {
      const url = new URL(redirectTo, window.location.origin);
      if (reason === 'inactivity') {
        url.searchParams.set('timeout', 'true');
      } else if (reason === 'session_expired' || reason === 'token_expired') {
        url.searchParams.set('session_expired', 'true');
      }
      window.location.href = url.toString();
    }
  };

  try {
    // Step 1: Clear localStorage (session activity tracking)
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('sessionWarningShown');
    localStorage.removeItem('sessionLogout');

    // Step 2: Clear sessionStorage (auth state)
    sessionStorage.removeItem('auth_loading_start');
    sessionStorage.removeItem('loadAppData_start');

    // Step 3: Notify other tabs about logout
    localStorage.setItem('sessionLogout', Date.now().toString());
    setTimeout(() => {
      localStorage.removeItem('sessionLogout');
    }, 100);

    // Step 4: Clear Supabase session - with 2s timeout so we never get stuck
    const supabase = createClient();
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });
    await Promise.race([signOutPromise, timeoutPromise]);

    // Step 5: Redirect (always runs - either after signOut or after timeout)
    doRedirect();
    console.log('[Logout] Logout complete, reason:', reason);
  } catch (error) {
    console.error('[Logout] Error during logout:', error);
    doRedirect();
    throw error;
  }
}

/**
 * Check if Supabase session is expired or invalid
 * 
 * @returns true if session is expired/invalid, false otherwise
 */
export async function isSessionExpired(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If error or no session, consider it expired
    if (error || !session) {
      return true;
    }

    // Check if session is expired (Supabase sessions have expires_at)
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000); // Convert to milliseconds
      const now = new Date();
      
      // Add 5 minute buffer to account for clock skew
      const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (expiresAt.getTime() - buffer < now.getTime()) {
        return true;
      }
    }

    // Try to get user to check if refresh token is valid
    const { error: userError } = await supabase.auth.getUser();
    if (userError) {
      // Check if it's a refresh token error
      if (
        userError.message?.includes('Refresh Token Not Found') ||
        userError.message?.includes('refresh_token_not_found') ||
        (userError as any)?.code === 'refresh_token_not_found'
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[Logout] Error checking session expiration:', error);
    // On error, assume session is expired for safety
    return true;
  }
}
