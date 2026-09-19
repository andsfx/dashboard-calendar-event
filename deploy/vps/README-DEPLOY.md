# Schedule Event V2 — Deploy VPS (Opsi B: lepas Supabase → Postgres mandiri)

Dokumen operasional singkat. Prasyarat: repo ini di VPS (Linux, Docker Engine +
Compose plugin), domain sudah menunjuk ke IP VPS.

**Status 2026-09-19:** live di `metmal.metmalcommunityspace.web.id` (SPA di Vercel
`www.metmalcommunityspace.web.id`). Supabase project INACTIVE, dibiarkan
auto-delete; VPS = source of truth.

## Arsitektur (aktual)

```
Cloudflare ──> Caddy host (:80/:443, ACME HTTP-01) ──> nginx container
              (bind 127.0.0.1:8080) ──> api (node:20-alpine, :3001) ──> postgres:16
```

- **TLS + ingress dipegang Caddy di host**, bukan nginx container. nginx HANYA
  bind `127.0.0.1:8080` (lihat komentar di `docker-compose.yml`) — jangan
  kembalikan ke `80:80`/`443:443` tanpa memindahkan TLS (konflik bind).
- Media **tetap di Cloudflare R2** — backend hanya membuat URL presign (S3 SDK),
  tidak ada volume media di VPS.
- `api` = bind-mount repo (read-only) + `node_modules` volume; `npm ci
  --omit=dev` otomatis saat boot pertama. Bila nanti ada `Dockerfile` khusus,
  ganti service `api` ke `build: .`.
- Cookie `sb-access-token`/`sb-refresh-token` diteruskan nginx → api apa adanya.

## 10 Langkah

### 1. VPS target (terkunci)
`vm-2-245-ubuntu` (100.69.24.32) via Tailscale, SSH root OK. Ubuntu 24.04,
Docker 29 + Compose v2, Node 22, nginx 1.24. **Shared box**: venue-prod-app:3000,
caddy, 4x cloudflared, hindsight-api:8888 sudah jalan; RAM available ~1.0Gi,
disk 20G free. **Port 80/443 DIPEGANG Caddy host** (ACME + ingress) → compose
nginx HANYA bind `127.0.0.1:8080`; blok Caddy di host mem-proxy ke situ. Postgres
NATIVE sudah LISTEN 127.0.0.1:5432 (jangan bentrok — compose TIDAK map port host).
VPS kedua `tencent-sg-kw2d` (100.93.220.0) tidak terjangkau SSH — abaikan.

### 2. Docker (sudah ada — lewati bila versi cocok)
Docker 29 + Compose v2.38 sudah terpasang di target. Bila VPS lain:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login setelah ini
```

### 3. Siapkan repo + konfigurasi
```bash
git clone <url-repo> schedule-event-v2 && cd schedule-event-v2
cd deploy/vps
cp .env.example .env
nano .env        # isi DATABASE_URL, JWT_SECRET, R2_* (lihat komentar di file)
```

> **Produksi wajib** (SPA Vercel cross-site → API domain lain):
> `COOKIE_SAMESITE=none` (cookie harus dikirim lintas situs; tanpa ini login
> gagal senyap), `CORS_ORIGIN=https://www.metmalcommunityspace.web.id`
> (whitelist origin; origin lain → 403), dan `COOKIE_DOMAIN` hanya bila cookie
> perlu lintas-subdomain. `JWT_SECRET` + `POSTGRES_PASSWORD` dari
> `openssl rand -hex 32`.

### 4. Build frontend (dist/)
```bash
cd ../..
npm ci
npm run build   # menghasilkan dist/ yang di-mount nginx
```
> `VITE_API_URL` di-inline Vite saat build. **Produksi:** SPA dibangun di Vercel
> dengan `VITE_API_URL=https://metmal.metmalcommunityspace.web.id` (set di env Vercel).
> **Satu origin** (SPA + API di host yang sama, mis. stack ini tanpa Vercel)
> atau lokal: biarkan KOSONG — reverse proxy sudah meneruskan `/api/v1`.
> Jangan sertakan suffix `/api/v1`; `rest.ts` menambahkannya sendiri.
>
> ⚠️ **Vercel menandai env Production sebagai *sensitive* secara default.** Nilai
> var sensitive TIDAK dikembalikan `vercel env pull` (muncul sebagai `""`), jadi
> `VITE_API_URL=""` hasil pull **bukan** bukti env kosong. Agar bisa diaudit,
> set ulang dengan `--no-sensitive`:
> `vercel env add VITE_API_URL production --value https://metmal.metmalcommunityspace.web.id --force --no-sensitive`.
> Kalau benar-benar kosong, SPA menembak same-origin `/api/v1` → Vercel balas
> 404 dan seluruh app rusak. Verifikasi: grep bundle live harus memuat
> `metmal.metmalcommunityspace.web.id".replace(/\/+$/,"")+"/api/v1"`.

### 5. Jalankan stack
```bash
cd deploy/vps
docker compose up -d          # pertama kali: postgres → api (npm ci) → nginx
docker compose ps             # semua healthy/running
```

### 6. Seed database — ✅ SUDAH DIJALANKAN (2026-09-08, 811 baris; parity 20/20 terverifikasi 2026-09-10)
Langkah ini **hanya riwayat** — jangan dijalankan lagi kecuali membangun VPS baru
dari nol. Skripnya idempoten (`ON CONFLICT DO NOTHING`), jadi aman diulang bila
memang perlu, tapi `scripts/migrate/dump-prod.mjs` butuh PAT Supabase yang sudah
dihapus (lihat banner di file itu).

