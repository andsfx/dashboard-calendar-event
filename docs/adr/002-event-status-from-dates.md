# ADR 002: Status Event dihitung dari tanggal

## Status

Accepted

## Context

Event punya fase tampilan `upcoming` · `ongoing` · `past`. Kalau Staff mengeset status manual, kalender dan filter mudah desync dari `dateStr` / `dateEnd`. Multi-day dan recurring memperbesar risiko status “salah hari”.

## Decision

- Status operasional Event **diderivasi** dari tanggal event (`dateStr`, dan `dateEnd` bila multi-day) dibanding hari ini (zona waktu operasional mall).
- Field `status` di penyimpanan boleh ada sebagai cache/denormalisasi, tetapi **bukan** sumber kebenaran workflow.
- Status `draft` pada Event (jika ada di data) = internal/legacy, bukan fase antrian dan bukan bagian lifecycle publik.

## Consequences

**Plus**

- Satu aturan untuk table, calendar, kanban, timeline, landing.
- Kurang langkah manual Staff; lebih sedikit “status busuk”.

**Minus / biaya**

- Perlu definisi tegas boundary hari (timezone, jam event opsional).
- Override manual tidak didukung sebagai default domain; kalau nanti dibutuhkan, butuh ADR baru (hybrid).
- Job/recompute cache status (jika dipakai) harus konsisten dengan aturan tanggal.

## Alternatives considered

1. **Workflow manual murni** — fleksibel edge case; rawan desync tanggal vs status.
2. **Hybrid auto + override Staff** — powerful; kompleks spek dan UI; ditunda sampai ada kebutuhan nyata.
