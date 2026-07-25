# T-006 — Naming UI: Survey Kepuasan vs Evaluasi Tenant

| | |
|--|--|
| **Priority** | P1 |
| **Status** | todo |
| **SPEC** | §5, §8.1 |
| **Depends** | — |

## Goal

Semua nav, heading, toast, empty state membedakan **Survey Kepuasan** dan **Evaluasi Tenant**. Hilangkan “Survey” generik di tempat yang ambigu.

## Context (kode sekarang)

- Nav: `Survey Kepuasan`, `Evaluasi Tenant`, `Hasil Evaluasi Tenant` (`dashboardNavigation.tsx`) — audit sisa string.
- Routes: `/dashboard/survey`, `/dashboard/tenant-surveys`, `/tenant-survey-results`, `/survey/:eventId`.

## Scope

**In**

1. Grep user-facing strings: Survey, Tenant Survey, Evaluasi, Feedback.
2. Standardkan:
   - Survey Kepuasan (organizer/public)
   - Evaluasi Tenant
   - Hasil Evaluasi Tenant
3. Jangan rename route path di P1 kecuali perlu (path boleh teknis).
4. README/docs singkat pointer jika sebut fitur.

**Out**

- Merge tabel DB.
- Redesign form rating.

## Acceptance

- [ ] Sidebar/nav labels sesuai glossary.
- [ ] Halaman survey kepuasan tidak bilang “Evaluasi Tenant” dan sebaliknya.
- [ ] Tidak ada string “Staff Mall”.
- [ ] EO field label = organisasi penyelenggara, bukan role `eo_tenant`.

## Touch (perkiraan)

- `src/components/dashboard/dashboardNavigation.tsx`
- `src/components/survey/*`
- page titles di `App.tsx` / shell

## Verify

```bash
# grep residual ambiguous copy
rg -n "Survey|Evaluasi|Tenant Survey|Staff Mall" src/components --glob "*.tsx"
# manual smoke nav labels as each role
```
