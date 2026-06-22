/**
 * Validation utilities for community registration form
 * 
 * Provides validation functions for email, phone, and Instagram inputs
 * with comprehensive error messages and edge case handling.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * RFC 5322 compliant email regex
 * Validates: user@domain.tld format
 * Restricts to ASCII characters only (no emoji, special unicode)
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Indonesian phone number regex
 * Accepts: 08xxx, +628xxx, 628xxx formats
 * Length: 10-14 digits after normalization (0 prefix counts as 1 digit)
 */
export const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;

/**
 * Instagram username/URL regex
 * Accepts: @username, https://instagram.com/username, https://www.instagram.com/username
 * Username: 1-30 chars, alphanumeric + underscore + dot
 */
export const INSTAGRAM_REGEX = /^(@?[\w.]{1,30}|https?:\/\/(www\.)?instagram\.com\/[\w.]{1,30}\/?|[\w.]{1,30})$/;

/**
 * Validates email address
 * 
 * Rules:
 * - Must match RFC 5322 format
 * - Min length: 5 characters
 * - Max length: 254 characters
 * 
 * @param email - Email address to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateEmail(email: string): ValidationResult {
  // Handle empty/null/undefined
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email tidak boleh kosong.' };
  }

  const trimmedEmail = email.trim();

  // Check length constraints
  if (trimmedEmail.length < 5) {
    return { valid: false, error: 'Email terlalu pendek (minimal 5 karakter).' };
  }

  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email terlalu panjang (maksimal 254 karakter).' };
  }

  // Validate format
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: 'Format email tidak valid. Contoh: user@domain.com' };
  }

  return { valid: true };
}

/**
 * Validates Indonesian phone number
 * 
 * Rules:
 * - Must start with 08, +628, or 628
 * - Total digits: 10-15 after normalization
 * - Spaces and dashes are normalized
 * 
 * @param phone - Phone number to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validatePhone(phone: string): ValidationResult {
  // Handle empty/null/undefined
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Nomor telepon tidak boleh kosong.' };
  }

  // Normalize: remove spaces and dashes
  const normalized = phone.trim().replace(/[\s-]/g, '');

  // Check if contains only valid characters
  if (!/^[\+0-9]+$/.test(normalized)) {
    return { valid: false, error: 'Nomor telepon hanya boleh berisi angka, +, spasi, atau -.' };
  }

  // Validate format
  if (!PHONE_REGEX.test(normalized)) {
    return { 
      valid: false, 
      error: 'Format nomor telepon tidak valid. Gunakan format: 08xxx, +628xxx, atau 628xxx (10-15 digit).' 
    };
  }

  return { valid: true };
}

/**
 * Validates Instagram username or URL
 * 
 * Rules:
 * - Accepts @username format
 * - Accepts https://instagram.com/username or https://www.instagram.com/username
 * - Accepts plain username (without @)
 * - Username: 3-30 characters, alphanumeric + underscore + dot
 * 
 * @param instagram - Instagram username or URL to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateInstagram(instagram: string): ValidationResult {
  // Handle empty/null/undefined (Instagram is optional)
  if (!instagram || instagram.trim() === '') {
    return { valid: true }; // Optional field
  }

  const trimmed = instagram.trim();

  // Check length constraints
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username Instagram terlalu pendek (minimal 3 karakter).' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Input Instagram terlalu panjang (maksimal 100 karakter).' };
  }

  // Additional security check: prevent non-Instagram URLs (check before regex)
  if (trimmed.includes('http') && !trimmed.includes('instagram.com')) {
    return { valid: false, error: 'Hanya link Instagram yang diperbolehkan.' };
  }

  // Validate format
  if (!INSTAGRAM_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Format Instagram tidak valid. Gunakan @username, link Instagram, atau username saja.' 
    };
  }

  return { valid: true };
}

// ─── Tenant Survey Validation ────────────────────────────────────

/**
 * Required rating field keys for tenant self-assessment (1-5 scale).
 * overall_rating is optional.
 */
