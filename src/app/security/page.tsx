'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';
import { FooterContactWithFeedback } from '@/components/FooterContactWithFeedback';

/**
 * Security - LensOnWealth
 * 
 * Comprehensive security information and best practices
 * Last updated: March 2026
 */

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-6 py-8 pt-24">

        {/* Page Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Security
            </h1>
            <p className="text-[#6B7280] dark:text-[#94A3B8]">
              Your financial data is protected with enterprise-level security measures.
            </p>
          </div>
        </div>

        {/* Key Security Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="text-center p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
            <div className="text-4xl mb-4">🇮🇳</div>
            <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Hosted in India</h3>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Core financial data stored on secure cloud servers in Mumbai, India
            </p>
          </div>
          <div className="text-center p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">256-bit Encryption</h3>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Same military-grade encryption used by banks and governments
            </p>
          </div>
          <div className="text-center p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
            <div className="text-4xl mb-4">🚫</div>
            <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Zero Broker Access</h3>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              We never ask for or store your broker passwords: CSV uploads only
            </p>
          </div>
        </div>

        <div>

          {/* Section 1: Data Encryption */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              🔐 Data Encryption
            </h2>

            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3 flex items-center gap-2">
                  <span>🔒</span> Encryption at Rest
                </h3>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                  All data stored in our database is encrypted using <strong className="text-[#0F172A] dark:text-[#F8FAFC]">AES-256 encryption</strong> 
                  - the same standard used by banks, militaries, and governments worldwide.
                </p>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Portfolio holdings, transaction history, and personal information</li>
                  <li>✓ Authentication tokens managed securely by Supabase (signed JWTs, industry-standard)</li>
                  <li>✓ Encryption keys stored separately from data (defense in depth)</li>
                  <li>✓ Regular key rotation following best practices</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3 flex items-center gap-2">
                  <span>🌐</span> Encryption in Transit
                </h3>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                  All communication between your device and our servers uses <strong className="text-[#0F172A] dark:text-[#F8FAFC]">TLS 1.3</strong> 
                  (Transport Layer Security)-the latest and most secure protocol.
                </p>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ HTTPS enforced on all pages (no unencrypted HTTP)</li>
                  <li>✓ Perfect Forward Secrecy (PFS) enabled</li>
                  <li>✓ HSTS headers to prevent downgrade attacks</li>
                  <li>✓ A+ rating on SSL Labs tests</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Data Storage */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              🇮🇳 Data Storage & Sovereignty
            </h2>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 dark:border-emerald-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Core Data Stored in India</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-0">
                Your portfolio, transactions, and personal data are stored on secure cloud servers
                in Mumbai, India. AI-powered features process queries through
                internationally secured cloud services (OpenAI) solely to generate your analysis —
                no data is retained or used for training by those services.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Infrastructure Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">☁️ Cloud Provider</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Enterprise-grade cloud hosting with SOC 2 Type II certification
                </p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">📍 Server Location</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Secure cloud infrastructure in Mumbai, India — enterprise-grade uptime SLA
                </p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">💾 Backup Strategy</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Daily encrypted backups managed by Supabase; retention scales with plan tier
                </p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">🔄 Redundancy</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Multi-zone replication for high availability and fault tolerance
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Authentication */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              🔑 Authentication & Access Control
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Passwordless Authentication
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3">
                  LensOnWealth uses <strong className="text-[#0F172A] dark:text-[#F8FAFC]">passwordless OTP authentication</strong> —
                  you never create or store a password, so there's nothing to steal, phish, or breach.
                </p>
                <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Phone OTP:</strong> One-time code sent to your
                    verified mobile number, expires after a single use
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Email OTP / Magic Link:</strong> Secure one-time
                    link sent to your registered email address
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Session Management:</strong> Secure JWT session
                    tokens with automatic expiration and refresh
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">OAuth Support (Coming Soon):</strong> Sign-in with
                    Google/Microsoft for additional convenience
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Access Monitoring
                </h3>
                <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ OTP codes expire after a single use (no replayable credentials)</li>
                  <li>✓ Session tokens invalidated on sign-out</li>
                  <li>✓ Middleware enforces valid session on every protected route</li>
                  <li>✓ Rate limiting & anomaly detection <span className="text-xs">(Coming Soon)</span></li>
                  <li>✓ Email notifications for suspicious activity <span className="text-xs">(Coming Soon)</span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: No Broker Access */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              🚫 CSV-Only Architecture
            </h2>

            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-[#2563EB] dark:border-[#3B82F6] p-6 rounded-r-lg mb-6">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                Why CSV-Only is Actually MORE Secure
              </h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                Unlike platforms that require your broker login credentials, LensOnWealth uses 
                a CSV-only approach. This means:
              </p>
              <div className="space-y-2 text-sm text-[#6B7280] dark:text-[#94A3B8]">
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">No broker passwords:</strong> We never ask for or store your Zerodha/Groww/Kuvera passwords</p>
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">No trading access:</strong> We cannot execute trades or modify your holdings</p>
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">No bank access:</strong> We cannot withdraw funds or access your bank account</p>
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Read-only data:</strong> You upload statements manually (full control)</p>
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Smaller attack surface:</strong> No API keys or OAuth tokens that could be compromised</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
              <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                CSV Upload Security
              </h3>
              <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                <li>• CSV files parsed in memory — never written to disk or stored permanently</li>
                <li>• File type and format validation before processing</li>
                <li>• File size limit to prevent abuse (max 5MB per file)</li>
                <li>• Parsed data encrypted immediately after processing</li>
                <li>• No raw files retained after successful import</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Monitoring */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              👁️ Security Monitoring & Incident Response
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  24/7 Monitoring
                </h3>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Real-time intrusion detection</li>
                  <li>✓ Automated threat response</li>
                  <li>✓ Anomaly detection algorithms</li>
                  <li>✓ Server health monitoring</li>
                  <li>✓ Database access logging</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Incident Response
                </h3>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Documented incident response plan</li>
                  <li>✓ 72-hour breach notification</li>
                  <li>✓ Forensic investigation procedures</li>
                  <li>✓ User communication protocols</li>
                  <li>✓ Post-incident reviews</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 dark:border-yellow-400 p-6 rounded-r-lg">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Our Commitment</h3>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-0">
                In the unlikely event of a security incident, we will notify all affected users 
                within 72 hours via email and in-app notification, detailing what happened, what 
                data was affected, and what actions we're taking.
              </p>
            </div>
          </section>

          {/* Section 6: Employee Access */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              👥 Employee Access & Internal Security
            </h2>

            <div className="space-y-4">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Principle of Least Privilege
                </h3>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-3">
                  Our team members only have access to the data they absolutely need to do their jobs:
                </p>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Support staff:</strong> Limited to basic account info (email, name)-no portfolio data</li>
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Engineers:</strong> Access only to anonymized/aggregated data for debugging</li>
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Database access:</strong> Restricted to senior engineers with audit logging</li>
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">No casual browsing:</strong> All data access requires justification and is logged</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Employee Security Practices
                </h3>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Background checks for all employees with data access</li>
                  <li>✓ Confidentiality agreements and security training</li>
                  <li>✓ Multi-factor authentication required for all internal tools</li>
                  <li>✓ Regular security awareness training</li>
                  <li>✓ Immediate access revocation upon departure</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7: Compliance */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              ✅ Compliance & Certifications
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Current Compliance
                </h3>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Information Technology Act, 2000 (India)</li>
                  <li>✓ Data Protection Best Practices</li>
                  <li>✓ ISO 27001 aligned security controls</li>
                  <li>✓ Regular security audits</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Future Certifications
                </h3>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>📋 SOC 2 Type II (in progress)</li>
                  <li>📋 ISO 27001 certification</li>
                  <li>📋 DPDP Act 2023 compliance (rules pending notification)</li>
                  <li>📋 Third-party penetration testing</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8: User Security Tips */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              🛡️ How You Can Stay Secure
            </h2>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6 mb-6">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Security is a Partnership</h3>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-0">
                While we do everything to secure our platform, your personal security practices 
                are equally important. Here's how you can protect your account:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-5 transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">✅ DO</h4>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Keep your phone number and email account secure-they are your login keys</li>
                  <li>✓ Enable SIM lock / carrier PIN to prevent SIM swaps</li>
                  <li>✓ Use 2FA on your email account</li>
                  <li>✓ Log out on shared devices</li>
                  <li>✓ Keep your browser/OS updated</li>
                  <li>✓ Verify the URL before logging in</li>
                  <li>✓ Report suspicious activity immediately</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-red-200 dark:border-red-800/30 rounded-lg p-5 transition-all duration-300 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">❌ DON'T</h4>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✗ Share your OTP code with anyone; we will never ask for it</li>
                  <li>✗ Click OTP or login links from emails you didn't request</li>
                  <li>✗ Use public WiFi without VPN</li>
                  <li>✗ Forward OTP SMS messages to others</li>
                  <li>✗ Log in on untrusted or shared devices</li>
                  <li>✗ Ignore security notifications</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 9: Suspicious Activity */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              ⚠️ What to Do If You Suspect a Breach
            </h2>

            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-[#DC2626] dark:border-red-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3">Act Quickly</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-0">
                If you notice any suspicious activity on your account, take these steps immediately:
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Contact Us to Lock Your Account</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Email <a href="mailto:security@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline font-semibold">security@lensonwealth.com</a> immediately.
                    We'll freeze your account and revoke all active sessions within hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Sign Out of Your Current Session</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Go to Account Settings and sign out to immediately invalidate your active session token.
                    Since we use OTP-based login, there is no password to change-simply logging out denies further access.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Secure Your Phone & Email</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Since we use OTP-based login, your phone number and email are your access keys. If either
                    is compromised, an attacker can request an OTP. Contact your carrier and email provider immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Review Account Activity</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Check if any unauthorized changes were made to your portfolio data or settings.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 10: Contact Security Team */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              📧 Contact Our Security Team
            </h2>

            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-8 transition-all duration-300 hover:border-[#2563EB]/30 dark:hover:border-[#3B82F6]/30 hover:shadow-md">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">Security Issues</h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3">
                    Found a vulnerability? Report it responsibly:
                  </p>
                  <p className="mb-2">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Email:</strong>{' '}
                    <a href="mailto:security@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">
                      security@lensonwealth.com
                    </a>
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] italic">
                    We appreciate responsible disclosure and will acknowledge your report within 48 hours.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">General Questions</h3>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-3">
                    Have questions about our security practices?
                  </p>
                  <p className="mb-2">
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Email:</strong>{' '}
                    <a href="mailto:support@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline">
                      support@lensonwealth.com
                    </a>
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] italic">
                    Our support team is here to help with any security-related questions.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-[#E5E7EB] dark:border-[#334155] text-center">
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Bug Bounty Program (Coming Soon):</strong> We're 
                  planning to launch a bug bounty program to reward security researchers who help us 
                  keep LensOnWealth secure.
                </p>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-6 text-center">
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-2">
              <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Security is our top priority.</strong> We continuously 
              invest in infrastructure, processes, and people to keep your financial data safe.
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Last updated: March 12, 2026
            </p>
          </div>
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
