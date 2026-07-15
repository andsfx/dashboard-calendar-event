import { getServiceSupabase, getAnonSupabase, requireAuth } from './_lib/auth.js';
import { SURVEY_OPTIONS } from '../src/constants/survey-options.js';

/**
 * /api/tenant-survey — Unified tenant (EO) self-assessment survey endpoint
 *
 * Public (mode=public, no auth):
 *   ?mode=public&action=events      GET   — List active survey events (status past|ongoing + is_active)
 *   ?mode=public&action=event-info  GET   — Fetch event details
 *   ?mode=public&action=tenants     GET   — List tenants from MID loyalty API (proxied)
 *   ?mode=public&action=check       GET   — Check if device already submitted (by fingerprint)
 *   ?mode=public&action=submit      POST  — Submit a new tenant survey (anonymous)
 *
 * Authenticated (mode=auth, default):
 *   ?action=list        GET   — List tenant surveys (scoped to user or all for admin)
 *   ?action=get         GET   — Get single survey by id
 *   ?action=create      POST  — Create new tenant survey
 *   ?action=update      POST  — Update existing draft survey
 *   ?action=submit      POST  — Submit a draft survey
 *   ?action=review      POST  — Admin review a submitted survey
 *   ?action=delete      POST  — Admin hard-delete a survey response
 *   ?action=analytics   GET   — Get aggregated analytics
 *   ?action=summary     GET   — Get per-event combined summary
 *   ?action=config-get  GET   — Get survey config for event
 *   ?action=config-set  POST  — Create/update survey config
 *   ?action=export      GET   — Export responses as CSV
 */
