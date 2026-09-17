/**
 * Routes pameran — mount di /api/v1.
 *
 *   GET  /exhibitions           publik — pameran published (tanpa PII/catatan internal)
 *   GET  /exhibitions/:id       publik — detail + jadwal aktivasi (event tertaut)
 *   POST /exhibition-leads      publik — minat kolaborasi brand/EO (rate limit)
 *
 * Kontrak: pameran = program induk; aktivasi = event resmi yang ditautkan
 * (bukan salinan jadwal). Lead masuk antrean review — TIDAK membuat event
 * otomatis (sejalan ADR 003). Envelope GET publik: { success, data }.
 */
import { Router } from 'express';

import { db } from '../db.js';
import { enforceRateLimit } from '../lib/rateLimit.js';
import { exhibitionLeadSchema } from '../lib/exhibitionSchemas.js';

const router = Router();

/** Kolom aman untuk publik — kontak & catatan internal tidak pernah ikut. */
const PUBLIC_COLUMNS = `
  id, title, theme, description, location, date_start, date_end,
  collaboration_brief, publication, accepting_applications, created_at
`;

router.get('/exhibitions', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'exhibitions', 60, 60 * 1000)) return;
  try {
    const { rows } = await db.query(
      `SELECT ${PUBLIC_COLUMNS} FROM exhibitions
       WHERE publication = 'published'
       ORDER BY date_start ASC`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/exhibitions/:id', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'exhibitions', 60, 60 * 1000)) return;
  try {
    const { rows } = await db.query(
      `SELECT ${PUBLIC_COLUMNS} FROM exhibitions
       WHERE id = $1 AND publication = 'published' LIMIT 1`,
      [req.params.id],
    );
    const exhibition = rows[0];
    if (!exhibition) {
      return res.status(404).json({ success: false, error: 'Pameran tidak ditemukan' });
    }
    const { rows: activations } = await db.query(
      `SELECT ea.event_id, ea.exhibition_id, e.acara, e.date_str, e.date_end, e.jam, e.lokasi, e.eo
       FROM exhibition_activations ea
       JOIN events e ON e.id = ea.event_id
       WHERE ea.exhibition_id = $1
       ORDER BY e.date_str ASC`,
      [req.params.id],
    );
    res.json({ success: true, data: { exhibition, activations } });
  } catch (err) {
    next(err);
  }
});

router.post('/exhibition-leads', async (req, res, next) => {
  // 10 pengajuan / 15 menit per IP — sejajar /registrations & /sponsor-leads.
  if (!enforceRateLimit(req, res, 'exhibition-leads', 10, 15 * 60 * 1000)) return;

  const parsed = exhibitionLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ');
    return res.status(400).json({ success: false, error: msg });
  }
  const lead = parsed.data;

  try {
    // Penerimaan diperiksa ulang di server: form bisa dibuka sebelum ditutup.
    const { rows } = await db.query(
      `SELECT id, accepting_applications, publication, date_end
       FROM exhibitions WHERE id = $1 LIMIT 1`,
      [lead.exhibitionId],
    );
    const exhibition = rows[0];
    if (!exhibition || exhibition.publication !== 'published') {
      return res.status(404).json({ success: false, error: 'Pameran tidak ditemukan' });
    }
    if (!exhibition.accepting_applications) {
      return res.status(409).json({ success: false, error: 'Pengajuan kolaborasi untuk pameran ini sudah ditutup' });
    }
    if (String(exhibition.date_end) < new Date().toISOString().slice(0, 10)) {
      return res.status(409).json({ success: false, error: 'Pameran ini sudah berakhir' });
    }

    const { rows: created } = await db.query(
      `INSERT INTO exhibition_leads
         (exhibition_id, organization_name, organization_type, participation,
          contact_name, phone, email, proposal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        lead.exhibitionId, lead.organizationName, lead.organizationType, lead.participation,
        lead.contactName, lead.phone, lead.email, lead.proposal,
      ],
    );
    res.status(201).json({ success: true, id: created[0]?.id || '' });
  } catch (err) {
    next(err);
  }
});

export default router;
