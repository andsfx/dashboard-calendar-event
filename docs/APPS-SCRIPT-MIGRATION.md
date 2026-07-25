# Apps Script proxy — migration only

**Status:** product letter path killed (ADR 004).  
**Proxy:** `api/apps-script-admin.js`

## Allowed actions (ops one-off)

- `bootstrapEventSheet`
- `migrateLegacyEvents`
- `migrateStableIds`

Requires `APPS_SCRIPT_URL` + `ADMIN_API_TOKEN` and admin/superadmin auth.

## Not allowed (use Supabase)

| Concern | Path |
|---------|------|
| Event / Draft / publish | `/api/supabase-admin` |
| Surat produk | `GeneratedLetter` via `LetterGenerator` + `createGeneratedLetter` |
| Letter request / AutoCrat | **Removed** — do not re-add `createLetterRequest` |

## Eventual removal

When sheet migrations are finished, delete or archive:

- `api/apps-script-admin.js`
- `google-apps-script.js` (if unused)
- related env vars on Vercel

See [SPEC-hygiene.md](SPEC-hygiene.md) H-003.
