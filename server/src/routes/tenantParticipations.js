/**
 * Routes partisipasi tenant (open booth & voucher) — mount di /api/v1.
 *
 *   GET  /tenant-participations/events     publik — event eligible utk dropdown form
 *   GET  /tenant-participations/options    publik — opsi form aktif (dikelola admin)
 *   GET  /tenant-participations            publik — daftar approved per event (tanpa PII)
 *   POST /tenant-participations            publik — submit pengajuan, balas { success, code }
 *   POST /tenant-participations/status     publik — cek status { code, phone }
 *
 * Kontrak:
 * - Pengajuan masuk antrean review Marcomm dan TIDAK membuat Event/Draft
 *   otomatis (ADR 003).
 * - Cutoff H-1: event tujuan harus `status <> 'draft'` dan BELUM mulai
 *   (`notStartedOn` dari eventWindow.js — hari WIB). Dicek ulang terhadap DB
 *   saat submit, bukan hanya dari nilai klien.
 * - Daftar publik hanya baris `approved` dan hanya kolom aman: kontak PIC,
 *   kebutuhan fasilitas, dan catatan internal tidak pernah keluar.
 * - Cek status: kode + nomor telepon harus cocok; respons tanpa PII lain dan
 *   tanpa internal_notes.
 */
import { Router } from 'express';
import { randomInt } from 'node:crypto';

import { db } from '../db.js';
import { enforceRateLimit } from '../lib/rateLimit.js';
import { jakartaToday, notStartedOn } from '../lib/eventWindow.js';
import {
  tenantParticipationSchema,
  TENANT_PARTICIPATION_STATUS_SCHEMA,
  isRealDate,
} from '../lib/tenantParticipationSchemas.js';

const router = Router();

// ─── Kode pengajuan ────────────────────────────────────────────────
/**
 * Alfabet tanpa I/O/0/1: kode dibacakan lewat telepon atau ditulis ulang dari
 * tangkapan layar, jadi huruf yang mudah tertukar dibuang.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let body = '';
  for (let i = 0; i < 6; i += 1) {
    body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `TPR-${body}`;
}

/** Nomor telepon ternormalisasi untuk perbandingan: digit saja, 62→0 di depan. */
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('62') ? `0${digits.slice(2)}` : digits;
}

