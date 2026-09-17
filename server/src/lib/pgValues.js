/**
 * Konversi nilai untuk kolom Postgres non-skalar.
 *
 * Latar: `events.categories` / `draft_events.categories` bertipe **TEXT[]**,
 * sedangkan `day_time_slots` bertipe **JSONB**. Mengirim `JSON.stringify(...)`
 * ke kolom TEXT[] menghasilkan string `'["Kompetisi"]'` yang ditolak Postgres
 * dengan `malformed array literal` (ERRCODE 22P02). Helper ini memastikan
 * array dikirim sebagai array JS (node-postgres men-serialize ke literal
 * array Postgres) dan JSONB dikirim sebagai string JSON.
 */

/** text[] value: array → array (pg serialize); string JSON/teks → array. */
export function toTextArray(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value;
  const raw = String(value).trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  }
  return [raw];
}

/** JSONB value: stringify object/array; string yang sudah JSON dipakai apa adanya. */
export function toJsonb(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}
