import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Copy, Check, MapPin, Moon, Search, Send, Store, SunMedium, Tag,
} from 'lucide-react';
import type {
  TenantParticipationEligibleEvent,
  TenantParticipationInput,
  TenantParticipationKind,
  TenantParticipationStatus,
  TenantParticipationStatusResult,
  TenantParticipationVoucherFormat,
  TenantParticipationVoucherType,
} from '../types';
import {
  fetchEventAreas,
  fetchTenantParticipationEvents,
  fetchTenantParticipationStatus,
  submitTenantParticipation,
} from '../utils/domainApi';
import { TenantSearchSelect } from '../components/survey/TenantSurveyShared';
import type { TenantDropdownOption } from '../utils/domainApi';
import { validateEmail, validatePhone } from '../utils/validation';
import { usePageMeta } from '../utils/pageMeta';
import { formatDateRange } from '../utils/eventUtils';
import { ApiError } from '../lib/rest';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const KIND_OPTIONS: { value: TenantParticipationKind; label: string; hint: string }[] = [
  { value: 'booth', label: 'Open booth', hint: 'Berjualan atau promosi di area event' },
  { value: 'voucher', label: 'Voucher', hint: 'Diskon atau penawaran khusus untuk pengunjung event' },
  { value: 'both', label: 'Keduanya', hint: 'Booth sekaligus voucher untuk event yang sama' },
];

const VOUCHER_TYPES: { value: TenantParticipationVoucherType; label: string }[] = [
  { value: 'discount_percent', label: 'Diskon persentase (mis. 20%)' },
  { value: 'discount_amount', label: 'Potongan harga tetap (mis. Rp20.000)' },
  { value: 'buy1get1', label: 'Beli 1 gratis 1' },
  { value: 'free_item', label: 'Gratis item atau tambahan' },
  { value: 'min_spend', label: 'Diskon minimum belanja' },
  { value: 'other', label: 'Lainnya' },
];

const VOUCHER_FORMATS: { value: TenantParticipationVoucherFormat; label: string }[] = [
  { value: 'digital', label: 'Digital (kode atau QR dari tenant)' },
  { value: 'fisik', label: 'Fisik (kupon cetak)' },
  { value: 'both', label: 'Digital dan fisik' },
];

const SCHEME_OPTIONS: { value: TenantParticipationInput['boothScheme']; label: string }[] = [
  { value: 'solo', label: 'Booth sendiri' },
  { value: 'joint', label: 'Gabungan beberapa tenant' },
  { value: 'mall_support', label: 'Butuh dukungan mall (meja, listrik, dsb.)' },
];

const STATUS_LABELS: Record<TenantParticipationStatus, string> = {
  pending: 'Menunggu tinjauan',
  contacted: 'Sedang dihubungi tim',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

/** Nada status di panel cek — satu kelas per status, bukan warna acak. */
const STATUS_TONE: Record<TenantParticipationStatus, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  contacted: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  rejected: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
};

const EMPTY_FORM: TenantParticipationInput = {
  tenantId: '',
  tenantName: '', unitNumber: '', tenantCategory: '', tenantLogo: '',
  contactName: '', phone: '', email: '',
  eventId: '', kind: 'both',
  boothArea: '', boothStart: '', boothEnd: '', boothSize: '', boothProducts: '', boothScheme: 'solo', boothNeeds: '',
  voucherType: 'discount_percent', voucherTerms: '', voucherQuota: '', voucherFormat: 'both',
};

const inputClass = 'w-full rounded-[var(--radius-control)] border border-slate-400 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-300';
const tenantFieldClass = 'rounded-md border-slate-400 py-3 dark:border-slate-400 dark:bg-slate-800 dark:placeholder:text-slate-300';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';
const focusRing = 'ui-focus-ring';

/** Label tanggal dari date_str/date_end event — pakai util tanggal yang sudah ada. */
function eventDateLabel(event: TenantParticipationEligibleEvent): string {
  return formatDateRange(event.dateStr, event.dateEnd || event.dateStr);
}

