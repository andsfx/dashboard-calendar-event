import { getServiceSupabase, getAnonSupabase, requireAuth } from './_lib/auth.js';

/**
 * /api/survey — Unified survey endpoint
 *
 * Public actions:
 *   ?action=submit     POST  — Submit survey response
 *   ?action=check      GET   — Check if device already submitted
 *   ?action=summary    GET   — Get aggregate ratings for event
 *
 * Admin actions:
 *   ?action=responses   GET   — Get all responses (paginated)
 *   ?action=config-get  GET   — Get survey config for event
 *   ?action=config-set  POST  — Create/update survey config
 *   ?action=stats       GET   — Overall survey analytics
 *   ?action=export      GET   — Export responses as CSV
 */
export default async function handler(req, res) {
  const action = String(req.query?.action || '').trim();

  try {
    switch (action) {
      case 'submit':    return handleSubmit(req, res);
      case 'check':     return handleCheck(req, res);
      case 'summary':   return handleSummary(req, res);
      case 'responses': return handleResponses(req, res);
      case 'config-get': return handleConfigGet(req, res);
      case 'config-set': return handleConfigSet(req, res);
      case 'stats':     return handleStats(req, res);
      case 'export':    return handleExport(req, res);
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action || '(empty)'}` });
    }
  } catch (err) {
    console.error(`[survey/${action}]`, err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Validation helpers ───────────────────────────────────────────

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

  // Mall ratings — required for both types
  for (const field of ['mall_cleanliness', 'mall_staff_service', 'mall_coordination', 'mall_security']) {
    if (!isValidRating(body[field])) {
      errors.push(`${field} harus angka 1-10`);
    }
  }

  // EO ratings — required for public survey
  if (body.survey_type === 'public') {
    for (const field of ['eo_event_quality', 'eo_organization', 'eo_committee_service', 'eo_promotion_accuracy', 'eo_recommendation']) {
      if (!isValidRating(body[field])) {
        errors.push(`${field} harus angka 1-10`);
      }
    }
  }

  // Optional email format check
  const email = sanitize(body.respondent_email || '', 254);
  if (email && !EMAIL_RE.test(email)) {
    errors.push('Format email tidak valid');
  }

  return errors;
}


// ─── Public: Submit survey ────────────────────────────────────────

async function handleSubmit(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = req.body || {};

  // Coerce rating fields to integers
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

  // Check duplicate (soft limit)
  if (fingerprint) {
    const sb = getServiceSupabase();
    const { data: existing } = await sb
      .from('survey_responses')
      .select('id')
      .eq('event_id', eventId)
      .eq('device_fingerprint', fingerprint)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Anda sudah mengisi survey untuk event ini',
        already_submitted: true,
      });
    }
  }

  // Build row
  const row = {
    event_id: eventId,
    survey_type: body.survey_type,
    respondent_name: sanitize(body.respondent_name || '', 100),
    respondent_email: sanitize(body.respondent_email || '', 254),
    respondent_phone: sanitize(body.respondent_phone || '', 20),
    respondent_organization: sanitize(body.respondent_organization || '', 200),
    mall_cleanliness: body.mall_cleanliness,
    mall_staff_service: body.mall_staff_service,
    mall_coordination: body.mall_coordination,
    mall_security: body.mall_security,
    eo_event_quality: body.survey_type === 'public' ? body.eo_event_quality : null,
    eo_organization: body.survey_type === 'public' ? body.eo_organization : null,
    eo_committee_service: body.survey_type === 'public' ? body.eo_committee_service : null,
    eo_promotion_accuracy: body.survey_type === 'public' ? body.eo_promotion_accuracy : null,
    eo_recommendation: body.survey_type === 'public' ? body.eo_recommendation : null,
    mall_comment: sanitize(body.mall_comment || '', 1000),
    eo_comment: sanitize(body.eo_comment || '', 1000),
    general_comment: sanitize(body.general_comment || '', 1000),
    device_fingerprint: fingerprint,
    ip_address: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '',
    user_agent: sanitize(req.headers['user-agent'] || '', 500),
  };

  const sb = getServiceSupabase();
  const { data, error } = await sb.from('survey_responses').insert(row).select('id, created_at').single();

  if (error) {
    console.error('[survey/submit] insert error:', error);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan survey' });
  }

  return res.status(201).json({ success: true, id: data.id, created_at: data.created_at });
}


// ─── Public: Check duplicate ──────────────────────────────────────

async function handleCheck(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const eventId = String(req.query?.event_id || '').trim();
  const fingerprint = String(req.query?.fingerprint || '').trim();

  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });
  if (!fingerprint) return res.json({ success: true, submitted: false });

  const sb = getAnonSupabase();
  const { data, error } = await sb.rpc('check_survey_submitted', {
    p_event_id: eventId,
    p_fingerprint: fingerprint,
  });

  if (error) {
    console.error('[survey/check] rpc error:', error);
    return res.status(500).json({ success: false, error: 'Gagal memeriksa status survey' });
  }

  return res.json({ success: true, submitted: !!data });
}


// ─── Public: Get summary ─────────────────────────────────────────

async function handleSummary(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getAnonSupabase();
  const { data, error } = await sb.rpc('get_survey_summary', { p_event_id: eventId });

  if (error) {
    console.error('[survey/summary] rpc error:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil ringkasan survey' });
  }

  return res.json({ success: true, summary: data });
}


// ─── Admin: Get responses (paginated) ─────────────────────────────

async function handleResponses(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return; // 401/403 already sent

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const page = Math.max(1, parseInt(req.query?.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const sortField = ['created_at', 'survey_type', 'mall_cleanliness'].includes(req.query?.sort)
    ? req.query.sort : 'created_at';
  const sortOrder = req.query?.order === 'asc';

  const sb = getServiceSupabase();

  // Get total count
  const { count } = await sb
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  // Get paginated data
  const { data, error } = await sb
    .from('survey_responses')
    .select('*')
    .eq('event_id', eventId)
    .order(sortField, { ascending: sortOrder })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[survey/responses] query error:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data survey' });
  }

  return res.json({
    success: true,
    data: data || [],
    total: count || 0,
    page,
    limit,
  });
}


// ─── Admin: Get survey config ─────────────────────────────────────

async function handleConfigGet(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getServiceSupabase();
  const { data } = await sb
    .from('survey_config')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // Return default config if not exists
  return res.json({
    success: true,
    config: data || {
      event_id: eventId,
      is_active: false,
      auto_activate_after_event: true,
      activated_at: null,
      deactivated_at: null,
    },
  });
}


// ─── Admin: Set survey config ─────────────────────────────────────

async function handleConfigSet(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = req.body || {};
  const eventId = sanitize(body.event_id || '', 200);
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const now = new Date().toISOString();
  const isActive = !!body.is_active;

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('survey_config')
    .upsert({
      event_id: eventId,
      is_active: isActive,
      auto_activate_after_event: body.auto_activate_after_event !== false,
      activated_at: isActive ? now : null,
      deactivated_at: !isActive ? now : null,
      updated_at: now,
    }, { onConflict: 'event_id' })
    .select()
    .single();

  if (error) {
    console.error('[survey/config-set] upsert error:', error);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan konfigurasi survey' });
  }

  return res.json({ success: true, config: data });
}


// ─── Admin: Overall stats ─────────────────────────────────────────

async function handleStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = getServiceSupabase();

  // Total responses
  const { count: totalResponses } = await sb
    .from('survey_responses')
    .select('id', { count: 'exact', head: true });

  // Responses by type
  const { count: organizerCount } = await sb
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_type', 'organizer');

  const { count: publicCount } = await sb
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_type', 'public');

  // Unique events with responses
  const { data: eventIds } = await sb
    .from('survey_responses')
    .select('event_id')
    .limit(1000);

  const uniqueEvents = new Set((eventIds || []).map(r => r.event_id)).size;

  // Average ratings across all responses
  const { data: allResponses } = await sb
    .from('survey_responses')
    .select('mall_cleanliness, mall_staff_service, mall_coordination, mall_security, eo_event_quality, eo_organization, eo_committee_service, eo_promotion_accuracy, eo_recommendation, survey_type')
    .limit(5000);

  let mallAvg = null;
  let eoAvg = null;
  let npsScore = null;

  if (allResponses && allResponses.length > 0) {
    const sum = { cleanliness: 0, staff: 0, coord: 0, security: 0 };
    for (const r of allResponses) {
      sum.cleanliness += r.mall_cleanliness;
      sum.staff += r.mall_staff_service;
      sum.coord += r.mall_coordination;
      sum.security += r.mall_security;
    }
    const n = allResponses.length;
    mallAvg = {
      cleanliness: +(sum.cleanliness / n).toFixed(1),
      staff_service: +(sum.staff / n).toFixed(1),
      coordination: +(sum.coord / n).toFixed(1),
      security: +(sum.security / n).toFixed(1),
      overall: +((sum.cleanliness + sum.staff + sum.coord + sum.security) / (n * 4)).toFixed(1),
    };

    // EO averages from public responses
    const publicResponses = allResponses.filter(r => r.survey_type === 'public' && r.eo_event_quality != null);
    if (publicResponses.length > 0) {
      const eoSum = { quality: 0, org: 0, committee: 0, promo: 0, rec: 0 };
      for (const r of publicResponses) {
        eoSum.quality += r.eo_event_quality || 0;
        eoSum.org += r.eo_organization || 0;
        eoSum.committee += r.eo_committee_service || 0;
        eoSum.promo += r.eo_promotion_accuracy || 0;
        eoSum.rec += r.eo_recommendation || 0;
      }
      const pn = publicResponses.length;
      eoAvg = {
        event_quality: +(eoSum.quality / pn).toFixed(1),
        organization: +(eoSum.org / pn).toFixed(1),
        committee_service: +(eoSum.committee / pn).toFixed(1),
        promotion_accuracy: +(eoSum.promo / pn).toFixed(1),
        recommendation: +(eoSum.rec / pn).toFixed(1),
        overall: +((eoSum.quality + eoSum.org + eoSum.committee + eoSum.promo + eoSum.rec) / (pn * 5)).toFixed(1),
      };
    }

    // NPS from public responses
    const publicWithNps = allResponses.filter(r => r.survey_type === 'public' && r.eo_recommendation != null);
    if (publicWithNps.length > 0) {
      const promoters = publicWithNps.filter(r => r.eo_recommendation >= 9).length;
      const detractors = publicWithNps.filter(r => r.eo_recommendation <= 6).length;
      npsScore = Math.round(((promoters - detractors) / publicWithNps.length) * 100);
    }
  }

  // Recent responses (last 10) — include comments for detail view
  const { data: recent } = await sb
    .from('survey_responses')
    .select('id, event_id, survey_type, mall_cleanliness, mall_staff_service, mall_coordination, mall_security, eo_event_quality, eo_organization, eo_committee_service, eo_promotion_accuracy, eo_recommendation, respondent_name, respondent_email, mall_comment, eo_comment, general_comment, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return res.json({
    success: true,
    stats: {
      total_responses: totalResponses || 0,
      organizer_responses: organizerCount || 0,
      public_responses: publicCount || 0,
      unique_events: uniqueEvents,
      mall_avg: mallAvg,
      eo_avg: eoAvg,
      nps_score: npsScore,
      recent: recent || [],
    },
  });
}


// ─── Admin: Export CSV ────────────────────────────────────────────

async function handleExport(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'event_id required' });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('survey_responses')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) {
    console.error('[survey/export] query error:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data survey' });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, error: 'Tidak ada data survey untuk event ini' });
  }

  // Build CSV
  const headers = [
    'ID', 'Tipe Survey', 'Nama', 'Email', 'Telepon', 'Organisasi',
    'Mall: Kebersihan', 'Mall: Pelayanan', 'Mall: Koordinasi', 'Mall: Keamanan',
    'EO: Kualitas', 'EO: Organisasi', 'EO: Panitia', 'EO: Promosi', 'EO: Rekomendasi',
    'Komentar Mall', 'Komentar EO', 'Komentar Umum',
    'Tanggal',
  ];

  const csvRows = [headers.join(',')];

  for (const r of data) {
    const row = [
      r.id,
      r.survey_type,
      csvEscape(r.respondent_name),
      csvEscape(r.respondent_email),
      csvEscape(r.respondent_phone),
      csvEscape(r.respondent_organization),
      r.mall_cleanliness,
      r.mall_staff_service,
      r.mall_coordination,
      r.mall_security,
      r.eo_event_quality ?? '',
      r.eo_organization ?? '',
      r.eo_committee_service ?? '',
      r.eo_promotion_accuracy ?? '',
      r.eo_recommendation ?? '',
      csvEscape(r.mall_comment),
      csvEscape(r.eo_comment),
      csvEscape(r.general_comment),
      r.created_at,
    ];
    csvRows.push(row.join(','));
  }

  const csv = csvRows.join('\n');
  const filename = `survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send('\uFEFF' + csv); // BOM for Excel UTF-8
}

function csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
