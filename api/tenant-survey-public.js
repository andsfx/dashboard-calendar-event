import { getServiceSupabase } from './_lib/auth.js';

/**
 * /api/tenant-survey-public — Public tenant survey endpoint
 * (NO AUTH REQUIRED)
 *
 * Used by the public route /tenant-survey/:eventId where EO/tenants
 * submit self-assessments without logging in.
 *
 * Public actions:
 *   ?action=event-info GET   — Fetch event details (id, acara, tanggal, lokasi, eo)
 *   ?action=check      GET   — Check if device already submitted (by fingerprint)
 *   ?action=submit     POST  — Submit a new tenant survey (anonymous)
 *
 * Uses service-role key to bypass RLS for read; relies on the unique
 * partial index (event_id + device_fingerprint WHERE status='submitted'
 * AND tenant_user_id IS NULL) for duplicate prevention.
 */
export default async function handler(req, res) {
  const action = String(req.query?.action || '').trim();

  try {
    switch (action) {
      case 'event-info': return await handleEventInfo(req, res);
      case 'check':      return await handleCheck(req, res);
      case 'submit':     return await handleSubmit(req, res);
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action || '(empty)'}` });
    }
  } catch (err) {
    console.error(`[tenant-survey-public/${action}]`, err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function sanitize(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, maxLen);
}

function isValidRating(val) {
  return Number.isInteger(val) && val >= 1 && val <= 5;
}

const RATING_FIELDS = [
  'venue_rating', 'management_rating',
  'event_organization_rating', 'booth_facility_rating',
];

function validateSubmission(body) {
  const errors = [];

  if (!body.event_id || typeof body.event_id !== 'string' || !body.event_id.trim()) {
    errors.push('event_id wajib diisi');
  }

  if (!body.tenant_name || typeof body.tenant_name !== 'string' || !body.tenant_name.trim()) {
    errors.push('tenant_name wajib diisi');
  }

  for (const field of RATING_FIELDS) {
    if (!isValidRating(body[field])) {
      errors.push(`${field} harus angka 1-5`);
    }
  }

  // Optional overall_rating
  if (body.overall_rating !== undefined && body.overall_rating !== null && body.overall_rating !== '') {
    if (!isValidRating(parseInt(body.overall_rating, 10))) {
      errors.push('overall_rating harus angka 1-5');
    }
  }

  return errors;
}


// ─── Event info ──────────────────────────────────────────────────

async function handleEventInfo(req, res) {
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


// ─── Check duplicate ────────────────────────────────────────────

async function handleCheck(req, res) {
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
    console.error('[tenant-survey-public/check]', error);
    return res.status(500).json({ success: false, error: 'Gagal memeriksa status survey' });
  }

  return res.json({ success: true, submitted: !!data });
}


// ─── Submit ──────────────────────────────────────────────────────

async function handleSubmit(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = req.body || {};

  // Coerce rating fields to integers
  for (const f of RATING_FIELDS) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      body[f] = parseInt(body[f], 10);
    }
  }
  if (body.overall_rating !== undefined && body.overall_rating !== null && body.overall_rating !== '') {
    body.overall_rating = parseInt(body.overall_rating, 10);
  }

  const errors = validateSubmission(body);
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

  // Verify event exists
  const { data: ev, error: evErr } = await sb
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single();

  if (evErr || !ev) {
    return res.status(404).json({ success: false, error: 'Event tidak ditemukan' });
  }

  // Build row
  const row = {
    event_id: eventId,
    tenant_user_id: null, // public/anonymous submission
    tenant_name: sanitize(body.tenant_name || '', 100),
    tenant_organization: sanitize(body.tenant_organization || '', 200),
    tenant_email: sanitize(body.tenant_email || '', 254),
    tenant_phone: sanitize(body.tenant_phone || '', 20),
    venue_rating: body.venue_rating,
    management_rating: body.management_rating,
    event_organization_rating: body.event_organization_rating,
    booth_facility_rating: body.booth_facility_rating,
    overall_rating: body.overall_rating ?? null,
    feedback_comment: sanitize(body.feedback_comment || '', 2000),
    improvement_suggestion: sanitize(body.improvement_suggestion || '', 2000),
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
    console.error('[tenant-survey-public/submit]', error);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan survey' });
  }

  return res.status(201).json({
    success: true,
    id: data.id,
    created_at: data.created_at,
  });
}
