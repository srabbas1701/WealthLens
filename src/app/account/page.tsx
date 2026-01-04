/**
 * Account Settings Page
 * 
 * Trust-first account management for fintech investment platform.
 * 
 * DESIGN PRINCIPLES:
 * - Give users clarity and control
 * - Make security and privacy visible
 * - Avoid feature promotion or upsell
 * - Calm, professional tone
 * - Same typography and layout as dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  LockIcon, 
  ClockIcon, 
  InfoIcon,
  MailIcon,
  PhoneIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SettingsIcon,
  XIcon,
  ArrowRightIcon,
} from '@/components/icons';
import Link from 'next/link';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, profile, updateProfile, authStatus } = useAuth();
  
  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [profileChanged, setProfileChanged] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Security state
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Initialize profile data
  useEffect(() => {
    if (user && profile) {
      setProfileData({
        fullName: profile.full_name || '',
        email: user.email || profile.email || '',
        phone: user.phone || profile.phone_number || '',
      });
    }

    // Get last login
    if (user?.last_sign_in_at) {
      const date = new Date(user.last_sign_in_at);
      setLastLogin(date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }));
    }
  }, [user, profile]);

  // Check if profile has changed
  useEffect(() => {
    if (user && profile) {
      const hasChanged = 
        profileData.fullName !== (profile.full_name || '') ||
        profileData.email !== (user.email || profile.email || '') ||
        profileData.phone !== (user.phone || profile.phone_number || '');
      setProfileChanged(hasChanged);
    }
  }, [profileData, user, profile]);

  // GUARD: Redirect if not authenticated
  // RULE: Never redirect while authStatus === 'loading'
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      // Check if we're in demo mode (demo mode is separate, not authenticated)
      if (window.location.pathname.startsWith('/demo')) {
        router.replace('/demo');
        return;
      }
      router.replace('/login?redirect=/account');
    }
  }, [authStatus, router]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const { error } = await updateProfile({
        full_name: profileData.fullName || null,
      });

      if (error) {
        setProfileError(error.message || 'Failed to update profile');
      } else {
        setProfileSuccess(true);
        setProfileChanged(false);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      setProfileError('Something went wrong. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleteError(null);
    // TODO: Implement account deletion API
    // For now, show error that it's not implemented
    setDeleteError('Account deletion is not yet available. Please contact support.');
    setShowDeleteConfirm(false);
  };

  // GUARD: Show loading while auth state is being determined
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  // GUARD: Redirect if not authenticated (only after loading is complete)
  if (authStatus === 'unauthenticated') {
    return null; // Redirect happens in useEffect
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <AppHeader 
        showBackButton={true}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <main className="max-w-[900px] mx-auto px-6 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">Account Settings</h1>
          <p className="text-sm text-[#6B7280]">
            Manage your profile, security, and privacy settings
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Profile Section */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="w-5 h-5 text-[#6B7280]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Profile</h2>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                />
              </div>

              {/* Email (Read-only if from auth) */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MailIcon className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] bg-[#F6F8FB] text-[#6B7280] cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  Email is managed through your authentication method
                </p>
              </div>

              {/* Phone (Read-only if from auth) */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <input
                    type="tel"
                    value={profileData.phone}
                    disabled
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] bg-[#F6F8FB] text-[#6B7280] cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  Mobile number is managed through your authentication method
                </p>
              </div>

              {/* Save Button */}
              {profileChanged && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                  {profileError && (
                    <p className="text-sm text-[#DC2626]">{profileError}</p>
                  )}
                  {profileSuccess && (
                    <div className="flex items-center gap-2 text-sm text-[#16A34A]">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Profile updated</span>
                    </div>
                  )}
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="px-6 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Security Section */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheckIcon className="w-5 h-5 text-[#6B7280]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Security</h2>
            </div>

            <div className="space-y-4">
              {/* Session Policy */}
              <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] mb-1">Session Timeout</p>
                    <p className="text-sm text-[#6B7280]">
                      You'll be automatically logged out after 15 minutes of inactivity for your security.
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Login */}
              {lastLogin && (
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Last Login
                  </label>
                  <p className="text-sm text-[#6B7280]">{lastLogin}</p>
                </div>
              )}

              {/* Change Password (Disabled - passwordless auth) */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Password
                </label>
                <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280]">
                    We use passwordless authentication. Your account is secured via OTP or magic link.
                  </p>
                </div>
              </div>

              {/* Log out of all devices (Future) */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Active Sessions
                </label>
                <button
                  disabled
                  className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] font-medium rounded-lg bg-[#F6F8FB] cursor-not-allowed opacity-50"
                >
                  Log out of all devices
                </button>
                <p className="text-xs text-[#6B7280] mt-1">
                  Coming soon
                </p>
              </div>

              {/* Link to Security Page */}
              <div className="pt-4 border-t border-[#E5E7EB]">
                <Link
                  href="/security"
                  className="inline-flex items-center gap-2 text-sm text-[#2563EB] font-medium hover:text-[#1E40AF] transition-colors"
                >
                  <span>View detailed security information</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Data & Privacy Section */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-6">
              <LockIcon className="w-5 h-5 text-[#6B7280]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Data & Privacy</h2>
            </div>

            <div className="space-y-6">
              {/* Privacy Statement */}
              <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB] space-y-3">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm text-[#6B7280]">
                    <p>
                      <strong className="text-[#0F172A]">Read-only access:</strong> We only view your investments. We never execute trades or modify your portfolio.
                    </p>
                    <p>
                      <strong className="text-[#0F172A]">No data selling:</strong> We never share your information with third parties or sell your data.
                    </p>
                    <p>
                      <strong className="text-[#0F172A]">Data storage:</strong> Your data is encrypted and stored securely in India.
                    </p>
                  </div>
                </div>
              </div>

              {/* Disconnect Data Sources */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Data Sources
                </label>
                <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-3">
                    You can disconnect data sources or delete uploaded files.
                  </p>
                  <button
                    disabled
                    className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] font-medium rounded-lg bg-white hover:bg-[#F6F8FB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Manage Data Sources
                  </button>
                  <p className="text-xs text-[#6B7280] mt-2">
                    Coming soon
                  </p>
                </div>
              </div>

              {/* Delete Uploaded Files */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Uploaded Files
                </label>
                <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-3">
                    Files are processed and discarded immediately. No files are stored on our servers.
                  </p>
                </div>
              </div>

              {/* Account Deletion */}
              <div className="pt-4 border-t border-[#E5E7EB]">
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Delete Account
                </label>
                <p className="text-sm text-[#6B7280] mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-[#DC2626] text-[#DC2626] font-medium rounded-lg hover:bg-[#FEF2F2] transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* 4. Preferences Section */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-6">
              <SettingsIcon className="w-5 h-5 text-[#6B7280]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Preferences</h2>
            </div>

            <div className="space-y-4">
              {/* Notifications */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Notifications
                </label>
                <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280]">
                    Notification preferences coming soon.
                  </p>
                </div>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Date Format
                </label>
                <div className="p-4 bg-[#F6F8FB] rounded-lg border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280]">
                    Date format preferences coming soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
            />

            <div className="relative w-full max-w-md mx-4 bg-white rounded-xl border border-[#E5E7EB] shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
                <h2 className="text-lg font-semibold text-[#0F172A]">Delete Account</h2>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                    setDeleteError(null);
                  }}
                  className="p-2 rounded-lg hover:bg-[#F6F8FB] transition-colors"
                >
                  <XIcon className="w-5 h-5 text-[#6B7280]" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <div className="mb-4 p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#991B1B] mb-1">This action cannot be undone</p>
                      <p className="text-sm text-[#991B1B]">
                        All your portfolio data, holdings, and account information will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => {
                      setDeleteConfirmText(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="DELETE"
                    className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all"
                  />
                  {deleteError && (
                    <p className="text-sm text-[#DC2626] mt-2">{deleteError}</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F6F8FB]">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 text-[#6B7280] font-medium rounded-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="flex items-center gap-2 px-6 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

