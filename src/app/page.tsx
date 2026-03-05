'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  TrendingDownIcon,
  FoldersIcon,
  TableIcon,
  LineChartIcon,
  UploadCloudIcon,
  LayersIcon,
  BarChart3Icon,
  PieChartIcon,
  SearchIcon,
  TrendingUpIcon,
  HomeIcon,
} from '@/components/icons';
import { useAuthSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import { Logo } from '@/components/Logo';
import RealEstateHighlights from '@/components/home/RealEstateHighlights';
import { usePlans } from '@/hooks/usePlans';
import PricingSection from '@/components/home/PricingSection';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

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
  const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState(false);
  const { 
    plans, 
    loading: plansLoading,
    error: plansError,
    currentSubscription,
  } = usePlans(!!user);  // Only fetch sub if user is logged in
  
  // Check for timeout message from auto-logout
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Handle inactivity timeout
    if (searchParams.get('timeout') === 'true') {
      setShowTimeoutMessage(true);
      // Remove query param from URL
      window.history.replaceState({}, '', '/');
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowTimeoutMessage(false), 5000);
      return () => clearTimeout(timer);
    }
    
    // Handle session expiration
    if (searchParams.get('session_expired') === 'true') {
      setShowSessionExpiredMessage(true);
      // Remove query param from URL
      window.history.replaceState({}, '', '/');
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowSessionExpiredMessage(false), 5000);
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
      question: "Do you connect directly to broker accounts?",
      answer: "No. LensOnWealth works through statements and manual inputs to keep your financial data secure."
    },
    {
      question: "Can I track all my investments here?",
      answer: "Yes. Track stocks, mutual funds, retirement accounts, property, gold, fixed deposits, and more."
    },
    {
      question: "Do you provide investment advice?",
      answer: "No. LensOnWealth provides portfolio analysis and insights only."
    },
    {
      question: "Is my financial data secure?",
      answer: "Yes. All data is encrypted and securely hosted in India."
    },
  ];

  const platforms = [
    { name: 'Zerodha', logo: '/logos/zerodha.png' },
    { name: 'Groww', logo: '/logos/groww.png' },
    { name: 'Upstox', logo: '/logos/upstox.png' },
    { name: 'ICICI Direct', logo: '/logos/icici-direct.png' },
    { name: 'HDFC Securities', logo: '/logos/hdfc-securities.png' },
    { name: 'CAMS', logo: '/logos/cams.png' },
    { name: 'KFintech', logo: '/logos/kfintech.png' },
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

      {/* Session Expired Message */}
      {showSessionExpiredMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4">
          <div className="bg-[#FEF3C7] dark:bg-[#78350F] border border-[#FDE68A] dark:border-[#92400E] rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#92400E] dark:text-[#FCD34D]">
                Your session has expired for security reasons. Please sign in again to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-20 overflow-hidden bg-[#F6F8FB] dark:bg-[#0F172A]">

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Value Proposition */}
            <div className="max-w-xl">
              <h1 className="text-5xl lg:text-6xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight mb-6">
                Stop Juggling Investment Accounts.
                <br />
                See Your Complete{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:to-[#22C55E]">Financial Picture</span>
                <br />
                in One Dashboard.
              </h1>

              <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed mb-8">
                Upload statements or enter manually. We organize everything, giving you one consolidated, real-time view of your complete financial picture, securely hosted in India.
              </p>

              {/* CTA */}
              <div className="flex flex-wrap gap-4 mb-8">
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

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-6 text-sm text-[#6B7280] dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  India-hosted data
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  Automated price updates
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  Built for Indian investors
                </div>
              </div>
            </div>

            {/* Right - Asset Cloud */}
            <div className="hidden lg:flex flex-col items-center justify-center">
              <div className="relative w-[520px] h-[520px] mx-auto flex items-center justify-center">

                {/* Ambient glow */}
                <div className="absolute w-80 h-80 bg-violet-400/10 dark:bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute w-52 h-52 bg-blue-400/8 dark:bg-blue-500/8 rounded-full blur-2xl pointer-events-none" />

                {/* CENTER: LensOnWealth brand */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-3">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                  <Logo size="w-12 h-12 relative z-10 flex-shrink-0" showText={false} />
                  <span className="text-4xl font-semibold tracking-wide text-[#0F172A] dark:text-[#F8FAFC] relative z-10 select-none whitespace-nowrap">LensOnWealth</span>
                </div>

                {/* ⚠️ LOCKED: DO NOT MODIFY constellation positioning below.
                     Positioning uses: className="absolute" + style transform="rotate(Adeg) translate(Rpx) rotate(-Adeg)"
                     No top/left/wrapper changes. Ask user before ANY change to this block. */}

                {/* Inner ring r=90px — AI Naira at top, Insurance & Reports flanking */}
                {([
                  { label: <>✦ AI N<span className="text-[#B45309] dark:text-[#D97706]">ai</span>ra</>, cls: "text-3xl font-semibold bg-gradient-to-r from-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:to-[#22C55E] bg-clip-text text-transparent", angle: -90 },
                  { label: "Reports",    cls: "text-base font-semibold text-[#16A34A] dark:text-[#86EFAC]",                                                                               angle:  28 },
                ] as { label: React.ReactNode; cls: string; angle: number }[]).map(({ label, cls, angle }) => (
                  <div key={label} className="absolute opacity-100" style={{ transform: `rotate(${angle}deg) translate(90px) rotate(${-angle}deg)` }}>
                    <span className={`whitespace-nowrap ${cls} hover:scale-105 transition-transform duration-200 cursor-default select-none block`}>{label}</span>
                  </div>
                ))}

                {/* Middle ring r=160px — explicit angles, opacity-90 */}
                {([
                  { label: "Stocks", cls: "text-3xl font-black text-[#2563EB] dark:text-[#3B82F6]", angle: -90 },
                  { label: "ETF",    cls: "text-3xl font-black text-[#2563EB] dark:text-[#3B82F6]", angle: -33 },
                  { label: "NPS",    cls: "text-2xl font-bold text-[#16A34A] dark:text-[#22C55E]",  angle: 154 },
                  { label: "PPF",    cls: "text-2xl font-bold text-[#16A34A] dark:text-[#22C55E]",  angle: 225 },
                ] as { label: string; cls: string; angle: number }[]).map(({ label, cls, angle }) => (
                  <div key={label} className="absolute opacity-90" style={{ transform: `rotate(${angle}deg) translate(160px) rotate(${-angle}deg)` }}>
                    <span className={`whitespace-nowrap ${cls} hover:scale-105 transition-transform duration-200 cursor-default select-none block`}>{label}</span>
                  </div>
                ))}

                {/* Outer ring — explicit angles + radius, opacity-75 */}
                {([
                  { label: "Insurance",          cls: "text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]",    r:  48, a: -130 },
                  { label: "EPF",                cls: "text-2xl font-bold text-[#16A34A] dark:text-[#22C55E]",    r:  95, a:  153 },
                  { label: "Mutual Funds",       cls: "text-3xl font-black text-[#2563EB] dark:text-[#3B82F6]",   r: 178, a:   63 },
                  { label: "Advanced Analytics", cls: "text-base font-medium text-[#0F172A] dark:text-[#F8FAFC]", r: 121, a:   49 },
                  { label: "Analytics",          cls: "text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]",   r: 230, a:  -90 },
                  { label: "Health Score",       cls: "text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]",   r: 230, a:  -66 },
                  { label: "Tax Cal",            cls: "text-base font-semibold text-[#16A34A] dark:text-[#86EFAC]", r: 230, a: -42 },
                  { label: "Real Estate",        cls: "text-xl font-bold text-[#1E40AF] dark:text-[#60A5FA]",     r: 230, a:  -10 },
                  { label: "Automated Updates",  cls: "text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]",   r: 230, a:    6 },
                  { label: "Gold",               cls: "text-lg font-semibold text-[#166534] dark:text-[#86EFAC]", r: 230, a:   15 },
                  { label: "Fixed Deposits",     cls: "text-xl font-bold text-[#1E40AF] dark:text-[#60A5FA]",     r: 223, a:   69 },
                  { label: "Manual Entry",       cls: "text-base font-semibold text-[#16A34A] dark:text-[#86EFAC]", r: 230, a: 135 },
                  { label: "Liabilities",        cls: "text-sm font-medium text-[#6B7280] dark:text-[#94A3B8]",   r: 230, a:  102 },
                  { label: "Silver",             cls: "text-lg font-semibold text-[#166534] dark:text-[#86EFAC]", r: 280, a:   45 },
                  { label: "India Hosted Data",  cls: "text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]",   r: 230, a:  150 },
                  { label: "Bonds",              cls: "text-lg font-semibold text-[#166534] dark:text-[#86EFAC]", r: 230, a:  174 },
                  { label: "Direct Uploads",     cls: "text-base font-semibold text-[#16A34A] dark:text-[#86EFAC]", r: 230, a: 198 },
                  { label: "AES-256 Encryption", cls: "text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]",   r: 230, a:  222 },
                  { label: "Cash",               cls: "text-base font-semibold text-[#6B7280] dark:text-[#94A3B8]", r: 230, a: 246 },
                  /* New labels – text-xs, Liabilities color, placed in gaps */
                  { label: "Home Loan",      cls: "text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]", r: 214, a: -122 },
                  { label: "Vehicle Loan",  cls: "text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]", r: 125, a:  -16 },
                  { label: "Education Loan", cls: "text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]", r: 206, a:   35 },
                  { label: "Health Insurance", cls: "text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]", r: 223, a:  120 },
                  { label: "Life Insurance", cls: "text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]", r: 152, a:  118 },
                ] as { label: string; cls: string; r: number; a: number }[]).map(({ label, cls, r, a }) => (
                  <div key={label} className="absolute opacity-75" style={{ transform: `rotate(${a}deg) translate(${r}px) rotate(${-a}deg)` }}>
                    <span className={`whitespace-nowrap ${cls} hover:scale-105 transition-transform duration-200 cursor-default select-none block`}>{label}</span>
                  </div>
                ))}

              </div>
              {/* Tagline + AI Naira badge */}
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] text-center mt-2 tracking-wide">
                Your complete financial universe, tracked, organized, clear.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs sm:text-sm">
                <span className="text-[#2563EB] dark:text-[#3B82F6]">✦</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:to-[#22C55E] font-semibold">AI N</span><span className="text-[#B45309] dark:text-[#D97706] font-semibold">ai</span><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#16A34A] to-[#16A34A] dark:from-[#22C55E] dark:to-[#22C55E] font-semibold">ra - Portfolio Analyst</span>
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
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              The Problem Every Investor Eventually Faces
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              Your investments may be growing, but your overall financial picture is often fragmented.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <FoldersIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'Investments Scattered Everywhere',
                description: 'Mutual funds, stocks, EPF, property, fixed deposits, your wealth lives across multiple platforms and statements. Seeing the full picture is difficult.'
              },
              {
                icon: <TableIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'Manual Tracking Doesn\'t Scale',
                description: 'Many investors rely on spreadsheets or memory. As investments grow, tracking becomes time-consuming and error-prone.'
              },
              {
                icon: <LineChartIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'No Clear Portfolio Insight',
                description: 'Without consolidation, it\'s difficult to understand allocation, diversification, and portfolio risk.'
              },
            ].map((problem, i) => (
              <div
                key={i}
                className="group p-5 sm:p-6 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
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
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              How LensOnWealth Works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              Bring your entire financial life into one organized system.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Timeline connector */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2563EB] via-[#16A34A] to-[#2563EB] dark:from-[#3B82F6] dark:via-[#22C55E] dark:to-[#3B82F6] opacity-20" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
              {[
                {
                  step: 1,
                  title: 'Upload Your Investment Records',
                  description: 'Import CAS statements, broker exports, or manually add assets like property, gold, or fixed deposits.',
                  subtitle: 'No broker login required.',
                  icon: <UploadCloudIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                },
                {
                  step: 2,
                  title: 'Everything Gets Organized',
                  description: 'LensOnWealth automatically structures your investments across asset classes and accounts.',
                  subtitle: 'All your financial records, organized in one place.',
                  icon: <LayersIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                },
                {
                  step: 3,
                  title: <>AI N<span className="text-[#B45309] dark:text-[#D97706]">ai</span>ra Analyzes Your Portfolio</>,
                  description: <>AI N<span className="text-[#B45309] dark:text-[#D97706]">ai</span>ra evaluates your portfolio to highlight allocation insights, diversification gaps, and potential risks.</>,
                  subtitle: 'No spreadsheets. No manual consolidation.',
                  icon: <SparklesIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="relative z-10 bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-2xl border-2 border-[#E5E7EB] dark:border-[#334155] hover:border-[#16A34A] dark:hover:border-[#22C55E] shadow-xl transition-all duration-300"
                >
                  <div className="absolute -top-4 sm:-top-5 -left-4 sm:-left-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#16A34A] dark:bg-[#22C55E] flex items-center justify-center text-[#0F172A] dark:text-[#F8FAFC] font-bold text-base sm:text-lg shadow-lg">
                    {step.step}
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6]">
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

      {/* Portfolio Intelligence Section */}
      <section id="features" className="py-16 sm:py-20 md:py-24 lg:py-28 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              Understand What Your Portfolio Is Really Doing
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
              LensOnWealth analyzes your entire portfolio to reveal allocation, diversification, risk exposure, and hidden concentration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: <BarChart3Icon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'Portfolio Overview',
                description: 'See your total portfolio value, holdings, asset classes, and risk profile in one place.'
              },
              {
                icon: <PieChartIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'Allocation & Diversification',
                description: 'Understand how your wealth is distributed across growth, income, real assets, and liquidity.'
              },
              {
                icon: <SearchIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'Investment X-Ray',
                description: 'Look inside mutual funds and ETFs to see your true exposure across sectors and asset classes.'
              },
              {
                icon: <TrendingDownIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: 'Scenario & Risk Insights',
                description: 'Understand how your portfolio might behave during market corrections or sector shocks.'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-5 sm:p-6 bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#334155] hover:border-[#16A34A] dark:hover:border-[#22C55E] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
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

      {/* Real Estate Highlights Section */}
      <RealEstateHighlights />

      {/* Asset Coverage Section */}
      <section id="platforms" className="py-16 sm:py-20 md:py-24 lg:py-28 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Built for Every Asset You Own
            </h2>
          </div>

          {/* Asset Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12 md:mb-16 max-w-7xl mx-auto">

            {/* Equity & Markets */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-5 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
                <TrendingUpIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Equity & Markets</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">Stocks · Mutual Funds · ETFs</p>
            </div>

            {/* Retirement */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-5 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
                <ShieldCheckIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Retirement</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">EPF · PPF · NPS</p>
            </div>

            {/* Fixed Income */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-5 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
                <LayersIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Fixed Income</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">Fixed Deposits · Bonds · Debt Funds</p>
            </div>

            {/* Real Assets */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl p-5 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300">
              <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
                <HomeIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Real Assets</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm">Real Estate · Gold · Silver · Other Assets</p>
            </div>
          </div>

          {/* Platform Integrations */}
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Works With Your Platforms</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-8 sm:mb-12 max-w-5xl mx-auto">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all duration-300"
              >
                <Image
                  src={platform.logo}
                  alt={platform.name}
                  width={80}
                  height={40}
                  className="object-contain w-auto h-10 grayscale opacity-80 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                />
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] text-center leading-tight">{platform.name}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm px-4">
            + Any platform with CSV export • Manual entry supported for all asset types
          </p>
        </div>
      </section>

      <PricingSection 
        plans={plans} 
        loading={plansLoading} 
        error={plansError}
        currentSubscription={currentSubscription}
        isLoggedIn={!!user}
      />

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-20 md:py-24 lg:py-28 bg-white dark:bg-[#1E293B]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
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

      {/* Trust & Transparency Block */}
      <section id="trust" className="py-16 sm:py-20 md:py-24 lg:py-28 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
              Trust &amp; Transparency
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-lg p-6 sm:p-8">
              <div className="space-y-4 text-[#6B7280] dark:text-[#94A3B8] text-sm sm:text-base leading-relaxed">
                <p>
                  LensOnWealth is a portfolio tracking and financial clarity tool.
                  We do not provide investment advice or execute trades.
                </p>
                <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  All information is provided for informational purposes only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] relative overflow-hidden">

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            See Your Entire Financial Life in One Place
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#6B7280] dark:text-[#94A3B8] px-2 sm:px-0">
            Join investors who want clarity across all their assets, not just their brokerage accounts.
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
                Start Tracking Your Portfolio, Free
              </Link>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center text-[#6B7280] dark:text-[#94A3B8] text-xs sm:text-sm px-4">
            <span>✅ Track ALL asset types</span>
            <span>✅ Free forever for basic tracking</span>
            <span>✅ No credit card required</span>
            <span>✅ Setup in under 5 minutes</span>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 justify-center text-[#9CA3AF] dark:text-[#6B7280] text-xs px-4 pt-2">
            <span>✓ No broker login required</span>
            <span>✓ Secure data storage</span>
            <span>✓ Works with all major platforms</span>
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
                <li><a href="/refund-policy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Refund Policy</a></li>
              </ul>
            </div>

            {/* Column 5: Contact */}
            <FooterContactWithFeedback />

          </div>

          {/* Bottom Bar */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-center md:text-left">
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs mb-1">
                © {new Date().getFullYear()} LensOnWealth. Built with ❤️ in India for Indian investors.
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-xs leading-tight">
                <strong className="text-[#6B7280] dark:text-[#94A3B8]">Disclaimer:</strong> LensOnWealth is a personal finance tracking software. 
                We do not provide investment advice, recommendations, or regulated financial services. Data displayed is for informational purposes only.
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
