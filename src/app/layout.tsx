import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth";
import { CurrencyProvider } from "@/components/AppHeader";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { ProductionGuard } from "@/components/ProductionGuard";

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
                function applyTheme() {
                  try {
                    const theme = localStorage.getItem('theme');
                    // Default to dark when no saved preference
                    const isDark = theme === 'dark' || !theme;
                    
                    const html = document.documentElement;
                    if (isDark) {
                      html.classList.add('dark');
                      html.style.colorScheme = 'dark';
                    } else {
                      html.classList.remove('dark');
                      html.style.colorScheme = 'light';
                    }
                    
                    html.style.setProperty('background-color', isDark ? '#0F172A' : '#F6F8FB', 'important');
                    if (document.body) {
                      document.body.style.setProperty('background-color', isDark ? '#0F172A' : '#F6F8FB', 'important');
                    }
                    html.style.setProperty('--background', isDark ? '#0F172A' : '#F6F8FB', 'important');
                  } catch (e) {
                    console.error('Theme initialization error:', e);
                  }
                }
                applyTheme();
                window.addEventListener('pageshow', function(e) {
                  if (e.persisted) applyTheme();
                });
              })();
            `,
          }}
        />
        {/* REMOVED: DevTools blocking code that was breaking production app
            The console override was preventing React/Next.js from handling errors properly
            and could cause the app to fail silently during loading.
            
            If you need to disable devtools in the future, use a less aggressive approach
            that doesn't override the console object completely.
        */}
      </head>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>

        <ProductionGuard />

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

