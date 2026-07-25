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
