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

import { SURVEY_OPTIONS } from '../constants/survey-options';

/**
 * Validates a tenant survey submission (v3 schema).
 *
 * Rules:
 * - event_id is required
 * - nama_gerai required (1-100 chars after trim)
 * - lokasi_zona required, must be in SURVEY_OPTIONS.lokasi_zona
 * - kategori required, must be in SURVEY_OPTIONS.kategori
 * - kenaikan_traffic required, must be in SURVEY_OPTIONS.kenaikan_traffic
 * - kenaikan_sales required, must be in SURVEY_OPTIONS.kenaikan_sales
  * - feedback_teks optional (max 2000 chars) — v3 primary free-text
  * - legacy: feedback_comment / improvement_suggestion optional (max 2000 each)
  * - pic_name max 100, pic_phone max 20
  *
  * @param data - The survey form data to validate
  * @param isDraft - If true, required v3 fields can be empty (draft mode)
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

  // nama_gerai: required, 1-100 chars after trim
  const namaGerai = (data.nama_gerai as string || '').trim();
  if (!isDraft && !namaGerai) {
    errors.push('Nama gerai wajib diisi.');
  }
  if (namaGerai.length > 100) {
    errors.push('Nama gerai maksimal 100 karakter.');
  }

  // lokasi_zona: required, must be in SURVEY_OPTIONS.lokasi_zona
  const lokasiZona = (data.lokasi_zona as string || '').trim();
  if (!isDraft && (!lokasiZona || !SURVEY_OPTIONS.lokasi_zona.includes(lokasiZona as typeof SURVEY_OPTIONS.lokasi_zona[number]))) {
    errors.push('Lokasi zona wajib dipilih dari daftar yang tersedia.');
  }

  // kategori: required, must be in SURVEY_OPTIONS.kategori
  const kategori = (data.kategori as string || '').trim();
  if (!isDraft && (!kategori || !SURVEY_OPTIONS.kategori.includes(kategori as typeof SURVEY_OPTIONS.kategori[number]))) {
    errors.push('Kategori wajib dipilih dari daftar yang tersedia.');
  }

  // kenaikan_traffic: required, must be in SURVEY_OPTIONS.kenaikan_traffic
  const kenaikanTraffic = (data.kenaikan_traffic as string || '').trim();
  if (!isDraft && (!kenaikanTraffic || !SURVEY_OPTIONS.kenaikan_traffic.includes(kenaikanTraffic as typeof SURVEY_OPTIONS.kenaikan_traffic[number]))) {
    errors.push('Kenaikan traffic wajib dipilih dari daftar yang tersedia.');
  }

  // kenaikan_sales: required, must be in SURVEY_OPTIONS.kenaikan_sales
  const kenaikanSales = (data.kenaikan_sales as string || '').trim();
  if (!isDraft && (!kenaikanSales || !SURVEY_OPTIONS.kenaikan_sales.includes(kenaikanSales as typeof SURVEY_OPTIONS.kenaikan_sales[number]))) {
    errors.push('Kenaikan sales wajib dipilih dari daftar yang tersedia.');
  }

  // Text field length limits (v3 + legacy)
  const textLimits: Array<[string, number]> = [
    ['feedback_teks', 2000],
    ['feedback_comment', 2000],
    ['improvement_suggestion', 2000],
    ['tenant_organization', 200],
    ['pic_name', 100],
    ['pic_phone', 20],
  ];

  for (const [field, maxLen] of textLimits) {
    const val = data[field] as string;
    if (val && val.length > maxLen) {
      errors.push(`Kolom "${field}" maksimal ${maxLen} karakter.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
