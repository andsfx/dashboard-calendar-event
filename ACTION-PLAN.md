# 🎯 ACTION PLAN - Schedule-Event-v2 Improvements
## Based on Comprehensive Audit Findings

**Created**: 2026-04-25 23:58:12
**Priority**: Critical → High → Medium
**Timeline**: 3 months

---

## PHASE 1: CRITICAL FIXES (Week 1-2)

### Task 1.1: Secure Exposed Secrets ⚠️ URGENT
**Priority**: CRITICAL
**Time**: 1 hour
**Risk**: High - Database breach if leaked

**Actions**:
- [ ] Check if .env is in .gitignore
- [ ] Remove .env from git history (if committed)
- [ ] Rotate all exposed keys:
  - [ ] Supabase service role key
  - [ ] R2 access keys
  - [ ] Admin password (change from admin123)
- [ ] Update .env.example with placeholder values
- [ ] Document secret rotation in README

**Commands**:
\\\ash
# Check git history
git log --all --full-history -- .env

# If found, remove from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (DANGEROUS - coordinate with team)
git push origin --force --all
\\\

---

### Task 1.2: Optimize Supabase RLS Performance
**Priority**: CRITICAL
**Time**: 1 day
**Impact**: 170x faster queries

**Actions**:
- [ ] Add indexes on RLS policy columns
- [ ] Optimize auth.uid() calls with subqueries
- [ ] Add TO authenticated/anon to all policies
- [ ] Add WITH CHECK clauses to INSERT policies
- [ ] Test query performance before/after

**SQL Script** (create: migrate/optimize-rls.sql):
\\\sql
-- Add indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_events_user_id ON draft_events(user_id);
CREATE INDEX IF NOT EXISTS idx_community_registrations_user_id ON community_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_album_id ON event_photos(album_id);

-- Optimize existing policies
DROP POLICY IF EXISTS "public_read_events" ON events;
CREATE POLICY "public_read_events" ON events
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_insert_draft" ON draft_events;
CREATE POLICY "authenticated_insert_draft" ON draft_events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Add missing WITH CHECK clauses
ALTER POLICY "community_insert" ON community_registrations
  WITH CHECK (true); -- Public can submit

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM events WHERE user_id = auth.uid();
\\\

---

### Task 1.3: Implement Vercel Caching
**Priority**: CRITICAL
**Time**: 2 days
**Impact**: 75% faster page loads

**Actions**:
- [ ] Add ISR with revalidate exports
- [ ] Configure Cache-Control headers
- [ ] Implement static generation for public pages
- [ ] Test caching with Vercel CLI
- [ ] Monitor cache hit rates

**Files to Modify**:

1. **src/components/PublicLandingPage.tsx**:
\\\	ypescript
// Add at top of file
export const revalidate = 60; // Revalidate every 60 seconds
\\\

2. **vite.config.ts** - Add caching headers:
\\\	ypescript
export default defineConfig({
  // ... existing config
  server: {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
    }
  }
})
\\\

3. **vercel.json** - Add caching configuration:
\\\json
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
\\\

---

### Task 1.4: Enable Critical TypeScript Flags
**Priority**: CRITICAL
**Time**: 2 hours
**Impact**: Prevent 40% of runtime errors

**Actions**:
- [ ] Add noUncheckedIndexedAccess to tsconfig.json
- [ ] Fix resulting type errors
- [ ] Run type check: npm run build
- [ ] Commit changes

**tsconfig.json modifications**:
\\\json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,  // ADD THIS
    "noImplicitReturns": true,         // ADD THIS
    // ... rest of config
  }
}
\\\

---

## PHASE 2: HIGH PRIORITY (Week 3-4)

### Task 2.1: Split Large Files
**Priority**: HIGH
**Time**: 1 week
**Files**: CommunityLandingPage.tsx (1,103 lines), App.tsx (974 lines)

**Strategy**:
1. Extract sections into separate components
2. Create component directory structure
3. Move shared logic to custom hooks
4. Update imports

**CommunityLandingPage.tsx breakdown**:
- [ ] Extract HeroSection component
- [ ] Extract BenefitsSection component
- [ ] Extract FacilitiesSection component
- [ ] Extract StepsSection component
- [ ] Extract RegistrationForm component
- [ ] Extract FAQSection component
- [ ] Extract GallerySection component

**Target**: Each component <300 lines

---

### Task 2.2: Replace Console Statements
**Priority**: HIGH
**Time**: 1 day
**Count**: 42 console statements

**Actions**:
- [ ] Create logging utility (src/utils/logger.ts)
- [ ] Replace console.error with logger.error
- [ ] Replace console.log with logger.info
- [ ] Replace console.warn with logger.warn
- [ ] Add environment-based logging levels

**logger.ts implementation**:
\\\	ypescript
const isDev = import.meta.env.DEV;

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDev) console.error(message, error);
    // TODO: Send to Sentry in production
  },
  warn: (message: string) => {
    if (isDev) console.warn(message);
  },
  info: (message: string) => {
    if (isDev) console.log(message);
  }
};
\\\

