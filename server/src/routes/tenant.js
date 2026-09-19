/**
 * Routes tenant survey — mont di /api/v1/tenant.
 *
 * Pengganti api/tenant-survey.js (?mode=...&action=...) di VPS.
 *
 * Publik (tanpa auth):
 *   GET  /events             event past+ongoing dgn config is_active=true
 *   GET  /event-info         detail event + status survey aktif
 *   GET  /tenants            cari tenant MID aktif (query >= 2 char; tanpa PIC)
 *   GET  /tenant-detail      detail tenant tertentu (PIC hanya utk tenant ini)
 *   GET  /check              cek duplikat perangkat (fingerprint)
 *   POST /submit             submit publik anonim (15 / 15 mnt / IP)
 *   GET  /results-list       hasil submitted+reviewed, PII stripped (40 / mnt)
 *   GET  /results-analytics  agregat analitik publik (40 / mnt)
 *   GET  /results-roster     roster MID aktif tanpa PIC (12 / mnt)
 *   GET  /directory          direktori tenant MID aktif (12 / mnt)
 *
 * Auth (role matrix):
 *   STAFF=[superadmin,admin] → CRUD, review, config, export, delete
 *   ANALYTICS_READ=+tenant_relation → analytics, summary, roster
 *   LIST_READ=+eo_tenant → list, get (row milik sendiri; TR PII stripped)
 *
 * Boundary: server kembalikan row mentah snake_case; pemetaan camelCase
 * hanya di src/utils/api/* (client). Envelope GET publik/staff:
 * { success: true, data: ... }; POST flat { success, ... }.
 */
import { Router } from 'express';
import { db } from '../db.js';
import {
  requireRole,
  logActivity,
  STAFF_ROLES,
  ANALYTICS_READ_ROLES_WITH_DEMO,
  LIST_READ_ROLES_WITH_DEMO,
  DEMO_READ_ROLES,
} from '../auth.js';
import { enforceRateLimit, clientIp } from '../lib/rateLimit.js';

const router = Router();

// ─── Konfigurasi ───────────────────────────────────────────────────
const MID_API_KEY = process.env.MID_API_KEY || '';
const MID_API_URL = 'https://apiloyalty.metropolitanland.com/getAllTenants';

/** Fail-closed bila kunci MID tidak dikonfigurasi. */
function midConfigured() {
  return Boolean(MID_API_KEY);
}

/** Fetch tenant aktif dari API loyalitas MID — tanpa PIC. */
async function fetchMidActiveTenants() {
  const resp = await fetch(MID_API_URL, {
    headers: { 'mid-api-key': MID_API_KEY },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) {
    const err = new Error(`MID upstream ${resp.status}`);
    err.code = 'UPSTREAM';
    throw err;
  }
  const json = await resp.json();
  const list = Array.isArray(json.data) ? json.data : [];
  return list
    .filter((t) => String(t.TENANT_STATUS ?? '').toLowerCase() === 'active')
    .map((t) => ({
      id: String(t.TENANT_ID ?? ''),
      name: String(t.TENANT_NAME ?? '').trim(),
      floor: String(t.TENANT_FLOOR ?? '').trim(),
      lot: String(t.TENANT_LOT ?? '').trim(),
      category: String(t.TENANT_CATEGORY ?? '').trim(),
      logo: String(t.TENANT_LOGO ?? '').trim(),
    }))
    .filter((t) => t.id && t.name);
}

// ─── Helpers ───────────────────────────────────────────────────────
function sanitize(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, maxLen);
}

const SURVEY_OPTIONS = {
  lokasi_zona: ['Atrium Utama', 'Pintu Utara 2', 'Lantai Dasar', 'Lantai 1', 'Lantai 2', 'Lantai 3'],
  kategori: [
    'Food & Beverage (F&B)',
    'Fashion & Aksesoris',
    'Lifestyle & Hobi',
    'Hiburan / Mainan Anak',
    'Servis / Jasa',
    'Supermarket / Department Store',
  ],
  kenaikan_traffic: ['Signifikan', 'Sedikit Naik', 'Tidak Ada', 'Menurun'],
  kenaikan_sales: [
    'Tidak ada kenaikan / Sama saja',
    '< 10%',
    '10% - 30%',
    '30% - 50%',
    '> 50%',
  ],
};

function pushTextLimitErrors(body, errors) {
  const limits = [
    ['feedback_teks', 2000],
    ['feedback_comment', 2000],
    ['improvement_suggestion', 2000],
    ['pic_name', 100],
    ['pic_phone', 20],
  ];
  const LABELS = {
    feedback_teks: 'Teks masukan',
    feedback_comment: 'Komentar',
    improvement_suggestion: 'Saran perbaikan',
    pic_name: 'Nama penanggung jawab',
    pic_phone: 'Nomor telepon penanggung jawab',
  };
  for (const [field, max] of limits) {
    const raw = body[field];
    if (raw != null && String(raw).length > max) {
      errors.push(`${LABELS[field] ?? field} maksimal ${max} karakter`);
    }
  }
}

