# T-003 — Publik/non-admin: hide Draft + Event status draft

| | |
|--|--|
| **Priority** | P0 |
| **Status** | todo |
| **SPEC** | §3.2 rule 5, §3.7, §1.1 goal 2 |
| **Depends** | T-001 (status derive konsisten) |

## Goal

Surface publik dan user tanpa `canEditEvents` / non-dashboard-admin tidak pernah lihat antrian Draft atau Event berstatus internal `draft`.

## Context (kode sekarang)

- `App.tsx`: `visibleEvents = filteredEvents.filter(e => isAdmin || e.status !== 'draft')`.
- `isAdmin` di App = `permissions.canViewDashboard` — **bukan** hanya admin role (viewer/eo/TR juga true).
- Draft hooks load pakai `isAdmin` flag sama — audit apakah viewer dapat draft data.

## Scope

**In**

1. Definisikan predicate jelas, mis. `canSeeInternalSchedule = canEditEvents` (atau SPEC: hanya admin/superadmin).
2. Filter Event `status === 'draft'` di semua public paths: `/`, `/events`, community upcoming, PDF publik bila ada.
3. Draft list/API: hanya role yang `canEditEvents` (admin/superadmin).
4. Filter bar publik: tidak expose tab/filter “draft” Event.
5. Test: unit filter helper + sanity route data.

**Out**

- Redesign nav.
- Hapus type `draft` dari EventStatus (itu T-007).

## Acceptance

- [ ] `viewer` / unauthenticated: zero Event dengan status draft di props list publik.
- [ ] `viewer`: tidak load / tidak render Antrian Draft.
- [ ] `admin`: tetap lihat internal draft Event bila masih ada di data (sampai T-007).
- [ ] Tidak regres kanban/calendar admin.

## Touch (perkiraan)

- `src/App.tsx`
- `src/hooks/useDraftEvents.ts` / `useEvents.ts`
- `src/components/FilterBar.tsx`
- public landing components bila fetch sendiri

## Verify

```bash
npm run test:unit
# manual: login viewer vs admin — draft queue + event draft visibility
```
