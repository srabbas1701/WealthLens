/**
 * Session Timeout Provider
 * 
 * Manages session timeout across the entire application.
 * Wraps authenticated pages to track activity and handle auto-logout.
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionTimeoutModal from './SessionTimeoutModal';

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  const { handleStaySignedIn, handleLogoutNow } = useSessionTimeout({
    onWarning: () => {
      setShowWarning(true);
    },
    onLogout: () => {
      setShowWarning(false);
    },
    enabled: !!user, // Only enable when user is authenticated
  });

  return (
    <>
      {children}
      {user && (
        <SessionTimeoutModal
          isOpen={showWarning}
          onStaySignedIn={() => {
            handleStaySignedIn();
            setShowWarning(false);
          }}
          onLogoutNow={handleLogoutNow}
        />
      )}
    </>
  );
}

