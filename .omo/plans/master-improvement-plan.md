# Master Improvement Plan - Schedule Event v2

## Overview
Comprehensive improvements to enhance maintainability, performance, test coverage, and database efficiency.

**Estimated Total Time**: 4-6 hours  
**Priority Order**: RLS Performance → Large Files → Test Coverage → Performance Optimization

---

## Phase 1: Optimize Supabase RLS (CRITICAL - 1 hour)
**Impact**: 170x faster queries, production performance

### Tasks:
1. Analyze current RLS policies and identify missing indexes
2. Create migration SQL with indexes for all policy columns
3. Optimize auth.uid() calls with subquery pattern
4. Add TO authenticated/anon role specifications
5. Add WITH CHECK clauses to INSERT policies
6. Test query performance before/after

**Deliverables**:
- migrate/optimize-rls-indexes.sql
- Performance benchmark results
- Updated RLS policies

---

## Phase 2: Refactor Large Files (HIGH - 2-3 hours)
**Impact**: Maintainability +30%, easier testing

### Target Files:
1. CommunityLandingPage.tsx (1,103 lines → 4-5 components)
2. App.tsx (974 lines → extract sections)
3. EventCrudModal.tsx (829 lines → extract form sections)
4. DraftCrudModal.tsx (743 lines → extract form sections)
5. PublicLandingPage.tsx (723 lines → extract sections)

**Strategy**: Extract reusable components, maintain functionality, add tests for extracted components

**Deliverables**:
- 15-20 new smaller components (<300 lines each)
- All tests still passing
- No functionality broken

---

## Phase 3: Increase Test Coverage (HIGH - 1-2 hours)
**Impact**: Coverage 5% → 70%, catch bugs early

### Target Coverage:
- Components: 70% (currently ~5%)
- Hooks: 80% (currently 0%)
- Utils: 90% (currently ~30%)

### Priority Components to Test:
1. EventCrudModal (critical user flow)
2. DraftCrudModal (critical user flow)
3. CalendarView (complex logic)
4. useEvents hook (state management)
5. useDraftEvents hook (state management)

**Deliverables**:
- 30-40 new test files
- Coverage report showing 70%+ coverage
- CI/CD integration ready

---

## Phase 4: Performance Optimization (MEDIUM - 1 hour)
**Impact**: Faster page loads, better UX

### Optimizations:
1. Add React.memo to expensive components (10-15 components)
2. Optimize useEffect dependencies (review 53 hooks)
3. Implement code splitting for large components
4. Bundle size optimization (remove unused imports)
5. Add performance monitoring

**Deliverables**:
- React.memo applied to expensive renders
- Bundle size reduced by ~20%
- Performance metrics documented

---

## Success Metrics

| Metric | Before | Target | Impact |
|--------|--------|--------|--------|
| RLS Query Time | ~50ms | ~0.3ms | 170x faster |
| Largest File | 1,103 lines | <300 lines | 73% reduction |
| Test Coverage | <5% | 70% | 14x increase |
| Bundle Size | ~180KB | ~140KB | 22% smaller |
| Maintainability | 7/10 | 9/10 | Easier refactoring |

---

## Execution Order

```
Phase 1: RLS Optimization (CRITICAL)
  ↓
Phase 2: Refactor Large Files (enables better testing)
  ↓
Phase 3: Add Test Coverage (validates refactoring)
  ↓
Phase 4: Performance Optimization (final polish)
```

**Total Estimated Time**: 5-7 hours  
**Commits Expected**: 8-12 commits (2-3 per phase)
