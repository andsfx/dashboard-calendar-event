# ADR 004: Surat produk hanya Supabase; matikan jalur letter Apps Script

## Status

Accepted

## Context

Historis: `createLetterRequest` memanggil `/api/apps-script-admin` → Google Apps Script (form/AutoCrat). Parallel, `GeneratedLetter` sudah disimpan di Supabase (PDF/metadata). Dual path membingungkan sumber kebenaran, mempersulit auth/secret, dan bertentangan dengan migrasi Event/Draft ke Supabase-only untuk write path utama.

Keputusan grill hygiene: **kill letter path GAS segera**; proxy migration/bootstrap di `apps-script-admin` boleh sisa untuk ops one-off.

## Decision

1. **Produk Surat** = entitas `GeneratedLetter` di Supabase (create/read/update/archive di app + API Supabase).
2. **Hentikan** client path `createLetterRequest` → Apps Script sebagai fitur produk (hapus pemanggilan UI/API atau fail-closed dengan error jelas “legacy disabled”).
3. **Event/Draft/publish** tetap **hanya** `/api/supabase-admin` (sudah).
4. `api/apps-script-admin.js` + `google-apps-script.js` boleh tetap untuk **migrasi/bootstrap one-off** sampai di-deprecate terpisah; **bukan** jalur letter runtime.
5. Jangan dual-write letter ke GAS + Supabase.

## Consequences

**Plus**

- Satu sumber kebenaran dokumen surat.
- Kurang secret `APPS_SCRIPT_URL` / token di path kritis produk.
- Selaras stack Event/Draft.

**Minus / biaya**

- Workflow AutoCrat/Google Form putus kecuali diganti di Supabase/PDF pipeline.
- Butuh ticket implement: UI letter generator → hanya `GeneratedLetter`; hapus/guard `createLetterRequest`.
- Ops yang masih andalkan GAS letter harus migrasi sebelum deploy kill.

## Alternatives considered

1. **Legacy GAS request + Supabase GeneratedLetter** — soft coexistence; dual truth, ditolak.
2. **Kill seluruh Apps Script termasuk migration** — lebih bersih; migration offline tetap bisa; ditunda (proxy migration boleh sisa).
3. **Env flag soft-off** — aman rollback; ditolak sebagai target akhir (keputusan: kill path letter, bukan flag abadi).
