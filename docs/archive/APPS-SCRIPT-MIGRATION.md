> **ARSIP (historis) — 2026-09-10.** Proxy `api/apps-script-admin.js` + `google-apps-script.js` **sudah dihapus** (commit `a60dd8d`); H-003 done. Dokumen ini disimpan sebagai catatan transisi Apps Script → VPS, bukan panduan aktif.
>
> Isi aktif terkait: [ADR 004](../adr/004-letter-supabase-kill-gas.md), [SPEC-hygiene.md §6](../SPEC-hygiene.md).

# Apps Script proxy — migration only

**Status:** ~~product letter path killed (ADR 004)~~ → proxy dihapus; lihat banner di atas.  
**Proxy:** ~~`api/apps-script-admin.js`~~ (tidak ada lagi)

## Allowed actions (ops one-off)

- `bootstrapEventSheet`
- `migrateLegacyEvents`
- `migrateStableIds`

Requires `APPS_SCRIPT_URL` + `ADMIN_API_TOKEN` and admin/superadmin auth.

## Not allowed (use REST backend (VPS))

| Concern | Path |
|---------|------|
| Event / Draft / publish | `/api/v1/admin` |
| Surat produk | `GeneratedLetter` via `LetterGenerator` + `adminAction('createLetter')` |
| Letter request / AutoCrat | **Removed** — do not re-add `createLetterRequest` |

## Eventual removal

~~When sheet migrations are finished, delete or archive:~~ **Selesai 2026-09-09 (commit `a60dd8d`)** — semuanya sudah dihapus:

- ~~`api/apps-script-admin.js`~~ *(dihapus)*
- ~~`google-apps-script.js`~~ *(dihapus)*
- ~~related env vars on Vercel~~ *(`APPS_SCRIPT_URL`/`ADMIN_API_TOKEN` kini sisa di env lokal legacy)*

See [SPEC-hygiene.md §6](../SPEC-hygiene.md) + ticket H-003.
