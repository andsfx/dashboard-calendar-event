# ADR 001: Draft dan Event sebagai dua entitas

## Status

Accepted

## Context

Operasional mall butuh antrian pra-jadwal (belum pasti slot/tanggal/EO) dan kalender resmi yang dilihat operasional + publik. Menggabungkan keduanya jadi satu record dengan banyak status membuat filter, permission, dan publish ambigu. Kode sudah punya `DraftEventItem` dan `EventItem` terpisah (`published`, `sourceDraftId`).

## Decision

- **Draft** = entitas antrian pra-jadwal (progress `draft` | `confirm` | `cancel`).
- **Event** = entitas jadwal resmi (status operasional `upcoming` | `ongoing` | `past`).
- **Publish** = spawn Event dari Draft; Draft ditandai `published` dan tetap arsip antrian.
- Tidak promote “satu baris pindah jadi Event”; tidak wajib dual-write sinkron seumur hidup setelah publish.

## Consequences

**Plus**

- Antrian dan kalender resmi punya bahasa + query terpisah.
- Jejak antrian tetap ada setelah publish.
- Permission “edit antrian” vs “edit jadwal” bisa dibedakan.

**Minus / biaya**

- Dua model + alur publish harus dijaga konsisten di API/UI.
- Edit setelah publish: default di Event; Draft arsip tidak otomatis mirror (kecuali spek bilang lain).
- Status `draft` di `EventItem` (jika masih ada di data) harus diperlakukan internal — bukan antrian Draft.

## Alternatives considered

1. **Satu entitas Event, Draft cuma status** — lebih simpel model; antrian dan publik mudah tercampur; progress confirm/cancel bentrok status tanggal.
2. **Promote (hapus Draft, hanya Event)** — hilang arsip antrian dan jejak pra-keputusan.