function validatePublicSubmission(body) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('ID event wajib diisi.');
  }

  if (!body.nama_gerai || typeof body.nama_gerai !== 'string' || !sanitize(body.nama_gerai).length) {
    errors.push('Nama gerai wajib diisi.');
  } else if (sanitize(body.nama_gerai).length > 100) {
    errors.push('Nama gerai maksimal 100 karakter.');
  }

  if (!body.lokasi_zona || !SURVEY_OPTIONS.lokasi_zona.includes(body.lokasi_zona)) {
    errors.push('Lokasi/zona wajib dipilih dari daftar yang tersedia.');
  }
  if (!body.kategori || !SURVEY_OPTIONS.kategori.includes(body.kategori)) {
    errors.push('Kategori wajib dipilih dari daftar yang tersedia.');
  }
  if (!body.kenaikan_traffic || !SURVEY_OPTIONS.kenaikan_traffic.includes(body.kenaikan_traffic)) {
    errors.push('Kenaikan traffic wajib dipilih dari daftar yang tersedia.');
  }
  if (!body.kenaikan_sales || !SURVEY_OPTIONS.kenaikan_sales.includes(body.kenaikan_sales)) {
    errors.push('Kenaikan sales wajib dipilih dari daftar yang tersedia.');
  }

  pushTextLimitErrors(body, errors);
  return errors;
}

/** Config tidak ada = inactive (default aman untuk publik). */
async function tenantSurveyActive(eventId) {
  const { rows } = await db.query(
    'SELECT is_active FROM tenant_survey_config WHERE event_id = $1 LIMIT 1',
    [eventId],
  );
  return rows[0]?.is_active === true;
}

/** PII strip utk tenant_relation — null/'' utk field kontak. */
function stripSurveyPii(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  out.pic_name = null;
  out.pic_phone = null;
  out.tenant_email = '';
  out.tenant_phone = '';
  return out;
}

/** Peta row sesuai role: tenant_relation → PII stripped. */
function mapRowsForRole(rows, role) {
  if (role !== 'tenant_relation') return rows;
  return (rows || []).map(stripSurveyPii);
}

/** UID scope utk tenant (bukan superset staff): hanya milik sendiri. */
function isScopedTenant(role) {
  return !STAFF_ROLES.includes(role) && role !== 'tenant_relation';
}

function csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════

// ─── GET /events — event past+ongoing dgn survey aktif ─────────────
router.get('/events', async (_req, res, next) => {
  try {
    const { rows: configs } = await db.query(
      'SELECT event_id FROM tenant_survey_config WHERE is_active = true',
    );
    const activeIds = configs.map((c) => c.event_id).filter(Boolean);
    if (activeIds.length === 0) {
      return res.json({ success: true, data: { events: [] } });
    }
    const { rows } = await db.query(
      `SELECT id, acara, tanggal, lokasi, eo, status
       FROM events
       WHERE status IN ('past', 'ongoing') AND id = ANY($1::text[])
       ORDER BY tanggal DESC
       LIMIT 200`,
      [activeIds],
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /event-info ───────────────────────────────────────────────
router.get('/event-info', async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });

  try {
    const { rows } = await db.query(
      'SELECT id, acara, tanggal, lokasi, eo, status FROM events WHERE id = $1 LIMIT 1',
      [eventId],
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Event tidak ditemukan' });
    const isActive = await tenantSurveyActive(eventId);
    return res.json({ success: true, data: { ...rows[0], is_active: isActive } });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /tenants — pencarian tenant MID (tanpa PIC) ───────────────
router.get('/tenants', async (req, res, next) => {
  const q = String(req.query?.q || '').trim().toLowerCase();
  if (q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query pencarian minimal 2 karakter',
      data: [],
    });
  }

  try {
    const list = await fetchMidActiveTenants();
    const tenants = list
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 50)
      .map((t) => ({
        ...t,
        pic: '',
        picTelp: '',
        status: 'active',
        participantEvoucher: '',
      }));
    return res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('[tenant/tenants]', err);
    if (!midConfigured()) return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });
    if (err?.code === 'UPSTREAM') return res.status(502).json({ success: false, error: 'Gagal mengambil data tenant' });
    return res.status(500).json({ success: false, error: 'Gagal mengambil data tenant' });
  }
});

