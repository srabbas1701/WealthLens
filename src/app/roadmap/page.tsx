/**
 * LensOnWealth Roadmap - Simple Single-Page Version
 * 
 * Clean, straightforward roadmap showing actual product status
 * Fully responsive, dark/light mode compatible
 */

'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import { FeatureRequestModal } from '@/components/FeatureRequestModal';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

export default function RoadmapPage() {
  // Simple roadmap data structure
  const roadmapSections = [
    {
      title: "What's Already Live",
      subtitle: "Q4 2025",
      status: "launched",
      icon: "✅",
      features: [
        "Multi-Platform CSV Upload",
        "Automatic ISIN Resolution (95%+ accuracy!)",
        "Daily NAV Updates",
        "EPF, NPS, PPF Tracking",
        "Complete Asset Allocation",
        "Dark & Light mode",
        "Portfolio Health Score",
        "AI Portfolio Analyst (ask questions in natural language!)",
        "Advanced Analytics (Sector, Market cap, Geography)"
      ]
    },
    {
      title: "Coming Very Soon",
      subtitle: "Q1 2025",
      status: "in-progress",
      icon: "🚧",
      features: [
        "Property & Related Income",
        "Tax optimization reports",
        "Financial goals tracking",
        "Advanced XIRR calculations",
        "Downloads"
      ]
    },
    {
      title: "Exciting Future",
      subtitle: "Q3-Q4 2025",
      status: "planned",
      icon: "📋",
      features: [
        "Native mobile apps (iOS & Android)",
        "Enhanced bonds & fixed income",
        "Scenario analysis",
        "Family portfolio management",
        "Direct API integrations (Zerodha, Groww)"
      ]
    },
    {
      title: "Innovation",
      subtitle: "2026+",
      status: "exploring",
      icon: "🔍",
      features: [
        "Cryptocurrency tracking",
        "Financial advisor marketplace",
        "Automated rebalancing",
        "Social features",
        "International markets"
      ]
    }
  ];

  // Status color mapping with explicit dark/light mode colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'launched':
        return 'border-[#10B981]/20 dark:border-[#22C55E]/20 bg-[#DCFCE7]/50 dark:bg-[#16A34A]/10';
      case 'in-progress':
        return 'border-[#2563EB]/20 dark:border-[#3B82F6]/20 bg-[#EFF6FF]/50 dark:bg-[#1E3A8A]/20';
      case 'planned':
        return 'border-[#E5E7EB] dark:border-[#334155] bg-[#F6F8FB] dark:bg-[#0F172A]';
      case 'exploring':
        return 'border-[#E5E7EB] dark:border-[#334155] bg-[#EFF6FF] dark:bg-[#1E293B]';
      default:
        return 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]';
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Hero Section */}
      <section className="pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4 sm:mb-6 leading-tight tracking-tight">
              Product Roadmap
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-[#6B7280] dark:text-[#94A3B8] mb-4 sm:mb-6 max-w-3xl mx-auto">
              See what we're building to give you complete clarity on your wealth
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:to-[#22C55E] mx-auto rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-5xl mx-auto">
          
          {/* Roadmap Grid */}
          <div className="grid gap-8 md:gap-12">
            {roadmapSections.map((section, index) => (
              <section 
                key={section.title}
                className={`
                  p-8 md:p-10 rounded-2xl border-2 transition-all duration-300
                  ${getStatusColor(section.status)}
                `}
              >
                
                {/* Section Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{section.icon}</span>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {section.title}
                      </h2>
                      <p className="text-[#6B7280] dark:text-[#94A3B8] font-medium">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="grid gap-4 md:grid-cols-2">
                  {section.features.map((feature, fIndex) => (
                    <div 
                      key={fIndex}
                      className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] hover:border-[#2563EB]/50 dark:hover:border-[#3B82F6]/50 transition-all duration-300 hover:shadow-md"
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">
                        {section.icon}
                      </span>
                      <span className="text-[#0F172A] dark:text-[#F8FAFC] font-medium leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

              </section>
            ))}
          </div>

        </div>
      </main>

      {/* Footer CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#2563EB] via-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:via-[#3B82F6] dark:to-[#22C55E]">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Have a Feature Request?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            We're building LensOnWealth for you. Share your ideas and help us prioritize 
            what matters most to Indian investors.
          </p>
          <FeatureRequestModal />
        </div>
      </section>

      {/* Simple Footer Note */}
      <div className="bg-[#F6F8FB] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155]">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] text-center max-w-3xl mx-auto">
            This roadmap is subject to change based on user feedback and priorities. 
            Timelines are approximate. Features marked as "Exploring" are under consideration.
          </p>
        </div>
      </div>

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
