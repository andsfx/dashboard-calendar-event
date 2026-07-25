# T-004 — Align permission matrix vs SPEC §2.1

| | |
|--|--|
| **Priority** | P0 |
| **Status** | todo |
| **SPEC** | §2, §7 |
| **Depends** | — |

## Goal

`usePermission` + route guards + default landing path = matrix SPEC §2.1; ada test regresi matrix.

## Context (kode sekarang)

- Roles: `superadmin | admin | viewer | eo_tenant | tenant_relation` (`src/types/auth.ts`).
- Matrix di `src/hooks/usePermission.ts`.
- Default paths: `getDefaultAppPath` / `getDefaultDashboardPath` di `dashboardNavigation.tsx`.
- App route gate: `allowedDashboardPaths`.

## Scope

**In**

1. Tabel truth: untuk tiap role, assert boolean permission keys (snapshot test atau table-driven).
2. Samakan ke SPEC §2.1; dokumentasikan deviasi sadar di ticket notes jika product override.
3. Unauthenticated → dashboard redirect/login, no admin data flash.
4. `tenant_relation` default → hasil Evaluasi Tenant; `eo_tenant` → tenant surveys.
5. `canManageUsers` hanya superadmin (sudah — harden test).

**Out**

- Role baru.
- Redesign sidebar visual (copy boleh minor).

## Acceptance

- [ ] Table-driven test: 5 roles × permission flags = expected matrix.
- [ ] Default path per role sesuai SPEC §7.2 / navigation helpers.
- [ ] viewer: mutasi Event/Draft handler tidak di-pass (onEdit/onDelete undefined).
- [ ] superadmin: `/dashboard/users` allowed; admin: tidak.

## Touch (perkiraan)

- `src/hooks/usePermission.ts`
- `src/hooks/__tests__/usePermission.test.ts` (buat bila belum)
- `src/components/dashboard/dashboardNavigation.tsx`
- `src/App.tsx` (hanya bila gate salah)

## Verify

```bash
npm run test:unit -- src/hooks/__tests__/usePermission.test.ts
```
