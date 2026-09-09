/**
 * Routes survey — mont di /api/v1/survey.
 *
 * Pengganti api/survey.js (?action=...) di VPS. Envelope respons sama:
 *   GET  publik/staff → { success: true, data: ... } (kecuali GET /export CSV)
 *   POST publik      → { success: true, id, created_at } (flat, mirror legacy)
 *
 * Endpoint:
 *   POST /submit                publik — 20 submit / 15 mnt / IP
 *   GET  /check?event_id&fingerprint    — cek duplikat perangkat (publik)
 *   GET  /summary?event_id      publik — agregat rating (SQL, ganti RPC get_survey_summary)
 *   GET  /responses             staff — daftar respons ter-paginate
 *   GET  /config?event_id       staff — konfigurasi survey per event
 *   GET  /stats                 staff — analitik menyeluruh
 *   GET  /export?event_id       staff — CSV UTF-8 (BOM Excel)
 *
 * Boundary: server mengembalikan row mentah snake_case; mapping ke camelCase
 * hanya di src/utils/api/* (client).
 */
import { Router } from 'express';
import { db } from '../db.js';
import { requireRole, logActivity } from '../auth.js';
import { enforceRateLimit, clientIp } from '../lib/rateLimit.js';

const router = Router();

// ─── Helpers ───────────────────────────────────────────────────────

function sanitize(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, maxLen);
}

function isValidRating(val) {
  return Number.isInteger(val) && val >= 1 && val <= 10;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSubmission(body) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('event_id wajib diisi');
  }
  if (!['organizer', 'public'].includes(body.survey_type)) {
    errors.push('survey_type harus "organizer" atau "public"');
  }

  // Rating mall — wajib untuk kedua tipe.
  for (const field of ['mall_cleanliness', 'mall_staff_service', 'mall_coordination', 'mall_security']) {
    if (!isValidRating(body[field])) errors.push(`${field} harus angka 1-10`);
  }

  // Rating EO — wajib hanya untuk survey publik.
  if (body.survey_type === 'public') {
    for (const field of ['eo_event_quality', 'eo_organization', 'eo_committee_service', 'eo_promotion_accuracy', 'eo_recommendation']) {
      if (!isValidRating(body[field])) errors.push(`${field} harus angka 1-10`);
    }
  }

  const email = sanitize(body.respondent_email || '', 254);
  if (email && !EMAIL_RE.test(email)) errors.push('Format email tidak valid');

  return errors;
}

function csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── POST /submit — publik ─────────────────────────────────────────
router.post('/submit', async (req, res, next) => {
  // 20 submit / 15 mnt per IP (mirror api/survey.js).
  if (!enforceRateLimit(req, res, 'survey-submit', 20, 15 * 60 * 1000)) return;

  const body = req.body || {};

  // Coerce rating ke integer.
  const ratingFields = [
    'mall_cleanliness', 'mall_staff_service', 'mall_coordination', 'mall_security',
    'eo_event_quality', 'eo_organization', 'eo_committee_service', 'eo_promotion_accuracy', 'eo_recommendation',
  ];
  for (const f of ratingFields) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      body[f] = parseInt(body[f], 10);
    }
  }

  const errors = validateSubmission(body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const fingerprint = sanitize(body.device_fingerprint || '', 100);
  const eventId = sanitize(body.event_id, 200);

  try {
    // Duplikat (soft limit) — device fingerprint per event.
    if (fingerprint) {
      const { rows } = await db.query(
        'SELECT id FROM survey_responses WHERE event_id = $1 AND device_fingerprint = $2 LIMIT 1',
        [eventId, fingerprint],
      );
      if (rows[0]) {
        return res.status(409).json({
          success: false,
          error: 'Anda sudah mengisi survey untuk event ini',
          already_submitted: true,
        });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO survey_responses
        (event_id, survey_type, respondent_name, respondent_email, respondent_phone, respondent_organization,
         mall_cleanliness, mall_staff_service, mall_coordination, mall_security,
         eo_event_quality, eo_organization, eo_committee_service, eo_promotion_accuracy, eo_recommendation,
         mall_comment, eo_comment, general_comment, device_fingerprint, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id, created_at`,
      [
        eventId,
        body.survey_type,
        sanitize(body.respondent_name || '', 100),
        sanitize(body.respondent_email || '', 254),
        sanitize(body.respondent_phone || '', 20),
        sanitize(body.respondent_organization || '', 200),
        body.mall_cleanliness,
        body.mall_staff_service,
        body.mall_coordination,
        body.mall_security,
        body.survey_type === 'public' ? body.eo_event_quality : null,
        body.survey_type === 'public' ? body.eo_organization : null,
        body.survey_type === 'public' ? body.eo_committee_service : null,
        body.survey_type === 'public' ? body.eo_promotion_accuracy : null,
        body.survey_type === 'public' ? body.eo_recommendation : null,
        sanitize(body.mall_comment || '', 1000),
        sanitize(body.eo_comment || '', 1000),
        sanitize(body.general_comment || '', 1000),
        fingerprint,
        clientIp(req),
        sanitize(req.headers['user-agent'] || '', 500),
      ],
    );
    const row = rows[0] || null;
    return res.status(201).json({ success: true, id: row?.id || '', created_at: row?.created_at || null });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /check — publik ───────────────────────────────────────────
router.get('/check', async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  const fingerprint = String(req.query?.fingerprint || '').trim();

  if (!eventId) return res.status(400).json({ success: false, error: 'event_id wajib diisi' });
  if (!fingerprint) return res.json({ success: true, data: { submitted: false } });

  try {
    const { rows } = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM survey_responses
         WHERE event_id = $1 AND device_fingerprint = $2 AND $2 <> ''
       ) AS submitted`,
      [eventId, fingerprint],
    );
    return res.json({ success: true, data: { submitted: !!rows[0]?.submitted } });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /summary — publik (SQL agregat ganti RPC get_survey_summary) ──
router.get('/summary', async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id wajib diisi' });

  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*)::int AS total_responses,
         COUNT(*) FILTER (WHERE survey_type = 'organizer')::int AS organizer_responses,
         COUNT(*) FILTER (WHERE survey_type = 'public')::int AS public_responses,
         ROUND(AVG(mall_cleanliness)::numeric, 1)::float8 AS mall_cleanliness,
         ROUND(AVG(mall_staff_service)::numeric, 1)::float8 AS mall_staff_service,
         ROUND(AVG(mall_coordination)::numeric, 1)::float8 AS mall_coordination,
         ROUND(AVG(mall_security)::numeric, 1)::float8 AS mall_security,
         ROUND(AVG(eo_event_quality) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_event_quality,
         ROUND(AVG(eo_organization) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_organization,
         ROUND(AVG(eo_committee_service) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_committee_service,
         ROUND(AVG(eo_promotion_accuracy) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_promotion_accuracy,
         ROUND(AVG(eo_recommendation) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_recommendation
       FROM survey_responses
       WHERE event_id = $1`,
      [eventId],
    );
    const r = rows[0] || null;
    const total = r?.total_responses || 0;

    const mallAvg = total > 0
      ? {
          cleanliness: r.mall_cleanliness,
          staff_service: r.mall_staff_service,
          coordination: r.mall_coordination,
          security: r.mall_security,
          overall: Math.round(
            ((r.mall_cleanliness + r.mall_staff_service + r.mall_coordination + r.mall_security) / 4) * 10,
          ) / 10,
        }
      : null;

    const eoAvg = (r?.public_responses || 0) > 0
      ? {
          event_quality: r.eo_event_quality,
          organization: r.eo_organization,
          committee_service: r.eo_committee_service,
          promotion_accuracy: r.eo_promotion_accuracy,
          recommendation: r.eo_recommendation,
          overall: Math.round(
            ((r.eo_event_quality + r.eo_organization + r.eo_committee_service + r.eo_promotion_accuracy + r.eo_recommendation) / 5) * 10,
          ) / 10,
        }
      : null;

    return res.json({
      success: true,
      data: {
        event_id: eventId,
        total_responses: total,
        organizer_responses: r?.organizer_responses || 0,
        public_responses: r?.public_responses || 0,
        mall_avg: mallAvg,
        eo_avg: eoAvg,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /responses — staff (paginated) ────────────────────────────
router.get('/responses', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id wajib diisi' });

  const page = Math.max(1, parseInt(req.query?.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const sortField = ['created_at', 'survey_type', 'mall_cleanliness'].includes(String(req.query?.sort || ''))
    ? String(req.query.sort)
    : 'created_at';
  const sortDir = String(req.query?.order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  try {
    const [{ rows: countRows }, { rows }] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total FROM survey_responses WHERE event_id = $1', [eventId]),
      db.query(
        `SELECT * FROM survey_responses
         WHERE event_id = $1
         ORDER BY ${sortField} ${sortDir}
         LIMIT $2 OFFSET $3`,
        [eventId, limit, offset],
      ),
    ]);

    return res.json({
      success: true,
      data: rows,
      total: countRows[0]?.total || 0,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /config — staff ───────────────────────────────────────────
router.get('/config', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id wajib diisi' });

  try {
    const { rows } = await db.query('SELECT * FROM survey_config WHERE event_id = $1 LIMIT 1', [eventId]);
    return res.json({
      success: true,
      data: rows[0] || {
        event_id: eventId,
        is_active: false,
        auto_activate_after_event: true,
        activated_at: null,
        deactivated_at: null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /config-set — staff: aktif/nonaktif survey per event ──────
// (FE SurveyDashboard toggle; mirror tenant.js /config-set pattern).
router.post('/config-set', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  const body = req.body || {};
  const eventId = String(body.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id wajib diisi' });

  const now = new Date().toISOString();
  const isActive = !!body.is_active;

  try {
    const { rows } = await db.query(
      `INSERT INTO survey_config (event_id, is_active, activated_at, deactivated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         activated_at = EXCLUDED.activated_at,
         deactivated_at = EXCLUDED.deactivated_at,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [eventId, isActive, isActive ? now : null, !isActive ? now : null, now],
    );
    logActivity(req.auth.user, 'set_survey_config', 'survey_config', eventId, { is_active: isActive }, req);
    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /stats — staff ────────────────────────────────────────────
router.get('/stats', requireRole(['superadmin', 'admin']), async (_req, res, next) => {
  try {
    const [{ rows }, { rows: recent }] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)::int AS total_responses,
           COUNT(*) FILTER (WHERE survey_type = 'organizer')::int AS organizer_responses,
           COUNT(*) FILTER (WHERE survey_type = 'public')::int AS public_responses,
           COUNT(DISTINCT event_id)::int AS unique_events,
           ROUND(AVG(mall_cleanliness)::numeric, 1)::float8 AS mall_cleanliness,
           ROUND(AVG(mall_staff_service)::numeric, 1)::float8 AS mall_staff_service,
           ROUND(AVG(mall_coordination)::numeric, 1)::float8 AS mall_coordination,
           ROUND(AVG(mall_security)::numeric, 1)::float8 AS mall_security,
           ROUND(AVG(eo_event_quality) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_event_quality,
           ROUND(AVG(eo_organization) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_organization,
           ROUND(AVG(eo_committee_service) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_committee_service,
           ROUND(AVG(eo_promotion_accuracy) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_promotion_accuracy,
           ROUND(AVG(eo_recommendation) FILTER (WHERE survey_type = 'public')::numeric, 1)::float8 AS eo_recommendation,
           COUNT(*) FILTER (WHERE survey_type = 'public' AND eo_recommendation >= 9)::int AS nps_promoters,
           COUNT(*) FILTER (WHERE survey_type = 'public' AND eo_recommendation <= 6)::int AS nps_detractors,
           COUNT(*) FILTER (WHERE survey_type = 'public' AND eo_recommendation IS NOT NULL)::int AS nps_base
         FROM survey_responses`,
      ),
      db.query(
        `SELECT id, event_id, survey_type, mall_cleanliness, mall_staff_service, mall_coordination,
                mall_security, eo_event_quality, eo_organization, eo_committee_service,
                eo_promotion_accuracy, eo_recommendation, respondent_name, respondent_email,
                mall_comment, eo_comment, general_comment, created_at
         FROM survey_responses
         ORDER BY created_at DESC
         LIMIT 20`,
      ),
    ]);

    const a = rows[0] || {};
    const total = a.total_responses || 0;
    const publicCount = a.public_responses || 0;

    const mallAvg = total > 0
      ? {
          cleanliness: a.mall_cleanliness,
          staff_service: a.mall_staff_service,
          coordination: a.mall_coordination,
          security: a.mall_security,
          overall: Math.round(
            ((a.mall_cleanliness + a.mall_staff_service + a.mall_coordination + a.mall_security) / 4) * 10,
          ) / 10,
        }
      : null;

    const eoAvg = publicCount > 0
      ? {
          event_quality: a.eo_event_quality,
          organization: a.eo_organization,
          committee_service: a.eo_committee_service,
          promotion_accuracy: a.eo_promotion_accuracy,
          recommendation: a.eo_recommendation,
          overall: Math.round(
            ((a.eo_event_quality + a.eo_organization + a.eo_committee_service + a.eo_promotion_accuracy + a.eo_recommendation) / 5) * 10,
          ) / 10,
        }
      : null;

    const npsScore = (a.nps_base || 0) > 0
      ? Math.round(((a.nps_promoters - a.nps_detractors) / a.nps_base) * 100)
      : null;

    return res.json({
      success: true,
      data: {
        total_responses: total,
        organizer_responses: a.organizer_responses || 0,
        public_responses: publicCount,
        unique_events: a.unique_events || 0,
        mall_avg: mallAvg,
        eo_avg: eoAvg,
        nps_score: npsScore,
        recent: recent,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /export — staff (CSV UTF-8 + BOM) ─────────────────────────
router.get('/export', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id wajib diisi' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM survey_responses WHERE event_id = $1 ORDER BY created_at ASC LIMIT 5000`,
      [eventId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tidak ada data survey untuk event ini' });
    }

    const headers = [
      'ID', 'Tipe Survey', 'Nama', 'Email', 'Telepon', 'Organisasi',
      'Mall: Kebersihan', 'Mall: Pelayanan', 'Mall: Koordinasi', 'Mall: Keamanan',
      'EO: Kualitas', 'EO: Organisasi', 'EO: Panitia', 'EO: Promosi', 'EO: Rekomendasi',
      'Komentar Mall', 'Komentar EO', 'Komentar Umum', 'Tanggal',
    ];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      csvRows.push([
        r.id, r.survey_type,
        csvEscape(r.respondent_name), csvEscape(r.respondent_email), csvEscape(r.respondent_phone),
        csvEscape(r.respondent_organization),
        r.mall_cleanliness, r.mall_staff_service, r.mall_coordination, r.mall_security,
        r.eo_event_quality ?? '', r.eo_organization ?? '', r.eo_committee_service ?? '',
        r.eo_promotion_accuracy ?? '', r.eo_recommendation ?? '',
        csvEscape(r.mall_comment), csvEscape(r.eo_comment), csvEscape(r.general_comment), r.created_at,
      ].join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (err) {
    return next(err);
  }
});

export default router;