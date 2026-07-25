# Tickets — Dashboard Calendar Event

Dari [SPEC.md](../SPEC.md) + [CONTEXT.md](../../CONTEXT.md).  
Pipeline: grill → spec → **tickets** → implement → review.

## Board

| ID | Prioritas | Judul | Status | Depends |
|----|-----------|-------|--------|---------|
| [T-001](T-001-event-status-derive.md) | P0 | Event status derive dari tanggal (single path) | done | — |
| [T-002](T-002-publish-draft-rules.md) | P0 | Publish Draft: spawn Event, forbid re-publish | done | — |
| [T-003](T-003-public-hide-draft.md) | P0 | Publik/non-admin: hide Draft + Event status draft | done | T-001 |
| [T-004](T-004-permission-matrix-align.md) | P0 | Align permission matrix vs SPEC §2.1 + tests | done | — |
| [T-005](T-005-registration-approve-no-spawn.md) | P1 | Approve Registration tanpa side-effect; CTA manual eksplisit | done | — |
| [T-006](T-006-feedback-naming.md) | P1 | Naming UI: Survey Kepuasan vs Evaluasi Tenant | done | — |
| [T-007](T-007-event-status-type-cleanup.md) | P2 | EventStatus publik vs internal; type cleanup | done | T-001, T-003 |
| [T-008](T-008-asset-lifecycle-guards.md) | P2 | Aset opsional: guard surat/album tidak gate jadwal | done | — |

### Follow-up (post-audit P1) — 2026-07-25

- `canPublishDraft` shared: `draftUtils` → `useDraftEvents` + `useDashboardHandlers`
- `EventCrudModal` status = `getStatus` kanonik
- Kanban `showInternalDraftColumn` dari `canSeeInternalSchedule`
- T-008 test: `assetLifecycleGuards.test.ts`
- vitest exclude `.claude/**` + `improve/**` (OOM worktree)

## Order implement

```
T-001 ─┬─► T-003 ─► T-007
T-002 ─┘
T-004 (paralel)
T-005, T-006 (paralel setelah P0 atau paralel aman)
T-008 (paralel aman)
```

## Definition of done (semua ticket)

1. Acceptance checklist di file ticket ✓  
2. Verify command di ticket lulus  
3. Istilah ikut `CONTEXT.md` (bukan sinonim kabur)  
4. Tidak buka multi-mall / auto-Draft-on-approve / status manual murni  

## Status values

`todo` · `doing` · `blocked` · `done` · `wontfix`
