# H-002 — Kill GAS letter path; GeneratedLetter only

| | |
|--|--|
| **Priority** | P0 |
| **Status** | done |
| **SPEC** | [SPEC-hygiene.md](../SPEC-hygiene.md) §6, [ADR 004](../adr/004-letter-supabase-kill-gas.md) |
| **Depends** | — (can parallel H-001) |

## Goal

Product letter flow only via Supabase `GeneratedLetter`. No runtime `createLetterRequest` → Apps Script.

## Scope

**In**

1. Find all `createLetterRequest` / letter picker flows (`useDashboardHandlers.handleSubmitLetter`, letter modals).
2. Wire UI to Supabase GeneratedLetter create/update only.
3. Remove or fail-closed `createLetterRequest` in `supabaseApi.ts` (and any apps-script allowlist action for letter if unused).
4. Keep Event/Draft on supabase-admin.
5. Tests: letter path does not call apps-script-admin; optional mock GeneratedLetter.

**Out**

- Delete entire `google-apps-script.js`
- Migration bootstrap actions (H-003)
- Redesign PDF letter layout

## Acceptance

- [ ] No product UI depends on GAS for letter
- [ ] `GeneratedLetter` create works without `APPS_SCRIPT_URL`
- [ ] Publish Draft unchanged
- [ ] ADR 004 reflected in code comments / dead path removed

## Touch (perkiraan)

- `src/utils/supabaseApi.ts`
- `src/hooks/useDashboardHandlers.ts`
- Letter generator / modal components
- `api/apps-script-admin.js` (remove `createLetterRequest` from allowlist if killed)

## Verify

```bash
rg -n "createLetterRequest|apps-script-admin" src/
npx tsc --noEmit
npx vitest run --dir src --maxWorkers=2
```
