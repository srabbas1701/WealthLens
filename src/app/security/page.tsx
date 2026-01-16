'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { LogoLockup } from '@/components/LogoLockup';

/**
 * Security - LensOnWealth
 * 
 * Comprehensive security information and best practices
 * Last updated: January 2025
 */

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Header */}
      <header className="bg-gradient-to-br from-blue-50 via-emerald-50/50 to-[#F6F8FB] dark:from-blue-950/20 dark:via-emerald-950/10 dark:to-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full mb-6">
              <span className="text-4xl">🔒</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Bank-Grade Security
            </h1>
            <p className="text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-2xl mx-auto">
              Your financial data is protected with enterprise-level security measures. 
              Here's exactly how we keep your wealth information safe.
            </p>
          </div>
        </div>
      </header>

      {/* Key Security Highlights */}
      <section className="py-16 bg-[#F6F8FB] dark:bg-[#0F172A]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg">
                <div className="text-4xl mb-4">🇮🇳</div>
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Data in India</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  All your data stored on secure Indian servers, never leaves the country
                </p>
              </div>
              <div className="text-center p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">256-bit Encryption</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Same military-grade encryption used by banks and governments
                </p>
              </div>
              <div className="text-center p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg">
                <div className="text-4xl mb-4">🚫</div>
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Zero Broker Access</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  We never ask for or store your broker passwords - CSV only
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">

          {/* Section 1: Data Encryption */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              🔐 Data Encryption
            </h2>

            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3 flex items-center gap-2">
                  <span>🔒</span> Encryption at Rest
                </h3>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                  All data stored in our database is encrypted using <strong className="text-[#0F172A] dark:text-[#F8FAFC]">AES-256 encryption</strong> 
                  - the same standard used by banks, militaries, and governments worldwide.
                </p>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Portfolio holdings, transaction history, and personal information</li>
                  <li>✓ Passwords hashed with bcrypt (industry standard, one-way encryption)</li>
                  <li>✓ Encryption keys stored separately from data (defense in depth)</li>
                  <li>✓ Regular key rotation following best practices</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3 flex items-center gap-2">
                  <span>🌐</span> Encryption in Transit
                </h3>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-4">
                  All communication between your device and our servers uses <strong className="text-[#0F172A] dark:text-[#F8FAFC]">TLS 1.3</strong> 
                  (Transport Layer Security) - the latest and most secure protocol.
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
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Your Data Stays in India</h3>
              <p className="text-[#6B7280] dark:text-[#94A3B8] mb-0">
                All your financial data is stored on secure cloud servers located in India. 
                We comply with Indian data protection regulations and never transfer your 
                personal or financial data outside India.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
              Infrastructure Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">☁️ Cloud Provider</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Enterprise-grade cloud hosting with SOC 2 Type II certification
                </p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">📍 Server Location</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Mumbai & Bangalore data centers (India) with 99.9% uptime SLA
                </p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">💾 Backup Strategy</h4>
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                  Daily encrypted backups with 30-day retention and disaster recovery
                </p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-5">
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
                  User Authentication
                </h3>
                <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Secure Password Requirements:</strong> Minimum 
                    8 characters with complexity requirements
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Password Hashing:</strong> Bcrypt algorithm 
                    with salt (industry standard, irreversible)
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Session Management:</strong> Secure session 
                    tokens with automatic expiration
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Two-Factor Authentication (Coming Soon):</strong> Optional 
                    2FA via email/SMS for enhanced security
                  </li>
                  <li>
                    <strong className="text-[#0F172A] dark:text-[#F8FAFC]">OAuth Support:</strong> Secure sign-in with 
                    Google/Microsoft (no password storage)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Access Monitoring
                </h3>
                <ul className="text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Login attempt tracking and rate limiting</li>
                  <li>✓ Automatic account lockout after failed login attempts</li>
                  <li>✓ Email notifications for suspicious activity</li>
                  <li>✓ IP-based anomaly detection</li>
                  <li>✓ Session invalidation on password change</li>
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
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Read-only data:</strong> You upload statements manually - full control</p>
                <p>✅ <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Smaller attack surface:</strong> No API keys or OAuth tokens that could be compromised</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                CSV Upload Security
              </h3>
              <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                <li>• CSV files processed in memory, not stored permanently</li>
                <li>• Virus and malware scanning on all uploads</li>
                <li>• File size limits to prevent abuse (max 10MB per file)</li>
                <li>• Parsed data encrypted immediately after processing</li>
                <li>• Original CSV files deleted after successful import</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Monitoring */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">
              👁️ Security Monitoring & Incident Response
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
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

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
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
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Principle of Least Privilege
                </h3>
                <p className="text-[#6B7280] dark:text-[#94A3B8] mb-3">
                  Our team members only have access to the data they absolutely need to do their jobs:
                </p>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Support staff:</strong> Limited to basic account info (email, name) - no portfolio data</li>
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Engineers:</strong> Access only to anonymized/aggregated data for debugging</li>
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Database access:</strong> Restricted to senior engineers with audit logging</li>
                  <li>• <strong className="text-[#0F172A] dark:text-[#F8FAFC]">No casual browsing:</strong> All data access requires justification and is logged</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
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
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
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

              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
                  Future Certifications
                </h3>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>📋 SOC 2 Type II (in progress)</li>
                  <li>📋 ISO 27001 certification</li>
                  <li>📋 DPDP Act compliance (when enacted)</li>
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
              <div className="bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-5">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">✅ DO</h4>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✓ Use a strong, unique password (12+ characters)</li>
                  <li>✓ Enable 2FA when available</li>
                  <li>✓ Keep your email account secure</li>
                  <li>✓ Log out on shared devices</li>
                  <li>✓ Use a password manager</li>
                  <li>✓ Keep your browser/OS updated</li>
                  <li>✓ Verify the URL before logging in</li>
                  <li>✓ Report suspicious activity immediately</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-red-200 dark:border-red-800/30 rounded-lg p-5">
                <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">❌ DON'T</h4>
                <ul className="text-sm text-[#6B7280] dark:text-[#94A3B8] space-y-2">
                  <li>✗ Reuse passwords from other sites</li>
                  <li>✗ Share your password with anyone</li>
                  <li>✗ Use public WiFi without VPN</li>
                  <li>✗ Click suspicious email links</li>
                  <li>✗ Save passwords in your browser (use a password manager instead)</li>
                  <li>✗ Write down passwords</li>
                  <li>✗ Log in on untrusted devices</li>
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
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Change Your Password</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Go to Account Settings → Security → Change Password. Use a strong, unique password.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Log Out All Sessions</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    In Account Settings, click "Log Out All Devices" to terminate all active sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Contact Us Immediately</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    Email <a href="mailto:security@lensonwealth.com" className="text-[#2563EB] dark:text-[#3B82F6] hover:underline font-semibold">security@lensonwealth.com</a> with 
                    details of the suspicious activity. We'll investigate and help secure your account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Check Your Email</h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
                    If your email is compromised, attackers can reset your password. Secure your email account first.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center font-bold">
                  5
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

            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg p-8">
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
              Last updated: January 17, 2025
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
