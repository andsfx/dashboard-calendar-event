# Development lokal

## Alur harian

Jalankan perintah dari root repo. Gunakan container dan `.env.development.local` yang sudah ada; setup mesin baru ada di bawah.

1. Nyalakan engine Docker di Kiri, lalu periksa target sebelum menjalankan container atau sync:

   ```sh
   docker context show
   docker context inspect --format '{{.Endpoints.docker.Host}}'
   docker info --format '{{.ServerVersion}}'
   ```

   Setup Kiri memakai context `kiri` dengan endpoint `npipe:////./pipe/kiri`. Pastikan endpoint benar-benar milik mesin lokal; pada Linux/macOS gunakan socket Unix lokal. Berhenti jika endpoint menunjuk host remote.

2. Jalankan database yang sudah ada dan periksa binding tanpa menampilkan env container:

   ```sh
   docker start metmal-local-postgres
   docker port metmal-local-postgres 5432/tcp
   docker exec metmal-local-postgres pg_isready -U metmal_local -d metmal_local
   ```

   Binding yang diharapkan `127.0.0.1:55432`; tunggu sampai Postgres menerima koneksi.

3. Opsional: ambil snapshot baru setelah memastikan target Docker lokal pada langkah 1 dan binding pada langkah 2.

   **Sync menimpa perubahan database lokal**, memutus koneksi aplikasi, dan dapat membuat sesi browser lama tidak berlaku. Hentikan API lokal terlebih dahulu, simpan pekerjaan yang perlu dipertahankan, lalu jalankan:

   ```sh
   node scripts/sync-local-db.mjs
   ```

   Tunggu sampai restore dan pembuatan/reset akun development selesai. Untuk pekerjaan harian dengan data yang sudah tersedia, lewati langkah ini.

4. Jalankan API di terminal pertama. Pilih perintah sesuai shell.

   Bash:

   ```bash
   NODE_ENV=development DOTENV_CONFIG_PATH=.env.development.local DOTENV_CONFIG_OVERRIDE=true npm run dev:api
   ```

   PowerShell:

   ```powershell
   $env:NODE_ENV = 'development'
   $env:DOTENV_CONFIG_PATH = '.env.development.local'
   $env:DOTENV_CONFIG_OVERRIDE = 'true'
   npm run dev:api
   ```

   Biarkan terminal ini berjalan. API mendengarkan pada `http://localhost:3001`.

5. Jalankan SPA di terminal kedua:

   ```sh
   npm run dev
   ```

   Gunakan `http://localhost:5173/dashboard`; pertahankan host `localhost` selama login agar cookie konsisten.

6. Login melalui form browser dengan `dev@localhost` dan `ADMIN_PASSWORD` dari `.env.development.local`. Baca password secara lokal tanpa mencetaknya ke log, chat, atau command line. Server membuat cookie sesi HttpOnly. Jalankan smoke di bawah sebelum menyatakan development siap.

## Arsitektur dan sumber env

SPA Vite pada port `5173` mengirim `/api` melalui proxy `vite.config.ts` ke API lokal port `3001` (`changeOrigin: true`). API memakai Postgres Docker pada `127.0.0.1:55432`, database/user `metmal_local`, dengan volume `metmal-local-pgdata`.

- `.env.development.local` adalah sumber konfigurasi development yang disimpan lokal dan diabaikan Git.
- `VITE_API_URL` kosong memakai jalur same-origin melalui proxy. Pertahankan `VITE_DEV_AUTO_LOGIN=false` di file development; nilainya mengalahkan `true` legacy di `.env.local` saat Vite memuat mode development.
- `npm run dev:api` menjalankan `node server/src/index.js`, yang mengimpor `dotenv/config`. `DOTENV_CONFIG_PATH` memilih file lokal; `DOTENV_CONFIG_OVERRIDE=true` sengaja mengalahkan env proses yang diwarisi, termasuk `ADMIN_PASSWORD`.
- Tanpa override, dotenv mempertahankan env proses yang sudah ada. Pemilihan file saja tidak menjamin password lokal menang.
- Pertahankan key integrasi R2/MID/APIFY kosong di env development. File `.env` root memiliki konfigurasi cloud; gunakan file lokal dan override eksplisit agar konfigurasi lokal yang dipakai.

