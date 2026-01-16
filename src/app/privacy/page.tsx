'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';

/**
 * Privacy Policy - LensOnWealth
 * 
 * Comprehensive privacy policy for Indian wealth tracking platform
 * Last updated: January 2025
 */

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            Privacy Policy
          </h1>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Last updated: January 17, 2025
          </p>
        </div>
        
        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-[#2563EB] dark:border-[#3B82F6] p-6 rounded-r-lg mb-8">
          <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium mb-2">
            Your privacy is important to us.
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8] text-sm mb-0">
            This Privacy Policy explains how LensOnWealth ("we", "us", or "our") collects, 
            uses, stores, and protects your personal and financial information when you use 
            our wealth tracking platform.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            1. Information We Collect
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            1.1 Information You Provide
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
            <li><strong>Portfolio Data:</strong> Investment holdings, transaction history uploaded via CSV files</li>
            <li><strong>Financial Information:</strong> Asset values, EPF/NPS/PPF balances, fixed deposits, bonds, real estate details</li>
            <li><strong>Profile Information:</strong> Optional information like investment goals, risk tolerance, preferences</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            1.2 Information Collected Automatically
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on platform</li>
            <li><strong>Device Information:</strong> Browser type, operating system, IP address (for security)</li>
            <li><strong>Cookies:</strong> Session cookies for authentication, preference cookies for theme/settings</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            1.3 Information We Do NOT Collect
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>❌ Broker login credentials (we only use CSV uploads)</li>
            <li>❌ Bank account passwords or PINs</li>
            <li>❌ Credit card numbers or payment information (for free tier)</li>
            <li>❌ Trading permissions or account access</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            We use your information solely to provide and improve our wealth tracking service:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>Portfolio Tracking:</strong> Display your complete wealth across all platforms</li>
            <li><strong>Analytics:</strong> Calculate portfolio health, asset allocation, returns (XIRR), tax liability</li>
            <li><strong>NAV Updates:</strong> Fetch daily mutual fund NAVs and stock prices for accurate valuations</li>
            <li><strong>AI Analysis:</strong> Provide portfolio insights via our AI Portfolio Analyst</li>
            <li><strong>Notifications:</strong> Send important alerts (FD maturity, rebalancing reminders, tax deadlines)</li>
            <li><strong>Service Improvement:</strong> Analyze usage patterns to improve features (anonymized data only)</li>
            <li><strong>Support:</strong> Respond to your queries and technical issues</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            3. How We Store & Protect Your Data
          </h2>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            3.1 Data Storage
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2 mb-6">
            <li>🇮🇳 <strong>All data stored in India:</strong> Your data never leaves Indian servers</li>
            <li>🔒 <strong>Bank-grade encryption:</strong> AES-256 encryption at rest, TLS 1.3 in transit</li>
            <li>☁️ <strong>Secure cloud infrastructure:</strong> Enterprise-grade hosting with 99.9% uptime</li>
            <li>💾 <strong>Regular backups:</strong> Daily encrypted backups with 30-day retention</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            3.2 Security Measures
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>Password Security:</strong> Bcrypt hashing with salt, never stored in plain text</li>
            <li><strong>Access Control:</strong> Role-based access, principle of least privilege</li>
            <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
            <li><strong>Audit Logs:</strong> Complete audit trail of all data access and modifications</li>
            <li><strong>Employee Access:</strong> Limited to essential support staff only, with logging</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            4. Data Sharing & Third Parties
          </h2>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 dark:border-emerald-400 p-6 rounded-r-lg mb-6">
            <p className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold mb-2">
              We do NOT sell, rent, or share your personal or financial data with third parties for marketing purposes.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            Limited Third-Party Services
          </h3>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            We use the following trusted service providers who are contractually bound to protect your data:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>Cloud Hosting:</strong> For secure server infrastructure (data remains in India)</li>
            <li><strong>Email Service:</strong> For sending alerts and notifications (transactional only)</li>
            <li><strong>Analytics:</strong> Anonymized usage analytics to improve our service</li>
            <li><strong>Payment Processor:</strong> For Premium subscriptions (we don't store card details)</li>
          </ul>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3 mt-6">
            External Data Sources
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>AMFI (Mutual Fund NAVs):</strong> Public data, no sharing of your holdings</li>
            <li><strong>NSE/BSE (Stock Prices):</strong> Public market data, no sharing of your holdings</li>
            <li>We only <em>fetch</em> public market data; we never share your portfolio with these sources</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            5. Your Rights & Control
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            You have complete control over your data:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">🔍 Access</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                View all your data anytime from your dashboard
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">✏️ Edit</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Update holdings, add/remove assets, change profile
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">📥 Export</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Download your complete portfolio data as CSV/Excel
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">🗑️ Delete</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Request account deletion (30-day grace period)
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            Data Retention
          </h3>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>Active accounts:</strong> Data retained as long as your account is active</li>
            <li><strong>Deleted accounts:</strong> Data permanently deleted after 30 days</li>
            <li><strong>Backups:</strong> Deleted data removed from backups within 90 days</li>
            <li><strong>Legal requirements:</strong> We may retain certain data if legally required (e.g., tax records for 7 years)</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            6. Cookies & Tracking
          </h2>
          
          <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            Types of Cookies We Use
          </h3>
          <div className="space-y-4">
            <div className="border-l-4 border-[#2563EB] dark:border-[#3B82F6] pl-4">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Essential Cookies (Required)</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Session authentication, security tokens. Cannot be disabled.
              </p>
            </div>
            <div className="border-l-4 border-[#E5E7EB] dark:border-[#334155] pl-4">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Preference Cookies (Optional)</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Theme (dark/light mode), language, dashboard layout. Can be cleared anytime.
              </p>
            </div>
            <div className="border-l-4 border-[#E5E7EB] dark:border-[#334155] pl-4">
              <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Analytics Cookies (Optional)</h4>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                Anonymized usage statistics to improve service. Can opt out in settings.
              </p>
            </div>
          </div>

          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-4">
            We do NOT use third-party advertising cookies or tracking pixels.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            7. Data Breach Notification
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            In the unlikely event of a data breach:
          </p>
          <ol className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>1. Immediate containment:</strong> We'll immediately secure affected systems</li>
            <li><strong>2. Assessment:</strong> Determine scope and severity of breach</li>
            <li><strong>3. Notification:</strong> Notify affected users within 72 hours via email</li>
            <li><strong>4. Remediation:</strong> Take corrective action and provide guidance</li>
            <li><strong>5. Reporting:</strong> Report to relevant authorities as required by Indian law</li>
          </ol>
        </section>

        {/* Section 8 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            8. Children's Privacy
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            LensOnWealth is not intended for users under 18 years of age. We do not knowingly 
            collect personal information from children. If you are under 18, please do not use 
            our service or provide any information. If we discover we have collected data from 
            a child under 18, we will delete it immediately.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            9. Changes to This Policy
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices 
            or legal requirements. We will:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li>✓ Update the "Last updated" date at the top</li>
            <li>✓ Notify you via email for material changes</li>
            <li>✓ Display a notice in your dashboard</li>
            <li>✓ Give you 30 days to review before changes take effect</li>
          </ul>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mt-4">
            Continued use of LensOnWealth after changes indicates acceptance of the updated policy.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            10. Legal Basis & Compliance
          </h2>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
            We process your data based on:
          </p>
          <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
            <li><strong>Consent:</strong> You explicitly consent by creating an account and uploading data</li>
            <li><strong>Contract:</strong> Necessary to provide the service you've requested</li>
            <li><strong>Legitimate Interest:</strong> To improve our service and prevent fraud</li>
          </ul>
          <p className="text-[#6B7280] dark:text-[#94A3B8] mt-4">
            We comply with applicable Indian data protection laws including the Information Technology 
            Act, 2000 and the proposed Digital Personal Data Protection Act.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            11. Contact Us
          </h2>
          <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
            <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
              If you have questions about this Privacy Policy or how we handle your data:
            </p>
            <div className="space-y-2 text-[#6B7280] dark:text-[#94A3B8]">
              <p><strong>Email:</strong> <a href="mailto:privacy@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">privacy@lensonwealth.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">support@lensonwealth.com</a></p>
              <p><strong>Response Time:</strong> We aim to respond within 48 hours</p>
            </div>
            <div className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
                <strong>Data Protection Officer:</strong>
              </p>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                LensOnWealth<br />
                Sector Alpha 2, Greater Noida<br />
                U.P. India
              </p>
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <div className="bg-[#F6F8FB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 text-center">
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
            This Privacy Policy is effective as of January 17, 2025
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            By using LensOnWealth, you acknowledge that you have read and understood this Privacy Policy.
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
