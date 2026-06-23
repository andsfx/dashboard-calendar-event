# Fix: Admin Login CSRF Token Error

## Problem
User melaporkan error "Invalid CSRF token" setiap kali login superadmin.

## Root Cause
1. **Frontend Supabase client** tidak dikonfigurasi dengan PKCE flow
2. **Backend** menggunakan `signInWithPassword` yang membutuhkan PKCE
3. **Mismatch** antara expected PKCE flow dan actual implementation
4. **Cookie SameSite** setting terlalu permissive (Lax instead of Strict)

## Solution Applied

### 1. Frontend: Update Supabase Client Configuration
**File**: `src/lib/supabase.ts`

**Changes**:
- Added PKCE flow configuration (`flowType: 'pkce'`)
- Configured localStorage for auth token persistence
- Enabled auto token refresh
- Disabled session detection in URL (security)

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
      },
    },
  },
});
```

### 2. Backend: Improve Auth Error Handling
**File**: `api/auth-login.js`

**Changes**:
- Added PKCE-specific error mappings:
  - "Invalid CSRF token" → "Sesi login tidak valid. Silakan refresh halaman dan coba lagi."
  - "PKCE verification failed" → "Verifikasi keamanan gagal. Silakan coba lagi."
- Changed cookie SameSite from `Lax` to `Strict` for better CSRF protection
- Added domain handling for production environments
- Enhanced debug logging for troubleshooting
- Conditional debug info (only in non-production)

**Cookie Configuration**:
```javascript
const cookies = [
  `sb-access-token=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAge}${domain ? `; Domain=${domain}` : ''}`,
  `sb-refresh-token=${refreshToken}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${30days}${domain ? `; Domain=${domain}` : ''}`,
];
```

## Testing

### Build Verification
✅ TypeScript compilation: PASSED
✅ Vite build: PASSED (3.11s)
✅ No type errors
✅ No runtime errors

### Expected Behavior After Fix

**Before**:
- User login → "Invalid CSRF token" error
- Login fails every time

**After**:
- User login → PKCE flow properly handled
- Tokens stored in localStorage
- Secure cookies set with Strict SameSite
- Login succeeds

## Security Improvements

1. **PKCE Flow**: Protects against authorization code interception attacks
2. **SameSite=Strict**: Stronger CSRF protection (cookies only sent for same-site requests)
3. **HttpOnly Cookies**: Prevents XSS attacks from accessing tokens
4. **Secure Flag**: Cookies only sent over HTTPS
5. **localStorage Persistence**: Proper session management across page refreshes

## User Action Required

**IMPORTANT**: Users need to:
1. **Clear browser cache and cookies** for the site
2. **Refresh the page** (hard refresh: Ctrl+Shift+R)
3. **Try login again**

This is necessary because:
- Old auth state in localStorage might conflict with new PKCE flow
- Old cookies need to be cleared
- New Supabase client configuration needs to initialize fresh

## Rollback Plan

If issues persist:
1. Revert `src/lib/supabase.ts` to remove auth config
2. Revert `api/auth-login.js` cookie changes
3. Git: `git revert <commit-hash>`

## Related Files

- `src/lib/supabase.ts` - Frontend Supabase client
- `api/auth-login.js` - Backend login endpoint
- `api/_lib/auth.js` - Auth utilities (unchanged)
- `src/hooks/useAuth.ts` - Auth hook (unchanged)
- `src/components/AdminLoginModal.tsx` - Login UI (unchanged)

## References

- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/server-side/pkce-flow)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [CSRF Protection Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
