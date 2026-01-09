/**
 * Demo Error Boundary
 * 
 * Prevents errors in demo mode from affecting the AuthProvider or other parts of the app.
 * Catches errors in demo pages and displays a friendly message.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DemoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error but don't let it propagate to AuthProvider
    console.error('[DemoErrorBoundary] Demo error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback UI or default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
            <AlertTriangleIcon className="w-12 h-12 text-[#F59E0B] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#0F172A] mb-2">
              Demo Error
            </h2>
            <p className="text-sm text-[#6B7280] mb-6">
              Something went wrong in demo mode. This error has been isolated and won't affect your session.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/demo"
                className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1E40AF] transition-colors"
              >
                Back to Demo
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg text-[#6B7280] text-sm font-medium hover:text-[#0F172A] transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}









