import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CalendarDays, CheckCircle2, FileText, Handshake, Paperclip, Send, X,
} from 'lucide-react';
import type { TenantEventProposalInput, TenantEventProposalType } from '../types';
import { fetchEventAreas, submitTenantEventProposal, uploadTenantProposalAttachment, type TenantDropdownOption } from '../utils/domainApi';
import { TenantSearchSelect } from '../components/survey/TenantSurveyShared';
import { getTodayIsoLocal } from '../utils/eventDateTime';
import { validateEmail, validatePhone } from '../utils/validation';
import { usePageMeta } from '../utils/pageMeta';
import { ApiError } from '../lib/rest';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { NativeSelect } from '../components/shadcn/native-select';
import { Textarea } from '../components/shadcn/textarea';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const EVENT_TYPES: { value: TenantEventProposalType; label: string }[] = [
  { value: 'promo', label: 'Promo atau diskon' },
  { value: 'workshop', label: 'Workshop atau kelas' },
  { value: 'exhibition', label: 'Pameran produk' },
  { value: 'performance', label: 'Pertunjukan atau hiburan' },
  { value: 'launching', label: 'Peluncuran produk' },
  { value: 'other', label: 'Lainnya' },
];

/** Selaras dengan allowlist server: lampiran berupa dokumen atau materi gambar, maksimal 20MB. */
const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
/**
 * Satu peta tipe → ekstensi yang sah, bukan dua daftar terpisah. Tipe yang diklaim
 * berkas dan ekstensinya harus sepadan: `.png` yang mengaku `application/pdf` ditolak
 * di sini, bukan baru ketahuan di verifikasi magic-bytes server dengan pesan yang
 * membingungkan. Server menyimpan ekstensi objek dari MIME (bukan dari nama berkas),
 * jadi ekstensi di nama berkas tidak pernah ikut menentukan tipe tersimpan.
 */
const ATTACHMENT_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
};
/** Daftar format untuk `accept` dan pesan penolakan, diturunkan dari peta di atas agar tidak menyimpang. */
const ATTACHMENT_ACCEPT = [
  ...Object.keys(ATTACHMENT_TYPES),
  ...Object.values(ATTACHMENT_TYPES).flat().map((ext) => `.${ext}`),
].join(',');
const ATTACHMENT_FORMATS = 'PDF, Word (DOC/DOCX), PNG, atau JPEG';

const EMPTY_FORM: TenantEventProposalInput = {
  tenantId: '',
  tenantName: '', unitNumber: '', tenantCategory: '',
  contactName: '', phone: '', email: '',
  eventTitle: '', eventType: 'promo', eventDescription: '',
  proposedStart: '', proposedEnd: '', preferredArea: '', expectedVisitors: '', needs: '',
  proposalFileUrl: '', proposalFileName: '', proposalMimeType: '',
};

/**
 * Kontrol form. `border-[var(--wf-rule-control)]` dipilih karena batas input adalah satu-satunya
 * penanda bidang di atas kartu putih, jadi ia harus lolos 3:1 non-teks (WCAG 1.4.11):
 * #7d8579 vs putih = 3.82:1, vs bidang gelap #2d382f = 3.20:1. Placeholder gelap
 * memakai slate-300 (6.65:1); slate-400 hanya 3.20:1 dan gagal 4.5:1.
 *
 * `h-auto` menaklukkan tinggi bawaan `Input`/`Textarea` shadcn (`h-8`) sehingga padding asli
 * (`py-3`) tetap yang menentukan tinggi. Sufiks `!` dipakai pada kelas yang kalah urutan dari
 * token bawaan shadcn (`rounded-lg`, `ring-3`, `ring-ring/50`, `aria-invalid:*`) supaya tampilan
 * kontrol tidak bergeser; `dark:bg-\[var\(--wf-board\)\]` mempertahankan latar kontrol putih di tema gelap.
 */
