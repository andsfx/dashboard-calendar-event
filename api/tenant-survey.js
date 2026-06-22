import { getServiceSupabase, getAnonSupabase, requireAuth } from './_lib/auth.js';

/**
 * /api/tenant-survey — Unified tenant (EO) self-assessment survey endpoint
 *
 * Authenticated actions:
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
  const action = String(req.query?.action || '').trim();

  try {
    switch (action) {
      case 'list':      return handleList(req, res);
      case 'get':       return handleGet(req, res);
      case 'create':    return handleCreate(req, res);
      case 'update':    return handleUpdate(req, res);
      case 'submit':    return handleSubmit(req, res);
      case 'review':    return handleReview(req, res);
      case 'analytics': return handleAnalytics(req, res);
      case 'summary':   return handleSummary(req, res);
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action || '(empty)'}` });
    }
  } catch (err) {
    console.error(`[tenant-survey/${action}]`, err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function sanitize(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, maxLen);
}

function isValidRating(val) {
  return Number.isInteger(val) && val >= 1 && val <= 10;
}

const RATING_FIELDS = [
  'venue_rating', 'management_rating',
  'event_organization_rating', 'booth_facility_rating',
];

const RATING_MAX = 5;

function validateSurveyBody(body, isDraft = false) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('event_id wajib diisi');
  }

  if (!isDraft) {
    if (!body.tenant_name || typeof body.tenant_name !== 'string' || !body.tenant_name.trim()) {
      errors.push('tenant_name wajib diisi');
    }

    for (const field of RATING_FIELDS) {
      if (!isValidRating(body[field], RATING_MAX)) {
        errors.push(`${field} harus angka 1-${RATING_MAX}`);
      }
    }
  }

  return errors;
}

function isValidRating(val, max = RATING_MAX) {
  return Number.isInteger(val) && val >= 1 && val <= max;
}


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

  const textFields = [
    'tenant_name', 'tenant_organization', 'tenant_email', 'tenant_phone',
    'feedback_comment', 'improvement_suggestion',
  ];
  for (const f of textFields) {
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
