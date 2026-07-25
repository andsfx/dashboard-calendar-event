# SPEC — Repo hygiene & letter cutover

Source: grill 2026-07-25 + [CONTEXT.md](../CONTEXT.md) § Repo hygiene + [ADR 004](adr/004-letter-supabase-kill-gas.md).  
Complements [SPEC.md](SPEC.md) (domain product). This file = tree, tooling, leftover policy, letter backend.

---

## 1. Goals

1. Working tree production-relevant files only; agent/tool noise ignored.
2. `improve/` = sandbox, never auth/API source of truth.
3. Letter product = Supabase `GeneratedLetter` only; no runtime Apps Script letter.
4. Event `status` column stays as derived cache (ADR 002); no DB drop in this phase.

## 2. Non-goals

- Full monorepo / pnpm workspace adoption
- Deleting entire `google-apps-script.js` history
- Mass DB migration of historical `status` values
- Shipping untracked `eventsSchedulePdf*` inside hygiene commit (own feature PR)

---

## 3. Leftover dirty policy

| Bucket | Action |
|--------|--------|
| `ACTION-PLAN.md`, `docs/AUDIT-PLAYBOOK.md` | Commit if content is intentional audit progress |
| `package-lock.json` (align `package.json`) | Commit with hygiene |
| Dirty `improve/*` noise (e.g. login stub) | **Discard** (`git restore`) unless deliberate prototype fix |
| Untracked `eventsSchedulePdf*`, `EventsScheduleDocument.tsx` | **Separate PR** — not hygiene |
| `.claude/`, `.od-skills/`, `pnpm-workspace.yaml` | **Never commit** — gitignore |
| Secrets / `.env` | Never commit (already ignored) |

### Acceptance

- [ ] After hygiene PR: no agent tool dirs staged
- [ ] `improve/` either clean vs origin or only deliberate prototype commits
- [ ] PDF schedule files not smuggled into hygiene commit

---

## 4. Gitignore (tool noise)

**Must ignore (local agent / generated):**

```
.claude/
.od-skills/
pnpm-workspace.yaml
```

Already ignored (keep): `graphify-out/`, `.opencode/`, `.sisyphus/`, `.omo/`, etc.

**Do not ignore by default:** `improve/` (sandbox stays in remote as lab), `.agents/` if team-shared.

### Acceptance

- [ ] `git status` does not list `.claude/` / `.od-skills/` / root `pnpm-workspace.yaml` as untracked noise after ignore
- [ ] `graphify-out/` still ignored

---

## 5. improve/ sandbox

| Rule | |
|------|--|
| Role | Prototype / UI lab only |
| Production | Root `src/` + `api/` only |
| Auth | No hardcoded passwords; no dual login with production |
| Merge | Explicit PR + architecture check against root |

### Acceptance

- [ ] No production route imports from `improve/`
- [ ] Dirty login stub discarded or fixed to non-secret stub

---

## 6. Letter path (ADR 004)

### Current → target

| Path | Current | Target |
|------|---------|--------|
| `createLetterRequest` → apps-script | Live legacy | **Removed or fail-closed** |
| `GeneratedLetter` Supabase | Exists | **Only product path** |
| Event/Draft publish | supabase-admin | Unchanged |
| apps-script migration/bootstrap | Optional ops | Allowed until separate deprecate ticket |

### Rules

1. UI letter generator must not call `createLetterRequest` for product flow.
2. If function remains temporarily: throw / 410 with message legacy disabled.
3. No dual-write GAS + Supabase letter.
4. Env `APPS_SCRIPT_URL` not required for letter product after cutover.

### Acceptance

- [ ] Grep client: no production call to `createLetterRequest` (or only dead code + test asserting disabled)
- [ ] Create/list letter uses Supabase `GeneratedLetter` APIs
- [ ] Publish Draft still only supabase-admin
- [ ] Unit or smoke: letter create does not hit `/api/apps-script-admin`

---

## 7. Event status column

- Keep DB column `status` as **cache**.
- Always derive on read (`dbEventToEventItem` / `recalculateStatuses`) and write (`withDerivedStatusCache` / form `getStatus`).
- Do **not** drop column in hygiene tickets.
- Optional later: recompute job (out of scope here).

### Acceptance

- [ ] No migration that drops `events.status`
- [ ] Docs state cache-only (CONTEXT already)

---

## 8. Ticket slice

| ID | P | Title |
|----|---|-------|
| H-001 | P0 | gitignore tool noise + leftover dirty policy execute |
| H-002 | P0 | Kill GAS letter path; GeneratedLetter only |
| H-003 | P2 | Deprecate/document remaining apps-script migration proxy |
| H-004 | P3 | (Optional) eventsSchedulePdf feature PR — not hygiene |

---

## 9. References

- [CONTEXT.md](../CONTEXT.md) — Repo hygiene glossary
- [ADR 004](adr/004-letter-supabase-kill-gas.md)
- [ADR 002](adr/002-event-status-from-dates.md)
- Domain product: [SPEC.md](SPEC.md)