export default async function handler(req, res) {
  const mode = String(req.query?.mode || 'auth').trim();
  const action = String(req.query?.action || '').trim();

  try {
    if (mode === 'public') {
      return await handlePublic(req, res, action);
    }
    return await handleAuth(req, res, action);
  } catch (err) {
    console.error(`[tenant-survey/${mode}/${action}]`, err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Router ──────────────────────────────────────────────────────

async function handlePublic(req, res, action) {
  switch (action) {
    case 'events':     return await handlePublicEvents(req, res);
    case 'event-info': return await handlePublicEventInfo(req, res);
    case 'tenants':    return await handlePublicTenants(req, res);
    case 'tenant-detail': return await handlePublicTenantDetail(req, res);
    case 'check':      return await handlePublicCheck(req, res);
    case 'submit':     return await handlePublicSubmit(req, res);
    default:
      return res.status(400).json({ success: false, error: `Unknown action: ${action || '(empty)'}` });
  }
}

async function handleAuth(req, res, action) {
  switch (action) {
    case 'list':      return await handleList(req, res);
    case 'get':       return await handleGet(req, res);
    case 'create':    return await handleCreate(req, res);
    case 'update':    return await handleUpdate(req, res);
    case 'submit':    return await handleSubmit(req, res);
    case 'review':    return await handleReview(req, res);
    case 'delete':    return await handleDelete(req, res);
    case 'analytics': return await handleAnalytics(req, res);
    case 'summary':   return await handleSummary(req, res);
    case 'config-get': return await handleConfigGet(req, res);
    case 'config-set': return await handleConfigSet(req, res);
    case 'export':    return await handleExport(req, res);
    default:
      return res.status(400).json({ success: false, error: `Unknown action: ${action || '(empty)'}` });
  }
}

// ─── Shared helpers ───────────────────────────────────────────────

function sanitize(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, maxLen);
}

/** Roles that can manage ops (CRUD, config, review, full CSV with PIC). */
const STAFF_ROLES = ['superadmin', 'admin'];
/** Roles that can read full aggregate analytics (includes Tenant Relation). */
const ANALYTICS_READ_ROLES = ['superadmin', 'admin', 'tenant_relation'];
/** Roles that can list rows (TR gets all rows, PIC stripped). */
const LIST_READ_ROLES = ['superadmin', 'admin', 'tenant_relation', 'eo_tenant'];

function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

function isAnalyticsReader(role) {
  return ANALYTICS_READ_ROLES.includes(role);
}

/** Strip PII fields for tenant_relation responses. */
function stripSurveyPii(row) {
  if (!row || typeof row !== 'object') return row;
  const {
    pic_name: _pn,
    pic_phone: _pp,
    tenant_email: _te,
    tenant_phone: _tp,
    ...safe
  } = row;
  return {
    ...safe,
    pic_name: null,
    pic_phone: null,
    tenant_email: '',
    tenant_phone: '',
  };
}

function mapRowsForRole(rows, role) {
  if (role !== 'tenant_relation') return rows;
  return (rows || []).map(stripSurveyPii);
}

function isValidRating(val, max = 5) {
  return Number.isInteger(val) && val >= 1 && val <= max;
}

// DEPRECATED in v3 — rating fields no longer collected. Kept for reference only.
const RATING_FIELDS = [
  'venue_rating', 'management_rating',
  'event_organization_rating', 'booth_facility_rating',
];

const RATING_MAX = 5;

// ─── Validators ───────────────────────────────────────────────────

function pushTextLimitErrors(body, errors) {
  const limits = [
    ['feedback_teks', 2000],
    ['feedback_comment', 2000],
    ['improvement_suggestion', 2000],
    ['pic_name', 100],
    ['pic_phone', 20],
  ];
  for (const [field, max] of limits) {
    const raw = body[field];
    if (raw != null && String(raw).length > max) {
      errors.push(`${field} maksimal ${max} karakter`);
    }
  }
}

function validateSurveyBody(body, isDraft = false) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('event_id wajib diisi');
  }

  if (!isDraft) {
    if (!body.nama_gerai || typeof body.nama_gerai !== 'string' || !sanitize(body.nama_gerai).length || sanitize(body.nama_gerai).length > 100) {
      errors.push('nama_gerai wajib diisi (maksimal 100 karakter)');
    }

    if (!body.lokasi_zona || !SURVEY_OPTIONS.lokasi_zona.includes(body.lokasi_zona)) {
      errors.push(`lokasi_zona harus salah satu dari: ${SURVEY_OPTIONS.lokasi_zona.join(', ')}`);
    }

    if (!body.kategori || !SURVEY_OPTIONS.kategori.includes(body.kategori)) {
      errors.push(`kategori harus salah satu dari: ${SURVEY_OPTIONS.kategori.join(', ')}`);
    }

    if (!body.kenaikan_traffic || !SURVEY_OPTIONS.kenaikan_traffic.includes(body.kenaikan_traffic)) {
      errors.push(`kenaikan_traffic harus salah satu dari: ${SURVEY_OPTIONS.kenaikan_traffic.join(', ')}`);
    }

    if (!body.kenaikan_sales || !SURVEY_OPTIONS.kenaikan_sales.includes(body.kenaikan_sales)) {
      errors.push(`kenaikan_sales harus salah satu dari: ${SURVEY_OPTIONS.kenaikan_sales.join(', ')}`);
    }
  }

  pushTextLimitErrors(body, errors);
  return errors;
}

function validatePublicSubmission(body) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('event_id wajib diisi');
  }

  if (!body.nama_gerai || typeof body.nama_gerai !== 'string' || !sanitize(body.nama_gerai).length) {
    errors.push('nama_gerai wajib diisi');
  } else if (sanitize(body.nama_gerai).length > 100) {
    errors.push('nama_gerai maksimal 100 karakter');
  }

  if (!body.lokasi_zona || !SURVEY_OPTIONS.lokasi_zona.includes(body.lokasi_zona)) {
    errors.push(`lokasi_zona harus salah satu dari: ${SURVEY_OPTIONS.lokasi_zona.join(', ')}`);
  }

  if (!body.kategori || !SURVEY_OPTIONS.kategori.includes(body.kategori)) {
    errors.push(`kategori harus salah satu dari: ${SURVEY_OPTIONS.kategori.join(', ')}`);
  }

  if (!body.kenaikan_traffic || !SURVEY_OPTIONS.kenaikan_traffic.includes(body.kenaikan_traffic)) {
    errors.push(`kenaikan_traffic harus salah satu dari: ${SURVEY_OPTIONS.kenaikan_traffic.join(', ')}`);
  }

  if (!body.kenaikan_sales || !SURVEY_OPTIONS.kenaikan_sales.includes(body.kenaikan_sales)) {
    errors.push(`kenaikan_sales harus salah satu dari: ${SURVEY_OPTIONS.kenaikan_sales.join(', ')}`);
  }

  pushTextLimitErrors(body, errors);
  return errors;
}

