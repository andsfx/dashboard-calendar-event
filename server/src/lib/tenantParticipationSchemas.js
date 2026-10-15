/**
 * Zod partisipasi tenant (open booth & voucher per event) — dipakai route
 * publik (submit + cek status) dan ACTION_SCHEMAS admin.
 *
 * Catatan keamanan: schema ini memvalidasi BENTUK payload, bukan kolom DB.
 * Kolom yang ditulis admin ditetapkan lewat SET tetap di routes/admin.js
 * (whitelist manual) — zod `.passthrough()` bukan pertahanan kolom.
 *
 * Aturan silang (kind ↔ field): `kind` menentukan kelompok field mana yang
 * WAJIB ada. `booth` = booth saja; `voucher` = voucher saja; `both` = keduanya.
 * Field kelompok yang tidak dipilih tetap dikirim '' / null oleh klien, dan
 * server mengabaikannya saat INSERT (bukan menyimpan sampah).
 */
import { z } from 'zod';

const PHONE_REGEX = /^(\+62|62|0)8[0-9]{8,12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDateOptional = z.string().trim().regex(ISO_DATE, 'Format tanggal harus YYYY-MM-DD').or(z.literal('')).optional().default('');

export const TENANT_PARTICIPATION_KINDS = ['booth', 'voucher', 'both'];
export const TENANT_PARTICIPATION_STATUSES = ['pending', 'contacted', 'approved', 'rejected'];
export const TENANT_PARTICIPATION_SCHEMES = ['solo', 'joint', 'mall_support'];
export const TENANT_PARTICIPATION_VOUCHER_TYPES = [
  'discount_percent', 'discount_amount', 'buy1get1', 'free_item', 'min_spend', 'other',
];
export const TENANT_PARTICIPATION_VOUCHER_FORMATS = ['digital', 'fisik', 'both'];

/** Kuota voucher opsional: kosong = tanpa kuota. Angka bulat 0..100000. */
const voucherQuota = z.union([
  z.number().int('Kuota harus bilangan bulat').min(0, 'Kuota tidak boleh negatif').max(100000, 'Kuota maksimal 100000'),
  z.literal('').transform(() => null),
  z.null(),
]).optional().default(null);

export const tenantParticipationSchema = z.object({
  // Identitas tenant (dari master MID atau isi manual)
  tenantId: z.string().trim().max(50, 'ID tenant terlalu panjang').optional().default(''),
  tenantName: z.string().trim().min(2, 'Nama tenant minimal 2 karakter').max(200, 'Nama tenant maksimal 200 karakter'),
  unitNumber: z.string().trim().max(50, 'Nomor unit maksimal 50 karakter').optional().default(''),
  tenantCategory: z.string().trim().max(100, 'Kategori tenant maksimal 100 karakter').optional().default(''),
  tenantLogo: z.string().trim().max(2048, 'URL logo terlalu panjang').optional().default(''),
  // PIC
  contactName: z.string().trim().min(3, 'Nama PIC minimal 3 karakter').max(100, 'Nama PIC maksimal 100 karakter'),
  phone: z.string().trim().regex(PHONE_REGEX, 'Format nomor telepon tidak valid (08xxx / +628xxx)'),
  email: z.string().trim().max(255, 'Email maksimal 255 karakter')
    .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Format email tidak valid')
    .optional().default(''),
  // Event tujuan — wajib menunjuk event yang ada dan belum mulai (cutoff H-1
  // diperiksa ulang terhadap DB di route, bukan hanya dari nilai klien).
  eventId: z.string().trim().min(1, 'Pilih event tujuan').max(200, 'ID event terlalu panjang'),
  // Jenis partisipasi
  kind: z.enum(TENANT_PARTICIPATION_KINDS, { message: 'Pilih jenis partisipasi' }),
  // Booth — wajib bila kind ∈ {booth, both}
  boothArea: z.string().trim().max(200, 'Area maksimal 200 karakter').optional().default(''),
  boothStart: isoDateOptional,
  boothEnd: isoDateOptional,
  boothSize: z.string().trim().max(100, 'Ukuran booth maksimal 100 karakter').optional().default(''),
  boothProducts: z.string().trim().max(1000, 'Produk maksimal 1000 karakter').optional().default(''),
  boothScheme: z.enum(TENANT_PARTICIPATION_SCHEMES, { message: 'Pilih skema booth' }).optional().default('solo'),
  boothNeeds: z.string().trim().max(2000, 'Kebutuhan fasilitas maksimal 2000 karakter').optional().default(''),
  // Voucher — wajib bila kind ∈ {voucher, both}
  voucherType: z.enum(TENANT_PARTICIPATION_VOUCHER_TYPES, { message: 'Pilih jenis voucher' }).optional().default('other'),
  voucherTerms: z.string().trim().max(2000, 'Ketentuan voucher maksimal 2000 karakter').optional().default(''),
  voucherQuota,
  voucherFormat: z.enum(TENANT_PARTICIPATION_VOUCHER_FORMATS, { message: 'Pilih format voucher' }).optional().default('both'),
})
  .refine((v) => v.kind === 'voucher' || (v.boothStart !== '' && v.boothArea !== '' && v.boothProducts !== ''), {
    message: 'Lengkapi data booth: area, tanggal mulai, dan produk yang dijual',
    path: ['boothArea'],
  })
  .refine((v) => v.boothEnd === '' || v.boothStart === '' || v.boothEnd >= v.boothStart, {
    message: 'Tanggal selesai booth tidak boleh sebelum tanggal mulai',
    path: ['boothEnd'],
  })
  .refine((v) => v.kind === 'booth' || v.voucherTerms !== '', {
    message: 'Ketentuan voucher wajib diisi',
    path: ['voucherTerms'],
  });

/** Kuota dari klien bisa datang sebagai angka atau '' — normalisasi ke number|null. */
export const TENANT_PARTICIPATION_STATUS_SCHEMA = z.object({
  code: z.string().trim().min(4, 'Kode pengajuan wajib diisi').max(30, 'Kode pengajuan tidak valid'),
  phone: z.string().trim().min(8, 'Nomor telepon wajib diisi').max(20, 'Nomor telepon tidak valid'),
});

/**
 * Aksi admin (antrean review + koreksi isian oleh Marcomm).
 *
 * Koreksi isian memakai field yang SAMA dengan form publik supaya pesan
 * validasi dan perilakunya konsisten; yang berbeda hanya tidak ada `eventId`
 * (memindah pengajuan antar event bukan koreksi, itu pengajuan baru) dan tidak
 * ada field identitas tenant (nama/unit/kategori datang dari master MID).
 */
export const TENANT_PARTICIPATION_ACTION_SCHEMAS = {
  listTenantParticipations: z.object({ action: z.literal('listTenantParticipations') }),
  updateTenantParticipation: z.object({
    action: z.literal('updateTenantParticipation'),
    id: z.string().min(1),
    status: z.enum(TENANT_PARTICIPATION_STATUSES).optional(),
    internalNotes: z.string().max(2000, 'Catatan maksimal 2000 karakter').optional(),
    // Koreksi isian (K10)
    boothArea: z.string().trim().max(200, 'Area maksimal 200 karakter').optional(),
    boothStart: z.string().trim().regex(ISO_DATE, 'Format tanggal harus YYYY-MM-DD').or(z.literal('')).optional(),
    boothEnd: z.string().trim().regex(ISO_DATE, 'Format tanggal harus YYYY-MM-DD').or(z.literal('')).optional(),
    boothSize: z.string().trim().max(100, 'Ukuran booth maksimal 100 karakter').optional(),
    boothProducts: z.string().trim().max(1000, 'Produk maksimal 1000 karakter').optional(),
    boothScheme: z.enum(TENANT_PARTICIPATION_SCHEMES).optional(),
    boothNeeds: z.string().trim().max(2000, 'Kebutuhan fasilitas maksimal 2000 karakter').optional(),
    voucherType: z.enum(TENANT_PARTICIPATION_VOUCHER_TYPES).optional(),
    voucherTerms: z.string().trim().max(2000, 'Ketentuan voucher maksimal 2000 karakter').optional(),
    voucherQuota: z.union([
      z.number().int('Kuota harus bilangan bulat').min(0, 'Kuota tidak boleh negatif').max(100000, 'Kuota maksimal 100000'),
      z.literal('').transform(() => null),
      z.null(),
    ]).optional(),
    voucherFormat: z.enum(TENANT_PARTICIPATION_VOUCHER_FORMATS).optional(),
  }).refine((v) => Object.keys(v).some((key) => key !== 'action' && key !== 'id'), {
    message: 'Tidak ada perubahan yang dikirim',
    path: ['status'],
  }),
  deleteTenantParticipation: z.object({
    action: z.literal('deleteTenantParticipation'),
    id: z.string().min(1),
  }),
};
