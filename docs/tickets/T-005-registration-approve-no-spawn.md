# T-005 — Approve Registration tanpa spawn; CTA manual eksplisit

| | |
|--|--|
| **Priority** | P1 |
| **Status** | todo |
| **SPEC** | §4, ADR 003 |
| **Depends** | — |

## Goal

Ubah status Registration ke `approved` **hanya** update status + note. Lanjut jadwal = aksi eksplisit “Buat Draft dari pendaftaran” (manual), bukan side-effect approve.

## Context (kode sekarang)

- `updateRegistrationStatus` via adminAction.
- `CommunityRegistrationDetailModal`: ada `onCreateEvent` saat `status === 'approved'` — pastikan itu **tidak** dipanggil dari approve handler; copy jelas “Buat Draft…”.

## Scope

**In**

1. Audit API `updateRegistrationStatus`: no insert Draft/Event.
2. UI approve/reject: hanya status + adminNote.
3. CTA post-approve: label **Buat Draft dari pendaftaran** (bukan “Create Event” membingungkan bila target Draft); prefill form Draft dari registration fields; **user harus save** Draft.
4. Tidak set FK wajib registration→draft di v1 (optional note di internalNote Draft OK).

**Out**

- Auto-link DB registration_id di Event.
- Full mapping typeSpecificData → semua field Draft.

## Acceptance

- [ ] Approve N kali: count Draft & Event tidak naik.
- [ ] CTA manual buka form Draft prefill; save baru +1 Draft.
- [ ] Copy UI: “Approve” ≠ “Publish” ≠ “Buat Draft”.
- [ ] Reject + note tersimpan.

## Touch (perkiraan)

- `src/components/CommunityRegistrationDetailModal.tsx`
- `src/hooks/useDashboardHandlers.ts`
- `api/community-registration.js` / admin status handler
- copy di section list bila perlu

## Verify

```bash
npm run test:unit
# manual: approve registration → cek DB/list draft count unchanged → CTA buat draft
```