/** Config missing row = inactive (safe default for public). */
async function isTenantSurveyActive(sb, eventId) {
  const { data } = await sb
    .from('tenant_survey_config')
    .select('is_active')
    .eq('event_id', eventId)
    .maybeSingle();
  return data?.is_active === true;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC HANDLERS (mode=public, no auth)
// ═══════════════════════════════════════════════════════════════════

// ─── Public: List surveyable events ───────────────────────────────

async function handlePublicEvents(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const sb = getServiceSupabase();

  // Hanya event dengan config is_active=true (no row = inactive)
  const { data: configs, error: cfgErr } = await sb
    .from('tenant_survey_config')
    .select('event_id')
    .eq('is_active', true);

  if (cfgErr) {
    console.error('[tenant-survey/public/events] config', cfgErr);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data event' });
  }

  const activeIds = (configs || []).map((c) => c.event_id).filter(Boolean);
  if (activeIds.length === 0) {
    return res.json({ success: true, events: [] });
  }

  // past + ongoing (survey boleh dibuka saat/setelah event)
  const { data, error } = await sb
    .from('events')
    .select('id, acara, tanggal, lokasi, eo, status')
    .in('status', ['past', 'ongoing'])
    .in('id', activeIds)
    .order('tanggal', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[tenant-survey/public/events]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data event' });
  }

  return res.json({ success: true, events: data || [] });
}

// ─── Public: List tenants ──────────────────────────────────────────

async function handlePublicTenants(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const q = (req.query?.q || '').trim().toLowerCase();
  if (q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query pencarian minimal 2 karakter',
      tenants: [],
    });
  }

  const API_KEY = process.env.MID_API_KEY;
  const API_URL = 'https://apiloyalty.metropolitanland.com/getAllTenants';

  if (!API_KEY) {
    console.error('[tenant-survey/public/tenants] MID_API_KEY not set');
    return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });
  }

  try {
    const resp = await fetch(API_URL, {
      headers: { 'mid-api-key': API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.error('[tenant-survey/public/tenants] upstream', resp.status);
      return res.status(502).json({ success: false, error: 'Gagal mengambil data tenant' });
    }
    const json = await resp.json();
    const list = Array.isArray(json.data) ? json.data : [];

    // Minimal fields only — no PIC/telp/evoucher mass dump to anon clients
    const tenants = list
      .filter((t) => String(t.TENANT_STATUS ?? '').toLowerCase() === 'active')
      .map((t) => ({
        id: String(t.TENANT_ID ?? ''),
        name: String(t.TENANT_NAME ?? '').trim(),
        floor: String(t.TENANT_FLOOR ?? '').trim(),
        lot: String(t.TENANT_LOT ?? '').trim(),
        category: String(t.TENANT_CATEGORY ?? '').trim(),
        logo: String(t.TENANT_LOGO ?? '').trim(),
        pic: '',
        picTelp: '',
        status: 'active',
        participantEvoucher: '',
      }))
      .filter((t) => t.name && t.name.toLowerCase().includes(q))
      .slice(0, 50);

    return res.json({ success: true, tenants });
  } catch (err) {
    console.error('[tenant-survey/public/tenants] fetch error', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data tenant' });
  }
}

// ─── Public: Tenant detail (PIC only) ───────────────────────────
// Secure auto-fill: list response strips PIC (no mass PII dump), but when a
// tenant is explicitly selected we return only that one tenant's PIC fields.

async function handlePublicTenantDetail(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const API_KEY = process.env.MID_API_KEY;
  const API_URL = 'https://apiloyalty.metropolitanland.com/getAllTenants';

  if (!API_KEY) {
    console.error('[tenant-survey/public/tenant-detail] MID_API_KEY not set');
    return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });
  }

  try {
    const resp = await fetch(API_URL, {
      headers: { 'mid-api-key': API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.error('[tenant-survey/public/tenant-detail] upstream', resp.status);
      return res.status(502).json({ success: false, error: 'Gagal mengambil data tenant' });
    }
    const json = await resp.json();
    const list = Array.isArray(json.data) ? json.data : [];
    const t = list.find((x) => String(x.TENANT_ID ?? '') === id);
    if (!t) {
      return res.status(404).json({ success: false, error: 'Tenant tidak ditemukan' });
    }
    // Only PIC fields for the explicitly-selected tenant (no mass PII dump)
    return res.json({
      success: true,
      tenant: {
        id: String(t.TENANT_ID ?? ''),
        name: String(t.TENANT_NAME ?? '').trim(),
        pic: String(t.PIC_NAME ?? '').trim(),
        picTelp: String(t.PIC_Telp ?? '').trim(),
      },
    });
  } catch (err) {
    console.error('[tenant-survey/public/tenant-detail] fetch error', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data tenant' });
  }
}

// ─── Public: Event info ──────────────────────────────────────────

async function handlePublicEventInfo(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('events')
    .select('id, acara, tanggal, lokasi, eo, status')
    .eq('id', eventId)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, error: 'Event tidak ditemukan' });
  }

  const is_active = await isTenantSurveyActive(sb, eventId);
  return res.json({ success: true, event: data, is_active });
}

