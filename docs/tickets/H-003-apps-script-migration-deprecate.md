# H-003 — Document/deprecate remaining Apps Script migration proxy

| | |
|--|--|
| **Priority** | P2 |
| **Status** | done |
| **SPEC** | [SPEC-hygiene.md](../SPEC-hygiene.md) §6, ADR 004 |
| **Depends** | H-002 |

## Goal

Clarify that remaining `apps-script-admin` actions are **ops migration only**, not product runtime.

## Scope

**In**

1. README or `docs/` note: migration/bootstrap only; not letter.
2. Optional: restrict allowlist to migration actions only after letter killed.
3. Plan eventual removal of `google-apps-script.js` (ticket follow-up if needed).

**Out**

- Implementing new migration features

## Acceptance

- [ ] Docs state migration-only
- [ ] No product feature documented as requiring GAS letter

## Verify

Manual doc review + grep product paths.
