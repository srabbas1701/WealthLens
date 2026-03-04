'use client';

import { useEffect } from 'react';

/**
 * Blocks DevTools access and suppresses console output in production.
 * Uses a runtime hostname check so localhost is always unaffected,
 * even if you run `next start` (production build) locally.
 */
export function ProductionGuard() {
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    if (isLocalhost) return;

    // Suppress console output so logs aren't visible in DevTools
    const noop = () => {};
    console.log   = noop;
    console.debug = noop;
    console.info  = noop;
    console.warn  = noop;
    // console.error is intentionally left intact so critical runtime
    // errors still surface through monitoring/Sentry if you add it later.

    // Block common DevTools keyboard shortcuts
    const blockDevTools = (e: KeyboardEvent) => {
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||  // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||  // Ctrl+Shift+J (console)
        (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) ||  // Ctrl+Shift+C (inspector)
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'));                   // Ctrl+U (view source)

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', blockDevTools, true);

    return () => {
      document.removeEventListener('keydown', blockDevTools, true);
    };
  }, []);

  return null;
}
