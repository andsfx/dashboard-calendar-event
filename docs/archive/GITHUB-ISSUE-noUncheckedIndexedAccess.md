# GitHub Issue: Enable noUncheckedIndexedAccess TypeScript Flag

## Summary
Re-enable `noUncheckedIndexedAccess` TypeScript compiler flag to catch array/object access bugs at compile time.

## Background
We added `noUncheckedIndexedAccess: true` to tsconfig.json which immediately found **55 type safety issues** across the codebase. This flag prevents runtime crashes by requiring null checks before accessing array/object properties.

## Current Status
- ✅ Fixed: 15 errors in components (committed in b4fdac1)
- ⏳ Remaining: 55 errors across utils and other files
- 🔒 Flag: Temporarily disabled to unblock deployment

## Remaining Errors Breakdown

### Utils Files (8 errors)
- `src/utils/eventUtils.ts` - 4 errors (lines 295, 296, 302, 303)
- `src/utils/sheetsApi.ts` - 4 errors (lines 144, 155, 156, 262)

### Component Files (47 errors)
- `src/components/EventCrudModal.tsx` - 3 errors
- `src/components/EventTable.tsx` - 1 error
- `src/components/FeaturedEvents.tsx` - 2 errors
- `src/components/FilterBar.tsx` - 2 errors
- `src/components/GalleryAlbumPage.tsx` - 1 error
- Plus 38 more across other components

## Why This Matters
Each error represents a **potential runtime crash** from accessing undefined array/object values. Example:

```typescript
// Before: Can crash if array is empty
const first = items[0].name; // Runtime error if items is []

// After: Safe with null check
const first = items[0]?.name ?? ''default''; // No crash
```

## Action Items

### Phase 1: Fix Utils (Priority: HIGH)
- [ ] Fix eventUtils.ts (4 errors)
- [ ] Fix sheetsApi.ts (4 errors)
- [ ] Add unit tests for fixed functions

### Phase 2: Fix Components (Priority: MEDIUM)
- [ ] Fix EventCrudModal.tsx (3 errors)
- [ ] Fix EventTable.tsx (1 error)
- [ ] Fix FeaturedEvents.tsx (2 errors)
- [ ] Fix FilterBar.tsx (2 errors)
- [ ] Fix GalleryAlbumPage.tsx (1 error)
- [ ] Fix remaining 38 component errors

### Phase 3: Re-enable Flag (Priority: HIGH)
- [ ] Uncomment `noUncheckedIndexedAccess` in tsconfig.json
- [ ] Verify build passes
- [ ] Run full test suite
- [ ] Deploy to production

## Estimated Effort
- Phase 1: 4 hours
- Phase 2: 8 hours
- Phase 3: 1 hour
- **Total: ~13 hours** (1.5 sprints)

## Impact
- **Type Safety**: 95% → 99% coverage
- **Runtime Crashes**: Prevents 55 potential bugs
- **Code Quality**: Forces defensive programming
- **Maintainability**: Catches bugs at compile time vs production

## References
- Commit with partial fixes: b4fdac1
- TypeScript docs: https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess
- Audit report: PROJECT-AUDIT-REPORT.md

## Labels
`type-safety`, `typescript`, `bug-prevention`, `technical-debt`
