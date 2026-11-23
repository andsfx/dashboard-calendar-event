/**
 * Routes pameran & kolaborasi — mount di /api/v1.
 *
 *   GET  /exhibitions           publik — program published (tanpa PII/catatan internal)
 *   GET  /exhibitions/:idOrSlug publik — detail + slot agenda + kegiatan terkonfirmasi
 *   POST /exhibition-leads      publik — pengajuan kolaborasi (rate limit)
 *
 * Kontrak: program = induk; slot = tanggal/sesi; aktivasi = event resmi yang
 * ditautkan (bukan salinan jadwal). Pengajuan masuk antrean kurasi dan TIDAK
 * membuat event otomatis (sejalan ADR 003). Envelope GET publik: { success, data }.
 */
import { Router } from 'express';

import { db } from '../db.js';
import { enforceRateLimit } from '../lib/rateLimit.js';
import { toTextArray } from '../lib/pgValues.js';
import { exhibitionLeadSchema } from '../lib/exhibitionSchemas.js';

const router = Router();

/**
 * Kolom aman untuk publik — kontak PIC, catatan internal, dan field kurasi
 * tidak pernah ikut. Daftar ini juga satu-satunya proyeksi detail program.
 */
const PUBLIC_COLUMNS = `
  id, slug, title, subtitle, program_type, theme, description, location,
  date_start, date_end, schedule_note, target_audience,
  looking_for_summary, looking_for_tags, benefits, cover_image_url,
  collaboration_brief, publication, status, is_featured,
  accepting_applications, default_organization_type, form_config, created_at
`;

/** Program hanya tayang bila sudah published dan siklusnya bukan draft/archive. */
const PUBLIC_STATUSES = "('open', 'full', 'ongoing', 'completed')";

/** 08xx / 628xx / +628xx → 628xx (tanpa spasi dan tanda hubung). */
function normalizeWhatsApp(raw) {
  let digits = String(raw).replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return digits;
}

/** Kolom lama `participation` tetap terisi agar fitur aktivasi lama tidak pecah. */
function participationFor(contributionType) {
  if (contributionType === 'booth_umkm') return 'booth';
  if (contributionType === 'pengisi_aktivasi' || contributionType === 'media_partner') return 'activation';
  return 'both';
}

router.get('/exhibitions', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'exhibitions', 60, 60 * 1000)) return;
  try {
    const { rows } = await db.query(
      `SELECT ${PUBLIC_COLUMNS} FROM exhibitions
       WHERE publication = 'published' AND status IN ${PUBLIC_STATUSES}
       ORDER BY is_featured DESC, date_start ASC`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/exhibitions/:idOrSlug', async (req, res, next) => {
  if (!enforceRateLimit(req, res, 'exhibitions', 60, 60 * 1000)) return;
  try {
    const { rows } = await db.query(
      `SELECT ${PUBLIC_COLUMNS} FROM exhibitions
       WHERE (id = $1 OR slug = $1) AND publication = 'published'
         AND status IN ${PUBLIC_STATUSES}
       LIMIT 1`,
      [req.params.idOrSlug],
    );
    const exhibition = rows[0];
    if (!exhibition) {
      return res.status(404).json({ success: false, error: 'Program kolaborasi tidak ditemukan' });
    }

    const [{ rows: slots }, { rows: agenda }, { rows: activations }] = await Promise.all([
      db.query(
        `SELECT id, exhibition_id, slot_date, start_time, end_time, zone_name,
                capacity, slot_status, public_note
         FROM exhibition_slots
         WHERE exhibition_id = $1
         ORDER BY slot_date ASC, start_time ASC`,
        [exhibition.id],
      ),
      db.query(
        `SELECT a.id, a.program_id, a.slot_id, a.organization_name, a.organization_type,
                a.contribution_type, a.public_activity_title, a.public_activity_summary,
                a.status, s.slot_date, s.start_time, s.end_time, s.zone_name
         FROM public_program_agenda a
         LEFT JOIN exhibition_slots s ON s.id = a.slot_id
         WHERE a.program_id = $1
         ORDER BY s.slot_date ASC NULLS LAST, a.public_activity_title ASC`,
        [exhibition.id],
      ),
      db.query(
        `SELECT ea.event_id, ea.exhibition_id, e.acara, e.date_str, e.date_end, e.jam, e.lokasi, e.eo
         FROM exhibition_activations ea
         JOIN events e ON e.id = ea.event_id
         WHERE ea.exhibition_id = $1
         ORDER BY e.date_str ASC`,
        [exhibition.id],
      ),
    ]);

    res.json({ success: true, data: { exhibition, slots, agenda, activations } });
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
      `SELECT id, slug, title, publication, status, accepting_applications, date_end
       FROM exhibitions
       WHERE (id = $1 OR slug = $2) LIMIT 1`,
      [lead.exhibitionId || null, lead.programSlug || null],
    );
    const exhibition = rows[0];
    if (!exhibition || exhibition.publication !== 'published') {
      return res.status(404).json({ success: false, error: 'Program kolaborasi tidak ditemukan' });
    }
    if (exhibition.status === 'full') {
      return res.status(409).json({ success: false, error: 'Slot periode ini sudah penuh. Silakan lihat program lain.' });
    }
    if (!exhibition.accepting_applications || !['open', 'ongoing'].includes(exhibition.status)) {
      return res.status(409).json({ success: false, error: 'Pengajuan kolaborasi untuk program ini sudah ditutup' });
    }
    if (String(exhibition.date_end) < new Date().toISOString().slice(0, 10)) {
      return res.status(409).json({ success: false, error: 'Program kolaborasi ini sudah berakhir' });
    }

    let slotId = lead.preferredSlotId || null;
    if (slotId) {
      const { rows: slotRows } = await db.query(
        `SELECT id, exhibition_id, slot_status FROM exhibition_slots WHERE id = $1 LIMIT 1`,
        [slotId],
      );
      const slot = slotRows[0];
      if (!slot || slot.exhibition_id !== exhibition.id) {
        return res.status(400).json({ success: false, error: 'Tanggal yang dipilih tidak tersedia untuk program ini' });
      }
      if (!['open', 'limited'].includes(slot.slot_status)) {
        return res.status(409).json({ success: false, error: 'Tanggal yang dipilih sudah penuh atau ditutup. Pilih tanggal lain.' });
      }
    } else {
      slotId = null;
    }

    const { rows: created } = await db.query(
      `INSERT INTO exhibition_leads
         (exhibition_id, slot_id, organization_name, organization_type, participation,
          contribution_type, social_media_handle, contact_name, phone, email, proposal,
          preferred_date_note, estimated_participants, technical_needs, technical_needs_note, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'submitted')
       RETURNING id, reference_code`,
      [
        exhibition.id, slotId, lead.organizationName, lead.organizationType,
        participationFor(lead.contributionType), lead.contributionType, lead.socialMediaHandle,
        lead.contactName, normalizeWhatsApp(lead.phone), lead.email, lead.conceptDescription,
        lead.preferredDateNote, lead.estimatedParticipants,
        toTextArray(lead.technicalNeeds), lead.technicalNeedsNote,
      ],
    );

    res.status(201).json({
      success: true,
      id: created[0]?.id || '',
      referenceCode: created[0]?.reference_code || '',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
