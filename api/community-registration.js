import { getServiceSupabase } from './_lib/auth.js';
import { enforceRateLimit } from './_lib/rateLimit.js';

/**
 * GET|POST /api/community-registration
 * 
 * - POST: server-side validation and submission for community registration.
 * - GET: public directory of approved registrations + event counts (sanitized).
 * 
 * Security features:
 * - Comprehensive input validation (required + optional fields)
 * - Format validation (email, phone, Instagram)
 * - Length constraints enforcement
 * - Input sanitization (trim, slice, null byte removal)
 * - Uses service_role to bypass RLS for insert
 * - No sensitive data in error messages
 * 
 * Required fields:
 * - organization_type: 'komunitas' | 'umkm' | 'organisasi' | 'lainnya'
 * - organization_name: 3-200 chars
 * - pic: 3-100 chars
 * - phone: Indonesian format (08xxx/+628xxx/628xxx), 10-14 digits
 * 
 * Optional fields:
 * - email: RFC 5322 format, 5-254 chars
 * - instagram: @username or Instagram URL
 * - description: max 1000 chars
 * - preferred_date: max 100 chars
 * - community_name: max 200 chars (legacy field)
 * - community_type: max 100 chars (legacy field)
 */

// ─── Validation Regex Patterns ────────────────────────────────────────

/**
 * RFC 5322 compliant email regex
 * Validates: user@domain.tld format
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Indonesian phone number regex
 * Accepts: 08xxx, +628xxx, 628xxx formats
 * Length: 10-14 digits after normalization
 */
const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;

/**
 * Instagram username/URL regex
 * Accepts: @username, https://instagram.com/username, https://www.instagram.com/username
 * Username: 1-30 chars, alphanumeric + underscore + dot
 */
const INSTAGRAM_REGEX = /^(@?[\w.]{1,30}|https?:\/\/(www\.)?instagram\.com\/[\w.]{1,30}\/?|[\w.]{1,30})$/;

// ─── Validation Functions ─────────────────────────────────────────────

/**
 * Sanitize string input: trim, remove null bytes, slice to max length
 */
function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  // Remove null bytes (security)
  let sanitized = value.replace(/\0/g, '');
  // Trim whitespace
  sanitized = sanitized.trim();
  // Slice to max length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

/**
 * Validate organization_type (enum)
 */
