/**
 * Zod pameran/kolaborasi — dipakai route publik (pengajuan) dan ACTION_SCHEMAS admin.
 * Pesan berbahasa Indonesia agar langsung bisa ditampilkan di form.
 */
import { z } from 'zod';

// Tanggal nyata, bukan sekadar regex: `2027-02-31` lolos regex lalu ditolak
// Postgres (22008) sebagai 500. Aturan ini dipakai bersama pengajuan tenant.
import { isRealDate } from './tenantParticipationSchemas.js';

const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const isoDate = z.string().regex(ISO_DATE, 'Isi tanggal dengan format YYYY-MM-DD, mis. 2026-07-12')
  .refine(isRealDate, 'Tanggal ini tidak ada di kalender (mis. 31 Februari). Periksa bulan dan hari-nya.');

const timeValue = z.string().regex(TIME_REGEX, 'Isi jam dengan format HH:MM, mis. 06:30');

export const ORGANIZATION_TYPES = [
  'komunitas', 'umkm_brand', 'event_organizer', 'kampus_sekolah', 'instansi_ngo', 'lainnya',
  // Nilai lama tetap diterima agar tautan/klien lama tidak pecah.
  'brand', 'eo',
];

export const CONTRIBUTION_TYPES = [
  'pengisi_aktivasi', 'booth_umkm', 'sponsor_hadiah', 'media_partner', 'lainnya',
];

export const TECHNICAL_NEEDS = ['listrik', 'area_teduh', 'sound_system', 'meja_kursi', 'tanpa_kebutuhan'];

export const PROGRAM_STATUSES = ['draft', 'open', 'full', 'ongoing', 'completed', 'archived'];
export const COLLABORATION_STATUSES = [
  'submitted', 'in_review', 'need_info', 'approved', 'scheduled', 'completed', 'rejected', 'cancelled',
];
export const SLOT_STATUSES = ['open', 'limited', 'full', 'closed'];

const slugValue = z.string().trim().max(120, 'Alamat halaman maksimal 120 karakter')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Alamat halaman hanya boleh huruf kecil, angka, dan tanda hubung');

const benefitSchema = z.object({
  title: z.string().trim().min(1, 'Judul poin wajib diisi').max(120),
  description: z.string().trim().max(300).optional().default(''),
});

const formConfigSchema = z.object({
  concept_placeholder: z.string().trim().max(500).optional(),
  allowed_contributions: z.array(z.enum(CONTRIBUTION_TYPES)).optional(),
  show_technical_needs: z.boolean().optional(),
  show_participant_estimate: z.boolean().optional(),
}).passthrough();

export const exhibitionDataSchema = z.object({
  title: z.string().trim().min(3, 'Nama program minimal 3 karakter').max(200, 'Nama program maksimal 200 karakter'),
  slug: slugValue.optional().default(''),
  subtitle: z.string().trim().max(250, 'Subjudul maksimal 250 karakter').optional().default(''),
  programType: z.enum(['pameran', 'aktivasi_marcomm']).optional().default('pameran'),
  theme: z.string().trim().max(200, 'Tema maksimal 200 karakter').optional().default(''),
  description: z.string().trim().max(4000, 'Deskripsi maksimal 4000 karakter').optional().default(''),
  location: z.string().trim().max(200, 'Lokasi maksimal 200 karakter').optional().default(''),
  dateStart: isoDate,
  dateEnd: isoDate,
  scheduleNote: z.string().trim().max(250, 'Jadwal rutin maksimal 250 karakter').optional().default(''),
  targetAudience: z.string().trim().max(200).optional().default('Terbuka untuk umum (semua usia)'),
  collaborationBrief: z.string().trim().max(4000, 'Kebutuhan kolaborasi maksimal 4000 karakter').optional().default(''),
  lookingForSummary: z.string().trim().max(1000, 'Ringkasan pencarian mitra maksimal 1000 karakter').optional().default(''),
  lookingForTags: z.array(z.string().trim().min(1).max(60)).max(12, 'Maksimal 12 kategori minat').optional().default([]),
  benefits: z.array(benefitSchema).max(8, 'Maksimal 8 poin manfaat').optional().default([]),
  coverImageUrl: z.string().trim().max(500).optional().default(''),
  leasingPic: z.string().trim().max(100, 'PIC Casual Leasing maksimal 100 karakter').optional().default(''),
  marcommPic: z.string().trim().max(100, 'PIC Marcomm maksimal 100 karakter').optional().default(''),
  publication: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  status: z.enum(PROGRAM_STATUSES).optional().default('draft'),
  isFeatured: z.boolean().optional().default(false),
  acceptingApplications: z.boolean().optional().default(false),
  defaultOrganizationType: z.enum(ORGANIZATION_TYPES).optional().default('komunitas'),
  formConfig: formConfigSchema.optional().default({}),
}).refine((v) => v.dateEnd >= v.dateStart, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
  path: ['dateEnd'],
});

/**
 * Pengajuan kolaborasi publik.
 *
 * Data kurasi (`is_public_agenda`, `synced_event_id`, `admin_notes`, status
 * selain `submitted`) TIDAK ada di schema ini, jadi tidak mungkin dikirim
 * pengunjung anonim. Route memaksa status `submitted`.
 */