// ─── GET /tenant-detail — PIC hanya utk tenant yang dipilih ─────────
router.get('/tenant-detail', async (req, res, next) => {
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'ID wajib diisi.' });
  if (!midConfigured()) return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });

  try {
    const resp = await fetch(MID_API_URL, {
      headers: { 'mid-api-key': MID_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return res.status(502).json({ success: false, error: 'Gagal mengambil data tenant' });
    const json = await resp.json();
    const list = Array.isArray(json.data) ? json.data : [];
    const t = list.find((x) => String(x.TENANT_ID ?? '') === id);
    if (!t) return res.status(404).json({ success: false, error: 'Tenant tidak ditemukan' });

    return res.json({
      success: true,
      data: {
        id: String(t.TENANT_ID ?? ''),
        name: String(t.TENANT_NAME ?? '').trim(),
        pic: String(t.PIC_NAME ?? '').trim(),
        picTelp: String(t.PIC_Telp ?? '').trim(),
      },
    });
  } catch (err) {
    console.error('[tenant/tenant-detail]', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data tenant' });
  }
});

// ─── GET /check — duplikat perangkat (publik) ──────────────────────
router.get('/check', async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  const fingerprint = String(req.query?.fingerprint || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });
  if (!fingerprint) return res.json({ success: true, data: { submitted: false } });

  try {
    const { rows } = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM tenant_event_surveys
         WHERE event_id = $1 AND device_fingerprint = $2
           AND tenant_user_id IS NULL AND status = 'submitted'
       ) AS submitted`,
      [eventId, fingerprint],
    );
    return res.json({ success: true, data: { submitted: !!rows[0]?.submitted } });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /submit — publik anonim ──────────────────────────────────
router.post('/submit', async (req, res, next) => {
  // 15 submit / 15 mnt per IP (mirror api/tenant-survey.js).
  if (!enforceRateLimit(req, res, 'tenant-survey-submit', 15, 15 * 60 * 1000)) return;

  const body = req.body || {};

  const errors = validatePublicSubmission(body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const fingerprint = sanitize(body.device_fingerprint || '', 100);
  if (!fingerprint) {
    return res.status(400).json({
      success: false,
      error: 'device_fingerprint wajib diisi (digunakan untuk mencegah pengiriman duplikat)',
    });
  }

  const eventId = sanitize(body.event_id, 200);

  try {
    // Pre-check duplikat (unique index DB tetap sebagai garda kedua).
    const { rows: dup } = await db.query(
      `SELECT 1 FROM tenant_event_surveys
       WHERE event_id = $1 AND device_fingerprint = $2
         AND tenant_user_id IS NULL AND status = 'submitted'
       LIMIT 1`,
      [eventId, fingerprint],
    );
    if (dup[0]) {
      return res.status(409).json({
        success: false,
        error: 'Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.',
        already_submitted: true,
      });
    }

    const { rows: eventRow } = await db.query('SELECT id FROM events WHERE id = $1 LIMIT 1', [eventId]);
    if (!eventRow[0]) return res.status(404).json({ success: false, error: 'Event tidak ditemukan' });

    const active = await tenantSurveyActive(eventId);
    if (!active) {
      return res.status(403).json({
        success: false,
        error: 'Survey tenant untuk event ini tidak aktif atau sudah ditutup.',
      });
    }

    const { rows } = await db.query(
      `INSERT INTO tenant_event_surveys
        (event_id, tenant_user_id, tenant_name, tenant_organization, tenant_email, tenant_phone,
         business_category, business_subcategory, venue_rating, management_rating,
         event_organization_rating, booth_facility_rating, overall_rating,
         sales_lift_pct, traffic_lift_pct,
         feedback_comment, improvement_suggestion, nama_gerai, lokasi_zona, kategori,
         kenaikan_traffic, kenaikan_sales, feedback_teks, tenant_id,
         pic_name, pic_phone, device_fingerprint, ip_address, user_agent, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
               $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
       RETURNING id, created_at`,
      [
        eventId,
        null,
        null, null, null, null,
        null, null, null, null,
        null, null, null,
        null, null,
        sanitize(body.feedback_comment || '', 2000),
        sanitize(body.improvement_suggestion || '', 2000),
        sanitize(body.nama_gerai || '', 100),
        body.lokasi_zona || null,
        body.kategori || null,
        body.kenaikan_traffic || null,
        body.kenaikan_sales || null,
        sanitize(body.feedback_teks || '', 2000),
        sanitize(body.tenant_id || '', 100),
        sanitize(body.pic_name || '', 100),
        sanitize(body.pic_phone || '', 20),
        fingerprint,
        clientIp(req),
        sanitize(req.headers['user-agent'] || '', 500),
        'submitted',
        new Date().toISOString(),
      ],
    );
    const row = rows[0] || null;
    return res.status(201).json({ success: true, id: row?.id || '', created_at: row?.created_at || null });
  } catch (err) {
    // Partial unique violation (23505) → ramah pengguna (pola legacy).
    if (String(err?.code) === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.',
        already_submitted: true,
      });
    }
    return next(err);
  }
});

// ─── GET /results-list ─────────────────────────────────────────────
const PUBLIC_RESULTS_SELECT = [
  'id', 'event_id', 'tenant_id', 'tenant_name', 'nama_gerai', 'lokasi_zona', 'kategori',
  'kenaikan_traffic', 'kenaikan_sales', 'feedback_teks', 'status',
  'submitted_at', 'created_at', 'updated_at',
].join(',');

router.get('/results-list', async (req, res, next) => {
  // 40 req / mnt per IP.
  if (!enforceRateLimit(req, res, 'results-list', 40, 60_000)) return;

  const eventId = String(req.query?.event_id || '').trim();
  try {
    const { rows } = await db.query(
      `SELECT ${PUBLIC_RESULTS_SELECT}
       FROM tenant_event_surveys
       WHERE status IN ('submitted', 'reviewed')
         AND ($1 = '' OR event_id = $1)
       ORDER BY created_at DESC
       LIMIT 3000`,
      [eventId],
    );
    // Defense in depth — jangan pernah bocorkan PII.
    return res.json({ success: true, data: rows.map(stripSurveyPii) });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /results-analytics — agregat publik ───────────────────────
router.get('/results-analytics', async (req, res, next) => {
  // 40 req / mnt per IP.
  if (!enforceRateLimit(req, res, 'results-analytics', 40, 60_000)) return;

  const group = String(req.query?.group || 'tenant').trim();
  const eventId = String(req.query?.event_id || '').trim() || null;
  const allowedGroups = new Set(['tenant', 'event', 'month']);
  const groupBy = allowedGroups.has(group) ? group : 'tenant';

  try {
    const where = [`status IN ('submitted', 'reviewed')`];
    const params = [];
    if (eventId) {
      params.push(eventId);
      where.push(`event_id = $${params.length}`);
    }
    const whereSql = where.join(' AND ');

    let select;
    let groupClause;
    let order;
    let limitClause = '';
    if (groupBy === 'month') {
      select = `
        to_char(DATE_TRUNC('month', COALESCE(submitted_at, created_at)), 'YYYY-MM') AS period,
        COUNT(*)::int AS total_submissions,
        COUNT(*) FILTER (WHERE venue_rating IS NOT NULL)::int AS v2_count,
        COUNT(*) FILTER (WHERE venue_rating IS NULL AND nama_gerai IS NOT NULL)::int AS v3_count,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2)::float8 AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2)::float8 AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2)::float8 AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2)::float8 AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2)::float8 AS avg_overall_rating,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan')::int AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik')::int AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada')::int AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun')::int AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja')::int AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%')::int AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%')::int AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%')::int AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%')::int AS sales_gt_50`;
      groupClause = `GROUP BY period`;
      order = `ORDER BY period DESC`;
      limitClause = ` LIMIT 12`;
    } else if (groupBy === 'event') {
      select = `
        event_id,
        COUNT(*)::int AS total_surveys,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed'))::int AS submitted_surveys,
        COUNT(DISTINCT nama_gerai) FILTER (WHERE nama_gerai IS NOT NULL AND nama_gerai <> '')::int AS unique_tenants,
        COUNT(DISTINCT kategori) FILTER (WHERE kategori IS NOT NULL AND kategori <> '')::int AS unique_categories,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2)::float8 AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2)::float8 AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2)::float8 AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2)::float8 AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2)::float8 AS avg_overall_rating,
        MAX(created_at) AS last_survey_at,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan')::int AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik')::int AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada')::int AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun')::int AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja')::int AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%')::int AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%')::int AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%')::int AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%')::int AS sales_gt_50`;
      groupClause = `GROUP BY event_id`;
      order = `ORDER BY submitted_surveys DESC`;
    } else {
      select = `
        tenant_user_id,
        tenant_organization,
        COUNT(*)::int AS total_surveys,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed'))::int AS submitted_surveys,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2)::float8 AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2)::float8 AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2)::float8 AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2)::float8 AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2)::float8 AS avg_overall_rating,
        MAX(created_at) AS last_survey_at,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan')::int AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik')::int AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada')::int AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun')::int AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja')::int AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%')::int AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%')::int AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%')::int AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%')::int AS sales_gt_50`;
      groupClause = `GROUP BY tenant_user_id, tenant_organization`;
      order = `ORDER BY submitted_surveys DESC`;
    }

    const { rows } = await db.query(
      `SELECT ${select} FROM tenant_event_surveys WHERE ${whereSql} ${groupClause} ${order}${limitClause}`,
      params,
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /results-roster — roster MID tanpa PIC (publik) ───────────
router.get('/results-roster', async (req, res, next) => {
  // MID upstream mahal — limit ketat.
  if (!enforceRateLimit(req, res, 'results-roster', 12, 60_000)) return;
  if (!midConfigured()) return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });

  try {
    const tenants = await fetchMidActiveTenants();
    tenants.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    return res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('[tenant/results-roster]', err);
    if (err?.code === 'UPSTREAM') return res.status(502).json({ success: false, error: 'Gagal mengambil data tenant' });
    return res.status(500).json({ success: false, error: 'Gagal mengambil roster tenant' });
  }
});