function validateOrganizationType(value) {
  const validTypes = ['community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other'];
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Tipe organisasi harus diisi.' };
  }
  const sanitized = sanitizeString(value, 50);
  if (!validTypes.includes(sanitized)) {
    return { 
      valid: false, 
      error: `Tipe organisasi tidak valid. Pilih salah satu: ${validTypes.join(', ')}.` 
    };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validate organization_name (required, 3-200 chars)
 */
function validateOrganizationName(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Nama organisasi harus diisi.' };
  }
  const sanitized = sanitizeString(value, 200);
  if (sanitized.length < 3) {
    return { valid: false, error: 'Nama organisasi terlalu pendek (minimal 3 karakter).' };
  }
  if (sanitized.length > 200) {
    return { valid: false, error: 'Nama organisasi terlalu panjang (maksimal 200 karakter).' };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validate pic (required, 3-100 chars)
 */
function validatePic(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Nama penanggung jawab harus diisi.' };
  }
  const sanitized = sanitizeString(value, 100);
  if (sanitized.length < 3) {
    return { valid: false, error: 'Nama penanggung jawab terlalu pendek (minimal 3 karakter).' };
  }
  if (sanitized.length > 100) {
    return { valid: false, error: 'Nama penanggung jawab terlalu panjang (maksimal 100 karakter).' };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validate phone (required, Indonesian format)
 */
function validatePhone(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Nomor telepon harus diisi.' };
  }
  
  // Normalize: remove spaces and dashes
  const normalized = value.trim().replace(/[\s-]/g, '');
  
  // Check if contains only valid characters
  if (!/^[\+0-9]+$/.test(normalized)) {
    return { 
      valid: false, 
      error: 'Nomor telepon hanya boleh berisi angka, +, spasi, atau -.' 
    };
  }
  
  // Validate format
  if (!PHONE_REGEX.test(normalized)) {
    return { 
      valid: false, 
      error: 'Format nomor telepon tidak valid. Gunakan format: 08xxx, +628xxx, atau 628xxx (10-15 digit).' 
    };
  }
  
  return { valid: true, value: normalized };
}

/**
 * Validate email (optional, RFC 5322 format, 5-254 chars)
 */
function validateEmail(value) {
  // Email is optional
  if (!value || value === '') {
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: 'Format email tidak valid.' };
  }
  
  const sanitized = sanitizeString(value, 254);
  
  if (sanitized.length < 5) {
    return { valid: false, error: 'Email terlalu pendek (minimal 5 karakter).' };
  }
  
  if (!EMAIL_REGEX.test(sanitized)) {
    return { valid: false, error: 'Format email tidak valid. Contoh: user@domain.com' };
  }
  
  return { valid: true, value: sanitized };
}

/**
 * Validate instagram (optional, @username or URL)
 */
function validateInstagram(value) {
  // Instagram is optional
  if (!value || value === '') {
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: 'Format Instagram tidak valid.' };
  }
  
  const sanitized = sanitizeString(value, 100);
  
  if (sanitized.length < 3) {
    return { valid: false, error: 'Username Instagram terlalu pendek (minimal 3 karakter).' };
  }
  
  if (sanitized.length > 100) {
    return { valid: false, error: 'Input Instagram terlalu panjang (maksimal 100 karakter).' };
  }
  
  // Security check: prevent non-Instagram URLs
  if (sanitized.includes('http') && !sanitized.includes('instagram.com')) {
    return { valid: false, error: 'Hanya link Instagram yang diperbolehkan.' };
  }
  
  if (!INSTAGRAM_REGEX.test(sanitized)) {
    return { 
      valid: false, 
      error: 'Format Instagram tidak valid. Gunakan @username, link Instagram, atau username saja.' 
    };
  }
  
  return { valid: true, value: sanitized };
}

/**
 * Validate description (optional, max 1000 chars)
 */
function validateDescription(value) {
  // Description is optional
  if (!value || value === '') {
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: 'Format deskripsi tidak valid.' };
  }
  
  const sanitized = sanitizeString(value, 1000);
  
  return { valid: true, value: sanitized };
}

/**
 * Validate preferred_date (optional, max 100 chars)
 */
function validatePreferredDate(value) {
  // Preferred date is optional
  if (!value || value === '') {
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: 'Format tanggal preferensi tidak valid.' };
  }
  
  const sanitized = sanitizeString(value, 100);
  
  return { valid: true, value: sanitized };
}

/**
 * Validate community_name (optional legacy field, max 200 chars)
 */
function validateCommunityName(value) {
  // Community name is optional (legacy field)
  if (!value || value === '') {
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: 'Format nama komunitas tidak valid.' };
  }
  
  const sanitized = sanitizeString(value, 200);
  
  return { valid: true, value: sanitized };
}

/**
 * Validate community_type (optional legacy field, max 100 chars)
 */
function validateCommunityType(value) {
  // Community type is optional (legacy field)
  if (!value || value === '') {
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: 'Format tipe komunitas tidak valid.' };
  }
  
  const sanitized = sanitizeString(value, 100);
  
  return { valid: true, value: sanitized };
}

