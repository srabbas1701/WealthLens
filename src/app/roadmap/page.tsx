/**
 * LensOnWealth Roadmap
 *
 * Clean, straightforward roadmap showing actual product status
 * Fully responsive, dark/light mode compatible
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import { FeatureRequestModal } from '@/components/FeatureRequestModal';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

export default function RoadmapPage() {
  const roadmapSections = [
    {
      title: "What's Already Live",
      status: "launched",
      badge: "Live",
      badgeColor: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      icon: "✅",
      features: [
        // Uploads & Data
        "Demo Mode — Try Without Signing Up",
        "Multi-Platform CSV Upload",
        "Daily NAV & Market Price Updates",
        // Asset Classes
        "Direct Equity (Stocks) Tracking",
        "Mutual Funds with XIRR Calculations",
        "ETF Portfolio Tracking",
        "Bonds & Fixed Income",
        "Fixed Deposits (FD) Management",
        "PPF, EPF & NPS Tracking",
        "Gold & Precious Metals",
        "Cash & Liquidity Positions",
        "Insurance Policy Management & Coverage Alerts",
        "Liabilities: Loans, Credit Cards & EMI Tracking",
        "Real Estate with Rental Income & Loan Management",
        "Real Estate Co-Ownership Tracking",
        // Portfolio & Net Worth
        "Unified Net Worth Dashboard",
        "Portfolio Health Score",
        "Net Worth Timeline & History",
        "Credit Health Score",
        // Analytics
        "Complete Asset Allocation View",
        "Sector Exposure Analysis",
        "Market Cap Analysis (Large / Mid / Small Cap)",
        "Geography Diversification",
        "Mutual Fund X-Ray",
        "Stability Analytics",
        "Scenario Impact Analysis (Market Drawdown, Sector Shock, Rate Shock)",
        "Property Sell / Hold Simulation",
        // AI Features
        <>AI N<span className="text-[#2563EB] dark:text-[#3B82F6] font-semibold">ai</span>ra — Ask Questions in Natural Language</>,
        "Daily AI Portfolio Summary",
        "Weekly AI Portfolio Insights",
        // Downloads
        "PDF Downloads (Holdings, Net Worth Statement)",
      ] as React.ReactNode[],
    },
    {
      title: "Coming Very Soon",
      status: "in-progress",
      badge: "In Progress",
      badgeColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      icon: "🚧",
      features: [
        "Property & Related Income Tracking",
        "Tax Optimization Reports",
        "Financial Goals Tracking",
        "Advanced XIRR Calculations",
        "More Download & Export Options",
      ],
    },
    {
      title: "Exciting Future",
      status: "planned",
      badge: "Planned",
      badgeColor: "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400",
      icon: "📋",
      features: [
        "Native Mobile Apps (iOS & Android)",
        "Enhanced Bonds & Fixed Income",
        "Scenario Analysis",
        "Family Portfolio Management",
        "Direct API Integrations (Zerodha, Groww)",
      ],
    },
    {
      title: "Innovation",
      status: "exploring",
      badge: "Exploring",
      badgeColor: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
      icon: "🔍",
      features: [
        "Cryptocurrency Tracking",
        "Financial Advisor Marketplace",
        "Automated Rebalancing",
        "Social Features",
        "International Markets",
      ],
    },
  ];

  const getSectionStyle = (status: string) => {
    switch (status) {
      case 'launched':
        return 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/10';
      case 'in-progress':
        return 'border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/10';
      case 'planned':
        return 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]';
      case 'exploring':
        return 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]';
      default:
        return 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]';
    }
  };

  const getHoverStyle = (status: string) => {
    switch (status) {
      case 'launched':
        return 'hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md';
      case 'in-progress':
        return 'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md';
      case 'planned':
        return 'hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 hover:shadow-md';
      case 'exploring':
        return 'hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md';
      default:
        return 'hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 hover:shadow-md';
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Page Header */}
      <header className="bg-gradient-to-br from-blue-50 via-emerald-50/50 to-[#F6F8FB] dark:from-blue-950/20 dark:via-emerald-950/10 dark:to-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-950/30 rounded-full mb-6">
              <span className="text-4xl">🗺️</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Product Roadmap
            </h1>
            <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-2xl mx-auto">
              See what we've built, what's in progress, and where we're headed next — built with
              Indian investors in mind.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">

          {roadmapSections.map((section) => (
            <section
              key={section.title}
              className={`rounded-xl border p-6 md:p-8 transition-all duration-300 ${getSectionStyle(section.status)} ${getHoverStyle(section.status)}`}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{section.icon}</span>
                  <h2 className="text-xl md:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {section.title}
                  </h2>
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${section.badgeColor}`}>
                  {section.badge}
                </span>
              </div>

              {/* Features List */}
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                {section.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[#6B7280] dark:text-[#94A3B8]"
                  >
                    <span className="flex-shrink-0 mt-0.5">{section.icon}</span>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Feature Request */}
          <section className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xl p-8 text-center transition-all duration-300 hover:border-[#2563EB]/40 dark:hover:border-[#3B82F6]/40 hover:shadow-md">
            <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
              Have a Feature Request?
            </h2>
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6 max-w-xl mx-auto">
              We're building LensOnWealth for you. Share your ideas and help us prioritize what
              matters most to Indian investors.
            </p>
            <FeatureRequestModal />
          </section>

          {/* Disclaimer Note */}
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] text-center pb-4">
            This roadmap is subject to change based on user feedback and priorities. Timelines are
            approximate. Features marked as "Exploring" are under consideration.
          </p>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F6F8FB] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155] mt-12">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 sm:gap-8">

            {/* Column 1: Brand & Description */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <LogoLockup linkToHome={true} showTagline={true} iconSize="w-12 h-12" />
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4 max-w-sm">
                Your clear view of complete wealth. Track stocks, mutual funds, and ETFs from all
                platforms in one unified dashboard.
              </p>
            </div>

            {/* Column 2: Product */}
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Product</h3>
              <ul className="space-y-2">
                <li><a href="/#features" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Features</a></li>
                <li><a href="/#pricing" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Pricing</a></li>
                <li><a href="/#platforms" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Supported Platforms</a></li>
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
                <li><a href="/#faq" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">FAQ</a></li>
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
                <strong className="text-[#6B7280] dark:text-[#94A3B8]">Disclaimer:</strong> This is an educational portfolio tracking tool.
                We do not provide investment advice, recommendations, or tips. This is a read-only platform—we never execute trades or modify your data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-end text-xs text-[#6B7280] dark:text-[#94A3B8]">
              <span>🔒 Core data stored in India</span>
              <span>🚫 Zero Trade Execution</span>
              <span>🇮🇳 Made in India</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
