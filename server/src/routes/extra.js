/**
 * Routes ekstra — mont di /api/v1.
 *
 * Menggabungkan endpoint api/*.js legacy yang belum dipindahkan ke router
 * public/admin/tenant/survey:
 *
 *   POST /registrations        publik — community registration (10 / 15 mnt, CORS *)
 *   GET  /directory            publik — direktori organisasi approved (60 / mnt, cache header)
 *   GET  /sponsor/events       publik — event upcoming + proposal (60 / mnt, tanpa PII)
 *   POST /sponsor-leads        publik — minat support (zod, 10 / 15 mnt)
 *   GET  /users                superadmin — daftar user
 *   POST /users-invite         superadmin — undang user (tanpa email infra: buat user is_active=false)
 *   POST /users-create         superadmin — buat user manual (bcrypt password_hash)
 *   POST /users-update         superadmin — update role/status/profil
 *   POST /users-delete         superadmin — nonaktifkan (soft delete)
 *   GET  /activity-log         staff — log aktivitas (paginated + filter)
 *   GET  /instagram            publik — cache Instagram dari site_settings
 *   POST /instagram-sync       staff — sync via Apify + simpan cache site_settings
 *   GET  /event-og?id=         crawler — inject meta OG ke <head> (fail-open)
 *
 * Envelope: GET publik/staff → { success: true, data: ... }; POST flat
 * { success, ... }. Server mengembalikan row mentah snake_case; mapper
 * client pemilik konversi camelCase.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { db } from '../db.js';
import { requireRole, logActivity, STAFF_ROLES } from '../auth.js';
import { enforceRateLimit } from '../lib/rateLimit.js';

const router = Router();

// ─── Regex bersama (port api/community-registration.js + api/sponsor-lead.js) ──
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;
const INSTAGRAM_REGEX = /^(@?[\w.]{1,30}|https?:\/\/(www\.)?instagram\.com\/[\w.]{1,30}\/?|[\w.]{1,30})$/;

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  let sanitized = value.replace(/\0/g, '');
  sanitized = sanitized.trim();
  if (maxLength && sanitized.length > maxLength) sanitized = sanitized.slice(0, maxLength);
  return sanitized;
}

// ═══════════════════════════════════════════════════════════════════
// COMMUNITY REGISTRATION (POST /registrations) + DIRECTORY (GET /directory)
// ═══════════════════════════════════════════════════════════════════

const VALID_ORG_TYPES = ['community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other'];

function validateOrgType(value) {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Tipe organisasi harus diisi.' };
  const sanitized = sanitizeString(value, 50);
  if (!VALID_ORG_TYPES.includes(sanitized)) {
    return { valid: false, error: `Tipe organisasi tidak valid. Pilih salah satu: ${VALID_ORG_TYPES.join(', ')}.` };
  }
  return { valid: true, value: sanitized };
}

function validateOrgName(value) {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Nama organisasi harus diisi.' };
  const sanitized = sanitizeString(value, 200);
  if (sanitized.length < 3) return { valid: false, error: 'Nama organisasi terlalu pendek (minimal 3 karakter).' };
  if (sanitized.length > 200) return { valid: false, error: 'Nama organisasi terlalu panjang (maksimal 200 karakter).' };
  return { valid: true, value: sanitized };
}

function validatePic(value) {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Nama penanggung jawab harus diisi.' };
  const sanitized = sanitizeString(value, 100);
  if (sanitized.length < 3) return { valid: false, error: 'Nama penanggung jawab terlalu pendek (minimal 3 karakter).' };
  if (sanitized.length > 100) return { valid: false, error: 'Nama penanggung jawab terlalu panjang (maksimal 100 karakter).' };
  return { valid: true, value: sanitized };
}

function validatePhone(value) {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Nomor telepon harus diisi.' };
  const normalized = value.trim().replace(/[\s-]/g, '');
  if (!/^[\+0-9]+$/.test(normalized)) {
    return { valid: false, error: 'Nomor telepon hanya boleh berisi angka, +, spasi, atau -.' };
  }
  if (!PHONE_REGEX.test(normalized)) {
    return { valid: false, error: 'Format nomor telepon tidak valid. Gunakan format: 08xxx, +628xxx, atau 628xxx (10-15 digit).' };
  }
  return { valid: true, value: normalized };
}

function validateEmail(value) {
  if (!value || value === '') return { valid: true, value: '' };
  if (typeof value !== 'string') return { valid: false, error: 'Format email tidak valid.' };
  const sanitized = sanitizeString(value, 254);
  if (sanitized.length < 5) return { valid: false, error: 'Email terlalu pendek (minimal 5 karakter).' };
  if (!EMAIL_REGEX.test(sanitized)) return { valid: false, error: 'Format email tidak valid. Contoh: user@domain.com' };
  return { valid: true, value: sanitized };
}

function validateInstagram(value) {
  if (!value || value === '') return { valid: true, value: '' };
  if (typeof value !== 'string') return { valid: false, error: 'Format Instagram tidak valid.' };
  const sanitized = sanitizeString(value, 100);
  if (sanitized.length < 3) return { valid: false, error: 'Username Instagram terlalu pendek (minimal 3 karakter).' };
  if (sanitized.length > 100) return { valid: false, error: 'Input Instagram terlalu panjang (maksimal 100 karakter).' };
  if (sanitized.includes('http') && !sanitized.includes('instagram.com')) {
    return { valid: false, error: 'Hanya link Instagram yang diperbolehkan.' };
  }
  if (!INSTAGRAM_REGEX.test(sanitized)) {
    return { valid: false, error: 'Format Instagram tidak valid. Gunakan @username, link Instagram, atau username saja.' };
  }
  return { valid: true, value: sanitized };
}

function validateOptionalText(value, maxLen, label) {
  if (!value || value === '') return { valid: true, value: '' };
  if (typeof value !== 'string') return { valid: false, error: `Format ${label} tidak valid.` };
  return { valid: true, value: sanitizeString(value, maxLen) };
}

// ─── POST /registrations — publik ──────────────────────────────────
function setRegistrationCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Preflight lintas-domain (form publik di luar origin aplikasi).
router.options('/registrations', (req, res) => {
  setRegistrationCors(res);
  return res.status(204).end();
});

router.post('/registrations', (req, res, next) => {
  // CORS: form publik diakses lintas-domain → izinkan semua origin.
  setRegistrationCors(res);
  next();
}, async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 10 submit / 15 mnt per IP.
  if (!enforceRateLimit(req, res, 'community-registration', 10, 15 * 60 * 1000)) return;

  const body = req.body || {};
  const errors = {};

  const orgType = validateOrgType(body.organization_type);
  if (!orgType.valid) errors.organization_type = orgType.error;
  const orgName = validateOrgName(body.organization_name);
  if (!orgName.valid) errors.organization_name = orgName.error;
  const pic = validatePic(body.pic);
  if (!pic.valid) errors.pic = pic.error;
  const phone = validatePhone(body.phone);
  if (!phone.valid) errors.phone = phone.error;
  const email = validateEmail(body.email);
  if (!email.valid) errors.email = email.error;
  const instagram = validateInstagram(body.instagram);
  if (!instagram.valid) errors.instagram = instagram.error;
  const description = validateOptionalText(body.description, 1000, 'deskripsi');
  if (!description.valid) errors.description = description.error;
  const preferredDate = validateOptionalText(body.preferred_date, 100, 'tanggal preferensi');
  if (!preferredDate.valid) errors.preferred_date = preferredDate.error;
  const communityName = validateOptionalText(body.community_name, 200, 'nama komunitas');
  if (!communityName.valid) errors.community_name = communityName.error;
  const communityType = validateOptionalText(body.community_type, 100, 'tipe komunitas');
  if (!communityType.valid) errors.community_type = communityType.error;

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validasi gagal. Periksa kembali data yang Anda masukkan.',
      details: errors,
    });
  }

  const typeSpecificData = (body.type_specific_data && typeof body.type_specific_data === 'object')
    ? body.type_specific_data
    : {};
  const proposalFileUrl = sanitizeString(body.proposal_file_url || '', 2048);
  const proposalFileName = sanitizeString(body.proposal_file_name || '', 255);
  const proposalFileSize = Number.isFinite(Number(body.proposal_file_size))
    ? Math.max(0, Math.floor(Number(body.proposal_file_size)))
    : 0;

  try {
    const { rows } = await db.query(
      `INSERT INTO community_registrations
        (organization_type, organization_name, pic, phone, email, instagram, description,
         preferred_date, community_name, community_type, type_specific_data,
         proposal_file_url, proposal_file_name, proposal_file_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        orgType.value,
        orgName.value,
        pic.value,
        phone.value,
        email.value || '',
        instagram.value || '',
        description.value || '',
        preferredDate.value || '',
        communityName.value || '',
        communityType.value || '',
        JSON.stringify(typeSpecificData),
        proposalFileUrl,
        proposalFileName,
        proposalFileSize,
      ],
    );
    return res.status(200).json({
      success: true,
      id: rows[0]?.id || '',
      message: 'Pendaftaran berhasil disimpan.',
    });
  } catch (err) {
    console.error('[registrations] Database error:', err);
    if (String(err?.code) === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Pendaftaran dengan email dan nomor telepon ini sudah ada.',
      });
    }
    if (String(err?.code) === '23514') {
      return res.status(400).json({
        success: false,
        error: 'Data tidak memenuhi persyaratan database. Periksa kembali input Anda.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Gagal menyimpan pendaftaran. Silakan coba lagi.',
    });
  }
});

// ─── GET /directory — publik ───────────────────────────────────────
const DIRECTORY_TYPES = new Set(VALID_ORG_TYPES);

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

router.get('/directory', async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=240');
  if (!enforceRateLimit(req, res, 'community-directory', 60, 60_000)) return;

  try {
    const [orgsRes, eventsRes] = await Promise.all([
      db.query(
        `SELECT id, organization_name, organization_type, description, instagram, status
         FROM community_registrations ORDER BY created_at DESC`,
      ),
      db.query('SELECT organization_id, eo, date_str, date_end FROM events').catch(async () => {
        // Fallback bila kolom organization_id belum ada di DB prod lama.
        const { rows } = await db.query('SELECT eo, date_str, date_end FROM events');
        return { rows };
      }),
    ]);
    const nowIso = new Date().toISOString().slice(0, 10);

    const seen = new Set();
    const orgs = [];
    for (const row of orgsRes.rows) {
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

    // Hitungkan event per organisasi (by organization_id / eo name).
    const derivedByName = new Map();
    for (const ev of eventsRes.rows) {
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
    return res.status(200).json({ success: true, data: { organizations: orgs, categories } });
  } catch (err) {
    console.error('[directory]', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil direktori organisasi.' });
  }
});

// ─── GET /sponsor/events — publik ─────────────────────────────────
// Daftar event upcoming yang punya proposal (landing sponsor). Shape
// NESTED event_proposals (objek jsonb; 1-to-1 via FK UNIQUE) — persis
// kontrak legacy Supabase yang sudah dipetakan mapProposalEvent di
// src/utils/api/sponsorshipApi.ts (row.event_proposals: {id, file_url,
// file_name, mime_type} | null). Server mengembalikan row mentah
// snake_case; tanpa PII pic/phone.
router.get('/sponsor/events', async (req, res) => {
  // 60 req / mnt per IP (baca publik — longgar).
  if (!enforceRateLimit(req, res, 'sponsor-events', 60, 60_000)) return;

  try {
    const { rows } = await db.query(
      `SELECT e.id, e.date_str, e.acara, e.lokasi, e.jam, e.eo,
              (SELECT jsonb_build_object(
                        'id', ep.id,
                        'file_url', ep.file_url,
                        'file_name', ep.file_name,
                        'mime_type', ep.mime_type)
                 FROM event_proposals ep
                WHERE ep.event_id = e.id) AS event_proposals
         FROM events e
        WHERE e.status = 'upcoming'
          AND e.date_str >= to_char(CURRENT_DATE, 'YYYY-MM-DD')
        ORDER BY e.date_str ASC
        LIMIT 100`,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[sponsor/events]', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil daftar event sponsorship.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// SPONSOR LEADS (POST /sponsor-leads)
// ═══════════════════════════════════════════════════════════════════

/** Port persis api/sponsor-lead.js — validasi zod penuh, strip key tak dikenal. */
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
      (v) => /^[+0-9]+$/.test(v.trim().replace(/[\s-]/g, '')),
      'Nomor telepon hanya boleh berisi angka, +, spasi, atau -.',
    )
    .refine(
      (v) => PHONE_REGEX.test(v.trim().replace(/[\s-]/g, '')),
      'Format nomor telepon tidak valid. Gunakan format: 08xxx, +628xxx, atau 628xxx (10-15 digit).',
    ),
  email: z
    .string()
    .trim()
    .max(254, 'Email terlalu panjang (maksimal 254 karakter).')
    .refine(
      (v) => v === '' || (v.length >= 5 && EMAIL_REGEX.test(v)),
      'Format email tidak valid. Contoh: user@domain.com',
    )
    .optional(),
  message: z
    .string()
    .max(2000, 'Pesan terlalu panjang (maksimal 2000 karakter).')
    .optional(),
});

function setSponsorLeadCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Preflight lintas-domain.
router.options('/sponsor-leads', (req, res) => {
  setSponsorLeadCors(res);
  return res.status(204).end();
});

router.post('/sponsor-leads', (req, res, next) => {
  // CORS * (form publik lintas-domain — pola community-registration).
  setSponsorLeadCors(res);
  next();
}, async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  // 10 submit / 15 mnt per IP.
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
    const insertData = {
      event_id: v.eventId,
      company_name: sanitizeString(v.companyName, 200),
      contact_name: sanitizeString(v.contactName, 100),
      phone: sanitizeString(v.phone, 20),
      email: v.email ? sanitizeString(v.email, 254) : '',
      message: v.message ? sanitizeString(v.message, 2000) : '',
    };

    const { rows } = await db.query(
      `INSERT INTO sponsor_leads (event_id, company_name, contact_name, phone, email, message)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [insertData.event_id, insertData.company_name, insertData.contact_name, insertData.phone, insertData.email, insertData.message],
    );
    return res.status(200).json({ success: true, id: rows[0]?.id || '' });
  } catch (err) {
    console.error('[sponsor-leads] Database error:', err);
    if (String(err?.code) === '23503') {
      // FK event_id tidak ada.
      return res.status(400).json({ success: false, error: 'Event tidak ditemukan. Pilih event lain.' });
    }
    return res.status(500).json({ success: false, error: 'Gagal menyimpan minat support. Silakan coba lagi.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// SPONSOR EVENTS (GET /sponsor/events — publik, tanpa PII)
// ═══════════════════════════════════════════════════════════════════

// Shape baris: nested `event_proposals` (null bila tak ada) — mirror embedded
// select legacy supabase; dipetakan mapProposalEvent di sponsorshipApi.ts.
// Frontend tetap guard tanggal (Asia/Jakarta) — server pakai UTC CURRENT_DATE.
router.get('/sponsor/events', async (req, res) => {
  if (!enforceRateLimit(req, res, 'sponsor-events', 60, 60_000)) return;
  try {
    const { rows } = await db.query(
      `SELECT e.id, e.date_str, e.acara, e.lokasi, e.jam, e.eo,
              CASE WHEN ep.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', ep.id, 'file_url', ep.file_url,
                     'file_name', ep.file_name, 'mime_type', ep.mime_type)
              END AS event_proposals
       FROM events e
       LEFT JOIN event_proposals ep ON ep.event_id = e.id
       WHERE e.status = 'upcoming' AND e.date_str >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
       ORDER BY e.date_str ASC
       LIMIT 100`,
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[sponsor/events] Database error:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat event sponsor' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// USERS (superadmin-only)
// ═══════════════════════════════════════════════════════════════════

const VALID_ROLES = ['admin', 'viewer', 'eo_tenant', 'tenant_relation'];
const ALL_VALID_ROLES = ['superadmin', ...VALID_ROLES];

router.use('/users', requireRole(['superadmin']));

// ─── GET /users ────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, display_name, role, is_active, eo_organization, assigned_events,
              last_login_at, created_at
       FROM users ORDER BY created_at ASC`,
    );
    return res.json({ success: true, data: { users: rows } });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /users-invite — undang (tanpa email infra: buat user pending) ──
