/**
 * Pick only allowlisted keys from a client payload.
 * Prevents mass-assignment of privileged columns via service_role inserts/updates.
 *
 * @param {unknown} input
 * @param {readonly string[]} allowed
 * @returns {Record<string, unknown>}
 */
export function pickFields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      out[key] = input[key];
    }
  }
  return out;
}

/** @param {unknown} rows @param {readonly string[]} allowed */
export function pickFieldsMany(rows, allowed) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => pickFields(row, allowed));
}

// ── Column allowlists (must match client mappers in supabaseApi.ts) ──

export const EVENT_FIELDS = Object.freeze([
  'date_str', 'date_end', 'day', 'tanggal', 'jam', 'acara', 'lokasi',
  'eo', 'pic', 'phone', 'keterangan', 'month', 'status', 'category',
  'categories', 'priority', 'event_model', 'event_nominal', 'event_model_notes',
  'source_draft_id', 'is_multi_day', 'day_time_slots', 'event_type',
  'recurrence_group_id', 'is_recurring', 'poster_url',
]);

// progress ok; published/deleted only via publishDraft/deleteDraft/restoreDraft
export const DRAFT_FIELDS = Object.freeze([
  'date_str', 'date_end', 'day', 'tanggal', 'jam', 'acara', 'lokasi',
  'eo', 'pic', 'phone', 'keterangan', 'internal_note', 'month', 'category',
  'categories', 'priority', 'event_model', 'event_nominal', 'event_model_notes',
  'progress', 'is_multi_day', 'day_time_slots', 'event_type',
  'recurrence_group_id', 'is_recurring',
]);

export const THEME_FIELDS = Object.freeze([
  'name', 'date_start', 'date_end', 'color',
]);

export const ALBUM_FIELDS = Object.freeze([
  'name', 'slug', 'description', 'event_date', 'event_id', 'lokasi',
  'theme_id', 'cover_photo_url', 'sort_order',
]);

export const EVENT_PHOTO_FIELDS = Object.freeze([
  'url', 'caption', 'event_id', 'event_date', 'album_id', 'sort_order',
]);
