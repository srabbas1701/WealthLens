/**
 * Demo Layout
 * 
 * Wraps all demo pages with error boundary to prevent errors from affecting AuthProvider.
 * Demo pages are completely isolated from authentication.
 */

import { DemoErrorBoundary } from '@/components/DemoErrorBoundary';

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoErrorBoundary>
      {children}
    </DemoErrorBoundary>
  );
}