router.post('/users-invite', async (req, res, next) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const role = String(body.role || '').trim();
  const displayName = sanitizeString(body.display_name || '', 100) || email.split('@')[0] || '';
  const eoOrganization = sanitizeString(body.eo_organization || '', 200);

  if (!email || !role) return res.status(400).json({ success: false, error: 'email dan role wajib diisi' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ success: false, error: 'Role tidak valid' });
  if (!EMAIL_REGEX.test(email) || email.length < 5) {
    return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
  }

  try {
    const { rows: existing } = await db.query('SELECT id FROM users WHERE lower(email) = $1 LIMIT 1', [email]);
    if (existing[0]) return res.status(409).json({ success: false, error: 'Email sudah terdaftar' });

    const { rows } = await db.query(
      `INSERT INTO users (email, display_name, role, is_active, password_hash, eo_organization, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, false, NULL, $4, $5, NOW(), NOW())
       RETURNING id`,
      [email, displayName, role, eoOrganization, req.auth.user.id],
    );
    logActivity(req.auth.user, 'invite', 'user', rows[0]?.id || '', { email, role }, req);
    return res.json({
      success: true,
      user_id: rows[0]?.id || '',
      message: 'Undangan dibuat. User harus mendapatkan password via buat manual/seed.',
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /users-create — buat manual (bcrypt) ─────────────────────
router.post('/users-create', async (req, res, next) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = String(body.role || '').trim();
  const displayName = sanitizeString(body.display_name || '', 100) || email.split('@')[0] || '';
  const eoOrganization = sanitizeString(body.eo_organization || '', 200);

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, error: 'email, password, dan role wajib diisi' });
  }
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ success: false, error: 'Role tidak valid' });
  if (password.length < 6) return res.status(400).json({ success: false, error: 'Password minimal 6 karakter' });
  if (!EMAIL_REGEX.test(email) || email.length < 5) {
    return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
  }

  try {
    const { rows: existing } = await db.query('SELECT id FROM users WHERE lower(email) = $1 LIMIT 1', [email]);
    if (existing[0]) return res.status(409).json({ success: false, error: 'Email sudah terdaftar' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (email, display_name, role, is_active, password_hash, eo_organization, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [email, displayName, role, hash, eoOrganization, req.auth.user.id],
    );
    logActivity(req.auth.user, 'create', 'user', rows[0]?.id || '', { email, role }, req);
    return res.json({ success: true, user_id: rows[0]?.id || '' });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /users-update ────────────────────────────────────────────
router.post('/users-update', async (req, res, next) => {
  const body = req.body || {};
  const userId = String(body.user_id || '').trim();
  if (!userId) return res.status(400).json({ success: false, error: 'ID pengguna wajib diisi.' });

  // Jangan biarkan superadmin menurunkan role sendiri.
  if (userId === req.auth.user.id && body.role && body.role !== 'superadmin') {
    return res.status(400).json({ success: false, error: 'Tidak bisa mengubah role sendiri' });
  }

  const updates = {};
  if (body.role !== undefined && ALL_VALID_ROLES.includes(String(body.role))) updates.role = String(body.role);
  if (body.is_active !== undefined) updates.is_active = !!body.is_active;
  if (body.display_name !== undefined) updates.display_name = String(body.display_name).trim().slice(0, 100);
  if (body.eo_organization !== undefined) updates.eo_organization = String(body.eo_organization).trim().slice(0, 200);
  if (body.password !== undefined && String(body.password).length >= 6) {
    updates.password_hash = await bcrypt.hash(String(body.password), 12);
  } else if (body.password !== undefined) {
    return res.status(400).json({ success: false, error: 'Password minimal 6 karakter' });
  }
  if (body.assigned_events !== undefined && Array.isArray(body.assigned_events)) {
    updates.assigned_events = body.assigned_events.map((x) => String(x));
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'Tidak ada perubahan' });
  }

  try {
    const keys = Object.keys(updates);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => updates[k]);
    values.push(userId);
    await db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
      values,
    );
    logActivity(req.auth.user, 'update', 'user', userId, { changes: Object.keys(updates) }, req);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /users-delete — nonaktifkan (soft delete) ────────────────
router.post('/users-delete', async (req, res, next) => {
  const body = req.body || {};
  const userId = String(body.user_id || '').trim();
  if (!userId) return res.status(400).json({ success: false, error: 'ID pengguna wajib diisi.' });
  if (userId === req.auth.user.id) {
    return res.status(400).json({ success: false, error: 'Tidak bisa menghapus akun sendiri' });
  }

  try {
    await db.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [userId],
    );
    logActivity(req.auth.user, 'delete', 'user', userId, { deactivated: true }, req);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY LOG (staff)
// ═══════════════════════════════════════════════════════════════════

router.get('/activity-log', requireRole(STAFF_ROLES), async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query?.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '30', 10) || 30));
  const offset = (page - 1) * limit;

  try {
    const where = [];
    const params = [];
    if (req.query?.user_id) {
      params.push(String(req.query.user_id).trim());
      where.push(`user_id = $${params.length}`);
    }
    if (req.query?.action_type) {
      params.push(String(req.query.action_type).trim());
      where.push(`action = $${params.length}`);
    }
    if (req.query?.resource_type) {
      params.push(String(req.query.resource_type).trim());
      where.push(`resource_type = $${params.length}`);
    }
    if (req.query?.from) {
      params.push(String(req.query.from).trim());
      where.push(`created_at >= $${params.length}`);
    }
    if (req.query?.to) {
      params.push(String(req.query.to).trim());
      where.push(`created_at <= $${params.length}`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [{ rows: countRows }, { rows }] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total FROM activity_logs ${whereSql}`, params),
      db.query(
        `SELECT * FROM activity_logs ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ]);

    return res.json({
      success: true,
      data: rows,
      total: countRows[0]?.total || 0,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// INSTAGRAM (public cache + staff sync)
// ═══════════════════════════════════════════════════════════════════

// ─── GET /instagram — publik: cache site_settings ──────────────────
router.get('/instagram', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      "SELECT value FROM site_settings WHERE key = 'instagram_cache' LIMIT 1",
    );
    const value = rows[0]?.value;
    return res.status(200).json({ success: true, data: { posts: Array.isArray(value) ? value : [] } });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /instagram-sync — staff: scrape Apify + simpan cache ─────
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'metmal-gallery';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
const R2_READY = Boolean(
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
);

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID || ''}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

router.post('/instagram-sync', requireRole(['superadmin', 'admin']), async (req, res) => {
  const { urls } = req.body || {};
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ success: false, error: 'Parameter urls wajib diisi' });
  }
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_TOKEN) {
    return res.status(500).json({ success: false, error: 'APIFY_API_TOKEN belum dikonfigurasi' });
  }

  try {
    // 1. Scrape via Apify (run-sync).
    const validUrls = urls.map((u) => String(u).trim()).filter(Boolean);
    const apifyInput = {
      directUrls: validUrls,
      resultsType: 'posts',
      resultsLimit: validUrls.length,
    };
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apifyInput),
      },
    );
    if (!runResponse.ok) {
      const errText = await runResponse.text();
      return res.status(502).json({ success: false, error: `Apify request failed (${runResponse.status})` });
    }
    const posts = await runResponse.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.json({ success: true, data: { synced: 0, posts: [], message: 'No posts returned from Apify' } });
    }

    // 2. Proses tiap post: cache gambar ke R2 (opsional, gagal-lanjut).
    const cachedPosts = [];
    for (const post of posts) {
      try {
        const imageUrl = post.displayUrl || (Array.isArray(post.images) && post.images[0]) || '';
        let cachedImageUrl = '';
        if (imageUrl && R2_READY) {
          const imgResponse = await fetch(String(imageUrl));
          if (imgResponse.ok) {
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const fileName = `instagram/${post.shortCode || Date.now()}.${ext}`;
            await R2.send(new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: fileName,
              Body: imgBuffer,
              ContentType: contentType,
            }));
            cachedImageUrl = `${R2_PUBLIC_URL}/${fileName}`;
          }
        }
        cachedPosts.push({
          postUrl: post.url || '',
          shortCode: post.shortCode || '',
          imageUrl,
          cachedImageUrl,
          caption: String(post.caption || '').slice(0, 500),
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          ownerUsername: post.ownerUsername || '',
          postTimestamp: post.timestamp || null,
          syncedAt: new Date().toISOString(),
        });
      } catch (postErr) {
        console.error('[instagram-sync] post processing error:', postErr.message);
      }
    }

    // 3. Simpan cache ke site_settings.
    await db.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('instagram_cache', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(cachedPosts)],
    );

    logActivity(req.auth?.user || null, 'instagram_sync', 'instagram', null, { count: cachedPosts.length }, req);

    return res.json({ success: true, data: { synced: cachedPosts.length, posts: cachedPosts } });
  } catch (err) {
    console.error('[instagram-sync]', err);
    return res.status(500).json({ success: false, error: 'Sinkronisasi gagal' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EVENT OG (GET /event-og?id=) — inject meta OG ke <head> (fail-open)
// ═══════════════════════════════════════════════════════════════════

const SITE_NAME = 'Metropolitan Mall Bekasi';
const DEFAULT_OG_IMAGE_PATH = '/og-image.jpg';
const OG_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const OG_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatTanggalIndo(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ''));
  if (!m) return String(isoDate || '');
  const [, y, mo, dd] = m;
  const dayIdx = (Math.floor(Date.UTC(+y, +mo - 1, +dd) / 86400000) + 4) % 7;
  return `${OG_DAYS[dayIdx]}, ${+dd} ${OG_MONTHS[+mo - 1]} ${y}`;
}

function buildDateLabel(event) {
  if (!event.date_str) return '';
  if (event.date_end) return `${formatTanggalIndo(event.date_str)} s.d. ${formatTanggalIndo(event.date_end)}`;
  return formatTanggalIndo(event.date_str);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildMetaBlock({ title, description, pageUrl, ogImage, origin, event }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(pageUrl);
  const img = escapeHtml(ogImage);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.acara,
    startDate: event.date_str || undefined,
    endDate: event.date_end || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: pageUrl,
    image: [ogImage],
    location: event.lokasi
      ? { '@type': 'Place', name: event.lokasi, address: { '@type': 'PostalAddress', addressLocality: 'Bekasi', addressCountry: 'ID' } }
      : undefined,
    organizer: event.eo
      ? { '@type': 'Organization', name: event.eo, url: origin }
      : undefined,
    description: description,
  };

  return [
    `    <title>${t}</title>`,
    `    <meta property="og:type" content="event" />`,
    `    <meta property="og:title" content="${t}" />`,
    `    <meta property="og:description" content="${d}" />`,
    `    <meta property="og:image" content="${img}" />`,
    `    <meta property="og:url" content="${u}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `    <meta property="og:locale" content="id_ID" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${t}" />`,
    `    <meta name="twitter:description" content="${d}" />`,
    `    <meta name="twitter:image" content="${img}" />`,
    `    <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('</', '<\\/')}</script>`,
  ].join('\n');
}

function sendHtml(res, html, { noIndex = false, notFound = false, noStore = false } = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (noStore) {
    res.setHeader('Cache-Control', 'private, no-store');
  } else if (notFound) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  } else {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }
  if (noIndex) res.setHeader('X-Robots-Tag', 'noindex');
  return res.status(notFound ? 404 : 200).send(html);
}

