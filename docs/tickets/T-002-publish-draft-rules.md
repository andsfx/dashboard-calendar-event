# T-002 — Publish Draft: spawn Event, forbid re-publish

| | |
|--|--|
| **Priority** | P0 |
| **Status** | todo |
| **SPEC** | §3.2, ADR 001, open Q default: forbid re-publish |
| **Depends** | — |

## Goal

Publish Draft selalu: spawn Event + tandai Draft `published`; tidak re-publish; progress `confirm` wajib sebelum publish (sudah ada warning UI — pastikan server sama).

## Context (kode sekarang)

- Client: `useDraftEvents.publishDraft` → `apiPublishDraft` / adminAction `publishDraft`.
- Guard client: `progress === 'confirm'` di `useDashboardHandlers`; `target.published` block di restore, cek publish path.
- Server action di API admin — audit spawn Event + `source_draft_id`.

## Scope

**In**

1. Audit end-to-end `publishDraft` (API + client):
   - Draft harus `progress === 'confirm'`, `published === false`, not deleted.
   - Response sukses ⇒ Event ada dengan field mirror + `sourceDraftId` / `source_draft_id`.
   - Draft `published=true`, `publishedAt` set; progress tetap/confirm (dokumentasikan).
2. Re-publish: API return error jelas; client tidak flip state.
3. Soft-delete Draft tidak menghapus Event yang sudah di-publish.
4. Unit/integration test sedapatnya (mock adminAction atau pure helper extract).

**Out**

- Dual-write sync edit Event → Draft.
- Auto-publish.

## Acceptance

- [ ] Publish sekali: +1 Event, Draft `published=true`, `sourceDraftId` terisi di Event.
- [ ] Publish kedua Draft sama: gagal, tidak +Event lagi.
- [ ] Publish progress `draft` (bukan confirm): gagal client + server.
- [ ] Copy/error string pakai “Publish Draft”, bukan “promote/convert”.

## Touch (perkiraan)

- `src/hooks/useDraftEvents.ts`
- `src/hooks/useDashboardHandlers.ts`
- `src/utils/supabaseApi.ts`
- `api/*` admin publishDraft handler (cari `publishDraft`)
- tests terkait draft/publish

## Verify

```bash
npm run test:unit
# + manual: Draft confirm → publish → cek Event list + Draft history published
```

## Notes

Kalau server sudah benar, ticket = harden guards + tests + copy. Jangan refactor besar di luar publish path.
