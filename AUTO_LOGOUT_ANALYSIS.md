# Auto Logout Logic Analysis

## Current Implementation Overview

The application has **multiple, inconsistent approaches** to handling automatic logout and session expiration. This document outlines all the different mechanisms and their inconsistencies.

---

## 1. Inactivity-Based Auto Logout (Client-Side)

### Location: `src/hooks/useSessionTimeout.ts`

**Mechanism:**
- Tracks user activity (mouse, keyboard, scroll, touch, API calls)
- Logs out after **30 minutes of inactivity**
- Shows warning modal at **28 minutes**

**How it works:**
1. Monitors DOM events: `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`, `click`
2. Intercepts `window.fetch` to track API activity
3. Stores last activity in `localStorage` for cross-tab sync
4. Checks inactivity every 30 seconds
5. On timeout: calls `signOut()`, clears localStorage, redirects to `/?timeout=true`

**Usage:**
- Wrapped in `SessionTimeoutProvider` component
- Provider is used in `src/app/layout.tsx` (applies globally)
- Only enabled when `user` is authenticated

**Issues:**
- ✅ Works well for inactivity detection
- ❌ Only tracks client-side activity
- ❌ Doesn't check if Supabase session is actually expired
- ❌ May logout user even if Supabase session is still valid

---

## 2. Token Expiration Handling (Multiple Locations)

### A. Auth Context - Session Initialization

**Location:** `src/lib/auth/context.tsx` (lines 298-312)

**Mechanism:**
- During `initAuthSession()`, checks for refresh token errors
- If `refresh_token_not_found` error occurs:
  - Calls `supabase.auth.signOut()`
  - Clears session/user state
  - Sets `authStatus` to `unauthenticated`

**Trigger:** Only during initial session check on app load

**Issues:**
- ✅ Handles invalid refresh tokens
- ❌ Only runs once on app initialization
- ❌ Doesn't handle token expiration during active session
- ❌ No user notification about why they were logged out

### B. Middleware - Route Protection

**Location:** `src/middleware.ts` (lines 76-117)

**Mechanism:**
- On every route request, calls `supabase.auth.getUser()`
- If refresh token error occurs:
  - Clears all Supabase auth cookies
  - Redirects protected routes to `/login`
  - Allows public routes to continue

**Trigger:** On every route navigation (except API routes)

**Issues:**
- ✅ Handles token expiration during navigation
- ✅ Clears cookies properly
- ❌ Different behavior than auth context (redirects vs. state update)
- ❌ No coordination with client-side inactivity timeout
- ❌ May cause redirect loops if session expires while on protected route

### C. Supabase Middleware Helper

**Location:** `src/lib/supabase/middleware.ts` (line 47)

**Mechanism:**
- Comment says "Refresh session if expired"
- Actually just calls `supabase.auth.getUser()` which auto-refreshes
- **Not actively used** - this file appears to be unused

**Issues:**
- ❌ File exists but is not imported/used anywhere
- ❌ Dead code that could cause confusion

---

## 3. Supabase Native Session Expiration

**Supabase Default Behavior:**
- Access tokens expire after **1 hour**
- Refresh tokens can last **days/weeks** (configurable)
- Supabase SDK automatically refreshes access tokens using refresh token
- If refresh token is invalid/expired, session becomes invalid

**Current Handling:**
- ✅ Supabase SDK handles automatic token refresh
- ❌ No explicit handling of refresh token expiration
- ❌ No user notification when session expires due to token expiration
- ❌ Inactivity timeout (30 min) may conflict with token expiration (1 hour+)

---

## 4. API Route Authentication

**Location:** Various API routes in `src/app/api/**`

**Current State:**
- Most API routes call `supabase.auth.getUser()` to verify authentication
- If user is not authenticated, they return 401 errors
- **No consistent handling** of expired sessions

**Issues:**
- ❌ Each route handles auth differently
- ❌ Some routes may not check auth at all
- ❌ No unified error response for expired sessions
- ❌ Client-side may not know why API call failed (auth vs. other error)

---

## 5. Auth State Change Listener

**Location:** `src/lib/auth/context.tsx` (lines 340-386)

**Mechanism:**
- Listens to Supabase `onAuthStateChange` events
- Handles `SIGNED_OUT` event by clearing all state
- This is triggered when Supabase detects session is invalid

