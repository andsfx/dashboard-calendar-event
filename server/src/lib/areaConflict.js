/**
 * Deteksi double-booking area di server — cermin `src/utils/areaConflict.ts`.
 *
 * `events.area_id` bertipe TEXT (FK `event_areas`, ON DELETE SET NULL);
 * `events.date_str` bertipe TEXT dan bisa berisi nilai non-tanggal legacy
 * (impor lama, mis. "12 Juli 2026"); `events.date_end` bertipe DATE asli.
 *
 * Predikat overlap identik dengan klien: rentang event lain = [date_str,
 * date_end ?? date_str]; overlap bila `start2 <= end1 AND end2 >= start1`.
 * `safeDate` (pola CASE) WAJIB untuk `date_str` — `date_str::date` langsung
 * melempar 22007/22008 pada baris legacy dan membunuh seluruh query.
 */
import { safeDate } from './eventWindow.js';

const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Apakah nilai berupa string tanggal 'YYYY-MM-DD' yang sah? */
export function isIsoDateString(value) {
  return typeof value === 'string' && ISO_DATE_RE.test(value);
}

/**
 * SQL predicate + parameter untuk query baris konflik, atau `null` bila guard
 * tidak relevan (tanpa area / rentang tidak valid). Area kosong / tanggal
 * rusak = lewati guard; alur lama tetap menolak lewat PG_INPUT_ERRORS.
 *
 * @param {string|null} areaId
 * @param {string} dateStr
 * @param {string|null|undefined} dateEnd
 * @param {string|null} excludeEventId
 * @returns {{ where: string, params: string[] } | null}
 *   `where` memakai $1 = areaId, $2 = tanggal mulai, $3 = tanggal akhir
 *   (dan $4 = id event yang dikecualikan bila ada). Dipakai bersama query:
 *
 *     SELECT COUNT(*)::int AS total,
 *            COALESCE((SELECT name FROM event_areas WHERE id = $1), $1) AS area_name
 *     FROM events e
 *     WHERE <where>
 */
export function areaConflictPredicate(areaId, dateStr, dateEnd, excludeEventId) {
  if (!areaId || !isIsoDateString(dateStr)) return null;
  const end = dateEnd ?? dateStr;
  if (!isIsoDateString(end)) return null;

  const params = [areaId, dateStr, end];
  const otherStart = safeDate('e.date_str');
  const otherEnd = `COALESCE(e.date_end, ${safeDate('e.date_str')})`;
  // Gerbang yang sama dengan kanal publik (`public.js`: `status <> 'draft'`),
  // bukan `= 'published'`: label temporal basi (upcoming/ongoing/past) tetap
  // TAMPIL di halaman publik, jadi event itu juga harus ikut memblok area.
  // Memakai `= 'published'` membuat baris seperti itu tak terlihat guard.
  let where = `e.area_id = $1 AND e.status <> 'draft'`
    + ` AND ${otherStart} <= $3::date`
    + ` AND ${otherEnd} >= $2::date`;

  if (excludeEventId) {
    params.push(excludeEventId);
    where += ` AND e.id <> $${params.length}`;
  }
  return { where, params };
}
