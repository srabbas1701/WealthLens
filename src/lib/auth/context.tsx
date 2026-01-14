/**
 * Authentication Context Provider
 * 
 * SINGLE SOURCE OF TRUTH for authentication state.
 * 
 * AUTH STATE MANAGEMENT:
 * - authStatus: 'loading' → Auth state is being determined (NO REDIRECTS)
 * - authStatus: 'unauthenticated' → User is not authenticated (can redirect to login)
 * - authStatus: 'authenticated' → User is authenticated (can redirect to dashboard/onboarding)
 * 
 * RULES:
 * - NEVER redirect while authStatus === 'loading'
 * - NEVER infer auth from multiple sources (only use authStatus from context)
 * - ALWAYS wait for authStatus !== 'loading' before making routing decisions
 * - DEMO MODE does NOT imply authenticated state (demo routes are separate)
 * 
 * LOGIN FLOW:
 * 1. User authenticates (OTP/Magic Link)
 * 2. Supabase creates session
 * 3. onAuthStateChange fires SIGNED_IN event
 * 4. fetchUserData() refreshes user profile and portfolio status
 * 5. authStatus set to 'authenticated'
 * 6. Component can now safely redirect based on authStatus
 * 
 * LOGOUT FLOW:
 * 1. Call signOut()
 * 2. Clear all frontend state immediately
 * 3. Clear client-side cache (localStorage)
 * 4. Call Supabase signOut() (clears backend session)
 * 5. onAuthStateChange fires SIGNED_OUT event
 * 6. authStatus set to 'unauthenticated'
 * 7. Redirect to home/login
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

// Auth method tracking for progressive data collection
type AuthMethod = 'mobile' | 'email' | null;

// Explicit auth status - SINGLE SOURCE OF TRUTH
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthSessionState {
  authStatus: AuthStatus;
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
}

interface AuthAppDataState {
  profile: UserProfile | null;
  hasPortfolio: boolean;
  primaryPortfolioId: string | null;
  hasCompletedOnboarding: boolean;
  portfolioCheckComplete: boolean;
  authMethod: AuthMethod;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  refreshProfile: () => Promise<void>;
}

interface AuthState extends AuthSessionState, AuthAppDataState {
  // Auth methods
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  sendEmailVerification: (email: string) => Promise<{ error: Error | null }>;
  sendPhoneVerification: (phone: string) => Promise<{ error: Error | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  // Internal: used by useAuthAppData to trigger lazy loading
  _loadAppData?: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // SESSION STATE: Fast initialization (no database queries)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // APP DATA STATE: Only fetched when useAuthAppData() is called
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [primaryPortfolioId, setPrimaryPortfolioId] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [portfolioCheckComplete, setPortfolioCheckComplete] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  
  // Track if app data has been requested (lazy loading)
  const [appDataRequested, setAppDataRequested] = useState(false);
  const [appDataLoading, setAppDataLoading] = useState(false);
  
  const supabase = createClient();
  
  /**
   * Determine auth method from user data
   */
  const determineAuthMethod = useCallback((user: User | null): AuthMethod => {
    if (!user) return null;
    if (user.phone) return 'mobile';
    if (user.email) return 'email';
    return null;
  }, []);
  
  /**
   * Clear all auth-related client-side cache
   */
  const clearAuthCache = useCallback(() => {
    // Clear all localStorage items that might be auth-related
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('onboarding_') ||
        key.startsWith('session') ||
        key === 'lastActivity' ||
        key === 'sessionWarningShown' ||
        key === 'sessionLogout' ||
        key.startsWith('auth_') ||
        key.startsWith('supabase.')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also clear sessionStorage
    sessionStorage.clear();
  }, []);
  
  /**
   * Fetch user profile and portfolio status from database
   * Called after successful authentication
   */
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        const isNotFound = profileError.code === 'PGRST116' || profileError.code === '406' || profileError.message?.includes('406');
        
        if (isNotFound) {
          console.log('[Auth] User profile not found - will be created during onboarding');
          setProfile(null);
        } else {
          console.error('[Auth] Error fetching profile:', profileError);
          setProfile(null);
        }
      } else {
        setProfile(profileData || null);
      }
      
      // Fetch primary portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();
      
      if (portfolioError) {
        const isNotFound = portfolioError.code === 'PGRST116' || portfolioError.code === '406' || portfolioError.message?.includes('406');
        if (!isNotFound) {
          console.error('[Auth] Error fetching portfolio:', portfolioError);
        }
        setHasPortfolio(false);
        setPrimaryPortfolioId(null);
      } else {
        setHasPortfolio(!!portfolioData);
        setPrimaryPortfolioId(portfolioData?.id || null);
      }
      
      // Mark portfolio check as complete
      setPortfolioCheckComplete(true);
      
      // Check onboarding completion
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('onboarding_snapshots')
        .select('is_complete')
        .eq('user_id', userId)
        .single();
      
      if (onboardingError) {
        const isNotFound = onboardingError.code === 'PGRST116' || onboardingError.code === '406' || onboardingError.message?.includes('406');
        if (!isNotFound) {
          console.error('[Auth] Error fetching onboarding status:', onboardingError);
        }
      }
      
      setHasCompletedOnboarding(onboardingData?.is_complete || false);
      
    } catch (error) {
      console.error('[Auth] Error fetching user data:', error);
      // Reset to safe defaults on error
      setProfile(null);
      setHasPortfolio(false);
      setPrimaryPortfolioId(null);
      setHasCompletedOnboarding(false);
      setPortfolioCheckComplete(true); // Mark as complete even on error
    }
  }, [supabase]);
  
  /**
   * Update verification status based on user and profile data
   */
  const updateVerificationStatus = useCallback((user: User | null, profile: UserProfile | null) => {
    const emailVerified = !!user?.email_confirmed_at || !!profile?.email_verified_at;
    setIsEmailVerified(emailVerified);
    
    const phoneVerified = !!user?.phone_confirmed_at || !!profile?.phone_verified_at;
    setIsPhoneVerified(phoneVerified);
  }, []);
  
  /**
   * Refresh user profile data
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
      setAuthMethod(determineAuthMethod(user));
    }
  }, [user, fetchUserData, determineAuthMethod]);
  
  /**
   * Initialize SESSION state only (fast, no database queries)
   * App data (profile, portfolio) is fetched lazily when useAuthAppData() is called
   */
  useEffect(() => {
    let isMounted = true;
    
    async function initAuthSession() {
      setAuthStatus('loading');
      
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!isMounted) return;
      
      if (session) {
        setSession(session);
        setUser(session.user);
        setAuthStatus('authenticated');
        // NOTE: App data (profile, portfolio) is NOT fetched here
        // It will be fetched lazily when useAuthAppData() is called
      } else {
        setSession(null);
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    }
    
    initAuthSession();
    
    // Listen for auth changes (SINGLE SOURCE OF TRUTH)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('[Auth] Auth state change:', event);
      
      if (session) {
        setSession(session);
        setUser(session.user);
        
        setAuthStatus('authenticated');
        // NOTE: App data is fetched lazily when useAuthAppData() is called
        // If app data was already requested, refresh it after sign in
        if (event === 'SIGNED_IN' && appDataRequested && session.user) {
          setAppDataLoading(true);
          try {
            await fetchUserData(session.user.id);
            setAuthMethod(determineAuthMethod(session.user));
          } catch (fetchError) {
            console.error('[Auth] Error fetching user data after sign in:', fetchError);
          } finally {
            setAppDataLoading(false);
          }
        }
      } else {
        // SIGNED_OUT or no session
        setSession(null);
        setUser(null);
        setProfile(null);
        setHasPortfolio(false);
        setPrimaryPortfolioId(null);
        setHasCompletedOnboarding(false);
        setAuthMethod(null);
        setIsEmailVerified(false);
        setIsPhoneVerified(false);
        setPortfolioCheckComplete(false);
        setAuthStatus('unauthenticated');
      }
    });
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, appDataRequested, fetchUserData, determineAuthMethod]);
  
  /**
   * Lazy load app data (profile, portfolio, onboarding)
   * Only called when useAuthAppData() is invoked
   */
  const loadAppData = useCallback(async () => {
    if (!user?.id || appDataRequested || appDataLoading) {
      return; // Already loaded or loading
    }
    
    setAppDataRequested(true);
    setAppDataLoading(true);
    setPortfolioCheckComplete(false);
    
    try {
      await fetchUserData(user.id);
      setAuthMethod(determineAuthMethod(user));
    } catch (fetchError) {
      console.error('[Auth] Error loading app data:', fetchError);
      setPortfolioCheckComplete(true);
    } finally {
      setAppDataLoading(false);
    }
  }, [user, appDataRequested, appDataLoading, fetchUserData, determineAuthMethod]);
  
  // Auto-load app data when user becomes available and app data is requested
  useEffect(() => {
    if (user?.id && appDataRequested && !appDataLoading && !portfolioCheckComplete) {
      loadAppData();
    }
  }, [user?.id, appDataRequested, appDataLoading, portfolioCheckComplete, loadAppData]);
  
  /**
   * Send magic link to email for passwordless login
   */
  const sendMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Sign out - LOGOUT FLOW
   * 1. Clear frontend state immediately
   * 2. Clear client-side cache
   * 3. Call backend logout (clears backend session)
   * 4. State will be cleared by onAuthStateChange SIGNED_OUT event
   */
  const signOut = async () => {
    console.log('[Auth] Signing out...');
    
    // Step 1: Clear all frontend state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    setHasPortfolio(false);
    setPrimaryPortfolioId(null);
    setHasCompletedOnboarding(false);
    setAuthMethod(null);
    setIsEmailVerified(false);
    setIsPhoneVerified(false);
    setPortfolioCheckComplete(false);
    setAuthStatus('unauthenticated'); // Auth state resolved (unauthenticated)
    
    // Step 2: Clear client-side cache
    clearAuthCache();
    
    // Step 3: Call backend logout (clears backend session)
    // This will trigger onAuthStateChange SIGNED_OUT event
    await supabase.auth.signOut();
    
    console.log('[Auth] Sign out complete');
  };
  
  /**
   * Send OTP to mobile number
   */
  const sendOtp = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
        },
      });
      
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Verify OTP for mobile number
   * On success, Supabase creates session and onAuthStateChange fires SIGNED_IN
   */
  const verifyOtp = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      
      // If successful, onAuthStateChange will fire SIGNED_IN event
      // which will trigger fetchUserData and set authStatus to 'authenticated'
      
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Send email verification for secondary contact
   */
  const sendEmailVerification = async (email: string) => {
    if (!user?.id) {
      return { error: new Error('Not authenticated') };
    }
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, user_id: user.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return { error: new Error(data.error || 'Failed to send verification email') };
      }
      
      await refreshProfile();
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Send phone verification OTP for secondary contact
   */
  const sendPhoneVerification = async (phone: string) => {
    if (!user?.id) {
      return { error: new Error('Not authenticated') };
    }
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          phone_number: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, user_id: user.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return { error: new Error(data.error || 'Failed to send verification OTP') };
      }
      
      await refreshProfile();
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Verify phone OTP for secondary contact
   */
  const verifyPhoneOtp = async (phone: string, token: string) => {
    if (!user?.id) {
      return { error: new Error('Not authenticated') };
    }
    
    try {
      const response = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, token, user_id: user.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return { error: new Error(data.error || 'Invalid OTP') };
      }
      
      await refreshProfile();
      setIsPhoneVerified(true);
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Update user profile
   */
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user?.id) {
      return { error: new Error('Not authenticated') };
    }
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      
      await refreshProfile();
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  // Update verification status when profile changes
  useEffect(() => {
    updateVerificationStatus(user, profile);
  }, [user, profile, updateVerificationStatus]);
  
  // TEMPORARY: Log authStatus changes
  useEffect(() => {
    console.log("🔐 authStatus:", authStatus);
  }, [authStatus]);
  
  const value: AuthState = {
    authStatus,
    user,
    session,
    profile,
    hasPortfolio,
    primaryPortfolioId,
    portfolioCheckComplete,
    hasCompletedOnboarding,
    authMethod,
    isEmailVerified,
    isPhoneVerified,
    sendMagicLink,
    sendOtp,
    verifyOtp,
    sendEmailVerification,
    sendPhoneVerification,
    verifyPhoneOtp,
    updateProfile,
    signOut,
    refreshProfile,
    // Internal: used by useAuthAppData to trigger lazy loading
    _loadAppData: loadAppData,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access full auth context (backward compatibility)
 * WARNING: This triggers app data loading. Use useAuthSession() on landing page.
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook for SESSION state only (safe for landing page)
 * Returns: authStatus, user, session, signOut
 * Does NOT trigger portfolio/onboarding queries
 * Use this on landing page (/) and demo routes
 */
export function useAuthSession(): AuthSessionState {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthSession must be used within an AuthProvider');
  }
  
  return {
    authStatus: context.authStatus,
    user: context.user,
    session: context.session,
    signOut: context.signOut,
  };
}

