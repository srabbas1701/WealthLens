'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  Mail,
  Clock,
  FileText,
  AlertTriangle,
  Info,
  Ban,
  Shield,
} from 'lucide-react';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

/**
 * Refund Policy - LensOnWealth
 * SaaS personal finance tracking software - India
 * Last updated: February 20, 2026
 */

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <CreditCard className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Refund Policy
            </h1>
            <p className="text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Last updated: February 20, 2026
            </p>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-[#2563EB] dark:border-[#3B82F6] p-6 rounded-r-lg mb-10 flex gap-4">
          <Info className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-2">
              LensOnWealth Refund Policy
            </p>
            <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-0">
              This Refund Policy applies to paid subscriptions for LensOnWealth, a software-as-a-service (SaaS) 
              personal finance tracking platform. By subscribing, you agree to the terms below.
            </p>
          </div>
        </div>

        {/* 1. 7-Day Money-Back Guarantee */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              1
            </span>
            7-Day First-Time Money-Back Guarantee
          </h2>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 dark:border-emerald-400 p-6 rounded-r-lg">
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-2">
                  Full refund for first-time subscribers
                </p>
                <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-0">
                  If you are a first-time paid subscriber and are not satisfied with the software, you may request 
                  a full refund within <strong className="text-[#0F172A] dark:text-[#F8FAFC]">7 calendar days</strong> of 
                  your initial purchase date. The refund will be credited to the original payment method.
                </p>
              </div>
            </div>
          </div>
          <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-4">
            This guarantee applies only to your <strong>first</strong> paid subscription. Renewals and 
            subsequent purchases are not eligible (see Section 2).
          </p>
        </section>

        {/* 2. No Refunds on Renewals */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-lg">
              2
            </span>
            No Refunds on Renewals
          </h2>
          <div className="flex gap-4">
            <Ban className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-1" />
            <div className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <p>
                Automatic renewals (monthly or annual) and manual renewal purchases are <strong className="text-[#0F172A] dark:text-[#F8FAFC]">non-refundable</strong>. 
                Once a renewal payment has been processed, no refund will be issued.
              </p>
              <p className="text-sm">
                You may cancel your subscription at any time from your account settings to prevent future charges. 
                Cancellation will take effect at the end of your current billing period.
              </p>
            </div>
          </div>
        </section>

        {/* 3. No Partial Refunds */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-lg">
              3
            </span>
            No Partial Refunds
          </h2>
          <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 dark:border-amber-400 p-6 rounded-r-lg">
            <div className="flex gap-4">
              <XCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-[#6B7280] dark:text-[#94A3B8]">
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  We do not offer partial or prorated refunds.
                </p>
                <p className="text-sm mb-0">
                  If you are eligible for a refund under Section 1, the full subscription amount will be refunded. 
                  We do not refund for unused days, downgrades mid-cycle, or partial periods.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Refund Processing Time */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-lg">
              4
            </span>
            Refund Processing Time
          </h2>
          <div className="flex gap-4 p-6 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-2">
                7–10 Business Days
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-4">
                Approved refunds are processed within <strong className="text-[#0F172A] dark:text-[#F8FAFC]">7 to 10 business days</strong>. 
                The refund will be credited to your original payment method (card, UPI, or bank account). 
                The time for the refund to appear in your account may vary based on your bank or payment provider.
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                Business days exclude weekends and Indian public holidays.
              </p>
            </div>
          </div>
        </section>

        {/* 5. How to Request a Refund */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold text-lg">
              5
            </span>
            How to Request a Refund
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6">
            Refund requests must be submitted by email. We do not process refunds requested through other channels.
          </p>
          <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 rounded-xl p-6">
            <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Email-Based Process
            </h4>
            <ol className="space-y-4 text-[#6B7280] dark:text-[#94A3B8] text-sm">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 font-bold text-xs flex-shrink-0">1</span>
                <span>Send an email to <a href="mailto:support@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] font-medium hover:underline">support@lensonwealth.com</a> with the subject line &quot;Refund Request&quot;.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 font-bold text-xs flex-shrink-0">2</span>
                <span>Include your registered email address and the date of purchase.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 font-bold text-xs flex-shrink-0">3</span>
                <span>We will verify eligibility and respond within 2–3 business days.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 font-bold text-xs flex-shrink-0">4</span>
                <span>If approved, the refund will be initiated within 7–10 business days (Section 4).</span>
              </li>
            </ol>
          </div>
        </section>

        {/* 6. Exceptions: Technical Disruption */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-bold text-lg">
              6
            </span>
            Exceptions: Technical Service Disruption
          </h2>
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-1" />
            <div className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <p>
                In cases of <strong className="text-[#0F172A] dark:text-[#F8FAFC]">extended technical service disruption</strong> 
                (e.g., platform unavailable for 48+ consecutive hours due to our infrastructure), we may consider 
                refund requests even outside the 7-day window, at our sole discretion.
              </p>
              <p className="text-sm">
                Such requests will be evaluated on a case-by-case basis. Proof of disruption (e.g., downtime logs, 
                error screenshots) may be required.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Currency and Payment Methods */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-lg">
              7
            </span>
            Currency and Payment Methods
          </h2>
          <div className="flex gap-4">
            <CreditCard className="w-6 h-6 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
            <div className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
              <p>All pricing and refunds are in <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Indian Rupees (INR)</strong>.</p>
              <p>Refunds are processed through the same payment gateway used for the original transaction (card, UPI, net banking, etc.).</p>
              <p className="text-sm">We do not store your payment credentials. Refunds are handled by our authorized third-party payment processor.</p>
            </div>
          </div>
        </section>

        {/* 8. Changes to This Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              8
            </span>
            Changes to This Policy
          </h2>
          <div className="flex gap-4">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
            <div className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
              <p>
                We may update this Refund Policy from time to time. Material changes will be communicated via 
                email or in-app notice. The refund terms in effect at the time of your purchase apply to your 
                transaction.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              9
            </span>
            Contact
          </h2>
          <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide">Refund requests</p>
                <a href="mailto:support@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] font-semibold hover:underline">
                  support@lensonwealth.com
                </a>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Subject: Refund Request
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Summary Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-6">
          <div className="flex gap-4">
            <Shield className="w-10 h-10 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Quick Summary</p>
              <ul className="space-y-2 text-sm text-[#6B7280] dark:text-[#94A3B8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  7-day money-back guarantee (first-time subscribers only)
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  No refunds on renewals or partial periods
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  7–10 business day processing
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  Email refund requests to support@lensonwealth.com
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F6F8FB] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155] mt-12">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 sm:gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <LogoLockup linkToHome={true} showTagline={true} iconSize="w-12 h-12" />
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4 max-w-sm">
                Your clear view of complete wealth. Track stocks, mutual funds, and ETFs from all platforms in one unified dashboard.
              </p>
            </div>
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
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Company</h3>
              <ul className="space-y-2">
                <li><a href="/about" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">About Us</a></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Blog</span></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Careers</span></li>
                <li><span className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#4B5563] cursor-not-allowed opacity-60">Press Kit</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3 text-sm">Legal & Help</h3>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="/terms" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Terms of Service</a></li>
                <li><a href="/security" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Security</a></li>
                <li><a href="/refund-policy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Refund Policy</a></li>
                <li><a href="/#faq" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">FAQ</a></li>
              </ul>
            </div>
            <FooterContactWithFeedback />
          </div>
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
