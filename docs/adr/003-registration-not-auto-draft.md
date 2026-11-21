# ADR 003: Community Registration tidak auto-spawn Draft

## Status

Accepted

## Context

Community Registration menerima usulan dari Pendaftar (komunitas, sekolah, EO, dll.) dengan status `pending` → `reviewed` → `approved` | `rejected`. Godaan produk: “approve = langsung masuk antrian Draft / kalender”. Operasional mall sering butuh cek slot, model kerja sama, dan kelengkapan sebelum ada baris Draft/Event.

## Decision

- **Community Registration** = lead akuisisi terpisah (context Akuisisi).
- **Approve** = keputusan review saja; **tidak** membuat Draft atau Event otomatis.
- Lanjut ke jadwal = **admin** buat Draft (lalu publish ke Event) secara manual, dengan data Registration sebagai referensi.

## Consequences

**Plus**

- Boundary jelas: lead ≠ jadwal.
- Staff kontrol kapan slot benar-benar masuk antrian.
- Registration bisa ditolak/diarsip tanpa polusi Draft.

**Minus / biaya**

- Satu langkah manual ekstra setelah approve (copy data / buka form Draft).
- Risiko “approved tapi tidak pernah dijadwalkan” — butuh proses/ops, bukan auto-link ketat di domain.

## Alternatives considered

1. **Approve → auto Draft** — cepat; memaksa Draft dari lead setengah matang; sulit rollback.
2. **Approve → auto Event upcoming** — melewati antrian; terlalu agresif untuk operasional mall.

## Update 2026-11-21 — jalur manual dirapatkan, keputusan tetap

Keputusan di atas tidak berubah: approve tetap tidak membuat Draft/Event. Yang
selesai adalah **jalur manualnya**, supaya risiko "approved tapi tidak pernah
dijadwalkan" bisa dipantau dan relasinya tidak hilang:

- Draft punya kolom `organization_id` (`draft_events`, migrasi
  `2026-11-21-draft-organization-link.sql`). Tombol "Buat Draft dari
  pendaftaran" mengisi kolom itu, form Draft menampilkan pemilih organisasi,
  dan `publishDraft` menyalinnya ke `events.organization_id`.
- `/dashboard/registrations` menampilkan kolom **Tindak lanjut** (Belum
  dijadwalkan / Draft · <progress> / Sudah dijadwalkan) plus aksi baris
  **Buat Draft** untuk `approved` yang belum punya Draft/event. Aksi itu juga
  ada di modal detail, dan dinonaktifkan bila Draft sudah ada.
- Tombol di modal detail sempat tidak pernah tampil karena
  `DashboardPage` tidak mengoper `onCreateEventFromRegistration`; prop itu
  sekarang **wajib** di `DashboardModalsProps` agar lupa wiring gagal di
  `tsc`, bukan diam-diam menyembunyikan fitur.

Urutan deploy: migrasi SQL → API VPS → SPA. API baru membaca
`draft.organization_id` saat publish; kolom itu harus ada lebih dulu.
