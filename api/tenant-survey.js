import { getServiceSupabase, getAnonSupabase, requireAuth } from './_lib/auth.js';
import { SURVEY_OPTIONS } from '../src/constants/survey-options.js';

/**
 * /api/tenant-survey — Unified tenant (EO) self-assessment survey endpoint
 *
 * Public (mode=public, no auth):
 *   ?mode=public&action=event-info  GET   — Fetch event details
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
 *   ?action=analytics   GET   — Get aggregated analytics
 *   ?action=summary     GET   — Get per-event combined summary
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
    case 'event-info': return await handlePublicEventInfo(req, res);
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
    case 'analytics': return await handleAnalytics(req, res);
    case 'summary':   return await handleSummary(req, res);
    default:
      return res.status(400).json({ success: false, error: `Unknown action: ${action || '(empty)'}` });
  }
}

// ─── Shared helpers ───────────────────────────────────────────────

function sanitize(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, maxLen);
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

function validateSurveyBody(body, isDraft = false) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('event_id wajib diisi');
  }

  if (!isDraft) {
    if (!body.nama_gerai || typeof body.nama_gerai !== 'string' || !sanitize(body.nama_gerai).length || sanitize(body.nama_gerai).length > 100) {
      errors.push('nama_gerai wajib diisi (maksimal 100 karakter)');
    }

    if (body.lokasi_zona !== undefined && body.lokasi_zona !== null && body.lokasi_zona !== '') {
      if (!SURVEY_OPTIONS.lokasi_zona.includes(body.lokasi_zona)) {
        errors.push(`lokasi_zona harus salah satu dari: ${SURVEY_OPTIONS.lokasi_zona.join(', ')}`);
      }
    }

    if (body.kategori !== undefined && body.kategori !== null && body.kategori !== '') {
      if (!SURVEY_OPTIONS.kategori.includes(body.kategori)) {
        errors.push(`kategori harus salah satu dari: ${SURVEY_OPTIONS.kategori.join(', ')}`);
      }
    }

    if (body.kenaikan_traffic !== undefined && body.kenaikan_traffic !== null && body.kenaikan_traffic !== '') {
      if (!SURVEY_OPTIONS.kenaikan_traffic.includes(body.kenaikan_traffic)) {
        errors.push(`kenaikan_traffic harus salah satu dari: ${SURVEY_OPTIONS.kenaikan_traffic.join(', ')}`);
      }
    }

    if (body.kenaikan_sales !== undefined && body.kenaikan_sales !== null && body.kenaikan_sales !== '') {
      if (!SURVEY_OPTIONS.kenaikan_sales.includes(body.kenaikan_sales)) {
        errors.push(`kenaikan_sales harus salah satu dari: ${SURVEY_OPTIONS.kenaikan_sales.join(', ')}`);
      }
    }
  }

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

  return errors;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC HANDLERS (mode=public, no auth)
// ═══════════════════════════════════════════════════════════════════

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

  return res.json({ success: true, event: data });
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

  // NOTE: Event existence check removed for public submissions.
  // Reason: Tenants may submit before events are formally created in the
  // dashboard. Duplicate prevention (by device_fingerprint) still works.
  // Re-enable this check once all events are guaranteed to exist in the
  // `events` table at survey time.

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

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = getServiceSupabase();
  const eventId = String(req.query?.event_id || '').trim();

  let query = sb.from('tenant_event_surveys').select('*').order('created_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  // Scope to tenant's own surveys if not admin
  if (auth.role !== 'superadmin' && auth.role !== 'admin') {
    query = query.eq('tenant_user_id', auth.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[tenant-survey/list]', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data survey' });
  }

  return res.json({ success: true, data: data || [] });
}


// ─── Get single survey ───────────────────────────────────────────

async function handleGet(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
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

  // Check ownership for non-admin
  if (auth.role !== 'superadmin' && auth.role !== 'admin' && data.tenant_user_id !== auth.userId) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this survey' });
  }

  return res.json({ success: true, data });
}


// ─── Create survey ───────────────────────────────────────────────

async function handleCreate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = req.body || {};

  // Coerce ratings
  for (const f of RATING_FIELDS) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      body[f] = parseInt(body[f], 10);
    }
  }

  const errors = validateSurveyBody(body, false);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const row = {
    event_id: sanitize(body.event_id, 200),
    tenant_user_id: auth.userId,
    tenant_name: sanitize(body.tenant_name || '', 100),
    tenant_organization: sanitize(body.tenant_organization || '', 200),
    tenant_email: sanitize(body.tenant_email || '', 254),
    tenant_phone: sanitize(body.tenant_phone || '', 20),
    status: 'draft',
  };

  for (const f of RATING_FIELDS) {
    row[f] = body[f] ?? null;
  }

  const textFields = [
    'feedback_comment', 'improvement_suggestion',
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

  const auth = await requireAuth(req, res);
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

  if (existing.tenant_user_id !== auth.userId && auth.role !== 'superadmin' && auth.role !== 'admin') {
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

  const auth = await requireAuth(req, res);
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

  if (existing.tenant_user_id !== auth.userId && auth.role !== 'superadmin' && auth.role !== 'admin') {
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

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (auth.role !== 'superadmin' && auth.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }

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
      reviewed_by: auth.userId,
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


// ─── Analytics ───────────────────────────────────────────────────

async function handleAnalytics(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = getServiceSupabase();

  const { data, error } = await sb.rpc('get_tenant_survey_analytics', {
    p_user_id: (auth.role === 'superadmin' || auth.role === 'admin') ? null : auth.userId,
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

  const auth = await requireAuth(req, res);
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
