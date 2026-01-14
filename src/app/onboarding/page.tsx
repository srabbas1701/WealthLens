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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SparklesIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  LockIcon,
  UploadIcon,
  ShieldCheckIcon,
  EditIcon,
  PlusIcon,
} from '@/components/icons';
import { LogoLockup } from '@/components/LogoLockup';
import PortfolioUploadModal from '@/components/PortfolioUploadModal';
import ManualInvestmentModal from '@/components/ManualInvestmentModal';
import { useAuth } from '@/lib/auth';
import type { InvestmentCategory, AddMethod, OnboardingState, AssetStatus } from '@/types/onboarding';
import { 
  CATEGORY_METADATA, 
  GROUP_LABELS, 
  ADD_METHOD_METADATA,
  CATEGORY_ADD_METHODS,
} from '@/types/onboarding';

type Step = 'welcome' | 'category_selection' | 'setup_queue' | 'add_method' | 'upload' | 'review' | 'post_upload' | 'manual' | 'summary';

export default function OnboardingPage() {
  const router = useRouter();
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
  
  // Manual entry modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualCategory, setManualCategory] = useState<InvestmentCategory | null>(null);
  const [manualCategories, setManualCategories] = useState<Set<InvestmentCategory>>(new Set());
  
  // Track which categories need action
  const [pendingUploadCategories, setPendingUploadCategories] = useState<InvestmentCategory[]>([]);
  const [pendingManualCategories, setPendingManualCategories] = useState<InvestmentCategory[]>([]);

  // Auth guards
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/onboarding');
      return;
    }
    if (authStatus === 'authenticated' && hasPortfolio) {
      router.replace('/dashboard');
    }
  }, [authStatus, hasPortfolio, router]);

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
          
          // No more uploads, check manual categories
          setPendingManualCategories(currentPendingManuals => {
            setManualCategories(currentManual => {
              const remainingManuals = currentPendingManuals.filter(c => !currentManual.has(c));
              if (remainingManuals.length > 0) {
                setManualCategory(remainingManuals[0]);
                setIsManualModalOpen(true);
                return currentManual;
              }
              
              // All done, go to summary
              setCurrentStep('summary');
              return currentManual;
            });
            return currentPendingManuals;
          });
          
          return currentUploaded;
        });
        return currentPendingUploads;
      });
    }, 0);
  };

  const handleManualSuccess = () => {
    if (!manualCategory) return;
    
    const completedCategory = manualCategory;
    
    // Mark category as added
    const newState = { ...onboardingState };
    newState.categoryStatus = newState.categoryStatus || {};
    newState.categoryStatus[completedCategory] = 'added';
    saveState(newState);
    
    setManualCategories(prev => new Set(prev).add(completedCategory));
    setIsManualModalOpen(false);
    setManualCategory(null);
    setCurrentAssetCategory(null);
    
    // Navigate to post-upload flow
    setCurrentStep('post_upload');
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
      setManualCategory(pendingManualCategories[0]);
      setIsManualModalOpen(true);
    } else {
      setCurrentStep('summary');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || (authStatus === 'authenticated' && hasPortfolio)) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoLockup linkToHome={true} />
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {currentStep !== 'welcome' && (
        <div className="h-1 bg-gray-100">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ 
              width: `${((['welcome', 'category_selection', 'add_methods', 'upload', 'manual', 'summary'].indexOf(currentStep) + 1) / 6) * 100}%` 
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          
          {/* SCREEN 0: Welcome */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Let's build your complete investment picture
              </h1>
              <p className="text-lg text-gray-600 mb-12">
                This takes 5–10 minutes. You can skip anything and update later.
              </p>

              {/* Reassurance Points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                    <ShieldCheckIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data privacy & security</h3>
                  <p className="text-sm text-gray-600">
                    Your data is encrypted and stored securely in India
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                    <SparklesIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">All investments in one place</h3>
                  <p className="text-sm text-gray-600">
                    See everything together for better decisions
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                    <EditIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Edit anytime</h3>
                  <p className="text-sm text-gray-600">
                    Add, update, or remove investments whenever you want
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setCurrentStep('category_selection')}
                  className="flex items-center gap-2 px-8 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Start
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 1: Category Selection */}
          {currentStep === 'category_selection' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Where have you invested so far?
              </h2>
              <p className="text-gray-600 mb-8">
                Select all that apply. You can add more later.
              </p>

              {/* Category Groups */}
              <div className="space-y-8 mb-8">
                {Object.entries(groupedCategories).map(([groupKey, categories]) => (
                  <div key={groupKey}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                      {GROUP_LABELS[groupKey]}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryToggle(cat.id)}
                          className={`
                            flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left
                            ${onboardingState.selectedCategories.includes(cat.id)
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                        >
                          <span className="text-2xl">{cat.icon}</span>
                          <span className="font-medium text-gray-900 flex-1">{cat.label}</span>
                          {onboardingState.selectedCategories.includes(cat.id) && (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setCurrentStep('welcome')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="text-sm text-gray-500 hover:text-gray-700"
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Set up your investments
              </h2>
              <p className="text-gray-600 mb-8">
                Click "Add" for each investment type you'd like to add now. You can skip any and add them later.
              </p>

              <div className="space-y-4 mb-8">
                {onboardingState.selectedCategories.map((categoryId) => {
                  const category = CATEGORY_METADATA[categoryId];
                  const status = onboardingState.categoryStatus?.[categoryId] || 'not_added';
                  
                  return (
                    <div
                      key={categoryId}
                      className={`
                        bg-white rounded-xl border-2 p-6 transition-all
                        ${status === 'added' 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : status === 'skipped'
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{category.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{category.label}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {status === 'added' && '✓ Added'}
                              {status === 'skipped' && 'Skipped for now'}
                              {status === 'not_added' && 'Not added yet'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
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
                                className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
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
                              className="px-4 py-2 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors"
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

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setCurrentStep('category_selection')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => setCurrentStep('summary')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
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
                      <span className="text-3xl">{category.icon}</span>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Add {category.label}
                        </h2>
                        <p className="text-gray-600 mt-1">
                          Choose how you'd like to add your {category.label.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Special microcopy for Stocks & ETFs */}
                    {isStocksOrETF && (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-6">
                        <p className="text-sm text-blue-800">
                          💡 You can upload statements from more than one broker. We'll automatically separate stocks and ETFs.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {availableMethods.map((methodId) => {
                        const method = ADD_METHOD_METADATA[methodId];
                        const isSelected = selectedMethod === methodId;
                        
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
                                setManualCategory(currentAssetCategory);
                                setIsManualModalOpen(true);
                              }
                            }}
                            className={`
                              text-left p-5 rounded-xl border-2 transition-all
                              ${isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">{method.label}</span>
                              {method.recommended && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            {method.description && (
                              <p className="text-sm text-gray-600">{method.description}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                      <button 
                        onClick={() => {
                          setCurrentStep('setup_queue');
                          setCurrentAssetCategory(null);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                      >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setCurrentStep('setup_queue');
                          setCurrentAssetCategory(null);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}


          {/* SCREEN 4: Manual Entry - Handled via Modal */}
          {currentStep === 'manual' && !isManualModalOpen && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <EditIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Add your investments manually
              </h2>
              <p className="text-gray-600 mb-8">
                Enter your investment details step by step.
              </p>
              <button
                onClick={() => setCurrentStep('summary')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now →
              </button>
            </div>
          )}

          {/* SCREEN 4: Post-Upload Flow */}
          {currentStep === 'post_upload' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Investment added successfully!
              </h2>
              <p className="text-gray-600 mb-8">
                What would you like to do next?
              </p>

              <div className="space-y-4 mb-8">
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
                  className="w-full max-w-md mx-auto px-6 py-4 text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Skip remaining and go to dashboard
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: Summary */}
          {currentStep === 'summary' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You're all set!
                </h2>
                <p className="text-gray-600 mb-8">
                  Here's what we've set up. You can add more anytime.
                </p>
              </div>

              {/* Summary of selections */}
              <div className="space-y-4 mb-8">
                {onboardingState.selectedCategories.map((catId) => {
                  const category = CATEGORY_METADATA[catId];
                  const method = onboardingState.categoryAddMethods[catId];
                  const methodLabel = method ? ADD_METHOD_METADATA[method].label : 'Not selected';
                  const isCompleted = uploadedCategories.has(catId) || manualCategories.has(catId) || method === 'skip';
                  
                  return (
                    <div key={catId} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{category.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{category.label}</p>
                          <p className="text-sm text-gray-500">{methodLabel}</p>
                        </div>
                      </div>
                      {isCompleted ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <span className="text-sm text-gray-400">Pending</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Friendly nudge */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-8">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Most investors also add EPF and insurance later. You can add them anytime from your dashboard.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentStep('category_selection')}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Add more now
                </button>
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-8 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
        Your data is encrypted and stored securely in India
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

      {/* Manual Entry Modal */}
      {user && isManualModalOpen && manualCategory && (
        <ManualInvestmentModal
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setManualCategory(null);
            setCurrentAssetCategory(null);
            setCurrentStep('setup_queue');
          }}
          userId={user.id}
          source="onboarding"
          category={manualCategory}
          onSuccess={handleManualSuccess}
        />
      )}
    </div>
  );
}
