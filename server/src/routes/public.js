/**
 * Routes publik — read-only, tanpa auth. Mount di /api/v1.
 *
 *   GET /events              daftar event (tanpa draft; strip PII pic/phone)
 *   GET /events/:id          detail event (404 bila draft/tidak ada)
 *   GET /themes              annual themes (urut date_start)
 *   GET /holidays            hari libur (urut date_str)
 *   GET /news                artikel status='published' (tanpa konten besar? — kirim semua)
 *   GET /news/:slug          detail artikel by slug (404 bila bukan published)
 *   GET /albums              photo albums + event_photos
 *   GET /albums/:slug        detail album by slug + foto-fotonya
 *   GET /areas               event areas + area_photos (is_active)
 *   GET /settings/:key       site_settings value JSONB (404 bila key tak ada)
 *
 * Semua respons: { success: boolean, data?: unknown, error?: string }.
 * Kolom PII (pic/phone/email dsb) TIDAK pernah dikirim ke publik.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { stripPii } from '../auth.js';
import { toTextArray } from '../lib/pgValues.js';
import { enforceRateLimit } from '../lib/rateLimit.js';

const router = Router();

/** Runtime key mapping (snake_case DB → camelCase client). */
const EVENT_SELECT = `
  id, date_str, date_end, day, tanggal, jam, acara, lokasi, area_id, eo,
  keterangan, month, status, category, categories, priority, event_model,
  event_nominal, event_model_notes, source_draft_id, is_multi_day,
  day_time_slots, event_type, recurrence_group_id, is_recurring,
  poster_url, organization_id
`;