// ─── Public: Check duplicate ─────────────────────────────────────

async function handlePublicCheck(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const eventId = String(req.query?.event_id || '').trim();
  const fingerprint = String(req.query?.fingerprint || '').trim();

  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });
  if (!fingerprint) return res.json({ success: true, submitted: false });

  const sb = getServiceSupabase();
  const { data, error } = await sb.rpc('check_tenant_survey_submitted_public', {
    p_event_id: eventId,
    p_device_fingerprint: fingerprint,
  });

  if (error) {
    console.error('[tenant-survey/public/check]', error);
    return res.status(500).json({ success: false, error: 'Gagal memeriksa status survey' });
  }

  return res.json({ success: true, submitted: !!data });
}

// ─── Public: Submit ──────────────────────────────────────────────

async function handlePublicSubmit(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

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

  // Pre-check duplicate (graceful — DB unique index also enforces)
  const sb = getServiceSupabase();
  const { data: existing } = await sb.rpc('check_tenant_survey_submitted_public', {
    p_event_id: eventId,
    p_device_fingerprint: fingerprint,
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.',
      already_submitted: true,
    });
  }

  // Event must exist + survey config is_active (no row = inactive)
  const { data: eventRow } = await sb
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  if (!eventRow) {
    return res.status(404).json({ success: false, error: 'Event tidak ditemukan' });
  }

  const active = await isTenantSurveyActive(sb, eventId);
  if (!active) {
    return res.status(403).json({
      success: false,
      error: 'Survey tenant untuk event ini tidak aktif atau sudah ditutup.',
    });
  }

  // Build row
  const row = {
    event_id: eventId,
    tenant_user_id: null, // public/anonymous submission
    tenant_name: null,
    tenant_organization: null,
    tenant_email: null,
    tenant_phone: null,
    business_category: null,
    business_subcategory: null,
    venue_rating: null,
    management_rating: null,
    event_organization_rating: null,
    booth_facility_rating: null,
    overall_rating: null,
    sales_lift_pct: null,
    traffic_lift_pct: null,
    feedback_comment: sanitize(body.feedback_comment || '', 2000),
    improvement_suggestion: sanitize(body.improvement_suggestion || '', 2000),
    nama_gerai: sanitize(body.nama_gerai || '', 100),
    lokasi_zona: body.lokasi_zona || null,
    kategori: body.kategori || null,
    kenaikan_traffic: body.kenaikan_traffic || null,
    kenaikan_sales: body.kenaikan_sales || null,
    feedback_teks: sanitize(body.feedback_teks || '', 2000),
    tenant_id: sanitize(body.tenant_id || '', 100),
    pic_name: sanitize(body.pic_name || '', 100),
    pic_phone: sanitize(body.pic_phone || '', 20),
    device_fingerprint: fingerprint,
    ip_address: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '',
    user_agent: sanitize(req.headers['user-agent'] || '', 500),
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('tenant_event_surveys')
    .insert(row)
    .select('id, created_at')
    .single();

  if (error) {
    // Postgres unique-constraint violation (23505) — duplicate
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.',
        already_submitted: true,
      });
    }
    console.error('[tenant-survey/public/submit]', error);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan survey' });
  }

  return res.status(201).json({
    success: true,
    id: data.id,
    created_at: data.created_at,
  });
}

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATED HANDLERS (default mode, requireAuth)
// ═══════════════════════════════════════════════════════════════════

