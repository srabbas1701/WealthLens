'use client';

/**
 * Dashboard Page
 *
 * The main portfolio view - answers three questions:
 * 1. "Am I okay?"
 * 2. "What changed?"
 * 3. "Do I need to do anything?"
 *
 * USER FLOW:
 * - Only accessible to authenticated users WITH a portfolio
 * - Users without portfolio are redirected to /onboarding
 * - Uses real Supabase authentication
 *
 * DESIGN PRINCIPLES:
 * - Calm, neutral, reassuring
 * - No urgency or red/green flashing
 * - No trading language
 * - AI-first summary at top
 * - TRANSPARENT: All investments visible for verification
 *
 * DATA FLOW:
 * - Portfolio data fetched from /api/portfolio/data
 * - AI summaries fetched from /api/copilot/daily-summary and weekly-summary
 * - Frontend renders API responses VERBATIM (no recalculation)
 *
 * TRANSPARENCY FEATURES:
 * - "All Investments" section shows every holding
 * - Grouped views by Asset Type, Instrument, Sector
 * - Shows: Name | Asset Type | Quantity | Avg Price | Invested Value | % of Portfolio
 * - Users can verify totals match sum of holdings
 */

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  TrendingUpIcon,
  WalletIcon,
  TargetIcon,
  ShieldCheckIcon,
  BellIcon,
  UserIcon,
  InfoIcon,
  CalendarIcon,
  LogOutIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  PlusIcon,
  UploadIcon,
  EditIcon,
} from '@/components/icons';
import FloatingCopilot from '@/components/FloatingCopilot';
import PortfolioUploadModal from '@/components/PortfolioUploadModal';
import ManualInvestmentModal from '@/components/ManualInvestmentModal';
import PPFAddModal from '@/components/PPFAddModal';
import NPSAddModal from '@/components/NPSAddModal';
import EPFAddModal from '@/components/EPFAddModal';
import GoldAddModal from '@/components/GoldAddModal';
import VerificationBanner from '@/components/VerificationBanner';
import InsightsLimitBanner from '@/components/InsightsLimitBanner';
import OnboardingHint from '@/components/OnboardingHint';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CategoryInfoTooltip } from '@/components/CategoryInfoTooltip';
import { useWebVitals } from '@/hooks/useWebVitals';
import { useAuth, useAuthAppData } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { aggregatePortfolioData, validatePortfolioData } from '@/lib/portfolio-aggregation';
import type { DailySummaryResponse, WeeklySummaryResponse, Status, RiskAlignmentStatus } from '@/types/copilot';
import { calculateXIRRFromHoldings, formatXIRR } from '@/lib/xirr-calculator';
import { fetchPortfolioHealthScore } from '@/services/portfolioAnalytics';
import type { PortfolioHealthScore } from '@/lib/portfolio-intelligence/health-score';

// ============================================================================
// TYPES
// ============================================================================

interface HoldingDetail {
  id: string;
  name: string;
  symbol: string | null;
  isin: string | null;
  assetType: string;
  quantity: number;
  averagePrice: number;
  investedValue: number;
  currentValue: number;
  allocationPct: number;
  sector: string | null;
  assetClass: string | null;
  topLevelBucket: string | null;
  riskBehavior: string | null;
}

// PortfolioHealthScore type imported from health-score module

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
  value: number;
}

interface PortfolioData {
  metrics: {
    netWorth: number;
    netWorthChange: number;
    riskScore: number;
    riskLabel: string;
    goalAlignment: number;
  };
  allocation: AllocationItem[];
  holdings: HoldingDetail[];
  topHoldings: HoldingDetail[];
  insights: { id: number; type: 'info' | 'opportunity' | 'warning'; title: string; description: string }[];
  hasData: boolean;
  summary: {
    totalHoldings: number;
    totalAssetTypes: number;
    largestHoldingPct: number;
    lastUpdated: string | null;
    createdAt: string | null;
  };
}

type GroupByOption = 'none' | 'assetType' | 'sector';

// ============================================================================
// COMPONENTS
// ============================================================================

// Status badge component
function StatusBadge({ status }: { status: Status }) {
  const config = {
    no_action_required: {
      bg: 'bg-[#DCFCE7] dark:bg-[#14532D]',
      border: 'border-[#16A34A] dark:border-[#22C55E]',
      text: 'text-[#166534] dark:text-[#86EFAC]',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      label: 'No action needed',
    },
    monitor: {
      bg: 'bg-[#EFF6FF] dark:bg-[#1E3A8A]',
      border: 'border-[#2563EB] dark:border-[#3B82F6]',
      text: 'text-[#1E40AF] dark:text-[#93C5FD]',
      icon: <AlertTriangleIcon className="w-4 h-4" />,
      label: 'Worth monitoring',
    },
    attention_required: {
      bg: 'bg-[#FEF3C7] dark:bg-[#78350F]',
      border: 'border-[#F59E0B] dark:border-[#FBBF24]',
      text: 'text-[#92400E] dark:text-[#FCD34D]',
      icon: <AlertTriangleIcon className="w-4 h-4" />,
      label: 'Review suggested',
    },
  };
  
  const { bg, border, text, icon, label } = config[status];
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${bg} ${border} ${text} rounded-lg border`}>
      <div className={text}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${text}`}>{label}</span>
    </div>
  );
}