// ─── Main Handler ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  

  // GET → public directory (approved registrations + event counts)
  if (req.method === 'GET') {
    return handleDirectory(req, res);
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // 10 submissions / 15 min per IP
  if (!enforceRateLimit(req, res, 'community-registration', 10, 15 * 60 * 1000)) return;

  try {
    const body = req.body || {};
    const errors = {};
    
    // ─── Validate Required Fields ─────────────────────────────────────
    
    // 1. organization_type (required)
    const orgTypeResult = validateOrganizationType(body.organization_type);
    if (!orgTypeResult.valid) {
      errors.organization_type = orgTypeResult.error;
    }
    
    // 2. organization_name (required)
    const orgNameResult = validateOrganizationName(body.organization_name);
    if (!orgNameResult.valid) {
      errors.organization_name = orgNameResult.error;
    }
    
    // 3. pic (required)
    const picResult = validatePic(body.pic);
    if (!picResult.valid) {
      errors.pic = picResult.error;
    }
    
    // 4. phone (required)
    const phoneResult = validatePhone(body.phone);
    if (!phoneResult.valid) {
      errors.phone = phoneResult.error;
    }
    
    // ─── Validate Optional Fields ─────────────────────────────────────
    
    // 5. email (optional)
    const emailResult = validateEmail(body.email);
    if (!emailResult.valid) {
      errors.email = emailResult.error;
    }
    
    // 6. instagram (optional)
    const instagramResult = validateInstagram(body.instagram);
    if (!instagramResult.valid) {
      errors.instagram = instagramResult.error;
    }
    
    // 7. description (optional)
    const descriptionResult = validateDescription(body.description);
    if (!descriptionResult.valid) {
      errors.description = descriptionResult.error;
    }
    
    // 8. preferred_date (optional)
    const preferredDateResult = validatePreferredDate(body.preferred_date);
    if (!preferredDateResult.valid) {
      errors.preferred_date = preferredDateResult.error;
    }
    
    // 9. community_name (optional legacy field)
    const communityNameResult = validateCommunityName(body.community_name);
    if (!communityNameResult.valid) {
      errors.community_name = communityNameResult.error;
    }
    
    // 10. community_type (optional legacy field)
    const communityTypeResult = validateCommunityType(body.community_type);
    if (!communityTypeResult.valid) {
      errors.community_type = communityTypeResult.error;
    }
    
    // ─── Return Validation Errors ─────────────────────────────────────
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validasi gagal. Periksa kembali data yang Anda masukkan.',
        details: errors
      });
    }
    
    // ─── Insert to Database ───────────────────────────────────────────
    
    // Use service_role client to bypass RLS
    const supabase = getServiceSupabase();
    
    // Prepare data for insert (use validated values)
    const insertData = {
      organization_type: orgTypeResult.value,
      organization_name: orgNameResult.value,
      pic: picResult.value,
      phone: phoneResult.value,
      email: emailResult.value || '',
      instagram: instagramResult.value || '',
      description: descriptionResult.value || '',
      preferred_date: preferredDateResult.value || '',
      community_name: communityNameResult.value || '',
      community_type: communityTypeResult.value || '',
      type_specific_data: body.type_specific_data || {},
    };
    
    // Insert to database
    const { data, error } = await supabase
      .from('community_registrations')
      .insert(insertData)
      .select('id')
      .single();
    
    if (error) {
      console.error('[community-registration] Database error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        // Unique constraint violation (duplicate email+phone)
        return res.status(409).json({
          success: false,
          error: 'Pendaftaran dengan email dan nomor telepon ini sudah ada.'
        });
      }
      
      if (error.code === '23514') {
        // Check constraint violation
        return res.status(400).json({
          success: false,
          error: 'Data tidak memenuhi persyaratan database. Periksa kembali input Anda.'
        });
      }
      
      // Generic database error (don't expose internal details)
      return res.status(500).json({
        success: false,
        error: 'Gagal menyimpan pendaftaran. Silakan coba lagi.'
      });
    }
    
    // ─── Success Response ─────────────────────────────────────────────
    
    return res.status(200).json({
      success: true,
      id: data.id,
      message: 'Pendaftaran berhasil disimpan.'
    });
    
  } catch (error) {
    console.error('[community-registration] Unexpected error:', error);
    console.error('[community-registration] Error stack:', error.stack);
    console.error('[community-registration] Request body:', JSON.stringify(req.body));
    
    console.error('[community-registration] Unexpected error:', error);
    console.error('[community-registration] Error stack:', error.stack);
    console.error('[community-registration] Request body:', JSON.stringify(req.body));
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server. Silakan coba lagi.',
    });
  }
}

// ─── Public Directory (GET /api/community-registration) ────────────────
const DIRECTORY_TYPES = new Set(['community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other']);