// ─── GET /directory — direktori tenant MID (publik) ────────────────
router.get('/directory', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'directory', 12, 60_000)) return;
  if (!midConfigured()) return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });

  try {
    const tenants = await fetchMidActiveTenants();
    tenants.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    return res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('[tenant/directory]', err);
    if (err?.code === 'UPSTREAM') return res.status(502).json({ success: false, error: 'Layanan data tenant sedang bermasalah' });
    return res.status(500).json({ success: false, error: 'Gagal mengambil direktori tenant' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

// ─── GET /list ─────────────────────────────────────────────────────
router.get('/list', requireRole(LIST_READ_ROLES_WITH_DEMO), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  const { role, user } = req.auth;

  try {
    const where = [];
    const params = [];
    if (eventId) {
      params.push(eventId);
      where.push(`event_id = $${params.length}`);
    }
    // EO/tenant: hanya row milik sendiri. TR: hanya final (bukan draft).
    if (isScopedTenant(role)) {
      params.push(user.id);
      where.push(`tenant_user_id = $${params.length}`);
    } else if (role === 'tenant_relation') {
      where.push(`status IN ('submitted', 'reviewed')`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT * FROM tenant_event_surveys ${whereSql} ORDER BY created_at DESC`,
      params,
    );
    return res.json({ success: true, data: mapRowsForRole(rows, role) });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /get ──────────────────────────────────────────────────────
router.get('/get', requireRole(LIST_READ_ROLES_WITH_DEMO), async (req, res, next) => {
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'ID wajib diisi.' });

  const { role, user } = req.auth;
  try {
    const { rows } = await db.query('SELECT * FROM tenant_event_surveys WHERE id = $1 LIMIT 1', [id]);
    const row = rows[0] || null;
    if (!row) return res.status(404).json({ success: false, error: 'Survey tidak ditemukan.' });

    const canSeeAll = STAFF_ROLES.includes(role) || role === 'tenant_relation';
    if (!canSeeAll && row.tenant_user_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Tidak berhak melihat survey ini.' });
    }
    if (role === 'tenant_relation' && row.status === 'draft') {
      return res.status(403).json({ success: false, error: 'Tidak berhak melihat survey ini.' });
    }
    return res.json({ success: true, data: role === 'tenant_relation' ? stripSurveyPii(row) : row });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /create ──────────────────────────────────────────────────
router.post('/create', requireRole([...STAFF_ROLES, 'eo_tenant']), async (req, res, next) => {
  const body = req.body || {};
  const { user } = req.auth;

  const errors = validatePublicSubmission(body);
  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  try {
    const { rows } = await db.query(
      `INSERT INTO tenant_event_surveys
        (event_id, tenant_user_id, tenant_name, tenant_organization, tenant_email, tenant_phone,
         venue_rating, management_rating, event_organization_rating, booth_facility_rating, overall_rating,
         feedback_comment, improvement_suggestion, nama_gerai, lokasi_zona, kategori,
         kenaikan_traffic, kenaikan_sales, feedback_teks, tenant_id,
         pic_name, pic_phone, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'draft')
       RETURNING *`,
      [
        sanitize(body.event_id, 200),
        user.id,
        sanitize(body.tenant_name || '', 100),
        sanitize(body.tenant_organization || '', 200),
        sanitize(body.tenant_email || '', 254),
        sanitize(body.tenant_phone || '', 20),
        body.venue_rating ?? null,
        body.management_rating ?? null,
        body.event_organization_rating ?? null,
        body.booth_facility_rating ?? null,
        body.overall_rating ?? null,
        sanitize(body.feedback_comment || '', 2000),
        sanitize(body.improvement_suggestion || '', 2000),
        sanitize(body.nama_gerai || '', 100),
        body.lokasi_zona || null,
        body.kategori || null,
        body.kenaikan_traffic || null,
        body.kenaikan_sales || null,
        sanitize(body.feedback_teks || '', 2000),
        sanitize(body.tenant_id || '', 100),
        sanitize(body.pic_name || '', 100),
        sanitize(body.pic_phone || '', 20),
      ],
    );
    return res.status(201).json({ success: true, data: rows[0] || null });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /update — draft milik sendiri (staff bisa semua) ─────────
router.post('/update', requireRole([...STAFF_ROLES, 'eo_tenant']), async (req, res, next) => {
  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  if (!id) return res.status(400).json({ success: false, error: 'ID wajib diisi.' });

  const { role, user } = req.auth;
  try {
    const { rows } = await db.query(
      'SELECT id, tenant_user_id, status FROM tenant_event_surveys WHERE id = $1 LIMIT 1',
      [id],
    );
    const existing = rows[0] || null;
    if (!existing) return res.status(404).json({ success: false, error: 'Survey tidak ditemukan.' });

    const isStaff = STAFF_ROLES.includes(role);
    if (!isStaff && existing.tenant_user_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Tidak berhak melakukan aksi ini.' });
    }
    if (!isStaff && existing.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Hanya survey berstatus draft yang bisa diperbarui.' });
    }

    // Whitelist kolom yang boleh di-update.
    const textFields = [
      'tenant_name', 'tenant_organization', 'tenant_email', 'tenant_phone',
      'feedback_comment', 'improvement_suggestion', 'pic_name', 'pic_phone',
      'nama_gerai', 'lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales',
      'feedback_teks', 'tenant_id', 'business_category', 'business_subcategory',
    ];
    const ratingFields = [
      'venue_rating', 'management_rating', 'event_organization_rating', 'booth_facility_rating', 'overall_rating',
    ];
    const sets = [];
    const values = [];

    for (const f of ratingFields) {
      if (body[f] !== undefined) {
        const v = body[f] !== null && body[f] !== '' ? parseInt(body[f], 10) : null;
        values.push(v);
        sets.push(`${f} = $${values.length}`);
      }
    }
    if (body.sales_lift_pct !== undefined) {
      values.push(body.sales_lift_pct === '' ? null : Number(body.sales_lift_pct));
      sets.push(`sales_lift_pct = $${values.length}`);
    }
    if (body.traffic_lift_pct !== undefined) {
      values.push(body.traffic_lift_pct === '' ? null : Number(body.traffic_lift_pct));
      sets.push(`traffic_lift_pct = $${values.length}`);
    }
    for (const f of textFields) {
      if (body[f] !== undefined) {
        const val = body[f] === null ? null : sanitize(String(body[f]) || '', 3000);
        values.push(val);
        sets.push(`${f} = $${values.length}`);
      }
    }
    if (body.status && ['draft', 'submitted'].includes(body.status)) {
      values.push(body.status);
      sets.push(`status = $${values.length}`);
      if (body.status === 'submitted') {
        values.push(new Date().toISOString());
        sets.push(`submitted_at = $${values.length}`);
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, error: 'Tidak ada perubahan' });

    values.push(id);
    const { rows: updated } = await db.query(
      `UPDATE tenant_event_surveys SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return res.json({ success: true, data: updated[0] || null });
  } catch (err) {
    if (String(err?.code) === '23505') {
      return res.status(409).json({ success: false, error: 'Survey sudah pernah dikirim untuk event ini.' });
    }
    return next(err);
  }
});

// ─── POST /submit (auth, submit draft milik sendiri) — DIHAPUS ──────
// Dead code: route POST /submit public (line 327) match lebih dulu di
// Express; FE submit draft via /tenant/update (updateTenantSurvey) —
// duplikat ini tak terjangkau. Dihapus saat audit 2026-09-09.

// ─── POST /review — staff ──────────────────────────────────────────
router.post('/review', requireRole(STAFF_ROLES), async (req, res, next) => {
  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  const reviewNotes = sanitize(body.review_notes || '', 2000);
  if (!id) return res.status(400).json({ success: false, error: 'ID wajib diisi.' });

  try {
    const { rows } = await db.query(
      `UPDATE tenant_event_surveys
       SET status = 'reviewed', reviewed_by = $1, reviewed_at = $2, review_notes = $3
       WHERE id = $4
       RETURNING *`,
      [req.auth.user.id, new Date().toISOString(), reviewNotes, id],
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Survey tidak ditemukan.' });
    logActivity(req.auth.user, 'review_tenant_survey', 'tenant_survey', id, { status: 'reviewed' }, req);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /delete — staff hard-delete ──────────────────────────────
router.post('/delete', requireRole(STAFF_ROLES), async (req, res, next) => {
  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  if (!id) return res.status(400).json({ success: false, error: 'ID wajib diisi.' });

  try {
    const { rows } = await db.query('SELECT id FROM tenant_event_surveys WHERE id = $1 LIMIT 1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Survey tidak ditemukan.' });

    await db.query('DELETE FROM tenant_event_surveys WHERE id = $1', [id]);
    logActivity(req.auth.user, 'delete_tenant_survey', 'tenant_survey', id, null, req);
    return res.json({ success: true, id });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /analytics — group tenant/event/month ─────────────────────
router.get('/analytics', requireRole(ANALYTICS_READ_ROLES_WITH_DEMO), async (req, res, next) => {
  const group = String(req.query?.group || 'tenant').trim();
  const eventId = String(req.query?.event_id || '').trim() || null;
  const allowedGroups = new Set(['tenant', 'event', 'month']);
  const groupBy = allowedGroups.has(group) ? group : 'tenant';

  const isAdminScope = ANALYTICS_READ_ROLES_WITH_DEMO.includes(req.auth.role);
  const tenantUserId = isAdminScope ? null : req.auth.user?.id || null;

  try {
    const where = [`status IN ('submitted', 'reviewed')`];
    const params = [];
    if (!tenantUserId) {
      // cakupan penuh — filter event opsional
      if (eventId) {
        params.push(eventId);
        where.push(`event_id = $${params.length}`);
      }
    } else {
      params.push(tenantUserId);
      where.push(`tenant_user_id = $${params.length}`);
    }
    const whereSql = where.join(' AND ');

    let select;
    let groupClause;
    let order;
    let limitClause = '';
    if (groupBy === 'month') {
      select = `
        to_char(DATE_TRUNC('month', COALESCE(submitted_at, created_at)), 'YYYY-MM') AS period,
        COUNT(*)::int AS total_submissions,
        COUNT(*) FILTER (WHERE venue_rating IS NOT NULL)::int AS v2_count,
        COUNT(*) FILTER (WHERE venue_rating IS NULL AND nama_gerai IS NOT NULL)::int AS v3_count,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2)::float8 AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2)::float8 AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2)::float8 AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2)::float8 AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2)::float8 AS avg_overall_rating,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan')::int AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik')::int AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada')::int AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun')::int AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja')::int AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%')::int AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%')::int AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%')::int AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%')::int AS sales_gt_50`;
      groupClause = `GROUP BY period`;
      order = `ORDER BY period DESC`;
      limitClause = ` LIMIT 12`;
    } else if (groupBy === 'event') {
      select = `
        event_id,
        COUNT(*)::int AS total_surveys,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed'))::int AS submitted_surveys,
        COUNT(DISTINCT nama_gerai) FILTER (WHERE nama_gerai IS NOT NULL AND nama_gerai <> '')::int AS unique_tenants,
        COUNT(DISTINCT kategori) FILTER (WHERE kategori IS NOT NULL AND kategori <> '')::int AS unique_categories,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2)::float8 AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2)::float8 AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2)::float8 AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2)::float8 AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2)::float8 AS avg_overall_rating,
        MAX(created_at) AS last_survey_at,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan')::int AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik')::int AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada')::int AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun')::int AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja')::int AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%')::int AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%')::int AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%')::int AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%')::int AS sales_gt_50`;
      groupClause = `GROUP BY event_id`;
      order = `ORDER BY submitted_surveys DESC`;
    } else {
      select = `
        tenant_user_id,
        tenant_organization,
        COUNT(*)::int AS total_surveys,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed'))::int AS submitted_surveys,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2)::float8 AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2)::float8 AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2)::float8 AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2)::float8 AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2)::float8 AS avg_overall_rating,
        MAX(created_at) AS last_survey_at,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan')::int AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik')::int AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada')::int AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun')::int AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja')::int AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%')::int AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%')::int AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%')::int AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%')::int AS sales_gt_50`;
      groupClause = `GROUP BY tenant_user_id, tenant_organization`;
      order = `ORDER BY submitted_surveys DESC`;
    }

    const { rows } = await db.query(
      `SELECT ${select} FROM tenant_event_surveys WHERE ${whereSql} ${groupClause} ${order}${limitClause}`,
      params,
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /summary — ringkasan per-event (tenant + visitor) ─────────
router.get('/summary', requireRole(ANALYTICS_READ_ROLES_WITH_DEMO), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });

  try {
    const { rows } = await db.query(
      `SELECT
         tes.event_id,
         tes.tenant_name,
         tes.tenant_organization,
         tes.status AS tenant_survey_status,
         tes.venue_rating,
         tes.management_rating,
         tes.event_organization_rating,
         tes.booth_facility_rating,
         tes.overall_rating,
         tes.nama_gerai,
         tes.lokasi_zona,
         tes.kategori,
         tes.kenaikan_traffic,
         tes.kenaikan_sales,
         tes.feedback_teks,
         tes.feedback_comment,
         tes.improvement_suggestion,
         tes.created_at AS tenant_survey_created_at,
         COALESCE(sr.total_visitor_responses, 0)::int AS total_visitor_responses,
         sr.visitor_mall_overall,
         sr.visitor_eo_overall
       FROM tenant_event_surveys tes
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)::int AS total_visitor_responses,
           ROUND(AVG((mall_cleanliness + mall_staff_service + mall_coordination + mall_security)::numeric / 4), 1)::float8 AS visitor_mall_overall,
           ROUND(AVG(
             (COALESCE(eo_event_quality, 0) + COALESCE(eo_organization, 0) +
              COALESCE(eo_committee_service, 0) + COALESCE(eo_promotion_accuracy, 0) +
              COALESCE(eo_recommendation, 0))::numeric / 5
           ) FILTER (WHERE survey_type = 'public'), 1)::float8 AS visitor_eo_overall
         FROM survey_responses
         WHERE survey_responses.event_id = tes.event_id
       ) sr ON true
       WHERE tes.event_id = $1
       ORDER BY tes.created_at DESC
       LIMIT 1`,
      [eventId],
    );
    return res.json({
      success: true,
      data: rows[0] || { event_id: eventId, tenant_survey_status: 'none' },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /roster — roster tenant penuh untuk TR/staff (tanpa PIC) ──
router.get('/roster', requireRole(ANALYTICS_READ_ROLES_WITH_DEMO), async (_req, res, next) => {
  if (!midConfigured()) return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });
  try {
    const tenants = await fetchMidActiveTenants();
    tenants.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    return res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('[tenant/roster]', err);
    if (err?.code === 'UPSTREAM') return res.status(502).json({ success: false, error: 'Gagal mengambil data tenant' });
    return res.status(500).json({ success: false, error: 'Gagal mengambil roster tenant' });
  }
});

// ─── GET /config — staff + EO ─────────────────────────────────────
router.get('/config', requireRole([...LIST_READ_ROLES_WITH_DEMO, 'eo_tenant']), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });

  try {
    const { rows } = await db.query('SELECT * FROM tenant_survey_config WHERE event_id = $1 LIMIT 1', [eventId]);
    return res.json({
      success: true,
      data: rows[0] || {
        event_id: eventId,
        is_active: false,
        activated_at: null,
        deactivated_at: null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /config-set — staff ─────────────────────────────────────
router.post('/config-set', requireRole(STAFF_ROLES), async (req, res, next) => {
  const body = req.body || {};
  const eventId = sanitize(body.event_id || '', 200);
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });

  const now = new Date().toISOString();
  const isActive = !!body.is_active;

  try {
    const { rows } = await db.query(
      `INSERT INTO tenant_survey_config (event_id, is_active, activated_at, deactivated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         activated_at = EXCLUDED.activated_at,
         deactivated_at = EXCLUDED.deactivated_at,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [eventId, isActive, isActive ? now : null, !isActive ? now : null, now],
    );
    logActivity(req.auth.user, 'set_tenant_survey_config', 'tenant_survey_config', eventId, { is_active: isActive }, req);
    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /export — staff (CSV dengan PIC) ─────────────────────────
router.get('/export', requireRole(DEMO_READ_ROLES), async (req, res, next) => {
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM tenant_event_surveys
       WHERE event_id = $1 AND status IN ('submitted', 'reviewed')
       ORDER BY created_at ASC
       LIMIT 5000`,
      [eventId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tidak ada data survey untuk event ini' });
    }

    const headers = [
      'ID', 'Nama Gerai', 'Lokasi', 'Kategori', 'Traffic', 'Sales', 'Feedback',
      'PIC Name', 'PIC Phone', 'Venue', 'Manajemen', 'Organisasi', 'Fasilitas', 'Overall',
      'Feedback V2', 'Saran', 'Status', 'Tanggal',
    ];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      csvRows.push([
        r.id,
        csvEscape(r.nama_gerai || r.tenant_name || ''),
        csvEscape(r.lokasi_zona || ''),
        csvEscape(r.kategori || ''),
        csvEscape(r.kenaikan_traffic || ''),
        csvEscape(r.kenaikan_sales || ''),
        csvEscape(r.feedback_teks || ''),
        csvEscape(r.pic_name || ''),
        csvEscape(r.pic_phone || ''),
        r.venue_rating ?? '', r.management_rating ?? '', r.event_organization_rating ?? '',
        r.booth_facility_rating ?? '', r.overall_rating ?? '',
        csvEscape(r.feedback_comment || ''),
        csvEscape(r.improvement_suggestion || ''),
        r.status,
        r.created_at,
      ].join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `tenant-survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (err) {
    return next(err);
  }
});

export default router;