# ADR 005: Backend pindah ke Express/Postgres di VPS ("Opsi B"); lepas Supabase

## Status

accepted (2026-09-08) — deployed + data ter-seed penuh + Supabase project paused.

## Context

Dua "dinding" teknis-biaya berulang dari stack lama (Vercel Hobby + Supabase Free):

1. **Kuota terpisah-ketat**: Supabase Free = 5 GB egress/bln + 200 socket realtime; Vercel Hobby = 100 GB transfer + 1 jt edge req/bln. Lonjakan 10 ribu orang buka `/events` barengan = bros. Estimasi: traffic penuh event besar membakar 3–5× batas Supabase. [Hobby](https://vercel.com/docs/plans/hobby), [Supabase pricing](https://supabase.com/pricing).
2. **Realtime hampir tidak terpakai**: hanya dashboard admin yang subscribe `postgres_changes` → debounce 400 ms full re-fetch. Browsing publik (10× beban) tidak pernah pakai sockett. 200 koneksi puncak pun tidak akan tersentuh — tapi plan pembayaran dibuat terasa pokok.
3. **ToS/kebijakan**: situs ini komersial (nyata, bukan personal); Hobby plan secara legal menolak non-commercial use. Menghilangkan ambigu legal.
4. **3 layanan cloud saja** (Vercel hosting + Supabase DB/auth/realtime/storage + Cloudflare R2) = 3 titik-putus + 3 konsol; pola Vercel-serverless `maxDuration: 60 + cold-start in-memory rate-limit` yang sudah lemah untuk fair usage.

Evaluasi (03–06 Sep 2026): pindah total Supabase Auth/RLS/realtime/storage = rewrite besar (auth, mapper, hooks, e2e, driveby operasional). Anggaran: 3 agen-paralel 3 hari effort. Dialihkan ke: **Express (Node 20) + Postgres 16 di VPS Tencent Cloud SG (`43.134.72.148`, Tailscale `vm-2-245-ubuntu`)**, docker compose di `/opt/metmal/deploy/vps`. SPA tetap Vercel (gratis + CDN global + Rollback). Media tetap Cloudflare R2 (bandwidth gratis, sudah dipakai).

## Decision

1. **Backend bawa server (`server/` Express + `pg`)** — tidak pakai ORM; semua SQL tower eksplisit dengan `$1,$2,…`; zod `ACTION_SCHEMAS` di `server/src/lib/schemas.js`.
2. **Auth JWT murni** (bukan Supabase Auth): bcrypt `users.password_hash` + `jose` HS256 → HttpOnly cookies `sb-access-token`/`sb-refresh-token`. `COOKIE_SAMESITE=none` wajib lintas-situs (Vercel → andotherstori.my.id). Akun lama di-reset batch (`server/scripts/create-admin.mjs --reset`) karena hash Supabase Auth tidak bisa diekspor.
3. **RLS ditinggalkan** — keamanan murni filter SQL server + `requireRole`; PII di-strip via pemilihan kolom di `SERVER/src/routes/*.js` (bukan policy DB).
4. **Realtime → polling**: useEvents 30 s + debounce 400 ms, useDraftEvents 60 s, useTenantSurveys 60 s (list)+60 s analytics. Kecepatan update dari "0–400 ms" ke "≤30–60 s" — disetujui Andy karena hanya dashboard admin yang merasakannya (buruk dipublikasikan kepada rakyat).
5. **Storage tetap Cloudflare R2** — zero egress; 4 URL legacy Supabase dipindahkan `photos-to-r2.mjs --apply` → `photo-url-map.json` (rewrite saat seed).
6. **Migrasi satu kali, idempotent**: `dump-prod.mjs` → `photos-to-r2.mjs` → `seed-vps.mjs --apply` (20 tabel, 811 baris; `ON CONFLICT DO NOTHING`; `OVERRIDING SYSTEM VALUE` identity; sequence re-sinkron). Checksum md5 ID-set 8 tabel besar sama persis, count 18/18 match (+`activity_logs` nambah 3 log operasional).
7. **SPA Vercel → API via `VITE_API_URL`**: rewrite `/events/:id+` (OG) di `vercel.json` dialihkan eksternal; semua React hook memakai REST (`src/lib/rest.ts`), supabase-js uninstall.
8. **Backup DB terjadwal** (gap nyata Supabase→VPS): cron host 03:00 `deploy/vps/backup.sh` → `pg_dump` gzip rotasi 14 → `/opt/metmal/backups` (plus volume docker `metmal_pgdata`, restore via `psql -f -`).

## Consequences

- Endpoint prefix *Vercel-serverless → VPS REST*: `/api/supabase-admin` → **`/api/v1/admin/{action}`**; `/api/auth` → **`/api/v1/auth/*`**; `/api/tenant-survey` → **`/api/v1/tenant/*`**; dll. — client fetch berubah satu titik `(VITE_API_URL + '/api/v1')`.
- Akun admin: username tetap, password di-reset (hash Supabase tidak ter-migrasi). 4 user berfungsi login.
- Delete `api/*.js`, dep `@supabase/supabase-js`, dan shim `src/lib/supabase.ts` = cleanup tambahan (belum karena audit trigger).
- Cost terprediksi: VPS ~Rp 60–150rb/bln fixed vs quota-overrun risk variable.
- Rollback nyata: cara termudah = un-pause Supabase (data lama beku di titik migrasi — baru berubah setelah cutover berarti harus di-port balik manual).
- Supabase project = **paused**, bukan deleted (jendela stabil ~1 minggu dulu).

## Alternatives

1. **Supabase Pro $25/bln + Vercel Pro $20/bln** — harga 4–8× VPS; menambah rincian vendor sama; diskon.
2. **Self-host Supabase (Docker) di VPS** — rewrite minimal tapi bawa 8+ kontainer (auth/gateway/realtime/studio) → beban ops terbanyak.
3. **Cloudflare Workers + D1** — egress-free asli tapi driver SQL/pg ecosystem minimal untuk query kompleks dashboard; ditahan.
4. **Firebase (Spark→Blaze)** — NoSQL rewrite total + egress berbayar; diskon.

## Bukti produksi (2026-09-08, deploy fix `f922709`–`efb31da` + cutover `8e23ba4`)

- `https://www.metmalcommunityspace.web.id/events` render **TOTAL 250 LIVE 0 COMING SOON 27** — semua fetch `[events, themes, holidays, settings/…]` ke `metmal.andotherstori.my.id`; 0 call ke supabase.co.
- Login browser superadmin OK; semua 4 akun API-OK (`success:true`), tabel Pendaftaran 12 baris nyata.
- Matrix testing 24/24: auth pos/negatif, admin list*, publik 15+ route, validasi yang menolak junk, R2 presign→PUT→GET-magic-bytes→delete.
- Cron backup pertama `metmal_20260908_210559.sql.gz` (56 K) lolos `gunzip -t`.
