# F3 - Manual QA Evidence
**Date:** 2026-06-23  
**URL:** https://metmal-community-hub.vercel.app/  
**Tester:** Playwright MCP (Chrome 149, Windows)

---

## 1. Page Load
- **Status:** ✅ PASS
- URL responds 200 OK
- Title: "Event Dashboard - Metropolitan Mall Bekasi"
- `document.readyState`: "complete"
- All images load (logo SVG, hero JPG, gallery JPG) - `naturalWidth > 0`

## 2. Console Errors
- **Status:** ✅ PASS
- 0 errors (level=error)
- 0 warnings (level=warning)

## 3. Network 404s
- **Status:** ✅ PASS
- `performance.getEntriesByType('resource')` - no entries with `responseStatus >= 400`

## 4. Fonts: Self-Hosted vs Google Fonts
- **Status:** ❌ **FAIL**
- **Expected:** Fonts loaded from `/fonts/PlusJakartaSans-*.woff2`
- **Actual:** Fonts loaded from `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:...`

### Detailed Findings:
| Check | Result |
|-------|--------|
| Google Fonts `<link>` in deployed HTML | **Found** (line in `<head>`) |
| `@font-face` in deployed CSS (`index-*.css`) | **Not found** (196KB, no @font-face) |
| `@font-face` in local dist CSS (`dist/assets/index-CT8AvkwF.css`) | **Found** (199KB, has all 5 @font-face) |
| `/fonts/*.woff2` responds on deployment | 200 OK but `text/html` — Vercel SPA fallback, no actual files |
| Source `index.html` has Google Fonts link | **No** (clean, see below) |
| Source `public/fonts/` has woff2 files | **Yes** — all 5 weights present |
| Source `src/styles/fonts.css` has @font-face | **Yes** — correct `/fonts/` URLs |

### Root Cause:
The deployed build at Vercel is an **older version** that still includes Google Fonts `<link>` in `index.html` and does not include the self-hosted @font-face rules from `src/styles/fonts.css`. The local dist/ output is correct (has @font-face, no Google Fonts), but that build has NOT been deployed yet.

### Required Fix:
1. Rebuild locally: `npm run build`
2. Redeploy to Vercel (push to main or `vercel --prod`)
3. After redeploy, re-verify fonts load from `/fonts/` and not Google

---

## VERDICT: REJECT

**Reason:** Fonts sourced from Google Fonts CDN (`fonts.googleapis.com`) instead of self-hosted `/fonts/`. This is a deployment mismatch — the correct self-hosted font build exists in local `dist/` but has not been deployed to Vercel.

**Blocking issue:** Google Fonts privacy/GDPR concern + requirement to serve fonts locally.