export const TENANT_RATING_KEYS = [
  'venue_rating',
  'management_rating',
  'event_organization_rating',
  'booth_facility_rating',
] as const;

/** All rating keys including optional overall */
export const TENANT_ALL_RATING_KEYS = [
  ...TENANT_RATING_KEYS,
  'overall_rating',
] as const;

/** Human-readable labels for each rating key */
export const TENANT_RATING_LABELS: Record<string, string> = {
  venue_rating: 'Kualitas Venue',
  management_rating: 'Kualitas Manajemen',
  event_organization_rating: 'Organisasi Event',
  booth_facility_rating: 'Fasilitas Booth',
  overall_rating: 'Rating Keseluruhan',
};

/** Min/max rating scale for tenant survey */
export const TENANT_RATING_MIN = 1;
export const TENANT_RATING_MAX = 5;

/** Min/max percentage scale for impact metrics */
export const IMPACT_PCT_MIN = -100;
export const IMPACT_PCT_MAX = 1000;

/**
 * Validates a single rating value (1-5 scale by default).
 * Null/undefined is allowed (for draft surveys).
 */
export function validateRating(
  value: number | null | undefined,
  fieldName?: string,
  min: number = TENANT_RATING_MIN,
  max: number = TENANT_RATING_MAX,
): ValidationResult {
  if (value === null || value === undefined) return { valid: true };
  if (!Number.isInteger(value)) {
    return { valid: false, error: `${fieldName || 'Rating'} harus bilangan bulat.` };
  }
  if (value < min || value > max) {
    return { valid: false, error: `${fieldName || 'Rating'} harus antara ${min} dan ${max}.` };
  }
  return { valid: true };
}

/**
 * Validates a percentage value for impact metrics (-100 to 1000 scale).
 * Empty string is allowed (optional field).
 */
export function validatePercentage(
  value: string,
  fieldName?: string,
  min: number = IMPACT_PCT_MIN,
  max: number = IMPACT_PCT_MAX,
): ValidationResult {
  if (value === '') return { valid: true };
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName || 'Nilai persentase'} harus berupa angka.` };
  }
  if (!Number.isInteger(num)) {
    return { valid: false, error: `${fieldName || 'Nilai persentase'} harus bilangan bulat.` };
  }
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName || 'Nilai persentase'} harus antara ${min}% dan ${max}%.` };
  }
  return { valid: true };
}

/**
 * Validates a tenant survey submission (all ratings + required fields).
 *
 * Rules:
 * - event_id is required
 * - tenant_name is required (max 100 chars) unless isDraft
 * - Four required rating fields must be 1-5 for submit; null allowed for draft
 * - overall_rating is optional but must be 1-5 if provided
 * - feedback_comment & improvement_suggestion are optional (max 2000 chars each)
 * - tenant_organization max 200 chars
 * - business_category must be one of: fnb, retail, jasa, other
 * - business_subcategory required (max 50 chars)
 * - sales_lift_pct and traffic_lift_pct must be numbers between -100 and 1000
 *
 * @param data - The survey form data to validate
 * @param isDraft - If true, ratings and name can be empty (draft mode)
 * @returns Object with valid flag and array of errors
 */
