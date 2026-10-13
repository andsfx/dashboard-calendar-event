import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, FileText, Handshake, Moon, Paperclip, Send, SunMedium, X,
} from 'lucide-react';
import type { TenantEventProposalInput, TenantEventProposalType } from '../types';
import { fetchEventAreas, submitTenantEventProposal, uploadTenantProposalAttachment } from '../utils/domainApi';
import { getTodayIsoLocal } from '../utils/eventDateTime';
import { validateEmail, validatePhone } from '../utils/validation';
import { usePageMeta } from '../utils/pageMeta';
import { ApiError } from '../lib/rest';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

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

/** Selaras dengan zod server: lampiran hanya dokumen, maksimal 20MB. */
const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const EMPTY_FORM: TenantEventProposalInput = {
  tenantName: '', unitNumber: '', tenantCategory: '',
  contactName: '', phone: '', email: '',
  eventTitle: '', eventType: 'promo', eventDescription: '',
  proposedStart: '', proposedEnd: '', preferredArea: '', expectedVisitors: '', needs: '',
  proposalFileUrl: '', proposalFileName: '', proposalMimeType: '',
};

const inputClass = 'w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';
const focusRing = 'ui-focus-ring';

export function TenantCollaborationPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Kolaborasi Tenant - Metropolitan Mall Bekasi',
    description: 'Ajukan event kerja sama gerai Anda di Metropolitan Mall Bekasi: promo, workshop, pameran produk, hingga pertunjukan. Lampirkan proposal bila sudah siap.',
  });

  const [form, setForm] = useState<TenantEventProposalInput>({ ...EMPTY_FORM });
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    setError('');
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) { setFile(null); return; }
    const extension = picked.name.split('.').pop()?.toLowerCase() || '';
    if (!ATTACHMENT_MIME.includes(picked.type) || !['pdf', 'doc', 'docx'].includes(extension)) {
      setFile(null);
      setError('Lampiran harus PDF atau Word (DOC/DOCX).');
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

    if (form.tenantName.trim().length < 2) errors.tenantName = 'Nama gerai minimal 2 karakter.';
    if (form.contactName.trim().length < 3) errors.contactName = 'Nama PIC minimal 3 karakter.';
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error || 'Nomor WhatsApp tidak valid.';
    if (form.email.trim()) {
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) errors.email = emailCheck.error || 'Format email tidak valid.';
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
    <div className="ui-dashboard-page min-h-screen bg-[var(--brand-paper)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Kolaborasi Tenant</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/" className={`${focusRing} inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-[var(--brand-tosca)] dark:text-slate-300`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Beranda
            </Link>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
              className={`${focusRing} rounded-lg border border-slate-200 p-2 dark:border-slate-600`}
            >
              {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-16 pt-10 outline-none sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Gelar Event Bersama Metropolitan Mall Bekasi
        </h1>
        <p className="mt-3 text-sm leading-7 ui-text-secondary">
          Halaman ini untuk gerai dan tenant Metropolitan Mall Bekasi yang ingin mengadakan kegiatan di area mall,
          baik sebagai promo, workshop, pameran produk, pertunjukan, maupun peluncuran produk. Isi formulir di bawah,
          tim Marcomm dan Casual Leasing akan meninjau pengajuan Anda.
        </p>

        <section aria-labelledby="alur-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 id="alur-title" className="font-display text-lg font-bold">Alur pengajuan</h2>
          <ol className="mt-3 space-y-3 text-sm ui-text-secondary">
            <li className="flex gap-3">
              <span className="wf-code shrink-0">1</span>
              <span>Kirim pengajuan lewat formulir ini. Lampiran proposal (PDF atau Word) bersifat opsional bila konsepnya sudah tertulis.</span>
            </li>
            <li className="flex gap-3">
              <span className="wf-code shrink-0">2</span>
              <span>Tim meninjau kelayakan jadwal, area, dan kebutuhan fasilitas. Bila perlu, kami menghubungi PIC untuk pendalaman.</span>
            </li>
            <li className="flex gap-3">
              <span className="wf-code shrink-0">3</span>
              <span>Bila disetujui, jadwal event disusun bersama dan tanggal final dikonfirmasi tertulis. Pengajuan yang masuk belum berarti jadwal terkunci.</span>
            </li>
          </ol>
          <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-card)] bg-slate-50 p-3 text-xs ui-text-muted dark:bg-slate-800/60">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Siapkan perkiraan tanggal dan area yang diinginkan. Ajukan minimal dua pekan sebelum tanggal rencana agar penjadwalan dan perizinan sempat diproses.
          </p>
        </section>

        <section aria-labelledby="form-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 id="form-title" className="font-display text-lg font-bold">Formulir pengajuan</h2>

          {submitted ? (
            <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-card)] bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Pengajuan Anda sudah terkirim dan masuk antrean tinjauan tim. Kami akan menghubungi PIC lewat nomor WhatsApp
                yang dicantumkan. Pengajuan ini belum berarti jadwal atau area sudah dikonfirmasi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Data gerai</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="tp-tenant">
                      Nama gerai <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input
                      id="tp-tenant"
                      className={inputClass}
                      value={form.tenantName}
                      onChange={(e) => setField('tenantName', e.target.value)}
                      maxLength={200}
                      aria-invalid={Boolean(fieldErrors.tenantName)}
                      aria-describedby={fieldErrors.tenantName ? 'tp-tenant-err' : undefined}
                    />
                    {fieldErrors.tenantName && <p id="tp-tenant-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.tenantName}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-unit">Nomor unit atau lot</label>
                    <input id="tp-unit" className={inputClass} value={form.unitNumber} onChange={(e) => setField('unitNumber', e.target.value)} maxLength={50} placeholder="Contoh: GF-12" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-category">Kategori gerai</label>
                    <input id="tp-category" className={inputClass} value={form.tenantCategory} onChange={(e) => setField('tenantCategory', e.target.value)} maxLength={100} placeholder="Contoh: F&amp;B, Fashion" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">PIC yang bisa dihubungi</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="tp-contact">
                      Nama PIC <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input
                      id="tp-contact"
                      className={inputClass}
                      value={form.contactName}
                      onChange={(e) => setField('contactName', e.target.value)}
                      maxLength={100}
                      aria-invalid={Boolean(fieldErrors.contactName)}
                      aria-describedby={fieldErrors.contactName ? 'tp-contact-err' : undefined}
                    />
                    {fieldErrors.contactName && <p id="tp-contact-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.contactName}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-phone">
                      Nomor WhatsApp <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input
                      id="tp-phone"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? 'tp-phone-err' : undefined}
                    />
                    {fieldErrors.phone && <p id="tp-phone-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="tp-email">Email</label>
                    <input
                      id="tp-email"
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'tp-email-err' : undefined}
                    />
                    {fieldErrors.email && <p id="tp-email-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
                  </div>
                </div>
              </fieldset>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Rencana event</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="tp-title">
                      Judul event <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input
                      id="tp-title"
                      className={inputClass}
                      value={form.eventTitle}
                      onChange={(e) => setField('eventTitle', e.target.value)}
                      maxLength={200}
                      placeholder="Contoh: Workshop Latte Art untuk Pelanggan"
                      aria-invalid={Boolean(fieldErrors.eventTitle)}
                      aria-describedby={fieldErrors.eventTitle ? 'tp-title-err' : undefined}
                    />
                    {fieldErrors.eventTitle && <p id="tp-title-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.eventTitle}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-type">Jenis kegiatan</label>
                    <select id="tp-type" className={inputClass} value={form.eventType} onChange={(e) => setField('eventType', e.target.value as TenantEventProposalType)}>
                      {EVENT_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-visitors">Perkiraan pengunjung</label>
                    <input id="tp-visitors" className={inputClass} value={form.expectedVisitors} onChange={(e) => setField('expectedVisitors', e.target.value)} maxLength={100} placeholder="Contoh: 50 orang per sesi" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="tp-desc">
                      Deskripsi kegiatan <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <textarea
                      id="tp-desc"
                      rows={4}
                      className={inputClass}
                      value={form.eventDescription}
                      onChange={(e) => setField('eventDescription', e.target.value)}
                      maxLength={4000}
                      placeholder="Jelaskan bentuk kegiatannya, target peserta, dan bagaimana gerai Anda terlibat."
                      aria-invalid={Boolean(fieldErrors.eventDescription)}
                      aria-describedby={fieldErrors.eventDescription ? 'tp-desc-err' : undefined}
                    />
                    {fieldErrors.eventDescription && <p id="tp-desc-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.eventDescription}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-start">
                      Tanggal mulai <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input
                      id="tp-start"
                      type="date"
                      className={inputClass}
                      value={form.proposedStart}
                      min={getTodayIsoLocal()}
                      onChange={(e) => setField('proposedStart', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.proposedStart)}
                      aria-describedby={fieldErrors.proposedStart ? 'tp-start-err' : undefined}
                    />
                    {fieldErrors.proposedStart && <p id="tp-start-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.proposedStart}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-end">Tanggal selesai</label>
                    <input
                      id="tp-end"
                      type="date"
                      className={inputClass}
                      value={form.proposedEnd}
                      min={form.proposedStart || getTodayIsoLocal()}
                      onChange={(e) => setField('proposedEnd', e.target.value)}
                      aria-describedby={fieldErrors.proposedEnd ? 'tp-end-err' : 'tp-end-hint'}
                    />
                    {fieldErrors.proposedEnd
                      ? <p id="tp-end-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.proposedEnd}</p>
                      : <p id="tp-end-hint" className="mt-1 text-xs ui-text-muted">Kosongkan bila kegiatan hanya sehari.</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-area">Area yang diinginkan</label>
                    {areaOptions.length > 0 ? (
                      <select id="tp-area" className={inputClass} value={form.preferredArea} onChange={(e) => setField('preferredArea', e.target.value)}>
                        <option value="">Belum ditentukan</option>
                        {areaOptions.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <input id="tp-area" className={inputClass} value={form.preferredArea} onChange={(e) => setField('preferredArea', e.target.value)} maxLength={200} placeholder="Contoh: Main Atrium" />
                    )}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-needs">Kebutuhan fasilitas</label>
                    <input id="tp-needs" className={inputClass} value={form.needs} onChange={(e) => setField('needs', e.target.value)} maxLength={2000} placeholder="Contoh: meja, kursi, listrik, sound" />
                  </div>
                </div>
              </fieldset>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="tp-file">Lampiran proposal (opsional)</label>
                <input id="tp-file" type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={handleFileChange} />
                {file ? (
                  <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-[var(--brand-tosca)]" aria-hidden="true" />
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="shrink-0 text-xs ui-text-muted">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className={`${focusRing} shrink-0 rounded-full p-1.5 text-slate-500 transition hover:text-slate-800 dark:hover:text-white`}
                      aria-label="Hapus lampiran"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => document.getElementById('tp-file')?.click()}
                    className={`${focusRing} flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 transition hover:border-[var(--brand-tosca)] hover:text-slate-800 dark:border-slate-500 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:text-white`}
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                    Pilih berkas proposal (PDF atau Word, maksimal 20MB)
                  </button>
                )}
              </div>

              {error && (
                <p role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${focusRing} inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-60`}
                >
                  {submitting ? <Send className="h-4 w-4" aria-hidden="true" /> : <Handshake className="h-4 w-4" aria-hidden="true" />}
                  {submitting ? 'Mengirim…' : 'Kirim Pengajuan'}
                </button>
                <p className="mt-2 text-xs ui-text-muted">
                  Data kontak hanya dipakai tim Metropolitan Mall Bekasi untuk menindaklanjuti pengajuan ini.
                </p>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs ui-text-muted dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