const inputClass = 'h-auto w-full rounded-[var(--radius-control)]! border border-[var(--wf-rule-control)] bg-[var(--wf-board)] px-4 py-3 text-sm text-[var(--wf-ink)] outline-none transition! placeholder:text-[var(--wf-ink-muted)] focus-visible:border-[var(--wf-rule-control)]! focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]! aria-invalid:border-[var(--wf-rule-control)]! aria-invalid:ring-0!';
/**
 * `className` pada `NativeSelect` mendarat di pembungkus, bukan di elemen pilihannya, jadi
 * token kontrol lama dioper lewat varian anak (`[&>select]:*`). Padding kanan dibiarkan
 * `pr-8` bawaan agar chevron yang digambar primitive tidak menimpa teks pilihan.
 */
const nativeSelectClass = 'w-full [&>select]:h-auto [&>select]:rounded-[var(--radius-control)] [&>select]:bg-[var(--wf-board)] [&>select]:pl-4 [&>select]:py-3 [&>select]:transition [&>select]:focus-visible:border-[var(--wf-rule-control)] [&>select]:focus-visible:ring-2 [&>select]:focus-visible:ring-[var(--brand-tosca)] [&>select]:aria-invalid:border-[var(--wf-rule-control)] [&>select]:aria-invalid:ring-0';
/**
 * TenantSearchSelect adalah komponen survei (rounded-xl 20px, py-2 38px, latar
 * gelap sama dengan kartu). Halaman ini menyetelnya agar setara input lain:
 * `rounded-md` = --radius-md 0.75rem = --radius-control, ditulis sebagai kelas
 * yang bisa di-merge `cn()` (kunci konflik `rounded`), bukan var() arbitrary.
 */
const tenantFieldClass = 'rounded-md border-[var(--wf-rule-control)] py-3 bg-[var(--wf-board-2)] placeholder:text-[var(--wf-ink-muted)]';
const labelClass = 'mb-1.5 block! select-text! text-xs font-semibold leading-normal text-[var(--wf-ink-muted)]';
const focusRing = 'ui-focus-ring';