// ─── List surveys ─────────────────────────────────────────────────

async function handleList(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, LIST_READ_ROLES);
  if (!auth) return;

  const sb = getServiceSupabase();
  const eventId = String(req.query?.event_id || '').trim();

  let query = sb.from('tenant_event_surveys').select('*').order('created_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  // Full list for staff + tenant_relation; EO only own rows
  if (!isStaff(auth.role) && auth.role !== 'tenant_relation') {
    query = query.eq('tenant_user_id', auth.user?.id);
  }

  // TR analytics: hide drafts (not final)
  if (auth.role === 'tenant_relation') {
    query = query.in('status', ['submitted', 'reviewed']);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[tenant-survey/list]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data survey' });
  }

  return res.json({ success: true, data: mapRowsForRole(data || [], auth.role) });
}


// ─── Get single survey ───────────────────────────────────────────

async function handleGet(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, LIST_READ_ROLES);
  if (!auth) return;

  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('tenant_event_surveys')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ success: false, error: 'Survey not found' });
  }

  const canSeeAll = isStaff(auth.role) || auth.role === 'tenant_relation';
  if (!canSeeAll && data.tenant_user_id !== auth.user?.id) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this survey' });
  }

  if (auth.role === 'tenant_relation' && data.status === 'draft') {
    return res.status(403).json({ success: false, error: 'Not authorized to view this survey' });
  }

  const payload = auth.role === 'tenant_relation' ? stripSurveyPii(data) : data;
  return res.json({ success: true, data: payload });
}


// ─── Create survey ───────────────────────────────────────────────

async function handleCreate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // tenant_relation is read-only — no create
  const auth = await requireAuth(req, res, [...STAFF_ROLES, 'eo_tenant']);
  if (!auth) return;

  const body = req.body || {};

  // Coerce ratings
  for (const f of RATING_FIELDS) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      body[f] = parseInt(body[f], 10);
    }
  }
  if (body.overall_rating !== undefined && body.overall_rating !== null && body.overall_rating !== '') {
    body.overall_rating = parseInt(body.overall_rating, 10);
  }

  const errors = validateSurveyBody(body, false);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const row = {
    event_id: sanitize(body.event_id, 200),
    tenant_user_id: auth.user?.id,
    tenant_name: sanitize(body.tenant_name || '', 100),
    tenant_organization: sanitize(body.tenant_organization || '', 200),
    tenant_email: sanitize(body.tenant_email || '', 254),
    tenant_phone: sanitize(body.tenant_phone || '', 20),
    pic_name: sanitize(body.pic_name || '', 100),
    pic_phone: sanitize(body.pic_phone || '', 20),
    status: 'draft',
  };

  for (const f of RATING_FIELDS) {
    row[f] = body[f] ?? null;
  }
  row.overall_rating = body.overall_rating ?? null;

  const textFields = [
    'feedback_comment', 'improvement_suggestion',
    'nama_gerai', 'lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales',
    'feedback_teks', 'tenant_id',
  ];
  for (const f of textFields) {
    row[f] = sanitize(body[f] || '', 3000);
  }

  if (body.would_repeat !== undefined) {
    row.would_repeat = !!body.would_repeat;
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('tenant_event_surveys')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[tenant-survey/create]', error);
    return res.status(500).json({ success: false, error: 'Gagal membuat survey' });
  }

  return res.status(201).json({ success: true, data });
}


// ─── Update draft survey ─────────────────────────────────────────

