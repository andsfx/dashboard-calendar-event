# Learnings - Gallery 404 Fix

## Root Cause Discovery Process

### Investigation Methodology
1. **Evidence-first approach** - Gathered runtime data before making assumptions
2. **Systematic elimination** - Tested each hypothesis with concrete evidence
3. **Direct verification** - Used Supabase REST API to confirm database state

### Key Findings

#### Finding 1: Supabase Default Pagination
**Discovery**: fetchAlbums() query had no explicit `.limit()`, but only 5 albums were returned.

**Root Cause**: Supabase applies default pagination limit when no explicit limit is set.

**Lesson**: Always specify explicit `.limit()` in Supabase queries to avoid unexpected pagination.

#### Finding 2: Console.log Minification
**Discovery**: Debug logs added in Task 1 didn't appear in production bundle.

**Root Cause**: Vite's esbuild minifier strips console.log statements in production builds.

**Lesson**: For production debugging, use:
- Browser DevTools (console.logs still execute, just not in bundle)
- Logging service (Sentry, LogRocket)
- Feature flags to enable debug mode

#### Finding 3: Album Exists But Not Visible
**Discovery**: Album existed in database with correct slug, but wasn't appearing on landing page.

**Root Cause**: Album was created recently but wasn't in the top 5 by `created_at` due to pagination limit.

**Lesson**: When debugging "not found" errors, verify BOTH:
1. Data exists in database
2. Data is returned by the query (check for filters, limits, pagination)

### Effective Techniques

#### Playwright for Evidence Collection
- Captured console logs directly from browser
- Intercepted network requests
- Took screenshots for visual verification
- All automated, no manual testing needed

#### Direct Database Queries
- Used Supabase REST API with anon key
- Verified RLS policies weren't blocking access
- Confirmed exact data structure

#### Slugify Verification
- Tested function with exact input from database
- Compared output character-by-character
- Ruled out slug generation as root cause

### Code Patterns Observed

#### fetchAlbums() Pattern
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);  // ← Always specify limit
```

#### Error Handling Pattern
```typescript
if (error) throw new SupabaseApiError(`Operation failed: ${error.message}`);
```

### Tools Used Successfully
- Playwright: Browser automation and evidence collection
- Supabase REST API: Direct database verification
- Git: Version control and deployment tracking
- Node.js REPL: Quick function testing

### Time Savers
1. **Parallel investigation** - Tasks 4, 5, 6 ran simultaneously
2. **Evidence files** - Saved all findings for later reference
3. **Reusable sessions** - Resumed failed tasks without re-exploration