**Issues:**
- ✅ Handles Supabase-initiated sign-outs
- ❌ May not fire if session expires silently
- ❌ No coordination with inactivity timeout
- ❌ No user notification about automatic logout

---

## Inconsistencies Summary

### 1. **Multiple Logout Triggers Without Coordination**
- Inactivity timeout (30 min) - client-side
- Token expiration - handled in 3 different places
- Supabase session expiration - handled by SDK
- No unified logout handler

### 2. **Different Logout Behaviors**
- **Inactivity timeout:** Redirects to `/?timeout=true` (landing page)
- **Middleware token error:** Redirects to `/login?redirect=...`
- **Auth context token error:** Just clears state (no redirect)
- **Supabase SIGNED_OUT event:** Clears state (no redirect)

### 3. **Inconsistent User Experience**
- Some logouts show timeout message
- Some logouts redirect to login
- Some logouts happen silently
- No consistent messaging about why logout occurred

### 4. **No Session Expiration Check**
- Inactivity timeout doesn't check if Supabase session is actually expired
- May logout user even if session is still valid
- May not logout user if session expired but user is still active

### 5. **API Route Inconsistency**
- API routes don't consistently handle expired sessions
- Client-side may not know why API calls fail
- No retry logic for expired sessions

---

## Recommended Unified Approach

### 1. **Single Source of Truth for Session State**
- Use Supabase session expiration as primary trigger
- Inactivity timeout should be secondary (security measure)
- Check session validity before inactivity timeout

### 2. **Unified Logout Handler**
- Create single `handleAutoLogout()` function
- All logout triggers should use this function
- Consistent redirect and messaging

### 3. **Session Expiration Check**
- Periodically check if Supabase session is expired
- If expired, trigger logout immediately
- Show appropriate message to user

### 4. **API Route Consistency**
- Create auth middleware for API routes
- Consistent error responses for expired sessions
- Client-side should handle 401 errors gracefully

### 5. **User Notification**
- Always notify user when auto-logout occurs
- Explain reason (inactivity vs. session expiration)
- Provide clear path to re-authenticate

---

## Files That Need Updates

1. **`src/hooks/useSessionTimeout.ts`**
   - Add Supabase session expiration check
   - Coordinate with token expiration

2. **`src/lib/auth/context.tsx`**
   - Unify token expiration handling
   - Add session expiration monitoring
   - Create unified logout handler

3. **`src/middleware.ts`**
   - Coordinate with client-side logout
   - Consistent redirect behavior

4. **`src/lib/supabase/middleware.ts`**
   - Remove if unused, or integrate properly

5. **API Routes**
   - Create shared auth middleware
   - Consistent error handling

---

## Current Behavior Flow

### Scenario 1: User Inactive for 30 Minutes
1. `useSessionTimeout` detects inactivity
2. Shows warning at 28 minutes
3. Logs out at 30 minutes
4. Calls `signOut()` → clears state
5. Redirects to `/?timeout=true`
6. ✅ User sees timeout message

### Scenario 2: Supabase Token Expires During Active Session
1. User makes API call or navigates
2. Supabase SDK tries to refresh token
3. Refresh token is invalid/expired
4. **Multiple possible outcomes:**
   - If navigating: Middleware catches error → redirects to `/login`
   - If on same page: Auth context may catch it → clears state (no redirect)
   - If API call: Returns 401 → client may not handle gracefully
5. ❌ Inconsistent user experience

### Scenario 3: Session Expires While User is Active
1. User is actively using app
2. Supabase session expires (after 1+ hour)
3. Next API call or navigation fails
4. **May or may not trigger logout:**
   - If middleware catches it → redirects
   - If API call fails → may show error, not logout
   - Inactivity timeout won't catch it (user is active)
5. ❌ User may see errors but not be logged out

---

## Conclusion

The current implementation has **multiple competing mechanisms** for handling logout, leading to:
- Inconsistent user experience
- Potential security gaps (session may expire without logout)
- Confusing codebase (hard to maintain)
- Race conditions between different logout triggers

**Recommendation:** Implement a unified session management system that:
1. Uses Supabase session expiration as primary mechanism
2. Uses inactivity timeout as secondary security measure
3. Provides consistent user experience across all logout scenarios
4. Handles API route authentication consistently
