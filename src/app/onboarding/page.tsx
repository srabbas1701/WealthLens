/**
 * NEW ASSET-FOCUSED ONBOARDING FLOW
 * 
 * 5-screen progressive onboarding:
 * 0. Welcome / Expectation Setting
 * 1. High-level Investment Bucket Selection (MOST IMPORTANT)
 * 2. Asset-wise Add Method Selection (Dynamic)
 * 3. Document Upload (Conditional)
 * 4. Manual Entry Forms (Asset-specific)
 * 5. Onboarding Summary
 * 
 * PRINCIPLES:
 * - Everything is skippable
 * - Nothing is final - user can add/edit/delete anytime
 * - Progressive disclosure
 * - Choice before data
 * - Non-technical, India-friendly copy
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ChartIcon,
  ArrowRightIcon, 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  LockIcon,
  UploadIcon,
  ShieldCheckIcon,
  EditIcon,
  PlusIcon,
} from '@/components/icons';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import PortfolioUploadModal from '@/components/PortfolioUploadModal';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';
import { useAuth } from '@/lib/auth';
import type { InvestmentCategory, AddMethod, OnboardingState, AssetStatus } from '@/types/onboarding';
import { 
  CATEGORY_METADATA, 
  GROUP_LABELS, 
  ADD_METHOD_METADATA,
  CATEGORY_ADD_METHODS,
} from '@/types/onboarding';

type Step = 'welcome' | 'category_selection' | 'setup_queue' | 'add_method' | 'upload' | 'review' | 'post_upload' | 'manual' | 'summary';

/** Direct URL for manual add - skip hub when we know the category. Fewer clicks. */
function getAddUrlForCategory(category: InvestmentCategory, fromOnboarding = true): string {
  const q = fromOnboarding ? '?from=onboarding' : '';
  const mapping: Record<InvestmentCategory, string> = {
    mutual_funds: `/portfolio/mutualfunds/add${q}`,
    stocks: `/portfolio/stocks/add${q}`,
    etf: `/portfolio/etfs/add${q}`,
    fixed_deposits: `/portfolio/fixeddeposits${q}`,
    epf_ppf_nps: `/portfolio/holdings/add${q}`,
    gold: `/portfolio/gold${q}`,
    real_estate: `/portfolio/real-estate${q}`,
    insurance: `/portfolio/insurance/add${q}`,
    pension_retirement: `/portfolio/nps${q}`,
    crypto_startups_aifs: `/portfolio/holdings/add${q}`,
    esops: `/portfolio/holdings/add${q}`,
    not_sure: `/portfolio/holdings/add${q}`,
  };
  return mapping[category] || `/portfolio/holdings/add${q}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authStatus, hasPortfolio, refreshProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [currentAssetCategory, setCurrentAssetCategory] = useState<InvestmentCategory | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    selectedCategories: [],
    categoryAddMethods: {},
    categoryStatus: {},
    uploadedFiles: {},
    manualEntries: [],
  });
  
  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<InvestmentCategory | null>(null);
  const [uploadedCategories, setUploadedCategories] = useState<Set<InvestmentCategory>>(new Set());
  
  // Track which categories need action
  const [pendingUploadCategories, setPendingUploadCategories] = useState<InvestmentCategory[]>([]);
  const [pendingManualCategories, setPendingManualCategories] = useState<InvestmentCategory[]>([]);

  // Auth guards
  // PERMANENT FIX: Prevent redirect loops by checking recent redirects
  const redirectAttemptedRef = useRef(false);
  
  useEffect(() => {
    // CRITICAL: Only run redirect logic if we're actually on the onboarding route
    if (pathname !== '/onboarding') {
      return;
    }
    
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      redirectAttemptedRef.current = false;
      router.replace('/login?redirect=/onboarding');
      return;
    }
    
    // PERMANENT FIX: Check if we just came from dashboard (no portfolio scenario)
    // Use localStorage to match dashboard's logic
    const dashboardRedirectKey = `dashboard_redirect_${user?.id}`;
    const dashboardRedirectData = localStorage.getItem(dashboardRedirectKey);
    const now = Date.now();
    
    let timeSinceDashboardRedirect = Infinity;
    if (dashboardRedirectData) {
      try {
        const parsed = JSON.parse(dashboardRedirectData);
        timeSinceDashboardRedirect = now - (parsed.timestamp || 0);
      } catch (e) {
        // Ignore
      }
    }
    
    // PERMANENT FIX: Only redirect to dashboard if:
    // 1. We have portfolio
    // 2. We haven't recently redirected
    // 3. We didn't just come from dashboard (within last 15 seconds) - prevents loops
    // 4. We're actually on onboarding route
    if (authStatus === 'authenticated' && hasPortfolio && !redirectAttemptedRef.current && timeSinceDashboardRedirect > 15000) {
      const redirectKey = `onboarding_redirect_${user?.id}`;
      const redirectData = localStorage.getItem(redirectKey);
      
      let lastRedirectTime = 0;
      let redirectCount = 0;
      
      if (redirectData) {
        try {
          const parsed = JSON.parse(redirectData);
          lastRedirectTime = parsed.timestamp || 0;
          redirectCount = parsed.count || 0;
        } catch (e) {
          localStorage.removeItem(redirectKey);
        }
      }
      
      const timeSinceRedirect = now - lastRedirectTime;
      
      // Only redirect if we haven't redirected in the last 10 seconds and haven't exceeded limit
      if (timeSinceRedirect > 10000 && redirectCount < 3) {
        redirectAttemptedRef.current = true;
        redirectCount += 1;
        
        localStorage.setItem(redirectKey, JSON.stringify({
          timestamp: now,
          count: redirectCount,
          expiresAt: now + 60000
        }));
        
        // Clear dashboard redirect flag since we're going there legitimately
        localStorage.removeItem(dashboardRedirectKey);
        console.log('[Onboarding] Redirecting to dashboard - portfolio found');
        router.replace('/dashboard');
      } else {
        console.log('[Onboarding] Skipping redirect - recently redirected or too many redirects', {
          timeSinceRedirect: Math.round(timeSinceRedirect / 1000) + 's',
          redirectCount
        });
      }
    } else if (!hasPortfolio) {
      // Clear redirect flag if no portfolio (we should stay on onboarding)
      redirectAttemptedRef.current = false;
      if (user?.id) {
        localStorage.removeItem(`onboarding_redirect_${user.id}`);
      }
    }
    
    // Clean up expired redirect data
    if (user?.id) {
      const redirectKey = `onboarding_redirect_${user.id}`;
      const redirectData = localStorage.getItem(redirectKey);
      if (redirectData) {
        try {
          const parsed = JSON.parse(redirectData);
          if (parsed.expiresAt && now > parsed.expiresAt) {
            localStorage.removeItem(redirectKey);
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [authStatus, hasPortfolio, router, user?.id, pathname]);

  // Load saved state from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`onboarding_state_${user.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setOnboardingState(parsed);
          
          // Initialize pending categories based on selected methods
          const uploadCats: InvestmentCategory[] = [];
          const manualCats: InvestmentCategory[] = [];
          
          Object.entries(parsed.categoryAddMethods).forEach(([cat, method]) => {
            if (method === 'upload_cas' || method === 'upload_amc' || method === 'upload_broker') {
              uploadCats.push(cat as InvestmentCategory);
            } else if (method === 'manual') {
              manualCats.push(cat as InvestmentCategory);
            }
          });
          
          setPendingUploadCategories(uploadCats);
          setPendingManualCategories(manualCats);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [user?.id]);

  // Save state to localStorage
  const saveState = (newState: OnboardingState) => {
    setOnboardingState(newState);
    if (user?.id) {
      localStorage.setItem(`onboarding_state_${user.id}`, JSON.stringify(newState));
    }
  };

  const handleCategoryToggle = (category: InvestmentCategory) => {
    const newState = { ...onboardingState };
    if (newState.selectedCategories.includes(category)) {
      newState.selectedCategories = newState.selectedCategories.filter(c => c !== category);
      delete newState.categoryAddMethods[category];
    } else {
      newState.selectedCategories = [...newState.selectedCategories, category];
    }
    saveState(newState);
  };

  const handleAddMethodSelect = (category: InvestmentCategory, method: AddMethod) => {
    const newState = { ...onboardingState };
    newState.categoryAddMethods[category] = method;
    saveState(newState);
    
    // Update pending categories
    if (method === 'upload_cas' || method === 'upload_amc' || method === 'upload_broker') {
      setPendingUploadCategories(prev => [...prev.filter(c => c !== category), category]);
      setPendingManualCategories(prev => prev.filter(c => c !== category));
    } else if (method === 'manual') {
      setPendingManualCategories(prev => [...prev.filter(c => c !== category), category]);
      setPendingUploadCategories(prev => prev.filter(c => c !== category));
    } else {
      setPendingUploadCategories(prev => prev.filter(c => c !== category));
      setPendingManualCategories(prev => prev.filter(c => c !== category));
    }
  };

  const handleUploadSuccess = () => {
    if (!uploadCategory) return;
    
    const completedCategory = uploadCategory;
    setUploadedCategories(prev => new Set(prev).add(completedCategory));
    setPendingUploadCategories(prev => prev.filter(c => c !== completedCategory));
    setIsUploadModalOpen(false);
    setUploadCategory(null);
    
    // Move to next pending upload or manual or summary
    // Use setTimeout to allow state updates to process
    setTimeout(() => {
      setPendingUploadCategories(currentPendingUploads => {
        setUploadedCategories(currentUploaded => {
          const remainingUploads = currentPendingUploads.filter(c => !currentUploaded.has(c));
          if (remainingUploads.length > 0) {
            setUploadCategory(remainingUploads[0]);
            setIsUploadModalOpen(true);
            return currentUploaded;
          }
          
          // No more uploads, check manual categories - go directly to add if single, else manual step
          setPendingManualCategories(currentPendingManuals => {
            if (currentPendingManuals.length === 1) {
              router.push(getAddUrlForCategory(currentPendingManuals[0]));
            } else if (currentPendingManuals.length > 1) {
              setCurrentStep('manual');
            } else {
              setCurrentStep('summary');
            }
            return currentPendingManuals;
          });
          
          return currentUploaded;
        });
        return currentPendingUploads;
      });
    }, 0);
  };

  const handleComplete = async () => {
    // Clear onboarding state
    if (user?.id) {
      localStorage.removeItem(`onboarding_state_${user.id}`);
    }
    await refreshProfile();
    router.replace('/dashboard');
  };

  // Group categories by group
  const groupedCategories = Object.values(CATEGORY_METADATA).reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof CATEGORY_METADATA[InvestmentCategory][]>);

  // Determine next step after add_methods
  const proceedFromAddMethods = () => {
    if (pendingUploadCategories.length > 0) {
      setCurrentStep('upload');
      setUploadCategory(pendingUploadCategories[0]);
      setIsUploadModalOpen(true);
    } else if (pendingManualCategories.length > 0) {
      setCurrentStep('manual');
    } else {
      setCurrentStep('summary');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || (authStatus === 'authenticated' && hasPortfolio)) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col">
      <AppHeader />

      {/* Progress Bar */}
      {currentStep !== 'welcome' && (
        <div className="h-1 bg-[#E5E7EB] dark:bg-[#334155]">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ 
              width: `${((['welcome', 'category_selection', 'add_methods', 'upload', 'manual', 'summary'].indexOf(currentStep) + 1) / 6) * 100}%` 
            }}
          />
        </div>
      )}

      {/* Main Content - no flex-1 so footer sits directly below content, no empty gap */}
      <main className="flex items-start justify-center px-4 sm:px-6 py-4 sm:py-6 pt-16 sm:pt-20">
        <div className="w-full max-w-3xl">
          
          {/* SCREEN 0: Welcome */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <ChartIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Let's build your complete investment picture
              </h1>
              <p className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8] mb-8 sm:mb-12">
                This takes 5–10 minutes. You can skip anything and update later.
              </p>

              {/* Reassurance Points */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 text-left">
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 sm:p-6 border border-[#E5E7EB] dark:border-[#334155]">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Data privacy & security</h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Your data is encrypted and stored securely in India
                  </p>
                </div>
                
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 sm:p-6 border border-[#E5E7EB] dark:border-[#334155]">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <ChartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">All investments in one place</h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    See everything together for better decisions
                  </p>
                </div>
                
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 sm:p-6 border border-[#E5E7EB] dark:border-[#334155]">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <EditIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Edit anytime</h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Add, update, or remove investments whenever you want
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setCurrentStep('category_selection')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Start
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 1: Category Selection */}
          {currentStep === 'category_selection' && (
            <div className="w-full">
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-0.5">
                Where have you invested so far?
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3">
                Select all that apply. You can add more later.
              </p>

              {/* Category Groups - 5 units spacing between rows, larger boxes */}
              <div className="space-y-4 sm:space-y-5 mb-4">
                {Object.entries(groupedCategories).map(([groupKey, categories]) => (
                  <div key={groupKey}>
                    <h3 className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide mb-2">
                      {GROUP_LABELS[groupKey]}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-5">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryToggle(cat.id)}
                          className={`
                            flex items-center gap-3 p-3 sm:p-4 rounded-lg border-2 transition-all text-left min-h-[3.75rem]
                            ${onboardingState.selectedCategories.includes(cat.id)
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                              : 'border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF] dark:hover:border-[#475569] bg-white dark:bg-[#1E293B]'
                            }
                          `}
                        >
                          <span className="text-lg sm:text-xl shrink-0">{cat.icon}</span>
                          <span className="font-medium text-base text-[#0F172A] dark:text-[#F8FAFC] flex-1 truncate">{cat.label}</span>
                          {onboardingState.selectedCategories.includes(cat.id) && (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-[#E5E7EB] dark:border-[#334155]">
                <button 
                  onClick={() => setCurrentStep('welcome')}
                  className="flex items-center justify-center gap-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors order-2 sm:order-1"
                  >
                    Skip this step
                  </button>
                  <button
                    onClick={() => {
                      // Initialize status for all selected categories
                      const newState = { ...onboardingState };
                      onboardingState.selectedCategories.forEach(cat => {
                        if (!newState.categoryStatus?.[cat]) {
                          newState.categoryStatus = newState.categoryStatus || {};
                          newState.categoryStatus[cat] = 'not_added';
                        }
                      });
                      saveState(newState);
                      setCurrentStep('setup_queue');
                    }}
                    disabled={onboardingState.selectedCategories.length === 0}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    Continue
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: Investment Setup Queue */}
          {currentStep === 'setup_queue' && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Set up your investments
              </h2>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6 sm:mb-8">
                Click "Add" for each investment type you'd like to add now. You can skip any and add them later.
              </p>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {onboardingState.selectedCategories.map((categoryId) => {
                  const category = CATEGORY_METADATA[categoryId];
                  const status = onboardingState.categoryStatus?.[categoryId] || 'not_added';
                  
                  return (
                    <div
                      key={categoryId}
                      className={`
                        bg-white dark:bg-[#1E293B] rounded-xl border-2 p-4 sm:p-6 transition-all
                        ${status === 'added' 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500' 
                          : status === 'skipped'
                          ? 'border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]/50'
                          : 'border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF] dark:hover:border-[#475569]'
                        }
                      `}
                    >
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span className="text-2xl sm:text-3xl">{category.icon}</span>
                          <div>
                            <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-base sm:text-lg">{category.label}</h3>
                            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
                              {status === 'added' && '✓ Added'}
                              {status === 'skipped' && 'Skipped for now'}
                              {status === 'not_added' && 'Not added yet'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {status === 'not_added' && (
                            <>
                              <button
                                onClick={() => {
                                  setCurrentAssetCategory(categoryId);
                                  setCurrentStep('add_method');
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => {
                                  const newState = { ...onboardingState };
                                  newState.categoryStatus = newState.categoryStatus || {};
                                  newState.categoryStatus[categoryId] = 'skipped';
                                  saveState(newState);
                                }}
                                className="px-4 py-2 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#334155] transition-colors"
                              >
                                Skip
                              </button>
                            </>
                          )}
                          {status === 'added' && (
                            <button
                              onClick={() => {
                                setCurrentAssetCategory(categoryId);
                                setCurrentStep('add_method');
                              }}
                              className="px-4 py-2 border border-emerald-600 text-emerald-600 dark:text-emerald-400 font-medium rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {status === 'skipped' && (
                            <button
                              onClick={() => {
                                setCurrentAssetCategory(categoryId);
                                setCurrentStep('add_method');
                              }}
                              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              Add Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
                <button 
                  onClick={() => setCurrentStep('category_selection')}
                  className="flex items-center justify-center gap-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors order-2 sm:order-1"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => setCurrentStep('summary')}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors order-1 sm:order-2"
                  >
                    Continue to Summary
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 3: Add Method (Asset-Specific) */}
          {currentStep === 'add_method' && currentAssetCategory && (
            <div>
              {(() => {
                const category = CATEGORY_METADATA[currentAssetCategory];
                const availableMethods = CATEGORY_ADD_METHODS[currentAssetCategory];
                const selectedMethod = onboardingState.categoryAddMethods[currentAssetCategory];
                const isStocksOrETF = currentAssetCategory === 'stocks' || currentAssetCategory === 'etf';

                return (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-2xl sm:text-3xl">{category.icon}</span>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          Add {category.label}
                        </h2>
                        <p className="text-[#6B7280] dark:text-[#94A3B8] mt-1">
                          Choose how you'd like to add your {category.label.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Special microcopy for Stocks & ETFs */}
                    {isStocksOrETF && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800/30 mb-6">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          💡 You can upload statements from more than one broker. We'll automatically separate stocks and ETFs.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                      {availableMethods.map((methodId) => {
                        const method = ADD_METHOD_METADATA[methodId];
                        // Default focus to first recommended (upload) option, never to manual
                        const firstRecommended = availableMethods.find(m => ADD_METHOD_METADATA[m].recommended);
                        const effectiveSelected = selectedMethod ?? firstRecommended ?? availableMethods[0];
                        const isSelected = effectiveSelected === methodId;
                        
                        return (
                          <button
                            key={methodId}
                            onClick={() => {
                              const newState = { ...onboardingState };
                              newState.categoryAddMethods = newState.categoryAddMethods || {};
                              newState.categoryAddMethods[currentAssetCategory] = methodId;
                              saveState(newState);

                              // Navigate based on method
                              if (methodId === 'skip') {
                                newState.categoryStatus = newState.categoryStatus || {};
                                newState.categoryStatus[currentAssetCategory] = 'skipped';
                                saveState(newState);
                                setCurrentStep('setup_queue');
                                setCurrentAssetCategory(null);
                              } else if (methodId === 'upload_cas' || methodId === 'upload_amc' || methodId === 'upload_broker') {
                                setUploadCategory(currentAssetCategory);
                                setIsUploadModalOpen(true);
                              } else if (methodId === 'manual') {
                                // Navigate directly to add form - skip manual step and hub
                                router.push(getAddUrlForCategory(currentAssetCategory));
                                setCurrentAssetCategory(null);
                              }
                            }}
                            className={`
                              text-left p-4 sm:p-5 rounded-xl border-2 transition-all
                              ${isSelected
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                                : 'border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF] dark:hover:border-[#475569] bg-white dark:bg-[#1E293B]'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{method.label}</span>
                              {method.recommended && (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            {method.description && (
                              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{method.description}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
                      <button 
                        onClick={() => {
                          setCurrentStep('setup_queue');
                          setCurrentAssetCategory(null);
                        }}
                        className="flex items-center justify-center gap-2 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                      >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setCurrentStep('setup_queue');
                          setCurrentAssetCategory(null);
                        }}
                        className="text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}


          {/* SCREEN 4: Manual Entry - Navigate to Add Holdings hub */}
          {currentStep === 'manual' && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-6 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <EditIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Add your investments manually
              </h2>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-8">
                Choose the type of investment and enter your details.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
                <button
                  onClick={() => router.push('/portfolio/holdings/add?from=onboarding')}
                  className="inline-flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Holdings
                </button>
                <button
                  onClick={() => {
                    // Mark manual categories as skipped when user skips
                    const newState = { ...onboardingState };
                    newState.categoryStatus = newState.categoryStatus || {};
                    pendingManualCategories.forEach(cat => {
                      newState.categoryStatus![cat] = 'skipped';
                    });
                    saveState(newState);
                    setCurrentStep('summary');
                  }}
                  className="text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                >
                  Skip for now →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: Post-Upload Flow */}
          {currentStep === 'post_upload' && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Investment added successfully!
              </h2>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6 sm:mb-8">
                What would you like to do next?
              </p>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <button
                  onClick={() => {
                    setCurrentStep('setup_queue');
                    setCurrentAssetCategory(null);
                  }}
                  className="w-full max-w-md mx-auto flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add another investment
                </button>
                
                <button
                  onClick={() => {
                    // Check if there are more categories not added
                    const remaining = onboardingState.selectedCategories.filter(
                      cat => onboardingState.categoryStatus?.[cat] !== 'added' && onboardingState.categoryStatus?.[cat] !== 'skipped'
                    );
                    
                    if (remaining.length > 0) {
                      // Mark remaining as skipped and go to summary
                      const newState = { ...onboardingState };
                      newState.categoryStatus = newState.categoryStatus || {};
                      remaining.forEach(cat => {
                        newState.categoryStatus[cat] = 'skipped';
                      });
                      saveState(newState);
                    }
                    
                    setCurrentStep('summary');
                  }}
                  className="w-full max-w-md mx-auto px-6 py-4 text-[#6B7280] dark:text-[#94A3B8] font-medium rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors"
                >
                  Skip remaining and go to dashboard
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: Summary */}
          {currentStep === 'summary' && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  You're all set!
                </h2>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6 sm:mb-8">
                  Here's what we've set up. You can add more anytime.
                </p>
              </div>

              {/* Summary of selections */}
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {onboardingState.selectedCategories.map((catId) => {
                  const category = CATEGORY_METADATA[catId];
                  const method = onboardingState.categoryAddMethods[catId];
                  const methodLabel = method ? ADD_METHOD_METADATA[method].label : 'Not selected';
                  const isCompleted = uploadedCategories.has(catId) || onboardingState.categoryStatus?.[catId] === 'added' || onboardingState.categoryStatus?.[catId] === 'skipped' || method === 'skip';
                  
                  return (
                    <div key={catId} className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{category.icon}</span>
                        <div>
                          <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{category.label}</p>
                          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">{methodLabel}</p>
                        </div>
                      </div>
                      {isCompleted ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      ) : (
                        <span className="text-sm text-[#9CA3AF] dark:text-[#64748B]">Pending</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Friendly nudge */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800/30 mb-6 sm:mb-8">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> Most investors also add EPF and insurance later. You can add them anytime from your dashboard.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => setCurrentStep('category_selection')}
                  className="px-6 py-3 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium transition-colors"
                >
                  Add more now
                </button>
                <button
                  onClick={handleComplete}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer - Compact during onboarding flow to fit content in viewport */}
      <footer className="bg-[#F6F8FB] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155] mt-auto shrink-0">
        {['welcome', 'category_selection', 'setup_queue', 'add_method', 'summary'].includes(currentStep) ? (
          <div className="container mx-auto px-4 sm:px-6 py-2">
            <p className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
              © {new Date().getFullYear()} LensOnWealth · <Link href="/privacy" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC]">Privacy</Link> · <Link href="/terms" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC]">Terms</Link> · 🔒 Core data stored in India
            </p>
          </div>
        ) : (
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 sm:gap-8">
            
            {/* Column 1: Brand & Description */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <LogoLockup linkToHome={true} showTagline={true} iconSize="w-12 h-12" />
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4 max-w-sm">
                Your clear view of complete wealth. Track stocks, mutual funds, and ETFs from all platforms in one unified dashboard.
              </p>
            </div>

            {/* Column 2: Product */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/#features" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Features</Link></li>
                <li><Link href="/#pricing" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Pricing</Link></li>
                <li><Link href="/#platforms" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Supported Platforms</Link></li>
                <li><Link href="/roadmap" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Roadmap</Link></li>
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">About Us</Link></li>
              </ul>
            </div>

            {/* Column 4: Legal & Help */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Legal & Help</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Terms of Service</Link></li>
                <li><Link href="/security" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Security</Link></li>
                <li><Link href="/refund-policy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Refund Policy</Link></li>
              </ul>
            </div>

            {/* Column 5: Contact */}
            <FooterContactWithFeedback showFollowUs={false} />

          </div>

          {/* Bottom Bar */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-center md:text-left">
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs mb-1">
                © {new Date().getFullYear()} LensOnWealth. Built with ❤️ in India for Indian investors.
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs leading-tight">
                <strong className="text-[#6B7280] dark:text-[#94A3B8]">Disclaimer:</strong> This is an educational portfolio tracking tool. 
                We do not provide investment advice, recommendations, or tips. Your data is encrypted and stored securely in India.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-end text-xs text-[#6B7280] dark:text-[#94A3B8]">
              <span>🔒 Core data stored in India</span>
              <span>🇮🇳 Made in India</span>
            </div>
          </div>
        </div>
        )}
      </footer>

      {/* Upload Modal */}
      {user && isUploadModalOpen && uploadCategory && (
        <PortfolioUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadCategory(null);
            setCurrentAssetCategory(null);
            setCurrentStep('setup_queue');
          }}
          userId={user.id}
          source="onboarding"
          onSuccess={() => {
            // Mark category as added
            const newState = { ...onboardingState };
            newState.categoryStatus = newState.categoryStatus || {};
            if (uploadCategory) {
              newState.categoryStatus[uploadCategory] = 'added';
              saveState(newState);
              setUploadedCategories(prev => new Set(prev).add(uploadCategory));
            }
            
            setIsUploadModalOpen(false);
            setUploadCategory(null);
            setCurrentAssetCategory(null);
            
            // Navigate to post-upload flow to ask what's next
            setCurrentStep('post_upload');
          }}
        />
      )}

    </div>
  );
}
