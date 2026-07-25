# H-001 — gitignore tool noise + leftover dirty execute

| | |
|--|--|
| **Priority** | P0 |
| **Status** | done |
| **SPEC** | [SPEC-hygiene.md](../SPEC-hygiene.md) §3–5 |
| **Depends** | — |

## Goal

Ignore local agent/tool dirs; apply leftover dirty policy (commit docs+lock, discard improve noise).

## Scope

**In**

1. Update `.gitignore`: `.claude/`, `.od-skills/`, `pnpm-workspace.yaml` (root).
2. `git restore` dirty `improve/` unless intentional.
3. Commit `ACTION-PLAN.md` + `docs/AUDIT-PLAYBOOK.md` + `package-lock.json` if still meaningful (or restore if junk).
4. Do **not** add `eventsSchedulePdf*` in this ticket.

**Out**

- Kill letter GAS (H-002)
- Delete `improve/` from repo

## Acceptance

- [ ] Tool dirs not untracked noise
- [ ] improve dirty discarded or clean
- [ ] Hygiene commit message clear; no PDF schedule files

## Verify

```bash
git status -sb
# no .claude / .od-skills / pnpm-workspace as ??
```