function directoryNameKey(raw) {
  const value = String(raw || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const aliases = {
    'b one': 'bone',
    'b-one': 'bone',
    'ldai light dream anak indonesia': 'ldai',
    'lulaby tales': 'lulabi tales',
    'sanggar andini': 'sanggar tari andini',
    'dragon heart lion dance troupe': 'dragon heart lion dance',
  };
  return aliases[value] || value;
}

function directoryHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function handleDirectory(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=240');

  if (!enforceRateLimit(req, res, 'community-directory', 60, 60_000)) return;

  try {
    const supabase = getServiceSupabase();

    const orgsRes = await supabase
      .from('community_registrations')
      .select('id, organization_name, organization_type, description, instagram, status')
      .order('created_at', { ascending: false });
    const nowIso = new Date().toISOString().slice(0, 10);

    // organization_id ada setelah migration DDL; fallback ke nama eo jika kolom belum ada.
    let eventsRes = await supabase.from('events').select('organization_id, eo, date_str, date_end');
    if (eventsRes.error) {
      eventsRes = await supabase.from('events').select('eo, date_str, date_end');
      if (eventsRes.error) throw eventsRes.error;
    }

    const seen = new Set();
    const orgs = [];
    for (const row of orgsRes.data || []) {
      if (row.status !== 'approved') continue;
      const name = String(row.organization_name || '').trim();
      const nameKey = directoryNameKey(name);
      if (!name || !nameKey || seen.has(nameKey)) continue;
      seen.add(nameKey);

      orgs.push({
        id: String(row.id),
        name,
        type: DIRECTORY_TYPES.has(row.organization_type) ? row.organization_type : 'other',
        description: String(row.description || '').trim() || undefined,
        link: directoryInstagram(row.instagram),
        eventCount: 0,
        upcomingEventCount: 0,
        source: 'registered',
      });
    }
    const orgById = new Map();
    const orgByName = new Map();
    for (const org of orgs) {
      orgById.set(org.id, org);
      orgByName.set(directoryNameKey(org.name), org);
    }

    const derivedByName = new Map();
    for (const ev of eventsRes.data || []) {
      const orgId = ev.organization_id ? String(ev.organization_id) : null;
      const eoName = String(ev.eo || '').trim();
      const eoKey = directoryNameKey(eoName);
      const dateEnd = String(ev.date_end || ev.date_str || '');
      const isUpcoming = Boolean(dateEnd) && dateEnd >= nowIso;

      let org = orgId ? orgById.get(orgId) : undefined;
      if (!org && eoKey.length >= 3) org = orgByName.get(eoKey);
      if (org) {
        org.eventCount += 1;
        if (isUpcoming) org.upcomingEventCount += 1;
        continue;
      }

      if (eoKey.length >= 3) {
        const d = derivedByName.get(eoKey) ?? { name: eoName, count: 0, upcoming: 0 };
        d.count += 1;
        if (isUpcoming) d.upcoming += 1;
        derivedByName.set(eoKey, d);
      }
    }

    for (const [nameKey, d] of derivedByName) {
      if (orgByName.has(nameKey)) continue;
      orgs.push({
        id: `ev-${directoryHash(nameKey)}`,
        name: d.name,
        type: 'eo',
        eventCount: d.count,
        upcomingEventCount: d.upcoming,
        source: 'event-history',
      });
    }

    const categories = Array.from(new Set(orgs.map((o) => o.type)));
    return res.status(200).json({ success: true, organizations: orgs, categories });
  } catch (err) {
    console.error('[community-directory]', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil direktori organisasi.' });
  }
}

function directoryInstagram(raw) {
  const v = String(raw || '').trim();
  if (!v) return undefined;
  if (v.startsWith('http://') || v.startsWith('https://')) {
    try {
      const u = new URL(v);
      const username = u.pathname.split('/').filter(Boolean)[0];
      return username ? `https://instagram.com/${encodeURIComponent(username)}` : v;
    } catch {
      return v;
    }
  }
  const bare = v.replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(bare) ? `https://instagram.com/${encodeURIComponent(bare)}` : v;
}
