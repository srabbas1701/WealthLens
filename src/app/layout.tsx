import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth";
import { CurrencyProvider } from "@/components/AppHeader";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WealthLens - Understand Your Investments",
  description:
    "Portfolio intelligence for Indian investors. Understand every investment you own with clarity and confidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>

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

      </body>
    </html>
  );
}

