'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  CheckCircleIcon, 
  LockIcon, 
  TargetIcon, 
  ChartIcon, 
  InfoIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UploadIcon,
  SparklesIcon,
  TrendingUpIcon,
  EyeIcon,
} from '@/components/icons';
import { useAuthSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import { Logo } from '@/components/Logo';

/**
 * LensOnWealth Landing Page - Best-in-Class Fintech Design
 * 
 * Transformed from WealthLens to LensOnWealth with:
 * - Modern gradient backgrounds
 * - Enhanced hero section with trust badges
 * - Problem/Solution flow
 * - Platform support showcase
 * - Interactive FAQ accordions
 * - Dramatic final CTA
 */
export default function HomePage() {
  const { user, authStatus } = useAuthSession();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  
  // Check for timeout message from auto-logout
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('timeout') === 'true') {
      setShowTimeoutMessage(true);
      // Remove query param from URL
      window.history.replaceState({}, '', '/');
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowTimeoutMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="w-24 h-24 mb-6 animate-pulse">
          <Logo size="w-24 h-24" />
        </div>
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-4">Loading LensOnWealth...</p>
      </div>
    );
  }
  
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "What types of investments can I track?",
      answer: "LensOnWealth tracks ALL your investments: Stocks, Mutual Funds, ETFs, EPF, NPS, PPF, Fixed Deposits, Bonds (corporate & government), Real Estate, Gold (physical & digital), Cash, and any other assets. If it's part of your wealth, we track it."
    },
    {
      question: "How do I add my EPF, NPS, or PPF accounts?",
      answer: "You can manually enter your EPF/NPS/PPF balances and contribution details. We'll automatically calculate interest and project future values. For EPF, you can download statements from the EPFO portal. For NPS, use your CRA statement. For PPF, use your passbook or bank statement."
    },
    {
      question: "Do you track fixed deposits and bonds?",
      answer: "Yes! Add your FDs with bank name, amount, interest rate, and maturity date. We'll track interest accrual and alert you before maturity. For bonds, add details manually or upload statements - we'll track current value and maturity."
    },
    {
      question: "Can I track real estate and gold?",
      answer: "Absolutely. Add real estate with purchase price and current market value. Track gold (physical or digital gold) with quantity and purchase price - we'll show current market value. Track any asset that contributes to your net worth."
    },
    {
      question: "What about my old investments or dormant accounts?",
      answer: "Perfect use case! Add everything - that old FD you forgot about, the PPF account from 10 years ago, shares from an old demat account. LensOnWealth helps you see your COMPLETE financial picture with clarity, including assets you might have forgotten."
    },
    {
      question: "Is my data safe?",
      answer: "Absolutely. We use bank-grade 256-bit encryption and store all data on Indian servers. We never share your information with third parties or use your data for any purpose other than wealth tracking. Your financial data is encrypted both in transit and at rest."
    },
    {
      question: "How accurate are valuations?",
      answer: "We source mutual fund NAVs directly from AMFI daily. Stock prices are updated in real-time from major Indian exchanges. EPF/NPS/PPF interest is calculated using current rates. FD interest is tracked based on your terms. You'll always see current valuations, not yesterday's prices."
    },
    {
      question: "Do I need broker login?",
      answer: "No! LensOnWealth works entirely through CSV exports and manual entry. Simply download your holdings from Zerodha, Groww, Kuvera, or any platform, and upload the file. For EPF/NPS/PPF/FDs, enter details manually. We never ask for broker credentials or API access. Your accounts stay completely separate."
    },
  ];

  const platforms = [
    { name: 'Zerodha', icon: '📊' },
    { name: 'Groww', icon: '📈' },
    { name: 'Kuvera', icon: '💰' },
    { name: 'ICICI Direct', icon: '🏦' },
    { name: 'Paytm Money', icon: '💳' },
    { name: 'ET Money', icon: '📱' },
    { name: 'Any CSV', icon: '📄' },
  ];
  
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      {/* Header */}
      <AppHeader />
      
      {/* Timeout Message */}
      {showTimeoutMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4">
          <div className="bg-[#F0FDF4] dark:bg-[#14532D] border border-[#D1FAE5] dark:border-[#166534] rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#166534] dark:text-[#86EFAC]">
                You were logged out due to inactivity to keep your account secure. Please sign in again to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#F6F8FB] dark:bg-[#0F172A]">
        
        <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-8 sm:pb-12 md:pb-16 lg:pb-20 relative z-10 h-full flex items-center">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center w-full">
            {/* Left - Value Proposition */}
            <div className="space-y-4 sm:space-y-5 md:space-y-6 text-center lg:text-left">
              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight tracking-tight">
                  Stop Juggling <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:to-[#22C55E]">Investment Apps</span>.
                  <br className="hidden sm:block" />
                  See Your Complete Wealth,&nbsp;Clearly
                </h1>
                
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#6B7280] dark:text-[#94A3B8] leading-relaxed max-w-2xl mx-auto lg:mx-0 px-2 sm:px-0">
                  Get a lens on <strong className="text-[#0F172A] dark:text-[#F8FAFC]">every rupee you own</strong> - stocks, mutual funds, EPF, NPS, PPF, 
                  fixed deposits, bonds, real estate, gold, and more. All platforms, all asset 
                  classes, crystal clear visibility. Real-time valuations. Zero manual work.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 justify-center lg:justify-start">
                {user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => {
                      // CRITICAL FIX: Mark navigation source to prevent redirect loops
                      sessionStorage.setItem('navigation_source', 'home');
                      sessionStorage.setItem('navigation_time', Date.now().toString());
                    }}
                    className="inline-flex items-center justify-center gap-2.5 px-8 sm:px-12 py-4 sm:py-5 min-h-[48px] rounded-full bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white text-base sm:text-lg font-bold hover:scale-105 hover:shadow-2xl transition-all duration-300 touch-target"
                  >
                    View Dashboard
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center gap-2.5 px-8 sm:px-12 py-4 sm:py-5 min-h-[48px] rounded-full bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white text-base sm:text-lg font-bold hover:scale-105 hover:shadow-2xl transition-all duration-300 touch-target"
                    >
                      Get Started Free
                      <ArrowRightIcon className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/demo"
                      className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-4 min-h-[48px] rounded-full border-2 border-[#E5E7EB] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] font-semibold hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-all duration-300 touch-target"
                    >
                      View Demo
                    </Link>
                  </>
                )}
              </div>

              {/* Asset Type Badges */}
              <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-[#E5E7EB] dark:border-[#334155]">
                <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm mb-2 sm:mb-3 text-center lg:text-left">Track all your investments:</p>
                <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center lg:justify-start">
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    📈 Stocks & ETFs
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    📊 Mutual Funds
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    🏦 EPF • NPS • PPF
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    💰 Fixed Deposits
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    📜 Bonds
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    🏠 Real Estate
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-full text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    ✨ Gold • Cash • More
                  </span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center lg:justify-start text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8]">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" />
                  <span>Bank-grade security</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" />
                  <span>Real-time updates</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" />
                  <span>Built for India</span>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="hidden lg:block relative">
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 animate-float">
                <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-[#EFF6FF] dark:bg-[#1E3A8A] border-b border-[#E5E7EB] dark:border-[#334155]">
                    <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Complete Wealth Overview</h2>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-4 text-center">Total Net Worth</p>
                      <div className="text-center">
                        <span className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">₹24,50,000</span>
                        <p className="text-sm text-[#16A34A] dark:text-[#22C55E] mt-2">+12.5% overall</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Equity</p>
                        <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹12,45,000</p>
                      </div>
                      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Retirement</p>
                        <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹8,20,000</p>
                      </div>
                      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Fixed Income</p>
                        <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹3,85,000</p>
                      </div>
                      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">Real Assets</p>
                        <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹0</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 z-20">
          <ChevronDownIcon className="w-6 h-6 sm:w-8 sm:h-8 text-[#6B7280] dark:text-[#94A3B8] animate-bounce-scroll" />
          <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Scroll to explore</span>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              The Problem Every Indian Investor Faces
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              Your investments are scattered. Your insights are incomplete. Your time is wasted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: '📱',
                title: 'Scattered Everywhere',
                description: 'Your stocks are in Zerodha. Mutual funds in Groww and Kuvera. EPF with your employer. NPS with pension fund. PPF at the post office. Fixed deposits across 3 banks. Where\'s the complete picture of your wealth?'
              },
              {
                icon: '📊',
                title: 'Manual Tracking Hell',
                description: 'Excel sheets with outdated values. Forgetting about that old FD. No idea what your EPF balance is today. Manually calculating PPF interest. Hours wasted every month just to know "What am I worth?"'
              },
              {
                icon: '🔍',
                title: 'No True Insights',
                description: 'What\'s your actual net worth? Real asset allocation across all investments? Are you too heavy in equity or fixed income? How much are you really saving for retirement? You\'re managing wealth blindfolded.'
              },
            ].map((problem, i) => (
              <div
                key={i}
                className="group p-6 sm:p-8 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-6 rounded-2xl bg-[#2563EB] dark:bg-[#3B82F6] flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg">
                  {problem.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                  {problem.title}
                </h3>
                <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {problem.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section - How It Works */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              How LensOnWealth Works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              Three simple steps to see your complete financial picture
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Timeline connector */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2563EB] via-[#16A34A] to-[#2563EB] dark:from-[#3B82F6] dark:via-[#22C55E] dark:to-[#3B82F6] opacity-20" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
              {[
                {
                  step: 1,
                  title: 'Upload & Connect',
                  description: 'Upload statements from Zerodha, Groww, Kuvera, and any platform. Add your EPF, NPS, PPF accounts. Enter fixed deposits, bonds, real estate, gold. Manual entry or CSV - we support both.',
                  subtitle: 'Supports: Stocks, MFs, EPF, NPS, PPF, FDs, Bonds, Real Estate, Gold, Cash & more',
                  icon: <UploadIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                },
                {
                  step: 2,
                  title: 'We Do the Magic',
                  description: 'Our engine automatically matches mutual fund ISINs, fetches real-time stock prices, updates NAVs daily, calculates EPF/NPS/PPF interest, tracks FD maturity dates, and values everything accurately.',
                  subtitle: 'Real-time prices • Automatic interest calculations • Maturity tracking',
                  icon: <SparklesIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                },
                {
                  step: 3,
                  title: 'Crystal Clear Visibility',
                  description: 'Get a clear lens on your true net worth across ALL assets. Complete visibility, instant insights. See complete asset allocation - equity vs debt vs retirement vs real assets. Track performance, set goals, get insights.',
                  subtitle: 'Complete net worth • True asset allocation • Holistic financial view',
                  icon: <EyeIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="relative z-10 bg-white dark:bg-[#1E293B] p-6 sm:p-8 rounded-2xl border-2 border-[#E5E7EB] dark:border-[#334155] hover:border-[#16A34A] dark:hover:border-[#22C55E] shadow-xl transition-all duration-300"
                >
                  <div className="absolute -top-4 sm:-top-6 -left-4 sm:-left-6 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#16A34A] dark:bg-[#22C55E] flex items-center justify-center text-[#0F172A] dark:text-[#F8FAFC] font-bold text-lg sm:text-xl shadow-lg">
                    {step.step}
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 mb-4 sm:mb-6 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6]">
                    {step.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8] leading-relaxed mb-3">
                    {step.description}
                  </p>
                  {step.subtitle && (
                    <div className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] italic">
                      {step.subtitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              Complete Clarity for Your Entire Wealth
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              Powerful features designed for comprehensive wealth tracking
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: '💼',
                title: 'Complete Wealth Tracking',
                description: 'Track every asset class - equity (stocks, MFs, ETFs), retirement (EPF, NPS, PPF), fixed income (FDs, bonds), real assets (real estate, gold), and cash. Your complete financial picture in one place.'
              },
              {
                icon: '🔗',
                title: 'Multi-Platform Portfolio',
                description: 'Upload holdings from Zerodha, Groww, Kuvera, ICICI Direct, and more. Add EPF from your employer portal, NPS statements, PPF passbook, bank FDs. Manual entry or CSV - we normalize everything into one clean view.'
              },
              {
                icon: '💹',
                title: 'Real-Time Clarity',
                description: 'Real-time stock prices, daily mutual fund NAVs, automatic EPF/NPS/PPF interest calculations. Always see your current net worth with crystal clarity, not yesterday\'s guess.'
              },
              {
                icon: '📊',
                title: 'Clear Asset Allocation',
                description: 'See your real allocation across equity, debt, retirement savings, real assets, and cash with perfect clarity. Not just "mutual fund allocation" - your entire wealth distribution. Understand exactly where you\'re overweight or underweight.'
              },
              {
                icon: '🎯',
                title: 'Retirement Planning',
                description: 'Track all retirement accounts together - EPF, NPS, PPF, retirement mutual funds. See total retirement corpus, project future value, identify gaps. Plan confidently for your golden years.'
              },
              {
                icon: '📈',
                title: 'Complete Analytics',
                description: 'Net worth tracking, P&L across all investments, XIRR calculations, tax optimization (LTCG/STCG), maturity calendars, goal tracking. Everything you need to manage your wealth intelligently.'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 sm:p-8 bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#334155] hover:border-[#16A34A] dark:hover:border-[#22C55E] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 mb-4 sm:mb-6 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A8A] group-hover:bg-[#EFF6FF]/50 dark:group-hover:bg-[#1E3A8A]/50 flex items-center justify-center text-2xl sm:text-3xl transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Can Track Section */}
      <section id="platforms" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-[#F6F8FB] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Get a Lens on Every Rupee You Own
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              From trading platforms to retirement accounts, from fixed deposits to 
              real estate - LensOnWealth gives you complete visibility across all your assets
            </p>
          </div>

          {/* Asset Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12 md:mb-16 max-w-7xl mx-auto">
            
            {/* Equity & Markets */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-6 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📈</div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">Equity & Markets</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">
                <li>✓ Stocks (NSE, BSE)</li>
                <li>✓ Mutual Funds</li>
                <li>✓ ETFs & Index Funds</li>
                <li>✓ SIP tracking</li>
              </ul>
            </div>

            {/* Retirement Accounts */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-6 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🏦</div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">Retirement</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">
                <li>✓ EPF (Employee Provident Fund)</li>
                <li>✓ NPS (National Pension System)</li>
                <li>✓ PPF (Public Provident Fund)</li>
                <li>✓ Superannuation</li>
              </ul>
            </div>

            {/* Fixed Income */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-6 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">💰</div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">Fixed Income</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">
                <li>✓ Fixed Deposits (Banks)</li>
                <li>✓ Corporate Bonds</li>
                <li>✓ Government Bonds</li>
                <li>✓ Debt Mutual Funds</li>
              </ul>
            </div>

            {/* Real Assets & Others */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-6 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✨</div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">Real Assets & More</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">
                <li>✓ Real Estate</li>
                <li>✓ Gold (Physical & Digital)</li>
                <li>✓ Cash & Savings</li>
                <li>✓ Other Investments</li>
              </ul>
            </div>
          </div>

          {/* Platform Support */}
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Works With Your Platforms</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-8 sm:mb-12 max-w-6xl mx-auto">
            {[
              { name: 'Zerodha', logo: '/logos/zerodha.png' },
              { name: 'Groww', logo: '/logos/groww.png' },
              { name: 'Kuvera', logo: '/logos/kuvera.png' },
              { name: 'ICICI Direct', logo: '/logos/icici-direct.png' },
              { name: 'Paytm Money', logo: '/logos/paytm-money.png' },
              { name: 'ET Money', logo: '/logos/etmoney.png' },
              { name: 'EPFO', logo: '/logos/epfo.png' },
              { name: 'NPS Trust', logo: '/logos/nps-trust.png' },
              { name: 'Post Office', logo: '/logos/post-office.png' },
              { name: 'HDFC Bank', logo: '/logos/hdfc-bank.png' },
              { name: 'ICICI Bank', logo: '/logos/icici-bank.png' },
              { name: 'SBI', logo: '/logos/sbi.png' },
            ].map((platform) => (
              <div 
                key={platform.name} 
                className="p-1 sm:p-1.5 bg-transparent rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300 flex items-center justify-center min-h-[30px] sm:min-h-[40px] touch-target"
              >
                <Image
                  src={platform.logo}
                  alt={platform.name}
                  width={90}
                  height={30}
                  className="object-contain max-w-full max-h-full w-auto h-auto opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>

          <p className="text-center text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm px-4">
            + Any platform with CSV export • Manual entry supported for all asset types
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8]">
              Free to start. Upgrade when you need deeper insights.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-8 sm:mb-12">
            {/* Free Tier Card */}
            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xl sm:rounded-2xl p-6 sm:p-8 hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-colors duration-300">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Free</h3>
                <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Portfolio Visibility</p>
              </div>
              
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">₹0</span>
                  <span className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8]">/month</span>
                </div>
              </div>
              
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Complete portfolio tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Net worth dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Asset-wise overview</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Full holdings tables</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Basic insights (3 per week)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Portfolio analyst (5 queries/month)</span>
                </li>
              </ul>
              
              <Link
                href="/signup"
                className="block w-full mt-6 sm:mt-8 px-6 py-4 min-h-[48px] bg-[#F1F5F9] dark:bg-[#334155] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] text-[#475569] dark:text-[#CBD5E1] rounded-lg font-semibold transition-colors duration-300 text-center touch-target"
              >
                Get Started Free
              </Link>
            </div>

            {/* Premium Tier Card */}
            <div className="relative bg-white dark:bg-[#1E293B] border-2 border-[#2563EB] dark:border-[#3B82F6] rounded-xl sm:rounded-2xl p-6 sm:p-8 hover:border-[#1E40AF] dark:hover:border-[#2563EB] transition-colors duration-300 shadow-xl">
              <div className="absolute -top-3 sm:-top-4 right-6 sm:right-8">
                <span className="bg-[#2563EB] dark:bg-[#3B82F6] text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold">
                  Premium
                </span>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Premium</h3>
                <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">Advanced Insights</p>
              </div>
              
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">₹499</span>
                  <span className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8]">/month</span>
                </div>
                <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm mt-2">
                  or ₹4,999/year (₹416/month)
                </p>
              </div>
              
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Everything in Free, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Portfolio Health Score with detailed breakdown</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Stability & downside analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Scenario-linked impact insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Advanced analytics (sector, market cap, geography)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Unlimited portfolio analyst queries</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8]">PDF reports & Excel exports</span>
                </li>
              </ul>
              
              <Link
                href="/signup"
                className="block w-full mt-6 sm:mt-8 px-6 py-4 min-h-[48px] bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-center touch-target"
              >
                Start 14-Day Trial
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm mb-4 sm:mb-6 px-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required to start</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No commissions or hidden fees</span>
            </div>
          </div>

          <p className="text-center text-[#6B7280] dark:text-[#94A3B8] text-sm sm:text-base max-w-3xl mx-auto px-4">
            Your wealth is always visible in the free tier. Premium unlocks deeper clarity and insights—upgrade only when you need more.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              Everything you need to know about LensOnWealth
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[60px] flex items-center justify-between text-left hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors duration-200 touch-target"
                >
                  <span className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] pr-4">
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUpIcon className="w-6 h-6 sm:w-5 sm:h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0" />
                  ) : (
                    <ChevronDownIcon className="w-6 h-6 sm:w-5 sm:h-5 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                    <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] relative overflow-hidden">
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Ready to See Your Complete Wealth, Clearly?
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#6B7280] dark:text-[#94A3B8] px-2 sm:px-0">
            Join hundreds of Indian investors who've gained clarity on their complete wealth 
            and started making smarter decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 min-h-[56px] bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white rounded-full text-lg sm:text-xl font-bold hover:scale-105 hover:shadow-2xl transition-all duration-300 touch-target"
              >
                View Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 min-h-[56px] bg-[#2563EB] dark:bg-[#3B82F6] hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] text-white rounded-full text-lg sm:text-xl font-bold hover:scale-105 hover:shadow-2xl transition-all duration-300 touch-target"
              >
                Upload Your First Portfolio - It's Free
              </Link>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm px-4">
            <span>✅ Track ALL asset types</span>
            <span>✅ Free forever for basic tracking</span>
            <span>✅ No credit card required</span>
            <span>✅ Setup in under 5 minutes</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F6F8FB] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155]">
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
                <li><a href="#features" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Features</a></li>
                <li><a href="#pricing" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Pricing</a></li>
                <li><a href="#platforms" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Supported Platforms</a></li>
                <li><Link href="/roadmap" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Roadmap</Link></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Changelog</span></li>
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Company</h3>
              <ul className="space-y-2">
                <li><a href="/about" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">About Us</a></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Blog</span></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Careers</span></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Press Kit</span></li>
              </ul>
            </div>

            {/* Column 4: Legal & Help */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Legal & Help</h3>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="/terms" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Terms of Service</a></li>
                <li><a href="/security" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Security</a></li>
                <li><a href="#faq" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">FAQ</a></li>
                <li><a href="/support" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Support</a></li>
              </ul>
            </div>

            {/* Column 5: Contact */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Contact</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-1">Email</p>
                  <a href="mailto:support@lensonwealth.com" className="text-xs sm:text-sm text-[#2563EB] dark:text-[#3B82F6] hover:underline font-medium">support@lensonwealth.com</a>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Follow Us</p>
                  <div className="flex gap-3">
                    <a href="https://twitter.com/lensonwealth" target="_blank" rel="noopener noreferrer" className="text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-label="Twitter">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                    </a>
                    <a href="https://linkedin.com/company/lensonwealth" target="_blank" rel="noopener noreferrer" className="text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-label="LinkedIn">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                    <a href="https://github.com/lensonwealth" target="_blank" rel="noopener noreferrer" className="text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-label="GitHub">
                        <path fillRule="evenodd" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" clipRule="evenodd"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-center md:text-left">
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs mb-1">
                © {new Date().getFullYear()} LensOnWealth. Built with ❤️ in India for Indian investors.
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs leading-tight">
                <strong className="text-[#6B7280] dark:text-[#94A3B8]">Disclaimer:</strong> This is an educational portfolio tracking tool. 
                We do not provide investment advice, recommendations, or tips. This is a read-only platform—we never execute trades or modify your data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-end text-xs text-[#6B7280] dark:text-[#94A3B8]">
              <span>🔒 Data stored in India</span>
              <span>📊 AMFI verified</span>
              <span>🇮🇳 Made in India</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
