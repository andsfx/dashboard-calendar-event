# T-008 — Aset opsional: tidak gate lifecycle jadwal

| | |
|--|--|
| **Priority** | P2 |
| **Status** | todo |
| **SPEC** | §6 |
| **Depends** | — |

## Goal

Pastikan generate surat / manage album tidak memblokir atau mengubah progress Draft / status Event. Event valid tanpa aset.

## Scope

**In**

1. Audit flow `GeneratedLetter` create dari Event/Draft: no write ke progress/published/status.
2. Album create/update: `eventId` optional; no require album on publish.
3. Bila ada validasi “wajib surat sebelum publish” — hapus.
4. Test atau assert di handler: publishDraft tidak cek letter/album.

**Out**

- Fitur gallery baru.
- Redesign letter PDF.

## Acceptance

- [ ] Publish Draft tanpa surat/album sukses.
- [ ] Generate surat tidak ubah `Draft.progress` / `Event.status`.
- [ ] Album tanpa `eventId` tetap valid.

## Touch (perkiraan)

- letter generator components + API
- `AlbumManagerModal` / album API
- publish path (assert only)

## Verify

```bash
npm run test:unit
# manual: publish draft tanpa letter; generate letter; cek draft progress unchanged
```
