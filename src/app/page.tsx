'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheckIcon, 
  CheckCircleIcon, 
  LockIcon, 
  TargetIcon, 
  ChartIcon, 
  InfoIcon,
  WalletIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from '@/components/icons';
import { useAuthSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';

/**
 * Landing Page - Professional Fintech Design
 * 
 * Aligned with dashboard design system:
 * - Same color palette and typography
 * - Dashboard-style tiles
 * - Product-led, trust-first
 * - AI positioned as analyst, not chatbot
 * 
 * NOTE: Uses useAuthSession() instead of useAuth() to avoid portfolio queries
 * This ensures the landing page loads instantly without waiting for app data
 */
export default function HomePage() {
  // CRITICAL: Use useAuthSession() - does NOT trigger portfolio/onboarding queries
  // Landing page doesn't need hasPortfolio, so we don't call useAuthAppData()
  const { user, authStatus } = useAuthSession();
  
  // GUARD: Show loading while session state is being determined (fast, no DB queries)
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] dark:border-[#334155] border-t-[#2563EB] dark:border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      {/* Header - Using AppHeader component for consistency */}
      <AppHeader />

      {/* Hero Section */}
      <section className={`relative min-h-screen flex items-center px-6 md:px-16 lg:px-24 ${!user ? 'pt-32' : 'pt-24'} pb-16`}>
        <div className="max-w-[1280px] mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Value Proposition */}
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-tight mb-6">
                Complete Portfolio Visibility
                <span className="block text-[#2563EB] dark:text-[#3B82F6] mt-2">For Indian Investors</span>
              </h1>
              
              <p className="text-lg text-[#475569] dark:text-[#CBD5E1] leading-relaxed mb-6 max-w-lg">
                See all your investments—stocks, mutual funds, fixed deposits, and more—in one professional dashboard. 
                Understand your portfolio with clarity and control.
              </p>

              <p className="text-base text-[#6B7280] dark:text-[#94A3B8] mb-8">
                Read-only access. No trading. No commissions. No advice.
              </p>

              {/* CTA */}
              <div className="mb-10 flex items-center gap-4">
                {user ? (
                  // For authenticated users, always show "View Dashboard" 
                  // (they'll be redirected appropriately by the dashboard page)
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2.5 px-9 py-[18px] rounded-lg bg-[#2563EB] dark:bg-[#EFF6FF] text-white dark:text-[#1E3A8A] text-lg font-semibold hover:bg-[#1E40AF] dark:hover:bg-[#DBEAFE] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-in-out"
                  >
                    View Dashboard
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2.5 px-9 py-[18px] rounded-lg bg-[#2563EB] dark:bg-[#EFF6FF] text-white dark:text-[#1E3A8A] text-lg font-semibold hover:bg-[#1E40AF] dark:hover:bg-[#DBEAFE] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-in-out"
                    >
                      Sign In
                      <ArrowRightIcon className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/demo"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#2563EB] dark:border-[#3B82F6] text-[#2563EB] dark:text-[#3B82F6] font-medium hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A] transition-colors"
                    >
                      View Demo
                    </Link>
                  </>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-[#6B7280] dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  <span>Free to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  <span>No bank login required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  <span>Data stays private</span>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative">
              <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm overflow-hidden">
                {/* Dashboard Header */}
                <div className="px-6 py-4 bg-[#F6F8FB] dark:bg-[#334155] border-b border-[#E5E7EB] dark:border-[#334155]">
                  <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Dashboard</h2>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6 space-y-6">
                  {/* Net Worth Hero */}
                  <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-3">Total Portfolio Value</p>
                    <p className="text-5xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-4">₹45,20,000</p>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">↑ 2.3% this week</p>
                  </div>
                  
                  {/* Asset Tiles */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-6">Mutual Funds</p>
                      <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">₹18,50,000</p>
                      <p className="text-base text-[#6B7280] dark:text-[#94A3B8]">41%</p>
                    </div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
                      <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] font-medium mb-6">Equity</p>
                      <p className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] number-emphasis mb-2">₹12,80,000</p>
                      <p className="text-base text-[#6B7280] dark:text-[#94A3B8]">28%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2">
          <ChevronDownIcon className="w-8 h-8 text-[#6B7280] dark:text-[#94A3B8] opacity-60 animate-bounce-scroll" />
          <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] opacity-50">Scroll to explore</span>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 md:py-16 px-6 bg-white dark:bg-[#1E293B] border-t border-[#E5E7EB] dark:border-[#334155]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
              Trusted by Indian Investors
            </h2>
            <p className="text-lg text-[#6B7280] dark:text-[#94A3B8]">
              Join 10,000+ investors tracking their complete portfolio
            </p>
          </div>

          {/* Platform Logos */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
            {[
              { name: 'Kuvera', logo: '/logos/kuvera.png' },
              { name: 'Groww', logo: '/logos/groww.png' },
              { name: 'Zerodha', logo: '/logos/zerodha.png' },
              { name: 'Coin', logo: '/logos/coin.png' },
              { name: 'ET Money', logo: '/logos/etmoney.png' },
            ].map((brand) => (
              <div
                key={brand.name}
                className="flex items-center justify-center h-8 md:h-10 opacity-80 hover:opacity-100 transition-all duration-200"
              >
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={120}
                  height={40}
                  className="h-8 md:h-10 w-auto object-contain"
                  priority={false}
                />
              </div>
            ))}
          </div>

          {/* Alternative: Uncomment to show testimonials instead of logos */}
          {/* <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
            <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-xl p-6 border border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-[#475569] dark:text-[#CBD5E1] mb-4 italic">
                "Finally, a tool that shows all my investments in one place. No more juggling multiple apps!"
              </p>
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Rajesh Kumar</p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Mumbai, Maharashtra</p>
            </div>
            <div className="bg-[#F6F8FB] dark:bg-[#334155] rounded-xl p-6 border border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-[#475569] dark:text-[#CBD5E1] mb-4 italic">
                "Love the transparency. Every number is verifiable and I can see exactly how my portfolio is calculated."
              </p>
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Priya Sharma</p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Bangalore, Karnataka</p>
            </div>
          </div> */}
        </div>
      </section>

      {/* Core Features - Dashboard-Style Tiles */}
      <section id="features" className="py-16 px-6 bg-white dark:bg-[#1E293B]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Professional Portfolio Management
            </h2>
            <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-2xl mx-auto">
              Tools designed for clarity, transparency, and control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* All Assets in One View */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
              <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center mb-6">
                <ChartIcon className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                All Assets, One View
              </h3>
              <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed text-sm">
                Stocks, mutual funds, fixed deposits, PPF, NPS, gold—see everything in one professional dashboard. 
                No more scattered statements or multiple apps.
              </p>
            </div>

            {/* Intelligent Insights */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
              <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center mb-6">
                <InfoIcon className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Intelligent Insights
              </h3>
              <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed text-sm">
                Get portfolio summaries, risk flags, and clear explanations. 
                Insights are provided automatically—no chat interface required. We never execute trades or modify your data.
              </p>
            </div>

            {/* Accuracy and Transparency */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
              <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center mb-6">
                <TargetIcon className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Accuracy and Transparency
              </h3>
              <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed text-sm">
                Every number is verifiable. See all holdings, verify totals, and understand exactly 
                how your portfolio is calculated. No hidden calculations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Explained - Text-Based Only */}
      <section className="py-16 px-6 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
                Portfolio Insights That Work Like an Analyst
              </h2>
              <p className="text-lg text-[#475569] dark:text-[#CBD5E1] mb-8 leading-relaxed">
                Get intelligent insights that observe, explain, and flag important changes—but never take action on your behalf.
              </p>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Summarizes Your Portfolio
                  </h3>
                  <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
                    Daily and weekly summaries of your portfolio performance, allocation changes, and key insights. 
                    Inline insights appear on your dashboard—no chat interface required.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Flags Risks and Opportunities
                  </h3>
                  <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
                    Alerts you to concentration risks, upcoming maturities, and portfolio imbalances—with clear explanations. 
                    Click "Why?" to understand the reasoning.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    Explains Complex Concepts
                  </h3>
                  <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
                    Expandable explanations for metrics like XIRR, sector exposure, or allocation. 
                    Text-based explanations—no chatbot interface. Insights never modify your financial data.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Example Insights */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
              <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-6">Example Insights</h3>
              <div className="space-y-4">
                <div className="bg-[#F9FAFB] dark:bg-[#334155] rounded-lg border border-[#E5E7EB] dark:border-[#334155] p-4">
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">Portfolio Summary</p>
                  <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                    Your portfolio shows strong performance this quarter, with equity holdings up 12.5%. 
                    However, there's concentration risk in the Banking sector at 29%, which exceeds the recommended 25% limit.
                  </p>
                </div>
                
                <div className="bg-[#FEF3C7] dark:bg-[#78350F] border border-[#F59E0B]/20 dark:border-[#FBBF24]/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <InfoIcon className="w-5 h-5 text-[#F59E0B] dark:text-[#FBBF24] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#92400E] dark:text-[#FCD34D] mb-1">
                        Concentration Risk
                      </p>
                      <p className="text-sm text-[#92400E] dark:text-[#FCD34D]">
                        Banking sector: 29% (above 25% recommended limit)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security - Emphasize Read-Only */}
      <section id="trust" className="py-16 px-6 bg-white dark:bg-[#1E293B]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Trust and Security
            </h2>
            <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-2xl mx-auto">
              Your financial data deserves bank-grade security and complete transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { 
                icon: <ShieldCheckIcon className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: "Read-Only Access", 
                desc: "We never execute trades, modify your data, or take any actions on your behalf. This is a read-only portfolio tracker—you maintain full control over your investments."
              },
              { 
                icon: <LockIcon className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: "Bank-Grade Security", 
                desc: "256-bit encryption. Your data is stored securely in India. We never share your information with third parties or use your data for any purpose other than portfolio tracking."
              },
              { 
                icon: <CheckCircleIcon className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />,
                title: "No Commissions or Advice", 
                desc: "No hidden fees, no product pushing, no investment recommendations. We provide portfolio intelligence only—no trading, no advice, no commissions."
              },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
                <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A] flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg text-[#0F172A] dark:text-[#F8FAFC] mb-3">{item.title}</h3>
                <p className="text-[#475569] dark:text-[#CBD5E1] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Compliance Badges */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-[#6B7280] dark:text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
              <span>SEBI Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
              <span>Data Stored in India</span>
            </div>
          </div>
        </div>
      </section>

      {/* Simple, Transparent Pricing */}
      <section id="pricing" className="py-16 px-6 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-2xl mx-auto">
              Free to start. Upgrade when you need deeper insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
            {/* Free Tier */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Free</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">Portfolio Visibility</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹0</span>
                  <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">/month</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Complete portfolio tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Net worth dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Asset-wise overview</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Full holdings tables</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Basic insights (3 per week)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Portfolio analyst (5 queries/month)</span>
                </li>
              </ul>
            </div>

            {/* Premium Tier */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border-2 border-[#2563EB] dark:border-[#3B82F6] p-8 relative">
              <div className="absolute top-0 right-6 -translate-y-1/2">
                <span className="bg-[#2563EB] dark:bg-[#EFF6FF] text-white dark:text-[#1E3A8A] text-xs font-semibold px-3 py-1 rounded-full">
                  Premium
                </span>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Premium</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">Advanced Insights</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">₹499</span>
                  <span className="text-sm text-[#6B7280] dark:text-[#94A3B8]">/month</span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">or ₹4,999/year (₹416/month)</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Everything in Free, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Advanced analytics (sector, market cap, geography)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Unlimited portfolio analyst queries</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Advanced insights (unlimited)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">Weekly deep dives & performance attribution</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#475569] dark:text-[#CBD5E1]">PDF reports & Excel exports</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Trust Messages */}
          <div className="text-center space-y-4">
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-[#6B7280] dark:text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
                <span>No credit card required to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-[#16A34A] dark:text-[#22C55E]" />
                <span>No commissions or hidden fees</span>
              </div>
            </div>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] max-w-2xl mx-auto">
              Your portfolio data is always visible in the free tier. Premium unlocks deeper analysis and insights—upgrade only when you're ready.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-white dark:bg-[#1E293B]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            Ready to See Your Complete Portfolio?
          </h2>
          <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] mb-8">
            Get started in minutes. Upload your portfolio data and see everything in one place.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#2563EB] dark:bg-[#EFF6FF] text-white dark:text-[#1E3A8A] font-semibold text-lg hover:bg-[#1E40AF] dark:hover:bg-[#DBEAFE] transition-colors"
          >
            Get Started
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-[#6B7280] dark:text-[#94A3B8]">
            Free to use • Setup takes 5 minutes • No bank login required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white dark:bg-[#1E293B] border-t border-[#E5E7EB] dark:border-[#334155]">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0A2540] dark:bg-[#1E40AF] flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">WealthLens</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-[#6B7280] dark:text-[#94A3B8]">
              <a href="#" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-[#E5E7EB] dark:border-[#334155] text-center text-sm text-[#6B7280] dark:text-[#94A3B8]">
            <p className="mb-2">
              <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Disclaimer:</strong> This is an educational portfolio tracking tool. 
              We do not provide investment advice, recommendations, or tips. This is a read-only platform—we never execute trades or modify your data.
            </p>
            <p>
              © 2024 WealthLens. Made with care in India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
