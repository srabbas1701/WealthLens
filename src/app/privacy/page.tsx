'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import {
  CheckCircle2,
  XCircle,
  Ban,
  FileText,
  Shield,
  Mail,
  MapPin,
  Info,
  Database,
  Lock,
  Globe,
  Users,
  BarChart3,
  Trash2,
  Edit3,
  Download,
  Eye,
  FileCheck,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

/**
 * Privacy Policy - LensOnWealth
 * Last updated: March 12, 2026
 */

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-[#2563EB]/10 dark:bg-[#3B82F6]/20">
            <Shield className="w-8 h-8 text-[#2563EB] dark:text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Privacy Policy
            </h1>
            <p className="text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Last updated: March 12, 2026
            </p>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-[#2563EB] dark:border-[#3B82F6] p-6 rounded-r-lg mb-10 flex gap-4">
          <Info className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-2">
              LensOnWealth (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy.
            </p>
            <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-0">
              This Privacy Policy explains how we collect, use, store, and protect your information when you use our personal finance tracking software platform.
            </p>
          </div>
        </div>

        {/* 1. Information We Collect */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold text-lg">
              1
            </span>
            Information We Collect
          </h2>

          <div className="space-y-8">
            {/* 1.1 Information You Provide */}
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                1.1 Information You Provide
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md">
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Account Information:</p>
                  <ul className="space-y-1 text-[#6B7280] dark:text-[#94A3B8] text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Name</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Email address</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Phone number (for OTP authentication)</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md">
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">User-Uploaded Data:</p>
                  <ul className="space-y-1 text-[#6B7280] dark:text-[#94A3B8] text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Financial records uploaded voluntarily via CSV files</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Asset entries added manually by you</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Historical transaction data for personal record-keeping</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md">
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Optional Profile Information:</p>
                  <ul className="space-y-1 text-[#6B7280] dark:text-[#94A3B8] text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Preferences</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Personal financial goals (optional input fields)</li>
                  </ul>
                </div>
              </div>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-4 font-medium">
                We collect only the information necessary to provide the software service.
              </p>
            </div>

            {/* 1.2 Information Collected Automatically */}
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                1.2 Information Collected Automatically
              </h3>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8] mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Usage data (pages visited, features used)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Device and browser information
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  IP address (for security purposes only)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Authentication cookies
                </li>
              </ul>
              <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                We do not collect sensitive financial credentials.
              </p>
            </div>

            {/* 1.3 Information We Do NOT Collect */}
            <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 dark:border-rose-400 p-6 rounded-r-lg">
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                1.3 Information We Do NOT Collect
              </h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4 font-medium">We do NOT collect:</p>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8] mb-4">
                {[
                  'Broker login credentials',
                  'Bank account passwords',
                  'Trading authorization',
                  'UPI PINs',
                  'Debit or credit card numbers',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[#0F172A] dark:text-[#F8FAFC] text-sm font-medium">
                All subscription payments are processed through secure third-party payment gateways. We do not store card or UPI credentials.
              </p>
            </div>
          </div>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              2
            </span>
            How We Use Your Information
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            We use your information solely to provide and improve the software service.
          </p>
          <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium mb-3">This includes:</p>
          <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8] mb-6">
            {[
              'Displaying consolidated financial records',
              'Generating informational summaries and reports',
              'Updating asset price references from publicly available sources',
              'Providing feature enhancements for paid subscribers',
              'Customer support',
              'Security monitoring and fraud prevention',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-center transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md">
              <Ban className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">No Advertising</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-center transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md">
              <Ban className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">No Data Sales</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-center transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md">
              <Ban className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">No Profiling</p>
            </div>
          </div>
          <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mt-4">
            We do NOT use your data for advertising, sell or rent your data, or use your data for financial profiling or external distribution.
          </p>
        </section>

        {/* 3. Data Storage & Security */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-lg">
              3
            </span>
            Data Storage &amp; Security
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                3.1 Data Location
              </h3>
              <div className="flex gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 dark:border-blue-400">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-[#6B7280] dark:text-[#94A3B8]">
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Your core financial data is stored on secure cloud infrastructure located in India.</p>
                  <p className="text-sm">
                    When you use the AI Portfolio Analyst feature, queries are processed through OpenAI's secured cloud services solely to generate your analysis — data is not used for model training. For email delivery, we use Resend. Both providers are contractually obligated to protect your information.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                3.2 Security Measures
              </h3>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8] mb-4">
                {[
                  'Encryption of data in transit (TLS 1.3)',
                  'Encrypted storage of sensitive fields (AES-256)',
                  'OTP-based authentication (no passwords stored)',
                  'Access controls',
                  'Audit logging',
                  'Regular backups',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                However, no internet transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Third-Party Services */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              4
            </span>
            Third-Party Services
          </h2>
          <div className="flex gap-4 mb-4">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
            <div>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                We use limited third-party providers for:
              </p>
              <ul className="space-y-2 text-[#6B7280] dark:text-[#94A3B8] mb-4">
                {[
                  'Cloud hosting (servers in India)',
                  'Email notifications (Resend)',
                  'Payment processing (Razorpay)',
                  'AI-powered analysis (OpenAI) — Portfolio Analyst feature only, not used for model training',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-2">
                These providers process data only to the extent necessary to provide their services and are bound by contractual confidentiality obligations.
              </p>
              <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                We do not share your financial records with external data providers.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Public Market Data */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-lg">
              5
            </span>
            Public Market Data
          </h2>
          <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 dark:border-amber-400 p-6 rounded-r-lg">
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
              Asset pricing data displayed within the platform may be sourced from publicly available information after market hours.
            </p>
            <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
              We do not share your portfolio data with any exchanges, brokers, or financial institutions.
            </p>
          </div>
        </section>

        {/* 6. Your Rights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-bold text-lg">
              6
            </span>
            Your Rights
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-6">You may:</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md">
              <Eye className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Access your data</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md">
              <Edit3 className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Modify your records</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md">
              <Download className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Export your data</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md">
              <Trash2 className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Request deletion of your account</p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2 text-[#6B7280] dark:text-[#94A3B8] text-sm">
            <p>Account deletion requests are processed within 30 days.</p>
            <p>Backups are cleared within 90 days unless legally required to retain certain records.</p>
          </div>
        </section>

        {/* 7. Data Retention */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-lg">
              7
            </span>
            Data Retention
          </h2>
          <div className="flex gap-4">
            <Database className="w-6 h-6 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
            <div className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <p>We retain data:</p>
              <ul className="space-y-2 pl-4">
                <li>• As long as your account remains active</li>
                <li>• As required for legal or compliance obligations</li>
                <li>• For fraud prevention and security</li>
              </ul>
              <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Deleted accounts are permanently erased from primary systems after 30 days.
              </p>
            </div>
          </div>
        </section>

        {/* 8. Children's Privacy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 font-bold text-lg">
              8
            </span>
            Children&apos;s Privacy
          </h2>
          <div className="flex gap-4">
            <Users className="w-6 h-6 text-pink-600 dark:text-pink-400 flex-shrink-0 mt-1" />
            <div className="text-[#6B7280] dark:text-[#94A3B8]">
              <p>The platform is intended for individuals 18 years and older.</p>
              <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                We do not knowingly collect information from minors.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Changes to This Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-lg">
              9
            </span>
            Changes to This Policy
          </h2>
          <div className="flex gap-4">
            <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
            <div className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
              <p>We may update this Privacy Policy periodically.</p>
              <p>Material changes will be communicated via email or dashboard notice.</p>
              <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Continued use after changes constitutes acceptance.
              </p>
            </div>
          </div>
        </section>

        {/* 10. Legal Compliance */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-bold text-lg">
              10
            </span>
            Legal Compliance
          </h2>
          <div className="flex gap-4">
            <FileCheck className="w-6 h-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-1" />
            <div className="space-y-3 text-[#6B7280] dark:text-[#94A3B8]">
              <p>We comply with applicable Indian data protection laws including:</p>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                  The Information Technology Act, 2000
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                  The Digital Personal Data Protection Act (as applicable)
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 11. Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              11
            </span>
            Contact
          </h2>
          <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xl p-6 shadow-sm transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="p-2 rounded-lg bg-[#2563EB]/10">
                  <Mail className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide">Privacy</p>
                  <a href="mailto:privacy@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] font-semibold hover:underline">
                    privacy@lensonwealth.com
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
            This Privacy Policy is effective as of March 12, 2026. By using LensOnWealth, you acknowledge that you have read and understood this Privacy Policy.
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
