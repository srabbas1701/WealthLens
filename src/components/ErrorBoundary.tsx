/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in React component tree and displays a fallback UI.
 * Prevents the entire app from crashing when a component throws an error.
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 * 
 * Or with custom fallback:
 *   <ErrorBoundary fallback={<CustomErrorUI />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  sectionName?: string; // For granular error boundaries (e.g., "AI Summary", "Portfolio Health Score")
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    const context = this.props.sectionName 
      ? `[ErrorBoundary] Error in ${this.props.sectionName}:`
      : '[ErrorBoundary] Error caught:';
    
    console.error(context, error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload page to fully reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Return custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Section-level error (smaller fallback)
      if (this.props.sectionName) {
        return (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
            <div className="flex items-center gap-3 text-center">
              <AlertTriangleIcon className="w-5 h-5 text-[#EF4444] dark:text-[#F87171] flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Unable to load {this.props.sectionName}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Please refresh the page to try again.
                </p>
              </div>
            </div>
            {/* Show error details only in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-[#FEF2F2] dark:bg-[#7F1D1D] rounded-lg border border-[#FECACA] dark:border-[#991B1B]">
                <summary className="text-xs font-medium text-[#991B1B] dark:text-[#FCA5A5] cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-[#991B1B] dark:text-[#FCA5A5] overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>
        );
      }

      // Full-page error (main error boundary)
      return (
        <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-8 text-center">
            <div className="w-16 h-16 bg-[#FEF2F2] dark:bg-[#7F1D1D] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangleIcon className="w-8 h-8 text-[#EF4444] dark:text-[#F87171]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2.5 bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#1E40AF] dark:hover:bg-[#2563EB] transition-colors"
            >
              Refresh Page
            </button>
            {/* Show error details only in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="p-3 bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg border border-[#E5E7EB] dark:border-[#334155]">
                  <pre className="text-xs text-[#0F172A] dark:text-[#F8FAFC] overflow-auto">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
