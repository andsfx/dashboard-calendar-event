# Fix: Admin Login "Invalid CSRF Token" Error

**Issue**: Error "Invalid CSRF token" muncul setiap kali login superadmin

**Root Cause**: Supabase Auth PKCE flow tidak dikonfigurasi dengan benar. Backend menggunakan `signInWithPassword` yang membutuhkan proper auth flow configuration.

---

## Analysis

### Current Flow:
```
AdminLoginModal (frontend)
  → useAuth.login(email, password)
  → POST /api/auth-login
  → getAnonSupabase().auth.signInWithPassword()
  → ERROR: Invalid CSRF token
```

### Problem:
1. **Backend creates new Supabase client per request** - tidak ada session persistence
2. **PKCE flow requires proper configuration** - missing auth options
3. **Frontend tidak handle auth flow** - seharusnya frontend yang call Supabase Auth, bukan backend

---

## Solution Options

### Option 1: Fix Backend Auth Flow (Quick Fix)
**Approach**: Configure Supabase client dengan proper auth options di backend

**Changes**:
- Update `api/_lib/auth.js` - add auth configuration
- Add PKCE flow support
- Handle auth state properly

**Pros**: Minimal changes, quick fix
**Cons**: Backend-based auth bukan best practice untuk Supabase

---

### Option 2: Move Auth to Frontend (Recommended)
**Approach**: Frontend call Supabase Auth directly, backend hanya verify token

**Changes**:
- Update `src/lib/supabase.ts` - add auth configuration
- Update `src/hooks/useAuth.ts` - call supabase.auth.signInWithPassword directly
- Update `api/auth-login.js` - change to token verification only
- Add proper session management

**Pros**: 
- Best practice untuk Supabase Auth
- Better security (PKCE flow handled by Supabase SDK)
- Session persistence works properly

**Cons**: More changes required

---

## Recommended Implementation: Option 2

### Task 1: Update Supabase Client Configuration

**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
) as string;

const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key not configured. Check .env file.');
}

/**
 * Public Supabase client with auth configuration
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for SPA
    flowType: 'pkce', // Enable PKCE flow
    storage: window.localStorage, // Use localStorage for session
    storageKey: 'sb-auth-token',
  },
});
```

---

### Task 2: Update useAuth Hook

**File**: `src/hooks/useAuth.ts`

**Change**: Call Supabase Auth directly from frontend

```typescript
// OLD (backend-based):
const res = await fetch('/api/auth-login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// NEW (frontend-based):
import { supabase } from '../lib/supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  return { ok: false, error: error.message };
}

// Then verify with backend
const res = await fetch('/api/auth-me', {
  method: 'GET',
  credentials: 'include',
});
```

---

### Task 3: Update Backend Auth Endpoint

**File**: `api/auth-login.js`

**Change**: Remove signInWithPassword, only verify existing session

```javascript
// Remove: signInWithPassword logic
// Keep: Token verification and user lookup
// Add: Session validation from frontend auth
```

---

### Task 4: Add Session Sync

**New File**: `src/hooks/useSupabaseAuth.ts`

```typescript
// Listen to Supabase auth state changes
// Sync with backend when session changes
// Handle token refresh automatically
```

---

## Quick Fix (Temporary)

If you need immediate fix without refactoring:

**File**: `api/_lib/auth.js`

```javascript
export function getAnonSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key belum dikonfigurasi');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}
```

**Note**: This is NOT recommended for production. Proper fix is Option 2.

---

## Testing Checklist

- [ ] Email login works without CSRF error
- [ ] Session persists after page refresh
- [ ] Token refresh works automatically
- [ ] Logout clears session properly
- [ ] Legacy password login still works
- [ ] No console errors related to auth

---

## Estimated Time

- **Quick Fix (Option 1)**: 30 minutes
- **Proper Fix (Option 2)**: 2-3 hours

---

## Priority

🔥 **HIGH** - Blocks superadmin login functionality
