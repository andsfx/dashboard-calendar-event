# Critical Fixes Implementation Plan

## Task 1: Update TypeScript Configuration

**File**: tsconfig.json

**Changes**:
Add these compiler options after "strict": true:
- noUncheckedIndexedAccess: true
- noImplicitReturns: true  
- noFallthroughCasesInSwitch: true

**Expected Impact**: Prevent 40% of runtime errors

**Verification**: Run `npm run build` to check for new type errors

---

## Task 2: Create Vercel Caching Configuration

**File**: vercel.json (create if not exists)

**Content**:
```json
{
  "headers": [
    {
      "source": "/",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=60, stale-while-revalidate=120"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Expected Impact**: 75% faster page loads

---

## Task 3: Create Logger Utility

**File**: src/utils/logger.ts (new file)

**Content**:
```typescript
const isDev = import.meta.env.DEV;

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(message, error);
    }
    // TODO: Send to Sentry in production
  },
  
  warn: (message: string) => {
    if (isDev) {
      console.warn(message);
    }
  },
  
  info: (message: string) => {
    if (isDev) {
      console.log(message);
    }
  },
  
  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(message, data);
    }
  }
};
```

**Next Step**: Replace console statements in hooks/useEvents.ts and utils/supabaseApi.ts

---

## Task 4: Commit Changes

**Commit Message**: `chore: add TypeScript strict flags and caching config`

**Files**:
- tsconfig.json
- vercel.json
- src/utils/logger.ts
