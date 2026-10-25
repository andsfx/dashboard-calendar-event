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
 *   GET  /areas               event areas + area_photos (is_active)
 *   POST /drafts              pengajuan event publik (zod: tanggal ISO nyata, batas panjang)
 *   GET  /letters/:id         surat ter-generate (status active)
 *   GET  /settings/:key       site_settings value JSONB — HANYA key publik (404 lainnya)
 *
 * Semua respons: { success: boolean, data?: unknown, error?: string }.
 * Kolom PII (pic/phone/email dsb) TIDAK pernah dikirim ke publik.
 */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { stripPii } from '../auth.js';
import { toTextArray, toJsonb } from '../lib/pgValues.js';
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
  'day_time_slots',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Tanggal kalender yang benar-benar ada (menolak 2026-02-31 dan 2026-13-01). */
function isRealIsoDate(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_RE, 'Format tanggal harus YYYY-MM-DD')
  .refine(isRealIsoDate, 'Tanggal tidak valid');

/**
 * Batas input publik POST /drafts. Tanpa ini klien bisa mengirim teks sepanjang
 * apa pun (atau tanggal mustahil) dan baru meledak sebagai 500 di Postgres —
 * `date_str` bertipe DATE, jadi '12 Juli 2026' gagal dengan 22008.
 */
const draftSubmissionSchema = z.object({
  date_str: isoDateSchema,
  date_end: isoDateSchema.nullable().optional(),
  day: z.string().max(20).optional(),
  tanggal: z.string().max(40).optional(),
  jam: z.string().max(100).optional(),
  lokasi: z.string().max(200).optional(),
  area_id: z.string().max(100).nullable().optional(),
  acara: z.string().trim().min(1, 'Nama acara wajib diisi').max(200, 'Nama acara maksimal 200 karakter'),
  eo: z.string().max(100).optional(),
  pic: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  keterangan: z.string().max(2000).optional(),
  month: z.string().max(20).optional(),
  category: z.string().max(50).optional(),
  categories: z.array(z.string().max(50)).max(10).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  event_model: z.string().max(20).optional(),
  event_nominal: z.string().max(50).optional(),
  event_model_notes: z.string().max(2000).optional(),
  day_time_slots: z
    .array(z.object({ date: z.string().max(20), jam: z.string().max(100) }))
    .max(62)
    .nullable()
    .optional(),
});

router.post('/drafts', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'draft-submit', 15, 15 * 60 * 1000)) return;

  const body = req.body || {};
  const raw = (typeof body.data === 'object' && body.data !== null) ? body.data : body;

  const parsed = draftSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    const details = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !details[key]) details[key] = issue.message;
    }
    return res.status(400).json({
      success: false,
      error: 'Validasi gagal. Periksa kembali data yang Anda masukkan.',
      details,
    });
  }
  const data = parsed.data;
  const acara = data.acara;

  // Bangun row hanya dari kolom yang diizinkan (tidak pernah spread body mentah).
  const row = {};
  for (const key of DRAFT_PUBLIC_COLUMNS) {
    if (data[key] !== undefined && data[key] !== null) {
      row[key] = (key === 'categories')
        ? toTextArray(data[key])
        : key === 'day_time_slots'
          ? toJsonb(data[key])
          : data[key];
    }
  }
  if (!row.tanggal) row.tanggal = '';
  if (!row.month) row.month = '';

  try {
    // Tanpa RETURNING (publik tidak butuh id; mirror alur legacy RLS insert-only).
    await db.query(
      `INSERT INTO draft_events
        (date_str, date_end, day, tanggal, jam, lokasi, area_id, acara, eo, pic, phone,
         keterangan, month, category, categories, priority, event_model, event_nominal, event_model_notes,
         day_time_slots, progress)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        row.date_str, row.date_end ?? null, row.day ?? '', row.tanggal, row.jam ?? '',
        row.lokasi ?? '', row.area_id ?? null, acara, row.eo ?? '', row.pic ?? '',
        row.phone ?? '', row.keterangan ?? '', row.month, row.category ?? 'Umum',
        toTextArray(row.categories ?? []), row.priority ?? 'medium',
        row.event_model ?? '', row.event_nominal ?? '', row.event_model_notes ?? '',
        toJsonb(row.day_time_slots ?? null), 'draft',
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
// Hanya key yang memang dikonsumsi halaman publik. Tanpa allowlist ini endpoint
// adalah pembaca JSONB generik untuk seluruh isi `site_settings` (termasuk key
// internal yang mungkin ditambahkan nanti).
const PUBLIC_SETTINGS_KEYS = new Set([
  'featured_upcoming_event_ids',
  'hero_image',
  'instagram_cache',
  'instagram_posts',
]);

router.get('/settings/:key', async (req, res, next) => {
  if (!PUBLIC_SETTINGS_KEYS.has(req.params.key)) {
    return res.status(404).json({ success: false, error: 'Setting tidak ditemukan' });
  }
  try {
    const { rows } = await db.query('SELECT value FROM site_settings WHERE key = $1 LIMIT 1', [req.params.key]);
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Setting tidak ditemukan' });
    res.json({ success: true, data: rows[0].value });
  } catch (err) {
    next(err);
  }
});

export default router;