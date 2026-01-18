/**
 * Session Timeout Hook
 * 
 * Tracks user activity and manages automatic logout after inactivity.
 * 
 * SECURITY REQUIREMENTS:
 * - Auto logout after 30 minutes of inactivity
 * - Inactivity = no user interaction or API activity
 * - Clear authentication state on logout
 * - Sync logout across tabs
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const INACTIVITY_WARNING_TIME = 28 * 60 * 1000; // 28 minutes (2 minutes before logout)
const INACTIVITY_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes

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
  const router = useRouter();
  const { signOut, user } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  const checkInactivity = useCallback(() => {
    if (!enabled || !user) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // Show warning at 28 minutes (2 minutes before logout)
    if (timeSinceActivity >= INACTIVITY_WARNING_TIME && !warningShownRef.current) {
      warningShownRef.current = true;
      onWarning?.();
    }

    // Auto logout at 30 minutes
    if (timeSinceActivity >= INACTIVITY_LOGOUT_TIME) {
      handleAutoLogout();
    }
  }, [enabled, user, onWarning]);

  /**
   * Handle automatic logout
   */
  const handleAutoLogout = useCallback(async () => {
    // Clear all timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
    }

    // Clear localStorage
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('sessionWarningShown');

    // Sign out
    await signOut();
    
    // Notify other tabs
    localStorage.setItem('sessionLogout', Date.now().toString());
    localStorage.removeItem('sessionLogout');

    // Redirect to landing page (not login) to avoid confusion
    // User can see the landing page and choose to login again
    router.push('/?timeout=true');
    
    onLogout?.();
  }, [signOut, router, onLogout]);

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
    await handleAutoLogout();
  }, [handleAutoLogout]);

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
        handleAutoLogout();
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

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.fetch = originalFetch;
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
    };
  }, [enabled, user, handleActivity, checkInactivity, updateActivity]);

  return {
    handleStaySignedIn,
    handleLogoutNow,
    updateActivity,
  };
}

