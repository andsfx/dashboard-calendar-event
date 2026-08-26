import { z } from 'zod';
import { getServiceSupabase } from './_lib/auth.js';
import { enforceRateLimit } from './_lib/rateLimit.js';

/**
 * POST /api/sponsor-lead — submit minat support publik (form /sponsor).
 *
 * Keamanan (audit sponsorship M-1 + M-2):
 * - Validasi server-side penuh (zod) — pola sama persis dengan
 *   src/utils/validation.ts (validatePhone / validateEmail).
 * - enforceRateLimit (10 submit / 15 mnt per IP) — pola community-registration.
 * - Insert via service-role HANYA kolom yang diizinkan
 *   (event_id, company_name, contact_name, phone, email, message).
 *   status/internal_notes/id TIDAK PERNAH diterima dari klien
 *   (status default 'pending', internal_notes default '' dari DB).
 *   Zod men-strip key tak dikenal, jadi forge status tidak mungkin.
 * - Policy INSERT publik di sponsor_leads sudah dihapus
 *   (migrate/fix-sponsor-lead-rls.sql) — satu-satunya jalur insert
 *   adalah proxy ini.
 */

// ─── Regex (salinan persis src/utils/validation.ts) ─────────────────

/** RFC 5322 compliant email regex (ASCII only) */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Indonesian phone regex — accepts 08xxx, +628xxx, 628xxx; 10-14 digits after normalization */
const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;

// ─── Sanitasi (pola sanitizeString di repo) ────────────────────────

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  // Remove null bytes (security)
  let sanitized = value.replace(/\0/g, '');
  // Trim whitespace
  sanitized = sanitized.trim();
  // Slice to max length (safety net di atas batas zod)
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

// ─── Schema zod ────────────────────────────────────────────────────

/** Normalisasi phone persis seperti validatePhone di src/utils/validation.ts */
function normalizePhone(value) {
  return value.trim().replace(/[\s-]/g, '');
}

const sponsorLeadSchema = z.object({
  eventId: z.string().trim().min(1, 'Pilih event terlebih dahulu.'),
  companyName: z
    .string()
    .trim()
    .min(1, 'Nama brand / perusahaan wajib diisi.')
    .max(200, 'Nama terlalu panjang (maksimal 200 karakter).'),
  contactName: z
    .string()
    .trim()
    .min(1, 'Nama PIC wajib diisi.')
    .max(100, 'Nama PIC terlalu panjang (maksimal 100 karakter).'),
  phone: z
    .string()
    .refine(
      (v) => /^[+0-9]+$/.test(normalizePhone(v)),
      'Nomor telepon hanya boleh berisi angka, +, spasi, atau -.'
    )
    .refine(
      (v) => PHONE_REGEX.test(normalizePhone(v)),
      'Format nomor telepon tidak valid. Gunakan format: 08xxx, +628xxx, atau 628xxx (10-15 digit).'
    ),
  // Opsional: kosong / undefined dianggap tidak diisi; jika diisi harus valid (validateEmail).
  email: z
    .string()
    .trim()
    .max(254, 'Email terlalu panjang (maksimal 254 karakter).')
    .refine(
      (v) => v === '' || (v.length >= 5 && EMAIL_REGEX.test(v)),
      'Format email tidak valid. Contoh: user@domain.com'
    )
    .optional(),
  message: z
    .string()
    .max(2000, 'Pesan terlalu panjang (maksimal 2000 karakter).')
    .optional(),
});

// ─── Handler ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS headers (pola community-registration)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 10 submissions / 15 min per IP (pola community-registration)
  if (!enforceRateLimit(req, res, 'sponsor-lead', 10, 15 * 60 * 1000)) return;

  try {
    const parsed = sponsorLeadSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const details = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key && typeof key === 'string' && !details[key]) details[key] = issue.message;
      }
      return res.status(400).json({
        success: false,
        error: 'Validasi gagal. Periksa kembali data yang Anda masukkan.',
        details,
      });
    }

    const v = parsed.data;

    // HANYA kolom yang diizinkan — status/internal_notes/id tak pernah dari klien.
    // status default 'pending', internal_notes default '' (default kolom DB).
    const insertData = {
      event_id: v.eventId,
      company_name: sanitizeString(v.companyName, 200),
      contact_name: sanitizeString(v.contactName, 100),
      phone: sanitizeString(v.phone, 20),
      email: v.email ? sanitizeString(v.email, 254) : '',
      message: v.message ? sanitizeString(v.message, 2000) : '',
    };

    // service_role client bypasses RLS — jalur satu-satunya setelah policy INSERT publik dihapus
    const { error } = await getServiceSupabase().from('sponsor_leads').insert(insertData);

    if (error) {
      console.error('[sponsor-lead] Database error:', error);
      if (error.code === '23503') {
        // Foreign key violation (event_id tidak ada)
        return res.status(400).json({ success: false, error: 'Event tidak ditemukan. Pilih event lain.' });
      }
      return res.status(500).json({ success: false, error: 'Gagal menyimpan minat support. Silakan coba lagi.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[sponsor-lead] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan server. Silakan coba lagi.' });
  }
}
