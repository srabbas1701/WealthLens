'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  Mail,
  MapPin,
  Info,
  Ban,
  Scale,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

/**
 * Terms of Service - LensOnWealth
 * Last updated: February 20, 2026
 */

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-[#2563EB]/10 dark:bg-[#3B82F6]/20">
            <FileText className="w-8 h-8 text-[#2563EB] dark:text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Terms of Service
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
              Welcome to LensOnWealth.
            </p>
            <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-3">
              These Terms of Service (&quot;Terms&quot;) govern your use of the LensOnWealth platform. By accessing or
              using the platform, you agree to be bound by these Terms.
            </p>
            <p className="text-[#DC2626] dark:text-red-400 text-sm font-medium">
              If you do not agree, please discontinue use of the service.
            </p>
          </div>
        </div>

        {/* 1. Service Description */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold text-lg">
              1
            </span>
            Service Description
          </h2>

          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6">
            LensOnWealth is a personal finance record-keeping and portfolio tracking software platform designed
            to help individuals organize and visualize their financial data in one place.
          </p>

          <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-3">The platform allows users to:</p>
          <ul className="space-y-3 mb-8">
            {[
              'Upload portfolio data manually via CSV files',
              'View consolidated asset summaries',
              'Track historical values of assets',
              'Generate informational reports and summaries',
              'View allocation breakdowns across asset categories',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[#6B7280] dark:text-[#94A3B8]">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 dark:border-amber-400 p-6 rounded-r-lg">
            <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Important Clarifications:
            </h4>
            <ul className="space-y-2 text-sm text-[#6B7280] dark:text-[#94A3B8]">
              {[
                'We are NOT a broker, investment advisor, portfolio manager, or financial institution',
                'We do NOT execute trades',
                'We do NOT provide buy/sell recommendations',
                'We do NOT provide financial, tax, or legal advice',
                'We do NOT manage or move customer funds',
                'We do NOT connect directly to brokerage accounts',
                'Users upload data voluntarily for record-keeping purposes',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[#0F172A] dark:text-[#F8FAFC] font-medium">
              LensOnWealth is strictly a software tool for personal financial organization and informational display.
            </p>
          </div>
        </section>

        {/* 2. Regulatory Status */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-lg">
              2
            </span>
            Regulatory Status
          </h2>
          <div className="flex gap-4">
            <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <p>
                LensOnWealth is not registered with SEBI, RBI, or any financial regulatory authority because it
                does not provide regulated financial services.
              </p>
              <p>
                The platform does not offer investment advisory, portfolio management, research analysis, or
                securities distribution services.
              </p>
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Users remain solely responsible for all financial decisions.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Data & Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-bold text-lg">
              3
            </span>
            Data &amp; Information
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                3.1 User-Provided Data
              </h3>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Users are responsible for the accuracy of uploaded data
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  We do not verify information with financial institutions
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Portfolio valuations shown are informational estimates only
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Official statements from banks, brokers, or AMCs should be relied upon for legal or tax purposes
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                3.2 Market Data
              </h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                Asset pricing information may be sourced from publicly available data sources after market hours.
              </p>
              <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium mb-2">Such data:</p>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  May contain delays
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  May contain inaccuracies
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  Is provided for informational purposes only
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  Should not be relied upon for trading or investment decisions
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. No Financial Advice */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-lg">
              4
            </span>
            No Financial Advice
          </h2>
          <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 dark:border-red-400 p-6 rounded-r-lg">
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
              All information presented on LensOnWealth is for informational and educational purposes only.
            </p>
            <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Nothing on the platform constitutes:</p>
            <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8] mb-4">
              {['Investment advice', 'Financial planning advice', 'Tax advice', 'Legal advice'].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
              Users should consult licensed professionals before making financial decisions.
            </p>
          </div>
        </section>

        {/* 5. Subscription Plans & Payments */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              5
            </span>
            Subscription Plans &amp; Payments
          </h2>
          <div className="flex gap-4 mb-6">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                LensOnWealth offers both free and paid subscription plans. Paid subscriptions provide access to
                enhanced reporting and platform features.
              </p>
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Payment Terms:</p>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Subscriptions are billed in advance (monthly or annually)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Payments are processed by authorized third-party payment gateways
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Subscriptions auto-renew unless cancelled prior to renewal
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Fees are non-refundable except as outlined in our Refund Policy
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  All pricing is displayed in INR
                </li>
              </ul>
              <p className="mt-4 text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                LensOnWealth does not store card or UPI credentials.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Refund Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              6
            </span>
            Refund Policy
          </h2>
          <ul className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
            <li className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20">
              <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span><strong className="text-[#0F172A] dark:text-[#F8FAFC]">7-day refund</strong> for first-time subscription purchase</span>
            </li>
            <li className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20">
              <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>No refunds after 7 days except in cases of technical service disruption</span>
            </li>
            <li className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20">
              <Mail className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>Refund requests must be submitted to{' '}
                <a href="mailto:support@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline font-medium">
                  support@lensonwealth.com
                </a>
              </span>
            </li>
          </ul>
        </section>

        {/* 7. Acceptable Use */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-lg">
              7
            </span>
            Acceptable Use
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4 font-medium">Users agree not to:</p>
          <ul className="space-y-3">
            {[
              'Use the platform for unlawful activities',
              'Attempt unauthorized access',
              'Reverse engineer the software',
              'Use automation tools that overload the system',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[#6B7280] dark:text-[#94A3B8]">
                <Ban className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 8. Intellectual Property */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-lg">
              8
            </span>
            Intellectual Property
          </h2>
          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
            <div className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <p>
                All platform software, branding, and design elements are owned by LensOnWealth.
              </p>
              <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Users retain ownership of their uploaded data.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Disclaimer of Warranties */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-lg">
              9
            </span>
            Disclaimer of Warranties
          </h2>
          <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 dark:border-orange-400 p-6 rounded-r-lg">
            <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              The platform is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot;.
            </p>
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-3">We make no warranties regarding:</p>
            <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
              {[
                'Accuracy of data',
                'Financial outcomes',
                'Continuous availability',
                'Suitability for specific financial goals',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 10. Limitation of Liability */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-lg">
              10
            </span>
            Limitation of Liability
          </h2>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 p-6 rounded-lg">
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
              To the maximum extent permitted by law:
            </p>
            <ul className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                We are not liable for investment losses
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                We are not liable for reliance on informational reports
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                Total liability is limited to subscription fees paid in the previous 12 months
              </li>
            </ul>
          </div>
        </section>

        {/* 11. Termination */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-bold text-lg">
              11
            </span>
            Termination
          </h2>
          <ul className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
            <li className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
              We may suspend accounts for violation of Terms.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
              Users may close their accounts at any time.
            </li>
          </ul>
        </section>

        {/* 12. Governing Law */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-lg">
              12
            </span>
            Governing Law
          </h2>
          <div className="flex gap-4">
            <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
              <p>These Terms are governed by the laws of India.</p>
              <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Jurisdiction: Courts of Greater Noida, Uttar Pradesh.
              </p>
            </div>
          </div>
        </section>

        {/* 13. Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              13
            </span>
            Contact
          </h2>
          <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xl p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="p-2 rounded-lg bg-[#2563EB]/10">
                  <Mail className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide">Legal</p>
                  <a href="mailto:legal@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] font-semibold hover:underline">
                    legal@lensonwealth.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide">Support</p>
                  <a href="mailto:support@lensonwealth.com" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                    support@lensonwealth.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 sm:col-span-2">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <MapPin className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide">Location</p>
                  <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">Greater Noida, India</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Acceptance Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
            By using LensOnWealth, you acknowledge that you have read, understood, and agree to be bound by these
            Terms of Service.
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Effective Date: February 20, 2026
          </p>
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
                <li><a href="/#faq" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">FAQ</a></li>
                <li><a href="/refund-policy" className="text-xs sm:text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors duration-300">Refund Policy</a></li>
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
