/**
 * Routes kolaborasi tenant — mount di /api/v1.
 *
 *   POST /tenant-event-proposals              publik — pengajuan event/kerja sama
 *   POST /tenant-event-proposals/attachment   publik — presign lampiran proposal
 *
 * Kontrak: pengajuan masuk antrean review staff dan TIDAK membuat Event/Draft
 * otomatis (sejalan ADR 003). Lampiran proposal bersifat opsional; bila ada,
 * server memverifikasi ulang bahwa objeknya benar-benar di folder kita, ukurannya
 * ≤ 20MB, dan isinya cocok dengan tipe yang diklaim (magic bytes) — presign
 * publik tidak boleh jadi celah unggah sembarangan ke bucket.
 *
 * Respons submit: { success, id } — tanpa echo PII.
 */
import { Router } from 'express';

import { db } from '../db.js';
import { enforceRateLimit } from '../lib/rateLimit.js';
import { tenantEventProposalSchema } from '../lib/tenantProposalSchemas.js';
import {
  createPresignedUpload,
  deleteR2File,
  headR2File,
  MAX_PROPOSAL_BYTES,
  r2Ready,
  verifyMimeMagicBytes,
  R2_PUBLIC_URL,
} from '../r2.js';

const router = Router();

/** Folder R2 khusus lampiran pengajuan tenant (whitelist di r2.js). */
const ATTACHMENT_FOLDER = 'tenant-proposals/';

/** Lampiran proposal hanya dokumen: PDF atau Word. */
const ALLOWED_ATTACHMENT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/**
 * Lampiran wajib berasal dari folder kita, ada, ≤20MB, dan isinya cocok tipe.
 * @returns {{ok:true,contentLength:number} | {ok:false,error:string}}
 */
async function verifyAttachment(url, mimeType) {
  const prefix = `${R2_PUBLIC_URL}/`;
  const key = String(url || '').slice(prefix.length);
  if (!R2_PUBLIC_URL || !String(url || '').startsWith(prefix) || !key.startsWith(ATTACHMENT_FOLDER)) {
    return { ok: false, error: 'Lampiran tidak valid. Unggah ulang file Anda.' };
  }
  if (!ALLOWED_ATTACHMENT_MIME.has(String(mimeType || '').toLowerCase())) {
    return { ok: false, error: 'Lampiran harus PDF atau Word (DOC/DOCX).' };
  }

  const head = await headR2File(url);
  if (!head.ok) return { ok: false, error: head.error };
  if (head.contentLength > MAX_PROPOSAL_BYTES) {
    return { ok: false, error: 'Lampiran melebihi 20MB.' };
  }

  const magic = await verifyMimeMagicBytes(url, mimeType);
  if (!magic.ok) return { ok: false, error: magic.error };

  return { ok: true, contentLength: head.contentLength };
}

// ─── POST /tenant-event-proposals/attachment — presign publik terbatas ──
// Folder dipaksa ke `tenant-proposals/` dan tipe dibatasi dokumen, jadi route
// publik ini tidak bisa dipakai mengunggah gambar/HTML ke folder lain.
router.post('/tenant-event-proposals/attachment', async (req, res, next) => {
  // 10 unggahan / 15 menit per IP — sejajar submit pengajuan.
  if (!enforceRateLimit(req, res, 'tenant-proposal-attachment', 10, 15 * 60 * 1000)) return;
  if (!r2Ready) {
    return res.status(503).json({ success: false, error: 'Layanan upload sedang tidak tersedia.' });
  }

  const body = req.body || {};
  const contentType = String(body.contentType || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_ATTACHMENT_MIME.has(contentType)) {
    return res.status(400).json({ success: false, error: 'Lampiran harus PDF atau Word (DOC/DOCX).' });
  }

  const originalName = String(body.originalName || '').trim();
  if (!originalName || originalName.length > 255) {
    return res.status(400).json({ success: false, error: 'Nama file tidak valid.' });
  }

  try {
    const safe = await createPresignedUpload({
      folder: ATTACHMENT_FOLDER,
      originalName,
      contentType,
    });
    if (!safe.ok) return res.status(400).json({ success: false, error: safe.error });

    return res.json({ success: true, uploadUrl: safe.uploadUrl, publicUrl: safe.publicUrl, fileName: safe.key });
  } catch (err) {
    console.error('[tenant-event-proposals] presign error:', err);
    return next(err);
  }
});

// ─── POST /tenant-event-proposals — submit publik ───────────────────────
router.post('/tenant-event-proposals', async (req, res, next) => {
  // 10 pengajuan / 15 menit per IP — sejajar /registrations, /sponsor-leads,
  // /exhibition-leads.
  if (!enforceRateLimit(req, res, 'tenant-event-proposal', 10, 15 * 60 * 1000)) return;

  const parsed = tenantEventProposalSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => issue.message).join('; ');
    return res.status(400).json({ success: false, error: msg });
  }
  const proposal = parsed.data;

  try {
    let fileSize = 0;
    if (proposal.proposalFileUrl) {
      const verification = await verifyAttachment(proposal.proposalFileUrl, proposal.proposalMimeType);
      if (!verification.ok) {
        // Buang objek yang gagal verifikasi supaya bucket tidak menumpuk sampah.
        await deleteR2File(proposal.proposalFileUrl);
        return res.status(400).json({ success: false, error: verification.error });
      }
      fileSize = verification.contentLength;
    }

    const { rows } = await db.query(
      `INSERT INTO tenant_event_proposals
        (tenant_name, unit_number, tenant_category, contact_name, phone, email,
         event_title, event_type, event_description, proposed_start, proposed_end,
         preferred_area, expected_visitors, needs,
         proposal_file_url, proposal_file_name, proposal_mime_type, proposal_file_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id`,
      [
        proposal.tenantName,
        proposal.unitNumber,
        proposal.tenantCategory,
        proposal.contactName,
        proposal.phone,
        proposal.email || '',
        proposal.eventTitle,
        proposal.eventType,
        proposal.eventDescription,
        proposal.proposedStart,
        proposal.proposedEnd || null,
        proposal.preferredArea,
        proposal.expectedVisitors,
        proposal.needs,
        proposal.proposalFileUrl || '',
        proposal.proposalFileName || '',
        proposal.proposalMimeType || '',
        fileSize,
      ],
    );

    // Tanpa echo data: submit anonim tidak boleh mengembalikan PII apa pun.
    return res.status(201).json({ success: true, id: rows[0]?.id || '' });
  } catch (err) {
    console.error('[tenant-event-proposals] Database error:', err);
    return next(err);
  }
});

export default router;