```bash
docker compose exec -T postgres psql -U metmal -d metmal -c "select 1"  # cek hidup
docker compose exec -e DATABASE_URL="postgres://metmal:PASSWORD@postgres:5432/metmal" \
  api node scripts/migrate/seed-vps.mjs --apply
```
Verifikasi cepat: `curl -s localhost/api/v1/events | head`.

### 6b. Akun admin — ✅ SUDAH DIJALANKAN (2026-09-08: 4 akun berfungsi login)
Riwayat langkah (ulangi hanya untuk akun baru / reset password). **Password
selalu lewat env, JANGAN argv** — argv bocor ke shell history + `ps`:
```bash
# Superadmin baru (arg ke-2 = password lama, kosongkan; password dari env):
ADMIN_PASSWORD='Ganti-Password-Kuat-Min-8' docker compose exec -e ADMIN_PASSWORD \
  api node server/scripts/create-admin.mjs admin@domain.com '' 'Admin Utama'
# Reset password akun legacy (role tetap; password lama diganti):
ADMIN_PASSWORD='Password-Baru-Kuat' docker compose exec -e ADMIN_PASSWORD \
  api node server/scripts/create-admin.mjs andotherstori@gmail.com '' --reset
```
Uji login (harus 200 + cookie `sb-access-token`):
```bash
curl -s -X POST https://metmal.metmalcommunityspace.web.id/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@domain.com","password":"Ganti-Password-Kuat-Min-8"}' | head -c 200
```
Cek cepat publik/OG:
```bash
curl -I https://metmal.metmalcommunityspace.web.id/                      # 200 index.html
curl -s https://metmal.metmalcommunityspace.web.id/api/v1/events | head -c 200  # JSON {success,data}
curl -s https://metmal.metmalcommunityspace.web.id/events/<id> | grep -o 'og:title[^>]*'
```
(nginx container hanya bind `127.0.0.1:8080` — dari host pakai
`curl -I http://127.0.0.1:8080/`, dari luar lewat Caddy/domain.)

### 8. TLS — sudah ditangani Caddy host (bukan certbot)
Caddy di host memegang :80/:443 dengan **ACME HTTP-01** (tls-alpn-01 gagal di
belakang Cloudflare → error 525, karena itu HTTP-01). Sertifikat dipegang Caddy;
tidak ada certbot, tidak ada blok `listen 443 ssl` di `nginx.conf`.

Kalau perlu mengubah domain/upstream, edit Caddyfile host lalu:
```bash
sudo systemctl reload caddy
```
Blok `location` certbot di `nginx.conf` sudah tidak dipakai (dipertahankan hanya
untuk referensi historis).

### 9. Perpanjangan sertifikat
Otomatis oleh Caddy (renewal ACME bawaan) — tidak ada cron certbot.

### 10. Verifikasi final
```bash
curl -I https://metmal.metmalcommunityspace.web.id/          # 200, HSTS + cache header
curl -s https://metmal.metmalcommunityspace.web.id/api/v1/events | head -c 200   # {success,data}
curl -s https://metmal.metmalcommunityspace.web.id/events/<id> | grep -o 'og:title[^>]*'
docker compose ps                                    # postgres + api healthy
```
Catatan: `/healthz` TIDAK diproxy nginx (jatuh ke SPA fallback → HTML 200).
Healthcheck nyata: healthcheck container (`/api/v1/events`) atau
`docker inspect --format '{{.State.Health.Status}}' metmal-api`.

## Estimasi RAM (target: shared box ~1.0Gi available)

| Komponen | Perkiraan |
|---|---|
| postgres:16-alpine | ~300–500 MB |
| api (node:20-alpine) | ~150–250 MB |
| nginx | < 50 MB |
| **Total idle** | **~0.6–0.8 GB** |

Target VM-2-245 memiliki sisa ~1.0Gi — stack ini muat, tetapi TIDAK ada ruang
untuk beban tambahan. Pantau dengan `docker stats`, dan jangan tambah service
berat di box ini.

## Operasional sehari-hari

```bash
docker compose logs -f api          # log backend
docker compose restart api          # restart backend
docker compose down                 # stop (volume pgdata TETAP tersimpan)
docker compose up -d                # start lagi
docker compose down -v              # ⚠️ HAPUS volume pgdata — data hilang!
```

## Troubleshooting singkat

| Gejala | Cek |
|---|---|
| api crash saat boot | `docker compose logs api` — `DATABASE_URL`/`JWT_SECRET` wajib terisi |
| 503 dari api | postgres belum healthy; seed belum jalan; `docker compose ps` |
| 404 semua route SPA | `dist/` belum di-build (langkah 4) atau mount `../../dist` salah |
| 429 login padahal wajar | limit **backend** `enforceRateLimit` — 20 percobaan/15 mnt per IP (`server/src/routes/auth.js`); nginx sengaja TIDAK rate-limit agar 429 JSON Indonesia tetap konsisten |
| Media rusak/404 | cek `R2_*` di `.env` + status bucket `metmal-gallery` (Cloudflare) |

## Keamanan singkat

- `POSTGRES_PASSWORD`/`JWT_SECRET` kuat & unik (`openssl rand -hex 32`).
- Port publik hanya 80/443; postgres container TIDAK di-map ke host — akses via
  `docker compose exec` saja (Postgres native host di 127.0.0.1:5432 milik box,
  tidak tersentuh).
- Update image rutin: `docker compose pull && docker compose up -d`.
- Backup DB: `deploy/vps/backup.sh` (pg_dump gzip, rotasi 14, `gunzip -t` validasi)
  lewat cron host 03:00 → `/opt/metmal/backups`. Restore:
  `gunzip -c <file> | docker compose exec -T postgres psql -U metmal -d metmal`.
  Volume `pgdata` bukan replikasi — backup tetap wajib.
