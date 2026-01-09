/**
 * Onboarding Checklist Component
 * 
 * Non-blocking, collapsible checklist for first-time users.
 * Helps users reach first meaningful value quickly.
 * 
 * DESIGN PRINCIPLES:
 * - Collapsible (doesn't take up space when minimized)
 * - Non-blocking (user can use dashboard normally)
 * - Dismissible (user can hide it permanently)
 * - Calm, professional tone
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  CheckCircleIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  XIcon,
  PlusIcon,
  EyeIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '@/components/icons';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'add-investments' | 'review-portfolio' | 'view-insights' | 'secure-account';

interface OnboardingStepData {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  onDismiss?: () => void;
}

export default function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const { user, hasPortfolio } = useAuth();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());
  const lastCheckedRef = useRef<string>('');

  // Load dismissed state and progress from localStorage
  useEffect(() => {
    if (!user) return;

    const dismissed = localStorage.getItem(`onboarding_dismissed_${user.id}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Load completed steps
    const saved = localStorage.getItem(`onboarding_progress_${user.id}`);
    if (saved) {
      try {
        const steps = JSON.parse(saved) as OnboardingStep[];
        setCompletedSteps(new Set(steps));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [user]);

  // Check step completion status
  useEffect(() => {
    if (!user || !hasPortfolio) return;

    // Build a unique key for the current state to avoid unnecessary updates
    const stateKey = `${user.id}-${hasPortfolio}-${user.email_confirmed_at || ''}-${user.phone_confirmed_at || ''}-${localStorage.getItem(`onboarding_viewed_portfolio_${user.id}`) || ''}-${localStorage.getItem(`onboarding_viewed_insights_${user.id}`) || ''}`;
    
    // Skip if we've already checked this exact state
    if (lastCheckedRef.current === stateKey) return;
    
    const newCompleted = new Set<OnboardingStep>();

    // Check if investments are added (has portfolio)
    if (hasPortfolio) {
      newCompleted.add('add-investments');
    }

    // Check if user has viewed portfolio (check localStorage)
    const hasViewedPortfolio = localStorage.getItem(`onboarding_viewed_portfolio_${user.id}`);
    if (hasViewedPortfolio === 'true') {
      newCompleted.add('review-portfolio');
    }

    // Check if user has viewed insights (check localStorage)
    const hasViewedInsights = localStorage.getItem(`onboarding_viewed_insights_${user.id}`);
    if (hasViewedInsights === 'true') {
      newCompleted.add('view-insights');
    }

    // Check if account is secured (has email or phone verified)
    // This is checked via auth context
    const hasSecureAccount = user.email_confirmed_at || user.phone_confirmed_at;
    if (hasSecureAccount) {
      newCompleted.add('secure-account');
    }

    // Update state and mark as checked
    setCompletedSteps(newCompleted);
    lastCheckedRef.current = stateKey;
    
    // Save progress
    localStorage.setItem(`onboarding_progress_${user.id}`, JSON.stringify(Array.from(newCompleted)));
  }, [user, hasPortfolio, user?.id, user?.email_confirmed_at, user?.phone_confirmed_at]);

  const handleDismiss = () => {
    if (!user) return;
    
    setIsDismissed(true);
    localStorage.setItem(`onboarding_dismissed_${user.id}`, 'true');
    onDismiss?.();
  };

  const handleStepClick = (step: OnboardingStep, href?: string) => {
    if (href) {
      router.push(href);
    }
  };

  // Don't show if dismissed or user doesn't exist
  if (isDismissed || !user) {
    return null;
  }

  const steps: OnboardingStepData[] = [
    {
      id: 'add-investments',
      title: 'Add investments',
      description: 'Upload your portfolio or add investments manually to get started.',
      icon: <PlusIcon className="w-5 h-5" />,
      actionLabel: hasPortfolio ? 'View Portfolio' : 'Add Investments',
      actionHref: hasPortfolio ? '/dashboard' : '/onboarding',
      completed: completedSteps.has('add-investments'),
    },
    {
      id: 'review-portfolio',
      title: 'Review portfolio',
      description: 'Explore your holdings and understand your asset allocation.',
      icon: <EyeIcon className="w-5 h-5" />,
      actionLabel: 'View Portfolio',
      actionHref: '/dashboard',
      completed: completedSteps.has('review-portfolio'),
    },
    {
      id: 'view-insights',
      title: 'View insights',
      description: 'See portfolio summaries and insights based on your data.',
      icon: <SparklesIcon className="w-5 h-5" />,
      actionLabel: 'View Insights',
      actionHref: '/dashboard',
      completed: completedSteps.has('view-insights'),
    },
    {
      id: 'secure-account',
      title: 'Secure account',
      description: 'Verify your email or phone for enhanced security.',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      actionLabel: 'Go to Settings',
      actionHref: '/account',
      completed: completedSteps.has('secure-account'),
    },
  ];

  const completedCount = completedSteps.size;
  const totalSteps = steps.length;
  const allCompleted = completedCount === totalSteps;

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm mb-6">
      {/* Header - Always visible */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Getting Started</h3>
            {allCompleted && (
              <span className="text-xs text-[#16A34A] dark:text-[#22C55E] font-medium">Complete</span>
            )}
          </div>
          {!allCompleted && (
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              {completedCount} of {totalSteps} completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#334155] transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {/* Checklist Items - Collapsible */}
      {isExpanded && (
        <div className="px-6 py-4 space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                step.completed
                  ? 'bg-[#F0FDF4] dark:bg-[#166534]/20 border-[#D1FAE5] dark:border-[#22C55E]/30'
                  : 'bg-[#F6F8FB] dark:bg-[#334155] border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F9FAFB] dark:hover:bg-[#475569]'
              }`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${
                step.completed ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#6B7280] dark:text-[#94A3B8]'
              }`}>
                {step.completed ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-[#6B7280]" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`${step.completed ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                    {step.icon}
                  </div>
                  <h4 className={`text-sm font-medium ${
                    step.completed ? 'text-[#166534] dark:text-[#22C55E]' : 'text-[#0F172A] dark:text-[#F8FAFC]'
                  }`}>
                    {step.title}
                  </h4>
                </div>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3">
                  {step.description}
                </p>
                {step.actionLabel && step.actionHref && !step.completed && (
                  <Link
                    href={step.actionHref}
                    onClick={() => handleStepClick(step.id, step.actionHref)}
                    className="inline-flex items-center gap-2 text-sm text-[#2563EB] dark:text-[#3B82F6] font-medium hover:text-[#1E40AF] dark:hover:text-[#2563EB] transition-colors"
                  >
                    {step.actionLabel}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}

          {/* Completion Message */}
          {allCompleted && (
            <div className="mt-4 p-4 bg-[#F0FDF4] dark:bg-[#166534]/20 border border-[#D1FAE5] dark:border-[#22C55E]/30 rounded-lg">
              <p className="text-sm text-[#166534] dark:text-[#22C55E] text-center">
                Great! You're all set. Explore your portfolio and insights to get the most out of WealthLens.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