// ─── GET /tenant-participations/events — event eligible ─────────────
// Dipakai dropdown form: hanya event published yang BELUM mulai. Event yang
// sedang berjalan atau sudah lewat tidak bisa dipilih karena pengajuan selalu
// untuk partisipasi ke depan (cutoff H-1).
router.get('/tenant-participations/events', async (_req, res, next) => {
  if (!enforceRateLimit(_req, res, 'tenant-participation-events', 30, 60_000)) return;
  try {
    const { rows } = await db.query(
      `SELECT id, acara, tanggal, date_str, date_end, lokasi, categories
       FROM events
       WHERE status <> 'draft'
         AND ${notStartedOn('date_str', '$1')}
       ORDER BY date_str ASC
       LIMIT 100`,
      [jakartaToday()],
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /tenant-participations/options — opsi form aktif ───────────
// Dipakai form publik: daftar skema/ukuran booth, jenis/format voucher yang
// AKTIF (dikelola admin). Respons kecil dan jarang berubah — cache client 5
// menit; kalau endpoint gagal, klien fallback ke opsi bawaan agar form tidak
// pernah mati karena bagian pendukung ini.
router.get('/tenant-participations/options', async (_req, res, next) => {
  if (!enforceRateLimit(_req, res, 'tenant-participation-options', 30, 60_000)) return;
  try {
    const { rows } = await db.query(
      `SELECT "group", value, label, sort_order
       FROM tenant_participation_options
       WHERE is_active = true
       ORDER BY "group" ASC, sort_order ASC, label ASC`,
    );
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /tenant-participations?event_id= — daftar approved ─────────
// Untuk section "Tenant di event ini" pada halaman detail event publik.
// Kolom aman saja: kontak PIC, kebutuhan fasilitas, skema, dan catatan
// internal TIDAK pernah diseleksi — bukan hanya disamarkan di klien.
router.get('/tenant-participations', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'tenant-participation-list', 40, 60_000)) return;
  const eventId = String(req.query?.event_id || '').trim();
  if (!eventId) return res.status(400).json({ success: false, error: 'ID event wajib diisi.' });

  try {
    const { rows } = await db.query(
      `SELECT tenant_name, unit_number, tenant_category, tenant_logo, kind,
              booth_area, booth_start, booth_end, booth_size, booth_products,
              voucher_type, voucher_terms, voucher_quota, voucher_format
       FROM tenant_participations
       WHERE event_id = $1 AND status = 'approved'
       ORDER BY created_at ASC`,
      [eventId],
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /tenant-participations — submit publik ────────────────────
router.post('/tenant-participations', async (req, res, next) => {
  // 10 pengajuan / 15 menit per IP — sejajar /registrations, /sponsor-leads,
  // /exhibition-leads, /tenant-event-proposals.
  if (!enforceRateLimit(req, res, 'tenant-participation', 10, 15 * 60 * 1000)) return;

  const parsed = tenantParticipationSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => issue.message).join('; ');
    return res.status(400).json({ success: false, error: msg });
  }
  const input = parsed.data;

  try {
    // Event tujuan divalidasi ulang terhadap DB: harus ada, published, dan
    // belum mulai. Nilai klien tidak dipercaya — form bisa saja dibuka lama
    // lalu event mulai di sela itu (cutoff H-1).
    const { rows: eventRows } = await db.query(
      `SELECT id, acara, date_str, date_end FROM events
       WHERE id = $1 AND status <> 'draft' LIMIT 1`,
      [input.eventId],
    );
    const event = eventRows[0];
    if (!event) {
      return res.status(400).json({ success: false, error: 'Event tujuan tidak ditemukan. Muat ulang daftar event.' });
    }
    const today = jakartaToday();
    const eventStart = String(event.date_str || '');
    if (!isRealDate(eventStart) || eventStart <= today) {
      // H-1: pengajuan hanya untuk event yang belum mulai. Event yang mulai
      // HARI INI pun sudah lewat batas — cutoff-nya sehari sebelum tanggal mulai.
      return res.status(400).json({
        success: false,
        error: 'Pengajuan untuk event ini sudah ditutup (paling lambat H-1 sebelum event mulai).',
      });
    }

    // Opsi form (skema/ukuran booth, jenis/format voucher) harus MASIH aktif
    // saat submit. Form bisa saja dibuka sebelum admin mematikan sebuah opsi;
    // nilai klien tidak dipercaya. Ukuran booth opsional: '' boleh lewat,
    // tapi nilai terisi harus terdaftar-aktif.
    //
    // Hanya grup yang DIPAKAI `kind` yang diperiksa: field kelompok lain
    // selalu membawa nilai default form ('solo'/'other'/'both'), sehingga
    // memeriksanya akan memblokir pengajuan yang tidak memakai field itu
    // (mis. mematikan skema booth ikut menutup semua pengajuan voucher-only).
    const includeBooth = input.kind !== 'voucher';
    const includeVoucher = input.kind !== 'booth';
    const optionRefs = [
      ...(includeBooth ? [
        ['booth_scheme', input.boothScheme, 'Skema booth'],
        ['booth_size', input.boothSize, 'Ukuran booth'],
      ] : []),
      ...(includeVoucher ? [
        ['voucher_type', input.voucherType, 'Jenis voucher'],
        ['voucher_format', input.voucherFormat, 'Format voucher'],
      ] : []),
    ].filter(([, value]) => value !== '');

    if (optionRefs.length > 0) {
      const { rows: activeOptions } = await db.query(
        `SELECT "group", value FROM tenant_participation_options
         WHERE is_active = true
           AND ("group", value) IN (${optionRefs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')})`,
        optionRefs.flatMap(([group, value]) => [group, value]),
      );
      const activeKeys = new Set(activeOptions.map((row) => `${row.group}:${row.value}`));
      const inactive = optionRefs.find(([group, value]) => !activeKeys.has(`${group}:${value}`));
      if (inactive) {
        const labels = {
          booth_scheme: 'Skema booth', booth_size: 'Ukuran booth',
          voucher_type: 'Jenis voucher', voucher_format: 'Format voucher',
        };
        return res.status(400).json({
          success: false,
          error: `${labels[inactive[0]]} tidak lagi tersedia. Muat ulang halaman dan pilih yang lain.`,
        });
      }
    }

    // Kelompok field yang tidak dipilih tidak disimpan — bukan menyimpan sampah
    // yang bisa membingungkan review. (`includeBooth`/`includeVoucher` sudah
    // dihitung di atas, sebelum validasi opsi.)

    // Kode unik dengan retry tabrakan UNIQUE (23505) — ruang 32^6 cukup lebar,
    // tapi dua submit berbarengan tetap mungkin; retry 5x sebelum menyerah.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();
      try {
        const { rows } = await db.query(
          `INSERT INTO tenant_participations
            (code, tenant_id, tenant_name, unit_number, tenant_category, tenant_logo,
             contact_name, phone, email, event_id, event_title, event_date, kind,
             booth_area, booth_start, booth_end, booth_size, booth_products, booth_scheme, booth_needs,
             voucher_type, voucher_terms, voucher_quota, voucher_format)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                   $14,$15,$16,$17,$18,$19,$20,
                   $21,$22,$23,$24)
           RETURNING id, code`,
          [
            code,
            input.tenantId || '',
            input.tenantName,
            input.unitNumber,
            input.tenantCategory,
            input.tenantLogo || '',
            input.contactName,
            input.phone,
            input.email || '',
            event.id,
            String(event.acara || ''),
            eventStart,
            input.kind,
            includeBooth ? input.boothArea : '',
            includeBooth && input.boothStart !== '' ? input.boothStart : null,
            includeBooth && input.boothEnd !== '' ? input.boothEnd : null,
            includeBooth ? input.boothSize : '',
            includeBooth ? input.boothProducts : '',
            includeBooth ? input.boothScheme : 'solo',
            includeBooth ? input.boothNeeds : '',
            includeVoucher ? input.voucherType : 'other',
            includeVoucher ? input.voucherTerms : '',
            includeVoucher ? input.voucherQuota : null,
            includeVoucher ? input.voucherFormat : 'both',
          ],
        );
        // Kode ditampilkan SEKALI di respons: tenant memakainya untuk cek
        // status. Tidak ada PII lain yang di-echo.
        return res.status(201).json({ success: true, code: rows[0]?.code || code });
      } catch (err) {
        // 23505 pada kolom code = tabrakan kode; coba kode lain. Constraint
        // lain (kind/status/voucher_type) tidak mungkin kena karena zod sudah
        // menyaring — kalau bukan kolom code, lempar ke handler error.
        const isCodeCollision = String(err?.code) === '23505'
          && String(err?.constraint || '').includes('code');
        if (!isCodeCollision) throw err;
      }
    }
    return res.status(500).json({ success: false, error: 'Gagal membuat kode pengajuan. Coba kirim ulang.' });
  } catch (err) {
    console.error('[tenant-participations] Database error:', err?.code, err?.message);
    return next(err);
  }
});

// ─── POST /tenant-participations/status — cek status ────────────────
// Verifikasi ringan tanpa login: kode + nomor telepon harus cocok. Respons
// hanya status + ringkasan aman (tanpa kontak, tanpa internal_notes).
router.post('/tenant-participations/status', async (req, res, next) => {
  // 10 percobaan / 15 menit per IP: kode 6 karakter dari alfabet 32 = ruang
  // besar, tapi pembatasan tetap wajib untuk menahan enumerasi.
  if (!enforceRateLimit(req, res, 'tenant-participation-status', 10, 15 * 60 * 1000)) return;

  const parsed = TENANT_PARTICIPATION_STATUS_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => issue.message).join('; ');
    return res.status(400).json({ success: false, error: msg });
  }
  const code = parsed.data.code.toUpperCase();
  const phone = normalizePhone(parsed.data.phone);

  try {
    const { rows } = await db.query(
      `SELECT code, tenant_name, event_title, event_date, kind, status,
              booth_area, booth_start, booth_end, voucher_type, voucher_terms,
              voucher_format, created_at, updated_at, phone
       FROM tenant_participations
       WHERE code = $1 LIMIT 1`,
      [code],
    );
    const row = rows[0];
    // Pesan yang sama untuk kode tidak ada vs nomor tidak cocok: tidak
    // mengungkap kode mana yang valid.
    if (!row || normalizePhone(row.phone) !== phone) {
      return res.status(404).json({ success: false, error: 'Pengajuan tidak ditemukan. Periksa kode dan nomor telepon.' });
    }
    return res.json({
      success: true,
      data: {
        code: row.code,
        tenant_name: row.tenant_name,
        event_title: row.event_title,
        event_date: row.event_date,
        kind: row.kind,
        status: row.status,
        booth_area: row.booth_area,
        booth_start: row.booth_start,
        booth_end: row.booth_end,
        voucher_type: row.voucher_type,
        voucher_terms: row.voucher_terms,
        voucher_format: row.voucher_format,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
