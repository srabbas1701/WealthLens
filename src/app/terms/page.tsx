'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';

/**
 * Terms of Service - LensOnWealth
 * 
 * Comprehensive terms governing the use of LensOnWealth platform
 * Last updated: January 2025
 */

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            Terms of Service
          </h1>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Last updated: January 17, 2025
          </p>
        </div>
        
        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-[#2563EB] dark:border-[#3B82F6] p-6 rounded-r-lg mb-8">
          <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium mb-2">
            Welcome to LensOnWealth!
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-0">
            Please read these Terms of Service ("Terms") carefully before using our platform. 
            By accessing or using LensOnWealth, you agree to be bound by these Terms. If you 
            disagree with any part of these Terms, you may not use our service.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            1. Service Description
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            LensOnWealth is a wealth tracking and portfolio analytics platform designed for 
            Indian investors. We provide:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>✓ Multi-platform portfolio aggregation via CSV uploads</li>
            <li>✓ Real-time NAV updates for mutual funds and stock prices</li>
            <li>✓ Complete asset allocation across equity, debt, retirement, and real assets</li>
            <li>✓ Portfolio health score and analytics</li>
            <li>✓ AI-powered portfolio insights (Premium)</li>
            <li>✓ Tax optimization reports (Coming soon)</li>
          </ul>

          <div className="bg-[#EFF6FF] dark:bg-blue-950/20 border border-[#E5E7EB] dark:border-[#334155] p-6 rounded-lg mt-6">
            <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Important Clarifications:</h4>
            <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
              <li>• We are a <strong>tracking platform only</strong>, not a broker or investment advisor</li>
              <li>• We do NOT execute trades, provide financial advice, or manage your money</li>
              <li>• We do NOT have access to your broker accounts or passwords</li>
              <li>• You upload data manually via CSV files - we don't connect directly to brokers</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            2. Account Registration & Eligibility
          </h2>
          
          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            2.1 Eligibility
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• You must be at least 18 years old to use LensOnWealth</li>
            <li>• You must provide accurate and complete registration information</li>
            <li>• You must be legally capable of entering into binding contracts</li>
            <li>• One person may only create one account (no duplicate accounts)</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            2.2 Account Security
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• You are responsible for maintaining the confidentiality of your password</li>
            <li>• You are responsible for all activities under your account</li>
            <li>• Notify us immediately of any unauthorized access</li>
            <li>• We recommend enabling two-factor authentication when available</li>
            <li>• Never share your LensOnWealth password with anyone</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            3. Data Upload & Accuracy
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            3.1 CSV Upload Terms
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• You are responsible for the accuracy of data you upload</li>
            <li>• We process uploaded CSV files to extract portfolio information</li>
            <li>• We do NOT verify data with your brokers or financial institutions</li>
            <li>• You should only upload CSV files from legitimate sources (Zerodha, Groww, Kuvera, etc.)</li>
            <li>• Do NOT upload files containing others' financial information without permission</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            3.2 Data Accuracy & NAV Updates
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• We fetch NAVs from AMFI and stock prices from exchanges (public data sources)</li>
            <li>• NAV/price data may have delays or inaccuracies from source providers</li>
            <li>• Our ISIN resolution has 95%+ accuracy but is not 100% guaranteed</li>
            <li>• You should verify critical information with your broker/AMC statements</li>
            <li>• Portfolio valuations are estimates for tracking purposes, not official account values</li>
          </ul>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 dark:border-yellow-400 p-6 rounded-r-lg">
            <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">⚠️ Important Disclaimer:</h4>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-0">
              LensOnWealth provides tracking and analytics for informational purposes only. 
              Always refer to official statements from your broker, AMC, or financial institution 
              for legally binding account values, especially for tax filing, loan applications, or 
              legal proceedings.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            4. Acceptable Use Policy
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            You agree NOT to:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[#DC2626] dark:text-red-400 mt-1">❌</span>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Violate laws:</strong> Use the service for illegal activities, money laundering, or fraud
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#DC2626] dark:text-red-400 mt-1">❌</span>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Reverse engineer:</strong> Decompile, disassemble, or attempt to discover source code
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#DC2626] dark:text-red-400 mt-1">❌</span>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Abuse system:</strong> Overload servers, use bots, scrapers, or automated tools
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#DC2626] dark:text-red-400 mt-1">❌</span>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Harm others:</strong> Upload malware, viruses, or harmful code
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#DC2626] dark:text-red-400 mt-1">❌</span>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Impersonate:</strong> Pretend to be someone else or create fake accounts
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#DC2626] dark:text-red-400 mt-1">❌</span>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Sell access:</strong> Resell, sublicense, or commercially exploit the service without permission
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            5. Service Plans & Payment
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            5.1 Free Tier
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• Complete portfolio tracking across all asset types</li>
            <li>• Daily NAV updates and real-time stock prices</li>
            <li>• Basic analytics and net worth dashboard</li>
            <li>• Free forever, no credit card required</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            5.2 Premium Tier (₹499/month or ₹4,999/year)
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• Everything in Free tier</li>
            <li>• Portfolio Health Score with rebalancing suggestions</li>
            <li>• Advanced analytics (sector, market cap, geography)</li>
            <li>• AI Portfolio Analyst (unlimited queries)</li>
            <li>• Tax optimization reports (LTCG/STCG tracking)</li>
            <li>• Priority support</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            5.3 Payment Terms
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• Premium is billed monthly or annually in advance</li>
            <li>• Payments are processed through secure third-party payment gateways</li>
            <li>• All fees are in Indian Rupees (INR) and include applicable GST</li>
            <li>• Subscriptions auto-renew unless cancelled before renewal date</li>
            <li>• Refunds are provided on a case-by-case basis (see Refund Policy below)</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            6. Cancellation & Refunds
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            6.1 Cancellation
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• You can cancel Premium subscription anytime from your account settings</li>
            <li>• Cancellation takes effect at the end of the current billing period</li>
            <li>• You retain Premium access until the paid period expires</li>
            <li>• No partial refunds for unused days in the current billing cycle</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            6.2 Refund Policy
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• <strong>7-day money-back guarantee:</strong> Full refund if requested within 7 days of first payment</li>
            <li>• <strong>Technical issues:</strong> Refunds considered if service is unavailable for 48+ consecutive hours</li>
            <li>• <strong>Unauthorized charges:</strong> Full refund for proven unauthorized transactions</li>
            <li>• <strong>No refunds for:</strong> Change of mind after 7 days, ToS violations, banned accounts</li>
            <li>• Refund requests: Email support@lensonwealth.com with order details</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            7. Intellectual Property
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            LensOnWealth and all related content, features, and functionality are owned by us 
            and protected by Indian and international copyright, trademark, and other intellectual 
            property laws.
          </p>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            7.1 Your Data
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• You retain all rights to your portfolio data</li>
            <li>• You grant us a limited license to process and display your data to provide the service</li>
            <li>• We may use anonymized, aggregated data for analytics and service improvement</li>
            <li>• You can export or delete your data anytime</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            7.2 Restrictions
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• You may not copy, modify, or create derivative works of our platform</li>
            <li>• You may not use our trademarks, logos, or branding without written permission</li>
            <li>• Screenshots for personal use are allowed; commercial use requires permission</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            8. Service Availability & Modifications
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            8.1 Availability
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
            <li>• Scheduled maintenance will be announced in advance when possible</li>
            <li>• NAV updates depend on AMFI publishing data (typically by 9 PM IST on trading days)</li>
            <li>• Stock prices may be delayed by up to 15 minutes (per exchange rules)</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            8.2 Service Modifications
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• We may add, remove, or modify features at any time</li>
            <li>• Major changes affecting paid features will be communicated 30 days in advance</li>
            <li>• We may discontinue the service with 90 days' notice (with prorated refunds for Premium users)</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            9. Disclaimers & Limitations
          </h2>

          <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-[#DC2626] dark:border-red-400 p-6 rounded-r-lg mb-6">
            <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">⚠️ IMPORTANT DISCLAIMERS</h4>
            <div className="space-y-3 text-sm text-[#6B7280] dark:text-[#94A3B8]">
              <p>
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">1. Not Financial Advice:</strong> LensOnWealth provides 
                tracking and analytics tools only. We are NOT SEBI-registered investment advisors. Nothing 
                on our platform constitutes financial, investment, tax, or legal advice. Consult qualified 
                professionals before making investment decisions.
              </p>
              <p>
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">2. No Guarantees:</strong> We make no guarantees about 
                investment returns, portfolio performance, or accuracy of third-party data (NAVs, prices). 
                Past performance does not guarantee future results.
              </p>
              <p>
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">3. User Responsibility:</strong> Investment decisions are 
                your sole responsibility. We are not liable for any losses resulting from your investment 
                decisions, data entry errors, or reliance on our platform.
              </p>
              <p>
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">4. Third-Party Data:</strong> We rely on external data 
                sources (AMFI, NSE, BSE) over which we have no control. We are not responsible for errors, 
                delays, or unavailability of third-party data.
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            9.1 Service "As Is"
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            LensOnWealth is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either 
            express or implied, including but not limited to:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• Merchantability or fitness for a particular purpose</li>
            <li>• Accuracy, completeness, or reliability of content</li>
            <li>• Uninterrupted or error-free operation</li>
            <li>• Security of data transmission over the internet</li>
          </ul>
        </section>

        {/* Section 10 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            10. Limitation of Liability
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            To the maximum extent permitted by Indian law:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• We are not liable for indirect, incidental, special, consequential, or punitive damages</li>
            <li>• Our total liability is limited to the amount you paid us in the 12 months before the claim</li>
            <li>• This includes damages for lost profits, data loss, business interruption, or investment losses</li>
            <li>• Some jurisdictions don't allow liability limitations, so these may not apply to you</li>
          </ul>

          <div className="bg-[#F6F8FB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-6 rounded-lg mt-6">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Example:</strong> If our platform displays incorrect 
              NAV data leading to a poor investment decision, we are not liable for your investment losses. 
              Always verify critical information with official sources.
            </p>
          </div>
        </section>

        {/* Section 11 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            11. Account Termination
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            11.1 Termination by You
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• You can close your account anytime from account settings</li>
            <li>• Export your data before closing (we'll delete it after 30 days)</li>
            <li>• Premium subscriptions continue until the end of paid period</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            11.2 Termination by Us
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            We may suspend or terminate your account immediately if:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>• You violate these Terms of Service</li>
            <li>• You engage in fraudulent or illegal activities</li>
            <li>• Your account has been inactive for 24+ months (with 30 days' notice)</li>
            <li>• Required by law or court order</li>
            <li>• We discontinue the service (with 90 days' notice and prorated refunds)</li>
          </ul>
        </section>

        {/* Section 12 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            12. Dispute Resolution
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            12.1 Informal Resolution
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            Before filing any legal claim, please contact us at support@lensonwealth.com to resolve 
            the issue amicably. Most disputes can be resolved through discussion.
          </p>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            12.2 Governing Law
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            These Terms are governed by the laws of India. Any disputes will be subject to the 
            exclusive jurisdiction of courts in Greater Noida, India.
          </p>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            12.3 Arbitration
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            For disputes exceeding ₹1,00,000, either party may elect to resolve the dispute through 
            binding arbitration under the Indian Arbitration and Conciliation Act, 1996, conducted 
            in English in Greater Noida, India.
          </p>
        </section>

        {/* Section 13 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            13. Miscellaneous
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            13.1 Entire Agreement
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            These Terms, along with our Privacy Policy and Security page, constitute the entire 
            agreement between you and LensOnWealth.
          </p>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            13.2 Changes to Terms
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>• We may update these Terms at any time</li>
            <li>• Material changes will be notified via email 30 days in advance</li>
            <li>• Continued use after changes constitutes acceptance</li>
            <li>• If you disagree with new terms, you must stop using the service</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            13.3 Severability
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            If any provision of these Terms is found unenforceable, the remaining provisions 
            remain in full effect.
          </p>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            13.4 Assignment
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            You may not transfer your account or these Terms to anyone else. We may assign 
            our rights and obligations to another entity (e.g., in case of acquisition).
          </p>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            13.5 No Waiver
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Our failure to enforce any right or provision doesn't constitute a waiver of that 
            right or provision.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            14. Contact Us
          </h2>
          <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
              Questions about these Terms? Contact us:
            </p>
            <div className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
              <p><strong>Email:</strong> <a href="mailto:legal@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">legal@lensonwealth.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">support@lensonwealth.com</a></p>
              <p><strong>Website:</strong> <a href="https://lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">lensonwealth.com</a></p>
            </div>
            <div className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                <strong>Legal Entity:</strong> LensOnWealth<br />
                Sector Alpha 2, Greater Noida<br />
                U.P. India
              </p>
            </div>
          </div>
        </section>

        {/* Acceptance */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-6 text-center">
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
            By using LensOnWealth, you acknowledge that you have read, understood, and agree to be 
            bound by these Terms of Service.
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Effective Date: January 17, 2025
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
