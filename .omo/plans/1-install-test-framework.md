# Work Plan: Install Test Framework

## TL;DR
Install Vitest and React Testing Library to enable unit and component testing for the schedule-event-v2 project.

## Context
The project currently lacks a testing framework. This work plan establishes Vitest as the test runner with React Testing Library for component testing, providing a foundation for test-driven development and regression prevention.

## Work Objectives
1. Install testing dependencies (Vitest, React Testing Library, jsdom)
2. Configure Vitest with proper environment and path aliases
3. Add test scripts to package.json
4. Create sample test to verify setup
5. Document testing setup in README

## Verification Strategy
- All dependencies install without conflicts
- Vitest config matches tsconfig path aliases
- Sample test passes successfully
- Test UI and coverage commands work
- README documents how to run tests

## Execution Strategy
Sequential execution required - each task depends on previous completion.

## TODOs

### Task 1: Install Testing Dependencies
**What to do:**
- Install vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, @vitest/ui as devDependencies
- Use npm install with --save-dev flag
- Verify package.json updated with correct versions

**Must NOT do:**
- Do not install incompatible versions
- Do not skip any dependencies
- Do not install as production dependencies

**Agent Profile:** quick

**Parallelization:** Sequential (Task 1 of 5)

**References:**
- https://vitest.dev/guide/
- https://testing-library.com/docs/react-testing-library/intro/
- package.json

**Acceptance Criteria:**
- All 6 packages appear in package.json devDependencies
- npm install completes without errors
- node_modules contains installed packages

**QA Scenarios:**
```bash
# Verify installations
npm list vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
```

**Evidence Paths:**
- package.json (devDependencies section)
- package-lock.json

---

### Task 2: Create Vitest Configuration
**What to do:**
- Create vitest.config.ts in project root
- Configure jsdom environment for React component testing
- Map path aliases from tsconfig.json (@ -> ./src)
- Set up globals for testing-library matchers
- Configure test file patterns

**Must NOT do:**
- Do not use different path aliases than tsconfig.json
- Do not skip environment configuration
- Do not use node environment (needs jsdom for DOM APIs)

**Agent Profile:** quick

**Parallelization:** Sequential (Task 2 of 5)

**References:**
- https://vitest.dev/config/
- tsconfig.json (paths configuration)
- https://github.com/vitest-dev/vitest/blob/main/examples/react-testing-lib/vitest.config.ts

**Acceptance Criteria:**
- vitest.config.ts exists in root
- Environment set to jsdom
- Path aliases match tsconfig.json exactly
- Config includes test.globals: true

**QA Scenarios:**
```bash
# Verify config syntax
npx tsc --noEmit vitest.config.ts
# Check path resolution
npx vitest --run --reporter=verbose
```

**Evidence Paths:**
- vitest.config.ts

---

### Task 3: Add Test Scripts to package.json
**What to do:**
- Add "test": "vitest" script for watch mode
- Add "test:ui": "vitest --ui" for visual test UI
- Add "test:coverage": "vitest --coverage" for coverage reports
- Ensure scripts section properly formatted

**Must NOT do:**
- Do not overwrite existing scripts
- Do not use conflicting script names
- Do not add unnecessary flags

**Agent Profile:** quick

**Parallelization:** Sequential (Task 3 of 5)

**References:**
- https://vitest.dev/guide/cli.html
- package.json

**Acceptance Criteria:**
- Three new test scripts added
- Scripts use correct vitest commands
- No syntax errors in package.json

**QA Scenarios:**
```bash
# Verify scripts exist
npm run test -- --version
npm run test:ui -- --version
npm run test:coverage -- --version
```

**Evidence Paths:**
- package.json (scripts section)

---

### Task 4: Create Sample Test
**What to do:**
- Create directory src/components/__tests__/
- Create StatCard.test.tsx testing StatCard component
- Import necessary testing utilities
- Write 2-3 basic tests (render, props display, styling)
- Use React Testing Library best practices (query by role/text)

**Must NOT do:**
- Do not test implementation details
- Do not use snapshot testing yet
- Do not skip accessibility queries

**Agent Profile:** quick

**Parallelization:** Sequential (Task 4 of 5)

**References:**
- https://testing-library.com/docs/react-testing-library/example-intro
- src/components/StatCard.tsx
- https://testing-library.com/docs/queries/about#priority

**Acceptance Criteria:**
- Test file created at correct path
- Tests import from @testing-library/react
- At least 2 tests written
- Tests follow RTL best practices

**QA Scenarios:**
```bash
# Run the sample test
npm run test -- StatCard.test.tsx
# Verify test passes
echo $? # Should output 0
```

**Evidence Paths:**
- src/components/__tests__/StatCard.test.tsx

---

### Task 5: Verify Setup and Update README
**What to do:**
- Run all test scripts to verify functionality
- Update README.md with Testing section
- Document how to run tests, UI, and coverage
- Add example test command
- Verify all tests pass

**Must NOT do:**
- Do not skip verification steps
- Do not add incomplete documentation
- Do not commit if tests fail

**Agent Profile:** quick

**Parallelization:** Sequential (Task 5 of 5)

**References:**
- README.md
- All previous task outputs

**Acceptance Criteria:**
- All test commands execute successfully
- README includes Testing section
- Documentation clear and accurate
- Sample test passes

**QA Scenarios:**
```bash
# Run all verification commands
npm run test -- --run
npm run test:ui -- --run
npm run test:coverage -- --run
# Check README updated
grep -A 10 "Testing" README.md
```

**Evidence Paths:**
- README.md (Testing section)
- Terminal output showing passing tests

---

## Success Criteria
- [ ] All 6 testing dependencies installed
- [ ] vitest.config.ts created with correct configuration
- [ ] 3 test scripts added to package.json
- [ ] Sample StatCard test created and passing
- [ ] README.md documents testing setup
- [ ] All test commands execute without errors

**Final Commit Message:**
```
test: install vitest and testing library

- Add vitest, @testing-library/react, and related dependencies
- Configure vitest with jsdom environment and path aliases
- Add test, test:ui, and test:coverage scripts
- Create sample StatCard component test
- Document testing setup in README
```
