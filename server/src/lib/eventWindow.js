/**
 * Jendela tanggal event — sumber tunggal untuk "sudah mulai?" di SQL.
 *
 * ADR 002: status operasional event DITURUNKAN dari tanggal, tidak pernah
 * disimpan sebagai otoritas. Kolom `events.status` masih ada di DB karena
 * ia menyimpan dua hal berbeda:
 *   1. flag lifecycle `draft` — gerbang visibilitas publik (public.js / OG)
 *   2. nilai temporal basi (`upcoming|ongoing|past`) yang TIDAK boleh dipakai
 *      sebagai sumber kebenaran — `publishDraft` tidak pernah mengisinya, jadi
 *      setiap event dari draft terkunci 'upcoming' selamanya (produksi: 258/258).
 *
 * Karena itu predikat SQL tidak boleh `status IN ('past','ongoing')`.
 * Yang benar adalah "sudah mulai": tanggal mulai sudah tercapai — mencakup
 * event yang sudah selesai (past) maupun yang sedang berjalan (ongoing).
 * `COALESCE(date_end, date_str) <= today` juga salah: event multi-day yang
 * mulai sebelum hari ini tetapi belum selesai ikut hilang.
 *
 * Konvensi lokal: "hari ini" = Asia/Jakarta (WIB), bukan UTC. `events.date_str`
 * bertipe TEXT berisi tanggal kalender lokal, jadi batasannya harus dihitung di
 * zona itu juga — `CURRENT_DATE` di DB menghasilkan UTC dan melenceng satu
 * hari pada window 00:00–07:00 WIB.
 *
 * KESELAMATAN CAST (penting): `date_str` bertipe TEXT dan bisa berisi nilai
 * non-tanggal (impor legacy, mis. "12 Juli 2026"). `to_date` pada nilai seperti
 * itu melempar 22007/22008 dan membunuh seluruh query — bukan hanya baris itu.
 * Pola `col ~ regex AND to_date(col, …)` TIDAK aman: Postgres boleh mengevaluasi
 * operand dalam urutan apa pun, jadi `to_date` bisa tetap dijalankan pada baris
 * yang gagal regex. Satu-satunya bentuk yang dijamin urutannya adalah
 * `CASE WHEN col ~ regex THEN to_date(col, …) END` — CASE mengevaluasi cabang
 * WHEN secara berurutan dan hanya cabang yang menang yang dieksekusi. Semua
 * helper di file ini memakai bentuk itu; jangan diganti menjadi `AND`.
 */

/**
 * Regex tanggal kalender yang aman di-cast: tahun 4 digit, bulan 01-12,
 * hari 01-31. Sengaja TIDAK longgar (`\d{2}`) — `2026-13-01` lolos pola
 * longgar tapi membuat `to_date` melempar `invalid_datetime_format`.
 * Hari seperti `31` di bulan 30-29 tidak error (to_date menggesernya), hanya
 * bergeser — jauh lebih baik daripada request mati.
 */
const SAFE_ISO_DATE = '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$';

/** Kalender hari ini di Asia/Jakarta, sebagai 'YYYY-MM-DD'. */
export function jakartaToday(now = new Date()) {
  // toLocaleDateString('en-CA') menormalkan ke format YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Tanggal aman sebagai DATE, atau NULL bila kolomnya bukan tanggal valid.
 *
 * `CASE` (bukan `AND`) memastikan `to_date` hanya dieksekusi untuk nilai yang
 * sudah lolos regex — lihat catatan KESELAMATAN CAST di atas.
 *
 * @param {string} column kolom TEXT tanggal (prefix-alias seperti `e.date_str`)
 */
export function safeDate(column) {
  return `CASE WHEN ${column} ~ '${SAFE_ISO_DATE}' THEN to_date(${column}, 'YYYY-MM-DD') END`;
}

/**
 * Predicate "sudah mulai" untuk daftar event, memakai tanggal hari ini WIB
 * yang di-bind parameter (bukan diinterpolasi ke SQL).
 *
 * Baris yang tanggalnya tidak valid menghasilkan NULL → tidak lolos (aman).
 *
 * @param {string} column kolom TEXT tanggal (prefix-alias seperti `e.date_str`)
 * @param {string|number} todayParam placeholder parameter yang berisi
 *        hasil {@link jakartaToday}, mis. `'$2'` atau `'2'`
 * @returns {string} ekspresi SQL yang true bila event sudah mulai
 */
export function startedOnOrBefore(column, todayParam) {
  return `(${safeDate(column)} IS NOT NULL AND ${safeDate(column)} <= ${todayParam}::date)`;
}

/**
 * Predicate "belum mulai" — kebalikan tegas dari {@link startedOnOrBefore}.
 *
 * Bentuknya eksplisit, bukan `NOT (startedOnOrBefore(...))`:
 *   - `startedOnOrBefore` menganggap baris tidak valid sebagai TIDAK mulai
 *     (safeDate NULL → tidak lolos).
 *   - `NOT (...)` atas NULL tetap NULL, sehingga baris rusak justru LOLOS
 *     sebagai "belum mulai" — persis kebalikan dari yang diinginkan untuk
 *     daftar yang hanya boleh menampilkan event terverifikasi.
 *
 * Di sini baris tidak valid sengaja DIKECUALIKAN: "belum mulai" hanya boleh
 * berlaku untuk tanggal yang benar-benar bisa dibaca dan memang di masa depan.
 *
 * @param {string} column kolom TEXT tanggal
 * @param {string|number} todayParam placeholder parameter berisi jakartaToday
 */
export function notStartedOn(column, todayParam) {
  return `(${safeDate(column)} IS NOT NULL AND ${safeDate(column)} > ${todayParam}::date)`;
}

/**
 * CASE status untuk event yang lolos {@link startedOnOrBefore}.
 *
 * `date_end` bertipe DATE (bukan TEXT), jadi tidak boleh diberi regex guard dan
 * harus menangani NULL eksplisit: tanpa itu `NULL < tanggal` menghasilkan NULL
 * dan event single-day — yang `date_end`-nya NULL — semua jatuh ke ELSE.
 *
 * ELSE mengembalikan 'ongoing', bukan 'upcoming': pemanggil selalu memakai ini
 * setelah `startedOnOrBefore`, jadi baris yang lolos sudah pasti sudah mulai.
 *
 * @param {string} startCol kolom tanggal mulai (TEXT)
 * @param {string} endCol   kolom tanggal akhir (DATE, boleh NULL)
 * @param {string|number} todayParam placeholder parameter berisi jakartaToday
 * @returns {string} ekspresi SQL `CASE … END` yang menghasilkan 'past'/'ongoing'
 */
export function startedStatusCase(startCol, endCol, todayParam) {
  return `CASE
    WHEN ${safeDate(startCol)} < ${todayParam}::date
         AND (${endCol} IS NULL OR ${endCol} < ${todayParam}::date)
      THEN 'past'
    ELSE 'ongoing'
  END`;
}

/** Pola regex yang dipakai helper ini (diekspor untuk dokumentasi/tes). */
export const SAFE_DATE_PATTERN = SAFE_ISO_DATE;