Restart API setelah mengubah env backend dan restart Vite setelah mengubah env frontend.

## Checkout atau mesin baru

Gunakan Node.js `24.x` (terverifikasi dengan `v24.15.0`) dan npm sebagai package manager, lalu jalankan `npm ci` dari root repo. Siapkan Docker dan SSH client. Untuk akses snapshot, konfigurasi alias SSH `medprom` beserta key privat melalui [akses database VPS](vps-db-access.md); simpan kredensial di mesin sendiri.

Buat `.env.development.local` secara privat. Isi checklist berikut tanpa menyalin kredensial produksi:

| Key | Nilai lokal |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER` | Keduanya `metmal_local`; helper query/restore memakai nama ini secara tetap |
| `POSTGRES_PASSWORD` | Password lokal baru yang kuat |
| `DATABASE_URL` | URL Postgres ke `127.0.0.1:55432`, db/user `metmal_local`, password sama dengan container; encode karakter khusus dalam URL |
| `JWT_SECRET` | Secret lokal baru |
| `ADMIN_EMAIL`, `ADMIN_NAME` | `dev@localhost`, `MetmalLocalDev` |
| `ADMIN_PASSWORD` | Password development lokal baru, minimal 8 karakter |
| `NODE_ENV`, `PORT` | `development`, `3001` |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` |
| `COOKIE_DOMAIN`, `COOKIE_SAMESITE`, `COOKIE_SECURE` | Kosong, `lax`, `false` |
| `VITE_API_URL`, `VITE_DEV_AUTO_LOGIN` | Kosong, `false` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `MID_API_KEY`, `APIFY_API_TOKEN` | Isi masing-masing key dengan nilai kosong untuk development lokal |

Pastikan file env dan `.deploy/prod-snapshot.dump` tetap diabaikan Git. Jangan tampilkan isi env atau `docker inspect` lengkap karena dapat memuat rahasia.

Lakukan preflight Docker pada alur harian. Jika container belum ada, buat sekali dengan perintah satu baris yang sama untuk Bash dan PowerShell:

```sh
docker run --name metmal-local-postgres --label app=metmal-local --restart unless-stopped --env-file .env.development.local -p 127.0.0.1:55432:5432 -v metmal-local-pgdata:/var/lib/postgresql/data -d postgres:16-alpine
```

Tunggu `pg_isready`, lalu lakukan sync pada langkah 3. Snapshot membawa schema dan data, sehingga tidak perlu migrasi manual sebelum restore. Jalankan migrasi fitur baru setelah sync sesuai kebutuhan perubahan. Lanjutkan dengan API, SPA, dan login pada langkah 4 sampai 6.

## Snapshot dan batas perlindungan

`scripts/sync-local-db.mjs` mengutamakan `DATABASE_URL` serta identitas/password admin dari `.env.development.local`, lalu memakai env proses sebagai fallback. Script menjalankan `pg_dump` read-only lewat SSH `medprom` dari `/opt/metmal/deploy/vps`, menyimpan `.deploy/prod-snapshot.dump`, menghentikan koneksi database lokal, lalu menjalankan `pg_restore --clean --if-exists` dan membuat/reset akun development.

Jika alias utama tidak dapat dipakai, pilih alias SSH yang sudah dikonfigurasi secara privat melalui env proses `PROD_SSH_HOST=medprom-ts` (Bash: awali perintah sync dengan assignment; PowerShell: set `$env:PROD_SSH_HOST = 'medprom-ts'` dahulu).

Guard script memeriksa host URL loopback, label container `app=metmal-local`, kecocokan published port, serta `POSTGRES_DB`/`POSTGRES_USER` terhadap URL. Restore berjalan lewat `docker exec` ke container, bukan lewat URL. Script masih menerima binding wildcard (`0.0.0.0`/`::`) dan tidak memvalidasi locality Docker context. Karena itu, pemeriksaan endpoint lokal dan binding `127.0.0.1:55432` tetap tanggung jawab operator sebelum sync.