// ─── GET /events ─────────────────────────────────────────────────
router.get('/events', async (_req, res, next) => {
  try {
    // Tanpa PII: pic + phone TIDAK diseleksi (stripPii sebagai garda kedua).
    const { rows } = await db.query(`
      SELECT ${EVENT_SELECT}
      FROM events
      WHERE status <> 'draft'
      ORDER BY date_str ASC, jam ASC
    `);
    const events = rows.map((r) => stripPii(r, ['pic', 'phone']));
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

// ─── GET /events/:id ─────────────────────────────────────────────
router.get('/events/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${EVENT_SELECT} FROM events WHERE id = $1 AND status <> 'draft' LIMIT 1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Event tidak ditemukan' });
    res.json({ success: true, data: stripPii(rows[0], ['pic', 'phone']) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /themes ─────────────────────────────────────────────────
router.get('/themes', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, date_start, date_end, color FROM annual_themes ORDER BY date_start ASC',
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /holidays ───────────────────────────────────────────────
router.get('/holidays', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, tanggal, date_str, day, month, name, type, description FROM holidays ORDER BY date_str ASC',
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /news ───────────────────────────────────────────────────
router.get('/news', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, slug, excerpt, content, cover_image_url, author, published_at, created_at, updated_at
       FROM news_articles
       WHERE status = 'published'
       ORDER BY COALESCE(published_at, created_at) DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /news/:slug ─────────────────────────────────────────────
router.get('/news/:slug', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, slug, excerpt, content, cover_image_url, author, published_at, created_at, updated_at
       FROM news_articles
       WHERE slug = $1 AND status = 'published'
       LIMIT 1`,
      [req.params.slug],
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Artikel tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /albums ─────────────────────────────────────────────────
router.get('/albums', async (_req, res, next) => {
  try {
    const [albums, photos] = await Promise.all([
      db.query('SELECT * FROM photo_albums ORDER BY sort_order ASC, created_at DESC'),
      db.query('SELECT * FROM event_photos ORDER BY sort_order ASC'),
    ]);
    res.json({ success: true, data: { albums: albums.rows, photos: photos.rows } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /albums/:slug ───────────────────────────────────────────
router.get('/albums/:slug', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM photo_albums WHERE slug = $1 LIMIT 1', [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Album tidak ditemukan' });
    const photos = await db.query('SELECT * FROM event_photos WHERE album_id = $1 ORDER BY sort_order ASC', [rows[0].id]);
    res.json({ success: true, data: { album: rows[0], photos: photos.rows } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /areas ──────────────────────────────────────────────────
router.get('/areas', async (_req, res, next) => {
  try {
    const [areas, photos] = await Promise.all([
      db.query('SELECT * FROM event_areas WHERE is_active = true ORDER BY sort_order ASC'),
      db.query('SELECT * FROM area_photos ORDER BY sort_order ASC'),
    ]);
    res.json({ success: true, data: { areas: areas.rows, photos: photos.rows } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /drafts ────────────────────────────────────────────────
// Pengajuan event publik (tanpa login) — strip PII tidak relevan (insert
// saja, tanpa RETURNING — mirror alur RLS anon insert-only legacy).
// Kolom yang diizinkan: field publik dari EventSubmissionPage.
const DRAFT_PUBLIC_COLUMNS = new Set([
  'date_str', 'date_end', 'day', 'tanggal', 'jam', 'lokasi', 'area_id',
  'acara', 'eo', 'pic', 'phone', 'keterangan', 'month', 'category',
  'categories', 'priority', 'event_model', 'event_nominal', 'event_model_notes',
]);
router.post('/drafts', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'draft-submit', 15, 15 * 60 * 1000)) return;

  const body = req.body || {};
  const data = (typeof body.data === 'object' && body.data !== null) ? body.data : body;
  const acara = String(data.acara || '').trim();
  const dateStr = String(data.date_str || '').trim();
  if (!acara) return res.status(400).json({ success: false, error: 'Nama acara wajib diisi' });
  if (!dateStr) return res.status(400).json({ success: false, error: 'Tanggal acara wajib diisi' });

  // Bangun row hanya dari kolom yang diizinkan (tidak pernah spread body mentah).
  const row = {};
  for (const key of DRAFT_PUBLIC_COLUMNS) {
    if (data[key] !== undefined && data[key] !== null) {
      row[key] = (key === 'categories')
        ? toTextArray(data[key])
        : key === 'day_time_slots'
          ? (typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]))
          : data[key];
    }
  }
  if (!row.tanggal) row.tanggal = '';
  if (!row.month) row.month = '';
  if (!row.progress) row.progress = 'draft';

  try {
    // Tanpa RETURNING (publik tidak butuh id; mirror alur legacy RLS insert-only).
    await db.query(
      `INSERT INTO draft_events
        (date_str, date_end, day, tanggal, jam, lokasi, area_id, acara, eo, pic, phone,
         keterangan, month, category, categories, priority, event_model, event_nominal, event_model_notes, progress)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        row.date_str, row.date_end ?? null, row.day ?? '', row.tanggal, row.jam ?? '',
        row.lokasi ?? '', row.area_id ?? null, acara, row.eo ?? '', row.pic ?? '',
        row.phone ?? '', row.keterangan ?? '', row.month, row.category ?? 'Umum',
        toTextArray(row.categories ?? []), row.priority ?? 'medium',
        row.event_model ?? '', row.event_nominal ?? '', row.event_model_notes ?? '', 'draft',
      ],
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /letters/:id ─────────────────────────────────────────────
// Baca surat ter-generate (publik — link dibagikan EO via /letter/:id).
// Kolom terbatas (tanpa PII pembuat); status deleted/archived → 404.
router.get('/letters/:id', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'lettersPublic', 30, 60_000)) return;
  try {
    const { rows } = await db.query(
      `SELECT id, event_id, draft_event_id, letter_data, pdf_url, pdf_base64, created_at, status
       FROM generated_letters WHERE id = $1 AND status = 'active' LIMIT 1`,
      [req.params.id],
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Surat tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /settings/:key ──────────────────────────────────────────
router.get('/settings/:key', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT value FROM site_settings WHERE key = $1 LIMIT 1', [req.params.key]);
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Setting tidak ditemukan' });
    res.json({ success: true, data: rows[0].value });
  } catch (err) {
    next(err);
  }
});

export default router;