import { getServiceSupabase } from './_lib/auth.js';

/**
 * POST /api/community-registration
 * 
 * Server-side validation and submission for community registration.
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
  const validTypes = ['komunitas', 'umkm', 'organisasi', 'lainnya'];
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
  
  if (sanitized.length > 254) {
    return { valid: false, error: 'Email terlalu panjang (maksimal 254 karakter).' };
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
  
  if (sanitized.length > 1000) {
    return { valid: false, error: 'Deskripsi terlalu panjang (maksimal 1000 karakter).' };
  }
  
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
  
  if (sanitized.length > 100) {
    return { valid: false, error: 'Tanggal preferensi terlalu panjang (maksimal 100 karakter).' };
  }
  
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
  
  if (sanitized.length > 200) {
    return { valid: false, error: 'Nama komunitas terlalu panjang (maksimal 200 karakter).' };
  }
  
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
  
  if (sanitized.length > 100) {
    return { valid: false, error: 'Tipe komunitas terlalu panjang (maksimal 100 karakter).' };
  }
  
  return { valid: true, value: sanitized };
}

// ─── Main Handler ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
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
    
    // Don't expose internal error details in production
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server. Silakan coba lagi.',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
}