Snapshot memuat PII dan akun pengguna produksi. Simpan dump lokal secara privat; jangan unggah dump, isi tabel, env, atau kredensial ke repo maupun percakapan. Pengambilan snapshot dan pemeriksaan produksi cukup read-only; workflow ini tidak memerlukan deploy atau penulisan ke produksi.

Database lokal terisolasi, tetapi media dan integrasi cloud belum tentu demikian. Key cloud development sengaja kosong. Jika kredensial R2 atau layanan lain diisi kembali, upload, hapus media, atau aksi integrasi dapat menyentuh layanan live meskipun database tetap lokal.

## Smoke dan kondisi selesai

Dengan API dan SPA berjalan, gunakan salah satu shell berikut. Periksa hasil tanpa menyalin payload data produksi ke laporan.

Bash:

```bash
curl -fsS http://localhost:3001/healthz
curl -fsS http://localhost:5173/api/v1/events | node -e "let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>console.log('events:',JSON.parse(s).data.length))"
```

PowerShell:

```powershell
$health = Invoke-RestMethod 'http://localhost:3001/healthz'
$health.success
$health.data.db
$events = Invoke-RestMethod 'http://localhost:5173/api/v1/events'
@($events.data).Count
```

Hasil yang diharapkan: HTTP `200`, health `success=true` dan `data.db=true`, lalu `data` events berupa array tidak kosong setelah snapshot. Jumlah record berubah mengikuti snapshot; jangan memakai angka tetap sebagai syarat berhasil.

Di browser, login melalui form asli, buka dashboard, dan pastikan data terlihat. Muat ulang dashboard; pada Network DevTools, `/api/v1/auth/me` harus membalas `200` dengan pengguna berperan `superadmin`. Sesi yang disuntikkan ke frontend atau hasil request tanpa browser tidak membuktikan login browser berhasil. Jika diminta membuka/login browser, biarkan tab hasilnya terbuka.

Development siap setelah health, proxy events, dashboard, dan autentikasi browser memenuhi kondisi tersebut. Untuk perubahan kode berikutnya, jalankan build repo, tes area yang disentuh, dan smoke yang relevan sebelum handoff.

## Troubleshooting

| Gejala | Tindakan |
| --- | --- |
| Docker tidak berjalan atau context salah | Nyalakan engine Kiri. Pilih `docker context use kiri` bila memakai setup Kiri, lalu ulangi pemeriksaan endpoint lokal. Hindari context SSH/TCP remote. |
| Database tidak tersedia / health `data.db=false` | Periksa `docker start`, binding port, dan `pg_isready`; cocokkan URL lokal serta password container secara privat. Mengubah env file tidak mengganti password volume Postgres yang sudah ada. |
| Request same-origin `/api` gagal atau mendapat HTML | Pastikan API port `3001` hidup, SPA port `5173`, `VITE_API_URL` kosong, dan proxy aktif; restart Vite. Jangan mengarahkan frontend ke API produksi untuk menutupi backend lokal yang mati. |
| Tampak login tetapi API admin `401` | Pastikan `VITE_DEV_AUTO_LOGIN=false`, restart Vite, lalu login melalui form. Bypass hanya memalsukan user frontend dan tidak membuat cookie server. |
| Password lokal ditolak | Jalankan API dengan path dan override di atas; shell dapat mewarisi `ADMIN_PASSWORD` lain. Jika password file diubah setelah sync, akun DB masih memakai password sebelumnya sampai direset. |
| Sesi rusak atau pekerjaan lokal hilang setelah sync | Restore mengganti data lokal dan dapat menginvalidasi sesi. Restart API, logout/login kembali. Simpan pekerjaan sebelum refresh; jangan menjalankan sync sebagai langkah pemulihan rutin. |

## Pemakaian oleh editor dan agen

`AGENTS.md` dan `README.md` menunjuk panduan ini. Bila editor atau agen tidak memuat `AGENTS.md` otomatis, gunakan prompt awal: `Baca AGENTS.md dan docs/agents/local-development.md sebelum menjalankan development lokal.`
