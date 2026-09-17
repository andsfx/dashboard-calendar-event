/**
 * Routes admin — POST /api/v1/admin/:action
 *
 * Kontrak: body { action, ...payload } divalidasi ACTION_SCHEMAS zod server
 * (server/src/lib/schemas.js). Validasi per action, role guard staff
 * (superadmin/admin), respons FLAT { success, error?, data?/id?/results? }
 * — persis yang dibaca adminAction() frontend (src/utils/api/_shared.ts).
 *
 * Implementasi: seluruh aksi ACTION_SCHEMAS (events CRUD + recurring series +
 * themes + drafts lengkap + site settings + albums & foto + event photos +
 * event areas & foto area + registrations + news + sponsorship/proposal +
 * read-only list). Pola: pakai req.db.query, respons flat, log via logActivity.
 * Penghapusan media memakai helper R2 di server/src/r2.js (best-effort atau
 * throw — mirror api/supabase-admin.js m-1/m-2/m-3 audit).
 *
 * Role guard tambahan per action bisa diperketat (matriks
 * tenant-survey.js) bila perlu — default staff roles.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { requireRole, logActivity } from '../auth.js';
import { validateAction } from '../lib/schemas.js';
import { toTextArray, toJsonb } from '../lib/pgValues.js';
import { enforceRateLimit } from '../lib/rateLimit.js';
import {
  deleteR2File,
  deleteR2FileOrThrow,
  headR2File,
  MAX_PROPOSAL_BYTES,
  verifyMimeMagicBytes,
} from '../r2.js';

const router = Router();

// ─── Gate umum: staff roles + rate limit longgar + zod validation ─
router.post('/:action', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  const action = req.params.action;

  // 120 req / menit per IP utk seluruh aksi admin (anti-burst; longgar).
  if (!enforceRateLimit(req, res, 'admin', 120, 60 * 1000)) return;

  // Boundary: unknown → trusted (zod schema per action).
  const validated = validateAction(req.body);
  if (!validated.ok) {
    return res.status(400).json({ success: false, error: validated.error });
  }
  req.body = validated.data;

  try {
    const result = await switchAction(action, req);
    if (result === undefined) return; // handler sudah kirim respons
    res.json(result);
  } catch (err) {
    if (err?.code === 'DB_UNAVAILABLE') return next(err);
    // 23505 = unique violation; terjemahkan ramah pengguna (pola legacy).
    if (String(err?.code) === '23505') {
      return res.status(409).json({ success: false, error: 'Data sudah ada (duplikat). Periksa kembali.' });
    }
    console.error(`[admin/${action}]`, err);
    res.status(500).json({ success: false, error: err?.message || 'Terjadi kesalahan server' });
  }
});

// ─── Kolom yang boleh di-insert/update via payload passthrough (hindari
// overwrite PK/timestamp; mirror whitelist updateEvent/updateTheme). ───────
const DRAFT_COLUMNS = new Set([
  'date_str', 'date_end', 'day', 'tanggal', 'jam', 'acara', 'lokasi', 'area_id', 'eo',
  'pic', 'phone', 'keterangan', 'internal_note', 'month', 'category', 'categories',
  'priority', 'event_model', 'event_nominal', 'event_model_notes', 'progress',
  'published', 'published_at', 'deleted', 'deleted_at', 'is_multi_day',
  'day_time_slots', 'event_type', 'recurrence_group_id', 'is_recurring',
]);

const AREA_COLUMNS = new Set(['name', 'description', 'cover_photo_url', 'sort_order', 'is_active']);

const NEWS_COLUMNS = new Set(['title', 'slug', 'excerpt', 'content', 'cover_image_url', 'author', 'status']);

async function switchAction(action, req) {
  const { body } = req;
  const auth = req.auth;

  switch (action) {
    // ══════════ EVENTS ══════════
    case 'createEvent': {
      const data = body.data || {};
      const { rows } = await db.query(
        `INSERT INTO events (date_str, date_end, day, tanggal, jam, lokasi, area_id, acara, eo, pic, phone,
                             keterangan, month, status, category, categories, priority, event_model, event_nominal,
                             event_model_notes, source_draft_id, is_multi_day, day_time_slots, event_type,
                             recurrence_group_id, is_recurring, poster_url, organization_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
         RETURNING id`,
        [
          data.date_str, data.date_end ?? null, data.day ?? '', data.tanggal ?? '', data.jam ?? '',
          data.lokasi ?? '', data.area_id ?? null, data.acara, data.eo ?? '', data.pic ?? '',
          data.phone ?? '', data.keterangan ?? '', data.month ?? '', data.status ?? 'upcoming',
          data.category ?? 'Umum', toTextArray(data.categories ?? []), data.priority ?? 'medium',
          data.event_model ?? '', data.event_nominal ?? '', data.event_model_notes ?? '',
          data.source_draft_id ?? '', data.is_multi_day ?? false,
          data.day_time_slots ? JSON.stringify(data.day_time_slots) : null,
          data.event_type ?? 'single', data.recurrence_group_id ?? '', data.is_recurring ?? false,
          data.poster_url ?? null, data.organization_id ?? null,
        ],
      );
      const id = rows[0]?.id || '';
      logActivity(auth.user, 'create_event', 'event', id, { acara: data.acara }, req);
      return { success: true, id };
    }

    case 'updateEvent': {
      if (!body.id) return { success: false, error: 'ID event wajib diisi' };
      const data = body.data || {};
      const keys = Object.keys(data);
      if (keys.length === 0) return { success: false, error: 'Tidak ada perubahan' };

      // Whitelist kolom yang boleh di-update (hindari overwrite PK/timestamp).
      const ALLOWED = new Set([
        'date_str', 'date_end', 'day', 'tanggal', 'jam', 'lokasi', 'area_id', 'acara', 'eo',
        'pic', 'phone', 'keterangan', 'month', 'status', 'category', 'categories', 'priority',
        'event_model', 'event_nominal', 'event_model_notes', 'source_draft_id', 'is_multi_day',
        'day_time_slots', 'event_type', 'recurrence_group_id', 'is_recurring', 'poster_url',
        'organization_id',
      ]);
      const sets = [];
      const values = [];
      for (const key of keys) {
        if (!ALLOWED.has(key)) continue;
        const value = (key === 'categories')
          ? toTextArray(data[key])
          : key === 'day_time_slots'
            ? (data[key] === null || data[key] === undefined ? null : JSON.stringify(data[key]))
            : (data[key] ?? null);
        values.push(value);
        sets.push(`${key} = $${values.length}`);
      }
      if (sets.length === 0) return { success: false, error: 'Tidak ada perubahan' };
      values.push(body.id);

      await db.query(`UPDATE events SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
      logActivity(auth.user, 'update_event', 'event', body.id, { fields: keys }, req);
      return { success: true };
    }

    case 'deleteEvent': {
      if (!body.id) return { success: false, error: 'ID event wajib diisi' };
      await db.query('DELETE FROM events WHERE id = $1', [body.id]);
      logActivity(auth.user, 'delete_event', 'event', body.id, null, req);
      return { success: true };
    }

    case 'batchCreateEvents': {
      const rows = body.data;
      if (!Array.isArray(rows) || rows.length === 0) return { success: false, error: 'Data event tidak tersedia' };
      const ids = [];
      for (const data of rows) {
        const { rows: [created] } = await db.query(
          `INSERT INTO events (date_str, date_end, day, tanggal, jam, lokasi, area_id, acara, eo, pic, phone,
                               keterangan, month, status, category, categories, priority, event_model, event_nominal,
                               event_model_notes, source_draft_id, is_multi_day, day_time_slots, event_type,
                               recurrence_group_id, is_recurring, poster_url, organization_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
           RETURNING id`,
          [
            data.date_str, data.date_end ?? null, data.day ?? '', data.tanggal ?? '', data.jam ?? '',
            data.lokasi ?? '', data.area_id ?? null, data.acara, data.eo ?? '', data.pic ?? '',
            data.phone ?? '', data.keterangan ?? '', data.month ?? '', data.status ?? 'upcoming',
            data.category ?? 'Umum', toTextArray(data.categories ?? []), data.priority ?? 'medium',
            data.event_model ?? '', data.event_nominal ?? '', data.event_model_notes ?? '',
            data.source_draft_id ?? '', data.is_multi_day ?? false,
            data.day_time_slots ? JSON.stringify(data.day_time_slots) : null,
            data.event_type ?? 'single', data.recurrence_group_id ?? '', data.is_recurring ?? false,
            data.poster_url ?? null, data.organization_id ?? null,
          ],
        );
        if (created) ids.push(created.id);
      }
      logActivity(auth.user, 'batch_create_events', 'event', null, { count: ids.length }, req);
      return { success: true, results: ids.map((id) => ({ id })), count: ids.length };
    }

    case 'deleteRecurringSeries': {
      const groupId = body.groupId;
      if (!groupId) return { success: false, error: 'ID grup wajib diisi' };
      const { rowCount } = await db.query('DELETE FROM events WHERE recurrence_group_id = $1', [groupId]);
      logActivity(auth.user, 'delete_recurring_series', 'event', groupId, { deletedCount: rowCount || 0 }, req);
      return { success: true, deletedCount: rowCount || 0 };
    }

    // ══════════ ANNUAL THEMES ══════════
    case 'createTheme': {
      const data = body.data || {};
      const { rows } = await db.query(
        `INSERT INTO annual_themes (name, date_start, date_end, color) VALUES ($1, $2, $3, $4) RETURNING id`,
        [data.name, data.date_start, data.date_end, data.color || '#6366f1'],
      );
      const id = rows[0]?.id || '';
      logActivity(auth.user, 'create_theme', 'theme', id, { name: data.name }, req);
      return { success: true, id };
    }

    case 'updateTheme': {
      if (!body.id) return { success: false, error: 'ID tema wajib diisi' };
      const data = body.data || {};
      const keys = Object.keys(data);
      if (keys.length === 0) return { success: false, error: 'Tidak ada perubahan' };
      const sets = [];
      const values = [];
      for (const key of keys) {
        if (!['name', 'date_start', 'date_end', 'color'].includes(key)) continue;
        values.push(data[key] ?? null);
        sets.push(`${key} = $${values.length}`);
      }
      if (sets.length === 0) return { success: false, error: 'Tidak ada perubahan' };
      values.push(body.id);
      await db.query(`UPDATE annual_themes SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
      logActivity(auth.user, 'update_theme', 'theme', body.id, null, req);
      return { success: true };
    }

    case 'deleteTheme': {
      if (!body.id) return { success: false, error: 'ID tema wajib diisi' };
      await db.query('DELETE FROM annual_themes WHERE id = $1', [body.id]);
      logActivity(auth.user, 'delete_theme', 'theme', body.id, null, req);
      return { success: true };
    }

    // ══════════ DRAFT EVENTS (baca + alur terbit/hapus) ══════════
    case 'readDrafts': {
      const { rows } = await db.query(
        `SELECT * FROM draft_events WHERE deleted = false ORDER BY date_str ASC`,
      );
      return { success: true, data: rows };
    }

    case 'publishDraft': {
      const draftId = body.id;
      if (!draftId) return { success: false, error: 'ID draft wajib diisi' };
      const { rows } = await db.query('SELECT * FROM draft_events WHERE id = $1 LIMIT 1', [draftId]);
      const draft = rows[0];
      if (!draft) return { success: false, error: 'Draft tidak ditemukan' };
      // Hard forbid re-publish (T-002 / ADR 001).
      if (draft.published) return { success: false, error: 'Draft sudah diterbitkan' };
      if (draft.deleted) return { success: false, error: 'Draft sudah dihapus' };
      if (draft.progress !== 'confirm') return { success: false, error: 'Draft harus berstatus Konfirmasi sebelum diterbitkan' };

      // Idempotency: event mungkin sudah ada dari percobaan sebelumnya.
      const { rows: existing } = await db.query('SELECT id FROM events WHERE source_draft_id = $1 LIMIT 1', [draftId]);
      if (!existing[0]) {
        await db.query(
          `INSERT INTO events (date_str, date_end, day, tanggal, jam, lokasi, area_id, acara, eo, pic, phone,
                               keterangan, month, category, categories, priority, event_model, event_nominal,
                               event_model_notes, source_draft_id, is_multi_day, day_time_slots, event_type,
                               recurrence_group_id, is_recurring)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
          [
            draft.date_str, draft.date_end, draft.day, draft.tanggal, draft.jam, draft.lokasi,
            draft.area_id, draft.acara, draft.eo, draft.pic, draft.phone, draft.keterangan,
            draft.month, draft.category, toTextArray(draft.categories || []), draft.priority,
            draft.event_model, draft.event_nominal, draft.event_model_notes, draftId,
            draft.is_multi_day, draft.day_time_slots ? JSON.stringify(draft.day_time_slots) : null,
            draft.event_type, draft.recurrence_group_id, draft.is_recurring,
          ],
        );
      }

      await db.query('UPDATE draft_events SET published = true, published_at = NOW(), progress = $1 WHERE id = $2', ['confirm', draftId]);
      logActivity(auth.user, 'publish_draft', 'draft', draftId, { acara: draft.acara }, req);
      return { success: true };
    }

    case 'deleteDraft': {
      if (!body.id) return { success: false, error: 'ID draft wajib diisi' };
      await db.query(
        `UPDATE draft_events SET progress = 'cancel', deleted = true, deleted_at = NOW() WHERE id = $1`,
        [body.id],
      );
      logActivity(auth.user, 'delete_draft', 'draft', body.id, null, req);
      return { success: true };
    }

    case 'restoreDraft': {
      if (!body.id) return { success: false, error: 'ID draft wajib diisi' };
      await db.query(
        `UPDATE draft_events SET progress = 'draft', deleted = false, deleted_at = NULL WHERE id = $1`,
        [body.id],
      );
      logActivity(auth.user, 'restore_draft', 'draft', body.id, null, req);
      return { success: true };
    }

    // ══════════ DRAFT EVENTS (tulis) ══════════
    case 'createDraft': {
      const data = body.data || {};
      const columns = [];
      const values = [];
      for (const key of Object.keys(data)) {
        if (!DRAFT_COLUMNS.has(key)) continue;
        let value = data[key];
        if (key === 'categories') value = toTextArray(value);
        else if (key === 'day_time_slots') value = toJsonb(value);
        else if (value === undefined) value = null;
        values.push(value);
        columns.push(key);
      }
      if (columns.length === 0) return { success: false, error: 'Data draft tidak tersedia' };
      const { rows } = await db.query(
        `INSERT INTO draft_events (${columns.join(', ')})
         VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING id`,
        values,
      );
      const id = rows[0]?.id || '';
      logActivity(auth.user, 'create_draft', 'draft', id, { acara: data.acara }, req);
      return { success: true, id };
    }

    case 'updateDraft': {
      if (!body.id) return { success: false, error: 'ID draft wajib diisi' };
      const data = body.data || {};
      const sets = [];
      const values = [];
      for (const key of Object.keys(data)) {
        if (!DRAFT_COLUMNS.has(key)) continue;
        let value = data[key];
        if (key === 'categories') value = toTextArray(value);
        else if (key === 'day_time_slots') value = toJsonb(value);
        else if (value === undefined) value = null;
        values.push(value);
        sets.push(`${key} = $${values.length}`);
      }
      if (sets.length === 0) return { success: false, error: 'Tidak ada perubahan' };
      values.push(body.id);
      await db.query(`UPDATE draft_events SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
      logActivity(auth.user, 'update_draft', 'draft', body.id, { fields: Object.keys(data) }, req);
      return { success: true };
    }

    // ══════════ SITE SETTINGS ══════════
    case 'updateSiteSettings': {
      if (!body.key) return { success: false, error: 'Key pengaturan wajib diisi' };
      await db.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [body.key, toJsonb(body.value)],
      );
      logActivity(auth.user, 'update_site_settings', 'settings', body.key, null, req);
      return { success: true };
    }

    // ══════════ PHOTO ALBUMS ══════════
    case 'createAlbum': {
      const data = body.data || {};
      const ALBUM_COLUMNS = ['name', 'slug', 'description', 'event_date', 'cover_photo_url', 'sort_order', 'event_id', 'lokasi', 'theme_id'];
      const columns = [];
      const values = [];
      for (const key of ALBUM_COLUMNS) {
        if (data[key] === undefined) continue;
        values.push(data[key] === null ? null : data[key]);
        columns.push(key);
      }
      if (columns.length === 0) return { success: false, error: 'Data album tidak tersedia' };
      const { rows } = await db.query(
        `INSERT INTO photo_albums (${columns.join(', ')})
         VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING id`,
        values,
      );
      const id = rows[0]?.id || '';
      logActivity(auth.user, 'create_album', 'album', id, { name: data.name }, req);
      return { success: true, id };
    }

    case 'deleteAlbum': {
      if (!body.id) return { success: false, error: 'ID album wajib diisi' };
      // Kumpulkan URL foto album dulu, hapus baris DB, baru hapus file R2
      // (best-effort per file — mirror api/supabase-admin.js).
      const { rows: photos } = await db.query(
        'SELECT url FROM event_photos WHERE album_id = $1',
        [body.id],
      );
      await db.query('DELETE FROM event_photos WHERE album_id = $1', [body.id]);
      if (photos.length > 0) {
        await Promise.all(photos.map((p) => deleteR2File(p.url)));
      }
      await db.query('DELETE FROM photo_albums WHERE id = $1', [body.id]);
      logActivity(auth.user, 'delete_album', 'album', body.id, null, req);
      return { success: true };
    }

    case 'setAlbumCover': {
      if (!body.id) return { success: false, error: 'ID album wajib diisi' };
      await db.query(
        'UPDATE photo_albums SET cover_photo_url = $1 WHERE id = $2',
        [body.coverPhotoUrl || '', body.id],
      );
      logActivity(auth.user, 'set_album_cover', 'album', body.id, { coverPhotoUrl: body.coverPhotoUrl }, req);
      return { success: true };
    }

    case 'createAlbumPhoto': {
      const data = body.data || {};
      if (!data.album_id) return { success: false, error: 'ID album wajib diisi' };
      // sort_order = max album + 1 (mirror legacy: (max ?? -1) + 1 → foto pertama 0).
      const { rows: maxRows } = await db.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS m FROM event_photos WHERE album_id = $1',
        [data.album_id],
      );
      const nextOrder = Number(maxRows[0]?.m ?? -1) + 1;
      const url = data.url;
      if (!url) return { success: false, error: 'URL foto wajib diisi' };
      const { rows } = await db.query(
        `INSERT INTO event_photos (url, caption, event_date, album_id, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, sort_order`,
        [
          url,
          data.caption !== undefined && data.caption !== null ? String(data.caption) : '',
          data.event_date ?? '',
          data.album_id,
          nextOrder,
        ],
      );
      const created = rows[0];
      logActivity(auth.user, 'create_album_photo', 'photo', created?.id || '', { album_id: data.album_id }, req);
      return { success: true, id: created?.id || '', sortOrder: created?.sort_order ?? nextOrder };
    }

    case 'deleteAlbumPhoto': {
      if (!body.id) return { success: false, error: 'ID foto wajib diisi' };
      const { rows } = await db.query('SELECT url FROM event_photos WHERE id = $1', [body.id]);
      await db.query('DELETE FROM event_photos WHERE id = $1', [body.id]);
      if (rows[0]?.url) await deleteR2File(rows[0].url);
      logActivity(auth.user, 'delete_album_photo', 'photo', body.id, null, req);
      return { success: true };
    }

    case 'linkAlbumToEvent': {
      const albumId = body.id;
      const eventId = body.eventId;
      if (!albumId || !eventId) return { success: false, error: 'albumId dan eventId wajib diisi' };
      await db.query('UPDATE photo_albums SET event_id = $1 WHERE id = $2', [eventId, albumId]);
      logActivity(auth.user, 'link_album_event', 'album', albumId, { event_id: eventId }, req);
      return { success: true };
    }

    // ══════════ EVENT PHOTOS ══════════
    case 'createEventPhoto': {
      const data = body.data || {};
      // sort_order = max global + 1 (mirror legacy: foto pertama 0).
      const { rows: maxRows } = await db.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS m FROM event_photos',
      );
      const nextOrder = Number(maxRows[0]?.m ?? -1) + 1;
      const url = data.url;
      if (!url) return { success: false, error: 'URL foto wajib diisi' };
      const { rows } = await db.query(
        `INSERT INTO event_photos (url, caption, event_date, album_id, event_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sort_order`,
        [
          url,
          data.caption !== undefined && data.caption !== null ? String(data.caption) : '',
          data.event_date ?? '',
          data.album_id ?? null,
          data.event_id ?? '',
          nextOrder,
        ],
      );
      const created = rows[0];
      logActivity(auth.user, 'create_event_photo', 'photo', created?.id || '', null, req);
      return { success: true, id: created?.id || '', sortOrder: created?.sort_order ?? nextOrder };
    }

    case 'deleteEventPhoto': {
      if (!body.id) return { success: false, error: 'ID foto wajib diisi' };
      const { rows } = await db.query('SELECT url FROM event_photos WHERE id = $1', [body.id]);
      await db.query('DELETE FROM event_photos WHERE id = $1', [body.id]);
      const url = rows[0]?.url || body.url || '';
      if (url) await deleteR2File(url);
      logActivity(auth.user, 'delete_event_photo', 'photo', body.id, null, req);
      return { success: true };
    }

    case 'updateEventPhotoOrder': {
      const updates = body.data;
      if (!Array.isArray(updates)) return { success: false, error: 'Data tidak valid' };
      await Promise.all(
        updates.map((item) => db.query(
          'UPDATE event_photos SET sort_order = $1 WHERE id = $2',
          [item.sortOrder, item.id],
        )),
      );
      logActivity(auth.user, 'update_event_photo_order', 'photo', null, { count: updates.length }, req);
      return { success: true };
    }

    // ══════════ EVENT AREAS + FOTO AREA ══════════
    case 'createEventArea': {
      const data = body.data || {};
      const columns = [];
      const values = [];
      for (const key of AREA_COLUMNS) {
        if (data[key] === undefined) continue;
        values.push(data[key] === null ? null : data[key]);
        columns.push(key);
      }
      if (columns.length === 0) return { success: false, error: 'Data area tidak tersedia' };
      const { rows } = await db.query(
        `INSERT INTO event_areas (${columns.join(', ')})
         VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING id`,
        values,
      );
      const id = rows[0]?.id || '';
      logActivity(auth.user, 'create_event_area', 'event_area', id, { name: data.name }, req);
      return { success: true, id };
    }

    case 'updateEventArea': {
      if (!body.id) return { success: false, error: 'ID area wajib diisi' };
      const data = body.data || {};
      const sets = [];
      const values = [];
      for (const key of Object.keys(data)) {
        if (!AREA_COLUMNS.has(key)) continue;
        values.push(data[key] === null || data[key] === undefined ? null : data[key]);
        sets.push(`${key} = $${values.length}`);
      }
      if (sets.length === 0) return { success: false, error: 'Tidak ada perubahan' };
      values.push(body.id);
      await db.query(`UPDATE event_areas SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
      logActivity(auth.user, 'update_event_area', 'event_area', body.id, { fields: Object.keys(data) }, req);
      return { success: true };
    }

    case 'deleteEventArea': {
      if (!body.id) return { success: false, error: 'ID area wajib diisi' };
      // Kumpulkan URL foto area dulu, hapus baris DB (area_photos punya FK
      // CASCADE), baru hapus file R2 best-effort.
      const { rows: photos } = await db.query(
        'SELECT url FROM area_photos WHERE area_id = $1',
        [body.id],
      );
      await db.query('DELETE FROM area_photos WHERE area_id = $1', [body.id]);
      if (photos.length > 0) {
        await Promise.all(photos.map((p) => deleteR2File(p.url)));
      }
      await db.query('DELETE FROM event_areas WHERE id = $1', [body.id]);
      logActivity(auth.user, 'delete_event_area', 'event_area', body.id, null, req);
      return { success: true };
    }

    case 'createAreaPhoto': {
      const data = body.data || {};
      if (!data.area_id) return { success: false, error: 'ID area wajib diisi' };
      const { rows: maxRows } = await db.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS m FROM area_photos WHERE area_id = $1',
        [data.area_id],
      );
      const nextOrder = Number(maxRows[0]?.m ?? -1) + 1;
      const url = data.url;
      if (!url) return { success: false, error: 'URL foto wajib diisi' };
      const { rows } = await db.query(
        `INSERT INTO area_photos (area_id, url, caption, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sort_order`,
        [data.area_id, url, data.caption ?? '', nextOrder],
      );
      const created = rows[0];
      logActivity(auth.user, 'create_area_photo', 'photo', created?.id || '', { area_id: data.area_id }, req);
      return { success: true, id: created?.id || '', sortOrder: created?.sort_order ?? nextOrder };
    }

    case 'deleteAreaPhoto': {
      if (!body.id) return { success: false, error: 'ID foto wajib diisi' };
      const { rows } = await db.query('SELECT url FROM area_photos WHERE id = $1', [body.id]);
      await db.query('DELETE FROM area_photos WHERE id = $1', [body.id]);
      if (rows[0]?.url) await deleteR2File(rows[0].url);
      logActivity(auth.user, 'delete_area_photo', 'photo', body.id, null, req);
      return { success: true };
    }

    case 'updateAreaPhotoOrder': {
      const updates = body.data;
      if (!Array.isArray(updates)) return { success: false, error: 'Data tidak valid' };
      await Promise.all(
        updates.map((item) => db.query(
          'UPDATE area_photos SET sort_order = $1 WHERE id = $2',
          [item.sortOrder, item.id],
        )),
      );
      logActivity(auth.user, 'update_area_photo_order', 'photo', null, { count: updates.length }, req);
      return { success: true };
    }

    // ══════════ PEMETAAN LOKASI ══════════
    case 'getLocationMapping': {
      // Daftar distinct lokasi event yang belum dipetakan + yang sudah
      const { rows: eventRows } = await db.query(
        `SELECT lokasi, COUNT(*)::int AS event_count,
                COUNT(area_id)::int AS mapped_count,
                MIN(area_id) AS area_id
         FROM events WHERE trim(lokasi) <> '' GROUP BY lokasi
         ORDER BY COUNT(*) DESC`,
      );
      const { rows: draftRows } = await db.query(
        `SELECT lokasi, COUNT(*)::int AS draft_count,
                COUNT(area_id)::int AS mapped_count,
                MIN(area_id) AS area_id
         FROM draft_events WHERE trim(lokasi) <> '' GROUP BY lokasi
         ORDER BY COUNT(*) DESC`,
      );
      const draftMap = new Map(draftRows.map(r => [r.lokasi, { draftCount: r.draft_count, areaId: r.area_id || null }]));
      const list = eventRows.map(r => ({
        lokasi: r.lokasi,
        eventCount: r.event_count,
        draftCount: draftMap.get(r.lokasi)?.draftCount ?? 0,
        currentAreaId: r.area_id || draftMap.get(r.lokasi)?.areaId || null,
      }));
      // also include draft-only lokasi values
      for (const d of draftRows) {
        if (list.some(r => r.lokasi === d.lokasi)) continue;
        list.push({ lokasi: d.lokasi, eventCount: 0, draftCount: d.draft_count, currentAreaId: d.area_id || null });
      }
      return { success: true, data: list };
    }

    case 'applyLocationMapping': {
      const mappings = body.mappings;
      if (!Array.isArray(mappings) || mappings.length === 0) return { success: false, error: 'Data pemetaan tidak valid' };
      let updated = 0;
      let renamed = 0;
      for (const m of mappings) {
        if (!m.lokasi) continue;
        // 1) Isi area_id (hanya yang belum punya — pemetaan manual tidak ditimpa)
        if (m.areaId) {
          const { rowCount: eCount } = await db.query(
            'UPDATE events SET area_id = $1, updated_at = NOW() WHERE trim(lokasi) = $2 AND area_id IS NULL',
            [m.areaId, m.lokasi],
          );
          const { rowCount: dCount } = await db.query(
            'UPDATE draft_events SET area_id = $1 WHERE trim(lokasi) = $2 AND area_id IS NULL',
            [m.areaId, m.lokasi],
          );
          updated += (eCount || 0) + (dCount || 0);
        }
        // 2) Seragamkan teks lokasi (opsional). Menerapkan ke SEMUA baris dengan teks itu,
        //    termasuk yang sudah punya area_id — tujuannya memang menyeragamkan tampilan.
        const target = typeof m.targetLokasi === 'string' ? m.targetLokasi.trim() : '';
        if (target && target !== m.lokasi.trim()) {
          const { rowCount: eRename } = await db.query(
            'UPDATE events SET lokasi = $1, updated_at = NOW() WHERE trim(lokasi) = $2',
            [target, m.lokasi],
          );
          const { rowCount: dRename } = await db.query(
            'UPDATE draft_events SET lokasi = $1 WHERE trim(lokasi) = $2',
            [target, m.lokasi],
          );
          renamed += (eRename || 0) + (dRename || 0);
        }
      }
      logActivity(auth.user, 'apply_location_mapping', 'event', null, { updated, renamed, mappings: mappings.map(m => ({ l: m.lokasi, a: m.areaId, t: m.targetLokasi })) }, req);
      return { success: true, updated, renamed };
    }

    // ══════════ COMMUNITY REGISTRATIONS ══════════
    case 'updateRegistrationStatus': {
      if (!body.id) return { success: false, error: 'ID registrasi wajib diisi' };
      const updates = ['status'];
      const values = [body.status];
      if (body.adminNote !== undefined) {
        updates.push('admin_note');
        values.push(body.adminNote === null ? '' : body.adminNote);
      }
      values.push(body.id);
      await db.query(
        `UPDATE community_registrations SET ${updates.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${values.length}`,
        values,
      );
      logActivity(auth.user, 'update_registration_status', 'registration', body.id, { status: body.status }, req);
      return { success: true };
    }

    // ══════════ NEWS / BLOG ══════════
    case 'createNewsArticle': {
      const data = body.data || {};
      const columns = [];
      const values = [];
      for (const key of NEWS_COLUMNS) {
        if (data[key] === undefined) continue;
        values.push(data[key] === null ? null : data[key]);
        columns.push(key);
      }
      if (columns.length === 0) return { success: false, error: 'Data berita tidak tersedia' };
      const { rows } = await db.query(
        `INSERT INTO news_articles (${columns.join(', ')})
         VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING id`,
        values,
      );
      const id = rows[0]?.id || '';
      logActivity(auth.user, 'create_news', 'news', id, { title: data.title }, req);
      return { success: true, id };
    }

    case 'updateNewsArticle': {
      if (!body.id) return { success: false, error: 'ID berita wajib diisi' };
      const data = body.data || {};
      const sets = [];
      const values = [];
      for (const key of Object.keys(data)) {
        if (!NEWS_COLUMNS.has(key)) continue;
        let value = data[key] === null || data[key] === undefined ? null : data[key];
        if (key === 'status' && data.status === 'published') {
          // Terbitkan: set published_at (sekaligus hindari duplikat set kolom).
          value = data.status;
          sets.push(`${key} = $${values.length + 1}`);
          values.push(value);
          sets.push(`published_at = $${values.length + 1}`);
          values.push(new Date().toISOString());
          continue;
        }
        values.push(value);
        sets.push(`${key} = $${values.length}`);
      }
      if (sets.length === 0) return { success: false, error: 'Tidak ada perubahan' };
      values.push(body.id);
      await db.query(`UPDATE news_articles SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
      logActivity(auth.user, 'update_news', 'news', body.id, { fields: Object.keys(data) }, req);
      return { success: true };
    }

    case 'deleteNewsArticle': {
      if (!body.id) return { success: false, error: 'ID berita wajib diisi' };
      const { rows } = await db.query(
        'SELECT cover_image_url FROM news_articles WHERE id = $1',
        [body.id],
      );
      await db.query('DELETE FROM news_articles WHERE id = $1', [body.id]);
      if (rows[0]?.cover_image_url) await deleteR2File(rows[0].cover_image_url);
      logActivity(auth.user, 'delete_news', 'news', body.id, null, req);
      return { success: true };
    }

    // ══════════ SPONSORSHIP / PROPOSAL EVENT ══════════
    case 'setEventProposal': {
      const { eventId, fileUrl, fileName, mimeType } = body;
      if (!eventId || !fileUrl) return { success: false, error: 'eventId dan fileUrl wajib diisi' };
      // m-1 (audit): baca file lama sebelum upsert agar bisa dihapus dari R2.
      const { rows: existingRows } = await db.query(
        'SELECT file_url FROM event_proposals WHERE event_id = $1 LIMIT 1',
        [eventId],
      );
      const existingProp = existingRows[0] || null;

      // M-3: cap 20MB — HEAD object R2 SEBELUM upsert (ContentLength tidak
      // ditandatangani saat presign → verifikasi post-upload via HEAD).
      const head = await headR2File(fileUrl);
      if (!head.ok) {
        if (head.notFound) return { success: false, error: head.error };
        return { success: false, error: head.error };
      }
      if (head.contentLength > MAX_PROPOSAL_BYTES) {
        // Bersihkan object yang terlalu besar, tolak referensinya.
        await deleteR2File(fileUrl);
        return { success: false, error: 'File melebihi 20MB' };
      }

      // m-3 (audit): verifikasi magic bytes — isi harus cocok dengan tipe yang diklaim.
      try {
        const magic = await verifyMimeMagicBytes(fileUrl, mimeType);
        if (!magic.ok) {
          await deleteR2File(fileUrl);
          return { success: false, error: magic.error };
        }
      } catch (magicErr) {
        console.error('[setEventProposal] magic-bytes check failed:', fileUrl, magicErr.message);
        throw magicErr;
      }

      await db.query(
        `INSERT INTO event_proposals (event_id, file_url, file_name, mime_type, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (event_id) DO UPDATE SET
           file_url = EXCLUDED.file_url,
           file_name = EXCLUDED.file_name,
           mime_type = EXCLUDED.mime_type,
           updated_at = NOW()`,
        [eventId, fileUrl, fileName ?? '', mimeType ?? ''],
      );
      logActivity(auth.user, 'set_event_proposal', 'event', eventId, { file_name: fileName }, req);

      // m-1 (audit): hapus file lama dari R2 setelah ganti berhasil (best-effort).
      if (existingProp?.file_url && existingProp.file_url !== fileUrl) {
        await deleteR2File(existingProp.file_url);
      }
      return { success: true };
    }

    case 'deleteEventProposal': {
      if (!body.eventId) return { success: false, error: 'ID event wajib diisi' };
      const { rows } = await db.query(
        'SELECT file_url FROM event_proposals WHERE event_id = $1 LIMIT 1',
        [body.eventId],
      );
      const existing = rows[0] || null;
      // m-2 (audit): hapus R2 DULU dengan kepastian (throw) — gagal → error dan
      // row tetap ada, sehingga retry aman dan tidak ada orphan.
      if (existing?.file_url) {
        try {
          await deleteR2FileOrThrow(existing.file_url);
        } catch (delErr) {
          console.error('[deleteEventProposal] R2 delete failed:', existing.file_url, delErr.message);
          return { success: false, error: 'Gagal menghapus file dari storage. Coba lagi.' };
        }
      }
      await db.query('DELETE FROM event_proposals WHERE event_id = $1', [body.eventId]);
      logActivity(auth.user, 'delete_event_proposal', 'event', body.eventId, null, req);
      return { success: true };
    }

    case 'updateSponsorLeadStatus': {
      if (!body.id) return { success: false, error: 'ID lead wajib diisi' };
      if (body.internalNotes !== undefined) {
        await db.query(
          'UPDATE sponsor_leads SET status = $1, internal_notes = $2 WHERE id = $3',
          [body.status, body.internalNotes === null ? '' : String(body.internalNotes).slice(0, 2000), body.id],
        );
      } else {
        await db.query('UPDATE sponsor_leads SET status = $1 WHERE id = $2', [body.status, body.id]);
      }
      logActivity(auth.user, 'update_sponsor_lead', 'sponsor_lead', body.id, { status: body.status }, req);
      return { success: true };
    }

    case 'deleteSponsorLead': {
      if (!body.id) return { success: false, error: 'ID lead wajib diisi' };
      await db.query('DELETE FROM sponsor_leads WHERE id = $1', [body.id]);
      logActivity(auth.user, 'delete_sponsor_lead', 'sponsor_lead', body.id, null, req);
      return { success: true };
    }

    // ══════════ READ-ONLY (FrontendRest: dashboard butuh ini) ══════════
    case 'listNewsArticles': {
      const { rows } = await db.query(
        `SELECT id, title, slug, excerpt, content, cover_image_url, author, status, published_at, created_at, updated_at
         FROM news_articles ORDER BY created_at DESC`,
      );
      return { success: true, data: rows };
    }

    case 'listSponsorLeads': {
      const { rows } = await db.query(
        `SELECT sl.*, e.acara, e.date_str
         FROM sponsor_leads sl
         LEFT JOIN events e ON e.id = sl.event_id
         ORDER BY sl.created_at DESC`,
      );
      return { success: true, data: rows };
    }

    case 'readRegistrations': {
      const { rows } = await db.query(
        `SELECT * FROM community_registrations ORDER BY created_at DESC`,
      );
      return { success: true, data: rows };
    }

    // ══════════ GENERATED LETTERS ══════════
    case 'listLetters': {
      const conds = [`status = 'active'`];
      const params = [];
      if (body.eventId) { params.push(body.eventId); conds.push(`event_id = $${params.length}`); }
      if (body.draftEventId) { params.push(body.draftEventId); conds.push(`draft_event_id = $${params.length}`); }
      const { rows } = await db.query(
        `SELECT * FROM generated_letters WHERE ${conds.join(' AND ')} ORDER BY created_at DESC`,
        params,
      );
      return { success: true, data: rows };
    }

    case 'createLetter': {
      const createdBy = body.createdBy || auth.user?.id || null;
      const { rows } = await db.query(
        `INSERT INTO generated_letters (event_id, draft_event_id, letter_data, pdf_base64, pdf_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          body.eventId || null,
          body.draftEventId || null,
          JSON.stringify(body.letterData),
          body.pdfBase64 || null,
          body.pdfUrl || null,
          createdBy,
        ],
      );
      const row = rows[0];
      logActivity(auth.user, 'create_letter', 'generated_letter', row?.id || null, { eventId: body.eventId }, req);
      return { success: true, data: row };
    }

    case 'updateLetter': {
      const sets = [];
      const params = [];
      const u = body.updates || {};
      if ('letterData' in u) { params.push(JSON.stringify(u.letterData)); sets.push(`letter_data = $${params.length}`); }
      if ('pdfUrl' in u) { params.push(u.pdfUrl || null); sets.push(`pdf_url = $${params.length}`); }
      if ('pdfBase64' in u) { params.push(u.pdfBase64 || null); sets.push(`pdf_base64 = $${params.length}`); }
      if ('status' in u) { params.push(u.status); sets.push(`status = $${params.length}`); }
      params.push(body.id);
      const { rows } = await db.query(
        `UPDATE generated_letters SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params,
      );
      if (!rows[0]) return { success: false, error: 'Surat tidak ditemukan' };
      logActivity(auth.user, 'update_letter', 'generated_letter', body.id, { fields: Object.keys(u) }, req);
      return { success: true, data: rows[0] };
    }

    case 'deleteLetter': {
      // Soft delete — mirror legacy supabase update({status:'deleted'}).
      const { rowCount } = await db.query(
        `UPDATE generated_letters SET status = 'deleted' WHERE id = $1`,
        [body.id],
      );
      if (!rowCount) return { success: false, error: 'Surat tidak ditemukan' };
      logActivity(auth.user, 'delete_letter', 'generated_letter', body.id, null, req);
      return { success: true };
    }

    default:
      return { success: false, error: `Aksi tidak dikenal: ${action}` };
  }
}

export default router;