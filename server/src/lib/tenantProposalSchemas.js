/**
 * Zod pengajuan kolaborasi tenant — dipakai route publik (submit + presign
 * lampiran) dan ACTION_SCHEMAS admin. Pesan berbahasa Indonesia agar langsung
 * bisa ditampilkan di form.
 *
 * Catatan keamanan: schema ini memvalidasi BENTUK payload, bukan kolom DB.
 * Kolom yang ditulis admin ditetapkan lewat SET tetap di routes/admin.js
 * (whitelist manual) — zod `.passthrough()` bukan pertahanan kolom.
 */
import { z } from 'zod';

import { jakartaToday } from './eventWindow.js';

const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = z.string().regex(ISO_DATE, 'Format tanggal harus YYYY-MM-DD');

/** Jenis kegiatan yang bisa diajukan gerai. `other` = tidak masuk daftar. */
export const TENANT_EVENT_TYPES = ['promo', 'workshop', 'exhibition', 'performance', 'launching', 'other'];
export const TENANT_PROPOSAL_STATUSES = ['pending', 'contacted', 'approved', 'rejected'];

export const tenantEventProposalSchema = z.object({
  tenantId: z.string().trim().max(50, 'ID gerai terlalu panjang').optional().default(''),
  tenantName: z.string().trim().min(2, 'Nama gerai minimal 2 karakter').max(200, 'Nama gerai maksimal 200 karakter'),
  unitNumber: z.string().trim().max(50, 'Nomor unit maksimal 50 karakter').optional().default(''),
  tenantCategory: z.string().trim().max(100, 'Kategori gerai maksimal 100 karakter').optional().default(''),
  contactName: z.string().trim().min(3, 'Nama PIC minimal 3 karakter').max(100, 'Nama PIC maksimal 100 karakter'),
  phone: z.string().trim().regex(PHONE_REGEX, 'Format nomor telepon tidak valid (08xxx / +628xxx)'),
  email: z.string().trim().max(255, 'Email maksimal 255 karakter')
    .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Format email tidak valid')
    .optional().default(''),
  eventTitle: z.string().trim().min(3, 'Judul event minimal 3 karakter').max(200, 'Judul event maksimal 200 karakter'),
  eventType: z.enum(TENANT_EVENT_TYPES, { message: 'Pilih jenis event' }).optional().default('other'),
  eventDescription: z.string().trim().min(10, 'Deskripsi event minimal 10 karakter').max(4000, 'Deskripsi maksimal 4000 karakter'),
  proposedStart: isoDate,
  proposedEnd: z.string().trim().regex(ISO_DATE, 'Format tanggal harus YYYY-MM-DD').or(z.literal('')).optional().default(''),
  preferredArea: z.string().trim().max(200, 'Area maksimal 200 karakter').optional().default(''),
  expectedVisitors: z.string().trim().max(100, 'Perkiraan pengunjung maksimal 100 karakter').optional().default(''),
  needs: z.string().trim().max(2000, 'Kebutuhan fasilitas maksimal 2000 karakter').optional().default(''),
  proposalFileUrl: z.string().trim().max(2048, 'URL lampiran terlalu panjang').optional().default(''),
  proposalFileName: z.string().trim().max(255, 'Nama file terlalu panjang').optional().default(''),
  proposalMimeType: z.string().trim().max(120, 'Tipe file tidak valid').optional().default(''),
})
  .refine((v) => v.proposedEnd === '' || v.proposedEnd >= v.proposedStart, {
    message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
    path: ['proposedEnd'],
  })
  .refine((v) => v.proposedStart >= jakartaToday(), {
    message: 'Tanggal mulai tidak boleh di masa lalu',
    path: ['proposedStart'],
  });

export const TENANT_PROPOSAL_ACTION_SCHEMAS = {
  listTenantEventProposals: z.object({ action: z.literal('listTenantEventProposals') }),
  updateTenantEventProposal: z.object({
    action: z.literal('updateTenantEventProposal'),
    id: z.string().min(1),
    status: z.enum(TENANT_PROPOSAL_STATUSES).optional(),
    internalNotes: z.string().max(2000, 'Catatan maksimal 2000 karakter').optional(),
  }).refine((v) => v.status !== undefined || v.internalNotes !== undefined, {
    message: 'Tidak ada perubahan yang dikirim',
    path: ['status'],
  }),
  deleteTenantEventProposal: z.object({
    action: z.literal('deleteTenantEventProposal'),
    id: z.string().min(1),
  }),
};
