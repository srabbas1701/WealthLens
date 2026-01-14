'use client';

import { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FileIcon, UserIcon, LogOutIcon, ChevronDownIcon, ShieldCheckIcon, SparklesIcon } from '@/components/icons';
import { useAuthSession, useAuthAppData } from '@/lib/auth';
import LogoutConfirmationModal from './LogoutConfirmationModal';
import { type CurrencyFormat } from '@/lib/currency/formatCurrency';
import { useCurrency } from '@/lib/currency/useCurrency';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoLockup } from '@/components/LogoLockup';

interface CurrencyContextType {
  format: CurrencyFormat;
  setFormat: (format: CurrencyFormat) => void;
}

// Export CurrencyContext so useCurrency hook can access it
export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [format, setFormat] = useState<CurrencyFormat>('raw');

  // Load format from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('currencyFormat') as CurrencyFormat;
    if (saved && ['raw', 'lacs', 'crores'].includes(saved)) {
      setFormat(saved);
    }
  }, []);

  // Save format to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('currencyFormat', format);
  }, [format]);

  return (
    <CurrencyContext.Provider value={{ format, setFormat }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Re-export useCurrency from lib/currency for backward compatibility
// This allows existing imports from '@/components/AppHeader' to continue working
export { useCurrency };

interface AppHeaderProps {
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  showDownload?: boolean;
  onDownload?: () => void;
  isDemoMode?: boolean; // If true, shows Sign In instead of Account menu
}

export function AppHeader({ 
  showBackButton = false, 
  backHref = '/dashboard',
  backLabel = 'Back to Dashboard',
  showDownload = false,
  onDownload,
  isDemoMode = false, // Default to false, will be auto-detected if not provided
}: AppHeaderProps) {
  // CRITICAL: Get pathname FIRST - before accessing portfolio state
  const pathname = usePathname();
  
  // Determine if we're on the landing page or demo routes
  // These routes should NEVER depend on portfolio/onboarding state for rendering
  const isLandingPage = pathname === '/';
  const isInDemoMode = isDemoMode || (typeof window !== 'undefined' && pathname?.startsWith('/demo'));
  
  // Determine if we're on an app route (dashboard or portfolio pages)
  // These routes should show currency selector when authenticated
  const isAppRoute = pathname?.startsWith('/dashboard') 
    || pathname?.startsWith('/portfolio');
  
  // CRITICAL: Use useAuthSession() on landing/demo routes (no portfolio queries)
  // Use useAuthAppData() ONLY on app routes (triggers portfolio queries)
  // Note: We can't conditionally call hooks, so we call both but only use appData on app routes
  const sessionData = useAuthSession(); // Safe for all routes - no queries
  const appData = useAuthAppData(); // Triggers queries, but we only use it on app routes
  
  const user = sessionData.user;
  const authStatus = sessionData.authStatus;
  const signOut = sessionData.signOut;
  // Only use hasPortfolio on app routes (landing page doesn't need it)
  const hasPortfolio = (isLandingPage || isInDemoMode) ? false : (appData.hasPortfolio || false);
  
  const { format, setFormat } = useCurrency();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside (must be before early return)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // EARLY RETURN GUARD: Landing page and demo routes
  // Return simple header that doesn't depend on portfolio/onboarding state
  // This ensures / loads instantly without waiting for portfolio queries
  if (isLandingPage || isInDemoMode) {
    const handleLogout = async () => {
      setShowLogoutModal(false);
      setShowUserMenu(false);
      try {
        await signOut();
      } catch (error) {
        console.error('[AppHeader] Error during logout:', error);
        // Continue with redirect even if signOut fails
      } finally {
        // Force immediate full page navigation to login to ensure clean state
        // This ensures redirect happens even if signOut() throws an error
        window.location.href = '/login';
      }
    };

    // Return landing/demo header (no portfolio dependencies)
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <LogoLockup />
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors font-medium">
              Features
            </a>
            <a href="#trust" className="text-sm text-[#6B7280] hover:text-[#0F172A] transition-colors font-medium">
              Trust
            </a>
            <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#0F172A] transition-colors font-medium">
              Pricing
            </a>
          </nav>

          {/* Right: Navigation and Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Show Account menu only when authenticated (not in demo mode) */}
            {!isInDemoMode && authStatus === 'authenticated' && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg text-[#6B7280] dark:text-[#94A3B8] text-sm font-medium hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                >
                  Dashboard
                </Link>
                
                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] dark:bg-[#EFF6FF] text-white dark:text-[#1E3A8A] text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#DBEAFE] transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Account</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] shadow-lg py-1 z-50">
                      <Link
                        href="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left"
                      >
                        <UserIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                        <span>Account Settings</span>
                      </Link>
                      <Link
                        href="/security"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left"
                      >
                        <ShieldCheckIcon className="w-4 h-4 text-[#6B7280]" />
                        <span>Security</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowLogoutModal(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left"
                      >
                        <LogOutIcon className="w-4 h-4 text-[#6B7280]" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-[#6B7280] dark:text-[#94A3B8] text-sm font-medium hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-2 rounded-lg bg-[#2563EB] dark:bg-[#EFF6FF] text-white dark:text-[#1E3A8A] text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#DBEAFE] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        <LogoutConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      </header>
    );
  }
  
  // BELOW THIS POINT: App routes only (dashboard, portfolio, etc.)
  // These routes CAN use portfolio/onboarding state

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setShowUserMenu(false);
    
    try {
      // LOGOUT FLOW:
      // 1. Call signOut (clears state and cache)
      // 2. Redirect to login immediately to avoid conflicts with page guards
      await signOut();
    } catch (error) {
      console.error('[AppHeader] Error during logout:', error);
      // Continue with redirect even if signOut fails
    } finally {
      // Force immediate full page navigation to login to ensure clean state
      // This ensures redirect happens even if signOut() throws an error
      window.location.href = '/login';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo and Back Button */}
        <div className="flex items-center gap-4">
          <LogoLockup />
          
          {showBackButton && (
            <Link 
              href={backHref}
              className="flex items-center gap-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors ml-4 pl-4 border-l border-[#E5E7EB] dark:border-[#334155]"
            >
              <span className="text-sm font-medium">{backLabel}</span>
            </Link>
          )}
        </div>

        {/* Center: Currency Format Selector (only show on app routes when authenticated and has portfolio) */}
        {isAppRoute && authStatus === 'authenticated' && user && hasPortfolio && (
          <div className="flex items-center gap-2 bg-[#F6F8FB] dark:bg-[#1E293B] rounded-lg p-1">
            <button
              onClick={() => setFormat('raw')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                format === 'raw'
                  ? 'bg-white dark:bg-[#334155] text-[#2563EB] dark:text-[#60A5FA] shadow-sm'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => setFormat('lacs')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                format === 'lacs'
                  ? 'bg-white text-[#2563EB] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#0F172A]'
              }`}
            >
              Lacs
            </button>
            <button
              onClick={() => setFormat('crores')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                format === 'crores'
                  ? 'bg-white text-[#2563EB] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#0F172A]'
              }`}
            >
              Crores
            </button>
          </div>
        )}

        {/* Right: Navigation and Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {showDownload && (
            <button
              onClick={onDownload || (() => {})}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
            >
              <FileIcon className="w-4 h-4" />
              Download
            </button>
          )}
          
          {/* Show Account menu only when authenticated (not in demo mode) */}
          {!isInDemoMode && authStatus === 'authenticated' && user ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-[#6B7280] dark:text-[#94A3B8] text-sm font-medium hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
              >
                Dashboard
              </Link>
              
              {/* Help / Portfolio Analyst Button - Prominent placement in header */}
              <button
                onClick={() => {
                  // Always dispatch event first (works if copilot is already mounted)
                  window.dispatchEvent(new CustomEvent('openCopilot'));
                  
                  // If not on dashboard, navigate to dashboard - the URL param will trigger copilot
                  if (!pathname?.startsWith('/dashboard')) {
                    router.push('/dashboard?openHelp=true');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md"
                aria-label="Open Portfolio Analyst Help"
                title="Get help with your portfolio"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Help</span>
              </button>
              
              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Account</span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] shadow-lg py-1 z-50">
                    <Link
                      href="/account"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left"
                    >
                      <UserIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                      <span>Account Settings</span>
                    </Link>
                    <Link
                      href="/security"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left"
                    >
                      <ShieldCheckIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                      <span>Security</span>
                    </Link>
                    <button
                      onClick={() => {
                        setShowLogoutModal(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left"
                    >
                      <LogOutIcon className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-[#6B7280] dark:text-[#94A3B8] text-sm font-medium hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-5 py-2 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}

