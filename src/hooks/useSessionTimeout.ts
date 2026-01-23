/**
 * Session Timeout Hook
 * 
 * Tracks user activity and manages automatic logout after inactivity.
 * Also checks Supabase session expiration to ensure consistency.
 * 
 * SECURITY REQUIREMENTS:
 * - Auto logout after 30 minutes of inactivity
 * - Check Supabase session expiration (primary mechanism)
 * - Inactivity = no user interaction or API activity
 * - Clear authentication state on logout
 * - Sync logout across tabs
 * - All auto-logouts redirect to home/landing page
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { handleLogout, isSessionExpired } from '@/lib/auth/logout';

const INACTIVITY_WARNING_TIME = 28 * 60 * 1000; // 28 minutes (2 minutes before logout)
const INACTIVITY_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check session expiration every minute

interface UseSessionTimeoutOptions {
  onWarning?: () => void;
  onLogout?: () => void;
  enabled?: boolean;
}

export function useSessionTimeout({
  onWarning,
  onLogout,
  enabled = true,
}: UseSessionTimeoutOptions = {}) {
  const { user } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  /**
   * Update last activity timestamp
   */
  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    warningShownRef.current = false;
    
    // Store in localStorage for cross-tab sync
    localStorage.setItem('lastActivity', now.toString());
    
    // Dispatch custom event for same-tab communication
    window.dispatchEvent(new CustomEvent('sessionActivity', {
      detail: { key: 'lastActivity', value: now.toString() }
    }));
    
    // Clear existing timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    
    // Reset warning flag
    warningShownRef.current = false;
  }, []);

  /**
   * Handle user activity events
   */
  const handleActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  /**
   * Check inactivity and trigger warnings/logout
   */
  const checkInactivity = useCallback(async () => {
    if (!enabled || !user || isLoggingOutRef.current) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // Show warning at 28 minutes (2 minutes before logout)
    if (timeSinceActivity >= INACTIVITY_WARNING_TIME && !warningShownRef.current) {
      warningShownRef.current = true;
      onWarning?.();
    }

    // Auto logout at 30 minutes
    if (timeSinceActivity >= INACTIVITY_LOGOUT_TIME) {
      await handleAutoLogout('inactivity');
    }
  }, [enabled, user, onWarning]);

  /**
   * Handle automatic logout using unified logout handler
   */
  const handleAutoLogout = useCallback(async (reason: 'inactivity' | 'session_expired' | 'token_expired' = 'inactivity') => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // Clear all timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }

    try {
      // Use unified logout handler (redirects to home page)
      await handleLogout({
        reason,
        redirectTo: '/', // Always redirect to home/landing page
        skipRedirect: false,
      });
      
      onLogout?.();
    } catch (error) {
      console.error('[SessionTimeout] Error during logout:', error);
      isLoggingOutRef.current = false;
    }
  }, [onLogout]);

  /**
   * Handle "Stay signed in" action
   */
  const handleStaySignedIn = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  /**
   * Handle "Log out now" action
   */
  const handleLogoutNow = useCallback(async () => {
    await handleAutoLogout('inactivity');
  }, [handleAutoLogout]);

  /**
   * Check if Supabase session is expired
   * This is the primary mechanism - if session is expired, logout immediately
   */
  const checkSessionExpiration = useCallback(async () => {
    if (!enabled || !user || isLoggingOutRef.current) return;

    try {
      const expired = await isSessionExpired();
      if (expired) {
        console.log('[SessionTimeout] Session expired, logging out...');
        await handleAutoLogout('session_expired');
      }
    } catch (error) {
      console.error('[SessionTimeout] Error checking session expiration:', error);
      // On error, assume session is expired for safety
      await handleAutoLogout('session_expired');
    }
  }, [enabled, user, handleAutoLogout]);

  /**
   * Listen for cross-tab activity updates
   */
  useEffect(() => {
    if (!enabled || !user) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastActivity' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
        warningShownRef.current = false;
      }
      
      // Handle logout from another tab
      if (e.key === 'sessionLogout') {
        handleAutoLogout('inactivity');
      }
    };

    // Also listen for custom events (for same-tab communication)
    const handleCustomStorage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === 'lastActivity' && customEvent.detail?.value) {
        lastActivityRef.current = parseInt(customEvent.detail.value, 10);
        warningShownRef.current = false;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sessionActivity', handleCustomStorage as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sessionActivity', handleCustomStorage as EventListener);
    };
  }, [enabled, user, handleAutoLogout]);

  /**
   * Track user activity events
   */
  useEffect(() => {
    if (!enabled || !user) return;

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Track API activity via fetch interception
    const originalFetch = window.fetch;
    const interceptedFetch = async (...args: Parameters<typeof fetch>) => {
      handleActivity();
      return originalFetch(...args);
    };
    window.fetch = interceptedFetch;

    // Initialize last activity from localStorage if available
    const storedActivity = localStorage.getItem('lastActivity');
    if (storedActivity) {
      lastActivityRef.current = parseInt(storedActivity, 10);
    } else {
      updateActivity();
    }

    // Check inactivity every 30 seconds
    activityCheckIntervalRef.current = setInterval(checkInactivity, 30000);

    // Check session expiration every minute (primary mechanism)
    sessionCheckIntervalRef.current = setInterval(checkSessionExpiration, SESSION_CHECK_INTERVAL);

    // Initial session check
    checkSessionExpiration();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.fetch = originalFetch;
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [enabled, user, handleActivity, checkInactivity, updateActivity, checkSessionExpiration]);

  return {
    handleStaySignedIn,
    handleLogoutNow,
    updateActivity,
  };
}