// Default empty state
const EMPTY_PORTFOLIO: PortfolioData = {
  metrics: {
    netWorth: 0,
    netWorthChange: 0,
    riskScore: 0,
    riskLabel: 'Not Set',
    goalAlignment: 0,
  },
  allocation: [],
  insights: [{
    id: 1,
    type: 'info' as const,
    title: 'Upload your portfolio to get started',
    description: 'Import your holdings from a CSV or Excel file to see personalized insights.',
  }],
  holdings: [],
  topHoldings: [],
  hasData: false,
  summary: {
    totalHoldings: 0,
    totalAssetTypes: 0,
    largestHoldingPct: 0,
    lastUpdated: null,
    createdAt: null,
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DashboardContent() {
  // Web Vitals Monitoring - tracks performance metrics
  useWebVitals();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, authStatus, signOut } = useAuth();
  // CRITICAL: useAuthAppData triggers lazy loading of portfolio/profile data
  // This MUST be called on dashboard route for hasPortfolio/portfolioCheckComplete to work
  const { profile, hasPortfolio, portfolioCheckComplete } = useAuthAppData();
  const { formatCurrency } = useCurrency();
  const redirectAttemptedRef = useRef(false);
  const fetchingRef = useRef(false); // Prevent duplicate simultaneous portfolio fetches
  const fetchingAiSummaryRef = useRef(false); // Prevent duplicate AI summary fetches
  const fetchingWeeklySummaryRef = useRef(false); // Prevent duplicate weekly summary fetches
  
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  
  // Portfolio data state
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(EMPTY_PORTFOLIO);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState<DailySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState(false);
  
  // Copilot state
  const [copilotInitialMessage, setCopilotInitialMessage] = useState<string | undefined>(undefined);
  const [copilotIsOpen, setCopilotIsOpen] = useState(false);
  
  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Manual investment modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // Price update state
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateSuccess, setPriceUpdateSuccess] = useState(false);
  
  // PPF Add modal state
  const [isPPFModalOpen, setIsPPFModalOpen] = useState(false);
  
  // NPS Add modal state
  const [isNPSModalOpen, setIsNPSModalOpen] = useState(false);
  
  // EPF Add modal state
  const [isEPFModalOpen, setIsEPFModalOpen] = useState(false);
  
  // Gold Add modal state
  const [isGoldModalOpen, setIsGoldModalOpen] = useState(false);
  
  // User dropdown state
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Portfolio Allocation chart hover state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // All Investments section state
  const [showAllInvestments, setShowAllInvestments] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  
  // Expanded insights state
  const [expandedInsightId, setExpandedInsightId] = useState<number | null>(null);
  
  // Expanded bucket state for drill-down
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  
  // Portfolio Health Score expanded state
  const [healthScoreExpanded, setHealthScoreExpanded] = useState(false);
  
  // Portfolio Health Score state (fetched from API)
  const [portfolioHealthScore, setPortfolioHealthScore] = useState<PortfolioHealthScore | null>(null);
  const [healthScoreLoading, setHealthScoreLoading] = useState(false);

  // PERMANENT FIX: Simplified - use portfolioCheckComplete as single source of truth
  // Removed portfolioCheckTimeout to eliminate race conditions
  const hasValidSession = !!user && !!user.id;

  // Track onboarding progress
  useEffect(() => {
    if (!user) return;

    // Mark portfolio as viewed when dashboard loads
    const viewedKey = `onboarding_viewed_portfolio_${user.id}`;
    if (!localStorage.getItem(viewedKey)) {
      localStorage.setItem(viewedKey, 'true');
    }
  }, [user]);

  // Track when insights are viewed
  useEffect(() => {
    if (!user || !portfolioData.hasData) return;

    // Mark insights as viewed when user expands an insight
    if (expandedInsightId !== null) {
      const viewedKey = `onboarding_viewed_insights_${user.id}`;
      if (!localStorage.getItem(viewedKey)) {
        localStorage.setItem(viewedKey, 'true');
      }
    }
  }, [user, expandedInsightId, portfolioData.hasData]);

  // Set greeting and user name
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    // Use profile name if available
    if (profile?.full_name) {
      setUserName(profile.full_name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    }
  }, [profile, user]);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    // GUARD: Block redirects during loading
    if (authStatus === 'loading') return;
    
    // Auth state resolved - check authentication
    if (authStatus === 'unauthenticated') {
      // Unauthenticated - redirect to login
      router.replace('/login?redirect=/dashboard');
    }
  }, [authStatus, router]);

  // GUARD: Redirect if no portfolio
  // OPTIMIZATION: Simplified redirect logic to prevent blocking renders
  useEffect(() => {
    // CRITICAL: Only run redirect logic if we're actually on the dashboard route
    if (pathname !== '/dashboard') {
      redirectAttemptedRef.current = false;
      return;
    }
    
    // GUARD: Must have user and portfolio check must be complete
    if (!user?.id) {
      redirectAttemptedRef.current = false;
      return;
    }
    
    // OPTIMIZATION: Add timeout to prevent infinite waiting
    // If portfolio check takes too long, proceed anyway
    const redirectTimeout = setTimeout(() => {
      if (!portfolioCheckComplete && !redirectAttemptedRef.current) {
        console.warn('[Dashboard] Portfolio check timeout - proceeding with dashboard');
        // Don't redirect if check is taking too long - show dashboard instead
      }
    }, 5000); // 5 second timeout
    
    // GUARD: Wait for portfolio check to complete (or timeout)
    if (!portfolioCheckComplete) {
      return () => clearTimeout(redirectTimeout);
    }
    
    clearTimeout(redirectTimeout);
    
    // PERMANENT FIX: Clear redirect state when navigating from home page or header
    // Skip redirect checks if user explicitly navigated from home page
    const navigationSource = sessionStorage.getItem('navigation_source');
    const navigationTime = sessionStorage.getItem('navigation_time');
    const isFromHomePage = navigationSource === 'home' && navigationTime && (Date.now() - parseInt(navigationTime, 10)) < 10000; // Within 10 seconds
    
    if (navigationSource === 'home' || navigationSource === 'header') {
      console.log('[Dashboard] Cleared redirect state - navigated from', navigationSource);
      redirectAttemptedRef.current = false;
      const redirectKey = `dashboard_redirect_${user.id}`;
      localStorage.removeItem(redirectKey);
      sessionStorage.removeItem('navigation_source');
      sessionStorage.removeItem('navigation_time');
      
      // If coming from home page, skip redirect logic entirely (user explicitly clicked)
      // This prevents unnecessary redirects and improves loading speed
      if (isFromHomePage) {
        console.log('[Dashboard] Skipping redirect checks - user navigated from home page');
        return;
      }
    }
    
    // PERMANENT FIX: Simplified redirect logic - only redirect if:
    // 1. Portfolio check is complete
    // 2. No portfolio exists
    // 3. We haven't redirected recently (prevent loops)
    const redirectKey = `dashboard_redirect_${user.id}`;
    const redirectData = localStorage.getItem(redirectKey);
    const now = Date.now();
    
    let lastRedirectTime = 0;
    let redirectCount = 0;
    
    if (redirectData) {
      try {
        const parsed = JSON.parse(redirectData);
        lastRedirectTime = parsed.timestamp || 0;
        redirectCount = parsed.count || 0;
        if (parsed.expiresAt && now > parsed.expiresAt) {
          localStorage.removeItem(redirectKey);
          lastRedirectTime = 0;
          redirectCount = 0;
        }
      } catch (e) {
        localStorage.removeItem(redirectKey);
      }
    }
    
    const timeSinceRedirect = now - lastRedirectTime;
    
    // PERMANENT FIX: Simplified conditions
    if (!hasPortfolio && 
        portfolioCheckComplete && 
        !redirectAttemptedRef.current && 
        timeSinceRedirect > 10000 && // 10 seconds
        redirectCount < 3) {
      
      redirectAttemptedRef.current = true;
      redirectCount += 1;
      
      localStorage.setItem(redirectKey, JSON.stringify({
        timestamp: now,
        count: redirectCount,
        expiresAt: now + 60000
      }));
      
      console.log('[Dashboard] Redirecting to onboarding - no portfolio found');
      router.replace('/onboarding');
    } else if (hasPortfolio) {
      // Clear redirect data if portfolio exists
      redirectAttemptedRef.current = false;
      localStorage.removeItem(redirectKey);
    } else if (redirectCount >= 3) {
      // Stop redirecting after 3 attempts
      console.warn('[Dashboard] Too many redirects - stopping loop. Showing dashboard anyway.');
      localStorage.removeItem(redirectKey);
      redirectAttemptedRef.current = false;
    }
  }, [authStatus, user, hasPortfolio, portfolioCheckComplete, router, pathname]);

  // Fetch portfolio data
  // OPTIMIZATION: Added timeout and better error handling to prevent hanging
  const fetchPortfolioData = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches (React 18 dev mode causes double-calls)
    if (fetchingRef.current) {
      console.log('[Dashboard] Skipping duplicate portfolio fetch');
      return;
    }
    
    fetchingRef.current = true;
    setPortfolioLoading(true);
    
    // OPTIMIZATION: Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (fetchingRef.current) {
        console.warn('[Dashboard] Portfolio data fetch timeout after 10s');
        setPortfolioLoading(false);
        fetchingRef.current = false;
      }
    }, 10000);
    
    try {
      const params = new URLSearchParams({ user_id: userId });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for fetch
      
      const response = await fetch(`/api/portfolio/data?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPortfolioData(result.data);
        } else {
          console.warn('[Dashboard] Portfolio data fetch returned success=false:', result);
          // Set empty portfolio to prevent UI from hanging
          setPortfolioData(EMPTY_PORTFOLIO);
        }
      } else {
        console.error('[Dashboard] Portfolio data fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        // Set empty portfolio on error to prevent hanging
        setPortfolioData(EMPTY_PORTFOLIO);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn('[Dashboard] Portfolio data fetch aborted (timeout)');
      } else {
        console.error('[Dashboard] Failed to fetch portfolio data:', error);
      }
      // Set empty portfolio on error to prevent hanging
      setPortfolioData(EMPTY_PORTFOLIO);
    } finally {
      setPortfolioLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Fetch AI daily summary
  // OPTIMIZATION: Added timeout to prevent hanging
  const fetchAiSummary = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingAiSummaryRef.current) {
      return;
    }
    
    fetchingAiSummaryRef.current = true;
    setSummaryLoading(true);
    setSummaryError(false);
    
    // OPTIMIZATION: Add timeout
    const timeoutId = setTimeout(() => {
      if (fetchingAiSummaryRef.current) {
        console.warn('[Dashboard] AI summary fetch timeout');
        setSummaryLoading(false);
        setSummaryError(true);
        fetchingAiSummaryRef.current = false;
      }
    }, 8000);
    
    try {
      const params = new URLSearchParams({ user_id: userId });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout
      
      const response = await fetch(`/api/copilot/daily-summary?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data: DailySummaryResponse = await response.json();
        setAiSummary(data);
      } else {
        setSummaryError(true);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch AI daily summary:', error);
      }
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
      fetchingAiSummaryRef.current = false;
    }
  }, []);

  // Fetch AI weekly summary
  // OPTIMIZATION: Added timeout to prevent hanging
  const fetchWeeklySummary = useCallback(async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingWeeklySummaryRef.current) {
      return;
    }
    
    fetchingWeeklySummaryRef.current = true;
    setWeeklyLoading(true);
    setWeeklyError(false);
    
    // OPTIMIZATION: Add timeout
    const timeoutId = setTimeout(() => {
      if (fetchingWeeklySummaryRef.current) {
        console.warn('[Dashboard] Weekly summary fetch timeout');
        setWeeklyLoading(false);
        setWeeklyError(true);
        fetchingWeeklySummaryRef.current = false;
      }
    }, 8000);
    
    try {
      const params = new URLSearchParams({ user_id: userId });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout
      
      const response = await fetch(`/api/copilot/weekly-summary?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data: WeeklySummaryResponse = await response.json();
        setWeeklySummary(data);
      } else {
        setWeeklyError(true);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch AI weekly summary:', error);
      }
      setWeeklyError(true);
    } finally {
      setWeeklyLoading(false);
      fetchingWeeklySummaryRef.current = false;
    }
  }, []);

  // Handle price update
  const handlePriceUpdate = async () => {
    if (!user?.id) return;
    
    setPriceUpdateLoading(true);
    setPriceUpdateSuccess(false);
    
    try {
      const response = await fetch('/api/stocks/prices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message
        setPriceUpdateSuccess(true);
        
        // Refresh portfolio data to show updated values
        await fetchPortfolioData(user.id);
        
        // Hide success message after 3 seconds
        setTimeout(() => setPriceUpdateSuccess(false), 3000);
      } else {
        console.error('[Dashboard] Price update failed');
      }
    } catch (error) {
      console.error('[Dashboard] Price update error:', error);
    } finally {
      setPriceUpdateLoading(false);
    }
  };

  // DEBUG: Log state to help diagnose loading issues
  useEffect(() => {
    console.log('[Dashboard] State:', {
      authStatus,
      hasUser: !!user?.id,
      userId: user?.id,
      hasPortfolio,
      portfolioCheckComplete,
      redirectAttempted: redirectAttemptedRef.current,
    });
  }, [authStatus, user?.id, hasPortfolio, portfolioCheckComplete]);

  // Fetch data when user is available
  // OPTIMIZATION: Don't wait for hasPortfolio - fetch data immediately if user exists
  // This prevents hanging when navigating back to dashboard
  useEffect(() => {
    if (!user?.id) return;
    
    // If portfolio check is complete and no portfolio, don't fetch
    if (portfolioCheckComplete && !hasPortfolio) {
      return;
    }
    
    // Fetch data immediately if user exists, even if portfolio check is in progress
    // This ensures faster loading when navigating back to dashboard
    console.log('[Dashboard] Fetching portfolio data for user:', user.id);
    fetchPortfolioData(user.id);
    fetchAiSummary(user.id);
    fetchWeeklySummary(user.id);
    
    // OPTIMIZATION: Cleanup function to cancel any pending fetches on unmount
    return () => {
      // Reset fetch flags on unmount to allow fresh fetch on remount
      fetchingRef.current = false;
      fetchingAiSummaryRef.current = false;
      fetchingWeeklySummaryRef.current = false;
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, portfolioCheckComplete]);


  const getRiskAlignmentLabel = (status: RiskAlignmentStatus | undefined): string => {
    switch (status) {
      case 'aligned': return 'Risk profile: Stable';
      case 'slightly_drifted': return 'Risk profile: Slight shift';
      case 'review_suggested': return 'Risk profile: Worth reviewing';
      default: return 'Risk profile: Stable';
    }
  };

  const handleAskAboutWeek = () => {
    setCopilotInitialMessage('How did my portfolio perform this week? Can you explain my weekly summary?');
  };

  const handleInitialMessageSent = () => {
    setCopilotInitialMessage(undefined);
  };

  // Handle openHelp URL parameter - open copilot when navigating from header help button
  useEffect(() => {
    const openHelp = searchParams?.get('openHelp');
    if (openHelp === 'true') {
      setCopilotIsOpen(true);
      // Clean up URL parameter
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, router]);

  // PERMANENT FIX: Removed dashboard timeout - rely solely on auth context timeout
  // This eliminates race conditions between two competing timeouts
  // The auth context already has a 10s timeout that sets portfolioCheckComplete

  const handleUploadSuccess = () => {
    if (user?.id) {
      // Force refresh by resetting loading state
      setPortfolioLoading(true);
      // Small delay to ensure database write is complete
      setTimeout(() => {
        fetchPortfolioData(user.id);
        fetchAiSummary(user.id);
      }, 500);
    }
  };

  // Group holdings by selected criteria
  // Use holdings length and groupBy as stable dependencies
  const holdingsLength = portfolioData.holdings.length;
  const holdingsRef = useRef(portfolioData.holdings);
  
  // Update ref when holdings change
  useEffect(() => {
    holdingsRef.current = portfolioData.holdings;
  }, [holdingsLength]);
  
  const groupedHoldings = useMemo(() => {
    const holdings = holdingsRef.current;
    
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Holdings', holdings }];
    }
    
    const groups = new Map<string, HoldingDetail[]>();
    
    holdings.forEach(h => {
      const key = groupBy === 'assetType' 
        ? h.assetType 
        : (h.sector || 'Uncategorized');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(h);
    });
    
    return Array.from(groups.entries())
      .map(([key, holdings]) => ({
        key,
        label: key,
        holdings: holdings.sort((a, b) => b.investedValue - a.investedValue),
      }))
      .sort((a, b) => {
        const aTotal = a.holdings.reduce((sum, h) => sum + h.investedValue, 0);
        const bTotal = b.holdings.reduce((sum, h) => sum + h.investedValue, 0);
        return bTotal - aTotal;
      });
  }, [holdingsLength, groupBy]);

  // Validate data consistency - ensure totals match sum of holdings
  // Only validate when hasData or holdings count changes (not on every render)
  const holdingsCount = portfolioData.holdings.length;
  const validation = useMemo(() => {
    if (!portfolioData.hasData || portfolioData.holdings.length === 0) {
      return { isValid: false, message: 'No holdings data available' };
    }

    // Use aggregation utility to verify consistency
    const aggregation = aggregatePortfolioData(portfolioData.holdings.map(h => ({
      id: h.id,
      name: h.name,
      assetType: h.assetType,
      investedValue: h.investedValue,
      currentValue: h.currentValue,
    })));

    return validatePortfolioData(aggregation, portfolioData.holdings);
    // Only depend on hasData and count, not the array reference itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioData.hasData, holdingsCount]);

  const isDataConsistent = validation.isValid && portfolioData.hasData;
  const portfolio = portfolioData;

  // OPTIMIZATION: Memoize bucket mapping to prevent recalculation on every render
  // Moved to top level to comply with Rules of Hooks
  const bucketCardsContent = useMemo(() => {
    // Map allocation names to bucket keys
    const nameToBucket: Record<string, string> = {
      'Growth Assets': 'Growth',
      'Income & Allocation': 'IncomeAllocation',
      'Real Assets': 'RealAsset',
      'Commodities': 'Commodity',
      'Cash & Liquidity': 'Cash',
    };

    const bucketToName: Record<string, string> = {
      'Growth': 'Growth Assets',
      'IncomeAllocation': 'Income & Allocation',
      'RealAsset': 'Real Assets',
      'Commodity': 'Commodities',
      'Cash': 'Cash & Liquidity',
    };

    // Tooltip content for asset categories (exact copy as per requirements)
    const bucketTooltips: Record<string, string> = {
      'Growth': 'Investments meant to grow your wealth over time.\nExamples: Stocks, Equity Mutual Funds, Equity ETFs\nThese may fluctuate in the short term but aim for higher long-term returns.',
      'IncomeAllocation': 'Investments focused on stability or steady income.\nExamples: FD, EPF, PPF, NPS, Debt & Hybrid Mutual Funds\nHelps balance risk and provide predictable returns.',
      'RealAsset': 'Physical assets with long-term value.\nExamples: Property, Land, REITs\nUsually less liquid but form a strong wealth foundation.',
      'Commodity': 'Assets that help protect against inflation.\nExamples: Gold, Silver\nOften used for diversification and safety.',
      'Cash': 'Money that is easily accessible when needed.\nExamples: Savings account, Cash, Liquid funds\nUseful for emergencies and short-term needs.',
      'Insurance': 'Financial protection for you and your family.\nExamples: Term life insurance, Health insurance\nNot counted as an investment or asset value.',
      'Liability': 'Amounts you owe that reduce your net worth.\nExamples: Home loan, Personal loan, Credit card dues',
    };

    // Bucket order for display (allocation buckets only)
    const bucketOrder = ['Growth', 'IncomeAllocation', 'RealAsset', 'Commodity', 'Cash'];

    // Create a map from allocation items (from API - includes Real Estate)
    const allocationMap = new Map<string, AllocationItem>();
    portfolio.allocation.forEach((item) => {
      const bucket = nameToBucket[item.name];
      if (bucket) {
        allocationMap.set(bucket, item);
      }
    });

    // Get all 5 buckets and sort by value descending
    const bucketsToShow = bucketOrder
      .filter(bucket => allocationMap.has(bucket))
      .map(bucket => {
        const allocationItem = allocationMap.get(bucket)!;
        return {
          bucket,
          allocationItem,
          bucketName: bucketToName[bucket],
          tooltip: bucketTooltips[bucket],
        };
      })
      .sort((a, b) => b.allocationItem.value - a.allocationItem.value); // Sort by value descending

    return bucketsToShow;
  }, [portfolio.allocation]);

  // OPTIMIZATION: Memoize XIRR calculation to prevent recalculation on every render
  // Moved to top level to comply with Rules of Hooks
  const xirrContent = useMemo(() => {
    // Calculate XIRR from portfolio data
    // Use createdAt (portfolio creation date) as start date, or 1 year ago as fallback
    const startDate = portfolioData.summary.createdAt 
      ? new Date(portfolioData.summary.createdAt)
      : portfolioData.summary.lastUpdated
        ? new Date(portfolioData.summary.lastUpdated)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago as default
    
    const xirr = calculateXIRRFromHoldings(
      portfolioData.holdings.map(h => ({
        investedValue: h.investedValue,
        currentValue: h.currentValue,
      })),
      startDate
    );
    
    return {
      xirr,
      startDate,
    };
  }, [portfolioData.holdings, portfolioData.summary.createdAt, portfolioData.summary.lastUpdated]);

  // Fetch Portfolio Health Score from API (same source as health score page)
  // OPTIMIZATION: Added timeout and better error handling
  useEffect(() => {
    if (!user?.id || !isDataConsistent) {
      setPortfolioHealthScore(null);
      return;
    }

    const fetchHealthScore = async () => {
      setHealthScoreLoading(true);
      
      // OPTIMIZATION: Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn('[Dashboard] Health score fetch timeout');
        setHealthScoreLoading(false);
        setPortfolioHealthScore(null);
      }, 10000);
      
      try {
        const response = await fetchPortfolioHealthScore(user.id);
        clearTimeout(timeoutId);
        
        if (response.success && response.data) {
          setPortfolioHealthScore(response.data);
        } else {
          setPortfolioHealthScore(null);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to fetch health score:', error);
        setPortfolioHealthScore(null);
      } finally {
        setHealthScoreLoading(false);
      }
    };

    fetchHealthScore();
  }, [user?.id, isDataConsistent]);

  // GUARD: Show loading while auth state is being determined
  // PERMANENT FIX: Simplified loading logic
  if (authStatus === 'loading' && !hasValidSession) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    // Redirect happens in useEffect above, just show message briefly
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // OPTIMIZATION: Show loading only if portfolio check is in progress AND we don't have data yet
  // This prevents hanging when navigating back - show dashboard content even if check is in progress
  // Only show loading screen if we're truly waiting for initial auth
  if (user && !portfolioCheckComplete && authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Checking portfolio...</p>
        </div>
      </div>
    );
  }
  
  // PERMANENT FIX: Show redirect message only if redirect is actually happening
  if (user && portfolioCheckComplete && !hasPortfolio && redirectAttemptedRef.current) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
        <AppHeader />

        <main className="max-w-[1280px] mx-auto px-6 py-8 pt-24 bg-[#F6F8FB] dark:bg-[#0F172A]">
        {/* Verification Banner (non-blocking) */}
        <VerificationBanner className="mb-8" />
        
        {/* ============================================================================ */}
        {/* ZONE 1: HEADER */}
        {/* ============================================================================ */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Dashboard</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">{greeting}, {userName}</p>
          </div>
          <div className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
            Last 12 months
          </div>
        </div>

        {/* ============================================================================ */}
        {/* QUICK ACTIONS - Add/Upload Investments */}
        {/* ============================================================================ */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-[#0F172A] dark:to-[#0F172A] dark:bg-[#0F172A] dark:[background:var(--background)] rounded-xl border border-emerald-200 dark:border-[#334155] p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Manage Your Portfolio</h2>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Add new investments or update existing holdings anytime
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm hover:shadow-md"
                >
                  <UploadIcon className="w-5 h-5 text-white" />
                  Upload Documents
                </button>
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 border-2 border-emerald-600 dark:border-emerald-500 font-medium rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Manually
                </button>
                <button
                  onClick={handlePriceUpdate}
                  disabled={priceUpdateLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-colors ${
                    priceUpdateSuccess
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-600 dark:border-green-500'
                      : 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                  } ${priceUpdateLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Update stock and ETF prices from Yahoo Finance"
                >
                  {priceUpdateLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : priceUpdateSuccess ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Updated!
                    </>
                  ) : (
                    <>
                      <TrendingUpIcon className="w-5 h-5" />
                      Update Prices
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                <div className="flex items-start gap-2">
                  <UploadIcon className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span><strong>Upload:</strong> CAS statements, broker statements (CSV/Excel)</span>
                </div>
                <div className="flex items-start gap-2">
                  <PlusIcon className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span><strong>Add:</strong> FD, EPF, PPF, NPS, Gold, Bonds, and more</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================ */}
        {/* ZONE 2: NET WORTH HERO (Above the Fold) */}
        {/* ============================================================================ */}
        <OnboardingHint
          id="portfolio-value"
          message="Your portfolio value is calculated from all your holdings. You can verify the breakdown in the sections below."
          position="bottom"
        >
          <section className="mb-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-10">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-4">Total Net Worth</p>
              {portfolioLoading ? (
                <div className="h-16 w-64 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-4" />
              ) : !isDataConsistent ? (
                <DataConsolidationMessage className="mb-4" />
              ) : (
                <>
                  <h2 className="text-6xl font-semibold text-[#0A2540] dark:text-[#F8FAFC] number-emphasis mb-4">{formatCurrency(portfolio.metrics.netWorth)}</h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-4">
                    Net Worth = Assets (excluding Insurance) − Liabilities
                  </p>
                  {portfolio.metrics.netWorthChange !== 0 && (
                    <div className="flex items-center gap-2.5">
                      <TrendingUpIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
                      <span className="text-lg text-[#16A34A] dark:text-[#22C55E] font-semibold number-emphasis">+₹{(portfolio.metrics.netWorth * portfolio.metrics.netWorthChange / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      <span className="text-lg text-[#16A34A] dark:text-[#22C55E] font-semibold">(+{portfolio.metrics.netWorthChange}%)</span>
                      <span className="text-sm text-[#6B7280] dark:text-[#94A3B8] ml-1">Last 12 months</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </OnboardingHint>

        {/* ============================================================================ */}
        {/* PORTFOLIO HEALTH SCORE WIDGET */}
        {/* ============================================================================ */}
        {isDataConsistent && (portfolioHealthScore || healthScoreLoading) && (
          <ErrorBoundary sectionName="Portfolio Health Score">
            <section className="mb-6">
              <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
              {healthScoreLoading ? (
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
                  <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Calculating health score...</span>
                </div>
              ) : portfolioHealthScore ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Circular Progress Ring */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        {(() => {
                          const circumference = 2 * Math.PI * 16; // radius = 16
                          const progress = (portfolioHealthScore.totalScore / 100) * circumference;
                          const strokeColor = portfolioHealthScore.totalScore >= 70 
                            ? '#10B981' 
                            : portfolioHealthScore.totalScore >= 55 
                              ? '#F59E0B' 
                              : '#EF4444';
                          
                          return (
                            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                              {/* Background circle */}
                              <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                stroke="#E5E7EB"
                                strokeWidth="3"
                                className="dark:stroke-[#334155]"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth="3"
                                strokeDasharray={`${progress}, ${circumference}`}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                              />
                            </svg>
                          );
                        })()}
                        {/* Score number in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {portfolioHealthScore.totalScore}
                          </span>
                        </div>
                      </div>

                  {/* Score details */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                      Portfolio Health Score
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                      {portfolioHealthScore.totalScore} / 100 • {portfolioHealthScore.grade === 'Excellent' ? 'Excellent structure' : 
                        portfolioHealthScore.grade === 'Good' ? 'Well-balanced portfolio' :
                        portfolioHealthScore.grade === 'Fair' ? 'Moderate health, needs review' :
                        'High concentration risk'}
                    </p>
                  </div>
                </div>

                {/* Expand/Collapse button */}
                <button
                  onClick={() => setHealthScoreExpanded(!healthScoreExpanded)}
                  className="ml-4 p-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                  aria-label={healthScoreExpanded ? 'Hide score breakdown' : 'Show score breakdown'}
                >
                  {healthScoreExpanded ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Score Breakdown (Expandable) */}
              {healthScoreExpanded && (
                <div className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
                  <h4 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Score Breakdown</h4>
                  <div className="space-y-3">
                    {portfolioHealthScore.pillarBreakdown.map((pillar) => {
                      // Map pillar names to display labels
                      const pillarLabels: Record<string, string> = {
                        asset_allocation: 'Asset Allocation',
                        concentration_risk: 'Concentration Risk',
                        diversification_overlap: 'Diversification & Overlap',
                        market_cap_balance: 'Market Cap Balance',
                        sector_balance: 'Sector Balance',
                        geography_balance: 'Geography Balance',
                        investment_quality: 'Investment Quality',
                      };
                      
                      const label = pillarLabels[pillar.name] || pillar.name;
                      const maxScore = 100; // Each pillar is 0-100
                      const isGood = pillar.score >= 70;
                      
                      return (
                        <div key={pillar.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={isGood ? 'text-[#16A34A] dark:text-[#22C55E]' : pillar.score >= 50 ? 'text-[#F59E0B] dark:text-[#FBBF24]' : 'text-[#EF4444] dark:text-[#F87171]'}>
                              {isGood ? '✓' : pillar.score >= 50 ? '⚠' : '✗'}
                            </span>
                            <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{label}</span>
                          </div>
                          <span className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {Math.round(pillar.score)} / {maxScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                    <Link
                      href="/analytics/health"
                      className="text-sm text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
                    >
                      View detailed analysis
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
                </>
              ) : null}
            </div>
          </section>
          </ErrorBoundary>
        )}

        {/* ============================================================================ */}
        {/* ZONE 3: TOP-LEVEL BUCKET CARDS (Above the Fold) - Show All 5 Allocation Buckets */}
        {/* ============================================================================ */}
        {isDataConsistent && (
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {bucketCardsContent.map(({ bucket, allocationItem, bucketName, tooltip }) => {
              const value = allocationItem.value;
              const percentage = allocationItem.percentage;
              const color = allocationItem.color; // Use color from API allocation (matches pie chart)

              return (
                <Link
                  key={bucket}
                  href={`/portfolio/summary?bucket=${bucket}`}
                  className="relative bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 text-left hover:border-[#2563EB] dark:hover:border-[#3B82F6] block card-hover"
                >
                  {/* Color Button - Top Right Corner (double size of legend button) */}
                  {/* Legend uses w-3 h-3 (12px), so tiles use w-6 h-6 (24px) */}
                  <div 
                    className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white dark:border-[#1E293B] shadow-sm"
                    style={{ backgroundColor: color }}
                    aria-label={`${bucketName} color indicator`}
                  />
                  
                  <div className="flex items-center gap-2 mb-6 pr-10">
                    <p className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]">
                      {bucketName}
                    </p>
                    <CategoryInfoTooltip content={tooltip} />
                  </div>
                  {portfolioLoading ? (
                    <div className="h-10 w-24 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-2" />
                  ) : (
                    <>
                      <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">
                        {formatCurrency(value)}
                      </p>
                      <p className="text-base font-medium text-[#6B7280] dark:text-[#94A3B8]">
                        {percentage.toFixed(0)}%
                      </p>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
        )}

        {/* ============================================================================ */}
        {/* FOLD LINE - Content below requires scrolling */}
        {/* ============================================================================ */}

        {/* ============================================================================ */}
        {/* ZONE 4: PORTFOLIO ALLOCATION (Below the Fold) */}
        {/* ============================================================================ */}
        {isDataConsistent && (
        <section className="mb-8 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-8">Portfolio Allocation</h2>
          
          {portfolio.allocation.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#475569] dark:text-[#CBD5E1] mb-2">No allocation data</p>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Upload your portfolio to see asset breakdown</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: Interactive Pie Chart (5 cols) */}
              <div className="lg:col-span-5 flex items-center justify-center">
                <div className="relative w-[331px] h-[331px]">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {(() => {
                      const centerX = 100;
                      const centerY = 100;
                      const radius = 92;
                      let startAngle = -90; // Start from top

                      return portfolio.allocation.map((item, index) => {
                        const angle = (item.percentage / 100) * 360;
                        
                        // Handle single asset (100% or very close to 100%)
                        if (angle >= 359.9 || portfolio.allocation.length === 1) {
                          // Draw a full circle for single asset
                          const slice = (
                            <circle
                              key={index}
                              cx={centerX}
                              cy={centerY}
                              r={radius}
                              fill={item.color}
                              className={`transition-all duration-300 cursor-pointer ${
                                hoveredIndex === index 
                                  ? 'opacity-100 scale-110' 
                                  : hoveredIndex === null 
                                    ? 'opacity-100' 
                                    : 'opacity-30 blur-[2px]'
                              }`}
                              style={{
                                transformOrigin: '100px 100px',
                                filter: hoveredIndex === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
                              }}
                              onMouseEnter={() => setHoveredIndex(index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                          );
                          return slice;
                        }
                        
                        const endAngle = startAngle + angle;
                        
                        // Convert angles to radians
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;
                        
                        // Calculate path points
                        const x1 = centerX + radius * Math.cos(startRad);
                        const y1 = centerY + radius * Math.sin(startRad);
                        const x2 = centerX + radius * Math.cos(endRad);
                        const y2 = centerY + radius * Math.sin(endRad);
                        
                        // Determine if we need a large arc
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        
                        // Create SVG path
                        const pathData = [
                          `M ${centerX} ${centerY}`,
                          `L ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          'Z'
                        ].join(' ');
                        
                        const slice = (
                          <path
                            key={index}
                            d={pathData}
                            fill={item.color}
                            className={`transition-all duration-300 cursor-pointer ${
                              hoveredIndex === index 
                                ? 'opacity-100 scale-110' 
                                : hoveredIndex === null 
                                  ? 'opacity-100' 
                                  : 'opacity-30 blur-[2px]'
                            }`}
                            style={{
                              transformOrigin: '100px 100px',
                              filter: hoveredIndex === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        );
                        
                        startAngle = endAngle;
                        return slice;
                      });
                    })()}
                  </svg>
                </div>
              </div>

              {/* Right: Interactive Legend (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="space-y-5">
                  {portfolio.allocation.map((item, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between py-3 px-4 rounded-lg transition-all duration-300 cursor-pointer ${
                        hoveredIndex === i 
                          ? 'bg-[#F6F8FB] dark:bg-[#334155] scale-105 shadow-sm' 
                          : 'hover:bg-[#F9FAFB] dark:hover:bg-[#334155]'
                      }`}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            hoveredIndex === i ? 'scale-150 shadow-md' : ''
                          }`}
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className={`text-base font-medium transition-all duration-300 ${
                          hoveredIndex === i 
                            ? 'text-[#0F172A] dark:text-[#F8FAFC] font-semibold' 
                            : 'text-[#0F172A] dark:text-[#F8FAFC]'
                        }`}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`text-lg font-semibold number-emphasis transition-all duration-300 ${
                        hoveredIndex === i 
                          ? 'text-[#0F172A] dark:text-[#F8FAFC] scale-110' 
                          : 'text-[#0F172A] dark:text-[#F8FAFC]'
                      }`}>
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
        )}

        {/* ============================================================================ */}
        {/* ZONE 5: PERFORMANCE SNAPSHOT (Below the Fold) */}
        {/* ============================================================================ */}
        <section className="mb-8 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
          <div className="text-center">
            <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
              Portfolio XIRR: {xirrContent.xirr !== null ? formatXIRR(xirrContent.xirr, false) : 'N/A'}
            </p>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-2">
              {xirrContent.xirr !== null 
                ? (portfolioData.summary.createdAt 
                    ? `Since ${new Date(portfolioData.summary.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })} • All asset classes`
                    : portfolioData.summary.lastUpdated
                      ? `Since ${new Date(portfolioData.summary.lastUpdated).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })} • All asset classes`
                      : 'Since inception • All asset classes')
                : portfolioData.holdings.length === 0
                  ? 'Add holdings to calculate XIRR'
                  : 'Requires at least 30 days of data • All asset classes'
              }
            </p>
          </div>
        </section>

        {/* ============================================================================ */}
        {/* ZONE 6: INSIGHTS & ALERTS (Below the Fold) */}
        {/* ============================================================================ */}
        <ErrorBoundary sectionName="Insights & Alerts">
          <OnboardingHint
            id="insights-section"
            message="Portfolio insights are generated based on your holdings. More complete data leads to more accurate insights."
            position="top"
          >
            <section className="mb-16 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Insights & Alerts</h2>
            </div>
          
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
            {portfolio.insights.slice(0, 3).map((insight) => {
              const isExpanded = expandedInsightId === insight.id;
              return (
                <div key={insight.id}>
                  <button
                    onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {insight.type === 'opportunity' ? (
                        <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] dark:text-[#FBBF24] flex-shrink-0" />
                      ) : (
                        <InfoIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">{insight.title}</p>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">{insight.description}</p>
                      </div>
                    </div>
                    <ChevronDownIcon 
                      className={`w-5 h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-0' : 'rotate-[-90deg]'
                      }`} 
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-6 py-4 bg-[#F6F8FB] dark:bg-[#334155] border-t border-[#E5E7EB] dark:border-[#334155]">
                      <div className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                        <p className="mb-2">
                          <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Details:</strong>
                        </p>
                        <p className="text-[#475569] dark:text-[#CBD5E1]">
                          {insight.description}
                        </p>
                        {insight.type === 'warning' && (
                          <div className="mt-3 p-3 bg-[#FEF3C7] dark:bg-[#78350F] border border-[#F59E0B]/20 dark:border-[#FBBF24]/20 rounded-lg">
                            <p className="text-xs text-[#92400E] dark:text-[#FCD34D]">
                              This insight requires attention. Consider reviewing your portfolio allocation.
                            </p>
                          </div>
                        )}
                        {insight.type === 'opportunity' && (
                          <div className="mt-3 p-3 bg-[#D1FAE5] dark:bg-[#14532D] border border-[#16A34A]/20 dark:border-[#22C55E]/20 rounded-lg">
                            <p className="text-xs text-[#065F46] dark:text-[#86EFAC]">
                              This is an opportunity to optimize your portfolio.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Show upsell banner if more insights available */}
          {portfolio.insights.length > 3 && (
            <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-[#334155]">
              <InsightsLimitBanner
                totalInsights={portfolio.insights.length}
                shownInsights={3}
              />
            </div>
          )}
          </section>
          </OnboardingHint>
        </ErrorBoundary>

        {/* ============================================================================ */}
        {/* ANALYTICS LINK (Below the Fold) */}
        {/* ============================================================================ */}
        <section className="mb-16">
          <Link
            href="/analytics/overview"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#2563EB] dark:text-[#3B82F6] bg-white dark:bg-[#1E293B] border border-[#2563EB] dark:border-[#3B82F6] rounded-lg hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] transition-colors"
          >
            <InfoIcon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
            View Advanced Analytics
            <ArrowRightIcon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
          </Link>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-2 ml-1">
            Explore exposure analytics: sector, market cap, and geography breakdowns
          </p>
        </section>

        {/* Hidden Sections - Available via click-through */}
        <div className="hidden">
          {/* Weekly Check-in - Moved to separate page */}
          {/* Top Holdings - Moved to asset detail pages */}
          {/* All Investments Table - Moved to separate page */}
        </div>
      </main>
      </div>

      {/* Floating Copilot - Positioned top-right for better visibility (outside ErrorBoundary) */}
      <FloatingCopilot 
        source="dashboard" 
        userId={user?.id || ''} 
        initialMessage={copilotInitialMessage}
        onInitialMessageSent={handleInitialMessageSent}
        issueCount={0}
        externalIsOpen={copilotIsOpen}
        onStateChange={setCopilotIsOpen}
        position="top-right"
      />

      {/* Portfolio Upload Modal */}
      <PortfolioUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        userId={user?.id || ''}
        source="dashboard"
        onSuccess={handleUploadSuccess}
      />

      {/* Manual Investment Modal */}
      <ManualInvestmentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        userId={user?.id || ''}
        source="dashboard"
        onSuccess={handleUploadSuccess}
        onPPFSelected={() => {
          setIsManualModalOpen(false);
          setIsPPFModalOpen(true);
        }}
        onNPSSelected={() => {
          setIsManualModalOpen(false);
          setIsNPSModalOpen(true);
        }}
        onEPFSelected={() => {
          setIsManualModalOpen(false);
          setIsEPFModalOpen(true);
        }}
        onGoldSelected={() => {
          setIsManualModalOpen(false);
          setIsGoldModalOpen(true);
        }}
      />

      {/* PPF Add Modal */}
      <PPFAddModal
        isOpen={isPPFModalOpen}
        onClose={() => setIsPPFModalOpen(false)}
        userId={user?.id || ''}
        onSuccess={handleUploadSuccess}
        existingHolding={null}
      />

      {/* NPS Add Modal */}
      <NPSAddModal
        isOpen={isNPSModalOpen}
        onClose={() => setIsNPSModalOpen(false)}
        userId={user?.id || ''}
        onSuccess={handleUploadSuccess}
        existingHolding={null}
      />

      {/* EPF Add Modal */}
      <EPFAddModal
        isOpen={isEPFModalOpen}
        onClose={() => setIsEPFModalOpen(false)}
        userId={user?.id || ''}
        onSuccess={handleUploadSuccess}
        existingHolding={null}
      />

      {/* Gold Add Modal */}
      <GoldAddModal
        isOpen={isGoldModalOpen}
        onClose={() => setIsGoldModalOpen(false)}
        userId={user?.id || ''}
        onSuccess={handleUploadSuccess}
        existingHolding={null}
      />
    </ErrorBoundary>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