async function handleUpdate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, [...STAFF_ROLES, 'eo_tenant']);
  if (!auth) return;

  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sb = getServiceSupabase();

  // Verify ownership
  const { data: existing } = await sb
    .from('tenant_event_surveys')
    .select('id, tenant_user_id, status')
    .eq('id', id)
    .single();

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Survey not found' });
  }

  if (existing.tenant_user_id !== auth.user?.id && auth.role !== 'superadmin' && auth.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  if (existing.status !== 'draft' && auth.role !== 'superadmin' && auth.role !== 'admin') {
    return res.status(400).json({ success: false, error: 'Can only update draft surveys' });
  }

  // Build updates
  const updates = {};

  for (const f of RATING_FIELDS) {
    if (body[f] !== undefined) {
      updates[f] = body[f] !== null && body[f] !== '' ? parseInt(body[f], 10) : null;
    }
  }

  const updateableTextFields = [
    'tenant_name', 'tenant_organization', 'tenant_email', 'tenant_phone',
    'feedback_comment', 'improvement_suggestion',
    'pic_name', 'pic_phone',
    'nama_gerai', 'lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales',
    'feedback_teks', 'tenant_id',
  ];
  for (const f of updateableTextFields) {
    if (body[f] !== undefined) {
      updates[f] = sanitize(body[f] || '', 3000);
    }
  }

  if (body.overall_rating !== undefined && body.overall_rating !== null && body.overall_rating !== '') {
    updates.overall_rating = parseInt(body.overall_rating, 10);
  }

  if (body.status && ['draft', 'submitted'].includes(body.status)) {
    updates.status = body.status;
    if (body.status === 'submitted') {
      updates.submitted_at = new Date().toISOString();
    }
  }

  const { data, error } = await sb
    .from('tenant_event_surveys')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[tenant-survey/update]', error);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui survey' });
  }

  return res.json({ success: true, data });
}


// ─── Submit draft ────────────────────────────────────────────────

async function handleSubmit(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, [...STAFF_ROLES, 'eo_tenant']);
  if (!auth) return;

  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sb = getServiceSupabase();

  // Verify ownership
  const { data: existing } = await sb
    .from('tenant_event_surveys')
    .select('id, tenant_user_id, status')
    .eq('id', id)
    .single();

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Survey not found' });
  }

  if (existing.tenant_user_id !== auth.user?.id && auth.role !== 'superadmin' && auth.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('tenant_event_surveys')
    .update({ status: 'submitted', submitted_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[tenant-survey/submit]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengirim survey' });
  }

  return res.json({ success: true, data });
}


// ─── Admin review ────────────────────────────────────────────────

async function handleReview(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, STAFF_ROLES);
  if (!auth) return;

  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  const reviewNotes = sanitize(body.review_notes || '', 2000);
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sb = getServiceSupabase();
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from('tenant_event_surveys')
    .update({
      status: 'reviewed',
      reviewed_by: auth.user?.id,
      reviewed_at: now,
      review_notes: reviewNotes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[tenant-survey/review]', error);
    return res.status(500).json({ success: false, error: 'Gagal me-review survey' });
  }

  return res.json({ success: true, data });
}


// ─── Admin delete ────────────────────────────────────────────────

async function handleDelete(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, STAFF_ROLES);
  if (!auth) return;

  const body = req.body || {};
  const id = sanitize(body.id || '', 100);
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sb = getServiceSupabase();
  const { data: existing, error: findErr } = await sb
    .from('tenant_event_surveys')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (findErr) {
    console.error('[tenant-survey/delete/find]', findErr);
    return res.status(500).json({ success: false, error: 'Gagal memeriksa survey' });
  }
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Survey not found' });
  }

  const { error } = await sb
    .from('tenant_event_surveys')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[tenant-survey/delete]', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus survey' });
  }

  return res.json({ success: true, id });
}


// ─── Analytics (v4: explicit auth, group by tenant/event/month) ──

