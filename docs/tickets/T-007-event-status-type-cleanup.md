# T-007 — EventStatus publik vs internal; type cleanup

| | |
|--|--|
| **Priority** | P2 |
| **Status** | todo |
| **SPEC** | §3.3, §9 gap, T-001/T-003 follow-up |
| **Depends** | T-001, T-003 |

## Goal

Type system membedakan status operasional publik vs flag internal legacy `draft` pada Event, supaya tidak kabur dengan entitas **Draft**.

## Scope

**In**

1. Mis. `EventOperationalStatus = 'upcoming' | 'ongoing' | 'past'` dan `EventStatus = EventOperationalStatus | 'draft'` **atau** field terpisah `isInternalDraft`.
2. FilterBar / Kanban / StatusBadge: publik hanya 3 status.
3. Migrasi pemakaian type; test compile strict.
4. Komentar di `types.ts` mengarah CONTEXT/ADR.

**Out**

- Data migration mass update rows (opsional script terpisah).
- Hapus kolom DB.

## Acceptance

- [ ] `tsc` / build clean.
- [ ] UI admin kanban kolom draft Event: eksplisit “internal” atau dihilangkan sesuai product call (default: hide dari kanban operasional, hanya filter internal bila masih perlu).
- [ ] Dokumentasi type = glossary.

## Touch (perkiraan)

- `src/types.ts`
- `src/components/StatusBadge.tsx`, `KanbanView.tsx`, `FilterBar.tsx`
- tests StatusBadge / eventUtils

## Verify

```bash
npm run build
npm run test:unit -- src/components/__tests__/StatusBadge.test.tsx src/utils/__tests__/eventUtils.test.ts
```
