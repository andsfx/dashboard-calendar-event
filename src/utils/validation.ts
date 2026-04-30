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