export function TenantCollaborationPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Kolaborasi tenant - Metropolitan Mall Bekasi',
    description: 'Ajukan event kerja sama tenant kamu di Metropolitan Mall Bekasi: promo, workshop, pameran produk, hingga pertunjukan. Lampirkan proposal bila sudah siap.',
  });

  const [form, setForm] = useState<TenantEventProposalInput>({ ...EMPTY_FORM });
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  /**
   * Tenant diambil dari master MID (pilih dari daftar) supaya nama/unit/kategori
   * konsisten dengan data mall. Jalur manual tetap ada karena halaman ini
   * publik: bila tenant belum terdaftar atau layanan MID sedang bermasalah,
   * form tidak boleh mati total.
   */
  const [selectedTenant, setSelectedTenant] = useState<TenantDropdownOption | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  /** Field yang terisi otomatis dan belum disentuh user — direset saat pilihan dilepas. */
  const [autoFilled, setAutoFilled] = useState({ unitNumber: false, tenantCategory: false });
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /** Target fokus setelah form unmount: tanpa ini fokus jatuh ke <body> tanpa kabar. */
  const successRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  // Daftar Area kanonis (aktif) untuk pilihan lokasi. Gagal memuat = tetap bisa
  // mengajukan: kolomnya jatuh ke input teks bebas, bukan memblokir form.
  useEffect(() => {
    let cancelled = false;
    fetchEventAreas()
      .then((areas) => { if (!cancelled) setAreaOptions(areas.map((area) => area.name).filter(Boolean)); })
      .catch(() => { if (!cancelled) setAreaOptions([]); });
    return () => { cancelled = true; };
  }, []);

  const setField = <K extends keyof TenantEventProposalInput>(key: K, value: TenantEventProposalInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Field hasil auto-isi MID yang disentuh user berhenti dianggap otomatis,
    // supaya melepas pilihan tenant tidak menghapus ketikan user.
    if (key === 'unitNumber') {
      setAutoFilled((prev) => (prev.unitNumber ? { ...prev, unitNumber: false } : prev));
    } else if (key === 'tenantCategory') {
      setAutoFilled((prev) => (prev.tenantCategory ? { ...prev, tenantCategory: false } : prev));
    }
    setError('');
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /** Pilih tenant dari master MID → isi nama, unit, dan kategori sekaligus. */
  const handleTenantSelect = (tenant: TenantDropdownOption | null) => {
    setSelectedTenant(tenant);
    setForm((prev) => {
      if (!tenant) {
        // Lepas pilihan: buang hanya field yang masih murni hasil auto-isi,
        // jangan hapus yang sudah disunting user.
        return {
          ...prev,
          tenantId: '',
          unitNumber: autoFilled.unitNumber ? '' : prev.unitNumber,
          tenantCategory: autoFilled.tenantCategory ? '' : prev.tenantCategory,
        };
      }
      return {
        ...prev,
        tenantId: tenant.id,
        tenantName: tenant.name,
        unitNumber: tenant.lot,
        tenantCategory: tenant.category,
      };
    });
    setAutoFilled(tenant
      ? { unitNumber: Boolean(tenant.lot), tenantCategory: Boolean(tenant.category) }
      : { unitNumber: false, tenantCategory: false });
    setError('');
    setFieldErrors((prev) => {
      if (!prev.tenantName) return prev;
      const next = { ...prev };
      delete next.tenantName;
      return next;
    });
  };

  /** Pindah jalur pengisian tenant; pilihan MID dibuang agar tidak ada data separuh. */
  const switchEntryMode = (manual: boolean) => {
    setManualEntry(manual);
    setSelectedTenant(null);
    setForm((prev) => ({
      ...prev,
      tenantId: '',
      tenantName: '',
      // Unit/kategori dari tenant MID sebelumnya tidak boleh tertinggal: nama
      // tenant sudah kosong, jadi sisa itu akan terkirim sebagai data campuran.
      unitNumber: autoFilled.unitNumber ? '' : prev.unitNumber,
      tenantCategory: autoFilled.tenantCategory ? '' : prev.tenantCategory,
    }));
    setAutoFilled({ unitNumber: false, tenantCategory: false });
    setError('');
    setFieldErrors((prev) => {
      if (!prev.tenantName) return prev;
      const next = { ...prev };
      delete next.tenantName;
      return next;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) { setFile(null); return; }
    const extension = picked.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ATTACHMENT_TYPES[picked.type];
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      setFile(null);
      setError(`Lampiran harus ${ATTACHMENT_FORMATS}.`);
      return;
    }
    if (picked.size > ATTACHMENT_MAX_BYTES) {
      setFile(null);
      setError('Ukuran lampiran melebihi 20MB.');
      return;
    }
    setFile(picked);
    setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!manualEntry && !selectedTenant) errors.tenantName = 'Pilih tenant dari daftar, atau isi manual.';
    else if (form.tenantName.trim().length < 2) errors.tenantName = 'Nama tenant minimal 2 karakter.';
    if (form.contactName.trim().length < 3) errors.contactName = 'Nama PIC minimal 3 karakter.';
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error || 'Nomor WhatsApp tidak valid.';
    if (form.email.trim()) {
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) errors.email = emailCheck.error || 'Email belum sesuai format. Contoh yang benar: nama@email.com';
    }
    if (form.eventTitle.trim().length < 3) errors.eventTitle = 'Judul event minimal 3 karakter.';
    if (form.eventDescription.trim().length < 10) errors.eventDescription = 'Deskripsi event minimal 10 karakter.';
    if (!form.proposedStart) errors.proposedStart = 'Tanggal mulai wajib diisi.';
    else if (form.proposedStart < getTodayIsoLocal()) errors.proposedStart = 'Tanggal mulai tidak boleh di masa lalu.';
    if (form.proposedEnd && form.proposedStart && form.proposedEnd < form.proposedStart) {
      errors.proposedEnd = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Periksa kolom yang ditandai, lalu kirim ulang.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      let payload = form;
      if (file) {
        const upload = await uploadTenantProposalAttachment(file);
        payload = {
          ...form,
          proposalFileUrl: upload.fileUrl,
          proposalFileName: upload.fileName,
          proposalMimeType: upload.mimeType,
        };
      }
      await submitTenantEventProposal(payload);
      setSubmitted(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === '429') {
        setError('Terlalu banyak pengajuan dari jaringan ini. Tunggu sebentar, lalu kirim ulang.');
      } else if (code === '400' || code === '422') {
        setError('Ada data yang belum sesuai. Periksa kembali kolom yang ditandai, lalu kirim ulang.');
      } else {
        setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-16 pt-10 outline-none sm:px-6">
        <RevealSection as="div">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ajukan event bersama Metropolitan Mall Bekasi
          </h1>
          <p className="mt-3 text-sm leading-7 ui-text-secondary">
            Halaman ini untuk tenant Metropolitan Mall Bekasi yang ingin mengadakan kegiatan di area mall,
            baik sebagai promo, workshop, pameran produk, pertunjukan, maupun peluncuran produk. Isi formulir di bawah,
            tim Marcomm dan Casual Leasing akan meninjau pengajuan kamu.
          </p>
        </RevealSection>

        <RevealSection aria-labelledby="alur-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
          <h2 id="alur-title" className="font-display text-lg font-bold">Alur pengajuan</h2>
          <ol className="mt-3 space-y-3 text-sm ui-text-secondary">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">1</span>
              <span>Kirim pengajuan lewat formulir ini. Lampiran proposal (PDF, Word, atau gambar PNG/JPEG) bersifat opsional bila konsepnya sudah tertulis.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">2</span>
              <span>Tim meninjau kelayakan jadwal, area, dan kebutuhan fasilitas. Bila perlu, kami menghubungi PIC untuk membahas detail.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">3</span>
              <span>Bila disetujui, kami menyusun jadwal bersama dan mengonfirmasi tanggal final secara tertulis. Pengajuan yang masuk belum berarti jadwal terkunci.</span>
            </li>
          </ol>
          <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-card)] bg-[var(--wf-board-2)] p-3 text-xs text-[var(--wf-ink-muted)]">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Siapkan perkiraan tanggal dan area yang diinginkan. Ajukan minimal dua pekan sebelum tanggal rencana agar kami sempat memproses penjadwalan dan perizinan.
          </p>
        </RevealSection>

        {/* Isi formulir sengaja DI LUAR `RevealSection`: wrapper itu memindahkan
            subtree-nya saat tween GSAP mulai, dan pemindahan DOM mencabut fokus
            elemen yang sedang diketik (input tenant kehilangan sisa ketikan di
            lingkungan tes yang menjadwalkan tween di tengah `user.type`).
            Judul tetap dianimasikan. */}
        <section aria-labelledby="form-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
          <RevealSection as="div">
            <h2 id="form-title" className="font-display text-lg font-bold">Formulir pengajuan</h2>
          </RevealSection>

          {submitted ? (
            <div ref={successRef} tabIndex={-1} className="mt-4 flex items-start gap-3 rounded-[var(--radius-card)] bg-emerald-50 p-4 text-sm text-emerald-800 outline-none dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Pengajuan kamu sudah terkirim dan masuk antrean tinjauan tim. Kami akan menghubungi PIC lewat nomor WhatsApp
                yang dicantumkan. Pengajuan ini belum berarti jadwal atau area sudah dikonfirmasi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">Data tenant</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!manualEntry ? (
                    <div className="sm:col-span-2">
                      <Label className={labelClass} htmlFor="tp-tenant">
                        Nama tenant <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <TenantSearchSelect
                        id="tp-tenant"
                        value={selectedTenant?.name || form.tenantName}
                        onChange={(next) => setField('tenantName', next)}
                        onTenantSelect={handleTenantSelect}
                        required
                        error={fieldErrors.tenantName}
                        className={tenantFieldClass}
                      />
                      {selectedTenant && (
                        <div className="mt-2 rounded-[var(--radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2">
                          <p className="text-xs font-semibold text-[var(--wf-ink)]">{selectedTenant.name}</p>
                          <p className="text-[11px] text-[var(--wf-ink-muted)]">
                            {[selectedTenant.category, selectedTenant.floor, selectedTenant.lot && `Lot ${selectedTenant.lot}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => switchEntryMode(true)}
                        className={`${focusRing} mt-2 inline-flex h-auto min-h-11 items-center whitespace-normal! text-xs font-semibold text-[var(--brand-tosca-600)] underline-offset-2 hover:bg-transparent hover:text-[var(--brand-tosca-600)]! hover:underline dark:text-[var(--brand-tosca-soft)] dark:hover:bg-transparent dark:hover:text-[var(--brand-tosca-soft)]! active:translate-y-0!`}
                      >
                        Tenant saya belum ada di daftar
                      </Button>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <Label className={labelClass} htmlFor="tp-tenant-manual">
                        Nama tenant <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <Input
                        id="tp-tenant-manual"
                        className={inputClass}
                        value={form.tenantName}
                        onChange={(e) => setField('tenantName', e.target.value)}
                        maxLength={200}
                        aria-invalid={Boolean(fieldErrors.tenantName)}
                        aria-describedby={fieldErrors.tenantName ? 'tp-tenant-err' : undefined}
                      />
                      {fieldErrors.tenantName && <p id="tp-tenant-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.tenantName}</p>}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => switchEntryMode(false)}
                        className={`${focusRing} mt-2 inline-flex h-auto min-h-11 items-center whitespace-normal! text-xs font-semibold text-[var(--brand-tosca-600)] underline-offset-2 hover:bg-transparent hover:text-[var(--brand-tosca-600)]! hover:underline dark:text-[var(--brand-tosca-soft)] dark:hover:bg-transparent dark:hover:text-[var(--brand-tosca-soft)]! active:translate-y-0!`}
                      >
                        Cari tenant di daftar
                      </Button>
                    </div>
                  )}
                  <div>
                    <Label className={labelClass} htmlFor="tp-unit">Nomor unit atau lot</Label>
                    <Input id="tp-unit" className={inputClass} value={form.unitNumber} onChange={(e) => setField('unitNumber', e.target.value)} maxLength={50} placeholder="Contoh: GF-12" />
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-category">Kategori tenant</Label>
                    <Input id="tp-category" className={inputClass} value={form.tenantCategory} onChange={(e) => setField('tenantCategory', e.target.value)} maxLength={100} placeholder="Contoh: F&amp;B, Fashion" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">PIC yang bisa dihubungi</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className={labelClass} htmlFor="tp-contact">
                      Nama PIC <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input
                      id="tp-contact"
                      className={inputClass}
                      value={form.contactName}
                      onChange={(e) => setField('contactName', e.target.value)}
                      maxLength={100}
                      aria-invalid={Boolean(fieldErrors.contactName)}
                      aria-describedby={fieldErrors.contactName ? 'tp-contact-err' : undefined}
                    />
                    {fieldErrors.contactName && <p id="tp-contact-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.contactName}</p>}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-phone">
                      Nomor WhatsApp <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input
                      id="tp-phone"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? 'tp-phone-err' : undefined}
                    />
                    {fieldErrors.phone && <p id="tp-phone-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="tp-email">Email</Label>
                    <Input
                      id="tp-email"
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'tp-email-err' : undefined}
                    />
                    {fieldErrors.email && <p id="tp-email-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.email}</p>}
                  </div>
                </div>
              </fieldset>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">Rencana event</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="tp-title">
                      Judul event <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input
                      id="tp-title"
                      className={inputClass}
                      value={form.eventTitle}
                      onChange={(e) => setField('eventTitle', e.target.value)}
                      maxLength={200}
                      placeholder="Contoh: Workshop Latte Art untuk Pelanggan"
                      aria-invalid={Boolean(fieldErrors.eventTitle)}
                      aria-describedby={fieldErrors.eventTitle ? 'tp-title-err' : undefined}
                    />
                    {fieldErrors.eventTitle && <p id="tp-title-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.eventTitle}</p>}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-type">Jenis kegiatan</Label>
                    <NativeSelect id="tp-type" className={nativeSelectClass} value={form.eventType} onChange={(e) => setField('eventType', e.target.value as TenantEventProposalType)}>
                      {EVENT_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-visitors">Perkiraan pengunjung</Label>
                    <Input id="tp-visitors" className={inputClass} value={form.expectedVisitors} onChange={(e) => setField('expectedVisitors', e.target.value)} maxLength={100} placeholder="Contoh: 50 orang per sesi" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="tp-desc">
                      Deskripsi kegiatan <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Textarea
                      id="tp-desc"
                      rows={4}
                      className={`${inputClass} inline-block field-sizing-fixed`}
                      value={form.eventDescription}
                      onChange={(e) => setField('eventDescription', e.target.value)}
                      maxLength={4000}
                      placeholder="Jelaskan bentuk kegiatannya, target peserta, dan bagaimana tenant kamu terlibat."
                      aria-invalid={Boolean(fieldErrors.eventDescription)}
                      aria-describedby={fieldErrors.eventDescription ? 'tp-desc-err' : undefined}
                    />
                    {fieldErrors.eventDescription && <p id="tp-desc-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.eventDescription}</p>}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-start">
                      Tanggal mulai <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input
                      id="tp-start"
                      type="date"
                      className={inputClass}
                      value={form.proposedStart}
                      min={getTodayIsoLocal()}
                      onChange={(e) => setField('proposedStart', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.proposedStart)}
                      aria-describedby={fieldErrors.proposedStart ? 'tp-start-err' : undefined}
                    />
                    {fieldErrors.proposedStart && <p id="tp-start-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.proposedStart}</p>}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-end">Tanggal selesai</Label>
                    <Input
                      id="tp-end"
                      type="date"
                      className={inputClass}
                      value={form.proposedEnd}
                      min={form.proposedStart || getTodayIsoLocal()}
                      onChange={(e) => setField('proposedEnd', e.target.value)}
                      aria-describedby={fieldErrors.proposedEnd ? 'tp-end-err' : 'tp-end-hint'}
                    />
                    {fieldErrors.proposedEnd
                      ? <p id="tp-end-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.proposedEnd}</p>
                      : <p id="tp-end-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Kosongkan bila kegiatan hanya sehari.</p>}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-area">Area yang diinginkan</Label>
                    {areaOptions.length > 0 ? (
                      <NativeSelect id="tp-area" className={nativeSelectClass} value={form.preferredArea} onChange={(e) => setField('preferredArea', e.target.value)}>
                        <option value="">Belum ditentukan</option>
                        {areaOptions.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <Input id="tp-area" className={inputClass} value={form.preferredArea} onChange={(e) => setField('preferredArea', e.target.value)} maxLength={200} placeholder="Contoh: Main Atrium" />
                    )}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-needs">Kebutuhan fasilitas</Label>
                    <Input id="tp-needs" className={inputClass} value={form.needs} onChange={(e) => setField('needs', e.target.value)} maxLength={2000} placeholder="Contoh: meja, kursi, listrik, sound" />
                  </div>
                </div>
              </fieldset>

              <div className="sm:col-span-2">
                <Label className={labelClass} htmlFor="tp-file">Lampiran proposal (opsional)</Label>
                <input id="tp-file" type="file" accept={ATTACHMENT_ACCEPT} className="sr-only" tabIndex={-1} onChange={handleFileChange} />
                {file ? (
                  <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-[var(--brand-tosca)]" aria-hidden="true" />
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="shrink-0 text-xs text-[var(--wf-ink-muted)]">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFile(null)}
                      className={`${focusRing} h-auto shrink-0 rounded-full! p-1.5! text-[var(--wf-ink-muted)] transition hover:bg-transparent hover:text-[var(--wf-ink)]! dark:hover:bg-transparent active:translate-y-0!`}
                      aria-label="Hapus lampiran"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => document.getElementById('tp-file')?.click()}
                    className={`${focusRing} flex h-auto w-full items-center justify-start gap-2 whitespace-normal! rounded-[var(--radius-control)]! border border-dashed border-[var(--wf-rule-control)]! bg-[var(--wf-board-2)] px-4 py-3 text-sm text-[var(--wf-ink-muted)] transition hover:border-[var(--brand-tosca)]! hover:bg-transparent hover:text-[var(--wf-ink)]! focus-visible:border-[var(--wf-rule-control)]! dark:hover:bg-transparent active:translate-y-0!`}
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                    Pilih berkas proposal (PDF, Word, PNG, atau JPEG, maksimal 20MB)
                  </Button>
                )}
              </div>

              {error && (
                <p role="alert" className="sm:col-span-2 text-sm text-rose-700 dark:text-rose-400">{error}</p>
              )}

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={submitting}
                  className={`${focusRing} inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`}
                >
                  {submitting ? <Send className="size-4" aria-hidden="true" /> : <Handshake className="size-4" aria-hidden="true" />}
                  {submitting ? 'Mengirim…' : 'Kirim pengajuan'}
                </Button>
                <p className="mt-2 text-xs text-[var(--wf-ink-muted)]">
                  Data kontak hanya dipakai tim Metropolitan Mall Bekasi untuk menindaklanjuti pengajuan ini.
                </p>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="border-t border-[var(--wf-rule)] py-8 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
