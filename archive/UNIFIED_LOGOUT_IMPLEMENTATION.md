# Unified Logout Implementation

## Overview

Implemented a unified session management system that consolidates all auto-logout mechanisms into a single, consistent approach. All auto-logouts now redirect to the home/landing page as requested, while maintaining the 30-minute inactivity timeout.

## Changes Made

### 1. Unified Logout Handler (`src/lib/auth/logout.ts`)

**New file** that provides:
- `handleLogout()` - Single function for all logout operations
- `isSessionExpired()` - Checks if Supabase session is expired
- Consistent redirect behavior (always to home page for auto-logout)
- Cross-tab logout synchronization

**Features:**
- Handles different logout reasons: `inactivity`, `session_expired`, `token_expired`, `manual`
- Clears all localStorage and sessionStorage
- Notifies other tabs about logout
- Redirects to home page with appropriate query params

### 2. Updated Session Timeout Hook (`src/hooks/useSessionTimeout.ts`)

**Changes:**
- ✅ Now uses unified logout handler
- ✅ Checks Supabase session expiration every minute (primary mechanism)
- ✅ Still maintains 30-minute inactivity timeout (secondary security measure)
- ✅ All auto-logouts redirect to home page (`/`)
- ✅ Coordinates session expiration check with inactivity timeout

**Key improvements:**
- Checks session expiration before inactivity timeout
- If session is expired, logs out immediately (regardless of activity)
- Prevents race conditions with `isLoggingOutRef` flag
- Better error handling

### 3. Updated Auth Context (`src/lib/auth/context.tsx`)

**Changes:**
- ✅ `signOut()` now uses unified logout handler
- ✅ Accepts optional parameters for logout reason and redirect control
- ✅ Token expiration errors now use unified logout handler
- ✅ Maintains backward compatibility (optional parameters)

**Signature:**
```typescript
signOut(options?: {
  reason?: 'manual' | 'inactivity' | 'session_expired' | 'token_expired';
  skipRedirect?: boolean;
}): Promise<void>
```

### 4. Updated Middleware (`src/middleware.ts`)

**Changes:**
- ✅ Token expiration errors now redirect to home page (not login)
- ✅ Adds `session_expired=true` query param for user notification
- ✅ Consistent with client-side logout behavior

**Before:** Redirected to `/login?redirect=...`  
**After:** Redirects to `/?session_expired=true`

### 5. API Auth Middleware (`src/lib/api/auth.ts`)

**New file** that provides:
- `checkAuth()` - Consistent authentication checking for API routes
- `requireAuth()` - Wrapper for protected API routes
- `unauthorizedResponse()` - Standard 401 response
- `sessionExpiredResponse()` - Specific response for expired sessions

**Usage:**
```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return sessionExpiredResponse(); // or unauthorizedResponse()
  }
  // Use auth.user and auth.supabase
}
```

### 6. Updated Home Page (`src/app/page.tsx`)

**Changes:**
- ✅ Handles `timeout=true` query param (inactivity timeout)
- ✅ Handles `session_expired=true` query param (session/token expiration)
- ✅ Shows appropriate messages for each scenario
- ✅ Messages auto-dismiss after 5 seconds

**Messages:**
- **Inactivity timeout:** "You were logged out due to inactivity to keep your account secure."
- **Session expired:** "Your session has expired for security reasons."

### 7. Updated AppHeader (`src/components/AppHeader.tsx`)

**Changes:**
- ✅ Manual logout uses `signOut({ reason: 'manual', skipRedirect: true })`
- ✅ Manual logout still redirects to `/login` (as before)
- ✅ Only auto-logouts redirect to home page

## Logout Flow

### Auto-Logout Scenarios (→ Home Page)

1. **Inactivity Timeout (30 minutes)**
   - Triggered by `useSessionTimeout` hook
   - Redirects to `/?timeout=true`
   - Shows inactivity message

2. **Session Expiration**
   - Detected by periodic session check (every minute)
   - Redirects to `/?session_expired=true`
   - Shows session expired message

3. **Token Expiration**
   - Detected by auth context or middleware
   - Redirects to `/?session_expired=true`
   - Shows session expired message

### Manual Logout (→ Login Page)

- User clicks logout button
- Redirects to `/login` (as before)
- No message shown (user-initiated)

## Session Management Strategy

### Primary: Supabase Session Expiration
- Checked every minute via `useSessionTimeout`
- If expired, logout immediately (regardless of activity)
- Ensures security even if user is active

### Secondary: Inactivity Timeout
- 30-minute inactivity timeout (as requested)
- Only triggers if session is still valid
- Additional security layer

### Coordination
- Session expiration check runs first
- If session is expired, logout immediately
- Inactivity timeout only matters if session is valid
- Prevents conflicts between mechanisms

## Benefits

1. **Consistency**
   - All auto-logouts use same handler
   - Same redirect behavior
   - Same cleanup process

2. **User Experience**
   - Clear messages about why logout occurred
   - All auto-logouts go to home page (as requested)
   - User can see landing page and choose to login

3. **Security**
   - Session expiration checked regularly
   - Inactivity timeout still active (30 min)
   - No gaps in logout coverage

4. **Maintainability**
   - Single source of truth for logout logic
   - Easier to modify logout behavior
   - Clear separation of concerns

## Testing Checklist

- [ ] Inactivity timeout after 30 minutes → redirects to home with message
- [ ] Session expiration → redirects to home with message
- [ ] Token expiration → redirects to home with message
- [ ] Manual logout → redirects to login (no message)
- [ ] Cross-tab logout synchronization works
- [ ] API routes handle expired sessions correctly
- [ ] Middleware redirects to home on token expiration
- [ ] Messages display correctly on home page
- [ ] No console errors during logout

## Files Modified

1. ✅ `src/lib/auth/logout.ts` (NEW)
2. ✅ `src/hooks/useSessionTimeout.ts` (UPDATED)
3. ✅ `src/lib/auth/context.tsx` (UPDATED)
4. ✅ `src/middleware.ts` (UPDATED)
5. ✅ `src/lib/api/auth.ts` (NEW)
6. ✅ `src/app/page.tsx` (UPDATED)
7. ✅ `src/components/AppHeader.tsx` (UPDATED)

## Backward Compatibility

- ✅ `signOut()` still works without parameters (defaults to manual logout)
- ✅ Existing code using `signOut()` continues to work
- ✅ Manual logout behavior unchanged (redirects to login)
- ✅ Only auto-logout behavior changed (now redirects to home)

## Next Steps (Optional)

1. **API Route Migration**
   - Update existing API routes to use `requireAuth()` helper
   - Ensures consistent error handling

2. **Session Expiration Warning**
   - Could add warning modal before session expires (similar to inactivity warning)
   - Would require tracking session expiration time

3. **Refresh Token Rotation**
   - Supabase handles this automatically, but could add explicit handling

4. **Analytics**
   - Track logout reasons for analytics
   - Understand user behavior patterns
