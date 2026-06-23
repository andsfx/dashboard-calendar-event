---
slug: survey-v3-revisi
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/survey-v3-revisi.md
approach: Revise tenant survey form — 3 sections, remove ratings, replace percentages with radio
---

# Draft: survey-v3-revisi

## Components (topology ledger)
| id | outcome | status | evidence |
|----|---------|--------|----------|
| C1 - DB migration v3 | Add new columns, keep old data nullable | active | migrate/tenant-event-surveys-v2.sql (existing) |
| C2 - API validation | Rewrite validatePublicSubmission() | active | api/tenant-survey.js:105-150 |
| C3 - Frontend validation | Rewrite validateTenantSurvey() | active | src/utils/validation.ts |
| C4 - Form UI | 3-sections: Info Gerai → Traffic & Sales → Feedback | active | src/components/survey/TenantSurveyPublicPage.tsx:224-826 |
| C5 - Submission payload | Update supabaseApi.ts types + row builder | active | src/utils/supabaseApi.ts:1202-1245 |
| C6 - Migration file | Create migrate/tenant-event-surveys-v3.sql | active | |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|------------|----------------|-----------|-------------|
| tenant_id = text input (no DB yet) | Free text `nama_gerai` field | No tenants table yet | Yes — swap to select when table exists |
| event_id from URL | Auto-detect from /tenant-survey/:eventId | Same as current behavior | No — would need new routing |
| Survey access | Public URL, no auth, dup prevention via fingerprint | Same as current | No — user confirmed |

## Findings (cited - path:lines)
- api/tenant-survey.js:164-170 — events table exists
- src/utils/supabaseApi.ts:1152-1173 — fetchPublicTenantSurveyEvent works
- src/utils/supabaseApi.ts:278-311 — fetchEvents() can list all events
- src/types.ts — PublicTenantSurveyEventInfo interface exists (id, acara, tanggal, lokasi, eo, status)
- No `tenants` table in Supabase — confirmed by explore subagent
- Current row builder: api/tenant-survey.js:257-276
- Current type: supabaseApi.ts:1207-1211 (PublicTenantSurveySubmission)
- Current validation: api/tenant-survey.js:105-150 (validatePublicSubmission)
- Current FE validation: src/utils/validation.ts

## Decisions (with rationale)
1. **Rating fields → REMOVED** — form hanya 3 bagian baru. User confirmed.
2. **% inputs → Radio buttons** — kenaikan_traffic (4 opsi kualitatif), kenaikan_sales (5 opsi range). Per spesifikasi.
3. **tenant_id → text input** — tabel tenants belum ada. Akan diganti jadi select nanti.
4. **event_id → auto-detect URL** — tidak perlu dropdown pilih event. User confirmed.

## Scope IN
- DB migration: hapus required dari rating columns, tambah kolom baru
- API: rewrite validation, update row builder
- UI: rewrite 3 sections, hapus rating stars component
- Types: update interfaces
- Validation.ts: update untuk field baru

## Scope OUT (Must NOT have)
- No tenants table creation (tunggu IT)
- No event dropdown (URL auto-detect)
- No absolute Rupiah values
- No multi-language
- No POS integration
- No photo upload
- No tenant self-service dashboard

## Open questions
None — all resolved via exploration and user interview.

## Approval gate
status: awaiting-approval
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