export function TenantParticipationPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Partisipasi Tenant - Metropolitan Mall Bekasi',
    description: 'Ajukan open booth atau voucher tenant Anda untuk event di Metropolitan Mall Bekasi. Pantau status pengajuan dengan kode pengajuan.',
  });

  const [searchParams] = useSearchParams();
  const preselectedEventId = (searchParams.get('event') || '').trim();

  const [form, setForm] = useState<TenantParticipationInput>({ ...EMPTY_FORM });
  const [events, setEvents] = useState<TenantParticipationEligibleEvent[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantDropdownOption | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [autoFilled, setAutoFilled] = useState({ unitNumber: false, tenantCategory: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** Kode pengajuan hasil submit — ditampilkan sekali; null = form masih tampil. */
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const successRef = useRef<HTMLDivElement | null>(null);

  // Panel cek status
  const [statusCode, setStatusCode] = useState('');
  const [statusPhone, setStatusPhone] = useState('');
  const [statusChecking, setStatusChecking] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusResult, setStatusResult] = useState<TenantParticipationStatusResult | null>(null);

  useEffect(() => {
    if (submittedCode) successRef.current?.focus();
  }, [submittedCode]);

  // Daftar event eligible (published + belum mulai). Gagal memuat = form tidak
  // bisa dikirim (event wajib), jadi keadaan itu ditampilkan jelas — bukan
  // dropdown kosong tanpa alasan.
  useEffect(() => {
    let cancelled = false;
    fetchTenantParticipationEvents()
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows);
        setEventsFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setEventsFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Daftar area kanonis untuk pilihan lokasi booth; gagal = input teks bebas.
  useEffect(() => {
    let cancelled = false;
    fetchEventAreas()
      .then((areas) => { if (!cancelled) setAreaOptions(areas.map((area) => area.name).filter(Boolean)); })
      .catch(() => { if (!cancelled) setAreaOptions([]); });
    return () => { cancelled = true; };
  }, []);

  // Event dari CTA halaman detail (`?event=`) dipilih otomatis bila masih eligible.
  useEffect(() => {
    if (!preselectedEventId || events.length === 0) return;
    const match = events.find((ev) => ev.id === preselectedEventId);
    if (!match) return;
    setForm((prev) => {
      if (prev.eventId) return prev;
      return { ...prev, eventId: match.id, boothStart: prev.boothStart || match.dateStr, boothEnd: prev.boothEnd || (match.dateEnd || match.dateStr) };
    });
  }, [preselectedEventId, events]);

  const selectedEvent = useMemo(
    () => events.find((ev) => ev.id === form.eventId) ?? null,
    [events, form.eventId],
  );

  const setField = <K extends keyof TenantParticipationInput>(key: K, value: TenantParticipationInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  /** Pilih event → periode booth mengikuti rentang tanggal event (bisa disunting). */
  const handleEventSelect = (eventId: string) => {
    const match = events.find((ev) => ev.id === eventId) ?? null;
    setForm((prev) => ({
      ...prev,
      eventId,
      boothStart: match ? match.dateStr : prev.boothStart,
      boothEnd: match ? (match.dateEnd || match.dateStr) : prev.boothEnd,
    }));
    setError('');
    setFieldErrors((prev) => {
      if (!prev.eventId) return prev;
      const next = { ...prev };
      delete next.eventId;
      return next;
    });
  };

  const handleTenantSelect = (tenant: TenantDropdownOption | null) => {
    setSelectedTenant(tenant);
    setForm((prev) => {
      if (!tenant) {
        return {
          ...prev,
          tenantId: '',
          unitNumber: autoFilled.unitNumber ? '' : prev.unitNumber,
          tenantCategory: autoFilled.tenantCategory ? '' : prev.tenantCategory,
          tenantLogo: '',
        };
      }
      return {
        ...prev,
        tenantId: tenant.id,
        tenantName: tenant.name,
        unitNumber: tenant.lot,
        tenantCategory: tenant.category,
        tenantLogo: tenant.logo || '',
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
      unitNumber: autoFilled.unitNumber ? '' : prev.unitNumber,
      tenantCategory: autoFilled.tenantCategory ? '' : prev.tenantCategory,
      tenantLogo: '',
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

  const includeBooth = form.kind !== 'voucher';
  const includeVoucher = form.kind !== 'booth';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!form.eventId) errors.eventId = 'Pilih event tujuan pengajuan.';
    if (!manualEntry && !selectedTenant) errors.tenantName = 'Pilih tenant dari daftar, atau isi manual.';
    else if (form.tenantName.trim().length < 2) errors.tenantName = 'Nama tenant minimal 2 karakter.';
    if (form.contactName.trim().length < 3) errors.contactName = 'Nama PIC minimal 3 karakter.';
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error || 'Nomor WhatsApp tidak valid.';
    if (form.email.trim()) {
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) errors.email = emailCheck.error || 'Format email tidak valid.';
    }
    if (includeBooth) {
      if (!form.boothArea.trim()) errors.boothArea = 'Area booth wajib diisi.';
      if (!form.boothStart) errors.boothStart = 'Tanggal mulai booth wajib diisi.';
      if (form.boothEnd && form.boothStart && form.boothEnd < form.boothStart) {
        errors.boothEnd = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
      }
      if (!form.boothProducts.trim()) errors.boothProducts = 'Produk atau jasa yang dijual wajib diisi.';
    }
    if (includeVoucher && !form.voucherTerms.trim()) {
      errors.voucherTerms = 'Ketentuan voucher wajib diisi.';
    }
    if (form.voucherQuota !== '' && includeVoucher) {
      if (!Number.isInteger(form.voucherQuota) || form.voucherQuota < 0) errors.voucherQuota = 'Kuota harus bilangan bulat 0 atau lebih.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Periksa kolom yang ditandai, lalu kirim ulang.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const code = await submitTenantParticipation(form);
      setSubmittedCode(code);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === '429') {
        setError('Terlalu banyak pengajuan dari jaringan ini. Tunggu sebentar, lalu kirim ulang.');
      } else if (code === '400' || code === '422') {
        setError(err instanceof Error ? err.message : 'Ada data yang belum sesuai. Periksa kembali lalu kirim ulang.');
      } else {
        setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (statusCode.trim().length < 4 || statusPhone.trim().length < 8) {
      setStatusError('Isi kode pengajuan dan nomor telepon yang dipakai saat mengajukan.');
      setStatusResult(null);
      return;
    }
    setStatusChecking(true);
    setStatusError('');
    setStatusResult(null);
    try {
      const result = await fetchTenantParticipationStatus(statusCode.trim(), statusPhone.trim());
      if (!result) {
        setStatusError('Pengajuan tidak ditemukan. Periksa kembali kode dan nomor teleponnya.');
      } else {
        setStatusResult(result);
      }
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Gagal memeriksa status. Coba lagi.');
    } finally {
      setStatusChecking(false);
    }
  };

  const handleCopyCode = async () => {
    if (!submittedCode) return;
    try {
      await navigator.clipboard.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard bisa ditolak browser — kode tetap terbaca di layar */ }
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
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Partisipasi Tenant</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/" className={`${focusRing} inline-flex min-h-11 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-[var(--brand-tosca-600)] dark:text-slate-300 dark:hover:text-[var(--brand-tosca-soft)]`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Beranda
            </Link>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
              className={`${focusRing} inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600`}
            >
              {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-16 pt-10 outline-none sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Ikut Event sebagai Tenant
        </h1>
        <p className="mt-3 text-sm leading-7 ui-text-secondary">
          Ajukan <strong>open booth</strong> untuk berjualan atau promosi di area event, dan/atau{' '}
          <strong>voucher</strong> untuk menarik pengunjung datang ke tenant Anda. Pengajuan ditinjau tim Marcomm;
          yang disetujui tampil di halaman detail event.
        </p>

        <section aria-labelledby="alur-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 id="alur-title" className="font-display text-lg font-bold">Alur pengajuan</h2>
          <ol className="mt-3 space-y-3 text-sm ui-text-secondary">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">1</span>
              <span>Pilih event yang belum berjalan, lalu isi data booth dan/atau voucher. Pengajuan ditutup paling lambat sehari sebelum event mulai.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">2</span>
              <span>Tim Marcomm meninjau kelayakan. Simpan <strong>kode pengajuan</strong> yang muncul setelah kirim untuk memantau status.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">3</span>
              <span>Bila disetujui, booth dan voucher Anda tampil di halaman event dan tim menghubungi PIC lewat nomor yang dicantumkan.</span>
            </li>
          </ol>
        </section>

        <section aria-labelledby="form-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 id="form-title" className="font-display text-lg font-bold">Formulir pengajuan</h2>

          {submittedCode ? (
            <div ref={successRef} tabIndex={-1} className="mt-4 rounded-[var(--radius-card)] bg-emerald-50 p-4 text-sm text-emerald-900 outline-none dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  Pengajuan Anda sudah terkirim dan masuk antrean tinjauan tim. Simpan kode pengajuan ini —
                  Anda butuh kode dan nomor telepon untuk memantau statusnya.
                </span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[var(--radius-control)] border border-emerald-300 bg-white px-4 py-2 font-mono text-base font-bold tracking-wider text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100">
                  {submittedCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`${focusRing} inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/60`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? 'Kode tersalin' : 'Salin kode'}
                </button>
              </div>
              <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-300">
                Pantau statusnya di panel “Cek status pengajuan” di bawah, atau ajukan partisipasi lain untuk event berbeda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmittedCode(null);
                  setForm({ ...EMPTY_FORM });
                  setSelectedTenant(null);
                  setManualEntry(false);
                  setAutoFilled({ unitNumber: false, tenantCategory: false });
                  setCopied(false);
                }}
                className={`${focusRing} mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200`}
              >
                Ajukan partisipasi lagi
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
              {/* ── Event tujuan ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Event tujuan</legend>
                {eventsFailed ? (
                  <p role="alert" className="rounded-[var(--radius-control)] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    Gagal memuat daftar event. Muat ulang halaman ini untuk mencoba lagi.
                  </p>
                ) : events.length === 0 ? (
                  <p className="rounded-[var(--radius-control)] border border-slate-300 bg-slate-50 px-4 py-3 text-sm ui-text-secondary dark:border-slate-600 dark:bg-slate-800">
                    Belum ada event yang bisa diajukan saat ini. Pengajuan dibuka untuk event yang belum berjalan
                    dan ditutup paling lambat sehari sebelum event mulai.
                  </p>
                ) : (
                  <>
                    <label className={labelClass} htmlFor="tp-event">
                      Pilih event <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <select
                      id="tp-event"
                      className={inputClass}
                      value={form.eventId}
                      onChange={(e) => handleEventSelect(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.eventId)}
                      aria-describedby={fieldErrors.eventId ? 'tp-event-err' : 'tp-event-hint'}
                    >
                      <option value="">Pilih event…</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.acara} — {eventDateLabel(ev)}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.eventId
                      ? <p id="tp-event-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.eventId}</p>
                      : <p id="tp-event-hint" className="mt-1 text-xs ui-text-muted">Hanya event yang belum mulai yang bisa dipilih (pengajuan ditutup H-1).</p>}
                    {selectedEvent && (
                      <div className="mt-2 rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-200">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {eventDateLabel(selectedEvent)}
                          </span>
                          {selectedEvent.lokasi && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              {selectedEvent.lokasi}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </fieldset>

              {/* ── Jenis partisipasi ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                  Jenis partisipasi <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {KIND_OPTIONS.map((option) => {
                    const selected = form.kind === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-tosca)] ${
                          selected
                            ? 'border-brand-primary-400 bg-brand-primary-50 dark:border-brand-primary-500 dark:bg-brand-primary-950/40'
                            : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="kind"
                          value={option.value}
                          checked={selected}
                          onChange={() => setField('kind', option.value)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-tosca-600)]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-white">{option.label}</span>
                          <span className="mt-0.5 block text-xs ui-text-muted">{option.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* ── Data tenant ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Data tenant</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!manualEntry ? (
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="tp-tenant">
                        Nama tenant <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </label>
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
                        <div className="mt-2 rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                          <p className="text-xs font-semibold text-slate-800 dark:text-white">{selectedTenant.name}</p>
                          <p className="text-[11px] ui-text-muted">
                            {[selectedTenant.category, selectedTenant.floor, selectedTenant.lot && `Lot ${selectedTenant.lot}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => switchEntryMode(true)}
                        className={`${focusRing} mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--brand-tosca-600)] underline-offset-2 hover:underline dark:text-[var(--brand-tosca-soft)]`}
                      >
                        Tenant saya belum ada di daftar
                      </button>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="tp-tenant-manual">
                        Nama tenant <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </label>
                      <input
                        id="tp-tenant-manual"
                        className={inputClass}
                        value={form.tenantName}
                        onChange={(e) => setField('tenantName', e.target.value)}
                        maxLength={200}
                        aria-invalid={Boolean(fieldErrors.tenantName)}
                        aria-describedby={fieldErrors.tenantName ? 'tp-tenant-err' : undefined}
                      />
                      {fieldErrors.tenantName && <p id="tp-tenant-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.tenantName}</p>}
                      <button
                        type="button"
                        onClick={() => switchEntryMode(false)}
                        className={`${focusRing} mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--brand-tosca-600)] underline-offset-2 hover:underline dark:text-[var(--brand-tosca-soft)]`}
                      >
                        Cari tenant di daftar
                      </button>
                    </div>
                  )}
                  <div>
                    <label className={labelClass} htmlFor="tp-unit">Nomor unit atau lot</label>
                    <input id="tp-unit" className={inputClass} value={form.unitNumber} onChange={(e) => setField('unitNumber', e.target.value)} maxLength={50} placeholder="Contoh: GF-12" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-category">Kategori tenant</label>
                    <input id="tp-category" className={inputClass} value={form.tenantCategory} onChange={(e) => setField('tenantCategory', e.target.value)} maxLength={100} placeholder="Contoh: F&amp;B, Fashion" />
                  </div>
                </div>
              </fieldset>

              {/* ── PIC ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">PIC yang bisa dihubungi</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="tp-contact">
                      Nama PIC <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
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
                    {fieldErrors.contactName && <p id="tp-contact-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.contactName}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tp-phone">
                      Nomor WhatsApp <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input
                      id="tp-phone"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? 'tp-phone-err' : 'tp-phone-hint'}
                    />
                    {fieldErrors.phone
                      ? <p id="tp-phone-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.phone}</p>
                      : <p id="tp-phone-hint" className="mt-1 text-xs ui-text-muted">Nomor ini juga dipakai untuk cek status pengajuan.</p>}
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
                    {fieldErrors.email && <p id="tp-email-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.email}</p>}
                  </div>
                </div>
              </fieldset>

              {/* ── Booth ── */}
              {includeBooth && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    <Store className="h-3.5 w-3.5" aria-hidden="true" /> Data booth
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="tp-booth-area">
                        Area yang diminta <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </label>
                      {areaOptions.length > 0 ? (
                        <select
                          id="tp-booth-area"
                          className={inputClass}
                          value={form.boothArea}
                          onChange={(e) => setField('boothArea', e.target.value)}
                          aria-invalid={Boolean(fieldErrors.boothArea)}
                          aria-describedby={fieldErrors.boothArea ? 'tp-booth-area-err' : undefined}
                        >
                          <option value="">Pilih area…</option>
                          {areaOptions.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id="tp-booth-area"
                          className={inputClass}
                          value={form.boothArea}
                          onChange={(e) => setField('boothArea', e.target.value)}
                          maxLength={200}
                          placeholder="Contoh: Main Atrium"
                          aria-invalid={Boolean(fieldErrors.boothArea)}
                          aria-describedby={fieldErrors.boothArea ? 'tp-booth-area-err' : undefined}
                        />
                      )}
                      {fieldErrors.boothArea && <p id="tp-booth-area-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothArea}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-booth-size">Ukuran booth yang dibutuhkan</label>
                      <input id="tp-booth-size" className={inputClass} value={form.boothSize} onChange={(e) => setField('boothSize', e.target.value)} maxLength={100} placeholder="Contoh: 2×2 m" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-booth-start">
                        Mulai booth <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </label>
                      <input
                        id="tp-booth-start"
                        type="date"
                        className={inputClass}
                        value={form.boothStart}
                        onChange={(e) => setField('boothStart', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.boothStart)}
                        aria-describedby={fieldErrors.boothStart ? 'tp-booth-start-err' : undefined}
                      />
                      {fieldErrors.boothStart && <p id="tp-booth-start-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothStart}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-booth-end">Selesai booth</label>
                      <input
                        id="tp-booth-end"
                        type="date"
                        className={inputClass}
                        value={form.boothEnd}
                        min={form.boothStart || undefined}
                        onChange={(e) => setField('boothEnd', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.boothEnd)}
                        aria-describedby={fieldErrors.boothEnd ? 'tp-booth-end-err' : 'tp-booth-end-hint'}
                      />
                      {fieldErrors.boothEnd
                        ? <p id="tp-booth-end-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothEnd}</p>
                        : <p id="tp-booth-end-hint" className="mt-1 text-xs ui-text-muted">Terisi otomatis dari tanggal event; sesuaikan bila perlu.</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="tp-booth-products">
                        Produk atau jasa yang dijual <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </label>
                      <textarea
                        id="tp-booth-products"
                        rows={2}
                        className={inputClass}
                        value={form.boothProducts}
                        onChange={(e) => setField('boothProducts', e.target.value)}
                        maxLength={1000}
                        placeholder="Contoh: aneka kopi kemasan 200gr dan merchandise"
                        aria-invalid={Boolean(fieldErrors.boothProducts)}
                        aria-describedby={fieldErrors.boothProducts ? 'tp-booth-products-err' : undefined}
                      />
                      {fieldErrors.boothProducts && <p id="tp-booth-products-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothProducts}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-booth-scheme">Skema booth</label>
                      <select id="tp-booth-scheme" className={inputClass} value={form.boothScheme} onChange={(e) => setField('boothScheme', e.target.value as TenantParticipationInput['boothScheme'])}>
                        {SCHEME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-booth-needs">Kebutuhan fasilitas</label>
                      <input id="tp-booth-needs" className={inputClass} value={form.boothNeeds} onChange={(e) => setField('boothNeeds', e.target.value)} maxLength={2000} placeholder="Contoh: listrik 1 titik, 2 meja" />
                    </div>
                  </div>
                </fieldset>
              )}

              {/* ── Voucher ── */}
              {includeVoucher && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Data voucher
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="tp-voucher-type">Jenis voucher</label>
                      <select id="tp-voucher-type" className={inputClass} value={form.voucherType} onChange={(e) => setField('voucherType', e.target.value as TenantParticipationVoucherType)}>
                        {VOUCHER_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-voucher-format">Format voucher</label>
                      <select id="tp-voucher-format" className={inputClass} value={form.voucherFormat} onChange={(e) => setField('voucherFormat', e.target.value as TenantParticipationVoucherFormat)}>
                        {VOUCHER_FORMATS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="tp-voucher-quota">Kuota voucher (opsional)</label>
                      <input
                        id="tp-voucher-quota"
                        type="number"
                        min={0}
                        max={100000}
                        className={inputClass}
                        value={form.voucherQuota === '' ? '' : String(form.voucherQuota)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setField('voucherQuota', raw === '' ? '' : Number(raw));
                        }}
                        placeholder="Contoh: 100"
                        aria-invalid={Boolean(fieldErrors.voucherQuota)}
                        aria-describedby={fieldErrors.voucherQuota ? 'tp-voucher-quota-err' : 'tp-voucher-quota-hint'}
                      />
                      {fieldErrors.voucherQuota
                        ? <p id="tp-voucher-quota-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.voucherQuota}</p>
                        : <p id="tp-voucher-quota-hint" className="mt-1 text-xs ui-text-muted">Kosongkan bila tanpa batas kuota.</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="tp-voucher-terms">
                        Ketentuan voucher <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </label>
                      <textarea
                        id="tp-voucher-terms"
                        rows={3}
                        className={inputClass}
                        value={form.voucherTerms}
                        onChange={(e) => setField('voucherTerms', e.target.value)}
                        maxLength={2000}
                        placeholder="Contoh: Diskon 20% untuk semua menu, minimum belanja Rp50.000, tidak berlaku dengan promo lain."
                        aria-invalid={Boolean(fieldErrors.voucherTerms)}
                        aria-describedby={fieldErrors.voucherTerms ? 'tp-voucher-terms-err' : undefined}
                      />
                      {fieldErrors.voucherTerms && <p id="tp-voucher-terms-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.voucherTerms}</p>}
                    </div>
                  </div>
                </fieldset>
              )}

              {error && (
                <p role="alert" className="sm:col-span-2 text-sm text-rose-700 dark:text-rose-400">{error}</p>
              )}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting || events.length === 0}
                  className={`${focusRing} inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-60`}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {submitting ? 'Mengirim…' : 'Kirim Pengajuan'}
                </button>
                <p className="mt-2 text-xs ui-text-muted">
                  Data kontak hanya dipakai tim Metropolitan Mall Bekasi untuk menindaklanjuti pengajuan ini.
                </p>
              </div>
            </form>
          )}
        </section>

        {/* ── Cek status ── */}
        <section aria-labelledby="status-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 id="status-title" className="flex items-center gap-2 font-display text-lg font-bold">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" /> Cek status pengajuan
          </h2>
          <p className="mt-2 text-sm ui-text-secondary">
            Masukkan kode pengajuan (format <span className="font-mono">TPR-XXXXXX</span>) dan nomor telepon yang dipakai saat mengajukan.
          </p>
          <form onSubmit={handleCheckStatus} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
            <div>
              <label className={labelClass} htmlFor="tp-status-code">Kode pengajuan</label>
              <input
                id="tp-status-code"
                className={`${inputClass} font-mono uppercase`}
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value.toUpperCase())}
                maxLength={30}
                placeholder="TPR-XXXXXX"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tp-status-phone">Nomor telepon</label>
              <input
                id="tp-status-phone"
                className={inputClass}
                value={statusPhone}
                onChange={(e) => setStatusPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
              />
            </div>
            <button
              type="submit"
              disabled={statusChecking}
              className={`${focusRing} inline-flex items-center justify-center gap-2 rounded-full border border-[var(--brand-tosca-600)] px-5 py-3 text-sm font-bold text-[var(--brand-tosca-600)] transition hover:bg-brand-primary-50 disabled:opacity-60 dark:border-[var(--brand-tosca-soft)] dark:text-[var(--brand-tosca-soft)] dark:hover:bg-brand-primary-950/40`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {statusChecking ? 'Memeriksa…' : 'Cek Status'}
            </button>
          </form>

          {statusError && (
            <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">{statusError}</p>
          )}

          {statusResult && (
            <div className={`mt-4 rounded-[var(--radius-card)] border p-4 text-sm ${STATUS_TONE[statusResult.status]}`}>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-bold">{STATUS_LABELS[statusResult.status]}</span>
                <span className="opacity-70">·</span>
                <span className="font-mono text-xs">{statusResult.code}</span>
              </p>
              <p className="mt-2 font-semibold">{statusResult.tenantName}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {statusResult.eventTitle}
                {statusResult.eventDate && ` · ${statusResult.eventDate}`}
                {' · '}
                {statusResult.kind === 'booth' ? 'Open booth' : statusResult.kind === 'voucher' ? 'Voucher' : 'Booth + voucher'}
              </p>
              {statusResult.kind !== 'voucher' && statusResult.boothArea && (
                <p className="mt-2 text-xs opacity-90">
                  Booth: {statusResult.boothArea}
                  {statusResult.boothStart && ` · ${formatDateRange(statusResult.boothStart, statusResult.boothEnd || statusResult.boothStart)}`}
                </p>
              )}
              {statusResult.kind !== 'booth' && statusResult.voucherTerms && (
                <p className="mt-1 text-xs opacity-90 [overflow-wrap:anywhere]">Voucher: {statusResult.voucherTerms}</p>
              )}
              {statusResult.status === 'approved' && (
                <p className="mt-3 text-xs opacity-80">
                  Partisipasi Anda tampil di halaman event. Tim akan menghubungi PIC untuk detail teknis bila diperlukan.
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs ui-text-muted dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