/** Shell SPA — fallback dari lokal; jangan fetch self (VPS bukan origin SPA). */
function readShellHtml() {
  return '<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Metropolitan Mall Bekasi — Jadwal Event</title></head><body><div id="root"></div></body></html>';
}

router.get('/event-og', async (req, res) => {
  const id = String(req.query?.id || '').trim();
  // Tanpa id → shell polos (fail-open).
  if (!id) return sendHtml(res, readShellHtml());

  let event = null;
  let fetchFailed = false;
  try {
    const { rows } = await db.query(
      `SELECT * FROM events WHERE id = $1 AND status <> 'draft' LIMIT 1`,
      [id],
    );
    event = rows[0] || null;
  } catch (err) {
    // DB down / transient → fail-open: shell 200 TANPA noindex agar crawler
    // tidak menghapus halaman valid saat layanan pulih.
    console.error('[event-og] db fetch failed:', err?.message);
    fetchFailed = true;
  }

  if (fetchFailed) {
    return sendHtml(res, readShellHtml(), { noIndex: false, noStore: true });
  }
  if (!event) {
    return sendHtml(res, readShellHtml(), { noIndex: true, notFound: true });
  }

  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const host = req.headers.host || '';
  const origin = `${proto}://${host}`;
  const pageUrl = `${origin}/events/${event.id}`;

  const dateLabel = buildDateLabel(event);
  const descParts = [dateLabel, event.jam, event.lokasi].filter(Boolean);
  const description = descParts.length > 0
    ? `${event.acara} — ${descParts.join(' · ')} di ${SITE_NAME}.`
    : `${event.acara} di ${SITE_NAME}.`;
  const title = `${event.acara} — Jadwal Event ${SITE_NAME}`;
  const ogImage = event.poster_url
    ? (String(event.poster_url).startsWith('http') ? event.poster_url : `${origin}${event.poster_url}`)
    : `${origin}${DEFAULT_OG_IMAGE_PATH}`;

  const html = readShellHtml();
  const injected = buildMetaBlock({ title, description, pageUrl, ogImage, origin, event });
  const finalHtml = html.replace('</head>', `${injected}\n</head>`);

  return sendHtml(res, finalHtml, { noIndex: false });
});

export default router;