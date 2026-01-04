/**
 * Next.js Middleware
 * 
 * Handles authentication and route protection at the edge.
 * Supports both Email/Password and Mobile OTP authentication.
 * 
 * ROUTING LOGIC:
 * 1. Public routes (/, /login) - accessible to all
 * 2. Protected routes (/dashboard, /onboarding) - require authentication
 * 3. API routes - handle their own auth
 * 
 * USER FLOW:
 * - Not authenticated → redirect to /login (for protected routes)
 * - Authenticated, no portfolio → redirect to /onboarding
 * - Authenticated, has portfolio → redirect to /dashboard
 * - Existing users should NEVER see onboarding again
 * 
 * AUTH METHODS:
 * - Email/Password: Traditional auth with email verification
 * - Mobile OTP: Phone-based auth via Supabase (India-friendly)
 * - Both methods use the same user.id as primary key
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/callback'];

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/onboarding'];

export async function middleware(request: NextRequest) {
  // Create response to potentially modify
  let response = NextResponse.next({
    request,
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  
  // Skip API routes - they handle their own auth
  if (pathname.startsWith('/api/')) {
    return response;
  }
  
  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route
  );

  // Not authenticated trying to access protected route → redirect to login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user on login/signup page → redirect based on state
  if (user && (pathname === '/login' || pathname === '/signup')) {
    // Check if user has a portfolio
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();
    
    if (portfolio) {
      // Has portfolio → go to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // No portfolio → go to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Allow authenticated users to access home page (landing page)
  // The page component will handle showing landing page or redirecting
  // This allows users to see the landing page even when logged in

  // Authenticated user with portfolio trying to access onboarding → redirect to dashboard
  // This ensures existing users NEVER see onboarding again
  if (user && pathname === '/onboarding') {
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();
    
    if (portfolio) {
      // User already has portfolio → redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

