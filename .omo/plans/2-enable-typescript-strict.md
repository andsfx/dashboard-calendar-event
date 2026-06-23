# Work Plan: Enable TypeScript Strict Mode (noUncheckedIndexedAccess)

## TL;DR
Enable noUncheckedIndexedAccess in tsconfig.json and fix 55 resulting type errors to improve type safety for array and object access.

## Context
The audit identified that noUncheckedIndexedAccess is disabled, allowing unsafe array/object access that could cause runtime errors. Enabling this flag will catch potential undefined access at compile time, requiring explicit null checks.

## Work Objectives
1. Generate complete error list from TypeScript compiler
2. Fix all array and object access errors with proper type guards
3. Enable noUncheckedIndexedAccess flag in tsconfig.json
4. Verify build passes with no type errors

## Verification Strategy
- tsc --noEmit reports 0 errors after fixes
- No any types introduced
- No logic changes, only type safety improvements
- All existing functionality preserved

## Execution Strategy
Task 1 (quick) → Task 2 (deep) → Task 3 (quick) → Task 4 (quick)

## TODOs

### Task 1: Generate Full Error List
**What to do:**
- Temporarily enable noUncheckedIndexedAccess in tsconfig.json
- Run tsc --noEmit to get complete error list
- Save error output to .sisyphus/typescript-errors.txt
- Revert tsconfig.json change
- Analyze error patterns (array access, object property access, etc.)

**Must NOT do:**
- Do not leave flag enabled yet
- Do not skip error documentation
- Do not proceed without full error list

**Agent Profile:** quick

**Parallelization:** Sequential (Task 1 of 4)

**References:**
- tsconfig.json
- https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess

**Acceptance Criteria:**
- Error list saved to file
- All 55 errors documented
- Error patterns identified
- tsconfig.json reverted

**QA Scenarios:**
```bash
# Generate errors
npx tsc --noEmit 2>&1 | tee .sisyphus/typescript-errors.txt
# Count errors
grep -c "error TS" .sisyphus/typescript-errors.txt
# Should show ~55 errors
```

**Evidence Paths:**
- .sisyphus/typescript-errors.txt

---

### Task 2: Fix Array and Object Access Errors
**What to do:**
- Fix each error with appropriate type safety pattern:
  - Add optional chaining: `array[0]?.property`
  - Add null checks: `if (array[0]) { ... }`
  - Add type guards: `if (obj.key !== undefined) { ... }`
  - Use nullish coalescing: `array[0] ?? defaultValue`
- Prioritize readability and maintainability
- Group related fixes by file
- Test each fix doesn't break functionality

**Must NOT do:**
- Do not use `any` type to bypass errors
- Do not use `as` type assertions without justification
- Do not change business logic
- Do not use `!` non-null assertion operator
- Do not skip error handling

**Agent Profile:** deep

**Parallelization:** Sequential (Task 2 of 4)

**References:**
- .sisyphus/typescript-errors.txt
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- All files with errors (identified in Task 1)

**Acceptance Criteria:**
- All 55 errors addressed
- No any types introduced
- No non-null assertions used
- Code remains readable
- Logic unchanged

**QA Scenarios:**
```bash
# After each file fix, verify no new errors
npx tsc --noEmit
# Run dev server to check runtime behavior
npm run dev
# Check specific fixed files
npx tsc --noEmit | grep "src/path/to/fixed-file.tsx"
```

**Evidence Paths:**
- All modified source files
- Git diff showing changes

---

### Task 3: Enable noUncheckedIndexedAccess Flag
**What to do:**
- Open tsconfig.json
- Locate compilerOptions section
- Add or uncomment noUncheckedIndexedAccess: true at line 11
- Ensure proper JSON formatting
- Save file

**Must NOT do:**
- Do not modify other compiler options
- Do not break JSON syntax
- Do not enable before fixes complete

**Agent Profile:** quick

**Parallelization:** Sequential (Task 3 of 4)

**References:**
- tsconfig.json
- https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess

**Acceptance Criteria:**
- Flag set to true in tsconfig.json
- JSON syntax valid
- File properly formatted

**QA Scenarios:**
```bash
# Verify JSON syntax
npx tsc --showConfig | grep noUncheckedIndexedAccess
# Should output: "noUncheckedIndexedAccess": true
```

**Evidence Paths:**
- tsconfig.json (line 11)

---

### Task 4: Verify Build Passes
**What to do:**
- Run tsc --noEmit to verify 0 errors
- Run npm run build to verify production build
- Run npm run dev to verify dev server starts
- Check that all pages load without errors
- Confirm no console errors in browser

**Must NOT do:**
- Do not commit if errors remain
- Do not skip runtime verification
- Do not ignore warnings

**Agent Profile:** quick

**Parallelization:** Sequential (Task 4 of 4)

**References:**
- All previous task outputs
- package.json scripts

**Acceptance Criteria:**
- tsc --noEmit shows 0 errors
- Build completes successfully
- Dev server starts without errors
- Application functions correctly

**QA Scenarios:**
```bash
# Type check
npx tsc --noEmit
echo $? # Should be 0

# Build check
npm run build
echo $? # Should be 0

# Dev server check (manual verification required)
npm run dev
# Visit http://localhost:5173 and test key features
```

**Evidence Paths:**
- Terminal output showing successful build
- Browser console (no errors)

---

## Success Criteria
- [ ] All 55 type errors documented
- [ ] All errors fixed with proper type guards
- [ ] No any types or non-null assertions used
- [ ] noUncheckedIndexedAccess enabled in tsconfig.json
- [ ] tsc --noEmit reports 0 errors
- [ ] Production build succeeds
- [ ] Application runs without runtime errors

**Final Commit Message:**
```
fix: enable noUncheckedIndexedAccess and resolve 55 type errors

- Enable noUncheckedIndexedAccess in tsconfig.json for safer array/object access
- Add optional chaining and null checks throughout codebase
- Implement type guards for indexed access patterns
- Verify all type errors resolved without using any or non-null assertions
```
