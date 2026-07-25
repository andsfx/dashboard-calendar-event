# T-001 — Event status derive dari tanggal

| | |
|--|--|
| **Priority** | P0 |
| **Status** | todo |
| **SPEC** | §3.3, ADR 002, open Q default: date-only Asia/Jakarta |
| **Depends** | — |

## Goal

Satu jalur hitung status Event `upcoming | ongoing | past` dari tanggal; storage `status` = cache yang selalu selaras.

## Context (kode sekarang)

- `getStatus` ada di `src/utils/eventUtils.ts` (multi-day + jam) **dan** `src/utils/eventDateTime.ts` (lebih sederhana).
- Load dari Supabase pakai `row.status` (`supabaseApi.ts`) — bisa basi.
- Save form bisa set `status: data.status || 'upcoming'` (`useDashboardHandlers.ts`).

## Scope

**In**

1. Canonical derive function (satu export dipakai app): input `dateStr`, optional `dateEnd`, optional `jam`/`dayTimeSlots`, optional `now`.
2. On read (map row → `EventItem`): set `status` dari derive, jangan percaya row mentah untuk UI.
3. On write create/update Event: tulis `status` hasil derive (bukan input form manual).
4. Unit test boundary: single hari ini / kemarin / besok; multi-day rentang; date-only (abaikan jam untuk P0 kecuali logic existing multi-day last-day sudah ada — dokumentasikan pilihan di PR).

**Out**

- Hapus field `status` dari DB.
- Ubah UX recurring series global status.
- Timezone config UI.

## Acceptance

- [ ] Tidak ada path UI yang menampilkan status Event beda dari `getStatus(...)` untuk tanggal yang sama.
- [ ] Create/update Event tanpa field status manual di form (atau field diabaikan).
- [ ] Unit test cover single + multi_day boundaries.
- [ ] Duplikat `getStatus` di `eventDateTime.ts` / `eventUtils.ts` disatukan atau satu re-export (no dual behavior).

## Touch (perkiraan)

- `src/utils/eventUtils.ts`
- `src/utils/eventDateTime.ts`
- `src/utils/supabaseApi.ts` (mapEvent)
- `src/hooks/useDashboardHandlers.ts`
- `src/utils/__tests__/eventUtils.test.ts` / `eventDateTime.test.ts`

## Verify

```bash
npm run test:unit -- src/utils/__tests__/eventUtils.test.ts src/utils/eventDateTime.test.ts
```

## Notes

SPEC default: date-only Asia/Jakarta. Jika `getStatus` existing pakai jam di last day multi-day, keep behavior + test; jangan regress diam-diam.