export function validateTenantSurvey(
  data: Record<string, unknown>,
  isDraft = false,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // event_id always required
  if (!data.event_id || typeof data.event_id !== 'string' || !data.event_id.trim()) {
    errors.push('Event ID wajib diisi.');
  }

  // tenant_name required for submit
  const name = (data.tenant_name as string || '').trim();
  if (!isDraft && !name) {
    errors.push('Nama tenant/EO wajib diisi.');
  }
  if (name.length > 100) {
    errors.push('Nama tenant maksimal 100 karakter.');
  }

  // Email (optional but must be valid if provided)
  const email = (data.tenant_email as string || '').trim();
  if (email) {
    const emailResult = validateEmail(email);
    if (!emailResult.valid) errors.push(emailResult.error || 'Format email tidak valid.');
  }

  // Phone (optional but must be valid if provided)
  const phone = (data.tenant_phone as string || '').trim();
  if (phone) {
    const phoneResult = validatePhone(phone);
    if (!phoneResult.valid) errors.push(phoneResult.error || 'Format telepon tidak valid.');
  }

  // Business category validation
  const businessCategory = (data.business_category as string || '').trim();
  const allowedCategories = ['fnb', 'retail', 'jasa', 'other'];
  if (!isDraft && (!businessCategory || !allowedCategories.includes(businessCategory))) {
    errors.push('Kategori bisnis harus salah satu dari: fnb, retail, jasa, other.');
  }

  // Business subcategory validation
  const businessSubcategory = (data.business_subcategory as string || '').trim();
  if (!isDraft && (!businessSubcategory || businessSubcategory.length === 0)) {
    errors.push('Subkategori bisnis wajib diisi.');
  }
  if (businessSubcategory.length > 50) {
    errors.push('Subkategori bisnis maksimal 50 karakter.');
  }

  // Required ratings — must be 1-5 for submit, nullable for draft
  for (const key of TENANT_RATING_KEYS) {
    const val = data[key] as number | null | undefined;
    const label = TENANT_RATING_LABELS[key] || key;

    if (!isDraft && (val === null || val === undefined || val === 0)) {
      errors.push(`${label} wajib diisi (${TENANT_RATING_MIN}-${TENANT_RATING_MAX}).`);
    } else {
      const result = validateRating(val, label);
      if (!result.valid) errors.push(result.error || `${label} tidak valid.`);
    }
  }

  // Optional overall_rating
  if (data.overall_rating !== undefined && data.overall_rating !== null) {
    const result = validateRating(data.overall_rating as number, TENANT_RATING_LABELS.overall_rating);
    if (!result.valid) errors.push(result.error || 'Rating keseluruhan tidak valid.');
  }

  // Optional overall_rating
  if (data.overall_rating !== undefined && data.overall_rating !== null) {
    const result = validateRating(data.overall_rating as number, TENANT_RATING_LABELS.overall_rating);
    if (!result.valid) errors.push(result.error || 'Rating keseluruhan tidak valid.');
  }

  // Business impact percentage validations
  if (!isDraft) {
    const salesLift = parseFloat(data.sales_lift_pct as string || '');
    if (isNaN(salesLift) || salesLift < -100 || salesLift > 1000) {
      errors.push('Persentase kenaikan penjualan harus angka antara -100 dan 1000.');
    }

    const trafficLift = parseFloat(data.traffic_lift_pct as string || '');
    if (isNaN(trafficLift) || trafficLift < -100 || trafficLift > 1000) {
      errors.push('Persentase kenaikan pengunjung harus angka antara -100 dan 1000.');
    }
  }

  // Text field length limits
  const textLimits: Array<[string, number]> = [
    ['feedback_comment', 2000],
    ['improvement_suggestion', 2000],
    ['tenant_organization', 200],
  ];

  for (const [field, maxLen] of textLimits) {
    const val = data[field] as string;
    if (val && val.length > maxLen) {
      errors.push(`Kolom "${field}" maksimal ${maxLen} karakter.`);
    }
  }

  // Percentage fields validation
  const percentageFields: Array<[string, string]> = [
    ['sales_lift_pct', 'Kenaikan Penjualan'],
    ['traffic_lift_pct', 'Kenaikan Traffic'],
  ];

  for (const [field, label] of percentageFields) {
    const val = data[field] as string;
    const result = validatePercentage(val || '', label);
    if (!result.valid) errors.push(result.error || `${label} tidak valid.`);
  }

  return { valid: errors.length === 0, errors };
}