/**
 * Hook for APP DATA (profile, portfolio, onboarding)
 * Triggers lazy loading of app data ONLY when called on app routes
 * Safe to call on all routes, but only loads data on app routes
 */
export function useAuthAppData(): AuthAppDataState {
  const context = useContext(AuthContext);
  const pathname = usePathname();
  
  if (context === undefined) {
    throw new Error('useAuthAppData must be used within an AuthProvider');
  }
  
  // Only trigger lazy loading on app routes
  const isAppRoute = pathname?.startsWith('/dashboard') 
    || pathname?.startsWith('/portfolio')
    || pathname?.startsWith('/holdings');
  
  // Trigger lazy loading only on app routes
  useEffect(() => {
    if (isAppRoute && context._loadAppData && context.user?.id) {
      context._loadAppData();
    }
  }, [isAppRoute, context._loadAppData, context.user?.id]);
  
  return {
    profile: context.profile,
    hasPortfolio: context.hasPortfolio,
    primaryPortfolioId: context.primaryPortfolioId,
    hasCompletedOnboarding: context.hasCompletedOnboarding,
    portfolioCheckComplete: context.portfolioCheckComplete,
    authMethod: context.authMethod,
    isEmailVerified: context.isEmailVerified,
    isPhoneVerified: context.isPhoneVerified,
    refreshProfile: context.refreshProfile,
  };
}

/**
 * Hook to determine where user should be redirected
 * GUARD: Only returns redirect info after authStatus !== 'loading'
 */
export function useAuthRedirect(): {
  shouldRedirect: boolean;
  redirectPath: string | null;
  isLoading: boolean;
} {
  const { authStatus, user, hasPortfolio, hasCompletedOnboarding } = useAuth();
  
  // GUARD: Never redirect while loading
  if (authStatus === 'loading') {
    return { shouldRedirect: false, redirectPath: null, isLoading: true };
  }
  
  // Auth state resolved - can make routing decisions
  if (authStatus === 'unauthenticated') {
    return { shouldRedirect: false, redirectPath: null, isLoading: false };
  }
  
  // Authenticated but no portfolio and hasn't completed onboarding → onboarding
  if (!hasPortfolio && !hasCompletedOnboarding) {
    return { shouldRedirect: true, redirectPath: '/onboarding', isLoading: false };
  }
  
  // Authenticated with portfolio → dashboard
  if (hasPortfolio) {
    return { shouldRedirect: true, redirectPath: '/dashboard', isLoading: false };
  }
  
  return { shouldRedirect: false, redirectPath: null, isLoading: false };
}
