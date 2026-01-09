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

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import VerificationBanner from '@/components/VerificationBanner';
import InsightsLimitBanner from '@/components/InsightsLimitBanner';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import OnboardingHint from '@/components/OnboardingHint';
import DataConsolidationMessage from '@/components/DataConsolidationMessage';
import { useAuth } from '@/lib/auth';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import { aggregatePortfolioData, validatePortfolioData } from '@/lib/portfolio-aggregation';
import type { DailySummaryResponse, WeeklySummaryResponse, Status, RiskAlignmentStatus } from '@/types/copilot';
import { calculateXIRRFromHoldings, formatXIRR } from '@/lib/xirr-calculator';

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
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, authStatus, hasPortfolio, portfolioCheckComplete, signOut } = useAuth();
  const { formatCurrency } = useCurrency();
  const redirectAttemptedRef = useRef(false);
  
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
  
  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Manual investment modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // User dropdown state
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Portfolio Allocation chart hover state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // All Investments section state
  const [showAllInvestments, setShowAllInvestments] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  
  // Expanded insights state
  const [expandedInsightId, setExpandedInsightId] = useState<number | null>(null);

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
  // RULE: Only redirect after portfolio check is complete
  useEffect(() => {
    // GUARD: Block redirects during loading
    if (authStatus === 'loading') {
      redirectAttemptedRef.current = false;
      return;
    }
    
    // GUARD: Must be authenticated to check portfolio
    if (authStatus !== 'authenticated' || !user) {
      redirectAttemptedRef.current = false;
      return;
    }
    
    // Only redirect if portfolio check has completed AND there's no portfolio
    if (portfolioCheckComplete && !hasPortfolio && !redirectAttemptedRef.current) {
      redirectAttemptedRef.current = true;
      router.replace('/onboarding');
    } else if (hasPortfolio) {
      redirectAttemptedRef.current = false;
    }
  }, [authStatus, user, hasPortfolio, portfolioCheckComplete, router]);

  // Fetch portfolio data
  const fetchPortfolioData = useCallback(async (userId: string) => {
    setPortfolioLoading(true);
    
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/portfolio/data?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPortfolioData(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  // Fetch AI daily summary
  const fetchAiSummary = useCallback(async (userId: string) => {
    setSummaryLoading(true);
    setSummaryError(false);
    
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/copilot/daily-summary?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data: DailySummaryResponse = await response.json();
        setAiSummary(data);
      } else {
        setSummaryError(true);
      }
    } catch (error) {
      console.error('Failed to fetch AI daily summary:', error);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch AI weekly summary
  const fetchWeeklySummary = useCallback(async (userId: string) => {
    setWeeklyLoading(true);
    setWeeklyError(false);
    
    try {
      const params = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/copilot/weekly-summary?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data: WeeklySummaryResponse = await response.json();
        setWeeklySummary(data);
      } else {
        setWeeklyError(true);
      }
    } catch (error) {
      console.error('Failed to fetch AI weekly summary:', error);
      setWeeklyError(true);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  // Fetch data when user is available
  useEffect(() => {
    if (user?.id && hasPortfolio) {
      fetchPortfolioData(user.id);
      fetchAiSummary(user.id);
      fetchWeeklySummary(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasPortfolio]);


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

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleUploadSuccess = () => {
    if (user?.id) {
      fetchPortfolioData(user.id);
      fetchAiSummary(user.id);
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

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
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

  // GUARD: Redirect if no portfolio (only after portfolio check has completed)
  if (authStatus === 'authenticated' && user && portfolioCheckComplete && !hasPortfolio) {
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
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      <main className="max-w-[1280px] mx-auto px-6 py-8 pt-24 bg-[#F6F8FB] dark:bg-[#0F172A]">
        {/* Verification Banner (non-blocking) */}
        <VerificationBanner className="mb-8" />
        
        {/* Onboarding Checklist - Only show for first-time users */}
        <OnboardingChecklist />
        
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
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-4">Total Portfolio Value</p>
              {portfolioLoading ? (
                <div className="h-16 w-64 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-4" />
              ) : !isDataConsistent ? (
                <DataConsolidationMessage className="mb-4" />
              ) : (
                <>
                  <h2 className="text-6xl font-semibold text-[#0A2540] dark:text-[#F8FAFC] number-emphasis mb-4">{formatCurrency(portfolio.metrics.netWorth)}</h2>
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
        {/* ZONE 3: ASSET OVERVIEW TILES (Above the Fold) */}
        {/* ============================================================================ */}
        {isDataConsistent && (
        <section className="mb-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Mutual Funds Tile */}
          <Link 
            href="/portfolio/mutualfunds"
            className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 text-left hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all block"
          >
            <p className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] mb-6">Mutual Funds</p>
            {portfolioLoading ? (
              <div className="h-10 w-24 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-2" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">
                  {formatCurrency(portfolio.allocation.find(a => a.name === 'Mutual Funds')?.value || 0)}
                </p>
                <p className="text-base font-medium text-[#6B7280] dark:text-[#94A3B8]">
                  {portfolio.allocation.find(a => a.name === 'Mutual Funds')?.percentage.toFixed(0) || '0'}%
                </p>
              </>
            )}
          </Link>

          {/* Stocks Tile */}
          <Link 
            href="/portfolio/equity"
            className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 text-left hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all block"
          >
            <p className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] mb-6">Stocks</p>
            {portfolioLoading ? (
              <div className="h-10 w-24 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-2" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">
                  {formatCurrency(
                    portfolio.allocation.find(a => a.name === 'Equity' || a.name === 'Stocks')?.value || 0
                  )}
                </p>
                <p className="text-base font-medium text-[#6B7280] dark:text-[#94A3B8]">
                  {portfolio.allocation.find(a => a.name === 'Equity' || a.name === 'Stocks')?.percentage.toFixed(0) || '0'}%
                </p>
              </>
            )}
          </Link>

          {/* Fixed Deposits Tile */}
          <Link 
            href="/portfolio/fixeddeposits"
            className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 text-left hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all block"
          >
            <p className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] mb-6">Fixed Deposits</p>
            {portfolioLoading ? (
              <div className="h-10 w-24 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-2" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">
                  {formatCurrency(portfolio.allocation.find(a => a.name === 'Fixed Deposit' || a.name === 'Fixed Deposits')?.value || 0)}
                </p>
                <p className="text-base font-medium text-[#6B7280] dark:text-[#94A3B8]">
                  {portfolio.allocation.find(a => a.name === 'Fixed Deposit' || a.name === 'Fixed Deposits')?.percentage.toFixed(0) || '0'}%
                </p>
              </>
            )}
          </Link>

          {/* Others Tile */}
          <Link 
            href="/portfolio/summary"
            className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 text-left hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-sm transition-all block"
          >
            <p className="text-sm font-medium text-[#6B7280] dark:text-[#94A3B8] mb-6">Others</p>
            {portfolioLoading ? (
              <div className="h-10 w-24 bg-[#F6F8FB] dark:bg-[#334155] rounded animate-pulse mb-2" />
            ) : (
              <>
                <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">
                  {formatCurrency(portfolio.allocation.filter(a => !['Mutual Funds', 'Equity', 'Stocks', 'Fixed Deposit', 'Fixed Deposits'].includes(a.name)).reduce((sum, a) => sum + a.value, 0))}
                </p>
                <p className="text-base font-medium text-[#6B7280] dark:text-[#94A3B8]">
                  {portfolio.allocation.filter(a => !['Mutual Funds', 'Equity', 'Stocks', 'Fixed Deposit', 'Fixed Deposits'].includes(a.name)).reduce((sum, a) => sum + a.percentage, 0).toFixed(0)}%
                </p>
              </>
            )}
          </Link>
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
            {(() => {
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
              
              return (
                <>
                  <p className="text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis">
                    Portfolio XIRR: {xirr !== null ? formatXIRR(xirr, false) : 'N/A'}
                  </p>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-2">
                    {xirr !== null 
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
                </>
              );
            })()}
          </div>
        </section>

        {/* ============================================================================ */}
        {/* ZONE 6: INSIGHTS & ALERTS (Below the Fold) */}
        {/* ============================================================================ */}
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

      {/* Floating Copilot */}
      <FloatingCopilot 
        source="dashboard" 
        userId={user?.id || ''} 
        initialMessage={copilotInitialMessage}
        onInitialMessageSent={handleInitialMessageSent}
        issueCount={0}
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
      />
    </div>
  );
}
