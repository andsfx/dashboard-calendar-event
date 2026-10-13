# Verifikasi read-only: perbaikan `/tenant/events` (2026-10-04)

Bukti bahwa predicate baru mengembalikan event yang benar, dijalankan **hanya
SELECT** terhadap produksi (`ssh medprom` → `docker exec metmal-postgres psql`).
Tidak ada INSERT/UPDATE/DELETE; tidak ada panggilan AI.

## Sebelum (kode produksi saat audit)

```sql
SELECT e.id, e.acara, e.tanggal, e.lokasi, e.eo, e.status
  FROM events e
 WHERE e.status IN ('past','ongoing')
   AND e.id = ANY((SELECT coalesce(array_agg(event_id),'{}')
                     FROM tenant_survey_config WHERE is_active=true)::text[])
 ORDER BY e.tanggal DESC LIMIT 200;
```

Hasil: **1 baris**

```
evt_848934596125|METMAL BEKASI KIDS FUN RUN 2026|12 Juli 2026|Metland|LDAI|past
```

## Sesudah (SQL yang dirender helper `eventWindow.js`)

```sql
SELECT e.id, e.acara, e.tanggal, e.lokasi, e.eo,
       CASE WHEN to_date(e.date_str,'YYYY-MM-DD') < '2026-10-04'::date
                 AND (e.date_end IS NULL OR e.date_end < '2026-10-04'::date)
            THEN 'past' ELSE 'ongoing' END AS status
  FROM events e
 WHERE e.status <> 'draft'
   AND ( e.date_str ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
         AND to_date(e.date_str,'YYYY-MM-DD') <= '2026-10-04'::date )
   AND e.id = ANY((SELECT coalesce(array_agg(event_id),'{}')
                     FROM tenant_survey_config WHERE is_active=true)::text[])
 ORDER BY e.date_str DESC LIMIT 200;
```

Hasil: **5 baris** (semua event ber-survey aktif)

```
3ccdf1af-5c77-4366-a256-3b7e73b08116|Beauty Fair by Watsons|21 September 2026|Panggung Lt. Dasar|Watsons|ongoing
d26f7953-1113-4166-906e-1f0f12311546|Tamiya Race|20 September 2026|Panggung Funworld Lt. 3||past
evt_11b309eef543|Kompetisi Tari Sanggar Srikandi|19 September 2026|Panggung Funworld Lt. 3|Sanggar Tari Srikandi|past
evt_38013fe18a35|Kompetisi Tari Sanggar Srikandi|30 Agustus 2026|Panggung Funworld Lt. 3|Sanggar Tari Srikandi|past
evt_848934596125|METMAL BEKASI KIDS FUN RUN 2026|12 Juli 2026|Metland|LDAI|past
```

Catatan: `3ccdf1af` benar `ongoing` — `date_end`-nya melewati hari ini, jadi
event multi-day yang sedang berjalan TIDAK hilang (bukti bahwa predicate
"mulai" lebih tepat daripada `COALESCE(date_end,date_str) <= today`).

## Dampak data

12 submission tenant survey terkait 4 event yang tadinya tidak tampil:
`evt_38013fe18a35` = 10, `d26f7953…` = 1, `3ccdf1af…` = 1.

## Status

Perbaikan **belum dideploy**. Verifikasi ini hanya membuktikan predicate-nya
benar terhadap data produksi nyata; produksi masih memakai kode lama sampai
migrasi + deploy dijalankan.
