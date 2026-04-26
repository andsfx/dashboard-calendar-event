# Gallery 404 Investigation - Root Cause Found

## Investigation Date
2026-04-26 20:05 UTC

## Target URL
https://metmal-community-hub.vercel.app/gallery

## Critical Finding

**The `/gallery` route itself returns 404 - not just the album page.**

### Evidence

1. **HTTP Status Check**
   - URL: `https://metmal-community-hub.vercel.app/gallery`
   - Status: `404 NOT_FOUND`
   - Error ID: `sin1::wmwnt-1777205148565-f9796d1a47a1`

2. **Playwright Investigation**
   - Console error: "Failed to load resource: the server responded with a status of 404 ()"
   - Page title: "404: NOT_FOUND"
   - No React app loaded
   - No Supabase requests made (app never initialized)
   - Zero albums rendered

3. **Code Verification**
   - Route defined in `src/App.tsx:625-628`: ✅ EXISTS
   - Component `GalleryIndexPage.tsx`: ✅ EXISTS
   - React Router pattern: ✅ CORRECT

## Root Cause

**Missing SPA rewrites in `vercel.json`**

The current `vercel.json` only contains cache headers but NO rewrites configuration. For a Single Page Application (SPA) using client-side routing (React Router), Vercel needs to be told to serve `index.html` for all routes.

### Current vercel.json
```json
{
  "headers": [
    { "source": "/", "headers": [...] },
    { "source": "/gallery", "headers": [...] },
    { "source": "/assets/(.*)", "headers": [...] },
    { "source": "/dist/(.*)", "headers": [...] }
  ]
}
```

### What's Missing
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Why This Happens

1. User navigates to `/gallery`
2. Vercel looks for a static file at `/gallery`
3. No static file exists (it's a client-side route)
4. No rewrite rule to fallback to `index.html`
5. Vercel returns 404

## Impact

- **ALL client-side routes are broken** (not just `/gallery`)
- Only the root `/` works (served as static `index.html`)
- Any direct navigation to `/gallery`, `/gallery/:slug`, `/dashboard`, etc. will 404
- Links work ONLY if you start from `/` and click through (client-side navigation)

## Solution

Add rewrites to `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    // ... existing headers
  ]
}
```

## Verification Steps

After deploying the fix:

1. Direct navigation to `/gallery` should return HTTP 200
2. Page should load React app and show gallery index
3. Supabase requests should fire
4. Albums should be fetched and displayed
5. Album page `/gallery/:slug` should also work

## Related Files

- `vercel.json` - Needs rewrite configuration
- `src/App.tsx` - Routes are correctly defined
- `src/components/GalleryIndexPage.tsx` - Component exists and is correct
- `src/components/GalleryAlbumPage.tsx` - Component exists and is correct

## Evidence Files

- `.sisyphus/evidence/gallery-investigation.json` - Full Playwright capture
- `.sisyphus/evidence/gallery-investigation.png` - Screenshot of 404 page
- `.sisyphus/evidence/gallery-investigation-summary.md` - This document