export const exhibitionLeadSchema = z.object({
  exhibitionId: z.string().trim().min(1).optional().default(''),
  programSlug: z.string().trim().min(1).optional().default(''),
  organizationName: z.string().trim().min(3, 'Nama komunitas minimal 3 karakter').max(200, 'Nama komunitas maksimal 200 karakter'),
  organizationType: z.enum(ORGANIZATION_TYPES, { message: 'Pilih jenis pendaftar' }),
  socialMediaHandle: z.string().trim().max(200, 'Akun media sosial maksimal 200 karakter').optional().default(''),
  contributionType: z.enum(CONTRIBUTION_TYPES, { message: 'Pilih bentuk partisipasi' }),
  conceptDescription: z.string().trim()
    .min(20, 'Ceritakan rencana kegiatan minimal 20 karakter')
    .max(4000, 'Cerita kegiatan maksimal 4000 karakter'),
  preferredSlotId: z.string().trim().min(1).optional().default(''),
  preferredDateNote: z.string().trim().max(200, 'Catatan tanggal maksimal 200 karakter').optional().default(''),
  flexibleDate: z.boolean().optional().default(false),
  estimatedParticipants: z.enum(['under_15', '15_to_30', '30_to_50', 'over_50', 'unsure'])
    .nullable().optional().default(null),
  technicalNeeds: z.array(z.enum(TECHNICAL_NEEDS)).max(5).optional().default([]),
  technicalNeedsNote: z.string().trim().max(500, 'Catatan kebutuhan maksimal 500 karakter').optional().default(''),
  contactName: z.string().trim().min(3, 'Nama penanggung jawab minimal 3 karakter').max(100, 'Nama penanggung jawab maksimal 100 karakter'),
  phone: z.string().trim()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => PHONE_REGEX.test(value), 'Format nomor WhatsApp tidak valid (contoh: 081234567890)'),
  email: z.string().trim().max(255, 'Email maksimal 255 karakter')
    .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Format email belum sesuai, mohon periksa kembali')
    .optional().default(''),
}).refine((v) => v.exhibitionId !== '' || v.programSlug !== '', {
  message: 'Program kolaborasi belum dipilih',
  path: ['exhibitionId'],
}).refine((v) => v.preferredSlotId !== '' || v.flexibleDate, {
  message: 'Mohon pilih salah satu tanggal yang tersedia atau pilih tanggal fleksibel',
  path: ['preferredSlotId'],
});

const slotDataSchema = z.object({
  slotDate: isoDate,
  startTime: timeValue.optional().default('06:30'),
  endTime: timeValue.optional().default('10:00'),
  zoneName: z.string().trim().max(120).optional().default('Area Utama'),
  capacity: z.coerce.number().int().min(1, 'Kapasitas minimal 1').max(999).optional().default(3),
  slotStatus: z.enum(SLOT_STATUSES).optional().default('open'),
  publicNote: z.string().trim().max(300).optional().default(''),
}).refine((v) => v.endTime > v.startTime, {
  message: 'Jam selesai harus setelah jam mulai',
  path: ['endTime'],
});

export const EXHIBITION_ACTION_SCHEMAS = {
  listExhibitions: z.object({ action: z.literal('listExhibitions') }),
  listExhibitionActivations: z.object({ action: z.literal('listExhibitionActivations') }),
  createExhibition: z.object({ action: z.literal('createExhibition'), data: exhibitionDataSchema }),
  updateExhibition: z.object({
    action: z.literal('updateExhibition'),
    id: z.string().min(1),
    data: exhibitionDataSchema,
  }),
  deleteExhibition: z.object({ action: z.literal('deleteExhibition'), id: z.string().min(1) }),
  listExhibitionLeads: z.object({ action: z.literal('listExhibitionLeads'), exhibitionId: z.string().optional() }),
  updateExhibitionLead: z.object({
    action: z.literal('updateExhibitionLead'),
    id: z.string().min(1),
    status: z.enum(COLLABORATION_STATUSES),
    internalNotes: z.string().max(2000).optional(),
    publicActivityTitle: z.string().trim().max(200).optional(),
    publicActivitySummary: z.string().trim().max(500).optional(),
    isPublicAgenda: z.boolean().optional(),
  }),
  linkExhibitionActivation: z.object({
    action: z.literal('linkExhibitionActivation'),
    exhibitionId: z.string().min(1),
    eventId: z.string().min(1),
  }),
  unlinkExhibitionActivation: z.object({
    action: z.literal('unlinkExhibitionActivation'),
    eventId: z.string().min(1),
  }),

  // ── Slot tanggal agenda aktivasi ────────────────────────────────────
  listExhibitionSlots: z.object({
    action: z.literal('listExhibitionSlots'),
    exhibitionId: z.string().optional(),
  }),
  createExhibitionSlot: z.object({
    action: z.literal('createExhibitionSlot'),
    exhibitionId: z.string().min(1),
    data: slotDataSchema,
  }),
  updateExhibitionSlot: z.object({
    action: z.literal('updateExhibitionSlot'),
    id: z.string().min(1),
    data: slotDataSchema,
  }),
  deleteExhibitionSlot: z.object({ action: z.literal('deleteExhibitionSlot'), id: z.string().min(1) }),
  generateExhibitionSlots: z.object({
    action: z.literal('generateExhibitionSlots'),
    exhibitionId: z.string().min(1),
    data: z.object({
      startTime: timeValue.optional().default('06:30'),
      endTime: timeValue.optional().default('10:00'),
      zoneName: z.string().trim().max(120).optional().default('Area Utama'),
      capacity: z.coerce.number().int().min(1).max(999).optional().default(3),
    }).refine((v) => v.endTime > v.startTime, {
      message: 'Jam selesai harus setelah jam mulai',
      path: ['endTime'],
    }),
  }),

  // ── Terbitkan pengajuan ke Jadwal Event ─────────────────────────────
  publishCollaborationToEvent: z.object({
    action: z.literal('publishCollaborationToEvent'),
    id: z.string().min(1),
  }),
};
