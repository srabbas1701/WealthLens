import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth";
import { CurrencyProvider } from "@/components/AppHeader";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

// Force dynamic rendering to prevent build-time Supabase client creation
export const dynamic = 'force-dynamic';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LensOnWealth - Complete Wealth Tracking for Indian Investors",
  description:
    "Get a clear view of your complete wealth - stocks, mutual funds, EPF, NPS, PPF, fixed deposits, bonds, real estate, gold, and more. All platforms, all asset classes, crystal clear visibility.",
  keywords: "wealth tracking India, complete wealth visibility, track all investments, EPF NPS PPF tracker, investment clarity India, net worth tracker, clear wealth view",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme BEFORE React hydrates to prevent flash and hydration mismatch */}
        {/* This script MUST run before any browser extensions modify the DOM */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Apply theme immediately, before any extensions run
                  const theme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = theme === 'dark' || (!theme && prefersDark);
                  
                  const html = document.documentElement;
                  if (isDark) {
                    html.classList.add('dark');
                    html.style.colorScheme = 'dark';
                  } else {
                    html.classList.remove('dark');
                    html.style.colorScheme = 'light';
                  }
                  
                  // Force background colors immediately via inline styles with !important
                  html.style.setProperty('background-color', isDark ? '#0F172A' : '#F6F8FB', 'important');
                  if (document.body) {
                    document.body.style.setProperty('background-color', isDark ? '#0F172A' : '#F6F8FB', 'important');
                  }
                  
                  // Also set CSS variable for immediate use
                  html.style.setProperty('--background', isDark ? '#0F172A' : '#F6F8FB', 'important');
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Only run in production
                  if (typeof window === 'undefined') return;
                  
                  // Disable F12 and other developer tool shortcuts
                  document.addEventListener('keydown', function(e) {
                    // Disable F12
                    if (e.key === 'F12' || e.keyCode === 123) {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                    
                    // Disable Ctrl+Shift+I (DevTools)
                    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                    
                    // Disable Ctrl+Shift+J (Console)
                    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                    
                    // Disable Ctrl+Shift+C (Element Inspector)
                    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                    
                    // Disable Ctrl+U (View Source)
                    if (e.ctrlKey && e.key === 'U') {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                    
                    // Disable Ctrl+Shift+K (Firefox Console)
                    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }, true);
                  
                  // Disable right-click context menu (optional - can be removed if not needed)
                  document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                  }, true);
                  
                  // Disable console methods
                  if (typeof console !== 'undefined') {
                    const noop = function() {};
                    const methods = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml', 'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
                    methods.forEach(function(method) {
                      console[method] = noop;
                    });
                    
                    // Override console object itself
                    Object.defineProperty(window, 'console', {
                      value: {},
                      writable: false,
                      configurable: false
                    });
                  }
                  
                  // Prevent opening DevTools via other methods
                  let devtools = {open: false, orientation: null};
                  const threshold = 160;
                  
                  setInterval(function() {
                    if (window.outerHeight - window.innerHeight > threshold || 
                        window.outerWidth - window.innerWidth > threshold) {
                      if (!devtools.open) {
                        devtools.open = true;
                        // Optionally redirect or show a message
                        // window.location.href = '/';
                      }
                    } else {
                      if (devtools.open) {
                        devtools.open = false;
                      }
                    }
                  }, 500);
                })();
              `,
            }}
          />
        )}
      </head>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>

        {/* Theme provider - wraps everything */}
        <ThemeProvider>
          
          {/* Toast notification provider */}
          <ToastProvider>
            
            {/* Auth-independent UI provider */}
            <CurrencyProvider>

              {/* SINGLE, STABLE AUTH PROVIDER */}
              <AuthProvider>

                {/* Providers that depend on auth MUST be inside */}
                <SessionTimeoutProvider>
                  {children}
                </SessionTimeoutProvider>

              </AuthProvider>
            </CurrencyProvider>
          </ToastProvider>
        </ThemeProvider>

      </body>
    </html>
  );
}