---

### Task 2.3: Fix Type Safety Issues
**Priority**: HIGH
**Time**: 1 day
**Count**: 5 \ny\ types, 2 type assertions

**Actions**:
- [ ] Find all \ny\ types: grep -r "any" src/
- [ ] Replace with proper types
- [ ] Remove type assertions (as any)
- [ ] Run type check

**Files to fix**:
- src/components/CommunityLandingPage.tsx:409-410
- src/utils/supabaseApi.ts:644
- src/components/DashboardViewsSection.tsx:17
- src/components/InstagramSettingsModal.tsx:51

---

### Task 2.4: Add React.memo to Expensive Components
**Priority**: HIGH
**Time**: 2 days

**Components to memoize**:
- [ ] EventTable
- [ ] CalendarView
- [ ] KanbanView
- [ ] TimelineView
- [ ] EventCard
- [ ] DraftCard

**Pattern**:
\\\	ypescript
import { memo } from 'react';

export const EventTable = memo(function EventTable({ events, onDetail }) {
  // ... component code
});
\\\

---

## PHASE 3: MODERNIZATION (Month 2)

### Task 3.1: Upgrade to React 19
**Priority**: MEDIUM
**Time**: 1 week

**Actions**:
- [ ] Update package.json dependencies
- [ ] Run npm install
- [ ] Test all components
- [ ] Fix breaking changes
- [ ] Update to new hooks

**Dependencies to update**:
\\\json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
\\\

---

### Task 3.2: Implement useActionState for Forms
**Priority**: MEDIUM
**Time**: 3 days

**Forms to refactor**:
- [ ] EventCrudModal
- [ ] DraftCrudModal
- [ ] CommunityRegistrationForm
- [ ] AdminLoginModal

**Pattern**:
\\\	ypescript
import { useActionState } from 'react';

function EventForm() {
  const [state, action, isPending] = useActionState(createEvent, null);
  
  return (
    <form action={action}>
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
\\\

---

### Task 3.3: Add Optimistic Updates
**Priority**: MEDIUM
**Time**: 2 days

**Actions to optimize**:
- [ ] Event creation
- [ ] Event deletion
- [ ] Draft approval
- [ ] Like/favorite actions

**Pattern**:
\\\	ypescript
import { useOptimistic } from 'react';

function EventList({ events }) {
  const [optimisticEvents, addOptimisticEvent] = useOptimistic(events);
  
  const handleCreate = async (newEvent) => {
    addOptimisticEvent({ ...newEvent, status: 'pending' });
    await createEvent(newEvent);
  };
  
  return <>{/* render optimisticEvents */}</>;
}
\\\

---

## PHASE 4: TESTING & OPTIMIZATION (Month 3)

### Task 4.1: Add Component Tests
**Priority**: MEDIUM
**Time**: 2 weeks
**Target**: 70% coverage

**Setup**:
- [ ] Install Vitest + React Testing Library
- [ ] Configure test environment
- [ ] Create test utilities
- [ ] Write tests for critical components

**Priority components to test**:
1. EventCrudModal
2. CalendarView
3. EventTable
4. useEvents hook
5. supabaseApi utilities

---

### Task 4.2: Performance Optimization
**Priority**: MEDIUM
**Time**: 1 week

**Actions**:
- [ ] Run React DevTools Profiler
- [ ] Identify slow components
- [ ] Optimize re-renders
- [ ] Reduce bundle size
- [ ] Lazy load heavy components

---

### Task 4.3: Add E2E Tests
**Priority**: LOW
**Time**: 1 week

**Critical flows to test**:
- [ ] Public landing page load
- [ ] Event creation flow
- [ ] Draft approval flow
- [ ] Community registration
- [ ] Gallery photo upload

---

## TRACKING & METRICS

### Success Metrics

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Page Load (TTFB) | 800ms | 200ms | - |
| RLS Query Time | 50ms | 0.3ms | - |
| Type Safety | 60% | 95% | - |
| Test Coverage | <5% | 70% | - |
| Bundle Size | 180KB | 130KB | - |

### Progress Tracking

**Phase 1**: ⬜⬜⬜⬜ 0/4 tasks
**Phase 2**: ⬜⬜⬜⬜ 0/4 tasks
**Phase 3**: ⬜⬜⬜ 0/3 tasks
**Phase 4**: ⬜⬜⬜ 0/3 tasks

**Overall**: 0/14 tasks (0%)

---

## NEXT STEPS

1. Review this action plan with team
2. Prioritize based on business needs
3. Assign tasks to developers
4. Set up tracking board (GitHub Projects/Jira)
5. Begin Phase 1 implementation

**Estimated Total Time**: 3 months (1 developer full-time)
**Estimated Cost Savings**: \-1000/month (CDN caching + performance)
**Risk Reduction**: High (security + type safety)

---

**Action Plan Ready** ✅

Next: Start with Task 1.1 (Secure Exposed Secrets) - 1 hour fix with high impact.
