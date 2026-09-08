# Schedule Event V2 — Deploy VPS (Opsi B: Supabase → Postgres mandiri)

Dokumen operasional singkat. Prasyarat: repo ini di VPS (Linux, Docker Engine +
Compose plugin), domain sudah menunjuk ke IP VPS.

## Arsitektur

```
Internet ──> nginx (80/443, static SPA dist/ + proxy) ──> api (node:20-alpine,
             server/src/index.js, :3001) ──> postgres:16 (volume pgdata)
```

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
disk 20G free; port 80/443 bebas. Postgres NATIVE sudah LISTEN 127.0.0.1:5432
(jangan bentrok — compose TIDAK map port host). VPS kedua `tencent-sg-kw2d`
(100.93.220.0) tidak terjangkau SSH — abaikan.

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

### 4. Build frontend (dist/)
```bash
cd ../..
npm ci
npm run build   # menghasilkan dist/ yang di-mount nginx
```
> `VITE_API_URL` dibaca saat build; KOSONGKAN untuk satu origin (nginx mem-proxy
> `/api/v1` ke backend; rest.ts menambahkan suffix sendiri, jangan isi `/api/v1`).

### 5. Jalankan stack
```bash
cd deploy/vps
docker compose up -d          # pertama kali: postgres → api (npm ci) → nginx
docker compose ps             # semua healthy/running
```

### 6. Seed database
Muat data prod (seed/*.json) ke Postgres container via script seed (idempoten, FK-safe).
Jalankan dengan `docker compose exec` — TIDAK ada mapping port host (Postgres
native VPS sudah LISTEN di 127.0.0.1:5432, konflik bila dipetakan):
```bash
# Salin script + seed ke container sekali (atau bind-mount bila sudah diatur):
docker compose exec -T postgres psql -U metmal -d metmal -c "select 1"  # cek hidup
# Cara A — seed dari host via socket exec (DATABASE_URL menunjuk service internal):
docker compose exec -e DATABASE_URL="postgres://metmal:PASSWORD@postgres:5432/metmal" \
  api node scripts/migrate/seed-vps.mjs --apply
# Cara B — psql langsung dari container postgres (file dump tersedia di sana):
# docker compose exec postgres psql -U metmal -d metmal -f /docker-entrypoint-initdb.d/dump.sql
```
Verifikasi cepat: `curl -s localhost/api/v1/events | head`.

### 6b. Akun admin (wajib — seed tidak membawa password)
`users` prod tidak punya `password_hash`, jadi pasca-seed TIDAK ADA yang bisa
login (401). Buat superadmin baru, lalu reset password 4 akun legacy:
```bash
# Superadmin baru (atau gunakan email sendiri):
docker compose exec api node server/scripts/create-admin.mjs admin@domain.com 'Ganti-Password-Kuat-Min-8' 'Admin Utama'
# Reset password akun legacy (role tetap: superadmin/admin):
docker compose exec api node server/scripts/create-admin.mjs andotherstori@gmail.com 'Password-Baru-Kuat' --reset
docker compose exec api node server/scripts/create-admin.mjs sindisari435@gmail.com 'Password-Baru-Kuat' --reset
# Uji login pertama (harus 200 + cookie sb-access-token):
curl -s -X POST localhost/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@domain.com","password":"Ganti-Password-Kuat-Min-8"}' | head -c 300
```
```bash
curl -I http://<IP_VPS>/                      # 200 index.html, header cache
curl -s http://<IP_VPS>/api/v1/events | head  # JSON {success,data}
curl -s http://<IP_VPS>/events/<id> | head    # meta og:title event (OG inject)
```

### 8. TLS dengan certbot
```bash
cd deploy/vps
mkdir -p certbot/conf certbot/www
# Certbot dijalankan via image terpisah (bukan service compose):
docker run --rm -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d DOMAIN --email admin@DOMAIN --agree-tos --no-eff-email
```
Lalu ikuti instruksi di bagian komentar bawah `nginx.conf` (aktifkan bind-mount
`certbot/`, blok `listen 443 ssl`, redirect 80 → 443) dan
`docker compose restart nginx`.

### 9. Perpanjang sertifikat otomatis
Cron harian di host (bukan di container):
```bash
docker run --rm -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" certbot/certbot renew
```

### 10. Verifikasi final
```bash
curl -I https://DOMAIN/                        # 200, HSTS + cache header
curl -s  https://DOMAIN/api/v1/events | head   # data via TLS
docker compose ps                              # postgres healthy, api healthy
```

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
| 429 login padahal wajar | limit nginx 10r/m per IP; naikkan `rate` di `nginx.conf` bila perlu |
| Media rusak/404 | cek `R2_*` di `.env` + status bucket `metmal-gallery` (Cloudflare) |

## Keamanan singkat

- `POSTGRES_PASSWORD`/`JWT_SECRET` kuat & unik (`openssl rand -hex 32`).
- Port publik hanya 80/443; postgres container TIDAK di-map ke host — akses via
  `docker compose exec` saja (Postgres native host di 127.0.0.1:5432 milik box,
  tidak tersentuh).
- Update image rutin: `docker compose pull && docker compose up -d`.
- Backup `pgdata` (mis. `pg_dump` terjadwal) — volume di VPS bukan replikasi.
