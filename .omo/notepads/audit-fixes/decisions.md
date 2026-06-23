# Decisions — audit-fixes

## Scope Decisions
- CSP headers deferred (user request)
- GAS removal conditional on T2 pre-check
- Test scope limited to 3 files: supabaseApi, useEvents, community-registration
- Component split: move code only, no logic rewrite

## Task Order
- Wave 1: T1 (deps), T2 (gas check), T3 (mojibake) — parallel
- Wave 2: T4 (headers), T5 (gas remove), T6 (file create)
- Wave 3: T7, T8 (refactor), T9 (tests)
- Wave 4: T10, T11 (remaining tests)
- Final Wave: F1-F4 (verification)
