/**
 * Zod pameran — dipakai route publik (lead) dan ACTION_SCHEMAS admin.
 * Pesan berbahasa Indonesia agar langsung bisa ditampilkan di form.
 */
import { z } from 'zod';

const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = z.string().regex(ISO_DATE, 'Format tanggal harus YYYY-MM-DD');

export const exhibitionDataSchema = z.object({
  title: z.string().trim().min(3, 'Nama pameran minimal 3 karakter').max(200, 'Nama pameran maksimal 200 karakter'),
  theme: z.string().trim().max(200, 'Tema maksimal 200 karakter').optional().default(''),
  description: z.string().trim().max(4000, 'Deskripsi maksimal 4000 karakter').optional().default(''),
  location: z.string().trim().max(200, 'Lokasi maksimal 200 karakter').optional().default(''),
  dateStart: isoDate,
  dateEnd: isoDate,
  collaborationBrief: z.string().trim().max(4000, 'Kebutuhan kolaborasi maksimal 4000 karakter').optional().default(''),
  leasingPic: z.string().trim().max(100, 'PIC Casual Leasing maksimal 100 karakter').optional().default(''),
  marcommPic: z.string().trim().max(100, 'PIC Marcomm maksimal 100 karakter').optional().default(''),
  publication: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  acceptingApplications: z.boolean().optional().default(false),
}).refine((v) => v.dateEnd >= v.dateStart, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
  path: ['dateEnd'],
});

export const exhibitionLeadSchema = z.object({
  exhibitionId: z.string().min(1, 'Pameran wajib dipilih'),
  organizationName: z.string().trim().min(3, 'Nama brand/EO minimal 3 karakter').max(200, 'Nama brand/EO maksimal 200 karakter'),
  organizationType: z.enum(['brand', 'eo'], { message: 'Pilih brand atau EO' }),
  participation: z.enum(['booth', 'activation', 'both'], { message: 'Pilih bentuk kontribusi' }),
  contactName: z.string().trim().min(3, 'Nama PIC minimal 3 karakter').max(100, 'Nama PIC maksimal 100 karakter'),
  phone: z.string().trim().regex(PHONE_REGEX, 'Format nomor telepon tidak valid (08xxx / +628xxx)'),
  email: z.string().trim().max(255, 'Email maksimal 255 karakter')
    .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Format email tidak valid')
    .optional().default(''),
  proposal: z.string().trim().max(4000, 'Konsep maksimal 4000 karakter').optional().default(''),
}).refine((v) => v.participation === 'booth' || v.proposal.trim().length >= 10, {
  message: 'Jelaskan konsep aktivasi minimal 10 karakter',
  path: ['proposal'],
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
    status: z.enum(['pending', 'contacted', 'approved', 'rejected']),
    internalNotes: z.string().max(2000).optional(),
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
};