async function handleAnalytics(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, ANALYTICS_READ_ROLES);
  if (!auth) return;

  const sb = getServiceSupabase();
  // tenant_relation needs full mall aggregate (same as staff)
  const fullScope = isAnalyticsReader(auth.role);
  const group = String(req.query?.group || 'tenant').trim();
  const eventId = String(req.query?.event_id || '').trim() || null;

  // Use v4 RPC with explicit auth params (no auth.uid() dependency)
  const { data, error } = await sb.rpc('get_tenant_survey_analytics_v4', {
    p_is_admin: fullScope,
    p_tenant_user_id: fullScope ? null : auth.user?.id,
    p_event_id: eventId,
    p_group_by: group,
  });

  if (error) {
    console.error('[tenant-survey/analytics]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil analytics' });
  }

  return res.json({ success: true, data: data || [] });
}


// ─── Event summary ───────────────────────────────────────────────

async function handleSummary(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, ANALYTICS_READ_ROLES);
  if (!auth) return;

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getServiceSupabase();

  const { data, error } = await sb.rpc('get_tenant_survey_event_summary', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('[tenant-survey/summary]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil ringkasan' });
  }

  return res.json({ success: true, data });
}


// ─── Config: Get survey config ────────────────────────────────────

async function handleConfigGet(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // TR does not need config UI — staff + EO only
  const auth = await requireAuth(req, res, [...STAFF_ROLES, 'eo_tenant']);
  if (!auth) return;

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getServiceSupabase();
  const { data } = await sb
    .from('tenant_survey_config')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // No row = inactive (safe default; admin must toggle on)
  return res.json({
    success: true,
    config: data || {
      event_id: eventId,
      is_active: false,
      activated_at: null,
      deactivated_at: null,
    },
  });
}


// ─── Config: Set survey config ────────────────────────────────────

async function handleConfigSet(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res, STAFF_ROLES);
  if (!auth) return;

  const body = req.body || {};
  const eventId = sanitize(body.event_id || '', 200);
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const now = new Date().toISOString();
  const isActive = !!body.is_active;

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('tenant_survey_config')
    .upsert({
      event_id: eventId,
      is_active: isActive,
      activated_at: isActive ? now : null,
      deactivated_at: !isActive ? now : null,
      updated_at: now,
    }, { onConflict: 'event_id' })
    .select()
    .single();

  if (error) {
    console.error('[tenant-survey/config-set]', error);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan konfigurasi survey' });
  }

  return res.json({ success: true, config: data });
}


// ─── Export CSV ───────────────────────────────────────────────────

async function handleExport(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // CSV with PIC = staff only. TR uses client PDF (no PII).
  const auth = await requireAuth(req, res, STAFF_ROLES);
  if (!auth) return;

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getServiceSupabase();
  // Include submitted + reviewed (draft stays out of export)
  const { data, error } = await sb
    .from('tenant_event_surveys')
    .select('*')
    .eq('event_id', eventId)
    .in('status', ['submitted', 'reviewed'])
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) {
    console.error('[tenant-survey/export]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data survey' });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, error: 'Tidak ada data survey untuk event ini' });
  }

  const headers = [
    'ID', 'Nama Gerai', 'Lokasi', 'Kategori', 'Traffic', 'Sales', 'Feedback',
    'PIC Name', 'PIC Phone',
    'Venue', 'Manajemen', 'Organisasi', 'Fasilitas', 'Overall',
    'Feedback V2', 'Saran', 'Status', 'Tanggal',
  ];

  const csvRows = [headers.join(',')];

  for (const r of data) {
    const row = [
      r.id,
      csvEscape(r.nama_gerai || r.tenant_name || ''),
      csvEscape(r.lokasi_zona || ''),
      csvEscape(r.kategori || ''),
      csvEscape(r.kenaikan_traffic || ''),
      csvEscape(r.kenaikan_sales || ''),
      csvEscape(r.feedback_teks || ''),
      csvEscape(r.pic_name || ''),
      csvEscape(r.pic_phone || ''),
      r.venue_rating ?? '',
      r.management_rating ?? '',
      r.event_organization_rating ?? '',
      r.booth_facility_rating ?? '',
      r.overall_rating ?? '',
      csvEscape(r.feedback_comment || ''),
      csvEscape(r.improvement_suggestion || ''),
      r.status,
      r.created_at,
    ];
    csvRows.push(row.join(','));
  }

  const csv = csvRows.join('\n');
  const filename = `tenant-survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send('\uFEFF' + csv);
}

function csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
