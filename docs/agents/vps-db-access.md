# Akses DB Produksi via Tailscale (read-only)

Prosedur untuk memeriksa database Postgres produksi (stack `metmal` di VPS).
Tujuan: verifikasi cepat — distribusi data, status migrasi, sanity check kolom —
**tanpa memutasi data produksi**.

## Prasyarat

1. Tailscale aktif di mesin lokal:
   ```bash
   "C:/Program Files/Tailscale/tailscale.exe" status
   ```
   Cari baris `vm-2-245-ubuntu` dengan status `active`.
2. Alias SSH sudah ada di `~/.ssh/config` (`medprom-ts` → Tailscale
   `100.69.24.32`, `medprom` → IP publik `43.134.72.148`), memakai kunci
   `~/.ssh/evonic_local` sebagai `root`.

## Akses

```bash
# Lewat Tailscale (jalur utama bila IP publik diblokir/berubah)
ssh medprom-ts 'hostname'

# Lewat IP publik (fallback)
ssh medprom
```

> **Pertama kali** `medprom-ts` bisa meminta satu kali auth browser
> ("Tailscale SSH requires an additional check"). Setelah itu tersimpan dan
> perintah non-interaktif (`BatchMode=yes`) langsung jalan.
>
> **JANGAN** `ssh vm-2-245-ubuntu` tanpa alias — policy tailnet menolak user
> `malme` ("tailnet policy does not permit you to SSH as user"). Selalu sebagai
> `root` lewat alias.

## Query

Postgres tidak di-expose ke host; masuk lewat container:

```bash
ssh medprom-ts 'cd /opt/metmal/deploy/vps && docker compose exec -T postgres \
  psql -U metmal -d metmal -c "SELECT 1;"'
```

Beberapa perintah siap pakai:

```bash
# Distribusi lifecycle `events.status` (harus hanya 'draft' | 'published' setelah ADR 008)
ssh medprom-ts 'cd /opt/metmal/deploy/vps && docker compose exec -T postgres \
  psql -U metmal -d metmal -c "SELECT status, count(*) FROM events GROUP BY status ORDER BY 2 DESC;"'

# Berapa yang terlihat publik vs disembunyikan (gerbang: status <> '"'"'draft'"'"')
ssh medprom-ts 'cd /opt/metmal/deploy/vps && docker compose exec -T postgres \
  psql -U metmal -d metmal -c "SELECT count(*) FILTER (WHERE status <> '"'"'draft'"'"') AS terlihat_publik, count(*) FILTER (WHERE status = '"'"'draft'"'"') AS tersembunyi FROM events;"'

# Apakah migrasi lifecycle (constraint) sudah terpasang?
ssh medprom-ts 'cd /opt/metmal/deploy/vps && docker compose exec -T postgres \
  psql -U metmal -d metmal -c "SELECT conname FROM pg_constraint WHERE conname = '"'"'chk_events_status_lifecycle'"'"';"'
```

## Aturan

- **Read-only.** Jangan `UPDATE`/`DELETE`/`INSERT` ke produksi untuk verifikasi.
  Untuk membuktikan gerbang visibilitas, cukup bandingkan predikat
  (`status <> 'draft'`) terhadap data yang ada, atau minta izin dulu untuk
  transaksi yang di-`ROLLBACK` (tidak ada perubahan persisten).
- **Jangan cetak nilai rahasia.** `DATABASE_URL`, `JWT_SECRET`,
  `POSTGRES_PASSWORD`, `R2_*` tidak pernah dikutip ke output/docs. Untuk
  memastikan `.env` ada, cukup cek keberadaan file — jangan isinya.
- Query agregat lebih baik daripada `SELECT *` (hindari menarik PII ke output).
- Migrasi baru dijalankan **manual** di VPS dan **sebelum** kode terkait
  di-deploy:
  ```bash
  ssh medprom-ts 'cd /opt/metmal/deploy/vps && docker compose exec -T postgres \
    psql -U metmal -d metmal' < server/migrations/<file>.sql
  ```
